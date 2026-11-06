import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from './audit.service';
import { AuthGuard, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller(['api/v1/audit-records', 'v1/audit-records'])
@UseGuards(AuthGuard)
export class GovernanceController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit:read')
  async listAuditRecords(@Req() req: Request & { actor?: { userId: string; roles: string[]; sessionId: string } }) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    const items = await this.auditService.listRecords(100);

    if (req.actor) {
      await this.auditService.record({
        actorUserId: req.actor.userId,
        actorRole: req.actor.roles.join(','),
        sessionId: req.actor.sessionId,
        canonicalAction: 'audit.records.listed',
        resourceType: 'AuditRecord',
        outcome: 'SUCCESS',
        correlationId,
      });
    }

    return { items };
  }
}
