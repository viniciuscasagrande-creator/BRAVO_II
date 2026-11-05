import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { loadEnvironmentConfig } from '@bravo-ii/config';
import {
  type AuthenticatedActorDto,
  type TicketDeliveryDto,
  type TicketDetailDto,
} from '@bravo-ii/contracts';

interface TicketRow {
  id: string;
  public_code: string;
  order_id: string;
  order_item_id: string;
  customer_id: string;
  event_id: string;
  session_id: string;
  sector_id: string;
  seat_id: string | null;
  validity_status: 'RESERVADO' | 'EMITIDO' | 'BLOQUEADO' | 'TROCADO' | 'CANCELADO' | 'ESTORNADO';
  delivery_status: 'PENDENTE' | 'ENVIADO' | 'FALHA_ENVIO';
  checkin_status: 'NAO_UTILIZADO' | 'VALIDADO';
  issued_at: Date | string;
  cancelled_at: Date | string | null;
}

interface CredentialRow {
  id: string;
  ticket_id: string;
  token_version: number;
  qr_token: string;
  signature_hmac: string;
  is_active: boolean;
}

interface DeliveryRow {
  id: string;
  ticket_id: string;
  order_id: string;
  recipient_email: string;
  channel: string;
  status: 'PENDING' | 'SENT' | 'FAILED_RETRYABLE' | 'EXHAUSTED';
  attempt_count: number;
  last_error: string | null;
  sent_at: Date | string | null;
  updated_at: Date | string;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService
  ) {}

  private mapDeliveryRow(row: DeliveryRow): TicketDeliveryDto {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      orderId: row.order_id,
      recipientEmail: row.recipient_email,
      channel: row.channel,
      status: row.status,
      attemptCount: Number(row.attempt_count),
      lastError: row.last_error,
      sentAt: row.sent_at
        ? row.sent_at instanceof Date
          ? row.sent_at.toISOString()
          : String(row.sent_at)
        : null,
      updatedAt:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }

  private async generateUnique8DigitPublicCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      // Gera número de 8 dígitos preservando zeros à esquerda (ex.: 00481920)
      const n = Math.floor(Math.random() * 100_000_000);
      const code = String(n).padStart(8, '0');
      const exists = await this.db.query<{ id: string }>(
        `SELECT id FROM tickets WHERE public_code = $1`,
        [code]
      );
      if (exists.rows.length === 0) {
        return code;
      }
    }
    throw new Error('Falha ao alocar código público único de 8 dígitos para o ingresso.');
  }

  computeQrSignatureHmac(ticketId: string, tokenVersion: number, qrToken: string): string {
    const config = loadEnvironmentConfig();
    return createHmac('sha256', config.qrSigningSecret)
      .update(`${ticketId}:v${tokenVersion}:${qrToken}`)
      .digest('hex');
  }

  async issueTicketForOrderItem(params: {
    orderId: string;
    orderItemId: string;
    customerId: string;
    recipientEmail: string;
    eventId: string;
    sessionId: string;
    sectorId: string;
    seatId: string | null;
    simulateEmailFailure: boolean;
    actorUserId: string | null;
    actorRole: string;
    correlationId: string;
  }): Promise<TicketDetailDto> {
    // Idempotência: se o item do pedido já gerou ingresso, retorna o existente
    const existingRes = await this.db.query<TicketRow>(
      `SELECT id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
              validity_status, delivery_status, checkin_status, issued_at, cancelled_at
       FROM tickets
       WHERE order_item_id = $1`,
      [params.orderItemId]
    );
    if (existingRes.rows[0]) {
      return this.enrichTicketRow(existingRes.rows[0]);
    }

    const ticketId = randomUUID();
    const publicCode = await this.generateUnique8DigitPublicCode();
    const deliveryStatus = params.simulateEmailFailure ? 'FALHA_ENVIO' : 'ENVIADO';

    const insertTicketRes = await this.db.query<TicketRow>(
      `INSERT INTO tickets (
         id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
         validity_status, delivery_status, checkin_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'EMITIDO', $10, 'NAO_UTILIZADO')
       RETURNING id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
                 validity_status, delivery_status, checkin_status, issued_at, cancelled_at`,
      [
        ticketId,
        publicCode,
        params.orderId,
        params.orderItemId,
        params.customerId,
        params.eventId,
        params.sessionId,
        params.sectorId,
        params.seatId,
        deliveryStatus,
      ]
    );

    if (params.seatId) {
      await this.db.query(
        `UPDATE seats
         SET status = 'SOLD', active_ticket_id = $1, active_hold_id = NULL, updated_at = NOW()
         WHERE id = $2`,
        [ticketId, params.seatId]
      );
    }

    // Cria credencial QR independente do código público de 8 dígitos
    const credentialId = randomUUID();
    const tokenVersion = 1;
    const qrToken = `QR-${randomUUID().replace(/-/g, '')}`;
    const signatureHmac = this.computeQrSignatureHmac(ticketId, tokenVersion, qrToken);

    await this.db.query(
      `INSERT INTO ticket_credentials (
         id, ticket_id, token_version, qr_token, signature_hmac, is_active
       ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [credentialId, ticketId, tokenVersion, qrToken, signatureHmac]
    );

    // Registra entrega de e-mail transacional com suporte a retry separado da validade do ingresso
    const deliveryId = randomUUID();
    const queueStatus = params.simulateEmailFailure ? 'FAILED_RETRYABLE' : 'SENT';
    const lastError = params.simulateEmailFailure
      ? 'Falha temporária simulada no provedor SMTP transacional (sandbox).'
      : null;
    const sentAt = params.simulateEmailFailure ? null : new Date().toISOString();

    await this.db.query(
      `INSERT INTO ticket_deliveries (
         id, ticket_id, order_id, recipient_email, channel, status, attempt_count, last_error, sent_at
       ) VALUES ($1, $2, $3, $4, 'EMAIL', $5, 1, $6, $7)`,
      [
        deliveryId,
        ticketId,
        params.orderId,
        params.recipientEmail,
        queueStatus,
        lastError,
        sentAt,
      ]
    );

    // Registra evento no Outbox Transacional
    await this.db.query(
      `INSERT INTO outbox_events (
         id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, event_id, payload, status, processed_at
       ) VALUES ($1, 'TicketIssuedDeliveryQueued', 1, 'Ticket', $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        ticketId,
        params.correlationId,
        params.eventId,
        JSON.stringify({
          ticketId,
          publicCode,
          orderId: params.orderId,
          deliveryStatus: queueStatus,
        }),
        params.simulateEmailFailure ? 'PENDING' : 'PROCESSED',
        params.simulateEmailFailure ? null : new Date().toISOString(),
      ]
    );

    await this.audit.record({
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      canonicalAction: 'TICKET_ISSUED',
      resourceType: 'Ticket',
      resourceId: ticketId,
      eventId: params.eventId,
      outcome: 'SUCCESS',
      correlationId: params.correlationId,
      afterState: {
        publicCode,
        validityStatus: 'EMITIDO',
        deliveryStatus,
        checkinStatus: 'NAO_UTILIZADO',
      },
    });

    return this.enrichTicketRow(insertTicketRes.rows[0]!);
  }

  async enrichTicketRow(row: TicketRow): Promise<TicketDetailDto> {
    const credRes = await this.db.query<CredentialRow>(
      `SELECT id, ticket_id, token_version, qr_token, signature_hmac, is_active
       FROM ticket_credentials
       WHERE ticket_id = $1 AND is_active = TRUE
       ORDER BY token_version DESC
       LIMIT 1`,
      [row.id]
    );

    const delivRes = await this.db.query<DeliveryRow>(
      `SELECT id, ticket_id, order_id, recipient_email, channel, status, attempt_count, last_error, sent_at, updated_at
       FROM ticket_deliveries
       WHERE ticket_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [row.id]
    );

    const cred = credRes.rows[0];
    const deliv = delivRes.rows[0];

    return {
      id: row.id,
      publicCode: row.public_code.trim(),
      orderId: row.order_id,
      orderItemId: row.order_item_id,
      customerId: row.customer_id,
      eventId: row.event_id,
      sessionId: row.session_id,
      sectorId: row.sector_id,
      seatId: row.seat_id,
      validityStatus: row.validity_status,
      deliveryStatus: row.delivery_status,
      checkinStatus: row.checkin_status,
      issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : String(row.issued_at),
      cancelledAt: row.cancelled_at
        ? row.cancelled_at instanceof Date
          ? row.cancelled_at.toISOString()
          : String(row.cancelled_at)
        : null,
      qrCredential: cred
        ? {
            tokenVersion: Number(cred.token_version),
            qrToken: cred.qr_token,
            signatureHmac: cred.signature_hmac,
            isActive: Boolean(cred.is_active),
          }
        : undefined,
      delivery: deliv ? this.mapDeliveryRow(deliv) : undefined,
    };
  }

  async listTickets(filters?: { publicCode?: string; eventId?: string; orderId?: string }): Promise<TicketDetailDto[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.publicCode) {
      params.push(filters.publicCode.trim());
      conditions.push(`public_code = $${params.length}`);
    }
    if (filters?.eventId) {
      params.push(filters.eventId);
      conditions.push(`event_id = $${params.length}`);
    }
    if (filters?.orderId) {
      params.push(filters.orderId);
      conditions.push(`order_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.db.query<TicketRow>(
      `SELECT id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
              validity_status, delivery_status, checkin_status, issued_at, cancelled_at
       FROM tickets
       ${whereClause}
       ORDER BY issued_at DESC`,
      params
    );

    const items: TicketDetailDto[] = [];
    for (const r of res.rows) {
      items.push(await this.enrichTicketRow(r));
    }
    return items;
  }

  async retryTicketDelivery(
    ticketId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<TicketDetailDto> {
    const ticketRes = await this.db.query<TicketRow>(
      `SELECT id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
              validity_status, delivery_status, checkin_status, issued_at, cancelled_at
       FROM tickets WHERE id = $1`,
      [ticketId]
    );
    const ticket = ticketRes.rows[0];
    if (!ticket) {
      throw new NotFoundException({
        code: 'TKT-404',
        message: 'Ingresso não encontrado.',
      });
    }

    if (ticket.validity_status !== 'EMITIDO') {
      throw new BadRequestException({
        code: 'TKT-001',
        message: `Não é possível reenviar ingresso com status de validade ${ticket.validity_status}.`,
      });
    }

    await this.db.query(
      `UPDATE ticket_deliveries
       SET status = 'SENT',
           attempt_count = attempt_count + 1,
           last_error = NULL,
           sent_at = NOW(),
           updated_at = NOW()
       WHERE ticket_id = $1`,
      [ticketId]
    );

    const updatedRes = await this.db.query<TicketRow>(
      `UPDATE tickets
       SET delivery_status = 'ENVIADO'
       WHERE id = $1
       RETURNING id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
                 validity_status, delivery_status, checkin_status, issued_at, cancelled_at`,
      [ticketId]
    );

    await this.db.query(
      `UPDATE outbox_events
       SET status = 'PROCESSED', processed_at = NOW()
       WHERE aggregate_type = 'Ticket' AND aggregate_id = $1 AND status = 'PENDING'`,
      [ticketId]
    );

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'TICKET_DELIVERY_RETRIED',
      resourceType: 'Ticket',
      resourceId: ticketId,
      eventId: ticket.event_id,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        publicCode: ticket.public_code.trim(),
        deliveryStatus: 'ENVIADO',
      },
    });

    return this.enrichTicketRow(updatedRes.rows[0]!);
  }

  async cancelTicket(
    ticketId: string,
    reasonPtBr: string | undefined,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<TicketDetailDto> {
    const ticketRes = await this.db.query<TicketRow>(
      `SELECT id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
              validity_status, delivery_status, checkin_status, issued_at, cancelled_at
       FROM tickets WHERE id = $1`,
      [ticketId]
    );
    const ticket = ticketRes.rows[0];
    if (!ticket) {
      throw new NotFoundException({
        code: 'TKT-404',
        message: 'Ingresso não encontrado.',
      });
    }

    if (ticket.checkin_status === 'VALIDADO') {
      throw new BadRequestException({
        code: 'TKT-002',
        message: 'Ingresso já utilizado na portaria não pode ser cancelado diretamente sem processo de auditoria.',
      });
    }

    const updatedRes = await this.db.query<TicketRow>(
      `UPDATE tickets
       SET validity_status = 'CANCELADO', cancelled_at = NOW()
       WHERE id = $1
       RETURNING id, public_code, order_id, order_item_id, customer_id, event_id, session_id, sector_id, seat_id,
                 validity_status, delivery_status, checkin_status, issued_at, cancelled_at`,
      [ticketId]
    );

    await this.db.query(
      `UPDATE ticket_credentials
       SET is_active = FALSE, invalidated_at = NOW()
       WHERE ticket_id = $1`,
      [ticketId]
    );

    if (ticket.seat_id) {
      await this.db.query(
        `UPDATE seats
         SET status = 'AVAILABLE', active_ticket_id = NULL, active_hold_id = NULL, updated_at = NOW()
         WHERE id = $1 AND active_ticket_id = $2`,
        [ticket.seat_id, ticketId]
      );
    }

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'TICKET_CANCELLED_CREDENTIAL_INVALIDATED',
      resourceType: 'Ticket',
      resourceId: ticketId,
      eventId: ticket.event_id,
      outcome: 'SUCCESS',
      justification: reasonPtBr ?? 'Cancelamento operacional com invalidação imediata do QR e retorno ao estoque.',
      correlationId,
      beforeState: { validityStatus: ticket.validity_status },
      afterState: { validityStatus: 'CANCELADO', seatReleased: Boolean(ticket.seat_id) },
    });

    return this.enrichTicketRow(updatedRes.rows[0]!);
  }
}
