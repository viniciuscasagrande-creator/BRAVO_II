import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard, type AuthenticatedRequest, RequirePermission } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';

@Controller(['api/v1/events', 'v1/events'])
@UseGuards(AuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermission('event:read')
  async listEvents(@Req() req: AuthenticatedRequest) {
    const items = await this.eventsService.listAuthorizedEvents(req.actor!);
    return { items };
  }

  @Get(':eventId')
  @RequirePermission('event:read')
  async getEvent(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.getEventById(eventId, req.actor!, correlationId);
  }

  @Post()
  @RequirePermission('event:write')
  async createEvent(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.createEvent(body, req.actor!, correlationId);
  }

  @Post(':eventId/sessions')
  @RequirePermission('event:write')
  async addSession(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.addEventSession(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/sectors')
  @RequirePermission('event:write')
  async addSector(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.addEventSector(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/price-lots')
  @RequirePermission('event:write')
  async addPriceLot(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.addEventPriceLot(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/channels')
  @RequirePermission('event:write')
  async addChannel(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.addEventSalesChannel(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/submit')
  @RequirePermission('event:write')
  async submitEvent(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.submitEventForReview(eventId, req.actor!, correlationId);
  }

  @Post(':eventId/approve')
  @RequirePermission('event:approve')
  async approveEvent(
    @Param('eventId') eventId: string,
    @Body() body: { notes?: string } | undefined,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.approveEvent(eventId, body?.notes, req.actor!, correlationId);
  }

  @Post(':eventId/publish')
  @RequirePermission('event:publish')
  async publishEvent(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.publishEvent(eventId, req.actor!, correlationId);
  }

  @Get(':eventId/portal')
  @RequirePermission('event:read')
  async getProducerPortal(@Param('eventId') eventId: string, @Req() req: AuthenticatedRequest) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.getProducerEventPortal(eventId, req.actor!, correlationId);
  }

  @Post(':eventId/portal/repasses')
  @RequirePermission('event:read')
  async requestProducerPayout(
    @Param('eventId') eventId: string,
    @Body()
    body: {
      requestType?: 'REPASSE' | 'ANTECIPACAO';
      amountCents?: number;
      notes?: string;
    },
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.requestProducerPayout(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/portal/repasses/:payoutId/assinar')
  @RequirePermission('event:read')
  async signProducerPayout(
    @Param('eventId') eventId: string,
    @Param('payoutId') payoutId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.signProducerPayout(eventId, payoutId, req.actor!, correlationId);
  }

  @Post(':eventId/portal/transferencias')
  @RequirePermission('event:read')
  async requestProducerEventTransfer(
    @Param('eventId') eventId: string,
    @Body() body: { targetEventId?: string; amountCents?: number; reason?: string },
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.requestProducerEventTransfer(eventId, body, req.actor!, correlationId);
  }

  @Post(':eventId/portal/registros')
  @RequirePermission('event:read')
  async createProducerPortalItem(
    @Param('eventId') eventId: string,
    @Body()
    body: {
      category?:
        | 'MARKETING_CAMPANHA'
        | 'MARKETING_MATERIAL'
        | 'ALTERACAO_EVENTO'
        | 'OPERACAO_EVENTO'
        | 'ATENDIMENTO_EVENTO'
        | 'EQUIPE_ACESSOS';
      title?: string;
      detail?: string;
    },
    @Req() req: AuthenticatedRequest
  ) {
    const correlationId = ensureCorrelationId(req.headers['x-correlation-id']);
    return this.eventsService.createProducerPortalItem(eventId, body, req.actor!, correlationId);
  }
}
