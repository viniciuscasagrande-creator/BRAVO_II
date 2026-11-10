import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, RequirePermission, type AuthenticatedRequest } from '../../common/auth/auth.guard';
import { ensureCorrelationId } from '@bravo-ii/telemetry';
import { EventsService } from '../events/events.service';
import { ProducerFinanceService } from './producer-finance.service';
@Controller(['api/v1/producer-portal','v1/producer-portal'])
@UseGuards(AuthGuard)
export class ProducerFinanceController {
  constructor(private readonly finance: ProducerFinanceService, private readonly events: EventsService) {}
  private producerActor(req:AuthenticatedRequest) {
    if(!req.actor!.roles.includes('PRODUTOR_PDT')) throw new ForbiddenException('Acesso exclusivo de produtor.');
    return {...req.actor!,roles:['PRODUTOR_PDT'] as ['PRODUTOR_PDT'],permissions:req.actor!.permissions.filter(p=>p!=='event-fee:read-internal')};
  }
  @Get('events')
  @RequirePermission('pdt:portal-read')
  async list(@Req() req:AuthenticatedRequest) {
    return {items:await this.events.listAuthorizedEvents(this.producerActor(req))};
  }
  @Get('events/:eventId')
  @RequirePermission('pdt:portal-read')
  async detail(@Req() req:AuthenticatedRequest,@Param('eventId') eventId:string) {
    const event=await this.events.getEventById(eventId,this.producerActor(req),ensureCorrelationId(req.headers['x-correlation-id']));
    // Projeção positiva: não transportar readiness, contas, aprovações ou histórico de taxas.
    return {id:event.id,title:event.title,code:event.code,venueName:event.venueName,city:event.city,stateUf:event.stateUf,
      timezone:event.timezone,status:event.status,startsAt:event.startsAt,sessions:event.sessions,sectors:event.sectors,priceLots:event.priceLots};
  }
  @Get('events/:eventId/finance')
  @RequirePermission('pdt:portal-read')
  statement(@Req() req:AuthenticatedRequest,@Param('eventId') eventId:string,@Query('offset') offset?:string) {
    return this.finance.statement(req.actor!,eventId,ensureCorrelationId(req.headers['x-correlation-id']),offset===undefined?0:Number(offset));
  }
}
