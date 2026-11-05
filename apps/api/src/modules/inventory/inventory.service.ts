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
  CreateInventoryHoldRequestSchema,
  CreateSeatsBatchRequestSchema,
  type InventoryHoldDto,
  type SeatDto,
  type SessionAvailabilityDto,
} from '@bravo-ii/contracts';

interface SeatRow {
  id: string;
  event_id: string;
  session_id: string;
  sector_id: string;
  seat_code: string;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  active_hold_id: string | null;
  active_ticket_id: string | null;
}

interface HoldRow {
  id: string;
  event_id: string;
  session_id: string;
  sector_id: string;
  seat_id: string | null;
  channel_type: 'SITE' | 'PDV' | 'CORTESIA';
  quantity: number;
  status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'RELEASED';
  idempotency_key: string;
  expires_at: Date | string;
  created_at: Date | string;
}

@Injectable()
export class InventoryService {
  private holdMutex: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService
  ) {}

  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.holdMutex.then(fn, fn);
    this.holdMutex = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  private mapSeatRow(row: SeatRow): SeatDto {
    return {
      id: row.id,
      eventId: row.event_id,
      sessionId: row.session_id,
      sectorId: row.sector_id,
      seatCode: row.seat_code,
      status: row.status,
      activeHoldId: row.active_hold_id,
      activeTicketId: row.active_ticket_id,
    };
  }

  private mapHoldRow(row: HoldRow): InventoryHoldDto {
    return {
      id: row.id,
      eventId: row.event_id,
      sessionId: row.session_id,
      sectorId: row.sector_id,
      seatId: row.seat_id,
      channelType: row.channel_type,
      quantity: Number(row.quantity),
      status: row.status,
      idempotencyKey: row.idempotency_key,
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  /**
   * Expira reservas temporárias vencidas e libera assentos retidos.
   */
  async expireStaleHolds(): Promise<number> {
    const expiredRes = await this.db.query<{ id: string; seat_id: string | null }>(
      `UPDATE inventory_holds
       SET status = 'EXPIRED'
       WHERE status = 'ACTIVE' AND expires_at <= NOW()
       RETURNING id, seat_id`
    );

    for (const row of expiredRes.rows) {
      if (row.seat_id) {
        await this.db.query(
          `UPDATE seats
           SET status = 'AVAILABLE', active_hold_id = NULL, updated_at = NOW()
           WHERE id = $1 AND status = 'HELD' AND active_hold_id = $2`,
          [row.seat_id, row.id]
        );
      }
    }

    return expiredRes.rows.length;
  }

  async createSeatsBatch(
    eventId: string,
    sectorId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<SeatDto[]> {
    const parsed = CreateSeatsBatchRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de assentos inválidos.',
      });
    }

    const sectorRes = await this.db.query<{ id: string; session_id: string; capacity: number }>(
      `SELECT id, session_id, capacity FROM event_sectors WHERE id = $1 AND event_id = $2`,
      [sectorId, eventId]
    );
    const sector = sectorRes.rows[0];
    if (!sector) {
      throw new NotFoundException({
        code: 'INV-404',
        message: 'Setor não encontrado para o evento informado.',
      });
    }

    const existingSeatsRes = await this.db.query<{ cnt: string | number }>(
      `SELECT COUNT(*)::int AS cnt FROM seats WHERE sector_id = $1`,
      [sectorId]
    );
    const currentCount = Number(existingSeatsRes.rows[0]?.cnt ?? 0);
    if (currentCount + parsed.data.seatCodes.length > Number(sector.capacity)) {
      throw new BadRequestException({
        code: 'INV-001',
        message: `A quantidade de assentos excede a capacidade configurada do setor (${sector.capacity}).`,
      });
    }

    const created: SeatDto[] = [];
    for (const rawCode of parsed.data.seatCodes) {
      const seatCode = rawCode.toUpperCase();
      const seatId = randomUUID();
      const res = await this.db.query<SeatRow>(
        `INSERT INTO seats (id, event_id, session_id, sector_id, seat_code, status)
         VALUES ($1, $2, $3, $4, $5, 'AVAILABLE')
         ON CONFLICT (sector_id, seat_code) DO UPDATE SET updated_at = NOW()
         RETURNING id, event_id, session_id, sector_id, seat_code, status, active_hold_id, active_ticket_id`,
        [seatId, eventId, sector.session_id, sectorId, seatCode]
      );
      created.push(this.mapSeatRow(res.rows[0]!));
    }

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'INVENTORY_SEATS_CREATED',
      resourceType: 'EventSector',
      resourceId: sectorId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { createdCount: created.length },
    });

    return created;
  }

  async getSessionAvailability(sessionId: string): Promise<SessionAvailabilityDto> {
    await this.expireStaleHolds();

    const sessionRes = await this.db.query<{ id: string; event_id: string }>(
      `SELECT id, event_id FROM event_sessions WHERE id = $1`,
      [sessionId]
    );
    const session = sessionRes.rows[0];
    if (!session) {
      throw new NotFoundException({
        code: 'INV-404',
        message: 'Sessão não encontrada.',
      });
    }

    const sectorsRes = await this.db.query<{
      id: string;
      code: string;
      name: string;
      area_type: string;
      capacity: number;
      blocked_quantity: number;
    }>(
      `SELECT id, code, name, area_type, capacity, blocked_quantity
       FROM event_sectors
       WHERE session_id = $1
       ORDER BY code ASC`,
      [sessionId]
    );

    const sectors = [];
    for (const sec of sectorsRes.rows) {
      const seatsRes = await this.db.query<SeatRow>(
        `SELECT id, event_id, session_id, sector_id, seat_code, status, active_hold_id, active_ticket_id
         FROM seats
         WHERE sector_id = $1
         ORDER BY seat_code ASC`,
        [sec.id]
      );

      const activeHoldsRes = await this.db.query<{ total_held: string | number }>(
        `SELECT COALESCE(SUM(quantity), 0)::int AS total_held
         FROM inventory_holds
         WHERE sector_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()`,
        [sec.id]
      );
      const heldQuantity = Number(activeHoldsRes.rows[0]?.total_held ?? 0);

      const soldTicketsRes = await this.db.query<{ total_sold: string | number }>(
        `SELECT COUNT(*)::int AS total_sold
         FROM tickets
         WHERE sector_id = $1 AND validity_status IN ('RESERVADO', 'EMITIDO')`,
        [sec.id]
      );
      const soldQuantity = Number(soldTicketsRes.rows[0]?.total_sold ?? 0);

      const capacity = Number(sec.capacity);
      const blockedQuantity = Number(sec.blocked_quantity);
      const availableQuantity = Math.max(0, capacity - blockedQuantity - heldQuantity - soldQuantity);

      sectors.push({
        sectorId: sec.id,
        code: sec.code,
        name: sec.name,
        areaType: sec.area_type,
        capacity,
        blockedQuantity,
        heldQuantity,
        soldQuantity,
        availableQuantity,
        seats: seatsRes.rows.map((s) => this.mapSeatRow(s)),
      });
    }

    return {
      eventId: session.event_id,
      sessionId: session.id,
      generatedAt: new Date().toISOString(),
      sectors,
    };
  }

  async createHold(
    sessionId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<InventoryHoldDto> {
    const parsed = CreateInventoryHoldRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de reserva (hold) inválidos.',
      });
    }

    return this.runExclusive(async () => {
      await this.expireStaleHolds();

      // Idempotência da reserva
      const existingHoldRes = await this.db.query<HoldRow>(
        `SELECT id, event_id, session_id, sector_id, seat_id, channel_type, quantity, status, idempotency_key, expires_at, created_at
         FROM inventory_holds
         WHERE idempotency_key = $1`,
        [parsed.data.idempotencyKey]
      );
      if (existingHoldRes.rows[0]) {
        return this.mapHoldRow(existingHoldRes.rows[0]);
      }

      const sectorRes = await this.db.query<{
        id: string;
        event_id: string;
        session_id: string;
        area_type: string;
        capacity: number;
        blocked_quantity: number;
      }>(
        `SELECT id, event_id, session_id, area_type, capacity, blocked_quantity
         FROM event_sectors
         WHERE id = $1 AND session_id = $2`,
        [parsed.data.sectorId, sessionId]
      );
      const sector = sectorRes.rows[0];
      if (!sector) {
        throw new NotFoundException({
          code: 'INV-404',
          message: 'Setor não encontrado para a sessão informada.',
        });
      }

      if (parsed.data.seatId) {
        if (parsed.data.quantity !== 1) {
          throw new BadRequestException({
            code: 'INV-002',
            message: 'Reservas com assento nominal específico devem ter quantidade igual a 1.',
          });
        }

        const seatRes = await this.db.query<SeatRow>(
          `SELECT id, event_id, session_id, sector_id, seat_code, status, active_hold_id, active_ticket_id
           FROM seats
           WHERE id = $1 AND sector_id = $2`,
          [parsed.data.seatId, sector.id]
        );
        const seat = seatRes.rows[0];
        if (!seat) {
          throw new NotFoundException({
            code: 'INV-404',
            message: 'Assento não encontrado no setor informado.',
          });
        }

        if (seat.status !== 'AVAILABLE') {
          throw new ConflictException({
            code: 'INV-409',
            message: `Assento ${seat.seat_code} indisponível no momento (status atual: ${seat.status}).`,
          });
        }
      }

      // Verifica capacidade total concorrente do setor (Site + PDV + Cortesias)
      const heldRes = await this.db.query<{ total_held: string | number }>(
        `SELECT COALESCE(SUM(quantity), 0)::int AS total_held
         FROM inventory_holds
         WHERE sector_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()`,
        [sector.id]
      );
      const heldQty = Number(heldRes.rows[0]?.total_held ?? 0);

      const soldRes = await this.db.query<{ total_sold: string | number }>(
        `SELECT COUNT(*)::int AS total_sold
         FROM tickets
         WHERE sector_id = $1 AND validity_status IN ('RESERVADO', 'EMITIDO')`,
        [sector.id]
      );
      const soldQty = Number(soldRes.rows[0]?.total_sold ?? 0);

      const availableQty = Number(sector.capacity) - Number(sector.blocked_quantity) - heldQty - soldQty;
      if (parsed.data.quantity > availableQty) {
        throw new ConflictException({
          code: 'INV-409',
          message: `Capacidade insuficiente no setor. Disponível: ${Math.max(0, availableQty)}, solicitado: ${parsed.data.quantity}.`,
        });
      }

      const holdId = randomUUID();
      const expiresAt = new Date(Date.now() + parsed.data.ttlSeconds * 1000).toISOString();

      if (parsed.data.seatId) {
        const updateSeat = await this.db.query<{ id: string }>(
          `UPDATE seats
           SET status = 'HELD', active_hold_id = $1, updated_at = NOW()
           WHERE id = $2 AND status = 'AVAILABLE'
           RETURNING id`,
          [holdId, parsed.data.seatId]
        );
        if (updateSeat.rows.length === 0) {
          throw new ConflictException({
            code: 'INV-409',
            message: 'O assento acabou de ser reservado por outro canal concorrente (Site/PDV).',
          });
        }
      }

      const insertHold = await this.db.query<HoldRow>(
        `INSERT INTO inventory_holds (
           id, event_id, session_id, sector_id, seat_id, channel_type, quantity, status, idempotency_key, expires_at, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, $10)
         RETURNING id, event_id, session_id, sector_id, seat_id, channel_type, quantity, status, idempotency_key, expires_at, created_at`,
        [
          holdId,
          sector.event_id,
          sessionId,
          sector.id,
          parsed.data.seatId ?? null,
          parsed.data.channelType,
          parsed.data.quantity,
          parsed.data.idempotencyKey,
          expiresAt,
          actor.userId,
        ]
      );

      const createdHold = this.mapHoldRow(insertHold.rows[0]!);

      await this.audit.record({
        actorUserId: actor.userId,
        actorRole: actor.roles[0] ?? 'UNKNOWN',
        sessionId: actor.sessionId,
        canonicalAction: 'INVENTORY_HOLD_CREATED',
        resourceType: 'InventoryHold',
        resourceId: createdHold.id,
        eventId: createdHold.eventId,
        outcome: 'SUCCESS',
        correlationId,
        afterState: {
          channelType: createdHold.channelType,
          sectorId: createdHold.sectorId,
          seatId: createdHold.seatId,
          quantity: createdHold.quantity,
          expiresAt: createdHold.expiresAt,
        },
      });

      return createdHold;
    });
  }
}
