import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { AuthGuard, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller('api/v1/tickets')
@UseGuards(AuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async listTickets(
    @Query('publicCode') publicCode?: string,
    @Query('eventId') eventId?: string
  ) {
    const items = await this.ticketsService.listTickets({ publicCode, eventId });
    return { items };
  }

  @Post(':ticketId/retry-delivery')
  async retryDelivery(@Param('ticketId') ticketId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ticketsService.retryTicketDelivery(ticketId, req.actor!, correlationId);
  }

  @Post(':ticketId/cancel')
  async cancelTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { reasonPtBr?: string } | undefined,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.ticketsService.cancelTicket(ticketId, body?.reasonPtBr, req.actor!, correlationId);
  }
}
