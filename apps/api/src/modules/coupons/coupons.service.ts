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
  type CouponCampaignDto,
  type CourtesyQuotaDto,
  CreateCouponCampaignRequestSchema,
  CreateCourtesyQuotaRequestSchema,
  IssueCourtesyTicketRequestSchema,
  type OrderDetailDto,
} from '@bravo-ii/contracts';

interface CouponCampaignRow {
  id: string;
  event_id: string;
  session_id: string | null;
  code: string;
  title: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  percentage_rate: string | number | null;
  fixed_amount_cents: string | number | null;
  max_uses: number;
  used_count: number;
  status: string;
  valid_until: Date | string | null;
  created_at: Date | string;
}

interface CourtesyQuotaRow {
  id: string;
  event_id: string;
  session_id: string;
  sector_id: string;
  authorized_quantity: number;
  issued_quantity: number;
  status: string;
  created_at: Date | string;
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly inventoryService: InventoryService,
    private readonly ticketsService: TicketsService
  ) {}

  private mapCampaign(row: CouponCampaignRow): CouponCampaignDto {
    return {
      id: row.id,
      eventId: row.event_id,
      sessionId: row.session_id,
      code: row.code,
      title: row.title,
      discountType: row.discount_type,
      percentageRate: row.percentage_rate !== null ? Number(row.percentage_rate) : null,
      fixedAmountCents: row.fixed_amount_cents !== null ? Number(row.fixed_amount_cents) : null,
      maxUses: Number(row.max_uses),
      usedCount: Number(row.used_count),
      status: row.status,
      validUntil: row.valid_until
        ? row.valid_until instanceof Date
          ? row.valid_until.toISOString()
          : String(row.valid_until)
        : null,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  private mapQuota(row: CourtesyQuotaRow): CourtesyQuotaDto {
    return {
      id: row.id,
      eventId: row.event_id,
      sessionId: row.session_id,
      sectorId: row.sector_id,
      authorizedQuantity: Number(row.authorized_quantity),
      issuedQuantity: Number(row.issued_quantity),
      status: row.status,
      createdAt:
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  async listCampaigns(): Promise<CouponCampaignDto[]> {
    const res = await this.db.query<CouponCampaignRow>(
      `SELECT id, event_id, session_id, code, title, discount_type, percentage_rate, fixed_amount_cents,
              max_uses, used_count, status, valid_until, created_at
       FROM coupon_campaigns
       ORDER BY created_at DESC`
    );
    return res.rows.map((r) => this.mapCampaign(r));
  }

  async createCampaign(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<CouponCampaignDto> {
    const parsed = CreateCouponCampaignRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de campanha de cupom inválidos.',
      });
    }

    const code = parsed.data.code.toUpperCase();
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM coupon_campaigns WHERE event_id = $1 AND code = $2`,
      [parsed.data.eventId, code]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'CPN-001',
        message: 'Já existe uma campanha com este código de cupom neste evento.',
      });
    }

    const id = randomUUID();
    const res = await this.db.query<CouponCampaignRow>(
      `INSERT INTO coupon_campaigns (
         id, event_id, session_id, code, title, discount_type, percentage_rate, fixed_amount_cents,
         max_uses, used_count, status, valid_until, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 'ATIVO', $10, $11)
       RETURNING id, event_id, session_id, code, title, discount_type, percentage_rate, fixed_amount_cents,
                 max_uses, used_count, status, valid_until, created_at`,
      [
        id,
        parsed.data.eventId,
        parsed.data.sessionId ?? null,
        code,
        parsed.data.title,
        parsed.data.discountType,
        parsed.data.percentageRate,
        parsed.data.fixedAmountCents,
        parsed.data.maxUses,
        parsed.data.validUntil ?? null,
        actor.userId,
      ]
    );

    const created = this.mapCampaign(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'COUPON_CAMPAIGN_CREATED',
      resourceType: 'CouponCampaign',
      resourceId: created.id,
      eventId: created.eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        code: created.code,
        discountType: created.discountType,
        maxUses: created.maxUses,
      },
    });

    return created;
  }

  async listCourtesyQuotas(): Promise<CourtesyQuotaDto[]> {
    const res = await this.db.query<CourtesyQuotaRow>(
      `SELECT id, event_id, session_id, sector_id, authorized_quantity, issued_quantity, status, created_at
       FROM courtesy_quotas
       ORDER BY created_at DESC`
    );
    return res.rows.map((r) => this.mapQuota(r));
  }

  async createCourtesyQuota(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<CourtesyQuotaDto> {
    const parsed = CreateCourtesyQuotaRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de quota de cortesia inválidos.',
      });
    }

    const id = randomUUID();
    const res = await this.db.query<CourtesyQuotaRow>(
      `INSERT INTO courtesy_quotas (
         id, event_id, session_id, sector_id, authorized_quantity, issued_quantity, status, approved_by
       ) VALUES ($1, $2, $3, $4, $5, 0, 'AUTORIZADA', $6)
       RETURNING id, event_id, session_id, sector_id, authorized_quantity, issued_quantity, status, created_at`,
      [
        id,
        parsed.data.eventId,
        parsed.data.sessionId,
        parsed.data.sectorId,
        parsed.data.authorizedQuantity,
        actor.userId,
      ]
    );

    const created = this.mapQuota(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'COURTESY_QUOTA_AUTHORIZED',
      resourceType: 'CourtesyQuota',
      resourceId: created.id,
      eventId: created.eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        sectorId: created.sectorId,
        authorizedQuantity: created.authorizedQuantity,
      },
    });

    return created;
  }

  async issueCourtesyTicket(
    quotaId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<OrderDetailDto> {
    const parsed = IssueCourtesyTicketRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados inválidos para emissão de cortesia.',
      });
    }

    const quotaRes = await this.db.query<CourtesyQuotaRow>(
      `SELECT id, event_id, session_id, sector_id, authorized_quantity, issued_quantity, status, created_at
       FROM courtesy_quotas
       WHERE id = $1`,
      [quotaId]
    );
    const quota = quotaRes.rows[0];
    if (!quota) {
      throw new NotFoundException({
        code: 'CPN-404',
        message: 'Quota de cortesia não encontrada.',
      });
    }

    if (quota.status !== 'AUTORIZADA') {
      throw new BadRequestException({
        code: 'CPN-002',
        message: 'Quota de cortesia não está autorizada.',
      });
    }

    if (Number(quota.issued_quantity) >= Number(quota.authorized_quantity)) {
      throw new ConflictException({
        code: 'CPN-409',
        message: `Limite da quota de cortesias atingido (${quota.issued_quantity}/${quota.authorized_quantity}).`,
      });
    }

    const customerRes = await this.db.query<{ id: string; email: string }>(
      `SELECT id, email FROM customers WHERE id = $1`,
      [parsed.data.customerId]
    );
    const customer = customerRes.rows[0];
    if (!customer) {
      throw new NotFoundException({
        code: 'CRM-404',
        message: 'Cliente beneficiário não encontrado.',
      });
    }

    // Reserva 1 lugar no inventário
    const hold = await this.inventoryService.createHold(
      quota.session_id,
      {
        sectorId: quota.sector_id,
        seatId: parsed.data.seatId ?? null,
        channelType: 'CORTESIA',
        quantity: 1,
        idempotencyKey: `hold-courtesy-${parsed.data.idempotencyKey}`,
        ttlSeconds: 300,
      },
      actor,
      correlationId
    );

    // Incrementa quota atomicamente
    const incQuota = await this.db.query<CourtesyQuotaRow>(
      `UPDATE courtesy_quotas
       SET issued_quantity = issued_quantity + 1
       WHERE id = $1 AND issued_quantity < authorized_quantity
       RETURNING id, event_id, session_id, sector_id, authorized_quantity, issued_quantity, status, created_at`,
      [quotaId]
    );
    if (incQuota.rows.length === 0) {
      throw new ConflictException({
        code: 'CPN-409',
        message: 'A quota de cortesias esgotou durante o processamento concorrente.',
      });
    }

    // Consome o hold e gera pedido CORTESIA confirmado com valor R$ 0,00
    await this.db.query(`UPDATE inventory_holds SET status = 'CONSUMED' WHERE id = $1`, [hold.id]);

    const orderId = randomUUID();
    const orderNumber = `CRT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const orderInsert = await this.db.query<{
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
    }>(
      `INSERT INTO orders (
         id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
         hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
         total_charged_cents, idempotency_key, created_by
       ) VALUES ($1, $2, $3, $4, $5, 'CORTESIA', NULL, $6, NULL, 'CONFIRMADO', 0, 0, 0, 0, $7, $8)
       RETURNING id, order_number, event_id, session_id, customer_id, channel_type, pos_cash_session_id,
                 hold_id, coupon_campaign_id, status, subtotal_nominal_cents, discount_cents, disk_fee_cents,
                 total_charged_cents, created_at`,
      [
        orderId,
        orderNumber,
        quota.event_id,
        quota.session_id,
        customer.id,
        hold.id,
        parsed.data.idempotencyKey,
        actor.userId,
      ]
    );

    const orderItemId = randomUUID();
    await this.db.query(
      `INSERT INTO order_items (
         id, order_id, event_id, session_id, sector_id, seat_id, price_lot_id,
         nominal_price_cents, discount_cents, disk_fee_cents, fee_snapshot_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, NULL)`,
      [
        orderItemId,
        orderId,
        quota.event_id,
        quota.session_id,
        quota.sector_id,
        parsed.data.seatId ?? null,
        parsed.data.priceLotId,
      ]
    );

    const ticket = await this.ticketsService.issueTicketForOrderItem({
      orderId,
      orderItemId,
      customerId: customer.id,
      recipientEmail: customer.email,
      eventId: quota.event_id,
      sessionId: quota.session_id,
      sectorId: quota.sector_id,
      seatId: parsed.data.seatId ?? null,
      simulateEmailFailure: false,
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      correlationId,
    });

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'COURTESY_TICKET_ISSUED',
      resourceType: 'CourtesyQuota',
      resourceId: quota.id,
      eventId: quota.event_id,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        orderId,
        ticketId: ticket.id,
        publicCode: ticket.publicCode,
        issuedQuantity: Number(incQuota.rows[0]?.issued_quantity ?? 0),
      },
    });

    const o = orderInsert.rows[0]!;
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
      subtotalNominalCents: 0,
      discountCents: 0,
      diskFeeCents: 0,
      totalChargedCents: 0,
      createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at),
      items: [
        {
          id: orderItemId,
          orderId,
          eventId: quota.event_id,
          sessionId: quota.session_id,
          sectorId: quota.sector_id,
          seatId: parsed.data.seatId ?? null,
          priceLotId: parsed.data.priceLotId,
          nominalPriceCents: 0,
          discountCents: 0,
          diskFeeCents: 0,
          feeSnapshotId: null,
        },
      ],
      tickets: [ticket],
    };
  }
}
