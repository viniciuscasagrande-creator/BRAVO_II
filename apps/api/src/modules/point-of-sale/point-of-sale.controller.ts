import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PointOfSaleService } from './point-of-sale.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/pos')
@UseGuards(AuthGuard)
export class PointOfSaleController {
  constructor(private readonly posService: PointOfSaleService) {}

  @Get('terminals')
  async listTerminals() {
    const items = await this.posService.listTerminals();
    return { items };
  }

  @Post('terminals')
  @RequirePermission('order:write')
  async createTerminal(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.posService.createTerminal(body, req.actor!, correlationId);
  }

  @Get('cash-sessions')
  async listCashSessions() {
    const items = await this.posService.listCashSessions();
    return { items };
  }

  @Post('cash-sessions/open')
  @RequirePermission('order:write')
  async openCashSession(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.posService.openCashSession(body, req.actor!, correlationId);
  }

  @Post('cash-sessions/:cashSessionId/close')
  @RequirePermission('order:write')
  async closeCashSession(
    @Param('cashSessionId') cashSessionId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.posService.closeCashSession(cashSessionId, req.actor!, correlationId);
  }
}
