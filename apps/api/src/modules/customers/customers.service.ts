import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';
import {
  type AuthenticatedActorDto,
  CreateCustomerRequestSchema,
  type CustomerDto,
} from '@bravo-ii/contracts';

interface CustomerRow {
  id: string;
  cpf_masked: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  marketing_consent: boolean;
  source_system: string;
  created_at: Date | string;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService
  ) {}

  private normalizeDigits(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  private hashCpf(digits: string): string {
    return createHash('sha256').update(`bravo_ii_cpf:${digits}`).digest('hex');
  }

  private maskCpf(digits: string): string {
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  private mapRow(row: CustomerRow): CustomerDto {
    return {
      id: row.id,
      cpfMasked: row.cpf_masked,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      marketingConsent: Boolean(row.marketing_consent),
      sourceSystem: row.source_system,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  async listCustomers(): Promise<CustomerDto[]> {
    const res = await this.db.query<CustomerRow>(
      `SELECT id, cpf_masked, full_name, email, phone, status, marketing_consent, source_system, created_at
       FROM customers
       ORDER BY created_at DESC`
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  async createCustomer(
    rawPayload: unknown,
    actor: AuthenticatedActorDto,
    correlationId: string
  ): Promise<CustomerDto> {
    const parsed = CreateCustomerRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VAL-001',
        message: parsed.error.issues[0]?.message ?? 'Dados de cliente inválidos.',
      });
    }

    const digits = this.normalizeDigits(parsed.data.cpf);
    if (digits.length !== 11) {
      throw new BadRequestException({
        code: 'VAL-002',
        message: 'O CPF deve conter exatamente 11 dígitos numéricos.',
      });
    }

    const cpfHash = this.hashCpf(digits);
    const cpfMasked = this.maskCpf(digits);

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM customers WHERE cpf_hash = $1`,
      [cpfHash]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({
        code: 'CRM-001',
        message: 'Já existe um cliente cadastrado com este CPF.',
      });
    }

    const id = randomUUID();
    const res = await this.db.query<CustomerRow>(
      `INSERT INTO customers (
         id, cpf_hash, cpf_masked, full_name, email, phone, status, marketing_consent, source_system
       ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, 'BRAVO_II')
       RETURNING id, cpf_masked, full_name, email, phone, status, marketing_consent, source_system, created_at`,
      [
        id,
        cpfHash,
        cpfMasked,
        parsed.data.fullName,
        parsed.data.email.toLowerCase(),
        parsed.data.phone,
        parsed.data.marketingConsent,
      ]
    );

    const created = this.mapRow(res.rows[0]!);

    await this.audit.record({
      actorUserId: actor.userId,
      actorRole: actor.roles[0] ?? 'UNKNOWN',
      sessionId: actor.sessionId,
      canonicalAction: 'CRM_CUSTOMER_CREATED',
      resourceType: 'Customer',
      resourceId: created.id,
      outcome: 'SUCCESS',
      correlationId,
      afterState: {
        cpfMasked: created.cpfMasked,
        fullName: created.fullName,
        marketingConsent: created.marketingConsent,
      },
    });

    return created;
  }
}
