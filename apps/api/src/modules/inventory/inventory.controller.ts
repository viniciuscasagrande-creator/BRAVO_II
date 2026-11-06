import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller(['api/v1', 'v1'])
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('events/:eventId/sectors/:sectorId/seats')
  @RequirePermission('event:write')
  async createSeatsBatch(
    @Param('eventId') eventId: string,
    @Param('sectorId') sectorId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    const items = await this.inventoryService.createSeatsBatch(
      eventId,
      sectorId,
      body,
      req.actor!,
      correlationId
    );
    return { items };
  }

  @Get('sessions/:sessionId/availability')
  async getSessionAvailability(@Param('sessionId') sessionId: string) {
    return this.inventoryService.getSessionAvailability(sessionId);
  }

  @Post('sessions/:sessionId/holds')
  async createHold(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.inventoryService.createHold(sessionId, body, req.actor!, correlationId);
  }
}
