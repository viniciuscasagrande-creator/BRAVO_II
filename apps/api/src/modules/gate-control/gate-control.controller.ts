import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { GateControlService } from './gate-control.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/checkins')
@UseGuards(AuthGuard)
export class GateControlController {
  constructor(private readonly gateControlService: GateControlService) {}

  @Post('validate')
  @RequirePermission('checkin:validate')
  async validateCheckin(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.gateControlService.validateCheckin(body, req.actor!, correlationId);
  }
}
