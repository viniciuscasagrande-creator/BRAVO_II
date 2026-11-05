import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('coupon-campaigns')
  @RequirePermission('coupon:read')
  async listCampaigns() {
    const items = await this.couponsService.listCampaigns();
    return { items };
  }

  @Post('coupon-campaigns')
  @RequirePermission('coupon:write')
  async createCampaign(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.couponsService.createCampaign(body, req.actor!, correlationId);
  }

  @Get('courtesy-quotas')
  @RequirePermission('coupon:read')
  async listCourtesyQuotas() {
    const items = await this.couponsService.listCourtesyQuotas();
    return { items };
  }

  @Post('courtesy-quotas')
  @RequirePermission('coupon:write')
  async createCourtesyQuota(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.couponsService.createCourtesyQuota(body, req.actor!, correlationId);
  }

  @Post('courtesy-quotas/:quotaId/issue')
  @RequirePermission('coupon:write')
  async issueCourtesyTicket(
    @Param('quotaId') quotaId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.couponsService.issueCourtesyTicket(quotaId, body, req.actor!, correlationId);
  }
}
