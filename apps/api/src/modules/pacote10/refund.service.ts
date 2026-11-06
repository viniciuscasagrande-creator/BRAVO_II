import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  REFUND_FLOW,
  type RefundStatus,
  assertApproval,
  assertRefundAmount,
  checkTransition,
} from '@bravo-ii/domain-p10';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  type Actor,
  asConflict,
  financeWrite,
  requireInternal,
  uid,
  val,
} from './common';

/** Contrato de futuro worker isolado. Não há adaptador externo de devolução habilitado neste pacote. */
export interface VerifiedRefundProviderResult {
  refundId: string;
  provider: string;
  providerTransactionId: string;
  amountCents: number;
  evidenceHash: string;
  verifiedAt: Date;
  result: 'CONFIRMADO' | 'RECUSADO';
}

export interface RefundProviderPort {
  submitApprovedRefund(
    refundId: string,
    idempotencyKey: string
  ): Promise<{ externalId: string; status: 'PROCESSANDO' }>;
}

@Injectable()
export class BravoRefundService {
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
            code: 'CONFLITO_CONCORRENCIA_SERIALIZABLE',
            message: 'Conflito concorrente na reserva financeira do pedido',
          });
        }
        throw err;
      }
    }
  }

  async request(
    body: {
      orderId: string;
      cancellationId?: string;
      amountCents: number;
      reason: string;
      idempotencyKey: string;
    },
    actor: Actor,
    correlationId?: string
  ) {
    requireInternal(actor, 'SAC', 'OPERACOES', 'FINANCEIRO_DISK');
    const orderId = uid(body?.orderId);
    const cancellationId = body?.cancellationId ? uid(body.cancellationId) : null;
    const idempotencyKey = uid(body?.idempotencyKey);
    const reason = val(body?.reason, 10, 2000);
    const amountCents = body?.amountCents;

    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      amountCents > 2147483647
    ) {
      throw new BadRequestException({
        code: 'VALOR_CENTAVOS_INVALIDO',
        message: 'Valor deve ser centavos inteiros positivos dentro da capacidade do banco',
      });
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          orderId,
          cancellationId,
          idempotencyKey,
          amountCents,
          reason,
        })
      )
      .digest('hex');

    const existingRes = await this.db.query<any>(
      `SELECT * FROM p10_refund_requests WHERE idempotency_key = $1`,
      [idempotencyKey]
    );
    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (existing.request_hash !== requestHash) {
        throw new ConflictException({
          code: 'IDEMPOTENCIA_DIVERGENTE',
          message: 'Chave idempotente reutilizada com dados diferentes',
        });
      }
      return { ...this.mapRefund(existing), reused: true };
    }

    const result = await this.withSerializableRetry(() =>
      this.db.withTransaction(async (tx) => {
        // $queryRaw SELECT "id","status","totalCents" FROM "BravoSaleOrder" WHERE "id"=${orderId}::uuid FOR UPDATE
        const orderRows = await tx.query<{
          id: string;
          status: string;
          total_cents: number;
          quantity: number;
          event_id: string;
        }>(
          `SELECT id, status, total_cents, quantity, event_id
           FROM p08_sale_orders
           WHERE id = $1 FOR UPDATE`,
          [orderId]
        );
        const order = orderRows.rows[0];
        if (!order) {
          throw new NotFoundException({
            code: 'PEDIDO_NAO_ENCONTRADO',
            message: 'Pedido não encontrado',
          });
        }

        const idemInside = await tx.query<any>(
          `SELECT * FROM p10_refund_requests WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (idemInside.rows.length > 0) {
          const ex = idemInside.rows[0];
          if (ex.request_hash !== requestHash) {
            throw new ConflictException({
              code: 'IDEMPOTENCIA_DIVERGENTE',
              message: 'Chave idempotente reutilizada com dados diferentes',
            });
          }
          return { row: ex, reused: true, eventId: order.event_id };
        }

        if (order.status !== 'PAGO') {
          throw new ConflictException({
            code: 'PEDIDO_NAO_LIQUIDADO',
            message: 'Pedido sem pagamento confirmado não pode gerar devolução financeira',
          });
        }

        const confRes = await tx.query<{
          provider: string;
          provider_ref: string;
        }>(
          `SELECT provider, provider_ref FROM p08_payment_confirmations WHERE order_id = $1`,
          [orderId]
        );
        const confirmation = confRes.rows[0];
        if (!confirmation) {
          throw new ConflictException({
            code: 'COMPROVANTE_PAGAMENTO_AUSENTE',
            message: 'Não existe prova de pagamento liquidado',
          });
        }

        if (cancellationId) {
          const cancRes = await tx.query<{
            id: string;
            order_id: string | null;
            status: string;
            type: string;
          }>(
            `SELECT id, order_id, status, type FROM p10_cancellation_requests WHERE id = $1`,
            [cancellationId]
          );
          const c = cancRes.rows[0];
          if (!c || c.order_id !== orderId || c.status !== 'APROVADO_OPERACAO') {
            throw new ConflictException({
              code: 'CANCELAMENTO_SEM_APROVACAO_OPERACIONAL',
              message: 'Cancelamento sem aprovação operacional',
            });
          }
          const unitMax = Math.floor(Number(order.total_cents) / Number(order.quantity));
          if (c.type === 'INGRESSO' && amountCents > unitMax) {
            throw new ConflictException({
              code: 'DEVOLUCAO_INDIVIDUAL_ACIMA_UNITARIO',
              message: 'Devolução individual superior ao valor unitário do ingresso',
            });
          }
        }

        const committedRes = await tx.query<{ committed_cents: string | number }>(
          `SELECT COALESCE(SUM(amount_cents), 0)::int AS committed_cents
           FROM p10_refund_requests
           WHERE order_id = $1 AND status <> 'NEGADO'`,
          [orderId]
        );
        const committedCents = Number(committedRes.rows[0]?.committed_cents ?? 0);
        asConflict(() =>
          assertRefundAmount(Number(order.total_cents), committedCents, amountCents)
        );

        const refundId = randomUUID();
        const insRes = await tx.query<any>(
          `INSERT INTO p10_refund_requests (
             id, order_id, cancellation_id, idempotency_key, request_hash,
             amount_cents, reason, provider, provider_ref, status, requested_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SOLICITADO', $10)
           RETURNING *`,
          [
            refundId,
            orderId,
            cancellationId,
            idempotencyKey,
            requestHash,
            amountCents,
            reason,
            confirmation.provider,
            confirmation.provider_ref,
            actor.userId,
          ]
        );

        return {
          row: insRes.rows[0],
          reused: false,
          eventId: order.event_id,
        };
      })
    );

    if (!result.reused) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'ESTORNO_SOLICITADO',
        resourceType: 'ESTORNO',
        resourceId: result.row.id,
        eventId: result.eventId,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p10-ref-req-${result.row.id}`,
        afterState: {
          orderId,
          amountCents,
          provider: result.row.provider,
        },
      });
    }

    return { ...this.mapRefund(result.row), reused: result.reused };
  }

  async list(actor: Actor) {
    requireInternal(actor, 'SAC', 'OPERACOES', 'FINANCEIRO_DISK', 'AUDITOR', 'ADMIN');
    const finance = actor.roles.some((r) =>
      ['FINANCEIRO_DISK', 'AUDITOR', 'ADMIN'].includes(r)
    );
    const params: unknown[] = [];
    const whereSql = finance ? '' : (params.push(actor.userId), 'WHERE r.requested_by = $1');

    const res = await this.db.query<any>(
      `SELECT r.id, r.order_id, r.amount_cents, r.status, r.provider, r.requested_by, r.created_at
       FROM p10_refund_requests r
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT 100`,
      params
    );

    const ids = res.rows.map((r) => r.id);
    const approvalsByRefund = new Map<string, any[]>();
    if (ids.length > 0) {
      const appRes = await this.db.query<any>(
        `SELECT refund_id, step, actor_id, decision, created_at
         FROM p10_refund_approvals
         WHERE refund_id = ANY($1::uuid[])
         ORDER BY step ASC`,
        [ids]
      );
      for (const a of appRes.rows) {
        const list = approvalsByRefund.get(a.refund_id) ?? [];
        list.push({
          step: Number(a.step),
          actorId: a.actor_id,
          decision: a.decision,
          createdAt: a.created_at,
        });
        approvalsByRefund.set(a.refund_id, list);
      }
    }

    return {
      items: res.rows.map((r) => ({
        id: r.id,
        orderId: r.order_id,
        amountCents: Number(r.amount_cents),
        status: r.status,
        provider: r.provider,
        requestedBy: r.requested_by,
        createdAt: r.created_at,
        approvals: approvalsByRefund.get(r.id) ?? [],
      })),
    };
  }

  async get(refundId: string, actor: Actor) {
    requireInternal(actor, 'SAC', 'OPERACOES', 'FINANCEIRO_DISK', 'AUDITOR', 'ADMIN');
    const id = uid(refundId);
    const res = await this.db.query<any>(
      `SELECT * FROM p10_refund_requests WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: 'ESTORNO_NAO_ENCONTRADO',
        message: 'Estorno não encontrado',
      });
    }
    if (
      !actor.roles.some((r) => ['FINANCEIRO_DISK', 'AUDITOR', 'ADMIN'].includes(r)) &&
      row.requested_by !== actor.userId
    ) {
      throw new ForbiddenException({
        code: 'SOLICITACAO_FORA_ESCOPO',
        message: 'Solicitação fora do escopo',
      });
    }

    const [approvalsRes, attemptsRes] = await Promise.all([
      this.db.query<any>(
        `SELECT * FROM p10_refund_approvals WHERE refund_id = $1 ORDER BY step ASC`,
        [id]
      ),
      this.db.query<any>(
        `SELECT * FROM p10_refund_attempts WHERE refund_id = $1 ORDER BY created_at ASC`,
        [id]
      ),
    ]);

    return {
      ...this.mapRefund(row),
      approvals: approvalsRes.rows.map((a) => ({
        id: a.id,
        refundId: a.refund_id,
        step: Number(a.step),
        actorId: a.actor_id,
        decision: a.decision,
        reason: a.reason ?? null,
        createdAt: a.created_at,
      })),
      attempts: attemptsRes.rows.map((att) => ({
        id: att.id,
        refundId: att.refund_id,
        provider: att.provider,
        providerRef: att.provider_ref ?? null,
        requestKey: att.request_key,
        status: att.status,
        evidenceHash: att.evidence_hash ?? null,
        createdAt: att.created_at,
        confirmedAt: att.confirmed_at ?? null,
      })),
    };
  }

  async startReview(refundId: string, actor: Actor, correlationId?: string) {
    financeWrite(actor);
    const id = uid(refundId);

    const { updated, priorStatus } = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        requested_by: string;
      }>(
        `SELECT id, status, requested_by FROM p10_refund_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const row = rows.rows[0];
      if (!row) {
        throw new NotFoundException({
          code: 'ESTORNO_NAO_ENCONTRADO',
          message: 'Estorno não encontrado',
        });
      }
      if (row.requested_by === actor.userId) {
        throw new ForbiddenException({
          code: 'AUTO_ANALISE_ESTORNO_PROIBIDA',
          message: 'Solicitante não analisa a própria devolução',
        });
      }
      asConflict(() => checkTransition(REFUND_FLOW, row.status as RefundStatus, 'EM_ANALISE'));

      const updRes = await tx.query<any>(
        `UPDATE p10_refund_requests
         SET status = 'EM_ANALISE', version = version + 1, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [row.id]
      );
      return { updated: updRes.rows[0], priorStatus: row.status };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'ESTORNO_ANALISE',
      resourceType: 'ESTORNO',
      resourceId: updated.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p10-ref-rev-${updated.id}`,
      beforeState: { status: priorStatus },
      afterState: { status: 'EM_ANALISE' },
    });

    return this.mapRefund(updated);
  }

  async approve(
    refundId: string,
    body: { reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    financeWrite(actor);
    const id = uid(refundId);
    const reason = val(body?.reason, 5, 1000);

    const out = await this.withSerializableRetry(() =>
      this.db.withTransaction(async (tx) => {
        const rows = await tx.query<{
          id: string;
          order_id: string;
          status: string;
          requested_by: string;
        }>(
          `SELECT id, order_id, status, requested_by FROM p10_refund_requests WHERE id = $1 FOR UPDATE`,
          [id]
        );
        const row = rows.rows[0];
        if (!row) {
          throw new NotFoundException({
            code: 'ESTORNO_NAO_ENCONTRADO',
            message: 'Solicitação de estorno não encontrada',
          });
        }

        const priorRes = await tx.query<{ actor_id: string; step: number }>(
          `SELECT actor_id, step FROM p10_refund_approvals WHERE refund_id = $1 ORDER BY step ASC`,
          [row.id]
        );

        let step: 1 | 2;
        try {
          step = assertApproval({
            requesterId: row.requested_by,
            actorId: actor.userId,
            previousApproverIds: priorRes.rows.map((x) => x.actor_id),
            status: row.status as RefundStatus,
          });
        } catch (e) {
          throw new ForbiddenException({
            code: 'DUPLA_APROVACAO_VIOLADA',
            message: (e as Error).message,
          });
        }

        const next: RefundStatus = step === 1 ? 'APROVADO_1' : 'APROVADO_2';
        await tx.query(
          `INSERT INTO p10_refund_approvals (id, refund_id, step, actor_id, decision, reason)
           VALUES ($1, $2, $3, $4, 'APROVADO', $5)`,
          [randomUUID(), row.id, step, actor.userId, reason]
        );

        const updRes = await tx.query<any>(
          `UPDATE p10_refund_requests
           SET status = $1, version = version + 1, updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [next, row.id]
        );

        if (step === 2) {
          const outboxPayload = {
            refundId: row.id,
            action: 'AGUARDAR_CONECTOR_HOMOLOGADO',
            externalExecutionAllowed:false,
          };
          await tx.query(
            `INSERT INTO outbox_events (
               id, event_name, schema_version, aggregate_type, aggregate_id,
               correlation_id, payload, status
             ) VALUES ($1, 'BRAVO_REFUND_APPROVED_HOLD', 1, 'BravoRefundRequest', $2, $3, $4::jsonb, 'PENDING')`,
            [
              randomUUID(),
              row.id,
              `p10-refund-double-approved:${row.id}`,
              JSON.stringify(outboxPayload),
            ]
          );
        }

        return {
          id: updRes.rows[0].id as string,
          status: updRes.rows[0].status as string,
          priorStatus: row.status,
          step,
          externalExecution: false,
        };
      })
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: `ESTORNO_APROVADO_ETAPA_${out.step}`,
      resourceType: 'ESTORNO',
      resourceId: out.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-ref-app-${out.step}-${out.id}`,
      beforeState: { status: out.priorStatus },
      afterState: { status: out.status, step: out.step },
    });

    return {
      id: out.id,
      status: out.status,
      step: out.step,
      externalExecution: out.externalExecution,
    };
  }

  async reject(
    refundId: string,
    body: { reason: string },
    actor: Actor,
    correlationId?: string
  ) {
    financeWrite(actor);
    const id = uid(refundId);
    const reason = val(body?.reason, 8, 1000);

    const { updated, priorStatus } = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{
        id: string;
        status: string;
        requested_by: string;
      }>(
        `SELECT id, status, requested_by FROM p10_refund_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const row = rows.rows[0];
      if (!row) {
        throw new NotFoundException({
          code: 'ESTORNO_NAO_ENCONTRADO',
          message: 'Estorno não encontrado',
        });
      }
      if (row.requested_by === actor.userId) {
        throw new ForbiddenException({
          code: 'AUTO_REJEICAO_ESTORNO_PROIBIDA',
          message: 'Solicitante não rejeita o próprio pedido',
        });
      }
      asConflict(() => checkTransition(REFUND_FLOW, row.status as RefundStatus, 'NEGADO'));

      const updRes = await tx.query<any>(
        `UPDATE p10_refund_requests
         SET status = 'NEGADO', version = version + 1, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [row.id]
      );
      return { updated: updRes.rows[0], priorStatus: row.status };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'ESTORNO_REPROVADO',
      resourceType: 'ESTORNO',
      resourceId: updated.id,
      outcome: 'SUCCESS',
      justification: reason,
      correlationId: correlationId ?? `p10-ref-rej-${updated.id}`,
      beforeState: { status: priorStatus },
      afterState: { status: 'NEGADO' },
    });

    return this.mapRefund(updated);
  }

  async financialImpact(actor: Actor) {
    requireInternal(actor, 'FINANCEIRO_DISK', 'AUDITOR', 'ADMIN');
    const grouped = await this.db.query<{
      status: string;
      amount_cents: string | number;
      quantity: string | number;
    }>(
      `SELECT status,
              COALESCE(SUM(amount_cents), 0)::bigint AS amount_cents,
              COUNT(*)::int AS quantity
       FROM p10_refund_requests
       GROUP BY status`
    );

    return {
      items: grouped.rows.map((row) => ({
        status: row.status,
        amountCents: Number(row.amount_cents),
        quantity: Number(row.quantity),
      })),
      notes: 'Projeção de obrigações. Não equivale a desembolso ou estorno liquidado.',
    };
  }

  /** Intencionalmente não há controller para esta função. Nenhum conector externo de estorno neste pacote. */
  async dispatchApprovedRefund(_refundId: string): Promise<never> {
    throw new ServiceUnavailableException('Estorno bancário real não implementado: conector e confirmação externa obrigatórios');
  }

  private mapRefund(r: any) {
    return {
      id: r.id,
      orderId: r.order_id,
      cancellationId: r.cancellation_id ?? null,
      idempotencyKey: r.idempotency_key,
      requestHash: r.request_hash,
      amountCents: Number(r.amount_cents),
      reason: r.reason,
      provider: r.provider,
      providerRef: r.provider_ref,
      status: r.status,
      version: Number(r.version ?? 1),
      requestedBy: r.requested_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}
