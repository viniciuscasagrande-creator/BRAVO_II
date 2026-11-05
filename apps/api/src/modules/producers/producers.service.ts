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
  CreateContractRequestSchema,
  CreateProducerContactRequestSchema,
  CreateProducerDocumentRequestSchema,
  CreateProducerRequestSchema,
  type AuthenticatedActorDto,
  type ContractDto,
  type ProducerContactDto,
  type ProducerDetailDto,
  type ProducerDocumentDto,
} from '@bravo-ii/contracts';

interface ProducerRow {
  id: string;
  cnpj: string;
  legal_name: string;
  trade_name: string;
  verification_status: string;
  source_system: string;
  created_at: string | Date;
}

@Injectable()
export class ProducersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private normalizeCnpj(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) {
      return raw.trim();
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  }

  private async buildProducerDetail(row: ProducerRow): Promise<ProducerDetailDto> {
    const contactsRes = await this.db.query<{
      id: string;
      producer_id: string;
      full_name: string;
      email: string;
      phone: string;
      role_type: string;
      is_primary: boolean;
      created_at: string | Date;
    }>(
      `SELECT id, producer_id, full_name, email, phone, role_type, is_primary, created_at
       FROM producer_contacts
       WHERE producer_id = $1
       ORDER BY is_primary DESC, created_at ASC`,
      [row.id]
    );

    const docsRes = await this.db.query<{
      id: string;
      producer_id: string;
      document_type: string;
      document_reference: string;
      verification_status: string;
      verified_by: string | null;
      verified_at: string | Date | null;
      created_at: string | Date;
    }>(
      `SELECT id, producer_id, document_type, document_reference, verification_status, verified_by, verified_at, created_at
       FROM producer_documents
       WHERE producer_id = $1
       ORDER BY created_at ASC`,
      [row.id]
    );

    const contractsRes = await this.db.query<{
      id: string;
      producer_id: string;
      contract_number: string;
      title: string;
      status: string;
      valid_from: string | Date;
      valid_until: string | Date | null;
      signed_at: string | Date | null;
      created_at: string | Date;
    }>(
      `SELECT id, producer_id, contract_number, title, status, valid_from, valid_until, signed_at, created_at
       FROM contracts
       WHERE producer_id = $1
       ORDER BY created_at DESC`,
      [row.id]
    );

    return {
      id: row.id,
      cnpj: row.cnpj,
      legalName: row.legal_name,
      tradeName: row.trade_name,
      verificationStatus: row.verification_status,
      sourceSystem: row.source_system,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      contacts: contactsRes.rows.map((c) => ({
        id: c.id,
        producerId: c.producer_id,
        fullName: c.full_name,
        email: c.email,
        phone: c.phone,
        roleType: c.role_type,
        isPrimary: Boolean(c.is_primary),
        createdAt: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at),
      })),
      documents: docsRes.rows.map((d) => ({
        id: d.id,
        producerId: d.producer_id,
        documentType: d.document_type,
        documentReference: d.document_reference,
        verificationStatus: d.verification_status,
        verifiedBy: d.verified_by,
        verifiedAt:
          d.verified_at instanceof Date
            ? d.verified_at.toISOString()
            : d.verified_at
              ? String(d.verified_at)
              : null,
        createdAt: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
      })),
      contracts: contractsRes.rows.map((ct) => ({
        id: ct.id,
        producerId: ct.producer_id,
        contractNumber: ct.contract_number,
        title: ct.title,
        status: ct.status,
        validFrom: ct.valid_from instanceof Date ? ct.valid_from.toISOString() : String(ct.valid_from),
        validUntil:
          ct.valid_until instanceof Date
            ? ct.valid_until.toISOString()
            : ct.valid_until
              ? String(ct.valid_until)
              : null,
        signedAt:
          ct.signed_at instanceof Date
            ? ct.signed_at.toISOString()
            : ct.signed_at
              ? String(ct.signed_at)
              : null,
        createdAt: ct.created_at instanceof Date ? ct.created_at.toISOString() : String(ct.created_at),
      })),
    };
  }

  async listProducers(): Promise<ProducerDetailDto[]> {
    const res = await this.db.query<ProducerRow>(
      `SELECT id, cnpj, legal_name, trade_name, verification_status, source_system, created_at
       FROM producers
       ORDER BY created_at DESC`
    );
    const items: ProducerDetailDto[] = [];
    for (const row of res.rows) {
      items.push(await this.buildProducerDetail(row));
    }
    return items;
  }

  async getProducerById(producerId: string): Promise<ProducerDetailDto> {
    const res = await this.db.query<ProducerRow>(
      `SELECT id, cnpj, legal_name, trade_name, verification_status, source_system, created_at
       FROM producers
       WHERE id = $1`,
      [producerId]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({
        code: 'PRODUCER_NOT_FOUND',
        message: 'Produtor PJ não encontrado.',
      });
    }
    return this.buildProducerDetail(res.rows[0]);
  }

  async createProducer(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<ProducerDetailDto> {
    const parsed = CreateProducerRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCER_PAYLOAD',
        message: 'Dados cadastrais do produtor PJ inválidos.',
        details: parsed.error.issues,
      });
    }

    const formattedCnpj = this.normalizeCnpj(parsed.data.cnpj);
    const existing = await this.db.query<{ id: string }>('SELECT id FROM producers WHERE cnpj = $1', [
      formattedCnpj,
    ]);
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'PRODUCER_CNPJ_ALREADY_EXISTS',
        message: `Já existe um produtor PJ cadastrado com o CNPJ ${formattedCnpj}.`,
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO producers (id, cnpj, legal_name, trade_name, verification_status, source_system)
       VALUES ($1, $2, $3, $4, 'PENDING', 'BRAVO_II')`,
      [id, formattedCnpj, parsed.data.legalName, parsed.data.tradeName]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'producer.created',
      resourceType: 'Producer',
      resourceId: id,
      producerId: id,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: null,
      afterState: {
        id,
        cnpj: formattedCnpj,
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        verificationStatus: 'PENDING',
      },
    });

    return this.getProducerById(id);
  }

  async addProducerContact(
    producerId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<ProducerContactDto> {
    await this.getProducerById(producerId);
    const parsed = CreateProducerContactRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCER_CONTACT_PAYLOAD',
        message: 'Dados do responsável/contato do produtor inválidos.',
        details: parsed.error.issues,
      });
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO producer_contacts (id, producer_id, full_name, email, phone, role_type, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        producerId,
        parsed.data.fullName,
        parsed.data.email.toLowerCase(),
        parsed.data.phone,
        parsed.data.roleType,
        parsed.data.isPrimary,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'producer.contact.added',
      resourceType: 'ProducerContact',
      resourceId: id,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        producerId,
        roleType: parsed.data.roleType,
        isPrimary: parsed.data.isPrimary,
      },
    });

    return {
      id,
      producerId,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      roleType: parsed.data.roleType,
      isPrimary: parsed.data.isPrimary,
      createdAt: new Date().toISOString(),
    };
  }

  async addProducerDocument(
    producerId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<ProducerDocumentDto> {
    await this.getProducerById(producerId);
    const parsed = CreateProducerDocumentRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCER_DOCUMENT_PAYLOAD',
        message: 'Dados do documento societário/fiscal inválidos.',
        details: parsed.error.issues,
      });
    }

    const id = randomUUID();
    const nowIso = new Date().toISOString();
    await this.db.query(
      `INSERT INTO producer_documents (
        id, producer_id, document_type, document_reference, verification_status, verified_by, verified_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED', $5, $6)`,
      [id, producerId, parsed.data.documentType, parsed.data.documentReference, actor.userId, nowIso]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'producer.document.verified',
      resourceType: 'ProducerDocument',
      resourceId: id,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        producerId,
        documentType: parsed.data.documentType,
        documentReference: parsed.data.documentReference,
        verificationStatus: 'VERIFIED',
      },
    });

    return {
      id,
      producerId,
      documentType: parsed.data.documentType,
      documentReference: parsed.data.documentReference,
      verificationStatus: 'VERIFIED',
      verifiedBy: actor.userId,
      verifiedAt: nowIso,
      createdAt: nowIso,
    };
  }

  async verifyProducer(
    producerId: string,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<ProducerDetailDto> {
    const current = await this.getProducerById(producerId);

    await this.db.query(
      `UPDATE producers SET verification_status = 'VERIFIED', updated_at = NOW() WHERE id = $1`,
      [producerId]
    );

    await this.db.query(
      `INSERT INTO outbox_events (
        id, event_name, schema_version, aggregate_type, aggregate_id, correlation_id, producer_id, payload
      ) VALUES ($1, 'ProducerVerified', 1, 'Producer', $2, $3, $4, $5)`,
      [
        randomUUID(),
        producerId,
        correlationId,
        producerId,
        JSON.stringify({ producerId, verifiedBy: actor.userId, verifiedAt: new Date().toISOString() }),
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'producer.verified',
      resourceType: 'Producer',
      resourceId: producerId,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      beforeState: { verificationStatus: current.verificationStatus },
      afterState: { verificationStatus: 'VERIFIED' },
    });

    return this.getProducerById(producerId);
  }

  async createContract(
    producerId: string,
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<ContractDto> {
    await this.getProducerById(producerId);
    const parsed = CreateContractRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_CONTRACT_PAYLOAD',
        message: 'Dados do contrato comercial inválidos.',
        details: parsed.error.issues,
      });
    }

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM contracts WHERE contract_number = $1`,
      [parsed.data.contractNumber]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'CONTRACT_NUMBER_ALREADY_EXISTS',
        message: `Já existe um contrato registrado sob o número ${parsed.data.contractNumber}.`,
      });
    }

    const id = randomUUID();
    const nowIso = new Date().toISOString();
    const validFrom = parsed.data.validFrom ?? nowIso;
    const validUntil = parsed.data.validUntil ?? null;
    const signedAt = parsed.data.status === 'ACTIVE' ? nowIso : null;

    await this.db.query(
      `INSERT INTO contracts (
        id, producer_id, contract_number, title, status, valid_from, valid_until, signed_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        producerId,
        parsed.data.contractNumber,
        parsed.data.title,
        parsed.data.status,
        validFrom,
        validUntil,
        signedAt,
        actor.userId,
      ]
    );

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'producer.contract.created',
      resourceType: 'Contract',
      resourceId: id,
      producerId,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        id,
        producerId,
        contractNumber: parsed.data.contractNumber,
        status: parsed.data.status,
      },
    });

    return {
      id,
      producerId,
      contractNumber: parsed.data.contractNumber,
      title: parsed.data.title,
      status: parsed.data.status,
      validFrom,
      validUntil,
      signedAt,
      createdAt: nowIso,
    };
  }
}
