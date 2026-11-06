import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CHANGE_FLOW, type ChangeStatus, checkTransition } from '@bravo-ii/domain-p10';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  type Actor,
  asConflict,
  choice,
  requireInternal,
  sacRead,
  sacWrite,
  uid,
  val,
} from './common';

@Injectable()
export class BravoAfterSalesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private async withSerializableRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const pgCode = (err as { code?: string })?.code;
        if (pgCode === '40001' && attempt < maxRetries) {
          continue;
        }
        if (pgCode === '40001') {
          throw new ConflictException({
            code: 'TROCA_ATIVA_EXISTENTE',
            message: 'Já existe troca ativa para este ingresso',
          });
        }
        throw err;
      }
    }
  }

  async requestExchange(
    body: {
      orderId: string;
      ticketId: string;
      targetSessionId: string;
      targetLotId: string;
      reason: string;
    },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const orderId = uid(body?.orderId);
    const ticketId = uid(body?.ticketId);
    const targetSessionId = uid(body?.targetSessionId);
    const targetLotId = uid(body?.targetLotId);
    const reason = val(body?.reason, 10, 2000);
    const id = randomUUID();

    const row = await this.withSerializableRetry(() =>
      this.db.withTransaction(async (tx) => {
        // $queryRaw FOR UPDATE equivalence in SERIALIZABLE transaction
        const ticketRes = await tx.query<{
          id: string;
          order_id: string;
          event_id: string;
          session_id: string;
          lot_id: string;
          status: string;
        }>(
          `SELECT id, order_id, event_id, session_id, lot_id, status
           FROM p08_issued_tickets WHERE id = $1 FOR UPDATE`,
          [ticketId]
        );
        const ticket = ticketRes.rows[0];
        if (!ticket) {
          throw new NotFoundException({ code: 'INGRESSO_NAO_ENCONTRADO', message: 'Ingresso não encontrado' });
        }

        const [orderRes, targetLotRes, existingRes] = await Promise.all([
          tx.query<{ id: string; status: string }>(
            `SELECT id, status FROM p08_sale_orders WHERE id = $1`,
            [orderId]
          ),
          tx.query<{
            id: string;
            event_id: string;
            session_id: string;
            status: string;
            session_starts_at: string | Date;
          }>(
            `SELECT l.id, l.event_id, l.session_id, l.status, s.starts_at AS session_starts_at
             FROM event_price_lots l
             INNER JOIN event_sessions s ON s.id = l.session_id
             WHERE l.id = $1`,
            [targetLotId]
          ),
          tx.query<{ id: string }>(
            `SELECT id FROM p10_order_change_requests
             WHERE ticket_id = $1
               AND status IN ('SOLICITADA', 'EM_ANALISE', 'APROVADA_OPERACAO', 'AGUARDANDO_PAGAMENTO', 'PRONTA_EXECUCAO')
             LIMIT 1`,
            [ticketId]
          ),
        ]);

        const order = orderRes.rows[0];
        const targetLot = targetLotRes.rows[0];
        if (!order) {
          throw new NotFoundException({
            code: 'PEDIDO_NAO_ENCONTRADO',
            message: 'Ingresso ou pedido não encontrado',
          });
        }
        if (existingRes.rows.length > 0) {
          throw new ConflictException({
            code: 'TROCA_ATIVA_EXISTENTE',
            message: 'Já existe troca ativa para este ingresso',
          });
        }
        if (ticket.order_id !== order.id || order.status !== 'PAGO' || ticket.status !== 'EMITIDO') {
          throw new ConflictException({
            code: 'INGRESSO_NAO_ELEGIVEL_TROCA',
            message: 'Ingresso não elegível para troca',
          });
        }
        const lotActive = targetLot && ['ACTIVE', 'ATIVO'].includes(targetLot.status);
        if (
          !targetLot ||
          targetLot.event_id !== ticket.event_id ||
          targetLot.session_id !== targetSessionId ||
          !lotActive ||
          new Date(targetLot.session_starts_at) <= new Date()
        ) {
          throw new ConflictException({
            code: 'DESTINO_INDISPONIVEL',
            message: 'Lote ou sessão de destino indisponível',
          });
        }

        const insRes = await tx.query<{
          id: string;
          order_id: string;
          ticket_id: string;
          target_session_id: string;
          target_lot_id: string;
          type: string;
          reason: string;
          status: string;
          version: number;
          requested_by: string;
          reviewed_by: string | null;
          reviewed_at: string | Date | null;
          created_at: string | Date;
          updated_at: string | Date;
        }>(
          `INSERT INTO p10_order_change_requests (
             id, order_id, ticket_id, target_session_id, target_lot_id,
             type, reason, status, requested_by
           ) VALUES ($1, $2, $3, $4, $5, 'TROCA_SESSAO', $6, 'SOLICITADA', $7)
           RETURNING *`,
          [id, orderId, ticketId, targetSessionId, targetLotId, reason, actor.userId]
        );
        return insRes.rows[0];
      })
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'TROCA_SOLICITADA',
      resourceType: 'TROCA',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-chg-${row.id}`,
      afterState: { orderId, ticketId, targetSessionId, targetLotId },
    });

    return this.mapChange(row);
  }

  async listExchanges(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<any>(
      `SELECT * FROM p10_order_change_requests ORDER BY created_at DESC LIMIT 100`
    );
    return { items: res.rows.map((r) => this.mapChange(r)) };
  }

  async reviewExchange(
    requestId: string,
    body: { decision: string; reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(requestId);
    const decision = choice(body?.decision, ['ANALISAR', 'APROVAR', 'NEGAR']);
    const reason = val(body?.reason, 5, 1000);

    const { updated, priorStatus } = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        requested_by: string;
      }>(
        `SELECT id, status, requested_by FROM p10_order_change_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const row = rows.rows[0];
      if (!row) {
        throw new NotFoundException({
          code: 'SOLICITACAO_NAO_ENCONTRADA',
          message: 'Solicitação não encontrada',
        });
      }
      if (row.requested_by === actor.userId) {
        throw new ForbiddenException({
          code: 'AUTO_REVISAO_PROIBIDA',
          message: 'A revisão exige outro usuário',
        });
      }
      const next: ChangeStatus =
        decision === 'ANALISAR'
          ? 'EM_ANALISE'
          : decision === 'APROVAR'
            ? 'APROVADA_OPERACAO'
            : 'NEGADA';
      asConflict(() => checkTransition(CHANGE_FLOW, row.status as ChangeStatus, next));

      const updRes = await tx.query<any>(
        `UPDATE p10_order_change_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), version = version + 1, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [next, actor.userId, row.id]
      );
      return { updated: updRes.rows[0], priorStatus: row.status };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'TROCA_ANALISE',
      resourceType: 'TROCA',
      resourceId: updated.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-chg-rev-${updated.id}`,
      beforeState: { status: priorStatus },
      afterState: { status: updated.status },
    });

    return this.mapChange(updated);
  }

  async qualifyExchange(requestId: string, actor: Actor, correlationId?: string) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(requestId);

    const out = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        ticket_id: string;
        target_lot_id: string;
      }>(
        `SELECT id, status, ticket_id, target_lot_id
         FROM p10_order_change_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const req = rows.rows[0];
      if (!req) {
        throw new NotFoundException({ code: 'TROCA_NAO_ENCONTRADA', message: 'Troca não encontrada' });
      }
      if (req.status !== 'APROVADA_OPERACAO') {
        throw new ConflictException({
          code: 'TROCA_SEM_APROVACAO_OPERACIONAL',
          message: 'Troca sem análise aprovada',
        });
      }

      const [ticketRes, targetLotRes] = await Promise.all([
        tx.query<{ lot_id: string }>(`SELECT lot_id FROM p08_issued_tickets WHERE id = $1`, [
          req.ticket_id,
        ]),
        tx.query<{ nominal_price_cents: string | number }>(
          `SELECT nominal_price_cents FROM event_price_lots WHERE id = $1`,
          [req.target_lot_id]
        ),
      ]);
      const ticket = ticketRes.rows[0];
      const targetLot = targetLotRes.rows[0];
      if (!ticket || !targetLot) {
        throw new NotFoundException({ code: 'LOTE_NAO_ENCONTRADO', message: 'Lote não encontrado' });
      }

      const origLotRes = await tx.query<{ nominal_price_cents: string | number }>(
        `SELECT nominal_price_cents FROM event_price_lots WHERE id = $1`,
        [ticket.lot_id]
      );
      const originalLot = origLotRes.rows[0];
      if (!originalLot) {
        throw new NotFoundException({ code: 'LOTE_NAO_ENCONTRADO', message: 'Lote não encontrado' });
      }

      const origCents = Number(originalLot.nominal_price_cents);
      const targetCents = Number(targetLot.nominal_price_cents);
      const equal = origCents === targetCents;
      const next: ChangeStatus = equal ? 'PRONTA_EXECUCAO' : 'AGUARDANDO_PAGAMENTO';

      await tx.query(
        `UPDATE p10_order_change_requests
         SET status = $1, version = version + 1, updated_at = NOW()
         WHERE id = $2`,
        [next, req.id]
      );

      return {
        id: req.id,
        status: next,
        differenceCents: targetCents - origCents,
      };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'TROCA_QUALIFICADA',
      resourceType: 'TROCA',
      resourceId: out.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-chg-qual-${out.id}`,
      afterState: { status: out.status, differenceCents: out.differenceCents },
    });

    return out;
  }

  /** Bloqueado por padrão. Exige homologação do check-in/portaria e de reserva atômica. */
  async executeExchange(_requestId: string, actor: Actor) {
    requireInternal(actor, 'OPERACOES');
    if (
      process.env.BRAVO_ENV !== 'HOMOLOGACAO' ||
      process.env.ENABLE_TICKET_REPLACEMENT !== 'true' ||
      process.env.ACCESS_GATE_INTEGRATED !== 'true'
    ) {
      throw new ServiceUnavailableException('Troca física desabilitada: inventário e validação da portaria pendentes');
    }
    // Sem um serviço de portaria homologado, não há forma confiável de confirmar que o ingresso não foi usado.
    throw new ServiceUnavailableException('Execução bloqueada até implementar verificação de entrada/check-in transacional; use solicitação e análise');
  }

  async requestCancel(
    body: {
      type: string;
      orderId?: string;
      eventId?: string;
      ticketId?: string;
      reason: string;
    },
    actor: Actor,
    correlationId?: string
  ) {
    sacWrite(actor);
    const type = choice(body?.type, ['INGRESSO', 'PEDIDO', 'EVENTO']);
    const reason = val(body?.reason, 10, 2000);
    const orderId = body?.orderId ? uid(body.orderId) : undefined;
    const eventId = body?.eventId ? uid(body.eventId) : undefined;
    const ticketId = body?.ticketId ? uid(body.ticketId) : undefined;

    if (type === 'EVENTO' && (!eventId || orderId || ticketId)) {
      throw new ConflictException({
        code: 'CANCELAMENTO_EVENTO_PARAMETROS',
        message: 'Cancelamento de evento exige apenas ID do evento',
      });
    }
    if (type === 'PEDIDO' && (!orderId || eventId || ticketId)) {
      throw new ConflictException({
        code: 'CANCELAMENTO_PEDIDO_PARAMETROS',
        message: 'Cancelamento do pedido exige apenas ID do pedido',
      });
    }
    if (type === 'INGRESSO' && (!ticketId || !orderId || eventId)) {
      throw new ConflictException({
        code: 'CANCELAMENTO_INGRESSO_PARAMETROS',
        message: 'Informe ingresso e pedido',
      });
    }

    const [orderRes, ticketRes, eventRes] = await Promise.all([
      orderId
        ? this.db.query<{ id: string }>(`SELECT id FROM p08_sale_orders WHERE id = $1`, [orderId])
        : Promise.resolve({ rows: [] as { id: string }[] }),
      ticketId
        ? this.db.query<{ id: string; order_id: string; status: string }>(
            `SELECT id, order_id, status FROM p08_issued_tickets WHERE id = $1`,
            [ticketId]
          )
        : Promise.resolve({ rows: [] as { id: string; order_id: string; status: string }[] }),
      eventId
        ? this.db.query<{ id: string }>(`SELECT id FROM events WHERE id = $1`, [eventId])
        : Promise.resolve({ rows: [] as { id: string }[] }),
    ]);

    const order = orderRes.rows[0] ?? null;
    const ticket = ticketRes.rows[0] ?? null;
    const event = eventRes.rows[0] ?? null;

    if ((orderId && !order) || (ticketId && !ticket) || (eventId && !event)) {
      throw new NotFoundException({ code: 'RECURSO_NAO_ENCONTRADO', message: 'Recurso não encontrado' });
    }
    if (ticket && ticket.order_id !== orderId) {
      throw new ConflictException({
        code: 'INGRESSO_PEDIDO_DIVERGENTE',
        message: 'Ingresso não pertence ao pedido',
      });
    }
    if (ticket && ticket.status !== 'EMITIDO') {
      throw new ConflictException({
        code: 'INGRESSO_NAO_ELEGIVEL_CANCELAMENTO',
        message: 'Ingresso não elegível para cancelamento',
      });
    }

    const id = randomUUID();
    const row = await this.db.withTransaction(async (tx) => {
      const res = await tx.query<any>(
        `INSERT INTO p10_cancellation_requests (
           id, type, order_id, event_id, ticket_id, reason, status, requested_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'SOLICITADO', $7)
         RETURNING *`,
        [id, type, orderId ?? null, eventId ?? null, ticketId ?? null, reason, actor.userId]
      );
      return res.rows[0];
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'CANCELAMENTO_SOLICITADO',
      resourceType: 'CANCELAMENTO',
      resourceId: row.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-cnc-${row.id}`,
      afterState: { type, orderId: orderId ?? null, eventId: eventId ?? null, ticketId: ticketId ?? null },
    });

    return this.mapCancel(row);
  }

  async listCancellations(actor: Actor) {
    sacRead(actor);
    const res = await this.db.query<any>(
      `SELECT * FROM p10_cancellation_requests ORDER BY created_at DESC LIMIT 100`
    );
    return { items: res.rows.map((r) => this.mapCancel(r)) };
  }

  async reviewCancellation(
    caseId: string,
    body: { decision: string; reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'OPERACOES', 'ADMIN');
    const id = uid(caseId);
    const decision = choice(body?.decision, ['ANALISAR', 'APROVAR_OPERACAO', 'NEGAR']);
    const reason = val(body?.reason, 5, 1000);

    const { record, priorStatus } = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        requested_by: string;
      }>(
        `SELECT id, status, requested_by FROM p10_cancellation_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const row = rows.rows[0];
      if (!row) {
        throw new NotFoundException({
          code: 'CANCELAMENTO_INEXISTENTE',
          message: 'Cancelamento inexistente',
        });
      }
      if (row.requested_by === actor.userId) {
        throw new ForbiddenException({
          code: 'AUTO_ANALISE_PROIBIDA',
          message: 'Analista deve ser outro usuário',
        });
      }
      const next =
        decision === 'ANALISAR'
          ? 'EM_ANALISE'
          : decision === 'APROVAR_OPERACAO'
            ? 'APROVADO_OPERACAO'
            : 'NEGADO';
      if (
        (row.status === 'SOLICITADO' && next !== 'EM_ANALISE') ||
        (row.status === 'EM_ANALISE' && next === 'EM_ANALISE') ||
        !['SOLICITADO', 'EM_ANALISE'].includes(row.status)
      ) {
        throw new ConflictException({
          code: 'ETAPA_CANCELAMENTO_INCOMPATIVEL',
          message: 'Etapa de cancelamento incompatível',
        });
      }

      const updRes = await tx.query<any>(
        `UPDATE p10_cancellation_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [next, actor.userId, row.id]
      );
      return { record: updRes.rows[0], priorStatus: row.status };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'CANCELAMENTO_ANALISE',
      resourceType: 'CANCELAMENTO',
      resourceId: record.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-cnc-rev-${record.id}`,
      beforeState: { status: priorStatus },
      afterState: { status: record.status },
    });

    return this.mapCancel(record);
  }

  async eventBatchPlan(eventId: string, caseId: string, actor: Actor, correlationId?: string) {
    requireInternal(actor, 'FINANCEIRO_DISK');
    const ev = uid(eventId);
    const cid = uid(caseId);

    const out = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        change_type: string;
        status: string;
        finance_review_status: string | null;
      }>(
        `SELECT id, change_type, status, finance_review_status
         FROM event_change_cases
         WHERE id = $1 AND event_id = $2
         FOR UPDATE`,
        [cid, ev]
      );
      const record = rows.rows[0];
      if (
        !record ||
        record.change_type !== 'CANCELAMENTO' ||
        record.status !== 'APROVADO' ||
        record.finance_review_status !== 'APROVADO'
      ) {
        throw new ConflictException({
          code: 'CANCELAMENTO_EVENTO_NAO_APROVADO',
          message: 'Cancelamento do evento ainda sem aprovação formal',
        });
      }

      const existingRes = await tx.query<{
        id: string;
        event_id: string;
        event_case_id: string;
        status: string;
        eligible_orders: number;
        planned_value_cents: string | number;
        created_by: string;
        created_at: string | Date;
      }>(`SELECT * FROM p10_event_refund_batches WHERE event_case_id = $1 LIMIT 1`, [cid]);
      if (existingRes.rows.length > 0) {
        const ex = existingRes.rows[0];
        return {
          id: ex.id,
          eventId: ex.event_id,
          eventCaseId: ex.event_case_id,
          status: ex.status,
          eligibleOrders: Number(ex.eligible_orders),
          plannedValueCents: String(ex.planned_value_cents),
          createdBy: ex.created_by,
          createdAt: ex.created_at,
          alreadyExisted: true,
        };
      }

      const [ordersAgg, refundsAgg] = await Promise.all([
        tx.query<{ count: string; sum_cents: string | null }>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_cents), 0)::text AS sum_cents
           FROM p08_sale_orders
           WHERE event_id = $1 AND status = 'PAGO'`,
          [ev]
        ),
        tx.query<{ sum_cents: string | null }>(
          `SELECT COALESCE(SUM(r.amount_cents), 0)::text AS sum_cents
           FROM p10_refund_requests r
           INNER JOIN p08_sale_orders o ON o.id = r.order_id
           WHERE o.event_id = $1 AND r.status <> 'NEGADO'`,
          [ev]
        ),
      ]);

      const eligibleOrders = Number(ordersAgg.rows[0]?.count ?? 0);
      const totalPaid = Number(ordersAgg.rows[0]?.sum_cents ?? 0);
      const existingRefunds = Number(refundsAgg.rows[0]?.sum_cents ?? 0);
      const pending = Math.max(0, totalPaid - existingRefunds);
      const batchId = randomUUID();

      const insRes = await tx.query<{
        id: string;
        event_id: string;
        event_case_id: string;
        status: string;
        eligible_orders: number;
        planned_value_cents: string | number;
        created_by: string;
        created_at: string | Date;
      }>(
        `INSERT INTO p10_event_refund_batches (
           id, event_id, event_case_id, status, eligible_orders, planned_value_cents, created_by
         ) VALUES ($1, $2, $3, 'PLANEJADO', $4, $5, $6)
         RETURNING *`,
        [batchId, ev, cid, eligibleOrders, pending, actor.userId]
      );
      const b = insRes.rows[0];
      return {
        id: b.id,
        eventId: b.event_id,
        eventCaseId: b.event_case_id,
        status: b.status,
        eligibleOrders: Number(b.eligible_orders),
        plannedValueCents: String(b.planned_value_cents),
        createdBy: b.created_by,
        createdAt: b.created_at,
        alreadyExisted: false,
      };
    });

    if (!out.alreadyExisted) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'LOTE_ESTORNOS_PLANEJADO',
        resourceType: 'LOTE_CANCELAMENTO',
        resourceId: out.id,
        eventId: ev,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p10-batch-${out.id}`,
        afterState: {
          eventId: ev,
          eligibleOrders: out.eligibleOrders,
          plannedValueCents: out.plannedValueCents,
        },
      });
    }

    const { alreadyExisted: _ignore, ...response } = out;
    return response;
  }

  private mapChange(r: any) {
    return {
      id: r.id,
      orderId: r.order_id,
      ticketId: r.ticket_id,
      targetSessionId: r.target_session_id,
      targetLotId: r.target_lot_id,
      type: r.type,
      reason: r.reason,
      status: r.status,
      version: Number(r.version ?? 1),
      requestedBy: r.requested_by,
      reviewedBy: r.reviewed_by ?? null,
      reviewedAt: r.reviewed_at ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapCancel(r: any) {
    return {
      id: r.id,
      type: r.type,
      orderId: r.order_id ?? null,
      eventId: r.event_id ?? null,
      ticketId: r.ticket_id ?? null,
      reason: r.reason,
      status: r.status,
      requestedBy: r.requested_by,
      reviewedBy: r.reviewed_by ?? null,
      reviewedAt: r.reviewed_at ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
