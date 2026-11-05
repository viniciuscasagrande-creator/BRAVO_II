import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  ApproveEventFeeAgreementRequestSchema,
  calculateEventDiskFeeCents,
  CreateFeeSnapshotRequestSchema,
  ProposeEventFeeAgreementRequestSchema,
  type AuthenticatedActorDto,
  type EventFeeSnapshotDto,
} from '@bravo-ii/contracts';

@Injectable()
export class CommercialService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private assertInternalFeeAccess(actor: AuthenticatedActorDto): void {
    if (actor.roles.includes('PRODUTOR_PDT') && !actor.roles.some((r) => r !== 'PRODUTOR_PDT')) {
      throw new ForbiddenException({
        code: 'PDT_INTERNAL_FEE_FORBIDDEN',
        message: 'Acesso negado: a Taxa Disk contratual interna não pode ser acessada pelo Portal do Produtor.',
      });
    }
  }

  async proposeEventFeeAgreement(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ) {
    this.assertInternalFeeAccess(actor);

    const eventCheck = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM events WHERE id = $1`,
      [eventId]
    );
    if (eventCheck.rows.length === 0) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Evento não encontrado para proposição de Taxa Disk.',
      });
    }

    const parsed = ProposeEventFeeAgreementRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_FEE_AGREEMENT',
        message: 'Parâmetros da Taxa Disk por evento inválidos.',
        details: parsed.error.issues,
      });
    }

    const maxVerRes = await this.db.query<{ max_ver: number | null }>(
      `SELECT MAX(agreement_version) AS max_ver FROM event_fee_agreements WHERE event_id = $1`,
      [eventId]
    );
    const nextVersion = Number(maxVerRes.rows[0]?.max_ver ?? 0) + 1;

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_fee_agreements (
        id, event_id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents,
        payer, visibility, status, approval_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INTERNAL_DISK', 'DRAFT', $8)`,
      [
        id,
        eventId,
        nextVersion,
        parsed.data.calculationType,
        parsed.data.percentageRate,
        parsed.data.fixedAmountCents,
        parsed.data.payer,
        parsed.data.approvalReference ?? null,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.fee_agreement.proposed',
      resourceType: 'EventFeeAgreement',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { previousMaxVersion: nextVersion - 1 },
      afterState: {
        id,
        eventId,
        agreementVersion: nextVersion,
        calculationType: parsed.data.calculationType,
        percentageRate: parsed.data.percentageRate,
        fixedAmountCents: parsed.data.fixedAmountCents,
        payer: parsed.data.payer,
        visibility: 'INTERNAL_DISK',
        status: 'DRAFT',
      },
    });

    return {
      id,
      eventId,
      agreementVersion: nextVersion,
      calculationType: parsed.data.calculationType,
      percentageRate: parsed.data.percentageRate,
      fixedAmountCents: parsed.data.fixedAmountCents,
      payer: parsed.data.payer,
      visibility: 'INTERNAL_DISK' as const,
      status: 'DRAFT' as const,
    };
  }

  async approveEventFeeAgreement(
    eventId: string,
    agreementVersion: number,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ) {
    this.assertInternalFeeAccess(actor);

    const parsed = ApproveEventFeeAgreementRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_FEE_APPROVAL_PAYLOAD',
        message: 'Informe uma referência válida para aprovação comercial da Taxa Disk.',
        details: parsed.error.issues,
      });
    }

    const targetRes = await this.db.query<{
      id: string;
      status: string;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      fixed_amount_cents: string | number | null;
      payer: string;
    }>(
      `SELECT id, status, calculation_type, percentage_rate, fixed_amount_cents, payer
       FROM event_fee_agreements
       WHERE event_id = $1 AND agreement_version = $2`,
      [eventId, agreementVersion]
    );

    if (targetRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'FEE_AGREEMENT_VERSION_NOT_FOUND',
        message: `Versão ${agreementVersion} da Taxa Disk não encontrada para este evento.`,
      });
    }

    const target = targetRes.rows[0];
    const nowIso = new Date().toISOString();

    // Alteração prospectiva: versões anteriormente aprovadas neste mesmo evento tornam-se SUPERSEDED
    await this.db.query(
      `UPDATE event_fee_agreements
       SET status = 'SUPERSEDED', valid_until = $2
       WHERE event_id = $1 AND status = 'APPROVED' AND agreement_version <> $3`,
      [eventId, nowIso, agreementVersion]
    );

    await this.db.query(
      `UPDATE event_fee_agreements
       SET status = 'APPROVED',
           approved_by = $3,
           approved_at = $4,
           approval_reference = $5,
           valid_from = $4
       WHERE event_id = $1 AND agreement_version = $2`,
      [eventId, agreementVersion, actor.userId, nowIso, parsed.data.approvalReference]
    );

    // Registrar aprovação na trilha de aprovações do evento
    await this.db.query(
      `INSERT INTO event_approvals (id, event_id, stage, decision, decided_by, notes, decided_at)
       VALUES ($1, $2, 'COMERCIAL', 'APPROVED', $3, $4, $5)
       ON CONFLICT (event_id, stage)
       DO UPDATE SET decision = EXCLUDED.decision, decided_by = EXCLUDED.decided_by, notes = EXCLUDED.notes, decided_at = EXCLUDED.decided_at`,
      [
        randomUUID(),
        eventId,
        actor.userId,
        `Taxa Disk v${agreementVersion} aprovada (${parsed.data.approvalReference}).`,
        nowIso,
      ]
    );

    await this.db.query(
      `INSERT INTO outbox_events (
        id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, event_id, payload
      ) VALUES ($1, 'EventFeeApproved', 1, 'EventFeeAgreement', $2, $3, $4, $5)`,
      [
        randomUUID(),
        target.id,
        correlationId,
        eventId,
        JSON.stringify({
          feeAgreementId: target.id,
          eventId,
          agreementVersion,
          approvedBy: actor.userId,
          approvalReference: parsed.data.approvalReference,
        }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.fee_agreement.approved',
      resourceType: 'EventFeeAgreement',
      resourceId: target.id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: target.status, agreementVersion },
      afterState: {
        status: 'APPROVED',
        agreementVersion,
        approvalReference: parsed.data.approvalReference,
        approvedBy: actor.userId,
      },
    });

    return {
      id: target.id,
      eventId,
      agreementVersion,
      calculationType: target.calculation_type,
      percentageRate: target.percentage_rate !== null ? Number(target.percentage_rate) : null,
      fixedAmountCents: target.fixed_amount_cents !== null ? Number(target.fixed_amount_cents) : null,
      payer: target.payer,
      status: 'APPROVED',
      approvalReference: parsed.data.approvalReference,
      approvedAt: nowIso,
    };
  }

  async createFeeSnapshotForEvent(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventFeeSnapshotDto> {
    this.assertInternalFeeAccess(actor);

    const parsed = CreateFeeSnapshotRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_FEE_SNAPSHOT_PAYLOAD',
        message: 'Dados inválidos para criação de snapshot contratual da Taxa Disk.',
        details: parsed.error.issues,
      });
    }

    const activeFeeRes = await this.db.query<{
      id: string;
      agreement_version: number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      fixed_amount_cents: string | number | null;
      payer: string;
    }>(
      `SELECT id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents, payer
       FROM event_fee_agreements
       WHERE event_id = $1 AND status = 'APPROVED'
       ORDER BY agreement_version DESC
       LIMIT 1`,
      [eventId]
    );

    if (activeFeeRes.rows.length === 0) {
      throw new BadRequestException({
        code: 'EVENT_FEE_APPROVAL_REQUIRED',
        message: 'O evento não possui uma versão aprovada da Taxa Disk para gerar snapshot contratual.',
      });
    }

    const activeFee = activeFeeRes.rows[0];
    const percentageRate = activeFee.percentage_rate !== null ? Number(activeFee.percentage_rate) : null;
    const fixedAmountCents = activeFee.fixed_amount_cents !== null ? Number(activeFee.fixed_amount_cents) : null;

    const calculatedDiskFeeCents = calculateEventDiskFeeCents(parsed.data.ticketNominalPriceCents, {
      calculationType: activeFee.calculation_type,
      percentageRate,
      fixedAmountCents,
    });

    const id = randomUUID();
    const nowIso = new Date().toISOString();

    await this.db.query(
      `INSERT INTO event_fee_snapshots (
        id, event_id, fee_agreement_id, agreement_version, reference_type, reference_id,
        ticket_nominal_price_cents, calculation_type, percentage_rate, fixed_amount_cents,
        calculated_disk_fee_cents, payer, captured_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        eventId,
        activeFee.id,
        Number(activeFee.agreement_version),
        parsed.data.referenceType,
        parsed.data.referenceId,
        parsed.data.ticketNominalPriceCents,
        activeFee.calculation_type,
        percentageRate,
        fixedAmountCents,
        calculatedDiskFeeCents,
        activeFee.payer,
        nowIso,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.fee_snapshot.captured',
      resourceType: 'EventFeeSnapshot',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        agreementVersion: Number(activeFee.agreement_version),
        referenceType: parsed.data.referenceType,
        referenceId: parsed.data.referenceId,
        ticketNominalPriceCents: parsed.data.ticketNominalPriceCents,
        calculatedDiskFeeCents,
      },
    });

    return {
      id,
      eventId,
      feeAgreementId: activeFee.id,
      agreementVersion: Number(activeFee.agreement_version),
      referenceType: parsed.data.referenceType,
      referenceId: parsed.data.referenceId,
      ticketNominalPriceCents: parsed.data.ticketNominalPriceCents,
      calculationType: activeFee.calculation_type,
      percentageRate,
      fixedAmountCents,
      calculatedDiskFeeCents,
      payer: activeFee.payer,
      capturedAt: nowIso,
    };
  }

  async listFeeSnapshotsForEvent(
    eventId: string,
    actor: AuthenticatedActorDto
  ): Promise<EventFeeSnapshotDto[]> {
    this.assertInternalFeeAccess(actor);

    const res = await this.db.query<{
      id: string;
      event_id: string;
      fee_agreement_id: string;
      agreement_version: number;
      reference_type: string;
      reference_id: string;
      ticket_nominal_price_cents: string | number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      fixed_amount_cents: string | number | null;
      calculated_disk_fee_cents: string | number;
      payer: string;
      captured_at: string | Date;
    }>(
      `SELECT
        id, event_id, fee_agreement_id, agreement_version, reference_type, reference_id,
        ticket_nominal_price_cents, calculation_type, percentage_rate, fixed_amount_cents,
        calculated_disk_fee_cents, payer, captured_at
       FROM event_fee_snapshots
       WHERE event_id = $1
       ORDER BY captured_at ASC`,
      [eventId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      feeAgreementId: r.fee_agreement_id,
      agreementVersion: Number(r.agreement_version),
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      ticketNominalPriceCents: Number(r.ticket_nominal_price_cents),
      calculationType: r.calculation_type,
      percentageRate: r.percentage_rate !== null ? Number(r.percentage_rate) : null,
      fixedAmountCents: r.fixed_amount_cents !== null ? Number(r.fixed_amount_cents) : null,
      calculatedDiskFeeCents: Number(r.calculated_disk_fee_cents),
      payer: r.payer,
      capturedAt: r.captured_at instanceof Date ? r.captured_at.toISOString() : String(r.captured_at),
    }));
  }
}
