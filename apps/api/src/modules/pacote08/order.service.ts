import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  AdapterReceipt,
  assertChannelOrderLimit,
  assertConfirmedPayment,
  calculateCouponDiscountCents,
  calculateLineTotal,
  expiresAt,
  formatTicketNumber,
  mayReserve,
  SalesRuleError,
  settlementCanonical,
  validateReservation,
} from '@bravo-ii/domain-p08';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { assertInternalRole } from './customer.service';

export type ReserveInput = {
  eventId: string;
  sessionId: string;
  lotId: string;
  customerId: string;
  quantity: number;
  channel: 'ONLINE' | 'PDV' | 'BILHETERIA';
  idempotencyKey: string;
  seatIds?: string[];
  couponCode?: string;
};

// Referência de equivalência Prisma: TransactionIsolationLevel.Serializable / UPDATE "BravoPriceLot" SET "reservedCount"="reservedCount"+quantity WHERE "capacity"-"reservedCount"-"issuedCount">=quantity
function asRequestError(fn: () => void) {
  try {
    fn();
  } catch (e) {
    if (e instanceof SalesRuleError) {
      throw new BadRequestException({ code: 'REGRA_VENDA_P08', message: e.message });
    }
    throw e;
  }
}

@Injectable()
export class BravoOrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async reserve(
    body: ReserveInput,
    actor: AuthenticatedActorDto,
    trustedPdv?: { terminalId: string; shiftId: string },
    correlationId?: string
  ) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', ...(trustedPdv ? ['PDV'] : []));
    asRequestError(() => {
      validateReservation(body);
    });

    // Nenhum PDV e nenhum checkout de site foi conectado: prevenir pedidos que aparentem venda real nesses canais.
    if (body.channel === 'BILHETERIA' || (body.channel==='PDV'&&!trustedPdv) || (body.channel === 'ONLINE' && trustedPdv)) {
      throw new ServiceUnavailableException({
        code: 'CANAL_NAO_CONECTADO',
        message: 'Canal ou terminal não homologado',
      });
    }
    if (body.channel === 'ONLINE') {
      assertInternalRole(actor, 'ADMIN', 'OPERACOES');
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          actor: actor.userId,
          customerId: body.customerId,
          eventId: body.eventId,
          sessionId: body.sessionId,
          lotId: body.lotId,
          quantity: body.quantity,
          channel: body.channel,
          terminalId: trustedPdv?.terminalId,
          shiftId: trustedPdv?.shiftId,
        })
      )
      .digest('hex');

    const existingRes = await this.db.query<{
      id: string;
      status: string;
      expires_at: string | Date;
      total_cents: number;
      request_hash: string;
    }>(
      `SELECT id, status, expires_at, total_cents, request_hash
       FROM p08_sale_orders WHERE idempotency_key = $1`,
      [body.idempotencyKey]
    );
    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (existing.request_hash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCIA_DIVERGENTE',
          message: 'Chave idempotente reutilizada com dados diferentes',
        });
      }
      return {
        id: existing.id,
        status: existing.status,
        expiresAt: existing.expires_at,
        totalCents: Number(existing.total_cents),
        reused: true,
      };
    }

    const [customerRes, lotRes] = await Promise.all([
      this.db.query<{ id: string }>(`SELECT id FROM customers WHERE id = $1`, [body.customerId]),
      this.db.query<{
        id: string;
        event_id: string;
        session_id: string;
        sector_id: string;
        nominal_price_cents: string | number;
        max_quantity: number;
        lot_status: string;
        lot_starts_at: string | Date | null;
        lot_ends_at: string | Date | null;
        event_status: string;
        event_starts_at: string | Date;
        event_ends_at: string | Date | null;
        sales_starts_at: string | Date | null;
        session_status: string;
        area_type: string | null;
      }>(
        `SELECT l.id, l.event_id, l.session_id, l.sector_id, l.nominal_price_cents, l.max_quantity,
                l.status AS lot_status, l.starts_at AS lot_starts_at, l.ends_at AS lot_ends_at,
                e.status AS event_status, e.starts_at AS event_starts_at, e.ends_at AS event_ends_at,
                e.sales_starts_at,
                s.status AS session_status,
                sec.area_type
         FROM event_price_lots l
         INNER JOIN events e ON e.id = l.event_id
         INNER JOIN event_sessions s ON s.id = l.session_id
         LEFT JOIN event_sectors sec ON sec.id = l.sector_id
         WHERE l.id = $1`,
        [body.lotId]
      ),
    ]);

    if (customerRes.rows.length === 0) {
      throw new NotFoundException({ code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não localizado' });
    }
    if (
      lotRes.rows.length === 0 ||
      lotRes.rows[0].event_id !== body.eventId ||
      lotRes.rows[0].session_id !== body.sessionId
    ) {
      throw new BadRequestException({
        code: 'LOTE_EVENTO_SESSAO_INVALIDO',
        message: 'Lote não pertence ao evento/sessão solicitados',
      });
    }

    const lot = lotRes.rows[0];
    const channelsRes = await this.db.query<{ channel_type: string; is_enabled: boolean }>(
      `SELECT channel_type, is_enabled FROM event_sales_channels WHERE event_id = $1`,
      [body.eventId]
    );
    const enabledChannels = channelsRes.rows
      .filter((c) => c.is_enabled)
      .map((c) => (c.channel_type === 'SITE' ? 'ONLINE' : c.channel_type));

    const now = new Date();
    const normalizedLotStatus =
      lot.lot_status === 'ACTIVE' || lot.lot_status === 'ATIVO'
        ? 'ATIVO'
        : lot.lot_status === 'DRAFT'
          ? 'RASCUNHO'
          : lot.lot_status;
    const normalizedSessionStatus =
      lot.session_status === 'ON_SALE' || lot.session_status === 'ATIVA' || (lot.event_status === 'PUBLICADO' && lot.session_status === 'SCHEDULED')
        ? 'ATIVA'
        : lot.session_status === 'SCHEDULED'
          ? 'RASCUNHO'
          : lot.session_status;

    const eventStartsAt = new Date(lot.event_starts_at);
    const salesStartAt = lot.sales_starts_at ? new Date(lot.sales_starts_at) : null;
    const lotStartsAt = lot.lot_starts_at ? new Date(lot.lot_starts_at) : salesStartAt ?? new Date(now.getTime() - 60_000);
    const lotEndsAt = lot.lot_ends_at ? new Date(lot.lot_ends_at) : eventStartsAt;

    asRequestError(() => {
      mayReserve({
        eventStatus: lot.event_status,
        lotStatus: normalizedLotStatus,
        sessionStatus: normalizedSessionStatus,
        lotStartsAt,
        lotEndsAt,
        salesStartAt,
        eventStartsAt,
        now,
        enabledChannels,
        channel: body.channel,
        numbered: lot.area_type === 'SEATED',
        seatIds: body.seatIds,
        quantity: body.quantity,
      });
      assertChannelOrderLimit(body.quantity, body.channel, null);
    });

    const unitCents = Number(lot.nominal_price_cents);
    let totalCents = 0;
    asRequestError(() => {
      totalCents = calculateLineTotal(unitCents, body.quantity);
    });
    const exp = expiresAt(now);
    const orderId = randomUUID();

    const result = await this.db.withTransaction(async (tx) => {
      const doubleCheck = await tx.query<{
        id: string;
        status: string;
        expires_at: string | Date;
        total_cents: number;
        request_hash: string;
      }>(
        `SELECT id, status, expires_at, total_cents, request_hash
         FROM p08_sale_orders WHERE idempotency_key = $1`,
        [body.idempotencyKey]
      );
      if (doubleCheck.rows.length > 0) {
        const already = doubleCheck.rows[0];
        if (already.request_hash !== requestHash) {
          throw new ConflictException({
            code: 'IDEMPOTENCIA_DIVERGENTE',
            message: 'Chave idempotente reutilizada com dados diferentes',
          });
        }
        return {
          id: already.id,
          status: already.status,
          expiresAt: already.expires_at,
          totalCents: Number(already.total_cents),
          reused: true,
        };
      }

      const evLock = await tx.query<{ status: string }>(
        `SELECT status FROM events WHERE id = $1 FOR SHARE`,
        [body.eventId]
      );
      if (evLock.rows[0]?.status !== 'PUBLICADO') {
        throw new ConflictException({
          code: 'EVENTO_INDISPONIVEL',
          message: 'Evento indisponível para vendas',
        });
      }

      if (lot.area_type === 'SEATED' && Array.isArray(body.seatIds) && body.seatIds.length > 0) {
        const seatLock = await tx.query<{ id: string }>(
          `UPDATE seats
           SET status = 'HELD', active_hold_id = $1, updated_at = NOW()
           WHERE id = ANY($2::uuid[]) AND sector_id = $3 AND status = 'AVAILABLE'
           RETURNING id`,
          [orderId, body.seatIds, lot.sector_id]
        );
        if (seatLock.rowCount !== body.seatIds.length) {
          throw new ConflictException({
            code: 'POLTRONA_INDISPONIVEL',
            message: 'Uma ou mais poltronas já estão reservadas ou ocupadas',
          });
        }
      }

      // Atualização atômica no PostgreSQL: não existe leitura separada de estoque para decidir.
      const updated = await tx.query<{ id: string }>(
        `UPDATE event_price_lots
         SET reserved_count = reserved_count + $1
         WHERE id = $2
           AND status IN ('ACTIVE', 'ATIVO')
           AND (max_quantity - reserved_count - issued_count) >= $1
         RETURNING id`,
        [body.quantity, body.lotId]
      );
      if (updated.rowCount !== 1) {
        throw new ConflictException({
          code: 'ESTOQUE_ESGOTADO',
          message: 'Ingressos indisponíveis ou lote não liberado',
        });
      }

      await tx.query(
        `INSERT INTO p08_sale_orders (
           id, customer_id, event_id, session_id, lot_id, channel,
           quantity, unit_cents, total_cents, status,
           idempotency_key, request_hash, expires_at, created_by,
           pdv_terminal_id, pdv_shift_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'RESERVADO', $10, $11, $12::timestamptz, $13, $14, $15)`,
        [
          orderId,
          body.customerId,
          body.eventId,
          body.sessionId,
          body.lotId,
          body.channel,
          body.quantity,
          unitCents,
          totalCents,
          body.idempotencyKey,
          requestHash,
          exp.toISOString(),
          actor.userId,
          trustedPdv?.terminalId ?? null,
          trustedPdv?.shiftId ?? null,
        ]
      );

      return {
        id: orderId,
        status: 'RESERVADO',
        expiresAt: exp.toISOString(),
        totalCents,
        reused: false,
      };
    });

    if (!result.reused) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'PEDIDO_RESERVADO',
        resourceType: 'PEDIDO',
        resourceId: result.id,
        eventId: body.eventId,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p08-res-${result.id}`,
        afterState: {
          eventId: body.eventId,
          lotId: body.lotId,
          quantity: body.quantity,
          totalCents: result.totalCents,
          expiresAt: result.expiresAt,
        },
      });
    }

    return result;
  }

  async list(actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'FINANCEIRO_DISK', 'AUDITOR');
    const res = await this.db.query<{
      id: string;
      event_id: string;
      status: string;
      quantity: number;
      total_cents: number;
      channel: string;
      expires_at: string | Date;
      created_at: string | Date;
      event_name: string;
      customer_full_name: string;
    }>(
      `SELECT o.id, o.event_id, o.status, o.quantity, o.total_cents, o.channel,
              o.expires_at, o.created_at,
              e.title AS event_name,
              c.full_name AS customer_full_name
       FROM p08_sale_orders o
       INNER JOIN events e ON e.id = o.event_id
       INNER JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC
       LIMIT 100`
    );

    return {
      items: res.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        status: r.status,
        quantity: Number(r.quantity),
        totalCents: Number(r.total_cents),
        channel: r.channel,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        event: { name: r.event_name },
        customer: { fullName: r.customer_full_name },
      })),
    };
  }

  async get(id: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'FINANCEIRO_DISK', 'AUDITOR');
    const res = await this.db.query<{
      id: string;
      customer_id: string;
      event_id: string;
      session_id: string;
      lot_id: string;
      channel: string;
      quantity: number;
      unit_cents: number;
      total_cents: number;
      status: string;
      idempotency_key: string;
      expires_at: string | Date;
      created_by: string;
      created_at: string | Date;
      confirmed_at: string | Date | null;
      customer_full_name: string;
      event_name: string;
      session_name: string;
      lot_name: string;
    }>(
      `SELECT o.id, o.customer_id, o.event_id, o.session_id, o.lot_id, o.channel,
              o.quantity, o.unit_cents, o.total_cents, o.status, o.idempotency_key,
              o.expires_at, o.created_by, o.created_at, o.confirmed_at,
              c.full_name AS customer_full_name,
              e.title AS event_name,
              s.title AS session_name,
              l.modality_name AS lot_name
       FROM p08_sale_orders o
       INNER JOIN customers c ON c.id = o.customer_id
       INNER JOIN events e ON e.id = o.event_id
       INNER JOIN event_sessions s ON s.id = o.session_id
       INNER JOIN event_price_lots l ON l.id = o.lot_id
       WHERE o.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado' });
    }

    const r = res.rows[0];
    const ticketsRes = await this.db.query<{
      number: string;
      status: string;
      issued_at: string | Date;
    }>(
      `SELECT number, status, issued_at FROM p08_issued_tickets WHERE order_id = $1 ORDER BY number ASC`,
      [id]
    );

    // Nunca expõe Taxa Disk interna nem dados brutos de CPF no detalhe do pedido.
    return {
      id: r.id,
      customerId: r.customer_id,
      eventId: r.event_id,
      sessionId: r.session_id,
      lotId: r.lot_id,
      channel: r.channel,
      quantity: Number(r.quantity),
      unitCents: Number(r.unit_cents),
      totalCents: Number(r.total_cents),
      status: r.status,
      idempotencyKey: r.idempotency_key,
      expiresAt: r.expires_at,
      createdBy: r.created_by,
      createdAt: r.created_at,
      confirmedAt: r.confirmed_at,
      customer: { fullName: r.customer_full_name },
      event: { name: r.event_name },
      session: { name: r.session_name },
      lot: { name: r.lot_name },
      tickets: ticketsRes.rows.map((t) => ({
        number: t.number,
        status: t.status,
        issuedAt: t.issued_at,
      })),
    };
  }

  async expireReserved(actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES');
    const candidates = await this.db.query<{ id: string }>(
      `SELECT id FROM p08_sale_orders
       WHERE status = 'RESERVADO' AND expires_at <= NOW()
       ORDER BY expires_at ASC
       LIMIT 100`
    );

    let expired = 0;
    for (const row of candidates.rows) {
      const didExpire = await this.db.withTransaction(async (tx) => {
        const orderRes = await tx.query<{
          id: string;
          status: string;
          expires_at: string | Date;
          lot_id: string;
          quantity: number;
        }>(
          `SELECT id, status, expires_at, lot_id, quantity
           FROM p08_sale_orders WHERE id = $1 FOR UPDATE`,
          [row.id]
        );
        const order = orderRes.rows[0];
        if (!order || order.status !== 'RESERVADO' || new Date(order.expires_at) > new Date()) {
          return false;
        }
        const changed = await tx.query<{ id: string }>(
          `UPDATE event_price_lots
           SET reserved_count = reserved_count - $1
           WHERE id = $2 AND reserved_count >= $1
           RETURNING id`,
          [order.quantity, order.lot_id]
        );
        if (changed.rowCount !== 1) {
          throw new ConflictException({
            code: 'ESTOQUE_INCONSISTENTE',
            message: 'Estoque inconsistente; requer auditoria',
          });
        }
        await tx.query(
          `UPDATE seats SET status = 'AVAILABLE', active_hold_id = NULL, updated_at = NOW() WHERE active_hold_id = $1`,
          [row.id]
        );
        await tx.query(
          `UPDATE p08_sale_orders SET status = 'EXPIRADO', updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
        return true;
      });

      if (didExpire) {
        expired++;
        await this.auditService.record({
          actorUserId: actor.userId,
          actorRole: actor.roles.join(','),
          sessionId: actor.sessionId,
          canonicalAction: 'RESERVA_EXPIRADA',
          resourceType: 'PEDIDO',
          resourceId: row.id,
          outcome: 'SUCCESS',
          correlationId: correlationId ?? `p08-exp-${row.id}`,
          afterState: { status: 'EXPIRADO' },
        });
      }
    }

    return {
      processed: candidates.rows.length,
      expired,
      remainingMayExist: candidates.rows.length === 100,
    };
  }

  async findTicket(number: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'AUDITOR');
    if (!/^\d{8}$/.test(number || '')) {
      throw new BadRequestException({
        code: 'NUMERO_INGRESSO_INVALIDO',
        message: 'Informe oito dígitos numéricos',
      });
    }
    const res = await this.db.query<{
      number: string;
      status: string;
      issued_at: string | Date;
      order_id: string;
      order_status: string;
      customer_full_name: string;
      event_id: string;
      event_name: string;
      session_id: string;
      session_name: string;
    }>(
      `SELECT t.number, t.status, t.issued_at, t.order_id,
              o.status AS order_status,
              c.full_name AS customer_full_name,
              e.id AS event_id, e.title AS event_name,
              s.id AS session_id, s.title AS session_name
       FROM p08_issued_tickets t
       INNER JOIN p08_sale_orders o ON o.id = t.order_id
       INNER JOIN customers c ON c.id = o.customer_id
       INNER JOIN events e ON e.id = t.event_id
       INNER JOIN event_sessions s ON s.id = t.session_id
       WHERE t.number = $1`,
      [number]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'INGRESSO_NAO_ENCONTRADO', message: 'Ingresso não encontrado' });
    }
    const t = res.rows[0];
    return {
      number: t.number,
      status: t.status,
      issuedAt: t.issued_at,
      orderId: t.order_id,
      event: { id: t.event_id, name: t.event_name },
      session: { id: t.session_id, name: t.session_name },
      customerName: t.customer_full_name,
    };
  }

  async cancelUnpaid(id: string, actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES');
    const result = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        lot_id: string;
        quantity: number;
      }>(
        `SELECT id, status, lot_id, quantity FROM p08_sale_orders WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const order = rows.rows[0];
      if (!order) {
        throw new NotFoundException({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado' });
      }
      if (order.status === 'CANCELADO') {
        return { id, status: 'CANCELADO', alreadyCancelled: true };
      }
      if (order.status !== 'RESERVADO') {
        throw new ConflictException({
          code: 'PEDIDO_NAO_CANCELAVEL_DIRETO',
          message: 'Pedido liquidado ou expirado exige outro fluxo',
        });
      }
      const updated = await tx.query<{ id: string }>(
        `UPDATE event_price_lots
         SET reserved_count = reserved_count - $1
         WHERE id = $2 AND reserved_count >= $1
         RETURNING id`,
        [order.quantity, order.lot_id]
      );
      if (updated.rowCount !== 1) {
        throw new ConflictException({
          code: 'ESTOQUE_INCONSISTENTE',
          message: 'Estoque inconsistente',
        });
      }
      await tx.query(
        `UPDATE seats SET status = 'AVAILABLE', active_hold_id = NULL, updated_at = NOW() WHERE active_hold_id = $1`,
        [id]
      );
      await tx.query(
        `UPDATE p08_sale_orders SET status = 'CANCELADO', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return { id, status: 'CANCELADO', alreadyCancelled: false };
    });

    if (!result.alreadyCancelled) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'RESERVA_CANCELADA',
        resourceType: 'PEDIDO',
        resourceId: id,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p08-cancel-${id}`,
      });
    }

    return result;
  }

  /** PED-003: Valida cupom promocional no servidor para simulação/reserva de pedido. */
  async validateCouponForOrder(
    eventId: string,
    code: string,
    subtotalCents: number,
    actor: AuthenticatedActorDto
  ) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'PDV');
    const normalizedCode = (code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException({ code: 'CUPOM_INVALIDO', message: 'Informe um código de cupom' });
    }
    const res = await this.db.query<{
      id: string;
      code: string;
      discount_type: string;
      discount_value_bps: number | null;
      discount_value_cents: string | number | null;
      max_uses: number | null;
      current_uses: number;
      valid_from: string | Date | null;
      valid_until: string | Date | null;
      is_active: boolean;
    }>(
      `SELECT id, code, discount_type, discount_value_bps, discount_value_cents,
              max_uses, current_uses, valid_from, valid_until, is_active
       FROM coupon_campaigns
       WHERE event_id = $1 AND UPPER(code) = $2
       LIMIT 1`,
      [eventId, normalizedCode]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({
        code: 'CUPOM_NAO_ENCONTRADO',
        message: 'Cupom promocional não encontrado para este evento',
      });
    }
    const c = res.rows[0];
    let couponCalc = { discountCents: 0, finalTotalCents: subtotalCents };
    asRequestError(() => {
      if (!c.is_active) {
        throw new SalesRuleError('Cupom promocional inativo');
      }
      if (c.max_uses !== null && Number(c.current_uses) >= Number(c.max_uses)) {
        throw new SalesRuleError('Cupom promocional esgotado');
      }
      couponCalc = calculateCouponDiscountCents(subtotalCents, {
        discountType: c.discount_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
        percentageRate: c.discount_value_bps !== null ? Number(c.discount_value_bps) / 100 : null,
        fixedAmountCents: c.discount_value_cents !== null ? Number(c.discount_value_cents) : null,
      });
    });

    return {
      couponId: c.id,
      code: c.code,
      discountType: c.discount_type,
      subtotalCents,
      discountCents: couponCalc.discountCents,
      finalTotalCents: couponCalc.finalTotalCents,
    };
  }

  /** PED-002: Lista poltronas disponíveis e bloqueadas de um setor numerado. */
  async listAvailableSeats(eventId: string, sectorId: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'PDV');
    const res = await this.db.query<{
      id: string;
      row_label: string;
      seat_number: string;
      seat_label: string;
      status: string;
      is_accessible: boolean;
    }>(
      `SELECT st.id, st.row_label, st.seat_number, st.seat_label, st.status, st.is_accessible
       FROM seats st
       INNER JOIN event_sectors sec ON sec.id = st.sector_id
       WHERE sec.event_id = $1 AND st.sector_id = $2
       ORDER BY st.row_label ASC, st.seat_number ASC
       LIMIT 300`,
      [eventId, sectorId]
    );
    return {
      sectorId,
      items: res.rows.map((r) => ({
        id: r.id,
        rowLabel: r.row_label,
        seatNumber: r.seat_number,
        seatLabel: r.seat_label,
        status: r.status,
        isAccessible: Boolean(r.is_accessible),
      })),
    };
  }

  /**
   * INTERNAL ONLY: sem Controller HTTP.
   * O adaptador futuro deve validar webhook do provedor, gerar prova HMAC de seu processamento interno
   * e chamar este serviço por canal autenticado. Em homologação, ENABLE_REAL_PAYMENTS=false bloqueia tudo.
   */
  async confirmVerifiedSettlement(receipt: AdapterReceipt) {
    if (process.env.ENABLE_REAL_PAYMENTS!=='true') {
      throw new ServiceUnavailableException({
        code: 'LIQUIDACAO_REAL_BLOQUEADA',
        message: 'Liquidação real proibida neste ambiente',
      });
    }
    const secret = process.env.PAYMENT_ADAPTER_SIGNING_SECRET || '';
    if (secret.length < 32) {
      throw new ServiceUnavailableException({
        code: 'ASSINATURA_ADAPTADOR_AUSENTE',
        message: 'Assinatura do adaptador não configurada',
      });
    }
    if (
      !receipt ||
      !receipt.provider ||
      !receipt.providerRef ||
      !receipt.orderId ||
      !Number.isSafeInteger(receipt.amountCents) ||
      receipt.amountCents < 0 ||
      !/^[a-f\d]{64}$/i.test(receipt.signature)
    ) {
      throw new BadRequestException({ code: 'COMPROVANTE_INVALIDO', message: 'Comprovante inválido' });
    }
    const when = new Date(receipt.verifiedAt);
    if (Number.isNaN(when.getTime()) || Math.abs(Date.now() - when.getTime()) > 5 * 60_000) {
      throw new BadRequestException({ code: 'COMPROVANTE_FORA_JANELA', message: 'Comprovante fora da janela' });
    }
    const expected = createHmac('sha256', secret).update(settlementCanonical(receipt)).digest();
    const provided = Buffer.from(receipt.signature, 'hex');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new BadRequestException({
        code: 'COMPROVANTE_ASSINATURA_INVALIDA',
        message: 'Comprovante sem assinatura válida',
      });
    }

    const res = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        lot_id: string;
        event_id: string;
        session_id: string;
        quantity: number;
        total_cents: number;
        expires_at: string | Date;
      }>(
        `SELECT id, status, lot_id, event_id, session_id, quantity, total_cents, expires_at
         FROM p08_sale_orders WHERE id = $1 FOR UPDATE`,
        [receipt.orderId]
      );
      const order = rows.rows[0];
      if (!order) {
        throw new NotFoundException({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado' });
      }
      if (order.status === 'PAGO') {
        const prevRes = await tx.query<{
          provider: string;
          provider_ref: string;
          amount_cents: number;
        }>(
          `SELECT provider, provider_ref, amount_cents
           FROM p08_payment_confirmations WHERE order_id = $1`,
          [order.id]
        );
        const prev = prevRes.rows[0];
        if (
          prev &&
          prev.provider === receipt.provider &&
          prev.provider_ref === receipt.providerRef &&
          Number(prev.amount_cents) === receipt.amountCents
        ) {
          return {
            id: order.id,
            status: 'PAGO',
            tickets: Number(order.quantity),
            alreadyProcessed: true,
            eventId: order.event_id,
            quantity: Number(order.quantity),
            amountCents: Number(order.total_cents),
          };
        }
        throw new ConflictException({
          code: 'CONFIRMACAO_DIVERGENTE',
          message: 'Confirmação divergente para pedido já liquidado',
        });
      }

      const activeEv = await tx.query<{ status: string }>(
        `SELECT status FROM events WHERE id = $1`,
        [order.event_id]
      );
      if (activeEv.rows[0]?.status !== 'PUBLICADO') {
        throw new ConflictException({
          code: 'EVENTO_NAO_PUBLICADO',
          message: 'Evento não pode receber nova liquidação automática',
        });
      }

      asRequestError(() =>
        assertConfirmedPayment(
          {
            status: order.status as 'RESERVADO',
            expiresAt: new Date(order.expires_at),
            totalCents: Number(order.total_cents),
          },
          { amountCents: receipt.amountCents, verified: true },
          new Date()
        )
      );

      const change = await tx.query<{ id: string }>(
        `UPDATE event_price_lots
         SET reserved_count = reserved_count - $1,
             issued_count = issued_count + $1
         WHERE id = $2 AND reserved_count >= $1
         RETURNING id`,
        [order.quantity, order.lot_id]
      );
      if (change.rowCount !== 1) {
        throw new ConflictException({ code: 'ESTOQUE_INCONSISTENTE', message: 'Estoque inconsistente' });
      }

      await tx.query(
        `INSERT INTO p08_ticket_sequences (id, last_number) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`
      );
      const seqRes = await tx.query<{ last_number: number }>(
        `UPDATE p08_ticket_sequences SET last_number = last_number + $1 WHERE id = 1 RETURNING last_number`,
        [order.quantity]
      );
      const lastNumber = Number(seqRes.rows[0].last_number);
      const first = lastNumber - Number(order.quantity) + 1;
      const ticketNumbers = Array.from({ length: Number(order.quantity) }, (_, i) =>
        formatTicketNumber(first + i)
      );

      for (const number of ticketNumbers) {
        await tx.query(
          `INSERT INTO p08_issued_tickets (id, number, order_id, event_id, session_id, lot_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'EMITIDO')`,
          [randomUUID(), number, order.id, order.event_id, order.session_id, order.lot_id]
        );
      }

      await tx.query(
        `INSERT INTO p08_payment_confirmations (id, order_id, provider, provider_ref, amount_cents, evidence_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          order.id,
          receipt.provider,
          receipt.providerRef,
          receipt.amountCents,
          createHash('sha256').update(receipt.signature).digest('hex'),
        ]
      );

      await tx.query(
        `UPDATE p08_sale_orders SET status = 'PAGO', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [order.id]
      );

      await tx.query(
        `INSERT INTO outbox_events (
           id, event_name, schema_version, aggregate_type, aggregate_id,
           correlation_id, event_id, payload, status
         ) VALUES ($1, 'BRAVO_ORDER_PAID', 1, 'BravoSaleOrder', $2, $3, $4, $5::jsonb, 'PENDING')`,
        [
          randomUUID(),
          order.id,
          `bravo-order-paid:${order.id}`,
          order.event_id,
          JSON.stringify({
            orderId: order.id,
            eventId: order.event_id,
            totalCents: Number(order.total_cents),
            provider: receipt.provider,
            providerRef: receipt.providerRef,
          }),
        ]
      );

      return {
        id: order.id,
        status: 'PAGO',
        tickets: ticketNumbers.length,
        ticketNumbers,
        alreadyProcessed: false,
        eventId: order.event_id,
        quantity: Number(order.quantity),
        amountCents: Number(order.total_cents),
      };
    });

    if (!res.alreadyProcessed) {
      await this.auditService.record({
        actorUserId: null,
        actorRole: 'worker:adquirente',
        canonicalAction: 'PAGAMENTO_CONFIRMADO',
        resourceType: 'PEDIDO',
        resourceId: res.id,
        eventId: res.eventId,
        outcome: 'SUCCESS',
        correlationId: `bravo-order-paid:${res.id}`,
        afterState: {
          status: 'PAGO',
          quantity: res.quantity,
          amountCents: res.amountCents,
        },
      });
    }

    return {
      id: res.id,
      status: res.status,
      tickets: res.tickets,
      alreadyProcessed: res.alreadyProcessed,
    };
  }
}
