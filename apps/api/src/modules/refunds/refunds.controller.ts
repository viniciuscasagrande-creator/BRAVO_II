import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/refunds')
@UseGuards(AuthGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post(':refundId/approve')
  @RequirePermission('refund:approve')
  async approveRefund(@Param('refundId') refundId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.refundsService.approveRefundRequest(refundId, req.actor!, correlationId);
  }
}
