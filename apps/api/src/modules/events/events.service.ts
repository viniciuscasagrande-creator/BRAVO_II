import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  CreateEventPriceLotRequestSchema,
  CreateEventRequestSchema,
  CreateEventSalesChannelRequestSchema,
  CreateEventSectorRequestSchema,
  CreateEventSessionRequestSchema,
  type AuthenticatedActorDto,
  type EventApprovalDto,
  type EventBuilderFullViewDto,
  type EventPriceLotDto,
  type EventSalesChannelDto,
  type EventSectorDto,
  type EventSessionDto,
  type EventSummaryViewDto,
} from '@bravo-ii/contracts';

interface EventRow {
  id: string;
  code: string;
  title: string;
  venue_name: string;
  city: string;
  state_uf: string;
  timezone: string;
  status: string;
  starts_at: string | Date;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private isExternalProducerOnly(actor: AuthenticatedActorDto): boolean {
    return actor.roles.includes('PRODUTOR_PDT') && !actor.roles.some((r) => r !== 'PRODUTOR_PDT');
  }

  private canReadInternalFee(actor: AuthenticatedActorDto): boolean {
    return actor.permissions.includes('event-fee:read-internal') && !this.isExternalProducerOnly(actor);
  }

  private async enrichEventView(row: EventRow, includeInternalFee: boolean): Promise<EventSummaryViewDto> {
    const producersRes = await this.db.query<{
      producer_id: string;
      trade_name: string;
      relationship_role: string;
    }>(
      `SELECT ep.producer_id, p.trade_name, ep.relationship_role
       FROM event_producers ep
       INNER JOIN producers p ON p.id = ep.producer_id
       WHERE ep.event_id = $1
       ORDER BY ep.relationship_role ASC`,
      [row.id]
    );

    const dto: EventSummaryViewDto = {
      id: row.id,
      code: row.code,
      title: row.title,
      venueName: row.venue_name,
      city: row.city,
      stateUf: row.state_uf,
      timezone: row.timezone,
      status: row.status,
      startsAt: row.starts_at instanceof Date ? row.starts_at.toISOString() : String(row.starts_at),
      producers: producersRes.rows.map((p) => ({
        producerId: p.producer_id,
        tradeName: p.trade_name,
        relationshipRole: p.relationship_role,
      })),
    };

    if (includeInternalFee) {
      const feeRes = await this.db.query<{
        agreement_version: number;
        calculation_type: 'PERCENTAGE' | 'FIXED';
        percentage_rate: string | number | null;
        fixed_amount_cents: string | number | null;
        payer: string;
        status: string;
        approval_reference: string | null;
      }>(
        `SELECT
          agreement_version,
          calculation_type,
          percentage_rate,
          fixed_amount_cents,
          payer,
          status,
          approval_reference
         FROM event_fee_agreements
         WHERE event_id = $1
         ORDER BY
           CASE WHEN status = 'APPROVED' THEN 0 ELSE 1 END ASC,
           agreement_version DESC
         LIMIT 1`,
        [row.id]
      );

      if (feeRes.rows.length > 0) {
        const fee = feeRes.rows[0];
        dto.internalDiskFeeAgreement = {
          agreementVersion: Number(fee.agreement_version),
          calculationType: fee.calculation_type,
          percentageRate: fee.percentage_rate !== null ? Number(fee.percentage_rate) : null,
          fixedAmountCents: fee.fixed_amount_cents !== null ? Number(fee.fixed_amount_cents) : null,
          payer: fee.payer,
          status: fee.status,
          approvalReference: fee.approval_reference,
        };
      }
    }

    return dto;
  }

  private async evaluateEventReadiness(eventId: string) {
    const prodRes = await this.db.query<{ verification_status: string }>(
      `SELECT p.verification_status
       FROM event_producers ep
       INNER JOIN producers p ON p.id = ep.producer_id
       WHERE ep.event_id = $1`,
      [eventId]
    );
    const hasVerifiedProducer =
      prodRes.rows.length > 0 && prodRes.rows.every((p) => p.verification_status === 'VERIFIED');

    const feeRes = await this.db.query<{ id: string }>(
      `SELECT id FROM event_fee_agreements WHERE event_id = $1 AND status = 'APPROVED' LIMIT 1`,
      [eventId]
    );
    const hasApprovedDiskFee = feeRes.rows.length > 0;

    const sessionsRes = await this.db.query<{ id: string }>(
      `SELECT id FROM event_sessions WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    const hasSessions = sessionsRes.rows.length > 0;

    const sectorsRes = await this.db.query<{ id: string }>(
      `SELECT id FROM event_sectors WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    const hasSectors = sectorsRes.rows.length > 0;

    const lotsRes = await this.db.query<{ id: string }>(
      `SELECT id FROM event_price_lots WHERE event_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [eventId]
    );
    const hasPriceLots = lotsRes.rows.length > 0;

    const channelsRes = await this.db.query<{ id: string }>(
      `SELECT id FROM event_sales_channels WHERE event_id = $1 AND is_enabled = TRUE LIMIT 1`,
      [eventId]
    );
    const hasEnabledChannels = channelsRes.rows.length > 0;

    const pendingReasonsPtBr: string[] = [];
    if (!hasVerifiedProducer) {
      pendingReasonsPtBr.push('O evento exige Produtor PJ vinculado e com status VERIFIED.');
    }
    if (!hasApprovedDiskFee) {
      pendingReasonsPtBr.push('O evento exige Taxa Disk aprovada pelo Comercial (status APPROVED).');
    }
    if (!hasSessions) {
      pendingReasonsPtBr.push('Cadastre ao menos uma sessão para o evento.');
    }
    if (!hasSectors) {
      pendingReasonsPtBr.push('Cadastre ao menos um setor/área de ocupação.');
    }
    if (!hasPriceLots) {
      pendingReasonsPtBr.push('Cadastre ao menos uma modalidade/lote de preço ativo.');
    }
    if (!hasEnabledChannels) {
      pendingReasonsPtBr.push('Habilite ao menos um canal de venda (Site, PDV ou Bilheteria).');
    }

    return {
      hasVerifiedProducer,
      hasApprovedDiskFee,
      hasSessions,
      hasSectors,
      hasPriceLots,
      hasEnabledChannels,
      isReadyToApproveAndPublish: pendingReasonsPtBr.length === 0,
      pendingReasonsPtBr,
    };
  }

  async listAuthorizedEvents(actor: AuthenticatedActorDto): Promise<EventSummaryViewDto[]> {
    const includeInternalFee = this.canReadInternalFee(actor);

    if (this.isExternalProducerOnly(actor)) {
      if (actor.eventScopeIds.length === 0 && actor.producerScopeIds.length === 0) {
        return [];
      }

      const res = await this.db.query<EventRow>(
        `SELECT DISTINCT e.id, e.code, e.title, e.venue_name, e.city, e.state_uf, e.timezone, e.status, e.starts_at
         FROM events e
         LEFT JOIN event_producers ep ON ep.event_id = e.id
         WHERE e.id = ANY($1::uuid[]) OR ep.producer_id = ANY($2::uuid[])
         ORDER BY e.starts_at ASC`,
        [actor.eventScopeIds, actor.producerScopeIds]
      );

      const items: EventSummaryViewDto[] = [];
      for (const row of res.rows) {
        items.push(await this.enrichEventView(row, false));
      }
      return items;
    }

    const res = await this.db.query<EventRow>(
      `SELECT id, code, title, venue_name, city, state_uf, timezone, status, starts_at
       FROM events
       ORDER BY starts_at ASC`
    );

    const items: EventSummaryViewDto[] = [];
    for (const row of res.rows) {
      items.push(await this.enrichEventView(row, includeInternalFee));
    }
    return items;
  }

  async getEventById(
    eventId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventBuilderFullViewDto> {
    const res = await this.db.query<EventRow>(
      `SELECT id, code, title, venue_name, city, state_uf, timezone, status, starts_at
       FROM events
       WHERE id = $1`,
      [eventId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Evento não encontrado.',
      });
    }

    const eventRow = res.rows[0];

    if (this.isExternalProducerOnly(actor)) {
      const producerLinks = await this.db.query<{ producer_id: string }>(
        `SELECT producer_id FROM event_producers WHERE event_id = $1`,
        [eventId]
      );
      const eventProducerIds = producerLinks.rows.map((p) => p.producer_id);

      const hasEventScope = actor.eventScopeIds.includes(eventId);
      const hasProducerScope = eventProducerIds.some((pid) => actor.producerScopeIds.includes(pid));

      if (!hasEventScope && !hasProducerScope) {
        await this.auditService.record({
          actorUserId: actor.userId,
          actorRole: actor.roles.join(','),
          sessionId: actor.sessionId,
          canonicalAction: 'event.access.denied_cross_scope',
          resourceType: 'Event',
          resourceId: eventId,
          eventId,
          outcome: 'DENIED',
          justification: 'Tentativa bloqueada de acesso cruzado (IDOR) a evento não vinculado ao escopo do produtor.',
          origin: 'PDT',
          correlationId,
        });

        throw new ForbiddenException({
          code: 'CROSS_EVENT_SCOPE_FORBIDDEN',
          message: 'Acesso negado: este evento não pertence ao escopo autorizado do produtor.',
        });
      }
    }

    const includeInternalFee = this.canReadInternalFee(actor);
    const baseSummary = await this.enrichEventView(eventRow, includeInternalFee);

    const sessionsRes = await this.db.query<{
      id: string;
      event_id: string;
      code: string;
      title: string;
      starts_at: string | Date;
      ends_at: string | Date;
      doors_open_at: string | Date | null;
      total_capacity: number;
      status: string;
    }>(
      `SELECT id, event_id, code, title, starts_at, ends_at, doors_open_at, total_capacity, status
       FROM event_sessions
       WHERE event_id = $1
       ORDER BY starts_at ASC`,
      [eventId]
    );

    const sectorsRes = await this.db.query<{
      id: string;
      event_id: string;
      session_id: string;
      code: string;
      name: string;
      area_type: string;
      capacity: number;
      blocked_quantity: number;
    }>(
      `SELECT id, event_id, session_id, code, name, area_type, capacity, blocked_quantity
       FROM event_sectors
       WHERE event_id = $1
       ORDER BY code ASC`,
      [eventId]
    );

    const lotsRes = await this.db.query<{
      id: string;
      event_id: string;
      session_id: string;
      sector_id: string;
      modality_name: string;
      category_type: string;
      lot_number: number;
      nominal_price_cents: string | number;
      max_quantity: number;
      status: string;
    }>(
      `SELECT id, event_id, session_id, sector_id, modality_name, category_type, lot_number, nominal_price_cents, max_quantity, status
       FROM event_price_lots
       WHERE event_id = $1
       ORDER BY lot_number ASC, modality_name ASC`,
      [eventId]
    );

    const channelsRes = await this.db.query<{
      id: string;
      event_id: string;
      channel_type: string;
      channel_code: string;
      channel_name: string;
      allowed_payment_methods: string[] | string;
      channel_service_fee_cents: string | number;
      is_enabled: boolean;
    }>(
      `SELECT id, event_id, channel_type, channel_code, channel_name, allowed_payment_methods, channel_service_fee_cents, is_enabled
       FROM event_sales_channels
       WHERE event_id = $1
       ORDER BY channel_code ASC`,
      [eventId]
    );

    const approvalsRes = await this.db.query<{
      id: string;
      event_id: string;
      stage: string;
      decision: string;
      decided_by: string;
      notes: string | null;
      decided_at: string | Date;
    }>(
      `SELECT id, event_id, stage, decision, decided_by, notes, decided_at
       FROM event_approvals
       WHERE event_id = $1
       ORDER BY decided_at ASC`,
      [eventId]
    );

    const publicationReadiness = await this.evaluateEventReadiness(eventId);

    const fullView: EventBuilderFullViewDto = {
      ...baseSummary,
      sessions: sessionsRes.rows.map((s) => ({
        id: s.id,
        eventId: s.event_id,
        code: s.code,
        title: s.title,
        startsAt: s.starts_at instanceof Date ? s.starts_at.toISOString() : String(s.starts_at),
        endsAt: s.ends_at instanceof Date ? s.ends_at.toISOString() : String(s.ends_at),
        doorsOpenAt:
          s.doors_open_at instanceof Date
            ? s.doors_open_at.toISOString()
            : s.doors_open_at
              ? String(s.doors_open_at)
              : null,
        totalCapacity: Number(s.total_capacity),
        status: s.status,
      })),
      sectors: sectorsRes.rows.map((sec) => ({
        id: sec.id,
        eventId: sec.event_id,
        sessionId: sec.session_id,
        code: sec.code,
        name: sec.name,
        areaType: sec.area_type,
        capacity: Number(sec.capacity),
        blockedQuantity: Number(sec.blocked_quantity),
      })),
      priceLots: lotsRes.rows.map((l) => ({
        id: l.id,
        eventId: l.event_id,
        sessionId: l.session_id,
        sectorId: l.sector_id,
        modalityName: l.modality_name,
        categoryType: l.category_type,
        lotNumber: Number(l.lot_number),
        nominalPriceCents: Number(l.nominal_price_cents),
        maxQuantity: Number(l.max_quantity),
        status: l.status,
      })),
      salesChannels: channelsRes.rows.map((c) => ({
        id: c.id,
        eventId: c.event_id,
        channelType: c.channel_type,
        channelCode: c.channel_code,
        channelName: c.channel_name,
        allowedPaymentMethods: Array.isArray(c.allowed_payment_methods)
          ? c.allowed_payment_methods
          : JSON.parse(String(c.allowed_payment_methods)),
        channelServiceFeeCents: Number(c.channel_service_fee_cents),
        isEnabled: Boolean(c.is_enabled),
      })),
      approvals: approvalsRes.rows.map((a): EventApprovalDto => ({
        id: a.id,
        eventId: a.event_id,
        stage: a.stage,
        decision: a.decision,
        decidedBy: a.decided_by,
        notes: a.notes,
        decidedAt: a.decided_at instanceof Date ? a.decided_at.toISOString() : String(a.decided_at),
      })),
      publicationReadiness,
    };

    if (includeInternalFee) {
      const feeHistRes = await this.db.query<{
        id: string;
        agreement_version: number;
        calculation_type: 'PERCENTAGE' | 'FIXED';
        percentage_rate: string | number | null;
        fixed_amount_cents: string | number | null;
        payer: string;
        status: string;
        approval_reference: string | null;
        approved_at: string | Date | null;
      }>(
        `SELECT
          id, agreement_version, calculation_type, percentage_rate, fixed_amount_cents,
          payer, status, approval_reference, approved_at
         FROM event_fee_agreements
         WHERE event_id = $1
         ORDER BY agreement_version DESC`,
        [eventId]
      );

      fullView.internalFeeHistory = feeHistRes.rows.map((fh) => ({
        id: fh.id,
        agreementVersion: Number(fh.agreement_version),
        calculationType: fh.calculation_type,
        percentageRate: fh.percentage_rate !== null ? Number(fh.percentage_rate) : null,
        fixedAmountCents: fh.fixed_amount_cents !== null ? Number(fh.fixed_amount_cents) : null,
        payer: fh.payer,
        status: fh.status,
        approvalReference: fh.approval_reference,
        approvedAt:
          fh.approved_at instanceof Date
            ? fh.approved_at.toISOString()
            : fh.approved_at
              ? String(fh.approved_at)
              : null,
      }));

      const snapRes = await this.db.query<{
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

      fullView.internalFeeSnapshots = snapRes.rows.map((s) => ({
        id: s.id,
        eventId: s.event_id,
        feeAgreementId: s.fee_agreement_id,
        agreementVersion: Number(s.agreement_version),
        referenceType: s.reference_type,
        referenceId: s.reference_id,
        ticketNominalPriceCents: Number(s.ticket_nominal_price_cents),
        calculationType: s.calculation_type,
        percentageRate: s.percentage_rate !== null ? Number(s.percentage_rate) : null,
        fixedAmountCents: s.fixed_amount_cents !== null ? Number(s.fixed_amount_cents) : null,
        calculatedDiskFeeCents: Number(s.calculated_disk_fee_cents),
        payer: s.payer,
        capturedAt: s.captured_at instanceof Date ? s.captured_at.toISOString() : String(s.captured_at),
      }));
    }

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.detail.read',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
    });

    return fullView;
  }

  async createEvent(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventBuilderFullViewDto> {
    const parsed = CreateEventRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_PAYLOAD',
        message: 'Dados do cadastro de evento inválidos.',
        details: parsed.error.issues,
      });
    }

    const codeCheck = await this.db.query<{ id: string }>('SELECT id FROM events WHERE code = $1', [
      parsed.data.code.toUpperCase(),
    ]);
    if (codeCheck.rows.length > 0) {
      throw new ConflictException({
        code: 'EVENT_CODE_ALREADY_EXISTS',
        message: `Já existe um evento cadastrado com o código ${parsed.data.code.toUpperCase()}.`,
      });
    }

    const prodCheck = await this.db.query<{ id: string }>('SELECT id FROM producers WHERE id = $1', [
      parsed.data.primaryProducerId,
    ]);
    if (prodCheck.rows.length === 0) {
      throw new BadRequestException({
        code: 'PRIMARY_PRODUCER_NOT_FOUND',
        message: 'Produtor PJ principal não encontrado.',
      });
    }

    const eventId = randomUUID();
    await this.db.query(
      `INSERT INTO events (
        id, code, title, venue_name, city, state_uf, timezone, status, starts_at, source_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'RASCUNHO', $8, 'BRAVO_II')`,
      [
        eventId,
        parsed.data.code.toUpperCase(),
        parsed.data.title,
        parsed.data.venueName,
        parsed.data.city,
        parsed.data.stateUf.toUpperCase(),
        parsed.data.timezone,
        parsed.data.startsAt,
      ]
    );

    await this.db.query(
      `INSERT INTO event_producers (event_id, producer_id, relationship_role, revenue_share_percentage)
       VALUES ($1, $2, 'PRIMARY', 100.00)`,
      [eventId, parsed.data.primaryProducerId]
    );

    for (const secProdId of parsed.data.secondaryProducerIds) {
      if (secProdId !== parsed.data.primaryProducerId) {
        await this.db.query(
          `INSERT INTO event_producers (event_id, producer_id, relationship_role, revenue_share_percentage)
           VALUES ($1, $2, 'SECONDARY', 0.00)
           ON CONFLICT (event_id, producer_id) DO NOTHING`,
          [eventId, secProdId]
        );
      }
    }

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.created',
      resourceType: 'Event',
      resourceId: eventId,
      producerId: parsed.data.primaryProducerId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: null,
      afterState: {
        id: eventId,
        code: parsed.data.code.toUpperCase(),
        title: parsed.data.title,
        status: 'RASCUNHO',
        primaryProducerId: parsed.data.primaryProducerId,
      },
    });

    return this.getEventById(eventId, actor, correlationId);
  }

  async addEventSession(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventSessionDto> {
    const parsed = CreateEventSessionRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_SESSION_PAYLOAD',
        message: 'Dados da sessão do evento inválidos.',
        details: parsed.error.issues,
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_sessions (
        id, event_id, code, title, starts_at, ends_at, doors_open_at, total_capacity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SCHEDULED')`,
      [
        id,
        eventId,
        parsed.data.code.toUpperCase(),
        parsed.data.title,
        parsed.data.startsAt,
        parsed.data.endsAt,
        parsed.data.doorsOpenAt ?? null,
        parsed.data.totalCapacity,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.session.created',
      resourceType: 'EventSession',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        code: parsed.data.code.toUpperCase(),
        totalCapacity: parsed.data.totalCapacity,
      },
    });

    return {
      id,
      eventId,
      code: parsed.data.code.toUpperCase(),
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      doorsOpenAt: parsed.data.doorsOpenAt ?? null,
      totalCapacity: parsed.data.totalCapacity,
      status: 'SCHEDULED',
    };
  }

  async addEventSector(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventSectorDto> {
    const parsed = CreateEventSectorRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_SECTOR_PAYLOAD',
        message: 'Dados do setor/área do evento inválidos.',
        details: parsed.error.issues,
      });
    }

    if (parsed.data.blockedQuantity > parsed.data.capacity) {
      throw new BadRequestException({
        code: 'SECTOR_BLOCKED_EXCEEDS_CAPACITY',
        message: 'A quantidade bloqueada não pode exceder a capacidade total do setor.',
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_sectors (
        id, event_id, session_id, code, name, area_type, capacity, blocked_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        eventId,
        parsed.data.sessionId,
        parsed.data.code.toUpperCase(),
        parsed.data.name,
        parsed.data.areaType,
        parsed.data.capacity,
        parsed.data.blockedQuantity,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.sector.created',
      resourceType: 'EventSector',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        sessionId: parsed.data.sessionId,
        code: parsed.data.code.toUpperCase(),
        capacity: parsed.data.capacity,
        blockedQuantity: parsed.data.blockedQuantity,
      },
    });

    return {
      id,
      eventId,
      sessionId: parsed.data.sessionId,
      code: parsed.data.code.toUpperCase(),
      name: parsed.data.name,
      areaType: parsed.data.areaType,
      capacity: parsed.data.capacity,
      blockedQuantity: parsed.data.blockedQuantity,
    };
  }

  async addEventPriceLot(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventPriceLotDto> {
    const parsed = CreateEventPriceLotRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_PRICE_LOT_PAYLOAD',
        message: 'Dados da modalidade/lote de preço inválidos.',
        details: parsed.error.issues,
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_price_lots (
        id, event_id, session_id, sector_id, modality_name, category_type,
        lot_number, nominal_price_cents, max_quantity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')`,
      [
        id,
        eventId,
        parsed.data.sessionId,
        parsed.data.sectorId,
        parsed.data.modalityName,
        parsed.data.categoryType,
        parsed.data.lotNumber,
        parsed.data.nominalPriceCents,
        parsed.data.maxQuantity,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.price_lot.created',
      resourceType: 'EventPriceLot',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        modalityName: parsed.data.modalityName,
        lotNumber: parsed.data.lotNumber,
        nominalPriceCents: parsed.data.nominalPriceCents,
      },
    });

    return {
      id,
      eventId,
      sessionId: parsed.data.sessionId,
      sectorId: parsed.data.sectorId,
      modalityName: parsed.data.modalityName,
      categoryType: parsed.data.categoryType,
      lotNumber: parsed.data.lotNumber,
      nominalPriceCents: parsed.data.nominalPriceCents,
      maxQuantity: parsed.data.maxQuantity,
      status: 'ACTIVE',
    };
  }

  async addEventSalesChannel(
    eventId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventSalesChannelDto> {
    const parsed = CreateEventSalesChannelRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_EVENT_SALES_CHANNEL_PAYLOAD',
        message: 'Dados do canal de venda inválidos.',
        details: parsed.error.issues,
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_sales_channels (
        id, event_id, channel_type, channel_code, channel_name,
        allowed_payment_methods, channel_service_fee_cents, is_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        eventId,
        parsed.data.channelType,
        parsed.data.channelCode.toUpperCase(),
        parsed.data.channelName,
        JSON.stringify(parsed.data.allowedPaymentMethods),
        parsed.data.channelServiceFeeCents,
        parsed.data.isEnabled,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.channel.configured',
      resourceType: 'EventSalesChannel',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        channelType: parsed.data.channelType,
        channelCode: parsed.data.channelCode.toUpperCase(),
        isEnabled: parsed.data.isEnabled,
      },
    });

    return {
      id,
      eventId,
      channelType: parsed.data.channelType,
      channelCode: parsed.data.channelCode.toUpperCase(),
      channelName: parsed.data.channelName,
      allowedPaymentMethods: parsed.data.allowedPaymentMethods,
      channelServiceFeeCents: parsed.data.channelServiceFeeCents,
      isEnabled: parsed.data.isEnabled,
    };
  }

  async submitEventForReview(
    eventId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventBuilderFullViewDto> {
    const eventRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM events WHERE id = $1`,
      [eventId]
    );
    if (eventRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado.' });
    }
    const previousStatus = eventRes.rows[0].status;

    await this.db.query(
      `UPDATE events SET status = 'ENVIADO_PARA_ANALISE', updated_at = NOW() WHERE id = $1`,
      [eventId]
    );

    await this.db.query(
      `INSERT INTO outbox_events (
        id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, event_id, payload
      ) VALUES ($1, 'EventSubmitted', 1, 'Event', $2, $3, $4, $5)`,
      [
        randomUUID(),
        eventId,
        correlationId,
        eventId,
        JSON.stringify({ eventId, submittedBy: actor.userId }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.submitted',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: previousStatus },
      afterState: { status: 'ENVIADO_PARA_ANALISE' },
    });

    return this.getEventById(eventId, actor, correlationId);
  }

  async approveEvent(
    eventId: string,
    notes: string | undefined,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventBuilderFullViewDto> {
    const eventRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM events WHERE id = $1`,
      [eventId]
    );
    if (eventRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado.' });
    }
    const previousStatus = eventRes.rows[0].status;
    const readiness = await this.evaluateEventReadiness(eventId);

    if (!readiness.hasApprovedDiskFee) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'event.approval.denied_missing_commercial_fee',
        resourceType: 'Event',
        resourceId: eventId,
        eventId,
        outcome: 'DENIED',
        justification: 'Tentativa de aprovar evento sem Taxa Disk comercial aprovada.',
        correlationId,
      });

      throw new BadRequestException({
        code: 'EVENT_FEE_APPROVAL_REQUIRED',
        message: 'O evento exige aprovação comercial da Taxa Disk antes da aprovação final e publicação.',
        details: readiness.pendingReasonsPtBr,
      });
    }

    if (!readiness.isReadyToApproveAndPublish) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'event.approval.denied_incomplete_structure',
        resourceType: 'Event',
        resourceId: eventId,
        eventId,
        outcome: 'DENIED',
        justification: readiness.pendingReasonsPtBr.join(' | '),
        correlationId,
      });

      throw new BadRequestException({
        code: 'EVENT_PREREQUISITES_INCOMPLETE',
        message: 'O evento possui pré-requisitos pendentes e não pode ser aprovado.',
        details: readiness.pendingReasonsPtBr,
      });
    }

    await this.db.query(`UPDATE events SET status = 'APROVADO', updated_at = NOW() WHERE id = $1`, [eventId]);

    await this.db.query(
      `INSERT INTO event_approvals (id, event_id, stage, decision, decided_by, notes)
       VALUES ($1, $2, 'OPERACIONAL', 'APPROVED', $3, $4)
       ON CONFLICT (event_id, stage)
       DO UPDATE SET decision = EXCLUDED.decision, decided_by = EXCLUDED.decided_by, notes = EXCLUDED.notes, decided_at = NOW()`,
      [randomUUID(), eventId, actor.userId, notes ?? 'Estrutura operacional e comercial conferidas e aprovadas.']
    );

    await this.db.query(
      `INSERT INTO outbox_events (
        id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, event_id, payload
      ) VALUES ($1, 'EventApproved', 1, 'Event', $2, $3, $4, $5)`,
      [
        randomUUID(),
        eventId,
        correlationId,
        eventId,
        JSON.stringify({ eventId, approvedBy: actor.userId }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.approved',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: previousStatus },
      afterState: { status: 'APROVADO' },
    });

    return this.getEventById(eventId, actor, correlationId);
  }

  async publishEvent(
    eventId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<EventBuilderFullViewDto> {
    const eventRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM events WHERE id = $1`,
      [eventId]
    );
    if (eventRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado.' });
    }
    const previousStatus = eventRes.rows[0].status;
    const readiness = await this.evaluateEventReadiness(eventId);

    if (!readiness.hasApprovedDiskFee) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'event.publication.denied_missing_commercial_fee',
        resourceType: 'Event',
        resourceId: eventId,
        eventId,
        outcome: 'DENIED',
        justification: 'Publicação rejeitada: evento não possui Taxa Disk aprovada pelo Comercial.',
        correlationId,
      });

      throw new BadRequestException({
        code: 'EVENT_FEE_APPROVAL_REQUIRED',
        message: 'O evento exige aprovação comercial antes da publicação.',
        details: readiness.pendingReasonsPtBr,
      });
    }

    if (!readiness.isReadyToApproveAndPublish || previousStatus !== 'APROVADO') {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'event.publication.denied_unapproved_state',
        resourceType: 'Event',
        resourceId: eventId,
        eventId,
        outcome: 'DENIED',
        justification: `Publicação rejeitada no estado '${previousStatus}'.`,
        correlationId,
      });

      throw new BadRequestException({
        code: 'EVENT_NOT_APPROVED_FOR_PUBLICATION',
        message: 'O evento precisa estar no estado APROVADO e com todas as pré-condições atendidas antes de ser publicado.',
        details: readiness.pendingReasonsPtBr,
      });
    }

    await this.db.query(`UPDATE events SET status = 'PUBLICADO', updated_at = NOW() WHERE id = $1`, [eventId]);
    await this.db.query(`UPDATE event_sessions SET status = 'ON_SALE' WHERE event_id = $1`, [eventId]);

    await this.db.query(
      `INSERT INTO outbox_events (
        id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, event_id, payload
      ) VALUES ($1, 'EventPublished', 1, 'Event', $2, $3, $4, $5)`,
      [
        randomUUID(),
        eventId,
        correlationId,
        eventId,
        JSON.stringify({
          eventId,
          publishedBy: actor.userId,
          externalSiteSyncMode: 'CONTROLLED_SANDBOX_OUTBOX',
        }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'event.published',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: previousStatus },
      afterState: { status: 'PUBLICADO', externalSiteSyncMode: 'CONTROLLED_SANDBOX_OUTBOX' },
    });

    return this.getEventById(eventId, actor, correlationId);
  }
}
