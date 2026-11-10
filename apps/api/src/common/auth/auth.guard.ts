import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { allowedAppOrigin } from './allowed-app-origin';
import { DatabaseService } from '../database/database.service';
import {
  compareSecret,
  csrfForToken,
  hashSessionToken,
  verifyStatelessCookieSessionToken,
} from './crypto.util';
import { assertCookieToken, isMutating } from '@bravo-ii/core-policy';
import type { AuthenticatedActorDto, PermissionCode, RoleCode } from '@bravo-ii/contracts';
import { AuditService } from '../../modules/governance/audit.service';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

export const REQUIRED_PERMISSION_KEY = 'bravo_required_permission';

export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

export interface AuthenticatedRequest extends Request {
  actor?: AuthenticatedActorDto;
  sessionToken?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly db: DatabaseService,
    private readonly reflector: Reflector,
    private readonly auditService: AuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);

    // Validação de Origin quando o cabeçalho Origin é enviado ou APP_ORIGIN está configurado em sessão por Cookie
    const originHeader = typeof req.headers['origin'] === 'string' ? req.headers['origin'] : undefined;
    const configuredOrigin = process.env.APP_ORIGIN;
    if (isMutating(req.method) && originHeader && (configuredOrigin || process.env.PRODUCER_PORTAL_ORIGIN) && !allowedAppOrigin(originHeader, configuredOrigin)) {
      throw new ForbiddenException({
        code: 'INVALID_ORIGIN',
        message: 'Origem não autorizada para mutação.',
      });
    }

    const authHeader = req.headers['authorization'];
    const cookieHeader = typeof req.headers['cookie'] === 'string' ? req.headers['cookie'] : undefined;
    const cookieToken = assertCookieToken(cookieHeader);

    let rawToken = '';
    let usingCookieAuth = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice('Bearer '.length).trim();
    } else if (cookieToken) {
      rawToken = cookieToken;
      usingCookieAuth = true;
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_REQUIRED',
        message: 'Sessão não autenticada. Faça login para acessar este recurso.',
      });
    }

    // Quando autenticado via cookie HttpOnly (bravo_session), exige Origin válido (se APP_ORIGIN ou PRODUCER_PORTAL_ORIGIN configurado) e X-CSRF-Token em métodos mutáveis
    if (usingCookieAuth && isMutating(req.method)) {
      if ((configuredOrigin || process.env.PRODUCER_PORTAL_ORIGIN) && !allowedAppOrigin(originHeader, configuredOrigin)) {
        throw new ForbiddenException({
          code: 'INVALID_ORIGIN',
          message: 'Origem não autorizada.',
        });
      }
      const providedCsrf = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
      if (!compareSecret(providedCsrf, csrfForToken(rawToken))) {
        throw new ForbiddenException({
          code: 'INVALID_CSRF_TOKEN',
          message: 'Token CSRF inválido ou ausente.',
        });
      }
    }

    const tokenHash = hashSessionToken(rawToken);
    let sessionRes = await this.db.query<{
      session_id: string;
      user_id: string;
      email: string;
      full_name: string;
      status: string;
      expires_at: string | Date;
      revoked_at: string | Date | null;
    }>(
      `SELECT
        s.id AS session_id,
        u.id AS user_id,
        u.email,
        u.full_name,
        u.status,
        s.expires_at,
        s.revoked_at
       FROM auth_sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      const claim = verifyStatelessCookieSessionToken(rawToken);
      if (claim) {
        const userLookup = await this.db.query<{ id: string }>(
          `SELECT id FROM users WHERE RIGHT(REPLACE(id::text, '-', ''), 8) = $1 LIMIT 1`,
          [claim.userIdTailHex]
        );
        if (userLookup.rows.length > 0) {
          const recoveredSessionId = `00000000-0000-4000-8000-${tokenHash.slice(0, 12)}`;
          await this.db.query(
            `INSERT INTO auth_sessions (id, user_id, token_hash, ip_address, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [recoveredSessionId, userLookup.rows[0].id, tokenHash, req.ip ?? null, claim.expiresAtIso]
          );
          sessionRes = await this.db.query(
            `SELECT
              s.id AS session_id,
              u.id AS user_id,
              u.email,
              u.full_name,
              u.status,
              s.expires_at,
              s.revoked_at
             FROM auth_sessions s
             INNER JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = $1`,
            [tokenHash]
          );
        }
      }
    }

    if (sessionRes.rows.length === 0) {
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_NOT_FOUND',
        message: 'Sessão inválida ou expirada.',
      });
    }

    const sessionRow = sessionRes.rows[0];
    const now = new Date();
    const expiresAt = new Date(sessionRow.expires_at);
    if (sessionRow.revoked_at !== null || expiresAt <= now || !['ACTIVE', 'ATIVO'].includes(sessionRow.status)) {
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_EXPIRED',
        message: 'Sua sessão expirou ou foi revogada. Autentique-se novamente.',
      });
    }

    const rolesRes = await this.db.query<{ role_code: RoleCode }>(
      `SELECT role_code FROM user_role_grants WHERE user_id = $1 ORDER BY role_code ASC`,
      [sessionRow.user_id]
    );
    const roles = rolesRes.rows.map((r) => r.role_code);

    const permsRes = await this.db.query<{ permission_code: PermissionCode }>(
      `SELECT DISTINCT rp.permission_code
       FROM user_role_grants urg
       INNER JOIN role_permissions rp ON rp.role_code = urg.role_code
       WHERE urg.user_id = $1
       ORDER BY rp.permission_code ASC`,
      [sessionRow.user_id]
    );
    const permissions = permsRes.rows.map((p) => p.permission_code);

    const prodScopesRes = await this.db.query<{ producer_id: string }>(
      `SELECT producer_id FROM user_producer_scopes WHERE user_id = $1`,
      [sessionRow.user_id]
    );
    const eventScopesRes = await this.db.query<{ event_id: string }>(
      `SELECT event_id FROM user_event_scopes WHERE user_id = $1`,
      [sessionRow.user_id]
    );

    const actor: AuthenticatedActorDto = {
      userId: sessionRow.user_id,
      email: sessionRow.email,
      fullName: sessionRow.full_name,
      roles,
      permissions,
      producerScopeIds: prodScopesRes.rows.map((r) => r.producer_id),
      eventScopeIds: eventScopesRes.rows.map((r) => r.event_id),
      sessionId: sessionRow.session_id,
    };

    req.actor = actor;
    req.sessionToken = rawToken;

    const requiredPermission =
      this.reflector.get<PermissionCode | undefined>(REQUIRED_PERMISSION_KEY, context.getHandler()) ??
      this.reflector.get<PermissionCode | undefined>(REQUIRED_PERMISSION_KEY, context.getClass());

    if (requiredPermission && !permissions.includes(requiredPermission)) {
      await this.auditService.record({
        actorUserId: actor.userId,
        actorRole: actor.roles.join(','),
        sessionId: actor.sessionId,
        canonicalAction: `auth.permission.denied:${requiredPermission}`,
        resourceType: 'HttpEndpoint',
        resourceId: `${req.method} ${req.originalUrl}`,
        outcome: 'DENIED',
        justification: `O perfil atual (${actor.roles.join(', ')}) não possui a permissão obrigatória '${requiredPermission}'.`,
        correlationId,
      });

      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSION',
        message: `Acesso negado: seu perfil não possui a permissão '${requiredPermission}' necessária para executar esta operação.`,
      });
    }

    return true;
  }
}
