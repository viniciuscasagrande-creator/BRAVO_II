import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  type AuthenticatedActorDto,
  type CheckinValidationResultDto,
  ValidateCheckinRequestSchema,
} from '@bravo-ii/contracts';

@Injectable()
export class GateControlService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly ticketsService: TicketsService
  ) {}

  private async recordCheckinAttempt(params: {
    ticketId: string | null;
    credentialId: string | null;
    eventId: string;
    sessionId: string;
    gateDeviceCode: string;
    operatorUserId: string | null;
    outcome: CheckinValidationResultDto['outcome'];
  }): Promise<{ checkinId: string; checkedInAt: string }> {
    const checkinId = randomUUID();
    const res = await this.db.query<{ id: string; checked_in_at: Date | string }>(
      `INSERT INTO ticket_checkins (
         id, ticket_id, credential_id, event_id, session_id, gate_device_code, operator_user_id, outcome
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, checked_in_at`,
      [
        checkinId,
        params.ticketId,
        params.credentialId,
        params.eventId,
        params.sessionId,
        params.gateDeviceCode,
        params.operatorUserId,
        params.outcome,
      ]
    );
    const row = res.rows[0]!;
    return {
      checkinId: row.id,
      checkedInAt:
        row.checked_in_at instanceof Date
          ? row.checked_in_at.toISOString()
          : String(row.checked_in_at),
    };
  }

  async validateCheckin(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<CheckinValidationResultDto> {
    const parsed = ValidateCheckinRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de check-in inválidos.',
      });
    }

    const { eventId, sessionId, gateDeviceCode, qrToken, signatureHmac, publicCodeOnly } =
      parsed.data;

    // Regra mandatória: O número público de 8 dígitos NUNCA libera entrada sem o token QR criptográfico
    if (publicCodeOnly && !qrToken) {
      const ticketByCode = await this.db.query<{
        id: string;
        public_code: string;
        validity_status: string;
        checkin_status: string;
      }>(
        `SELECT id, public_code, validity_status, checkin_status
         FROM tickets
         WHERE public_code = $1`,
        [publicCodeOnly.trim()]
      );
      const t = ticketByCode.rows[0];

      const attempt = await this.recordCheckinAttempt({
        ticketId: t?.id ?? null,
        credentialId: null,
        eventId,
        sessionId,
        gateDeviceCode,
        operatorUserId: actor.userId,
        outcome: 'DENIED_PUBLIC_CODE_ONLY',
      });

      await this.audit.record({
        actorUserId: actor.userId,
        actorRole: actor.roles[0] ?? 'UNKNOWN',
        sessionId: actor.sessionId,
        canonicalAction: 'GATE_CHECKIN_DENIED_PUBLIC_CODE_ONLY',
        resourceType: 'TicketCheckin',
        resourceId: attempt.checkinId,
        eventId,
        outcome: 'DENIED',
        justification:
          'Tentativa de acesso informando apenas o código público de 8 dígitos sem credencial QR assinada.',
        correlationId,
        afterState: { publicCodeOnly, gateDeviceCode },
      });

      return {
        checkinId: attempt.checkinId,
        allowed: false,
        outcome: 'DENIED_PUBLIC_CODE_ONLY',
        messagePtBr:
          'Acesso negado: o número público de 8 dígitos do ingresso serve apenas para consulta/atendimento e não libera catraca sem o QR Code criptográfico.',
        ticket: t
          ? {
              id: t.id,
              publicCode: t.public_code.trim(),
              validityStatus: t.validity_status,
              checkinStatus: t.checkin_status,
            }
          : undefined,
        checkedInAt: attempt.checkedInAt,
      };
    }

    if (!qrToken || !signatureHmac) {
      throw new BadRequestException({
        code: 'GATE-001',
        message: 'Informe qrToken e signatureHmac da credencial de portaria.',
      });
    }

    const credRes = await this.db.query<{
      cred_id: string;
      ticket_id: string;
      token_version: number;
      qr_token: string;
      signature_hmac: string;
      is_active: boolean;
      public_code: string;
      event_id: string;
      session_id: string;
      validity_status: string;
      checkin_status: string;
    }>(
      `SELECT
         tc.id AS cred_id,
         tc.ticket_id,
         tc.token_version,
         tc.qr_token,
         tc.signature_hmac,
         tc.is_active,
         t.public_code,
         t.event_id,
         t.session_id,
         t.validity_status,
         t.checkin_status
       FROM ticket_credentials tc
       INNER JOIN tickets t ON t.id = tc.ticket_id
       WHERE tc.qr_token = $1`,
      [qrToken]
    );

    const record = credRes.rows[0];
    if (!record) {
      const attempt = await this.recordCheckinAttempt({
        ticketId: null,
        credentialId: null,
        eventId,
        sessionId,
        gateDeviceCode,
        operatorUserId: actor.userId,
        outcome: 'DENIED_INVALID_SIGNATURE',
      });

      return {
        checkinId: attempt.checkinId,
        allowed: false,
        outcome: 'DENIED_INVALID_SIGNATURE',
        messagePtBr: 'Acesso negado: credencial QR inexistente ou não reconhecida.',
        checkedInAt: attempt.checkedInAt,
      };
    }

    const expectedHmac = this.ticketsService.computeQrSignatureHmac(
      record.ticket_id,
      Number(record.token_version),
      record.qr_token
    );

    if (signatureHmac !== expectedHmac || signatureHmac !== record.signature_hmac) {
      const attempt = await this.recordCheckinAttempt({
        ticketId: record.ticket_id,
        credentialId: record.cred_id,
        eventId,
        sessionId,
        gateDeviceCode,
        operatorUserId: actor.userId,
        outcome: 'DENIED_INVALID_SIGNATURE',
      });

      return {
        checkinId: attempt.checkinId,
        allowed: false,
        outcome: 'DENIED_INVALID_SIGNATURE',
        messagePtBr: 'Acesso negado: assinatura criptográfica do QR Code inválida ou adulterada.',
        ticket: {
          id: record.ticket_id,
          publicCode: record.public_code.trim(),
          validityStatus: record.validity_status,
          checkinStatus: record.checkin_status,
        },
        checkedInAt: attempt.checkedInAt,
      };
    }

    // Verifica se o ingresso está cancelado, estornado, bloqueado ou com credencial inativa
    if (
      !record.is_active ||
      record.validity_status !== 'EMITIDO' ||
      record.event_id !== eventId ||
      record.session_id !== sessionId
    ) {
      const attempt = await this.recordCheckinAttempt({
        ticketId: record.ticket_id,
        credentialId: record.cred_id,
        eventId,
        sessionId,
        gateDeviceCode,
        operatorUserId: actor.userId,
        outcome: 'DENIED_INVALID_STATUS',
      });

      await this.audit.record({
        actorUserId: actor.userId,
        actorRole: actor.roles[0] ?? 'UNKNOWN',
        sessionId: actor.sessionId,
        canonicalAction: 'GATE_CHECKIN_DENIED_INVALID_STATUS',
        resourceType: 'Ticket',
        resourceId: record.ticket_id,
        eventId,
        outcome: 'DENIED',
        correlationId,
        afterState: {
          validityStatus: record.validity_status,
          credentialActive: record.is_active,
        },
      });

      return {
        checkinId: attempt.checkinId,
        allowed: false,
        outcome: 'DENIED_INVALID_STATUS',
        messagePtBr: `Acesso negado: ingresso com status '${record.validity_status}' ou credencial revogada.`,
        ticket: {
          id: record.ticket_id,
          publicCode: record.public_code.trim(),
          validityStatus: record.validity_status,
          checkinStatus: record.checkin_status,
        },
        checkedInAt: attempt.checkedInAt,
      };
    }

    // Verifica duplicidade de check-in de forma atômica
    const updateRes = await this.db.query<{ id: string }>(
      `UPDATE tickets
       SET checkin_status = 'VALIDADO'
       WHERE id = $1 AND checkin_status = 'NAO_UTILIZADO' AND validity_status = 'EMITIDO'
       RETURNING id`,
      [record.ticket_id]
    );

    if (updateRes.rows.length === 0) {
      const attempt = await this.recordCheckinAttempt({
        ticketId: record.ticket_id,
        credentialId: record.cred_id,
        eventId,
        sessionId,
        gateDeviceCode,
        operatorUserId: actor.userId,
        outcome: 'DENIED_ALREADY_USED',
      });

      await this.audit.record({
        actorUserId: actor.userId,
        actorRole: actor.roles[0] ?? 'UNKNOWN',
        sessionId: actor.sessionId,
        canonicalAction: 'GATE_CHECKIN_DENIED_ALREADY_USED',
        resourceType: 'Ticket',
        resourceId: record.ticket_id,
        eventId,
        outcome: 'DENIED',
        correlationId,
        afterState: {
          publicCode: record.public_code.trim(),
          gateDeviceCode,
        },
      });

      return {
        checkinId: attempt.checkinId,
        allowed: false,
        outcome: 'DENIED_ALREADY_USED',
        messagePtBr: `Acesso negado: o ingresso ${record.public_code.trim()} já foi utilizado anteriormente na portaria.`,
        ticket: {
          id: record.ticket_id,
          publicCode: record.public_code.trim(),
          validityStatus: record.validity_status,
          checkinStatus: 'VALIDADO',
        },
        checkedInAt: attempt.checkedInAt,
      };
    }

    const attempt = await this.recordCheckinAttempt({
      ticketId: record.ticket_id,
      credentialId: record.cred_id,
      eventId,
      sessionId,
      gateDeviceCode,
      operatorUserId: actor.userId,
      outcome: 'ALLOWED',
    });

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'GATE_CHECKIN_ALLOWED',
      resourceType: 'Ticket',
      resourceId: record.ticket_id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        publicCode: record.public_code.trim(),
        checkinStatus: 'VALIDADO',
        gateDeviceCode,
      },
    });

    return {
      checkinId: attempt.checkinId,
      allowed: true,
      outcome: 'ALLOWED',
      messagePtBr: `Acesso liberado para o ingresso ${record.public_code.trim()}.`,
      ticket: {
        id: record.ticket_id,
        publicCode: record.public_code.trim(),
        validityStatus: 'EMITIDO',
        checkinStatus: 'VALIDADO',
      },
      checkedInAt: attempt.checkedInAt,
    };
  }
}
