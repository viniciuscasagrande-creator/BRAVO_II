import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IdentityService } from './identity.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('auth/login')
  async login(@Body() body: unknown, @Req() req: Request) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.identityService.login(body, correlationId, req.ip);
  }

  @Post('auth/logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    if (req.actor) {
      await this.identityService.logout(req.actor, correlationId);
    }
    return { status: 'revoked' };
  }

  @Get('auth/me')
  @UseGuards(AuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return req.actor;
  }

  @Get('navigation')
  @UseGuards(AuthGuard)
  async navigation(@Req() req: AuthenticatedRequest) {
    const items = req.actor ? this.identityService.getNavigationForActor(req.actor) : [];
    return { items };
  }

  @Get('overview')
  @UseGuards(AuthGuard)
  @RequirePermission('overview:read')
  async overview(@Req() req: AuthenticatedRequest) {
    return this.identityService.getOperationalOverview(req.actor!);
  }
}
