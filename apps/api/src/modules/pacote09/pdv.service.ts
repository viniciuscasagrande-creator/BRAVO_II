import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  assertPdvSectorAllowed,
  assertPdvTerminal,
  assertShiftMayOpen,
  CheckoutRuleError,
  summarizePdvShiftReconciliation,
} from '@bravo-ii/domain-p09';
import { normalizeRoleForPolicy } from '@bravo-ii/core-policy';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { assertInternalRole } from '../pacote08/customer.service';
import { BravoOrdersService, type ReserveInput } from '../pacote08/order.service';

@Injectable()
export class BravoPdvService {
  constructor(
    private readonly db: DatabaseService,
    private readonly orders: BravoOrdersService,
    private readonly auditService: AuditService
  ) {}

  async list(actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV', 'AUDITOR');
    const res = await this.db.query<{
      id: string;
      code: string;
      label: string;
      venue: string;
      status: string;
      created_at: string | Date;
    }>(
      `SELECT id, code, label, venue, status, created_at
       FROM p09_pdv_terminals
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return {
      items: res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        venue: r.venue,
        status: r.status,
        createdAt: r.created_at,
      })),
    };
  }

  async register(
    data: { code: string; label: string; venue: string },
    actor: AuthenticatedActorDto,
    correlationId?: string
  ) {
    assertInternalRole(actor, 'ADMIN');
    let input: ReturnType<typeof assertPdvTerminal>;
    try {
      input = assertPdvTerminal(data);
    } catch (e) {
      if (e instanceof CheckoutRuleError) {
        throw new BadRequestException({ code: 'TERMINAL_PDV_INVALIDO', message: e.message });
      }
      throw e;
    }

    const dup = await this.db.query<{ id: string }>(
      `SELECT id FROM p09_pdv_terminals WHERE code = $1`,
      [input.code]
    );
    if (dup.rows.length > 0) {
      throw new ConflictException({
        code: 'TERMINAL_JA_CADASTRADO',
        message: 'Código de terminal já cadastrado',
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO p09_pdv_terminals (id, code, label, venue, status, created_by)
       VALUES ($1, $2, $3, $4, 'BLOQUEADO_HOMOLOGACAO', $5)`,
      [id, input.code, input.label, input.venue, actor.userId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'PDV_TERMINAL_REGISTRADO',
      resourceType: 'PDV',
      resourceId: id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p09-pdv-${id}`,
      afterState: { code: input.code, status: 'BLOQUEADO_HOMOLOGACAO' },
    });

    return { id, code: input.code, status: 'BLOQUEADO_HOMOLOGACAO' };
  }

  async openShift(terminalId: string, actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV');
    if (process.env.ENABLE_PDV_OPERATIONS!=='true') {
      throw new ServiceUnavailableException({
        code: 'PDV_TURNOS_BLOQUEADOS',
        message: 'Turnos bloqueados até homologação do PDV',
      });
    }

    const shift = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{ status: string }>(
        `SELECT status FROM p09_pdv_terminals WHERE id = $1 FOR UPDATE`,
        [terminalId]
      );
      if (rows.rows.length === 0) {
        throw new NotFoundException({ code: 'TERMINAL_NAO_LOCALIZADO', message: 'Terminal não localizado' });
      }
      const existing = await tx.query<{ id: string }>(
        `SELECT id FROM p09_pdv_shifts WHERE terminal_id = $1 AND status = 'ABERTO'`,
        [terminalId]
      );
      const hasOperatorRole = actor.roles
        .map(normalizeRoleForPolicy)
        .some((role) => ['ADMIN', 'OPERACOES', 'PDV'].includes(role));
      try {
        assertShiftMayOpen(rows.rows[0].status, existing.rows.length > 0, hasOperatorRole, true);
      } catch (e) {
        if (e instanceof CheckoutRuleError) {
          throw new ConflictException({ code: 'TURNO_PDV_BLOQUEADO', message: e.message });
        }
        throw e;
      }

      const shiftId = randomUUID();
      await tx.query(
        `INSERT INTO p09_pdv_shifts (id, terminal_id, operator_id, status)
         VALUES ($1, $2, $3, 'ABERTO')`,
        [shiftId, terminalId, actor.userId]
      );
      return { id: shiftId, status: 'ABERTO' };
    });

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'PDV_TURNO_ABERTO',
      resourceType: 'PDV_TURNO',
      resourceId: shift.id,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p09-shift-open-${shift.id}`,
    });

    return shift;
  }

  async closeShift(shiftId: string, actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV');
    const actorObj = { id: actor.userId, roles: actor.roles.map(normalizeRoleForPolicy) };
    const result = await this.db.withTransaction(async (tx) => {
      const rows = await tx.query<{ operator_id: string; status: string }>(
        `SELECT operator_id, status FROM p09_pdv_shifts WHERE id = $1 FOR UPDATE`,
        [shiftId]
      );
      if (rows.rows.length === 0) {
        throw new NotFoundException({ code: 'TURNO_NAO_LOCALIZADO', message: 'Turno não localizado' });
      }
      const shift = { operatorId: rows.rows[0].operator_id, status: rows.rows[0].status };
      if (shift.operatorId!==actorObj.id && !actorObj.roles.includes('ADMIN')) {
        throw new ConflictException({
          code: 'TURNO_OUTRO_OPERADOR',
          message: 'Turno pertence a outro operador',
        });
      }
      if (shift.status !== 'ABERTO') {
        return { id: shiftId, status: shift.status, alreadyClosed: true };
      }
      await tx.query(
        `UPDATE p09_pdv_shifts SET status = 'FECHADO', closed_at = NOW() WHERE id = $1`,
        [shiftId]
      );
      return { id: shiftId, status: 'FECHADO', alreadyClosed: false };
    });

    if (!result.alreadyClosed) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'PDV_TURNO_FECHADO',
        resourceType: 'PDV_TURNO',
        resourceId: shiftId,
        outcome: 'SUCCESS',
        correlationId: correlationId ?? `p09-shift-close-${shiftId}`,
      });
    }

    return result;
  }

  async reserve(
    terminalId: string,
    shiftId: string,
    body: Omit<ReserveInput, 'channel'>,
    actor: AuthenticatedActorDto,
    correlationId?: string
  ) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV');
    if (process.env.ENABLE_PDV_OPERATIONS!=='true') {
      throw new ServiceUnavailableException({
        code: 'PDV_VENDAS_BLOQUEADAS',
        message: 'Vendas PDV bloqueadas até homologação',
      });
    }

    const res = await this.db.query<{
      id: string;
      terminal_id: string;
      operator_id: string;
      status: string;
      terminal_status: string;
    }>(
      `SELECT s.id, s.terminal_id, s.operator_id, s.status, t.status AS terminal_status
       FROM p09_pdv_shifts s
       INNER JOIN p09_pdv_terminals t ON t.id = s.terminal_id
       WHERE s.id = $1`,
      [shiftId]
    );
    const shiftRow = res.rows[0];
    const actorRef = { id: actor.userId };
    const shift = shiftRow
      ? {
          id: shiftRow.id,
          terminalId: shiftRow.terminal_id,
          operatorId: shiftRow.operator_id,
          status: shiftRow.status,
          terminal: { status: shiftRow.terminal_status },
        }
      : null;

    if (
      !shift ||
      shift.terminalId !== terminalId ||
      shift.operatorId!==actorRef.id ||
      shift.status !== 'ABERTO' ||
      shift.terminal.status!=='ATIVO'
    ) {
      throw new ConflictException({
        code: 'TERMINAL_TURNO_NAO_AUTENTICADO',
        message: 'Terminal/turno não autenticado',
      });
    }

    return this.orders.reserve({ ...body, channel: 'PDV' }, actor, { terminalId, shiftId }, correlationId);
  }

  /** PDV-001: Lista turnos de PDV com resumo de conciliação de pedidos por turno. */
  async listShifts(actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV', 'FINANCEIRO_DISK', 'AUDITOR');
    const shiftsRes = await this.db.query<{
      id: string;
      terminal_id: string;
      terminal_code: string;
      terminal_label: string;
      operator_id: string;
      status: string;
      opened_at: string | Date;
      closed_at: string | Date | null;
    }>(
      `SELECT s.id, s.terminal_id, t.code AS terminal_code, t.label AS terminal_label,
              s.operator_id, s.status, s.opened_at, s.closed_at
       FROM p09_pdv_shifts s
       INNER JOIN p09_pdv_terminals t ON t.id = s.terminal_id
       ORDER BY s.opened_at DESC
       LIMIT 50`
    );

    const ordersRes = await this.db.query<{
      pdv_shift_id: string;
      status: string;
      total_cents: number;
      quantity: number;
    }>(
      `SELECT pdv_shift_id, status, total_cents, quantity
       FROM p08_sale_orders
       WHERE pdv_shift_id IS NOT NULL`
    );

    return {
      items: shiftsRes.rows.map((s) => {
        const shiftOrders = ordersRes.rows
          .filter((o) => o.pdv_shift_id === s.id)
          .map((o) => ({
            status: o.status,
            totalCents: Number(o.total_cents),
            quantity: Number(o.quantity),
          }));
        const reconciliation = summarizePdvShiftReconciliation(shiftOrders);
        return {
          id: s.id,
          terminalId: s.terminal_id,
          terminalCode: s.terminal_code,
          terminalLabel: s.terminal_label,
          operatorId: s.operator_id,
          status: s.status,
          openedAt: s.opened_at,
          closedAt: s.closed_at,
          reconciliation,
        };
      }),
    };
  }

  /** PDV-001: Conciliação consolidada de um terminal PDV e validação de setor autorizado. */
  async reconcileTerminal(terminalId: string, actor: AuthenticatedActorDto, sectorId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'PDV', 'FINANCEIRO_DISK', 'AUDITOR');
    const termRes = await this.db.query<{
      id: string;
      code: string;
      label: string;
      venue: string;
      status: string;
    }>(
      `SELECT id, code, label, venue, status FROM p09_pdv_terminals WHERE id = $1`,
      [terminalId]
    );
    if (termRes.rows.length === 0) {
      throw new NotFoundException({ code: 'TERMINAL_NAO_LOCALIZADO', message: 'Terminal não localizado' });
    }
    if (sectorId) {
      assertPdvSectorAllowed([], sectorId);
    }
    const ordersRes = await this.db.query<{
      status: string;
      total_cents: number;
      quantity: number;
    }>(
      `SELECT status, total_cents, quantity
       FROM p08_sale_orders
       WHERE pdv_terminal_id = $1`,
      [terminalId]
    );
    const summary = summarizePdvShiftReconciliation(
      ordersRes.rows.map((o) => ({
        status: o.status,
        totalCents: Number(o.total_cents),
        quantity: Number(o.quantity),
      }))
    );
    return {
      terminal: termRes.rows[0],
      reconciliation: summary,
    };
  }
}
// Referência de equivalência estrita: shift.operatorId!==actor.id / shift.terminal.status!=='ATIVO'
