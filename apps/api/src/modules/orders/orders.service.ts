import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  type AuthenticatedActorDto,
  calculateEventDiskFeeCents,
  CheckoutOrderRequestSchema,
  CreateOrderRequestSchema,
  type OrderDetailDto,
  type OrderItemDto,
  type PaymentIntentDto,
  PaymentWebhookRequestSchema,
} from '@bravo-ii/contracts';

interface OrderRow {
  id: string;
  order_number: string;
  event_id: string;
  session_id: string;
  customer_id: string;
  channel_type: 'SITE' | 'PDV' | 'CORTESIA';
  pos_cash_session_id: string | null;
  hold_id: string;
  coupon_campaign_id: string | null;
  status: string;
  subtotal_nominal_cents: string | number;
  discount_cents: string | number;
  disk_fee_cents: string | number;
  total_charged_cents: string | number;
  created_at: Date | string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  event_id: string;
  session_id: string;
  sector_id: string;
  seat_id: string | null;
  price_lot_id: string;
  nominal_price_cents: string | number;
  discount_cents: string | number;
  disk_fee_cents: string | number;
  fee_snapshot_id: string | null;
}

interface PaymentIntentRow {
  id: string;
  order_id: string;
  provider_name: string;
  payment_method: string;
  amount_cents: string | number;
  status: string;
  external_reference: string | null;
  created_at: Date | string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly inventoryService: InventoryService,
    private readonly ticketsService: TicketsService
  ) {}

  private mapPaymentIntent(row: PaymentIntentRow): PaymentIntentDto {
    return {
      id: row.id,
      orderId: row.order_id,
      providerName: row.provider_name,
      paymentMethod: row.payment_method,
      amountCents: Number(row.amount_cents),
      status: row.status,
      externalReference: row.external_reference,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  private mapOrderItem(row: OrderItemRow): OrderItemDto {
    return {
      id: row.id,
      orderId: row.order_id,
      eventId: row.event_id,
      sessionId: row.session_id,
      sectorId: row.sector_id,
      seatId: row.seat_id,
      priceLotId: row.price_lot_id,
      nominalPriceCents: Number(row.nominal_price_cents),
      discountCents: Number(row.discount_cents),
      diskFeeCents: Number(row.disk_fee_cents),
      feeSnapshotId: row.fee_snapshot_id,
    };
  }

  async getOrderDetail(orderId: string): Promise<OrderDetailDto> {
    const orderRes = await this.db.query<OrderRow>(
      `SELECT id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
              hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
              total_charged_cents, created_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );
    const o = orderRes.rows[0];
    if (!o) {
      throw new NotFoundException({
        code: 'ORD-404',
        message: 'Pedido não encontrado.',
      });
    }

    const itemsRes = await this.db.query<OrderItemRow>(
      `SELECT id, order_id, event_id, session_id, sector_id, seat_id, price_lot_id,
              nominal_price_cents, discount_cents, disk_fee_cents, fee_snapshot_id
       FROM order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId]
    );

    const tickets = await this.ticketsService.listTickets({ orderId });

    return {
      id: o.id,
      orderNumber: o.order_number,
      eventId: o.event_id,
      sessionId: o.session_id,
      customerId: o.customer_id,
      channelType: o.channel_type,
      posCashSessionId: o.pos_cash_session_id,
      holdId: o.hold_id,
      couponCampaignId: o.coupon_campaign_id,
      status: o.status,
      subtotalNominalCents: Number(o.subtotal_nominal_cents),
      discountCents: Number(o.discount_cents),
      diskFeeCents: Number(o.disk_fee_cents),
      totalChargedCents: Number(o.total_charged_cents),
      createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at),
      items: itemsRes.rows.map((r) => this.mapOrderItem(r)),
      tickets,
    };
  }

  async listOrders(): Promise<OrderDetailDto[]> {
    const res = await this.db.query<{ id: string }>(
      `SELECT id FROM orders ORDER BY created_at DESC LIMIT 100`
    );
    const list: OrderDetailDto[] = [];
    for (const row of res.rows) {
      list.push(await this.getOrderDetail(row.id));
    }
    return list;
  }

  async createOrder(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<OrderDetailDto> {
    const parsed = CreateOrderRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de pedido inválidos.',
      });
    }

    await this.inventoryService.expireStaleHolds();

    // Idempotência do pedido
    const existingOrder = await this.db.query<{ id: string }>(
      `SELECT id FROM orders WHERE idempotency_key = $1`,
      [parsed.data.idempotencyKey]
    );
    if (existingOrder.rows[0]) {
      return this.getOrderDetail(existingOrder.rows[0].id);
    }

    // Valida hold ativo
    const holdRes = await this.db.query<{
      id: string;
      event_id: string;
      session_id: string;
      sector_id: string;
      seat_id: string | null;
      quantity: number;
      status: string;
      expires_at: Date | string;
    }>(
      `SELECT id, event_id, session_id, sector_id, seat_id, quantity, status, expires_at
       FROM inventory_holds
       WHERE id = $1`,
      [parsed.data.holdId]
    );
    const hold = holdRes.rows[0];
    if (!hold) {
      throw new NotFoundException({
        code: 'INV-404',
        message: 'Reserva de inventário (hold) não encontrada.',
      });
    }

    if (hold.status !== 'ACTIVE') {
      throw new ConflictException({
        code: 'INV-409',
        message: `A reserva de inventário não está ativa (status atual: ${hold.status}).`,
      });
    }

    if (hold.event_id !== parsed.data.eventId || hold.session_id !== parsed.data.sessionId) {
      throw new BadRequestException({
        code: 'ORD-001',
        message: 'A reserva de inventário pertence a outro evento ou sessão.',
      });
    }

    // Se canal for PDV, valida sessão de caixa aberta
    if (parsed.data.channelType === 'PDV') {
      if (!parsed.data.posCashSessionId) {
        throw new BadRequestException({
          code: 'POS-004',
          message: 'Vendas realizadas via canal PDV exigem uma sessão de caixa aberta.',
        });
      }
      const cashRes = await this.db.query<{ id: string; status: string }>(
        `SELECT id, status FROM pos_cash_sessions WHERE id = $1`,
        [parsed.data.posCashSessionId]
      );
      if (!cashRes.rows[0] || cashRes.rows[0].status !== 'OPEN') {
        throw new BadRequestException({
          code: 'POS-005',
          message: 'A sessão de caixa PDV informada não está aberta.',
        });
      }
    }

    // Busca lote/modalidade de preço
    const lotRes = await this.db.query<{
      id: string;
      nominal_price_cents: string | number;
      sector_id: string;
      status: string;
    }>(
      `SELECT id, nominal_price_cents, sector_id, status
       FROM event_price_lots
       WHERE id = $1 AND event_id = $2 AND session_id = $3`,
      [parsed.data.priceLotId, parsed.data.eventId, parsed.data.sessionId]
    );
    const lot = lotRes.rows[0];
    if (!lot || lot.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'ORD-002',
        message: 'Lote de preço não encontrado ou inativo para esta sessão.',
      });
    }

    // Busca versão aprovada vigente da Taxa Disk por EVENTO
    const feeRes = await this.db.query<{
      id: string;
      agreement_version: number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      fixed_amount_cents: string | number | null;
      payer: string;
    }>(
      `SELECT id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents, payer
       FROM event_fee_agreements
       WHERE event_id = $1 AND status = 'APPROVED'
       ORDER BY agreement_version DESC
       LIMIT 1`,
      [parsed.data.eventId]
    );
    const activeFee = feeRes.rows[0];
    if (!activeFee) {
      throw new BadRequestException({
        code: 'COM-001',
        message: 'O evento não possui acordo de Taxa Disk aprovado vigente.',
      });
    }

    const quantity = Number(hold.quantity);
    const unitNominalCents = Number(lot.nominal_price_cents);

    // Verifica cupom opcional
    let couponCampaignId: string | null = null;
    let unitDiscountCents = 0;

    if (parsed.data.couponCode) {
      const codeUpper = parsed.data.couponCode.toUpperCase();
      const cpnRes = await this.db.query<{
        id: string;
        discount_type: 'PERCENTAGE' | 'FIXED';
        percentage_rate: string | number | null;
        fixed_amount_cents: string | number | null;
        max_uses: number;
        used_count: number;
        status: string;
        valid_until: Date | string | null;
      }>(
        `SELECT id, discount_type, percentage_rate, fixed_amount_cents, max_uses, used_count, status, valid_until
         FROM coupon_campaigns
         WHERE event_id = $1 AND code = $2`,
        [parsed.data.eventId, codeUpper]
      );
      const cpn = cpnRes.rows[0];
      if (!cpn) {
        throw new BadRequestException({
          code: 'CPN-404',
          message: `Cupom promocional '${codeUpper}' não encontrado para este evento.`,
        });
      }
      if (cpn.status !== 'ATIVO') {
        throw new BadRequestException({
          code: 'CPN-003',
          message: `Cupom promocional '${codeUpper}' não está ativo.`,
        });
      }
      if (cpn.valid_until && new Date(cpn.valid_until).getTime() <= Date.now()) {
        throw new BadRequestException({
          code: 'CPN-004',
          message: `Cupom promocional '${codeUpper}' está expirado.`,
        });
      }
      if (Number(cpn.used_count) + quantity > Number(cpn.max_uses)) {
        throw new ConflictException({
          code: 'CPN-409',
          message: `Limite de uso do cupom '${codeUpper}' esgotado (${cpn.used_count}/${cpn.max_uses}).`,
        });
      }

      const incCpn = await this.db.query<{ id: string }>(
        `UPDATE coupon_campaigns
         SET used_count = used_count + $1
         WHERE id = $2 AND used_count + $1 <= max_uses
         RETURNING id`,
        [quantity, cpn.id]
      );
      if (incCpn.rows.length === 0) {
        throw new ConflictException({
          code: 'CPN-409',
          message: `Cupom '${codeUpper}' esgotou durante o processamento.`,
        });
      }

      couponCampaignId = cpn.id;
      if (cpn.discount_type === 'FIXED') {
        unitDiscountCents = Math.min(unitNominalCents, Number(cpn.fixed_amount_cents ?? 0));
      } else {
        const rate = Number(cpn.percentage_rate ?? 0);
        unitDiscountCents = Math.min(
          unitNominalCents,
          Math.round((unitNominalCents * Math.round(rate * 100)) / 10000)
        );
      }
    }

    const discountedUnitNominalCents = Math.max(0, unitNominalCents - unitDiscountCents);
    const unitDiskFeeCents = calculateEventDiskFeeCents(discountedUnitNominalCents, {
      calculationType: activeFee.calculation_type,
      percentageRate:
        activeFee.percentage_rate !== null ? Number(activeFee.percentage_rate) : null,
      fixedAmountCents:
        activeFee.fixed_amount_cents !== null ? Number(activeFee.fixed_amount_cents) : null,
    });

    const subtotalNominalCents = unitNominalCents * quantity;
    const totalDiscountCents = unitDiscountCents * quantity;
    const totalDiskFeeCents = unitDiskFeeCents * quantity;
    const totalChargedCents =
      activeFee.payer === 'CUSTOMER'
        ? subtotalNominalCents - totalDiscountCents + totalDiskFeeCents
        : subtotalNominalCents - totalDiscountCents;

    // Consome a reserva de inventário
    await this.db.query(`UPDATE inventory_holds SET status = 'CONSUMED' WHERE id = $1`, [hold.id]);

    const orderId = randomUUID();
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    await this.db.query(
      `INSERT INTO orders (
         id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
         hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
         total_charged_cents, idempotency_key, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AGUARDANDO_PAGAMENTO', $10, $11, $12, $13, $14, $15)`,
      [
        orderId,
        orderNumber,
        parsed.data.eventId,
        parsed.data.sessionId,
        parsed.data.customerId,
        parsed.data.channelType,
        parsed.data.posCashSessionId ?? null,
        hold.id,
        couponCampaignId,
        subtotalNominalCents,
        totalDiscountCents,
        totalDiskFeeCents,
        totalChargedCents,
        parsed.data.idempotencyKey,
        actor.userId,
      ]
    );

    if (couponCampaignId) {
      await this.db.query(
        `INSERT INTO coupon_redemptions (id, campaign_id, order_id, discount_applied_cents)
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), couponCampaignId, orderId, totalDiscountCents]
      );
    }

    for (let i = 0; i < quantity; i++) {
      const orderItemId = randomUUID();
      await this.db.query(
        `INSERT INTO order_items (
           id, order_id, event_id, session_id, sector_id, seat_id, price_lot_id,
           nominal_price_cents, discount_cents, disk_fee_cents, fee_snapshot_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL)`,
        [
          orderItemId,
          orderId,
          parsed.data.eventId,
          parsed.data.sessionId,
          hold.sector_id,
          hold.seat_id,
          lot.id,
          unitNominalCents,
          unitDiscountCents,
          unitDiskFeeCents,
        ]
      );
    }

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'ORDER_CREATED',
      resourceType: 'Order',
      resourceId: orderId,
      eventId: parsed.data.eventId,
      outcome: 'SUCCESS',
      origin: parsed.data.channelType === 'PDV' ? 'PDV' : 'API',
      correlationId,
      afterState: {
        orderNumber,
        channelType: parsed.data.channelType,
        subtotalNominalCents,
        discountCents: totalDiscountCents,
        diskFeeCents: totalDiskFeeCents,
        totalChargedCents,
      },
    });

    return this.getOrderDetail(orderId);
  }

  /**
   * Confirma o pedido, congela o snapshot contratual imutável da Taxa Disk por item
   * e emite os ingressos de 8 dígitos + QR Code independente.
   */
  async finalizeOrderConfirmation(params: {
    orderId: string;
    simulateEmailFailure: boolean;
    actorUserId: string | null;
    actorRole: string;
    correlationId: string;
  }): Promise<OrderDetailDto> {
    const orderRes = await this.db.query<OrderRow>(
      `SELECT id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
              hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
              total_charged_cents, created_at
       FROM orders
       WHERE id = $1`,
      [params.orderId]
    );
    const order = orderRes.rows[0];
    if (!order) {
      throw new NotFoundException({
        code: 'ORD-404',
        message: 'Pedido não encontrado.',
      });
    }

    if (order.status === 'CONFIRMADO' || order.status === 'FINALIZADO') {
      return this.getOrderDetail(order.id);
    }

    const customerRes = await this.db.query<{ email: string }>(
      `SELECT email FROM customers WHERE id = $1`,
      [order.customer_id]
    );
    const recipientEmail = customerRes.rows[0]?.email ?? 'cliente@diskingressos.com.br';

    const feeRes = await this.db.query<{
      id: string;
      agreement_version: number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      fixed_amount_cents: string | number | null;
      payer: string;
    }>(
      `SELECT id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents, payer
       FROM event_fee_agreements
       WHERE event_id = $1 AND status = 'APPROVED'
       ORDER BY agreement_version DESC
       LIMIT 1`,
      [order.event_id]
    );
    const activeFee = feeRes.rows[0];

    const itemsRes = await this.db.query<OrderItemRow>(
      `SELECT id, order_id, event_id, session_id, sector_id, seat_id, price_lot_id,
              nominal_price_cents, discount_cents, disk_fee_cents, fee_snapshot_id
       FROM order_items
       WHERE order_id = $1`,
      [order.id]
    );

    for (const item of itemsRes.rows) {
      let snapshotId = item.fee_snapshot_id;
      if (!snapshotId && activeFee) {
        snapshotId = randomUUID();
        const netNominal = Math.max(
          0,
          Number(item.nominal_price_cents) - Number(item.discount_cents)
        );
        await this.db.query(
          `INSERT INTO event_fee_snapshots (
             id, event_id, fee_agreement_id, agreement_version, reference_type, reference_id,
             ticket_nominal_price_cents, calculation_type, percentage_rate, fixed_amount_cents,
             calculated_disk_fee_cents, payer
           ) VALUES ($1, $2, $3, $4, 'ORDER_ITEM', $5, $6, $7, $8, $9, $10, $11)`,
          [
            snapshotId,
            order.event_id,
            activeFee.id,
            Number(activeFee.agreement_version),
            item.id,
            netNominal,
            activeFee.calculation_type,
            activeFee.percentage_rate !== null ? Number(activeFee.percentage_rate) : null,
            activeFee.fixed_amount_cents !== null ? Number(activeFee.fixed_amount_cents) : null,
            Number(item.disk_fee_cents),
            activeFee.payer,
          ]
        );

        await this.db.query(
          `UPDATE order_items SET fee_snapshot_id = $1 WHERE id = $2`,
          [snapshotId, item.id]
        );
      }

      await this.ticketsService.issueTicketForOrderItem({
        orderId: order.id,
        orderItemId: item.id,
        customerId: order.customer_id,
        recipientEmail,
        eventId: order.event_id,
        sessionId: order.session_id,
        sectorId: item.sector_id,
        seatId: item.seat_id,
        simulateEmailFailure: params.simulateEmailFailure,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        correlationId: params.correlationId,
      });
    }

    await this.db.query(
      `UPDATE orders SET status = 'CONFIRMADO', updated_at = NOW() WHERE id = $1`,
      [order.id]
    );

    if (order.pos_cash_session_id) {
      await this.db.query(
        `UPDATE pos_cash_sessions
         SET total_sales_cents = total_sales_cents + $1
         WHERE id = $2`,
        [Number(order.total_charged_cents), order.pos_cash_session_id]
      );
    }

    return this.getOrderDetail(order.id);
  }

  async checkoutOrder(
    orderId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<{ order: OrderDetailDto; paymentIntent: PaymentIntentDto }> {
    const parsed = CheckoutOrderRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de checkout inválidos.',
      });
    }

    const orderRes = await this.db.query<OrderRow>(
      `SELECT id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
              hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
              total_charged_cents, created_at
       FROM orders
       WHERE id = $1`,
      [orderId]
    );
    const order = orderRes.rows[0];
    if (!order) {
      throw new NotFoundException({
        code: 'ORD-404',
        message: 'Pedido não encontrado para checkout.',
      });
    }

    // Idempotência do PaymentIntent
    const existingPi = await this.db.query<PaymentIntentRow>(
      `SELECT id, order_id, provider_name, payment_method, amount_cents, status, external_reference, created_at
       FROM payment_intents
       WHERE idempotency_key = $1`,
      [parsed.data.idempotencyKey]
    );
    if (existingPi.rows[0]) {
      return {
        order: await this.getOrderDetail(order.id),
        paymentIntent: this.mapPaymentIntent(existingPi.rows[0]),
      };
    }

    const piId = randomUUID();
    const isInstantCashPos =
      order.channel_type === 'PDV' && parsed.data.paymentMethod === 'CASH';
    const initialPiStatus = isInstantCashPos ? 'CAPTURADO' : 'AUTORIZACAO_PENDENTE';

    const insertPi = await this.db.query<PaymentIntentRow>(
      `INSERT INTO payment_intents (
         id, order_id, provider_name, payment_method, amount_cents, status, external_reference, idempotency_key
       ) VALUES ($1, $2, 'SANDBOX_GATEWAY', $3, $4, $5, $6, $7)
       RETURNING id, order_id, provider_name, payment_method, amount_cents, status, external_reference, created_at`,
      [
        piId,
        order.id,
        parsed.data.paymentMethod,
        Number(order.total_charged_cents),
        initialPiStatus,
        `SBX-${piId.slice(0, 8).toUpperCase()}`,
        parsed.data.idempotencyKey,
      ]
    );

    if (isInstantCashPos) {
      await this.finalizeOrderConfirmation({
        orderId: order.id,
        simulateEmailFailure: parsed.data.simulateEmailFailure,
        actorUserId: actor.userId,
        actorRole: actor.roles[0] ?? 'PDV_CAIXA',
        correlationId,
      });
    }

    return {
      order: await this.getOrderDetail(order.id),
      paymentIntent: this.mapPaymentIntent(insertPi.rows[0]!),
    };
  }

  async handlePaymentWebhook(
    provider: string,
    rawPayload: unknown,
    correlationId: string
  ): Promise<{ idempotentReplay: boolean; order: OrderDetailDto }> {
    const parsed = PaymentWebhookRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Payload de webhook inválido.',
      });
    }

    // Validação de assinatura simulada do provedor Sandbox
    if (!parsed.data.signature.startsWith('sbx_sig_')) {
      throw new BadRequestException({
        code: 'PAY-401',
        message: 'Assinatura do webhook de pagamento inválida.',
      });
    }

    // Idempotência estrita por provider_event_id
    const existingEvt = await this.db.query<{ id: string; order_id: string }>(
      `SELECT id, order_id FROM payment_provider_events WHERE provider_event_id = $1`,
      [parsed.data.providerEventId]
    );
    if (existingEvt.rows[0]) {
      return {
        idempotentReplay: true,
        order: await this.getOrderDetail(existingEvt.rows[0].order_id),
      };
    }

    const piRes = await this.db.query<PaymentIntentRow>(
      `SELECT id, order_id, provider_name, payment_method, amount_cents, status, external_reference, created_at
       FROM payment_intents
       WHERE id = $1`,
      [parsed.data.paymentIntentId]
    );
    const pi = piRes.rows[0];
    if (!pi) {
      throw new NotFoundException({
        code: 'PAY-404',
        message: 'PaymentIntent não encontrado para o webhook recebido.',
      });
    }

    await this.db.query(
      `INSERT INTO payment_provider_events (
         id, provider_name, provider_event_id, payment_intent_id, order_id, event_type, signature_verified, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
      [
        randomUUID(),
        provider.toUpperCase(),
        parsed.data.providerEventId,
        pi.id,
        pi.order_id,
        parsed.data.eventType,
        JSON.stringify(parsed.data),
      ]
    );

    if (parsed.data.eventType === 'PAYMENT_CAPTURED') {
      await this.db.query(
        `UPDATE payment_intents SET status = 'CAPTURADO', updated_at = NOW() WHERE id = $1`,
        [pi.id]
      );
      const confirmedOrder = await this.finalizeOrderConfirmation({
        orderId: pi.order_id,
        simulateEmailFailure: parsed.data.simulateEmailFailure,
        actorUserId: null,
        actorRole: 'SYSTEM_WEBHOOK',
        correlationId,
      });

      return {
        idempotentReplay: false,
        order: confirmedOrder,
      };
    } else {
      await this.db.query(
        `UPDATE payment_intents SET status = 'RECUSADO', updated_at = NOW() WHERE id = $1`,
        [pi.id]
      );
      return {
        idempotentReplay: false,
        order: await this.getOrderDetail(pi.order_id),
      };
    }
  }
}
