import {Body,Controller,Get,Param,Patch,Post,UseFilters,UseGuards} from '@nestjs/common';
import {ApprovalStep,EventInput,FeeRule,LotShape,ProducerInput,SessionShape} from '@bravo-ii/domain-p06';
import {P06PrincipalGuard,Principal,Actor} from './security.js';
import {P06DomainFilter} from './domain.filter.js';
import {ProducersService} from './producers.service.js';
import {CommercialService} from './commercial.service.js';
import {EventsService} from './events.service.js';

@UseGuards(P06PrincipalGuard)
@UseFilters(P06DomainFilter)
@Controller('v1/comercial/produtores')
export class ProducersController {
  constructor(private readonly producers:ProducersService){}
  @Post() create(@Body()body:ProducerInput,@Principal()actor:Actor){return this.producers.create(body,actor);}
  @Get() list(@Principal()actor:Actor){return this.producers.list(actor);}
  @Get(':id') get(@Param('id')id:string,@Principal()actor:Actor){return this.producers.get(id,actor);}
  @Post(':id/documentos') attachDocument(@Param('id')id:string,@Body()body:{documentType:string;storageKey:string;checksum:string},@Principal()actor:Actor){return this.producers.attachDocument(id,body,actor);}
  @Post(':id/documentos/:docId/validar') validateDoc(@Param('id')id:string,@Param('docId')docId:string,@Principal()actor:Actor){return this.producers.validateDocument(id,docId,actor);}
  @Post(':id/validar') approve(@Param('id')id:string,@Principal()actor:Actor){return this.producers.verify(id,actor);}
}

@UseGuards(P06PrincipalGuard)
@UseFilters(P06DomainFilter)
@Controller('v1/comercial/eventos/:eventId/taxas')
export class FeesController {
  constructor(private readonly commercial:CommercialService){}
  @Get() list(@Param('eventId')id:string,@Principal()actor:Actor){return this.commercial.listForEvent(id,actor);}
  @Post() propose(@Param('eventId')id:string,@Body()body:FeeRule,@Principal()actor:Actor){return this.commercial.propose(id,body,actor);}
  @Post(':feeId/aprovar') approve(@Param('eventId')id:string,@Param('feeId')feeId:string,@Principal()actor:Actor){return this.commercial.approve(id,feeId,actor);}
}

@UseGuards(P06PrincipalGuard)
@UseFilters(P06DomainFilter)
@Controller('v1/eventos')
export class EventsController {
  constructor(private readonly events:EventsService){}
  @Get() list(@Principal()actor:Actor){return this.events.list(actor);}
  @Post() create(@Body()body:EventInput&{primaryProducerId:string},@Principal()actor:Actor){return this.events.create(body,actor);}
  @Get(':id') get(@Param('id')id:string,@Principal()actor:Actor){return this.events.get(id,actor);}
  @Patch(':id') edit(@Param('id')id:string,@Body()body:EventInput,@Principal()actor:Actor){return this.events.edit(id,body,actor);}
  @Post(':id/produtores-secundarios') secondary(@Param('id')id:string,@Body()body:{producerId:string},@Principal()actor:Actor){return this.events.addSecondaryProducer(id,body.producerId,actor);}
  @Post(':id/sessoes') session(@Param('id')id:string,@Body()body:SessionShape&{name:string},@Principal()actor:Actor){return this.events.addSession(id,body,actor);}
  @Post(':id/areas') area(@Param('id')id:string,@Body()body:{label:string;capacity:number;isNumbered:boolean;mapAssetKey?:string},@Principal()actor:Actor){return this.events.addArea(id,body,actor);}
  @Post(':id/areas/:areaId/assentos') seat(@Param('id')id:string,@Param('areaId')areaId:string,@Body()body:{row:string;number:string},@Principal()actor:Actor){return this.events.addSeat(id,areaId,body,actor);}
  @Post(':id/categorias') category(@Param('id')id:string,@Body()body:{name:string;description?:string;requiresProof?:boolean},@Principal()actor:Actor){return this.events.addCategory(id,body,actor);}
  @Post(':id/lotes') lot(@Param('id')id:string,@Body()body:LotShape&{sessionId:string;categoryId:string;areaId?:string},@Principal()actor:Actor){return this.events.addLot(id,body,actor);}
  @Post(':id/canais') channel(@Param('id')id:string,@Body()body:{channel:'ONLINE'|'PDV'|'BILHETERIA';enabled:boolean},@Principal()actor:Actor){return this.events.setChannel(id,body,actor);}
  @Post(':id/midias') media(@Param('id')id:string,@Body()body:{mediaType:string;storageKey:string;publicReady:boolean},@Principal()actor:Actor){return this.events.attachMedia(id,body,actor);}
  @Post(':id/enviar-analise') submit(@Param('id')id:string,@Principal()actor:Actor){return this.events.submit(id,actor);}
  @Post(':id/aprovacoes') approval(@Param('id')id:string,@Body()body:{step:ApprovalStep;decision:'APROVADO'|'REPROVADO';reason?:string},@Principal()actor:Actor){return this.events.approve(id,body.step,body.decision,body.reason,actor);}
  @Get(':id/pendencias') issues(@Param('id')id:string,@Principal()actor:Actor){return this.events.issues(id,actor);}
  @Post(':id/ocorrencias') openChange(@Param('id')id:string,@Body()body:{type:'ADIAMENTO'|'CANCELAMENTO'|'SUSPENSAO'|'ALTERACAO';reason:string},@Principal()actor:Actor){return this.events.requestChangeCase(id,body,actor);}
  @Post(':id/publicacoes/solicitar') publish(@Param('id')id:string,@Principal()actor:Actor){return this.events.requestPublication(id,actor);}
}
