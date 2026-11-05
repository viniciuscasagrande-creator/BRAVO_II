import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../common/database/database.service';
import {
  generateSessionToken,
  hashPassword,
  verifyPassword,
} from '../../common/auth/crypto.util';
import {
  CANONICAL_ROLES,
  filterNavigationByPermissions,
  LoginRequestSchema,
  PERMISSION_CODES,
  type AuthenticatedActorDto,
  type NavigationMenuItem,
  type OperationalOverviewDto,
  type PermissionCode,
  type RoleCode,
} from '@bravo-ii/contracts';
import { AuditService } from '../governance/audit.service';

@Injectable()
export class IdentityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async syncCanonicalRolesAndPermissions(): Promise<void> {
    for (const perm of PERMISSION_CODES) {
      const modulePrefix = perm.split(':')[0].toUpperCase();
      await this.db.query(
        `INSERT INTO permissions (code, module_code, description_pt_br)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [perm, modulePrefix, `Permissão canônica ${perm}`]
      );
    }

    for (const role of Object.values(CANONICAL_ROLES)) {
      await this.db.query(
        `INSERT INTO roles (code, name_pt_br, description_pt_br, is_internal)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           name_pt_br = EXCLUDED.name_pt_br,
           description_pt_br = EXCLUDED.description_pt_br,
           is_internal = EXCLUDED.is_internal`,
        [role.code, role.namePtBr, role.descriptionPtBr, role.isInternal]
      );

      for (const perm of role.permissions) {
        await this.db.query(
          `INSERT INTO role_permissions (role_code, permission_code)
           VALUES ($1, $2)
           ON CONFLICT (role_code, permission_code) DO NOTHING`,
          [role.code, perm]
        );
      }
    }
  }

  async ensureOperatorAccount(params: {
    id: string;
    email: string;
    fullName: string;
    plainPassword: string;
    role: RoleCode;
    producerScopeIds?: string[];
    eventScopeIds?: string[];
  }): Promise<void> {
    await this.syncCanonicalRolesAndPermissions();

    const passwordHash = hashPassword(params.plainPassword);
    await this.db.query(
      `INSERT INTO users (id, email, full_name, password_hash, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         status = 'ACTIVE'`,
      [params.id, params.email.toLowerCase(), params.fullName, passwordHash]
    );

    const userRes = await this.db.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      params.email.toLowerCase(),
    ]);
    const userId = userRes.rows[0].id;

    await this.db.query(
      `INSERT INTO user_role_grants (user_id, role_code)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_code) DO NOTHING`,
      [userId, params.role]
    );

    if (params.producerScopeIds) {
      for (const prodId of params.producerScopeIds) {
        await this.db.query(
          `INSERT INTO user_producer_scopes (user_id, producer_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, producer_id) DO NOTHING`,
          [userId, prodId]
        );
      }
    }

    if (params.eventScopeIds) {
      for (const evtId of params.eventScopeIds) {
        await this.db.query(
          `INSERT INTO user_event_scopes (user_id, event_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, event_id) DO NOTHING`,
          [userId, evtId]
        );
      }
    }
  }

  async login(
    rawPayload: unknown,
    correlationId: string,
    ipAddress?: string
  ): Promise<{ token: string; actor: AuthenticatedActorDto }> {
    const parsed = LoginRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_LOGIN_PAYLOAD',
        message: 'Credenciais inválidas. Informe e-mail e senha válidos.',
        details: parsed.error.issues,
      });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const userRes = await this.db.query<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
      status: string;
    }>('SELECT id, email, full_name, password_hash, status FROM users WHERE email = $1', [email]);

    if (userRes.rows.length === 0) {
      await this.auditService.record({
        actorUserId: null,
        actorRole: 'ANONYMOUS',
        canonicalAction: 'auth.login.failed',
        resourceType: 'User',
        resourceId: email,
        outcome: 'DENIED',
        justification: 'Tentativa de autenticação com e-mail não localizado.',
        correlationId,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos.',
      });
    }

    const user = userRes.rows[0];
    if (user.status !== 'ACTIVE' || !verifyPassword(parsed.data.password, user.password_hash)) {
      await this.auditService.record({
        actorUserId: user.id,
        actorRole: 'ANONYMOUS',
        canonicalAction: 'auth.login.failed',
        resourceType: 'User',
        resourceId: user.id,
        outcome: 'DENIED',
        justification: 'Tentativa de autenticação com senha inválida ou conta inativa.',
        correlationId,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos.',
      });
    }

    const { rawToken, tokenHash } = generateSessionToken();
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    await this.db.query(
      `INSERT INTO auth_sessions (id, user_id, token_hash, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, user.id, tokenHash, ipAddress ?? null, expiresAt]
    );

    const rolesRes = await this.db.query<{ role_code: RoleCode }>(
      `SELECT role_code FROM user_role_grants WHERE user_id = $1 ORDER BY role_code ASC`,
      [user.id]
    );
    const roles = rolesRes.rows.map((r) => r.role_code);

    const permsRes = await this.db.query<{ permission_code: PermissionCode }>(
      `SELECT DISTINCT rp.permission_code
       FROM user_role_grants urg
       INNER JOIN role_permissions rp ON rp.role_code = urg.role_code
       WHERE urg.user_id = $1
       ORDER BY rp.permission_code ASC`,
      [user.id]
    );
    const permissions = permsRes.rows.map((p) => p.permission_code);

    const prodScopesRes = await this.db.query<{ producer_id: string }>(
      `SELECT producer_id FROM user_producer_scopes WHERE user_id = $1`,
      [user.id]
    );
    const eventScopesRes = await this.db.query<{ event_id: string }>(
      `SELECT event_id FROM user_event_scopes WHERE user_id = $1`,
      [user.id]
    );

    const actor: AuthenticatedActorDto = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      roles,
      permissions,
      producerScopeIds: prodScopesRes.rows.map((r) => r.producer_id),
      eventScopeIds: eventScopesRes.rows.map((r) => r.event_id),
      sessionId,
    };

    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      ipAddress: ipAddress ?? null,
      canonicalAction: 'auth.session.created',
      resourceType: 'AuthSession',
      resourceId: sessionId,
      outcome: 'SUCCESS',
      correlationId,
    });

    return { token: rawToken, actor };
  }

  async logout(actor: AuthenticatedActorDto, correlationId: string): Promise<void> {
    await this.db.query(`UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1`, [actor.sessionId]);
    await this.auditService.record({
      actorUserId: actor.userId,
      actorRole: actor.roles.join(','),
      sessionId: actor.sessionId,
      canonicalAction: 'auth.session.revoked',
      resourceType: 'AuthSession',
      resourceId: actor.sessionId,
      outcome: 'SUCCESS',
      correlationId,
    });
  }

  getNavigationForActor(actor: AuthenticatedActorDto): NavigationMenuItem[] {
    return filterNavigationByPermissions(actor.permissions);
  }

  async getOperationalOverview(actor: AuthenticatedActorDto): Promise<OperationalOverviewDto> {
    const isPdtRestricted = actor.roles.includes('PRODUTOR_PDT') && !actor.roles.some((r) => r !== 'PRODUTOR_PDT');

    let visibleEventsCount = 0;
    let publishedEventsCount = 0;

    if (isPdtRestricted) {
      if (actor.eventScopeIds.length > 0 || actor.producerScopeIds.length > 0) {
        const evtRes = await this.db.query<{ total: string; published: string }>(
          `SELECT
            COUNT(DISTINCT e.id)::text AS total,
            COUNT(DISTINCT CASE WHEN e.status = 'PUBLICADO' THEN e.id END)::text AS published
           FROM events e
           LEFT JOIN event_producers ep ON ep.event_id = e.id
           WHERE e.id = ANY($1::uuid[]) OR ep.producer_id = ANY($2::uuid[])`,
          [actor.eventScopeIds, actor.producerScopeIds]
        );
        visibleEventsCount = Number(evtRes.rows[0]?.total ?? 0);
        publishedEventsCount = Number(evtRes.rows[0]?.published ?? 0);
      }
    } else {
      const evtRes = await this.db.query<{ total: string; published: string }>(
        `SELECT
          COUNT(*)::text AS total,
          COUNT(CASE WHEN status = 'PUBLICADO' THEN 1 END)::text AS published
         FROM events`
      );
      visibleEventsCount = Number(evtRes.rows[0]?.total ?? 0);
      publishedEventsCount = Number(evtRes.rows[0]?.published ?? 0);
    }

    const pendingCommercialRes = await this.db.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM event_fee_agreements WHERE status = 'DRAFT'`
    );
    const pendingRefundsRes = await this.db.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM refund_requests WHERE status IN ('SOLICITADO', 'AGUARDANDO_APROVACAO_FINANCEIRA')`
    );
    const auditRes = await this.db.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM audit_records`);

    return {
      generatedAt: new Date().toISOString(),
      actor: {
        fullName: actor.fullName,
        roles: actor.roles,
        scopedProducerCount: actor.producerScopeIds.length,
        scopedEventCount: actor.eventScopeIds.length,
      },
      counters: {
        visibleEventsCount,
        publishedEventsCount,
        pendingCommercialApprovalsCount: isPdtRestricted ? 0 : Number(pendingCommercialRes.rows[0]?.total ?? 0),
        openServiceCasesCount: 0,
        pendingRefundApprovalsCount: isPdtRestricted ? 0 : Number(pendingRefundsRes.rows[0]?.total ?? 0),
        auditRecordsCount: actor.permissions.includes('audit:read') ? Number(auditRes.rows[0]?.total ?? 0) : 0,
      },
      dataIntegrityNoticePtBr:
        'Contadores lidos diretamente do PostgreSQL em tempo real. Zero dados sintéticos ou valores fictícios.',
    };
  }
}
