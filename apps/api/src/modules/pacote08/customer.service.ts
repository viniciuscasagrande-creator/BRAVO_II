import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { CustomerInput, SalesRuleError, validateCustomer } from '@bravo-ii/domain-p08';
import { canExecuteInternalOperation, hasAnyRole } from '@bravo-ii/core-policy';
import type { AuthenticatedActorDto } from '@bravo-ii/contracts';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../governance/audit.service';

export function assertInternalRole(actor: AuthenticatedActorDto | undefined, ...allowed: string[]): void {
  if (!actor) {
    throw new ForbiddenException({ code: 'ACESSO_NEGADO', message: 'Ator não autenticado.' });
  }
  const isProducerOnly = actor.roles.every((r: string) => r === 'PRODUTOR_PDT' || r === 'PRODUTOR');
  if (isProducerOnly || !canExecuteInternalOperation(actor.roles, allowed) || !hasAnyRole(actor.roles, allowed)) {
    throw new ForbiddenException({
      code: 'PERMISSAO_INSUFICIENTE_P08',
      message: 'Perfil sem alçada para executar esta operação.',
    });
  }
}

function parseCustomer(input: CustomerInput) {
  try {
    return validateCustomer(input);
  } catch (e) {
    if (e instanceof SalesRuleError) {
      throw new BadRequestException({ code: 'CLIENTE_INVALIDO', message: e.message });
    }
    throw e;
  }
}

@Injectable()
export class BravoCustomersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  private getPepper(): string {
    const secret = process.env.CPF_HASH_PEPPER || '';
    if (secret.length < 32 || /SUBSTITUA|EXEMPLO|PLACEHOLDER/i.test(secret)) {
      throw new BadRequestException({
        code: 'CPF_PEPPER_NAO_CONFIGURADO',
        message: 'CPF_HASH_PEPPER precisa ter no mínimo 32 caracteres privados',
      });
    }
    return secret;
  }

  private fingerprint(cpf: string): string {
    return createHmac('sha256', this.getPepper()).update(`bravo-ii:cpf:v1:${cpf}`).digest('hex');
  }

  async create(input: CustomerInput, actor: AuthenticatedActorDto, correlationId?: string) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC');
    const data = parseCustomer(input);
    const cpfFingerprint = this.fingerprint(data.cpf);
    const cpfLast4 = data.cpf.slice(-4);
    const cpfMasked = `***.***.***-${cpfLast4.slice(-2)}`;

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM customers WHERE cpf_fingerprint = $1 OR cpf_hash = $1 LIMIT 1`,
      [cpfFingerprint]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException({ code: 'CPF_DUPLICADO', message: 'CPF já cadastrado' });
    }

    const customerId = randomUUID();
    const birthDateIso = data.birthDate ? data.birthDate.toISOString().slice(0, 10) : null;

    await this.db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO customers (
           id, cpf_hash, cpf_fingerprint, cpf_last4, cpf_masked,
           full_name, email, phone, birth_date, address_json,
           status, marketing_consent, created_by
         ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8::date, $9::jsonb, 'ACTIVE', $10, $11)`,
        [
          customerId,
          cpfFingerprint,
          cpfLast4,
          cpfMasked,
          data.fullName,
          data.email,
          data.phone,
          birthDateIso,
          data.address ? JSON.stringify(data.address) : null,
          data.marketingOptIn,
          actor.userId,
        ]
      );
    });

    // CPF, e-mail, telefone e endereço NUNCA entram no log de auditoria.
    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'CLIENTE_CADASTRADO',
      resourceType: 'CLIENTE',
      resourceId: customerId,
      outcome: 'SUCCESS',
      correlationId: correlationId ?? `p08-cust-${customerId}`,
      afterState: { marketingOptIn: data.marketingOptIn },
    });

    const createdRes = await this.db.query<{
      id: string;
      full_name: string;
      cpf_last4: string | null;
      cpf_masked: string;
      email: string;
      phone: string;
      birth_date: string | Date | null;
      marketing_consent: boolean;
      created_at: string | Date;
    }>(
      `SELECT id, full_name, cpf_last4, cpf_masked, email, phone, birth_date, marketing_consent, created_at
       FROM customers WHERE id = $1`,
      [customerId]
    );

    return this.toView(createdRes.rows[0]);
  }

  async search(query: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'AUDITOR');
    const term = (query || '').trim().toLowerCase();
    if (term.length < 4 || term.length > 120) {
      throw new BadRequestException({
        code: 'BUSCA_INVALIDA',
        message: 'Informe 4 a 120 caracteres para pesquisar',
      });
    }
    const likeTerm = `%${term}%`;
    const res = await this.db.query<{
      id: string;
      full_name: string;
      cpf_last4: string | null;
      cpf_masked: string;
      email: string;
      phone: string;
      birth_date: string | Date | null;
      marketing_consent: boolean;
      created_at: string | Date;
    }>(
      `SELECT id, full_name, cpf_last4, cpf_masked, email, phone, birth_date, marketing_consent, created_at
       FROM customers
       WHERE LOWER(email) LIKE $1 OR LOWER(full_name) LIKE $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [likeTerm]
    );
    return { items: res.rows.map((r) => this.toView(r)) };
  }

  async get(id: string, actor: AuthenticatedActorDto) {
    assertInternalRole(actor, 'ADMIN', 'OPERACOES', 'SAC', 'AUDITOR');
    const res = await this.db.query<{
      id: string;
      full_name: string;
      cpf_last4: string | null;
      cpf_masked: string;
      email: string;
      phone: string;
      birth_date: string | Date | null;
      marketing_consent: boolean;
      created_at: string | Date;
    }>(
      `SELECT id, full_name, cpf_last4, cpf_masked, email, phone, birth_date, marketing_consent, created_at
       FROM customers WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException({ code: 'CLIENTE_NAO_ENCONTRADO', message: 'Cliente não encontrado' });
    }
    return this.toView(res.rows[0]);
  }

  private toView(c: {
    id: string;
    full_name: string;
    cpf_last4: string | null;
    cpf_masked: string;
    email: string;
    phone: string;
    birth_date: string | Date | null;
    marketing_consent: boolean;
    created_at: string | Date;
  }) {
    const last2 = c.cpf_last4 ? c.cpf_last4.slice(-2) : c.cpf_masked.slice(-2);
    return {
      id: c.id,
      fullName: c.full_name,
      cpfDisplay: `***.***.***-${last2}`,
      email: c.email,
      phone: c.phone,
      birthDate: c.birth_date,
      marketingOptIn: c.marketing_consent,
      createdAt: c.created_at,
    };
  }
}
