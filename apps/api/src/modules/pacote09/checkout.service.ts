import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  assertAttemptAllowed,
  assertPagbankSandbox,
  assertSandboxCheckoutId,
  CheckoutRuleError,
  providerStatusReadOnly,
  safeSandboxPayload,
  validateCheckoutInput,
} from '@bravo-ii/domain-p09';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { assertInternalRole } from '../pacote08/customer.service';

export type AttemptInput = {
  provider: string;
  method: string;
  idempotencyKey: string;
};

const SANDBOX_BASE = 'https://sandbox.api.pagseguro.com';

function adapt<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof CheckoutRuleError) {
      throw new BadRequestException({ code: 'REGRA_CHECKOUT_P09', message: e.message });
    }
    throw e;
  }
}

function safeCode(value: string) {
  return String(value).slice(0, 80).replace(/[^A-Za-z0-9_-]/g, '_');
}

@Injectable()
export class BravoCheckoutService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async list(orderId: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'FINANCEIRO_DISK', 'AUDITOR');
    const orderRes = await this.db.query<{
      id: string;
      status: string;
      total_cents: number;
      channel: string;
    }>(
      `SELECT id, status, total_cents, channel FROM p08_sale_orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) {
      throw new NotFoundException({ code: 'PEDIDO_NAO_LOCALIZADO', message: 'Pedido não localizado' });
    }
    const o = orderRes.rows[0];
    const itemsRes = await this.db.query<{
      id: string;
      provider: string;
      method: string;
      status: string;
      amount_cents: number;
      sandbox_checkout_id: string | null;
      last_error: string | null;
      created_at: string | Date;
    }>(
      `SELECT id, provider, method, status, amount_cents, sandbox_checkout_id, last_error, created_at
       FROM p09_checkout_attempts
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [orderId]
    );

    // Nunca retorna Taxa Disk interna por evento nem dados sensíveis de cartão.
    return {
      order: {
        id: o.id,
        status: o.status,
        totalCents: Number(o.total_cents),
        channel: o.channel,
      },
      items: itemsRes.rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        method: row.method,
        status: row.status,
        amountCents: Number(row.amount_cents),
        sandboxCheckoutId: row.sandbox_checkout_id,
        lastError: row.last_error,
        createdAt: row.created_at,
      })),
      warning: 'Consulta de homologação. Nenhum pagamento ou ingresso foi confirmado por este módulo.',
    };
  }

  async prepare(
    orderId: string,
    body: AttemptInput,
    actor: AuthenticatedActorDto,
    correlationId?: string
  ) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES');
    const value = adapt(() => validateCheckoutInput(body));
    const digest = createHash('sha256')
      .update(JSON.stringify({ orderId, provider: value.provider, method: value.method }))
      .digest('hex');

    const result = await this.db.withTransaction(async (tx) => {
      const locked = await tx.query<{
        id: string;
        status: string;
        expires_at: string | Date;
        total_cents: number;
        channel: string;
        event_id: string;
      }>(
        `SELECT id, status, expires_at, total_cents, channel, event_id
         FROM p08_sale_orders
         WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      const orderRow = locked.rows[0];
      if (!orderRow) {
        throw new NotFoundException({ code: 'PEDIDO_NAO_ENCONTRADO', message: 'Pedido não encontrado' });
      }
      const order = {
        id: orderRow.id,
        status: orderRow.status,
        expiresAt: new Date(orderRow.expires_at),
        totalCents: Number(orderRow.total_cents),
        channel: orderRow.channel,
        eventId: orderRow.event_id,
      };
      adapt(() => assertAttemptAllowed(order, new Date()));

      const existingRes = await tx.query<{
        id: string;
        status: string;
        amount_cents: number;
        idempotency_key: string;
        request_hash: string;
      }>(
        `SELECT id, status, amount_cents, idempotency_key, request_hash
         FROM p09_checkout_attempts
         WHERE idempotency_key = $1 OR order_id = $2`,
        [value.idempotencyKey, orderId]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (existing.idempotency_key === value.idempotencyKey && existing.request_hash === digest) {
          return {
            id: existing.id,
            status: existing.status,
            alreadyCreated: true,
            amountCents: Number(existing.amount_cents),
            eventId: order.eventId,
          };
        }
        throw new ConflictException({
          code: 'TENTATIVA_CHECKOUT_CONFLITO',
          message: 'Pedido já tem tentativa ou chave usada com outro conteúdo',
        });
      }

      const attemptId = randomUUID();
      await tx.query(
        `INSERT INTO p09_checkout_attempts (
           id, order_id, idempotency_key, request_hash,
           provider, method, status, amount_cents, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE_HOMOLOGACAO', $7, $8)`,
        [
          attemptId,
          orderId,
          value.idempotencyKey,
          digest,
          value.provider,
          value.method,
          order.totalCents,
          actor.userId,
        ]
      );

      return {
        id: attemptId,
        status: 'PENDENTE_HOMOLOGACAO',
        alreadyCreated: false,
        amountCents: order.totalCents,
        eventId: order.eventId,
      };
    });

    if (!result.alreadyCreated) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'CHECKOUT_TENTATIVA_PREPARADA',
        resourceType: 'PEDIDO',
        resourceId: orderId,
        eventId: result.eventId,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p09-chk-${result.id}`,
        afterState: {
          attemptId: result.id,
          provider: value.provider,
          method: value.method,
          amountCents: result.amountCents,
          status: result.status,
        },
      });
    }

    return {
      id: result.id,
      status: result.status,
      alreadyCreated: result.alreadyCreated,
      amountCents: result.amountCents,
    };
  }

  /** SOMENTE sandbox oficial; nunca captura, confirma pedido, processa webhook ou emite ingresso. */
  async startPagbankSandbox(attemptId: string, actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN');
    const token = adapt(() => assertPagbankSandbox(process.env));

    const attemptRes = await this.db.query<{
      id: string;
      order_id: string;
      provider: string;
      method: string;
      status: string;
      order_status: string;
      order_quantity: number;
      order_unit_cents: number;
      order_total_cents: number;
      order_expires_at: string | Date;
      order_channel: string;
      lot_name: string;
    }>(
      `SELECT a.id, a.order_id, a.provider, a.method, a.status,
              o.status AS order_status, o.quantity AS order_quantity,
              o.unit_cents AS order_unit_cents, o.total_cents AS order_total_cents,
              o.expires_at AS order_expires_at, o.channel AS order_channel,
              l.modality_name AS lot_name
       FROM p09_checkout_attempts a
       INNER JOIN p08_sale_orders o ON o.id = a.order_id
       INNER JOIN event_price_lots l ON l.id = o.lot_id
       WHERE a.id = $1`,
      [attemptId]
    );

    if (attemptRes.rows.length === 0) {
      throw new NotFoundException({ code: 'TENTATIVA_NAO_LOCALIZADA', message: 'Tentativa não localizada' });
    }
    const row = attemptRes.rows[0];
    if (row.provider !== 'PAGBANK' || row.method !== 'PIX' || row.order_channel !== 'ONLINE') {
      throw new BadRequestException({
        code: 'SANDBOX_LIMITADO_PIX_PAGBANK',
        message: 'Sandbox limitado a PIX PagBank e pedidos ONLINE',
      });
    }

    const orderObj = {
      id: row.order_id,
      status: row.order_status,
      quantity: Number(row.order_quantity),
      unitCents: Number(row.order_unit_cents),
      totalCents: Number(row.order_total_cents),
      expiresAt: new Date(row.order_expires_at),
      channel: row.order_channel,
      lot: { name: row.lot_name },
    };

    adapt(() => assertAttemptAllowed(orderObj, new Date()));
    const payload = adapt(() => safeSandboxPayload(orderObj));

    const locked = await this.db.query(
      `UPDATE p09_checkout_attempts
       SET status = 'ENVIANDO_SANDBOX', updated_at = NOW()
       WHERE id = $1 AND status = 'PENDENTE_HOMOLOGACAO'`,
      [attemptId]
    );
    if (locked.rowCount !== 1) {
      throw new ConflictException({
        code: 'TENTATIVA_JA_ENVIADA_OU_INDETERMINADA',
        message: 'Tentativa enviada ou resultado incerto; NÃO reenviar automaticamente',
      });
    }

    try {
      const response = await fetch(`${SANDBOX_BASE}/checkouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      const data = (await response.json()) as { id?: string };
      const ref = adapt(() => assertSandboxCheckoutId(data.id || ''));

      await this.db.query(
        `UPDATE p09_checkout_attempts
         SET status = 'CRIADO_SANDBOX', sandbox_checkout_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [ref, attemptId]
      );

      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'CHECKOUT_PAGBANK_SANDBOX_CRIADO',
        resourceType: 'CHECKOUT',
        resourceId: attemptId,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p09-sbx-${attemptId}`,
        afterState: { sandboxCheckoutId: ref, status: 'CRIADO_SANDBOX' },
      });

      return {
        id: attemptId,
        status: 'CRIADO_SANDBOX',
        sandboxCheckoutId: ref,
        paid: false,
        issuedTickets: 0,
      };
    } catch (e) {
      await this.db
        .query(
          `UPDATE p09_checkout_attempts
           SET status = 'RESULTADO_INDETERMINADO', last_error = $1, updated_at = NOW()
           WHERE id = $2`,
          [safeCode((e as Error).message), attemptId]
        )
        .catch(() => {});
      throw new ServiceUnavailableException({
        code: 'SANDBOX_RESULTADO_INDETERMINADO',
        message: 'Criação sandbox incerta; consultar manualmente antes de qualquer nova tentativa',
      });
    }
  }

  async consultPagbankSandbox(attemptId: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'FINANCEIRO_DISK', 'AUDITOR');
    const token = adapt(() => assertPagbankSandbox(process.env));

    const attemptRes = await this.db.query<{
      id: string;
      provider: string;
      sandbox_checkout_id: string | null;
    }>(
      `SELECT id, provider, sandbox_checkout_id FROM p09_checkout_attempts WHERE id = $1`,
      [attemptId]
    );
    const attempt = attemptRes.rows[0];
    if (!attempt || attempt.provider !== 'PAGBANK' || !attempt.sandbox_checkout_id) {
      throw new NotFoundException({
        code: 'CHECKOUT_SANDBOX_NAO_LOCALIZADO',
        message: 'Checkout sandbox não localizado',
      });
    }
    const ref = adapt(() => assertSandboxCheckoutId(attempt.sandbox_checkout_id!));

    try {
      const response = await fetch(`${SANDBOX_BASE}/checkouts/${encodeURIComponent(ref)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(12000),
        redirect: 'error',
      });
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      const body = (await response.json()) as { status?: string; id?: string };
      if (body.id !== ref) {
        throw new Error('IDENTIFICADOR_DIVERGENTE');
      }
      return {
        id: attemptId,
        sandboxCheckoutId: ref,
        provider: 'PAGBANK',
        ...providerStatusReadOnly(body.status),
        notice: 'Consulta informativa. Não liquida pedido nem emite ingresso.',
      };
    } catch {
      throw new ServiceUnavailableException({
        code: 'CONSULTA_SANDBOX_INDISPONIVEL',
        message: 'Consulta sandbox indisponível; pedido original não foi alterado',
      });
    }
  }
}
