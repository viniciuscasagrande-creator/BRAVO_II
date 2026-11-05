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
  assertCanApprove,
  assertCanEditEvent,
  assertCanRequestPublication,
  assertFeeBelongsToEvent,
  assertFeeCanBeApproved,
  assertProspectiveFeeChange,
  calculateFeeCents,
  DomainError,
  normalizeCnpj,
  publicationCommand,
  publicEventProjection,
  readinessIssues,
  REQUIRED_APPROVALS,
  validateEventDraft,
  validateFee,
  validateLot,
  validateProducer,
  validateSession,
  type ApprovalRecord,
  type ApprovalStep,
  type Channel,
  type EventDraftInput,
  type EventStatus,
  type FeeInput,
  type LotInput,
  type ProducerInput,
  type Role,
  type SessionInput,
} from '@bravo-ii/domain-p06';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';

@Injectable()
export class Pacote06Service {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private mapActorToP06Role(actor: AuthenticatedActorDto, stepHint?: ApprovalStep): Role {
    if (actor.roles.includes('PRODUTOR_PDT') && actor.roles.length === 1) {
      return 'PRODUTOR';
    }
    if (actor.roles.includes('ADMIN_BRAVO')) {
      return 'ADMIN';
    }
    if (stepHint === 'CADASTRAL' && (actor.roles.includes('COMERCIAL_DISK') || actor.roles.includes('OPERACAO_EVENTOS'))) {
      return 'CADASTRO';
    }
    if (stepHint === 'PUBLICACAO' && actor.roles.includes('OPERACAO_EVENTOS')) {
      return 'PUBLICACAO';
    }
    if (actor.roles.includes('COMERCIAL_DISK')) {
      return 'COMERCIAL';
    }
    if (actor.roles.includes('FINANCEIRO_DISK')) {
      return 'FINANCEIRO';
    }
    if (actor.roles.includes('OPERACAO_EVENTOS')) {
      return 'OPERACOES';
    }
    return 'PRODUTOR';
  }

  private assertNotProducerOnly(actor: AuthenticatedActorDto, reasonPtBr: string): void {
    if (actor.roles.includes('PRODUTOR_PDT') && !actor.roles.some((r) => r !== 'PRODUTOR_PDT')) {
      throw new ForbiddenException({
        code: 'ACESSO_NEGADO_PDT',
        message: reasonPtBr,
      });
    }
  }

  // ==========================================================================
  // 1. CENTRAL DE PRODUTORES PJ (CNPJ numérico + Alfanumérico 2026 + Maker-Checker)
  // ==========================================================================

  async listProducers(actor: AuthenticatedActorDto, query?: { q?: string; status?: string }) {
    const isPdtOnly = actor.roles.includes('PRODUTOR_PDT') && actor.roles.length === 1;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (isPdtOnly) {
      if (actor.producerScopeIds.length === 0) {
        return [];
      }
      params.push(actor.producerScopeIds);
      conditions.push(`p.id = ANY($${params.length}::uuid[])`);
    }

    if (query?.status) {
      params.push(query.status);
      conditions.push(`(p.p06_status = $${params.length} OR p.verification_status = $${params.length})`);
    }

    if (query?.q?.trim()) {
      params.push(`%${query.q.trim()}%`);
      const idx = params.length;
      conditions.push(`(p.legal_name ILIKE $${idx} OR p.trade_name ILIKE $${idx} OR p.cnpj ILIKE $${idx})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.db.query<{
      id: string;
      cnpj: string;
      legal_name: string;
      trade_name: string;
      state_registration: string | null;
      municipal_registration: string | null;
      email: string | null;
      phone: string | null;
      address_json: Record<string, unknown>;
      legal_representative_json: Record<string, unknown>;
      p06_status: string;
      verification_status: string;
      created_by: string | null;
      verified_by: string | null;
      verified_at: string | null;
      created_at: string;
    }>(
      `SELECT id, cnpj, legal_name, trade_name, state_registration, municipal_registration,
              email, phone, address_json, legal_representative_json, p06_status, verification_status,
              created_by, verified_by, verified_at, created_at
       FROM producers p
       ${whereSql}
       ORDER BY p.created_at DESC`,
      params
    );

    const items = [];
    for (const row of res.rows) {
      const docsRes = await this.db.query<{
        id: string;
        document_type: string;
        document_reference: string;
        storage_key: string | null;
        checksum: string | null;
        p06_status: string;
        verification_status: string;
        verified_by: string | null;
        verified_at: string | null;
      }>(
        `SELECT id, document_type, document_reference, storage_key, checksum, p06_status, verification_status, verified_by, verified_at
         FROM producer_documents WHERE producer_id = $1 ORDER BY created_at ASC`,
        [row.id]
      );
      items.push({
        id: row.id,
        cnpj: row.cnpj,
        legalName: row.legal_name,
        tradeName: row.trade_name,
        stateRegistration: row.state_registration,
        municipalRegistration: row.municipal_registration,
        email: row.email ?? 'contato@produtora.com.br',
        phone: row.phone ?? '',
        address: row.address_json,
        addressJson: row.address_json,
        representative: row.legal_representative_json,
        legalRepresentativeJson: row.legal_representative_json,
        status: row.p06_status,
        verificationStatus: row.verification_status,
        createdBy: row.created_by,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at,
        createdAt: row.created_at,
        documents: docsRes.rows.map((d) => ({
          id: d.id,
          kind: d.document_type,
          documentType: d.document_type,
          storageKey: d.storage_key ?? d.document_reference,
          checksum: d.checksum ?? '',
          status: d.p06_status,
          verifiedBy: d.verified_by,
          verifiedAt: d.verified_at,
        })),
      });
    }
    return items;
  }

  async getProducer(actor: AuthenticatedActorDto, id: string) {
    const isPdtOnly = actor.roles.includes('PRODUTOR_PDT') && actor.roles.length === 1;
    if (isPdtOnly && !actor.producerScopeIds.includes(id)) {
      throw new ForbiddenException({
        code: 'PRODUCER_OUT_OF_SCOPE',
        message: 'Produtor fora do escopo autorizado.',
      });
    }

    const res = await this.db.query<{
      id: string;
      cnpj: string;
      legal_name: string;
      trade_name: string;
      state_registration: string | null;
      municipal_registration: string | null;
      email: string | null;
      phone: string | null;
      address_json: Record<string, unknown>;
      legal_representative_json: Record<string, unknown>;
      p06_status: string;
      verification_status: string;
      created_by: string | null;
      verified_by: string | null;
      verified_at: string | null;
      created_at: string;
    }>(
      `SELECT id, cnpj, legal_name, trade_name, state_registration, municipal_registration,
              email, phone, address_json, legal_representative_json, p06_status, verification_status,
              created_by, verified_by, verified_at, created_at
       FROM producers WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'PRODUTOR_NAO_ENCONTRADO', message: 'Produtor não encontrado.' });
    }
    const row = res.rows[0];
    const docsRes = await this.db.query<{
      id: string;
      document_type: string;
      document_reference: string;
      storage_key: string | null;
      checksum: string | null;
      p06_status: string;
      verified_by: string | null;
      verified_at: string | null;
    }>(
      `SELECT id, document_type, document_reference, storage_key, checksum, p06_status, verified_by, verified_at
       FROM producer_documents WHERE producer_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    const eventsRes = await this.db.query<{
      event_id: string;
      relationship_role: string;
      title: string;
      status: string;
      starts_at: string;
    }>(
      `SELECT ep.event_id, ep.relationship_role, e.title, e.status, e.starts_at
       FROM event_producers ep
       JOIN events e ON e.id = ep.event_id
       WHERE ep.producer_id = $1
       ORDER BY e.starts_at DESC`,
      [id]
    );

    const mappedEvents = eventsRes.rows.map((ev) => ({
      eventId: ev.event_id,
      role: ev.relationship_role === 'PRIMARY' ? 'PRINCIPAL' : 'SECUNDARIO',
      event: {
        id: ev.event_id,
        name: ev.title,
        status: ev.status,
        startAt: ev.starts_at,
      },
    }));

    return {
      id: row.id,
      cnpj: row.cnpj,
      legalName: row.legal_name,
      tradeName: row.trade_name,
      stateRegistration: row.state_registration,
      municipalRegistration: row.municipal_registration,
      email: row.email ?? 'contato@produtora.com.br',
      phone: row.phone ?? '',
      address: row.address_json,
      addressJson: row.address_json,
      representative: row.legal_representative_json,
      legalRepresentativeJson: row.legal_representative_json,
      status: row.p06_status,
      verificationStatus: row.verification_status,
      createdBy: row.created_by,
      verifiedBy: row.verified_by,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      documents: docsRes.rows.map((d) => ({
        id: d.id,
        kind: d.document_type,
        documentType: d.document_type,
        storageKey: d.storage_key ?? d.document_reference,
        checksum: d.checksum ?? '',
        status: d.p06_status,
        verifiedBy: d.verified_by,
        verifiedAt: d.verified_at,
      })),
      events: mappedEvents,
      eventLinks: mappedEvents,
    };
  }

  async createProducer(actor: AuthenticatedActorDto, input: ProducerInput, correlationId: string) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna autorizada pode cadastrar produtores PJ.');
    validateProducer(input);
    const cnpj = normalizeCnpj(input.cnpj);

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM producers WHERE regexp_replace(UPPER(cnpj), '[^0-9A-Z]', '', 'g') = $1`,
      [cnpj]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'CNPJ_JA_CADASTRADO',
        message: 'Já existe produtor cadastrado com este CNPJ.',
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO producers (
         id, cnpj, legal_name, trade_name, state_registration, municipal_registration,
         email, phone, address_json, legal_representative_json,
         verification_status, p06_status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, 'PENDING', 'EM_VALIDACAO', $11)`,
      [
        id,
        cnpj,
        input.legalName.trim(),
        (input.tradeName ?? input.legalName).trim(),
        input.stateRegistration ?? null,
        input.municipalRegistration ?? null,
        input.email.trim().toLowerCase(),
        input.phone.trim(),
        JSON.stringify(input.address),
        JSON.stringify(input.legalRepresentative),
        actor.userId,
      ]
    );

    // Registra representante legal também em producer_contacts para manter sincronia com Pacote 02
    await this.db.query(
      `INSERT INTO producer_contacts (id, producer_id, full_name, email, phone, role_type, is_primary)
       VALUES ($1, $2, $3, $4, $5, 'LEGAL_REPRESENTATIVE', TRUE)`,
      [
        randomUUID(),
        id,
        input.legalRepresentative.name.trim(),
        input.legalRepresentative.email.trim().toLowerCase(),
        input.phone.trim(),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'PRODUCER_CREATED',
      resourceType: 'Producer',
      resourceId: id,
      producerId: id,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id, cnpj, legalName: input.legalName, status: 'EM_VALIDACAO' },
    });

    return this.getProducer(actor, id);
  }

  async attachProducerDocument(
    actor: AuthenticatedActorDto,
    producerId: string,
    body: { kind?: string; documentType?: string; storageKey: string; checksum: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode anexar documentos de validação PJ.');
    if (!body.storageKey?.startsWith('secure://') || (body.checksum ?? '').trim().length < 16) {
      throw new BadRequestException({
        code: 'DOCUMENTO_ARMAZENAMENTO_INVALIDO',
        message: 'Documento requer referência de armazenamento privado (secure://) e checksum íntegro (mín. 16 caracteres).',
      });
    }

    const rawKind = body.kind ?? body.documentType ?? 'CONTRATO_SOCIAL';
    const allowedTypes = ['CONTRATO_SOCIAL', 'CARTAO_CNPJ', 'DOCUMENTO_REPRESENTANTE', 'COMPROVANTE_BANCARIO'];
    const docType = allowedTypes.includes(rawKind) ? rawKind : 'CONTRATO_SOCIAL';
    const docId = randomUUID();

    await this.db.query(
      `INSERT INTO producer_documents (
         id, producer_id, document_type, document_reference, storage_key, checksum,
         verification_status, p06_status
       ) VALUES ($1, $2, $3, $4, $4, $5, 'PENDING', 'PENDENTE')`,
      [docId, producerId, docType, body.storageKey, body.checksum.trim()]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'PRODUCER_DOCUMENT_ATTACHED',
      resourceType: 'ProducerDocument',
      resourceId: docId,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id: docId, kind: docType, storageKey: body.storageKey },
    });

    return {
      id: docId,
      producerId,
      kind: docType,
      storageKey: body.storageKey,
      checksum: body.checksum.trim(),
      status: 'PENDENTE',
    };
  }

  async verifyProducerDocument(
    actor: AuthenticatedActorDto,
    producerId: string,
    docId: string,
    status: 'VALIDADO' | 'REJEITADO',
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Produtor não pode validar os próprios documentos.');
    const verificationStatus = status === 'VALIDADO' ? 'VERIFIED' : 'REJECTED';

    const res = await this.db.query(
      `UPDATE producer_documents
       SET p06_status = $1, verification_status = $2, verified_by = $3, verified_at = NOW()
       WHERE id = $4 AND producer_id = $5
       RETURNING id`,
      [status, verificationStatus, actor.userId, docId, producerId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'DOCUMENTO_NAO_ENCONTRADO', message: 'Documento não encontrado.' });
    }

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: `PRODUCER_DOCUMENT_${status}`,
      resourceType: 'ProducerDocument',
      resourceId: docId,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { docId, status },
    });

    return { id: docId, producerId, status, verifiedBy: actor.userId };
  }

  async verifyProducer(
    actor: AuthenticatedActorDto,
    producerId: string,
    decision: 'APROVADO' | 'SUSPENSO',
    reason: string | undefined,
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Produtor não pode aprovar o próprio cadastro PJ.');
    const prodRes = await this.db.query<{
      id: string;
      created_by: string | null;
      p06_status: string;
    }>(`SELECT id, created_by, p06_status FROM producers WHERE id = $1`, [producerId]);

    if (prodRes.rows.length === 0) {
      throw new NotFoundException({ code: 'PRODUTOR_NAO_ENCONTRADO', message: 'Produtor não encontrado.' });
    }
    const producer = prodRes.rows[0];
    if (producer.created_by && producer.created_by === actor.userId) {
      throw new ForbiddenException({
        code: 'AUTOAPROVACAO_PRODUTOR',
        message: 'Quem cadastrou o produtor não pode aprová-lo (segregação maker-checker).',
      });
    }

    const docsRes = await this.db.query<{ id: string }>(
      `SELECT id FROM producer_documents
       WHERE producer_id = $1 AND (p06_status = 'VALIDADO' OR verification_status = 'VERIFIED')`,
      [producerId]
    );
    if (decision === 'APROVADO' && docsRes.rows.length === 0) {
      throw new BadRequestException({
        code: 'DOCUMENTO_VALIDADO_OBRIGATORIO',
        message: 'Produtor exige ao menos um documento validado antes da aprovação cadastral.',
      });
    }

    const verificationStatus = decision === 'APROVADO' ? 'VERIFIED' : 'SUSPENDED';
    await this.db.query(
      `UPDATE producers
       SET p06_status = $1, verification_status = $2, verified_by = $3, verified_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [decision, verificationStatus, actor.userId, producerId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: `PRODUCER_${decision}`,
      resourceType: 'Producer',
      resourceId: producerId,
      producerId,
      outcome: 'SUCCESS',
      justification: reason ?? null,
      correlationId,
      beforeState: { status: producer.p06_status },
      afterState: { status: decision, verifiedBy: actor.userId },
    });

    return this.getProducer(actor, producerId);
  }

  // ==========================================================================
  // 2. COMERCIAL DISK — TAXA DISK POR EVENTO (Basis Points / Centavos + Maker-Checker)
  // ==========================================================================

  private assertFeeReadAccess(actor: AuthenticatedActorDto): void {
    this.assertNotProducerOnly(
      actor,
      'Acesso negado: a Taxa Disk contratual interna nunca é exposta ao Portal do Produtor (PDT).'
    );
    const allowed = actor.roles.some((r) =>
      ['ADMIN_BRAVO', 'COMERCIAL_DISK', 'FINANCEIRO_DISK', 'AUDITOR_INTERNO'].includes(r)
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'SEM_PERMISSAO_TAXA_INTERNA',
        message: 'Perfil sem permissão para consultar ou negociar a Taxa Disk interna.',
      });
    }
  }

  async listFeesForEvent(actor: AuthenticatedActorDto, eventId: string) {
    this.assertFeeReadAccess(actor);
    const res = await this.db.query<{
      id: string;
      event_id: string;
      agreement_version: number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percentage_rate: string | number | null;
      percent_basis_points: number | null;
      fixed_amount_cents: string | number | null;
      status: string;
      valid_from: string;
      negotiation_reference: string | null;
      approval_reference: string | null;
      proposed_by: string | null;
      approved_by: string | null;
      approved_at: string | null;
      created_at: string;
    }>(
      `SELECT id, event_id, agreement_version, calculation_type, percentage_rate, percent_basis_points,
              fixed_amount_cents, status, valid_from, negotiation_reference, approval_reference,
              proposed_by, approved_by, approved_at, created_at
       FROM event_fee_agreements
       WHERE event_id = $1
       ORDER BY agreement_version DESC`,
      [eventId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      version: r.agreement_version,
      type: r.calculation_type === 'PERCENTAGE' ? ('PERCENTUAL' as const) : ('FIXA' as const),
      percentBasisPoints:
        r.percent_basis_points ??
        (r.percentage_rate !== null ? Math.round(Number(r.percentage_rate) * 100) : null),
      fixedCents: r.fixed_amount_cents !== null ? Number(r.fixed_amount_cents) : null,
      status: r.status === 'APPROVED' ? 'APROVADA' : r.status === 'DRAFT' ? 'PROPOSTA' : r.status,
      effectiveFrom: r.valid_from,
      negotiationReference: r.negotiation_reference ?? r.approval_reference ?? 'Negociação Comercial',
      proposedBy: r.proposed_by,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      createdAt: r.created_at,
    }));
  }

  async proposeFee(actor: AuthenticatedActorDto, eventId: string, input: FeeInput, correlationId: string) {
    this.assertFeeReadAccess(actor);
    validateFee(input);

    const evRes = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM events WHERE id = $1`,
      [eventId]
    );
    if (evRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENTO_NAO_ENCONTRADO', message: 'Evento não encontrado.' });
    }
    const ev = evRes.rows[0];
    if (['PUBLICADO', 'APROVADO', 'EM_VENDA'].includes(ev.status)) {
      assertProspectiveFeeChange(input.effectiveFrom, new Date().toISOString());
    }

    const verRes = await this.db.query<{ max_ver: number | null }>(
      `SELECT MAX(agreement_version) AS max_ver FROM event_fee_agreements WHERE event_id = $1`,
      [eventId]
    );
    const version = (verRes.rows[0]?.max_ver ?? 0) + 1;
    const id = randomUUID();

    const calculationType = input.type === 'PERCENTUAL' ? 'PERCENTAGE' : 'FIXED';
    const percentageRate =
      input.type === 'PERCENTUAL' && input.percentBasisPoints !== undefined
        ? Number((input.percentBasisPoints / 100).toFixed(4))
        : null;
    const fixedCents = input.type === 'FIXA' ? (input.fixedCents ?? null) : null;

    await this.db.query(
      `INSERT INTO event_fee_agreements (
         id, event_id, agreement_version, calculation_type, percentage_rate, percent_basis_points,
         fixed_amount_cents, payer, visibility, status, valid_from, proposed_by,
         negotiation_reference, approval_reference
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CUSTOMER', 'INTERNAL_DISK', 'DRAFT', $8::timestamptz, $9, $10, $10)`,
      [
        id,
        eventId,
        version,
        calculationType,
        percentageRate,
        input.percentBasisPoints ?? null,
        fixedCents,
        new Date(input.effectiveFrom).toISOString(),
        actor.userId,
        input.negotiationReference.trim(),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_FEE_PROPOSED',
      resourceType: 'EventFeeAgreement',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        eventId,
        version,
        type: input.type,
        percentBasisPoints: input.percentBasisPoints ?? null,
        fixedCents,
        effectiveFrom: input.effectiveFrom,
        negotiationReference: input.negotiationReference,
      },
    });

    return {
      id,
      eventId,
      version,
      type: input.type,
      percentBasisPoints: input.percentBasisPoints ?? null,
      fixedCents,
      status: 'PROPOSTA',
      effectiveFrom: new Date(input.effectiveFrom).toISOString(),
      negotiationReference: input.negotiationReference.trim(),
      proposedBy: actor.userId,
    };
  }

  async approveFee(actor: AuthenticatedActorDto, eventId: string, feeId: string, correlationId: string) {
    this.assertFeeReadAccess(actor);

    const feeRes = await this.db.query<{
      id: string;
      event_id: string;
      agreement_version: number;
      calculation_type: 'PERCENTAGE' | 'FIXED';
      percent_basis_points: number | null;
      fixed_amount_cents: string | number | null;
      proposed_by: string | null;
      status: string;
      valid_from: string;
      negotiation_reference: string | null;
    }>(
      `SELECT id, event_id, agreement_version, calculation_type, percent_basis_points,
              fixed_amount_cents, proposed_by, status, valid_from, negotiation_reference
       FROM event_fee_agreements WHERE id = $1`,
      [feeId]
    );
    if (feeRes.rows.length === 0) {
      throw new NotFoundException({ code: 'TAXA_NAO_ENCONTRADA', message: 'Taxa Disk não encontrada.' });
    }
    const fee = feeRes.rows[0];
    assertFeeBelongsToEvent(fee.event_id, eventId);
    assertFeeCanBeApproved(
      fee.proposed_by ?? '',
      actor.userId,
      this.mapActorToP06Role(actor)
    );

    await this.db.query(
      `UPDATE event_fee_agreements
       SET status = 'SUPERSEDED'
       WHERE event_id = $1 AND status = 'APPROVED' AND id <> $2`,
      [eventId, feeId]
    );

    await this.db.query(
      `UPDATE event_fee_agreements
       SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE id = $2`,
      [actor.userId, feeId]
    );

    // Registra evento no outbox transacional (commercial.event_fee_approved.v1)
    await this.db.query(
      `INSERT INTO outbox_events (
         id, event_name, schema_version, aggregate_type, aggregate_id,
         correlation_id, event_id, payload, status
       ) VALUES ($1, 'commercial.event_fee_approved.v1', 1, 'EventFeeAgreement', $2, $3, $4, $5::jsonb, 'PENDING')`,
      [
        randomUUID(),
        feeId,
        correlationId,
        eventId,
        JSON.stringify({
          feeId,
          eventId,
          version: fee.agreement_version,
          approvedBy: actor.userId,
        }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_FEE_APPROVED',
      resourceType: 'EventFeeAgreement',
      resourceId: feeId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: fee.status },
      afterState: { status: 'APPROVED', approvedBy: actor.userId },
    });

    return {
      id: fee.id,
      eventId: fee.event_id,
      version: fee.agreement_version,
      type: fee.calculation_type === 'PERCENTAGE' ? ('PERCENTUAL' as const) : ('FIXA' as const),
      percentBasisPoints: fee.percent_basis_points,
      fixedCents: fee.fixed_amount_cents !== null ? Number(fee.fixed_amount_cents) : null,
      status: 'APROVADA',
      approvedBy: actor.userId,
    };
  }

  simulateFee(actor: AuthenticatedActorDto, faceValueCents: number, fee: FeeInput) {
    this.assertFeeReadAccess(actor);
    return {
      faceValueCents,
      feeCents: calculateFeeCents(faceValueCents, fee),
    };
  }

  // ==========================================================================
  // 3. GESTÃO DE EVENTOS — EVENT BUILDER (10 ETAPAS + 4 APROVAÇÕES + PUBLICAÇÃO)
  // ==========================================================================

  async listEvents(actor: AuthenticatedActorDto) {
    const isPdtOnly = actor.roles.includes('PRODUTOR_PDT') && actor.roles.length === 1;
    const canSeeFee = actor.roles.some((r) =>
      ['ADMIN_BRAVO', 'COMERCIAL_DISK', 'FINANCEIRO_DISK', 'AUDITOR_INTERNO'].includes(r)
    );

    const params: unknown[] = [];
    let whereSql = '';
    if (isPdtOnly) {
      if (actor.eventScopeIds.length === 0 && actor.producerScopeIds.length === 0) {
        return [];
      }
      params.push(actor.eventScopeIds, actor.producerScopeIds);
      whereSql = `WHERE (e.id = ANY($1::uuid[]) OR EXISTS (
        SELECT 1 FROM event_producers ep WHERE ep.event_id = e.id AND ep.producer_id = ANY($2::uuid[])
      ))`;
    }

    const res = await this.db.query<{
      id: string;
      code: string;
      title: string;
      description: string;
      venue_name: string;
      city: string;
      state_uf: string;
      starts_at: string;
      ends_at: string | null;
      sales_starts_at: string | null;
      age_rating: string;
      policy_url: string;
      status: string;
      revision: number;
    }>(
      `SELECT e.id, e.code, e.title, e.description, e.venue_name, e.city, e.state_uf,
              e.starts_at, e.ends_at, e.sales_starts_at, e.age_rating, e.policy_url, e.status, e.revision
       FROM events e
       ${whereSql}
       ORDER BY e.created_at DESC`,
      params
    );

    const items = [];
    for (const row of res.rows) {
      items.push(await this.getEvent(actor, row.id, canSeeFee));
    }
    return items;
  }

  async getEvent(actor: AuthenticatedActorDto, eventId: string, includeFeeOverride?: boolean) {
    const isPdtOnly = actor.roles.includes('PRODUTOR_PDT') && actor.roles.length === 1;
    const canSeeFee =
      includeFeeOverride ??
      (!isPdtOnly &&
        actor.roles.some((r) =>
          ['ADMIN_BRAVO', 'COMERCIAL_DISK', 'FINANCEIRO_DISK', 'AUDITOR_INTERNO'].includes(r)
        ));

    const evRes = await this.db.query<{
      id: string;
      code: string;
      title: string;
      description: string;
      venue_name: string;
      city: string;
      state_uf: string;
      starts_at: string;
      ends_at: string | null;
      sales_starts_at: string | null;
      age_rating: string;
      policy_url: string;
      status: string;
      revision: number;
      submitted_by: string | null;
      submitted_at: string | null;
      approved_at: string | null;
    }>(
      `SELECT id, code, title, description, venue_name, city, state_uf,
              starts_at, ends_at, sales_starts_at, age_rating, policy_url,
              status, revision, submitted_by, submitted_at, approved_at
       FROM events WHERE id = $1`,
      [eventId]
    );
    if (evRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENTO_NAO_ENCONTRADO', message: 'Evento não encontrado.' });
    }
    const ev = evRes.rows[0];

    const prodLinksRes = await this.db.query<{
      producer_id: string;
      relationship_role: string;
      legal_name: string;
      trade_name: string;
      cnpj: string;
      p06_status: string;
      verification_status: string;
    }>(
      `SELECT ep.producer_id, ep.relationship_role, p.legal_name, p.trade_name, p.cnpj, p.p06_status, p.verification_status
       FROM event_producers ep
       JOIN producers p ON p.id = ep.producer_id
       WHERE ep.event_id = $1`,
      [eventId]
    );

    if (isPdtOnly) {
      const allowedByEvent = actor.eventScopeIds.includes(eventId);
      const allowedByProducer = prodLinksRes.rows.some((p) => actor.producerScopeIds.includes(p.producer_id));
      if (!allowedByEvent && !allowedByProducer) {
        throw new ForbiddenException({
          code: 'EVENT_OUT_OF_SCOPE',
          message: 'Evento fora do escopo do produtor.',
        });
      }
    }

    const sessionsRes = await this.db.query<{
      id: string;
      code: string;
      title: string;
      starts_at: string;
      ends_at: string;
      total_capacity: number;
      status: string;
    }>(
      `SELECT id, code, title, starts_at, ends_at, total_capacity, status
       FROM event_sessions WHERE event_id = $1 ORDER BY starts_at ASC`,
      [eventId]
    );

    const areasRes = await this.db.query<{
      id: string;
      session_id: string;
      code: string;
      name: string;
      area_type: string;
      capacity: number;
    }>(
      `SELECT id, session_id, code, name, area_type, capacity
       FROM event_sectors WHERE event_id = $1 ORDER BY created_at ASC`,
      [eventId]
    );

    const seatsByArea = new Map<string, Array<{ id: string; rowLabel: string; seatNumber: string }>>();
    for (const area of areasRes.rows) {
      const seatsRes = await this.db.query<{ id: string; row_label: string; seat_number: string }>(
        `SELECT id, row_label, seat_number FROM event_seats WHERE area_id = $1 ORDER BY row_label, seat_number`,
        [area.id]
      );
      seatsByArea.set(
        area.id,
        seatsRes.rows.map((s) => ({ id: s.id, rowLabel: s.row_label, seatNumber: s.seat_number }))
      );
    }

    const categoriesRes = await this.db.query<{ id: string; name: string; requires_proof: boolean }>(
      `SELECT id, name, requires_proof FROM event_ticket_categories WHERE event_id = $1 ORDER BY created_at ASC`,
      [eventId]
    );

    const lotsRes = await this.db.query<{
      id: string;
      session_id: string;
      sector_id: string;
      modality_name: string;
      category_type: string;
      lot_number: number;
      nominal_price_cents: string | number;
      max_quantity: number;
      starts_at: string | null;
      ends_at: string | null;
      status: string;
    }>(
      `SELECT id, session_id, sector_id, modality_name, category_type, lot_number,
              nominal_price_cents, max_quantity, starts_at, ends_at, status
       FROM event_price_lots WHERE event_id = $1 ORDER BY lot_number ASC, created_at ASC`,
      [eventId]
    );

    const channelsRes = await this.db.query<{
      id: string;
      channel_type: string;
      channel_code: string;
      is_enabled: boolean;
    }>(
      `SELECT id, channel_type, channel_code, is_enabled FROM event_sales_channels WHERE event_id = $1`,
      [eventId]
    );

    const approvalsRes = await this.db.query<{
      id: string;
      stage: ApprovalStep;
      decision: string;
      decided_by: string;
      notes: string | null;
      decided_at: string;
    }>(
      `SELECT id, stage, decision, decided_by, notes, decided_at
       FROM event_approvals WHERE event_id = $1 ORDER BY decided_at ASC`,
      [eventId]
    );

    const publicationsRes = await this.db.query<{
      id: string;
      destination: string;
      status: string;
      requested_by: string;
      requested_at: string;
      published_at: string | null;
      external_publication_id: string | null;
      idempotency_key: string;
    }>(
      `SELECT id, destination, status, requested_by, requested_at, published_at, external_publication_id, idempotency_key
       FROM event_publications WHERE event_id = $1 ORDER BY requested_at DESC`,
      [eventId]
    );

    const mediaRes = await this.db.query<{
      id: string;
      kind: string;
      storage_key: string;
      alt_text: string;
    }>(`SELECT id, kind, storage_key, alt_text FROM event_media WHERE event_id = $1`, [eventId]);

    const changeCasesRes = await this.db.query<{
      id: string;
      change_type: string;
      reason: string;
      status: string;
      requested_by: string;
      created_at: string;
    }>(`SELECT id, change_type, reason, status, requested_by, created_at FROM event_change_cases WHERE event_id = $1`, [
      eventId,
    ]);

    const result: Record<string, unknown> = {
      id: ev.id,
      code: ev.code,
      name: ev.title,
      title: ev.title,
      description: ev.description,
      venueName: ev.venue_name,
      venueCity: ev.city,
      venueState: ev.state_uf,
      startAt: ev.starts_at,
      startsAt: ev.starts_at,
      endAt: ev.ends_at ?? new Date(new Date(ev.starts_at).getTime() + 4 * 3600 * 1000).toISOString(),
      endsAt: ev.ends_at ?? new Date(new Date(ev.starts_at).getTime() + 4 * 3600 * 1000).toISOString(),
      salesStartAt: ev.sales_starts_at ?? ev.starts_at,
      ageRating: ev.age_rating,
      policyUrl: ev.policy_url,
      status: ev.status,
      revision: ev.revision,
      submittedBy: ev.submitted_by,
      submittedAt: ev.submitted_at,
      approvedAt: ev.approved_at,
      producers: prodLinksRes.rows.map((p) => ({
        producerId: p.producer_id,
        role: p.relationship_role === 'PRIMARY' ? 'PRINCIPAL' : 'SECUNDARIO',
        producer: {
          id: p.producer_id,
          legalName: p.legal_name,
          tradeName: p.trade_name,
          status: p.p06_status === 'APROVADO' || p.verification_status === 'VERIFIED' ? 'APROVADO' : p.p06_status,
        },
      })),
      sessions: sessionsRes.rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.title,
        title: s.title,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        capacity: s.total_capacity,
        status: s.status,
      })),
      areas: areasRes.rows.map((a) => ({
        id: a.id,
        sessionId: a.session_id,
        name: a.name,
        label: a.name,
        capacity: a.capacity,
        isNumbered: a.area_type === 'SEATED',
        seats: seatsByArea.get(a.id) ?? [],
      })),
      categories: categoriesRes.rows.map((c) => ({
        id: c.id,
        name: c.name,
        requiresProof: c.requires_proof,
      })),
      ticketCategories: categoriesRes.rows.map((c) => ({
        id: c.id,
        name: c.name,
        requiresProof: c.requires_proof,
      })),
      lots: lotsRes.rows.map((l) => ({
        id: l.id,
        sessionId: l.session_id,
        areaId: l.sector_id,
        name: l.modality_name,
        faceValueCents: Number(l.nominal_price_cents),
        capacity: l.max_quantity,
        startsAt: l.starts_at ?? ev.sales_starts_at ?? ev.starts_at,
        endsAt: l.ends_at ?? ev.ends_at ?? ev.starts_at,
        status: l.status,
      })),
      channels: channelsRes.rows.map((ch) => ({
        id: ch.id,
        channel: ch.channel_type === 'SITE' ? 'ONLINE' : ch.channel_type,
        enabled: ch.is_enabled,
      })),
      approvals: approvalsRes.rows.map((ap) => ({
        id: ap.id,
        step: ap.stage,
        decision: ap.decision === 'APPROVED' || ap.decision === 'APROVADO' ? 'APROVADO' : 'REPROVADO',
        actorId: ap.decided_by,
        reason: ap.notes,
        decidedAt: ap.decided_at,
      })),
      publications: publicationsRes.rows.map((pub) => ({
        id: pub.id,
        destination: pub.destination,
        status: pub.status,
        requestedBy: pub.requested_by,
        requestedAt: pub.requested_at,
        publishedAt: pub.published_at,
        externalPublicationId: pub.external_publication_id,
        idempotencyKey: pub.idempotency_key,
      })),
      media: mediaRes.rows.map((m) => ({
        id: m.id,
        kind: m.kind,
        storageKey: m.storage_key,
        altText: m.alt_text,
      })),
      changeCases: changeCasesRes.rows.map((c) => ({
        id: c.id,
        changeType: c.change_type,
        reason: c.reason,
        status: c.status,
        requestedBy: c.requested_by,
        createdAt: c.created_at,
      })),
    };

    if (canSeeFee) {
      result.fees = await this.listFeesForEvent(actor, eventId);
    }

    return result;
  }

  async createDraft(
    actor: AuthenticatedActorDto,
    body: EventDraftInput & { primaryProducerId: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode criar rascunho de evento no Event Builder.');
    validateEventDraft(body);

    const prodCheck = await this.db.query<{ id: string }>(
      `SELECT id FROM producers WHERE id = $1`,
      [body.primaryProducerId]
    );
    if (prodCheck.rows.length === 0) {
      throw new NotFoundException({
        code: 'PRODUTOR_NAO_ENCONTRADO',
        message: 'Produtor principal informado não existe.',
      });
    }

    const eventId = randomUUID();
    const code = `EVT-P06-${Date.now().toString(36).toUpperCase()}`;

    await this.db.query(
      `INSERT INTO events (
         id, code, title, description, venue_name, city, state_uf,
         starts_at, ends_at, sales_starts_at, age_rating, policy_url, status, revision
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz, $11, $12, 'RASCUNHO', 1)`,
      [
        eventId,
        code,
        body.name.trim(),
        body.description.trim(),
        body.venueName.trim(),
        body.venueCity.trim(),
        body.venueState.trim().toUpperCase(),
        new Date(body.startAt).toISOString(),
        new Date(body.endAt).toISOString(),
        new Date(body.salesStartAt).toISOString(),
        body.ageRating.trim(),
        body.policyUrl.trim(),
      ]
    );

    await this.db.query(
      `INSERT INTO event_producers (event_id, producer_id, relationship_role, revenue_share_percentage)
       VALUES ($1, $2, 'PRIMARY', 100.00)`,
      [eventId, body.primaryProducerId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_DRAFT_CREATED',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      producerId: body.primaryProducerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id: eventId, code, name: body.name, primaryProducerId: body.primaryProducerId },
    });

    return this.getEvent(actor, eventId);
  }

  private async ensureEditableEvent(eventId: string): Promise<{
    id: string;
    title: string;
    description: string;
    venue_name: string;
    city: string;
    state_uf: string;
    starts_at: string;
    ends_at: string;
    sales_starts_at: string;
    age_rating: string;
    policy_url: string;
    status: EventStatus;
    revision: number;
  }> {
    const res = await this.db.query<{
      id: string;
      title: string;
      description: string;
      venue_name: string;
      city: string;
      state_uf: string;
      starts_at: string;
      ends_at: string | null;
      sales_starts_at: string | null;
      age_rating: string;
      policy_url: string;
      status: EventStatus;
      revision: number;
    }>(
      `SELECT id, title, description, venue_name, city, state_uf, starts_at, ends_at, sales_starts_at,
              age_rating, policy_url, status, revision
       FROM events WHERE id = $1`,
      [eventId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENTO_NAO_ENCONTRADO', message: 'Evento não encontrado.' });
    }
    const row = res.rows[0];
    assertCanEditEvent(row.status);
    return {
      ...row,
      ends_at: row.ends_at ?? new Date(new Date(row.starts_at).getTime() + 4 * 3600 * 1000).toISOString(),
      sales_starts_at: row.sales_starts_at ?? row.starts_at,
    };
  }

  async addSecondaryProducer(
    actor: AuthenticatedActorDto,
    eventId: string,
    producerId: string,
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode vincular coprodutor ao evento.');
    await this.ensureEditableEvent(eventId);
    await this.db.query(
      `INSERT INTO event_producers (event_id, producer_id, relationship_role, revenue_share_percentage)
       VALUES ($1, $2, 'SECONDARY', 0.00)
       ON CONFLICT (event_id, producer_id) DO UPDATE SET relationship_role = 'SECONDARY'`,
      [eventId, producerId]
    );
    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_SECONDARY_PRODUCER_ADDED',
      resourceType: 'EventProducer',
      resourceId: `${eventId}:${producerId}`,
      eventId,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { eventId, producerId, role: 'SECUNDARIO' },
    });
    return { eventId, producerId, role: 'SECUNDARIO' };
  }

  async addSession(actor: AuthenticatedActorDto, eventId: string, session: SessionInput, correlationId: string) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode configurar sessões.');
    const ev = await this.ensureEditableEvent(eventId);
    validateSession(session, {
      name: ev.title,
      description: ev.description,
      venueName: ev.venue_name,
      venueCity: ev.city,
      venueState: ev.state_uf,
      startAt: new Date(ev.starts_at).toISOString(),
      endAt: new Date(ev.ends_at).toISOString(),
      salesStartAt: new Date(ev.sales_starts_at).toISOString(),
      ageRating: ev.age_rating,
      policyUrl: ev.policy_url,
    });

    const id = randomUUID();
    const code = `SES-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    await this.db.query(
      `INSERT INTO event_sessions (id, event_id, code, title, starts_at, ends_at, total_capacity, status)
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, 'SCHEDULED')`,
      [
        id,
        eventId,
        code,
        `Sessão ${new Date(session.startsAt).toISOString().slice(0, 16)}`,
        new Date(session.startsAt).toISOString(),
        new Date(session.endsAt).toISOString(),
        session.capacity,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_SESSION_ADDED',
      resourceType: 'EventSession',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id, eventId, ...session },
    });

    return {
      id,
      eventId,
      code,
      startsAt: new Date(session.startsAt).toISOString(),
      endsAt: new Date(session.endsAt).toISOString(),
      capacity: session.capacity,
    };
  }

  async addArea(
    actor: AuthenticatedActorDto,
    eventId: string,
    body: {
      sessionId?: string;
      name?: string;
      label?: string;
      capacity: number;
      isNumbered: boolean;
      seats?: Array<{ rowLabel: string; seatNumber: string }>;
    },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode configurar setores e assentos.');
    await this.ensureEditableEvent(eventId);
    const areaName = (body.name ?? body.label ?? '').trim();
    if (!areaName || !Number.isInteger(body.capacity) || body.capacity <= 0) {
      throw new DomainError('SETOR_INVALIDO', 'Setor requer nome e capacidade positiva.');
    }

    let sessionId = body.sessionId;
    if (!sessionId) {
      const sesRes = await this.db.query<{ id: string }>(
        `SELECT id FROM event_sessions WHERE event_id = $1 ORDER BY starts_at ASC LIMIT 1`,
        [eventId]
      );
      if (sesRes.rows.length === 0) {
        throw new DomainError('SESSAO_OBRIGATORIA', 'Cadastre ao menos uma sessão antes de criar setores.');
      }
      sessionId = sesRes.rows[0].id;
    }

    if (body.isNumbered && body.seats && body.seats.length > 0) {
      const seen = new Set<string>();
      for (const seat of body.seats) {
        const key = `${seat.rowLabel.trim()}:${seat.seatNumber.trim()}`;
        if (seen.has(key)) {
          throw new DomainError('ASSENTO_DUPLICADO', `Assento duplicado no mesmo setor: ${key}.`);
        }
        seen.add(key);
      }
    }

    const areaId = randomUUID();
    const code = `AREA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    await this.db.query(
      `INSERT INTO event_sectors (id, event_id, session_id, code, name, area_type, capacity, blocked_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [areaId, eventId, sessionId, code, areaName, body.isNumbered ? 'SEATED' : 'STANDING', body.capacity]
    );

    const createdSeats: Array<{ id: string; rowLabel: string; seatNumber: string }> = [];
    if (body.isNumbered && body.seats) {
      for (const seat of body.seats) {
        const seatId = randomUUID();
        await this.db.query(
          `INSERT INTO event_seats (id, area_id, row_label, seat_number) VALUES ($1, $2, $3, $4)`,
          [seatId, areaId, seat.rowLabel.trim(), seat.seatNumber.trim()]
        );
        createdSeats.push({ id: seatId, rowLabel: seat.rowLabel.trim(), seatNumber: seat.seatNumber.trim() });
      }
    }

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_AREA_ADDED',
      resourceType: 'EventArea',
      resourceId: areaId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { areaId, name: areaName, capacity: body.capacity, isNumbered: body.isNumbered, seatsCount: createdSeats.length },
    });

    return {
      id: areaId,
      eventId,
      sessionId,
      name: areaName,
      label: areaName,
      capacity: body.capacity,
      isNumbered: body.isNumbered,
      seats: createdSeats,
    };
  }

  async addCategory(
    actor: AuthenticatedActorDto,
    eventId: string,
    body: { name: string; requiresProof: boolean },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode cadastrar modalidades de ingresso.');
    await this.ensureEditableEvent(eventId);
    if (!body.name?.trim()) {
      throw new DomainError('MODALIDADE_INVALIDA', 'Modalidade de ingresso requer nome.');
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_ticket_categories (id, event_id, name, requires_proof)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, name) DO UPDATE SET requires_proof = EXCLUDED.requires_proof`,
      [id, eventId, body.name.trim(), Boolean(body.requiresProof)]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_CATEGORY_ADDED',
      resourceType: 'EventTicketCategory',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id, eventId, name: body.name.trim(), requiresProof: Boolean(body.requiresProof) },
    });

    return { id, eventId, name: body.name.trim(), requiresProof: Boolean(body.requiresProof) };
  }

  async addLot(
    actor: AuthenticatedActorDto,
    eventId: string,
    lot: LotInput & { sessionId?: string; areaId?: string; categoryId?: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode cadastrar lotes e preços.');
    await this.ensureEditableEvent(eventId);
    validateLot(lot);

    let sessionId = lot.sessionId;
    if (!sessionId) {
      const sesRes = await this.db.query<{ id: string }>(
        `SELECT id FROM event_sessions WHERE event_id = $1 ORDER BY starts_at ASC LIMIT 1`,
        [eventId]
      );
      if (sesRes.rows.length === 0) {
        throw new DomainError('SESSAO_OBRIGATORIA', 'Cadastre ao menos uma sessão antes de configurar lotes.');
      }
      sessionId = sesRes.rows[0].id;
    }

    // Valida soma das capacidades de lotes <= capacidade total das sessões
    const capRes = await this.db.query<{ total_session_cap: string | number }>(
      `SELECT COALESCE(SUM(total_capacity), 0) AS total_session_cap FROM event_sessions WHERE event_id = $1`,
      [eventId]
    );
    const existingLotsRes = await this.db.query<{ total_lot_cap: string | number; count_lots: string | number }>(
      `SELECT COALESCE(SUM(max_quantity), 0) AS total_lot_cap, COUNT(*) AS count_lots FROM event_price_lots WHERE event_id = $1`,
      [eventId]
    );
    const totalSessionCap = Number(capRes.rows[0]?.total_session_cap ?? 0);
    const currentLotCap = Number(existingLotsRes.rows[0]?.total_lot_cap ?? 0);

    if (totalSessionCap > 0 && currentLotCap + lot.capacity > totalSessionCap) {
      throw new DomainError(
        'LOTE_ACIMA_CAPACIDADE_SESSAO',
        `A soma das capacidades dos lotes (${currentLotCap + lot.capacity}) excede a capacidade das sessões (${totalSessionCap}).`
      );
    }

    let areaId = lot.areaId;
    if (!areaId) {
      const areaRes = await this.db.query<{ id: string }>(
        `SELECT id FROM event_sectors WHERE event_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [eventId]
      );
      if (areaRes.rows.length > 0) {
        areaId = areaRes.rows[0].id;
      } else {
        const defaultArea = await this.addArea(
          actor,
          eventId,
          { sessionId, name: 'Pista Geral', capacity: totalSessionCap || lot.capacity, isNumbered: false },
          correlationId
        );
        areaId = defaultArea.id;
      }
    }

    const lotNumber = Number(existingLotsRes.rows[0]?.count_lots ?? 0) + 1;
    const id = randomUUID();

    await this.db.query(
      `INSERT INTO event_price_lots (
         id, event_id, session_id, sector_id, modality_name, category_type,
         lot_number, nominal_price_cents, max_quantity, starts_at, ends_at, status
       ) VALUES ($1, $2, $3, $4, $5, 'INTEIRA', $6, $7, $8, $9::timestamptz, $10::timestamptz, 'ACTIVE')`,
      [
        id,
        eventId,
        sessionId,
        areaId,
        lot.name.trim(),
        lotNumber,
        lot.faceValueCents,
        lot.capacity,
        new Date(lot.startsAt).toISOString(),
        new Date(lot.endsAt).toISOString(),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_LOT_ADDED',
      resourceType: 'EventPriceLot',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id, eventId, name: lot.name, faceValueCents: lot.faceValueCents, capacity: lot.capacity },
    });

    return {
      id,
      eventId,
      sessionId,
      areaId,
      name: lot.name.trim(),
      faceValueCents: lot.faceValueCents,
      capacity: lot.capacity,
      startsAt: new Date(lot.startsAt).toISOString(),
      endsAt: new Date(lot.endsAt).toISOString(),
    };
  }

  async setChannels(
    actor: AuthenticatedActorDto,
    eventId: string,
    input: { channels?: Channel[]; channel?: Channel; enabled?: boolean },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode habilitar canais de venda.');
    await this.ensureEditableEvent(eventId);

    if (input.channel && typeof input.enabled === 'boolean') {
      const dbType = input.channel === 'ONLINE' ? 'SITE' : input.channel;
      if (input.enabled) {
        await this.db.query(
          `INSERT INTO event_sales_channels (id, event_id, channel_type, channel_code, channel_name, is_enabled)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT (event_id, channel_code) DO UPDATE SET is_enabled = TRUE`,
          [randomUUID(), eventId, dbType, `CH-${input.channel}`, `Canal ${input.channel}`]
        );
      } else {
        await this.db.query(
          `DELETE FROM event_sales_channels WHERE event_id = $1 AND channel_code = $2`,
          [eventId, `CH-${input.channel}`]
        );
      }
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: 'EVENT_CHANNELS_UPDATED',
        resourceType: 'EventChannelConfig',
        resourceId: eventId,
        eventId,
        outcome: 'SUCCESS',
        correlationId,
        afterState: { channel: input.channel, enabled: input.enabled },
      });
      return [{ eventId, channel: input.channel, enabled: input.enabled }];
    }

    const unique = [...new Set(input.channels ?? [])];
    if (unique.length === 0) {
      throw new DomainError('CANAL_OBRIGATORIO', 'Selecione ao menos um canal de venda.');
    }

    await this.db.query(`DELETE FROM event_sales_channels WHERE event_id = $1`, [eventId]);

    const created = [];
    for (const ch of unique) {
      const dbType = ch === 'ONLINE' ? 'SITE' : ch;
      const id = randomUUID();
      await this.db.query(
        `INSERT INTO event_sales_channels (
           id, event_id, channel_type, channel_code, channel_name, is_enabled
         ) VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [id, eventId, dbType, `CH-${ch}`, `Canal ${ch}`]
      );
      created.push({ id, eventId, channel: ch, enabled: true });
    }

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_CHANNELS_UPDATED',
      resourceType: 'EventChannelConfig',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { channels: unique },
    });

    return created;
  }

  async addMedia(
    actor: AuthenticatedActorDto,
    eventId: string,
    body: { kind: string; storageKey: string; altText: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode anexar mídias de anúncio.');
    await this.ensureEditableEvent(eventId);
    if (!body.storageKey?.startsWith('secure://') || !body.altText?.trim()) {
      throw new DomainError('MIDIA_INVALIDA', 'Mídia requer storageKey privado (secure://) e texto alternativo.');
    }
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_media (id, event_id, kind, storage_key, alt_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, eventId, body.kind, body.storageKey, body.altText.trim()]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_MEDIA_ADDED',
      resourceType: 'EventMedia',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: { id, kind: body.kind, storageKey: body.storageKey },
    });

    return { id, eventId, kind: body.kind, storageKey: body.storageKey, altText: body.altText.trim() };
  }

  async submitForReview(actor: AuthenticatedActorDto, eventId: string, correlationId: string) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode submeter evento para aprovação.');
    const ev = await this.ensureEditableEvent(eventId);

    await this.db.query(
      `UPDATE events
       SET status = 'EM_ANALISE', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [actor.userId, eventId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_SUBMITTED_FOR_REVIEW',
      resourceType: 'Event',
      resourceId: eventId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { status: ev.status },
      afterState: { status: 'EM_ANALISE', submittedBy: actor.userId },
    });

    return this.getEvent(actor, eventId);
  }

  async decideApproval(
    actor: AuthenticatedActorDto,
    eventId: string,
    body: { step: ApprovalStep; decision: 'APROVADO' | 'REPROVADO'; reason?: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Produtor não possui alçada para aprovar etapas internas do evento.');

    const evRes = await this.db.query<{
      id: string;
      status: string;
      submitted_by: string | null;
    }>(`SELECT id, status, submitted_by FROM events WHERE id = $1`, [eventId]);
    if (evRes.rows.length === 0) {
      throw new NotFoundException({ code: 'EVENTO_NAO_ENCONTRADO', message: 'Evento não encontrado.' });
    }
    const ev = evRes.rows[0];

    const existingRes = await this.db.query<{
      stage: ApprovalStep;
      decided_by: string;
      decision: string;
      notes: string | null;
    }>(`SELECT stage, decided_by, decision, notes FROM event_approvals WHERE event_id = $1`, [eventId]);

    const existingRecords: ApprovalRecord[] = existingRes.rows.map((r) => ({
      step: r.stage,
      actorId: r.decided_by,
      decision: r.decision === 'APPROVED' || r.decision === 'APROVADO' ? 'APROVADO' : 'REPROVADO',
      reason: r.notes ?? undefined,
    }));

    assertCanApprove(
      body.step,
      this.mapActorToP06Role(actor, body.step),
      ev.submitted_by ?? '',
      actor.userId,
      existingRecords
    );

    if (body.decision === 'REPROVADO' && !body.reason?.trim()) {
      throw new DomainError('MOTIVO_REPROVACAO', 'Reprovação exige motivo registrado.');
    }

    const approvalId = randomUUID();
    await this.db.query(
      `INSERT INTO event_approvals (id, event_id, stage, decision, decided_by, notes, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (event_id, stage)
       DO UPDATE SET decision = EXCLUDED.decision, decided_by = EXCLUDED.decided_by, notes = EXCLUDED.notes, decided_at = NOW()`,
      [approvalId, eventId, body.step, body.decision, actor.userId, body.reason?.trim() ?? null]
    );

    const updatedRes = await this.db.query<{ stage: ApprovalStep; decision: string }>(
      `SELECT stage, decision FROM event_approvals WHERE event_id = $1`,
      [eventId]
    );
    const allApproved = REQUIRED_APPROVALS.every((step) =>
      updatedRes.rows.some((r) => r.stage === step && (r.decision === 'APROVADO' || r.decision === 'APPROVED'))
    );

    const nextStatus =
      body.decision === 'REPROVADO' ? 'REPROVADO' : allApproved ? 'APROVADO' : 'EM_ANALISE';

    await this.db.query(
      `UPDATE events
       SET status = $1::varchar,
           approved_at = CASE WHEN $1::varchar = 'APROVADO' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [nextStatus, eventId]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: `EVENT_APPROVAL_${body.step}_${body.decision}`,
      resourceType: 'EventApproval',
      resourceId: approvalId,
      eventId,
      outcome: 'SUCCESS',
      justification: body.reason ?? null,
      correlationId,
      afterState: { step: body.step, decision: body.decision, eventStatus: nextStatus },
    });

    return this.getEvent(actor, eventId);
  }

  private async buildPublicationCheckInput(actor: AuthenticatedActorDto, eventId: string) {
    const full = (await this.getEvent(actor, eventId, false)) as Record<string, any>;
    const primary = (full.producers as any[]).filter((p) => p.role === 'PRINCIPAL');
    const feeCountRes = await this.db.query<{ cnt: string | number }>(
      `SELECT COUNT(*) AS cnt FROM event_fee_agreements WHERE event_id = $1 AND status = 'APPROVED'`,
      [eventId]
    );
    const approvedFeeCount = Number(feeCountRes.rows[0]?.cnt ?? 0);

    return {
      full,
      checkInput: {
        status: full.status as EventStatus,
        producerVerified: primary.length === 1 && primary[0].producer?.status === 'APROVADO',
        primaryProducerCount: primary.length,
        event: {
          name: full.name,
          description: full.description,
          venueName: full.venueName,
          venueCity: full.venueCity,
          venueState: full.venueState,
          startAt: new Date(full.startAt).toISOString(),
          endAt: new Date(full.endAt).toISOString(),
          salesStartAt: new Date(full.salesStartAt).toISOString(),
          ageRating: full.ageRating,
          policyUrl: full.policyUrl,
        },
        sessions: (full.sessions as any[]).map((s) => ({
          startsAt: new Date(s.startsAt).toISOString(),
          endsAt: new Date(s.endsAt).toISOString(),
          capacity: Number(s.capacity),
        })),
        lots: (full.lots as any[]).map((l) => ({
          name: l.name,
          faceValueCents: Number(l.faceValueCents),
          startsAt: new Date(l.startsAt).toISOString(),
          endsAt: new Date(l.endsAt).toISOString(),
          capacity: Number(l.capacity),
        })),
        channels: (full.channels as any[]).filter((c) => c.enabled).map((c) => c.channel as Channel),
        approvedFeeCount,
        approvals: (full.approvals as any[]).map((a) => ({
          step: a.step as ApprovalStep,
          actorId: a.actorId,
          decision: a.decision as 'APROVADO' | 'REPROVADO',
          reason: a.reason ?? undefined,
        })),
      },
    };
  }

  async readiness(actor: AuthenticatedActorDto, eventId: string) {
    const { checkInput } = await this.buildPublicationCheckInput(actor, eventId);
    const issues = readinessIssues(checkInput);
    return {
      ready: issues.length === 0 && checkInput.status === 'APROVADO',
      issues,
    };
  }

  async requestPublication(actor: AuthenticatedActorDto, eventId: string, correlationId: string) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna autorizada pode solicitar publicação na DiskIngressos.');
    const { full, checkInput } = await this.buildPublicationCheckInput(actor, eventId);
    assertCanRequestPublication(checkInput);

    const cmd = publicationCommand(eventId, Number(full.revision ?? 1));

    const existingPub = await this.db.query<{
      id: string;
      destination: string;
      status: string;
      idempotency_key: string;
      requested_at: string;
    }>(`SELECT id, destination, status, idempotency_key, requested_at FROM event_publications WHERE idempotency_key = $1`, [
      cmd.idempotencyKey,
    ]);

    if (existingPub.rows.length > 0) {
      const pub = existingPub.rows[0];
      return {
        id: pub.id,
        eventId,
        destination: pub.destination,
        status: pub.status,
        idempotencyKey: pub.idempotency_key,
        requestedAt: pub.requested_at,
      };
    }

    const pubId = randomUUID();
    await this.db.query(
      `INSERT INTO event_publications (
         id, event_id, destination, status, requested_by, idempotency_key
       ) VALUES ($1, $2, 'DISKINGRESSOS', 'PENDENTE_INTEGRACAO', $3, $4)`,
      [pubId, eventId, actor.userId, cmd.idempotencyKey]
    );

    await this.db.query(
      `UPDATE events SET status = 'PUBLICACAO_SOLICITADA', updated_at = NOW() WHERE id = $1`,
      [eventId]
    );

    await this.db.query(
      `INSERT INTO outbox_events (
         id, event_name, schema_version, aggregate_type, aggregate_id,
         correlation_id, event_id, payload, status
       ) VALUES ($1, $2, 1, 'EventPublication', $3, $4, $5, $6::jsonb, 'PENDING')`,
      [
        randomUUID(),
        cmd.kind,
        pubId,
        correlationId,
        eventId,
        JSON.stringify(cmd),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'EVENT_PUBLICATION_REQUESTED',
      resourceType: 'EventPublication',
      resourceId: pubId,
      eventId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        pubId,
        eventId,
        status: 'PENDENTE_INTEGRACAO',
        eventStatus: 'PUBLICACAO_SOLICITADA',
        idempotencyKey: cmd.idempotencyKey,
      },
    });

    return {
      id: pubId,
      eventId,
      destination: 'DISKINGRESSOS',
      status: 'PENDENTE_INTEGRACAO',
      idempotencyKey: cmd.idempotencyKey,
    };
  }

  /**
   * Método exclusivo do worker confiável de integração (nunca exposto como rota pública de auto-publicação).
   * Só confirma PUBLICADO mediante recibo externo verificado (externalPublicationId).
   */
  async confirmFromTrustedWorker(params: {
    eventId: string;
    idempotencyKey: string;
    externalPublicationId: string;
    workerActorId: string;
    correlationId: string;
  }) {
    if (!params.externalPublicationId?.trim()) {
      throw new DomainError('RECIBO_EXTERNO_OBRIGATORIO', 'Confirmação de publicação exige externalPublicationId.');
    }

    const pubRes = await this.db.query<{ id: string }>(
      `UPDATE event_publications
       SET status = 'PUBLICADO', external_publication_id = $1, published_at = NOW()
       WHERE event_id = $2 AND idempotency_key = $3
       RETURNING id`,
      [params.externalPublicationId.trim(), params.eventId, params.idempotencyKey]
    );
    if (pubRes.rows.length === 0) {
      throw new NotFoundException({
        code: 'PUBLICACAO_NAO_ENCONTRADA',
        message: 'Solicitação de publicação não encontrada para confirmação do worker.',
      });
    }

    await this.db.query(
      `UPDATE events SET status = 'PUBLICADO', updated_at = NOW() WHERE id = $1`,
      [params.eventId]
    );

    await this.auditService.record({
      actorUserId: params.workerActorId,
      actorRole: 'TRUSTED_PUBLICATION_WORKER',
      canonicalAction: 'EVENT_PUBLICATION_CONFIRMED',
      resourceType: 'EventPublication',
      resourceId: pubRes.rows[0].id,
      eventId: params.eventId,
      outcome: 'SUCCESS',
      correlationId: params.correlationId,
      afterState: {
        eventId: params.eventId,
        status: 'PUBLICADO',
        externalPublicationId: params.externalPublicationId,
      },
    });

    return {
      id: pubRes.rows[0].id,
      eventId: params.eventId,
      status: 'PUBLICADO',
      externalPublicationId: params.externalPublicationId,
    };
  }

  async publicProjection(actor: AuthenticatedActorDto, eventId: string) {
    const { full, checkInput } = await this.buildPublicationCheckInput(actor, eventId);
    return publicEventProjection({
      id: full.id,
      event: checkInput.event,
      sessions: checkInput.sessions,
      lots: checkInput.lots,
      status: checkInput.status,
    });
  }

  async openChangeCase(
    actor: AuthenticatedActorDto,
    eventId: string,
    body: { changeType: 'ADIAMENTO' | 'CANCELAMENTO' | 'SUSPENSAO' | 'ALTERACAO'; reason: string },
    correlationId: string
  ) {
    this.assertNotProducerOnly(actor, 'Somente equipe interna pode abrir caso formal de alteração/adiamento/cancelamento.');
    if (!body.reason || body.reason.trim().length < 10) {
      throw new DomainError('OCORRENCIA_MOTIVO', 'Ocorrência de evento exige justificativa detalhada (mínimo 10 caracteres).');
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO event_change_cases (id, event_id, change_type, reason, status, requested_by)
       VALUES ($1, $2, $3, $4, 'ABERTO', $5)`,
      [id, eventId, body.changeType, body.reason.trim(), actor.userId]
    );

    await this.db.query(
      `INSERT INTO outbox_events (
         id, event_name, schema_version, aggregate_type, aggregate_id,
         correlation_id, event_id, payload, status
       ) VALUES ($1, 'EVENT_CHANGE_CASE_OPENED', 1, 'EventChangeCase', $2, $3, $4, $5::jsonb, 'PENDING')`,
      [
        randomUUID(),
        id,
        correlationId,
        eventId,
        JSON.stringify({ id, eventId, changeType: body.changeType, reason: body.reason.trim() }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: `EVENT_CHANGE_CASE_${body.changeType}`,
      resourceType: 'EventChangeCase',
      resourceId: id,
      eventId,
      outcome: 'SUCCESS',
      justification: body.reason.trim(),
      correlationId,
      afterState: { id, eventId, changeType: body.changeType, status: 'ABERTO' },
    });

    return {
      id,
      eventId,
      changeType: body.changeType,
      reason: body.reason.trim(),
      status: 'ABERTO',
      requestedBy: actor.userId,
    };
  }
}
