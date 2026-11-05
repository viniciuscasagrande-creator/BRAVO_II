import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  type AuthenticatedActorDto,
  CreatePosTerminalRequestSchema,
  OpenPosCashSessionRequestSchema,
  type PosCashSessionDto,
  type PosTerminalDto,
} from '@bravo-ii/contracts';

interface PosTerminalRow {
  id: string;
  terminal_code: string;
  name: string;
  location_description: string;
  status: string;
  created_at: Date | string;
}

interface PosCashSessionRow {
  id: string;
  terminal_id: string;
  operator_user_id: string;
  status: 'OPEN' | 'CLOSED';
  opening_balance_cents: string | number;
  total_sales_cents: string | number;
  opened_at: Date | string;
  closed_at: Date | string | null;
}

@Injectable()
export class PointOfSaleService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService
  ) {}

  private mapTerminal(row: PosTerminalRow): PosTerminalDto {
    return {
      id: row.id,
      terminalCode: row.terminal_code,
      name: row.name,
      locationDescription: row.location_description,
      status: row.status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  private mapCashSession(row: PosCashSessionRow): PosCashSessionDto {
    return {
      id: row.id,
      terminalId: row.terminal_id,
      operatorUserId: row.operator_user_id,
      status: row.status,
      openingBalanceCents: Number(row.opening_balance_cents),
      totalSalesCents: Number(row.total_sales_cents),
      openedAt: row.opened_at instanceof Date ? row.opened_at.toISOString() : String(row.opened_at),
      closedAt: row.closed_at
        ? row.closed_at instanceof Date
          ? row.closed_at.toISOString()
          : String(row.closed_at)
        : null,
    };
  }

  async listTerminals(): Promise<PosTerminalDto[]> {
    const res = await this.db.query<PosTerminalRow>(
      `SELECT id, terminal_code, name, location_description, status, created_at
       FROM pos_terminals
       ORDER BY created_at DESC`
    );
    return res.rows.map((r) => this.mapTerminal(r));
  }

  async createTerminal(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<PosTerminalDto> {
    const parsed = CreatePosTerminalRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de terminal PDV inválidos.',
      });
    }

    const code = parsed.data.terminalCode.toUpperCase();
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM pos_terminals WHERE terminal_code = $1`,
      [code]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'POS-001',
        message: 'Já existe um terminal PDV com este código.',
      });
    }

    const id = randomUUID();
    const res = await this.db.query<PosTerminalRow>(
      `INSERT INTO pos_terminals (id, terminal_code, name, location_description, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       RETURNING id, terminal_code, name, location_description, status, created_at`,
      [id, code, parsed.data.name, parsed.data.locationDescription]
    );

    const created = this.mapTerminal(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'POS_TERMINAL_CREATED',
      resourceType: 'PosTerminal',
      resourceId: created.id,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { terminalCode: created.terminalCode, name: created.name },
    });

    return created;
  }

  async listCashSessions(): Promise<PosCashSessionDto[]> {
    const res = await this.db.query<PosCashSessionRow>(
      `SELECT id, terminal_id, operator_user_id, status, opening_balance_cents, total_sales_cents, opened_at, closed_at
       FROM pos_cash_sessions
       ORDER BY opened_at DESC`
    );
    return res.rows.map((r) => this.mapCashSession(r));
  }

  async openCashSession(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<PosCashSessionDto> {
    const parsed = OpenPosCashSessionRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados inválidos para abertura de caixa PDV.',
      });
    }

    const termRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM pos_terminals WHERE id = $1`,
      [parsed.data.terminalId]
    );
    const term = termRes.rows[0];
    if (!term || term.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'POS-002',
        message: 'Terminal PDV não encontrado ou inativo.',
      });
    }

    const openRes = await this.db.query<{ id: string }>(
      `SELECT id FROM pos_cash_sessions WHERE terminal_id = $1 AND status = 'OPEN'`,
      [parsed.data.terminalId]
    );
    if (openRes.rows.length > 0) {
      throw new ConflictException({
        code: 'POS-003',
        message: 'Este terminal PDV já possui uma sessão de caixa aberta.',
      });
    }

    const id = randomUUID();
    const res = await this.db.query<PosCashSessionRow>(
      `INSERT INTO pos_cash_sessions (id, terminal_id, operator_user_id, status, opening_balance_cents, total_sales_cents)
       VALUES ($1, $2, $3, 'OPEN', $4, 0)
       RETURNING id, terminal_id, operator_user_id, status, opening_balance_cents, total_sales_cents, opened_at, closed_at`,
      [id, parsed.data.terminalId, actor.userId, parsed.data.openingBalanceCents]
    );

    const session = this.mapCashSession(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'POS_CASH_SESSION_OPENED',
      resourceType: 'PosCashSession',
      resourceId: session.id,
      outcome: 'SUCCESS',
      origin: 'PDV',
      correlationId,
      afterState: {
        terminalId: session.terminalId,
        openingBalanceCents: session.openingBalanceCents,
      },
    });

    return session;
  }

  async closeCashSession(
    cashSessionId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<PosCashSessionDto> {
    const existingRes = await this.db.query<PosCashSessionRow>(
      `SELECT id, terminal_id, operator_user_id, status, opening_balance_cents, total_sales_cents, opened_at, closed_at
       FROM pos_cash_sessions WHERE id = $1`,
      [cashSessionId]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      throw new NotFoundException({
        code: 'POS-404',
        message: 'Sessão de caixa PDV não encontrada.',
      });
    }

    if (existing.status === 'CLOSED') {
      return this.mapCashSession(existing);
    }

    const res = await this.db.query<PosCashSessionRow>(
      `UPDATE pos_cash_sessions
       SET status = 'CLOSED', closed_at = NOW()
       WHERE id = $1
       RETURNING id, terminal_id, operator_user_id, status, opening_balance_cents, total_sales_cents, opened_at, closed_at`,
      [cashSessionId]
    );
    const closed = this.mapCashSession(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'POS_CASH_SESSION_CLOSED',
      resourceType: 'PosCashSession',
      resourceId: closed.id,
      outcome: 'SUCCESS',
      origin: 'PDV',
      correlationId,
      afterState: {
        totalSalesCents: closed.totalSalesCents,
        closedAt: closed.closedAt,
      },
    });

    return closed;
  }
}
