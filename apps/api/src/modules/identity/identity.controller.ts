import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IdentityService } from './identity.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { csrfForToken } from '../../common/auth/crypto.util';
import { normalizeRoleForPolicy, originAllowed } from '@bravo-ii/core-policy';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

const SESSION_COOKIE_NAME = 'bravo_session';

@Controller(['api/v1', 'v1'])
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  private setSessionCookie(res: Response, token: string, secure: boolean) {
    const parts = [
      `${SESSION_COOKIE_NAME}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${8 * 3600}`,
    ];
    if (secure) {
      parts.push('Secure');
    }
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  private clearSessionCookie(res: Response, secure: boolean) {
    const parts = [
      `${SESSION_COOKIE_NAME}=`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=0',
    ];
    if (secure) {
      parts.push('Secure');
    }
    res.setHeader('Set-Cookie', parts.join('; '));
  }

  @Post('auth/login')
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const originHeader = typeof req.headers['origin'] === 'string' ? req.headers['origin'] : undefined;
    const configuredOrigin = process.env.APP_ORIGIN || 'http://localhost:3000';
    if (originHeader && !originAllowed(originHeader, configuredOrigin)) {
      throw new ForbiddenException({
        code: 'INVALID_ORIGIN',
        message: 'Origem não autorizada para autenticação.',
      });
    }

    const secure = process.env.COOKIE_SECURE === 'true';
    if (process.env.NODE_ENV === 'production' && !secure) {
      throw new UnauthorizedException({
        code: 'COOKIE_SECURE_REQUIRED',
        message: 'COOKIE_SECURE deve ser true em produção.',
      });
    }

    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    const result = await this.identityService.login(body, correlationId, req.ip);

    this.setSessionCookie(res, result.token, secure);
    if (req.originalUrl.startsWith('/v1/')) {
      res.status(200);
    }

    return result;
  }

  @Post('auth/logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    if (req.actor) {
      await this.identityService.logout(req.actor, correlationId);
    }
    this.clearSessionCookie(res, process.env.COOKIE_SECURE === 'true');
    return { ok: true, status: 'revoked' };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const actor = req.actor!;
    const csrfToken = req.sessionToken ? csrfForToken(req.sessionToken) : '';
    return {
      ...actor,
      user: {
        id: actor.userId,
        email: actor.email,
        roles: Array.from(new Set([...actor.roles, ...actor.roles.map(normalizeRoleForPolicy)])),
        forcePasswordChange: false,
      },
      csrfToken,
    };
  }

  @Get('navigation')
  @UseGuards(AuthGuard)
  async navigation(@Req() req: AuthenticatedRequest) {
    const items = req.actor ? this.identityService.getNavigationForActor(req.actor) : [];
    return { items };
  }

  @Get('navegacao/menu')
  @UseGuards(AuthGuard)
  async menuP07(@Req() req: AuthenticatedRequest) {
    return this.identityService.getP07MenuForActor(req.actor!);
  }

  @Get('overview')
  @UseGuards(AuthGuard)
  @RequirePermission('overview:read')
  async overview(@Req() req: AuthenticatedRequest) {
    return this.identityService.getOperationalOverview(req.actor!);
  }
}
