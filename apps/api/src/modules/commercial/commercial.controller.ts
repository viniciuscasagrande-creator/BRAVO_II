import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommercialService } from './commercial.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller(['api/v1/events/:eventId', 'v1/events/:eventId'])
@UseGuards(AuthGuard)
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  @Post('fee-agreements')
  @RequirePermission('event-fee:propose')
  async proposeFeeAgreement(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.commercialService.proposeEventFeeAgreement(eventId, body, req.actor!, correlationId);
  }

  @Post('fee-agreements/:version/approve')
  @RequirePermission('event-fee:approve')
  async approveFeeAgreement(
    @Param('eventId') eventId: string,
    @Param('version') version: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.commercialService.approveEventFeeAgreement(
      eventId,
      Number(version),
      body,
      req.actor!,
      correlationId
    );
  }

  @Post('fee-snapshots')
  @RequirePermission('event-fee:read-internal')
  async createSnapshot(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.commercialService.createFeeSnapshotForEvent(eventId, body, req.actor!, correlationId);
  }

  @Get('fee-snapshots')
  @RequirePermission('event-fee:read-internal')
  async listSnapshots(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
    const items = await this.commercialService.listFeeSnapshotsForEvent(eventId, req.actor!);
    return { items };
  }
}
