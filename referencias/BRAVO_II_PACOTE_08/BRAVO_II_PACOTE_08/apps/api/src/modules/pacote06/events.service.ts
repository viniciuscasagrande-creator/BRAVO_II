import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {assertCanApprove,assertCanEditEvent,assertCanRequestPublication,validateEvent,validateLot,validateSession,publicationCommand,readinessIssues,publicEventProjection,EventInput,SessionShape,LotShape,ApprovalStep,ApprovalRecord} from '@bravo-ii/domain-p06';
import {P06PrismaService} from './prisma.js';
import {Actor,requireInternal,roleForStep} from './security.js';

const steps:Record<ApprovalStep,string[]>={CADASTRAL:['CADASTRO','ADMIN'],COMERCIAL:['COMERCIAL','ADMIN'],OPERACIONAL:['OPERACOES','ADMIN'],PUBLICACAO:['PUBLICACAO','ADMIN']};
@Injectable()
export class EventsService {
  constructor(private readonly db:P06PrismaService){}
  async create(body:EventInput & {primaryProducerId:string},actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','OPERACOES');validateEvent(body);
    const producer=await this.db.bravoProducer.findUnique({where:{id:body.primaryProducerId}});if(!producer)throw new NotFoundException('Produtor principal não localizado');
    return this.db.$transaction(async tx=>{
      const event=await tx.bravoEvent.create({data:{name:body.name,description:body.description,venueName:body.venueName,venueCity:body.venueCity,venueState:body.venueState.toUpperCase(),startsAt:new Date(body.startAt),endsAt:new Date(body.endAt),salesStartAt:body.salesStartAt?new Date(body.salesStartAt):null,ageRating:body.ageRating,policyUrl:body.policyUrl,createdBy:actor.id,producers:{create:{producerId:body.primaryProducerId,role:'PRINCIPAL'}}}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'EVENTO_CRIADO',resource:'EVENTO',resourceId:event.id,after:{status:event.status,producerId:body.primaryProducerId}}});
      return event;
    });
  }
  async list(actor:Actor){requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR');return this.db.bravoEvent.findMany({select:{id:true,name:true,status:true,startsAt:true,endsAt:true,createdAt:true,producers:{select:{producer:{select:{legalName:true}},role:true}}},orderBy:{createdAt:'desc'},take:100});}
  async get(eventId:string,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO','FINANCEIRO_DISK','AUDITOR');
    const e=await this.fetch(eventId);
    // Permitimos detalhes operacionais mas nunca devolvemos documentos, dados bancários ou representante legal do produtor.
    const {fees,producers,media,...rest}=e;
    return {...rest,producers:producers.map(p=>({id:p.id,role:p.role,producer:{id:p.producer.id,legalName:p.producer.legalName,status:p.producer.status}})),
      media:media.map(m=>({id:m.id,mediaType:m.mediaType,publicReady:m.publicReady})),
      fees:actor.roles.some(r=>['ADMIN','COMERCIAL','FINANCEIRO_DISK','AUDITOR'].includes(r))?fees:[]};
  }
  private async fetch(id:string){const event=await this.db.bravoEvent.findUnique({where:{id},include:{producers:{include:{producer:true}},sessions:true,lots:true,areas:{include:{seats:true}},ticketCategories:true,channels:true,media:true,fees:true,approvals:true,publications:true}});if(!event)throw new NotFoundException('Evento não localizado');return event;}
  private async draft(eventId:string,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','OPERACOES');
    const event=await this.db.bravoEvent.findUnique({where:{id:eventId}});if(!event)throw new NotFoundException();
    assertCanEditEvent(event.status as never);return event;
  }
  async edit(eventId:string,patch:EventInput,actor:Actor){
    await this.draft(eventId,actor);validateEvent(patch);
    return this.db.$transaction(async tx=>{
      const event=await tx.bravoEvent.update({where:{id:eventId},data:{name:patch.name,description:patch.description,venueName:patch.venueName,venueCity:patch.venueCity,venueState:patch.venueState.toUpperCase(),startsAt:new Date(patch.startAt),endsAt:new Date(patch.endAt),salesStartAt:patch.salesStartAt?new Date(patch.salesStartAt):null,ageRating:patch.ageRating,policyUrl:patch.policyUrl,revision:{increment:1}}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'EVENTO_EDITADO',resource:'EVENTO',resourceId:eventId,after:{revision:event.revision}}});return event;
    });
  }
  async addSecondaryProducer(eventId:string,producerId:string,actor:Actor){
    await this.draft(eventId,actor);const prod=await this.db.bravoProducer.findUnique({where:{id:producerId}});if(!prod)throw new NotFoundException('Produtor não encontrado');
    return this.db.$transaction(async tx=>{
      const p=await tx.bravoEventProducer.create({data:{eventId,producerId,role:'SECUNDARIO'}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'PRODUTOR_VINCULADO',resource:'EVENTO',resourceId:eventId,after:{producerId,role:'SECUNDARIO'}}});return p;
    });
  }
  async addSession(eventId:string,body:SessionShape & {name:string},actor:Actor){
    const event=await this.draft(eventId,actor);
    validateSession(body,{startAt:event.startsAt.toISOString(),endAt:event.endsAt.toISOString()});
    return this.db.$transaction(async tx=>{
      const session=await tx.bravoEventSession.create({data:{eventId,name:body.name,startsAt:new Date(body.startsAt),endsAt:new Date(body.endsAt),capacity:body.capacity}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'SESSAO_CRIADA',resource:'EVENTO',resourceId:eventId,after:{sessionId:session.id,capacity:session.capacity}}});return session;
    });
  }
  async addArea(eventId:string,body:{label:string;capacity:number;isNumbered:boolean;mapAssetKey?:string},actor:Actor){
    await this.draft(eventId,actor);
    if(!body.label?.trim() || !Number.isSafeInteger(body.capacity)||body.capacity<=0)throw new BadRequestException('Área e capacidade inválidas');
    return this.db.$transaction(async tx=>{
      const area=await tx.bravoEventArea.create({data:{eventId,label:body.label,capacity:body.capacity,isNumbered:body.isNumbered,mapAssetKey:body.mapAssetKey}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'AREA_CRIADA',resource:'EVENTO',resourceId:eventId,after:{areaId:area.id}}});return area;
    });
  }
  async addSeat(eventId:string,areaId:string,body:{row:string;number:string},actor:Actor){
    await this.draft(eventId,actor);const area=await this.db.bravoEventArea.findFirst({where:{id:areaId,eventId}});if(!area)throw new NotFoundException('Área não encontrada');
    if(!area.isNumbered)throw new BadRequestException('Área não possui assentos numerados');
    if(!body.number?.trim())throw new BadRequestException('Número do assento obrigatório');
    return this.db.$transaction(async tx=>{
      const seat=await tx.bravoEventSeat.create({data:{areaId,row:body.row||'',number:body.number}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'ASSENTO_CRIADO',resource:'EVENTO',resourceId:eventId,after:{seatId:seat.id}}});return seat;
    });
  }
  async addCategory(eventId:string,body:{name:string;description?:string;requiresProof?:boolean},actor:Actor){
    await this.draft(eventId,actor);if(!body.name?.trim())throw new BadRequestException('Categoria obrigatória');
    return this.db.$transaction(async tx=>{
      const category=await tx.bravoTicketCategory.create({data:{eventId,name:body.name,description:body.description,requiresProof:!!body.requiresProof}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'CATEGORIA_CRIADA',resource:'EVENTO',resourceId:eventId,after:{categoryId:category.id}}});return category;
    });
  }
  async addLot(eventId:string,body:LotShape & {sessionId:string;categoryId:string;areaId?:string},actor:Actor){
    await this.draft(eventId,actor);validateLot(body);
    const [session,category,area]=await Promise.all([
      this.db.bravoEventSession.findFirst({where:{id:body.sessionId,eventId}}),
      this.db.bravoTicketCategory.findFirst({where:{id:body.categoryId,eventId}}),
      body.areaId?this.db.bravoEventArea.findFirst({where:{id:body.areaId,eventId}}):Promise.resolve(null)]);
    if(!session || !category || (body.areaId&&!area))throw new BadRequestException('Sessão, categoria ou área não pertence ao evento');
    const prior=await this.db.bravoPriceLot.aggregate({where:{eventId,sessionId:session.id},_sum:{capacity:true}});
    if((prior._sum.capacity||0)+body.capacity>session.capacity)throw new BadRequestException('Capacidade total dos lotes supera a sessão');
    return this.db.$transaction(async tx=>{
      const lot=await tx.bravoPriceLot.create({data:{eventId,sessionId:body.sessionId,categoryId:body.categoryId,areaId:body.areaId,name:body.name,faceValueCents:body.faceValueCents,capacity:body.capacity,startsAt:new Date(body.startsAt),endsAt:new Date(body.endsAt)}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'LOTE_CRIADO',resource:'EVENTO',resourceId:eventId,after:{lotId:lot.id,faceValueCents:lot.faceValueCents}}});return lot;
    },{isolationLevel:'Serializable'});
  }
  async setChannel(eventId:string,body:{channel:'ONLINE'|'PDV'|'BILHETERIA';enabled:boolean},actor:Actor){
    await this.draft(eventId,actor);
    if(!['ONLINE','PDV','BILHETERIA'].includes(body.channel))throw new BadRequestException('Canal inválido');
    return this.db.$transaction(async tx=>{
      const res=await tx.bravoEventChannel.upsert({where:{eventId_channel:{eventId,channel:body.channel}},create:{eventId,channel:body.channel,enabled:body.enabled},update:{enabled:body.enabled}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'CANAL_EVENTO_ALTERADO',resource:'EVENTO',resourceId:eventId,after:{channel:body.channel,enabled:body.enabled}}});return res;
    });
  }
  async attachMedia(eventId:string,body:{mediaType:string;storageKey:string;publicReady:boolean},actor:Actor){
    await this.draft(eventId,actor);if(!body.storageKey?.startsWith('secure://'))throw new BadRequestException('Usar storage privado até validação editorial');
    return this.db.$transaction(async tx=>{const x=await tx.bravoEventMedia.create({data:{eventId,mediaType:body.mediaType,storageKey:body.storageKey,publicReady:!!body.publicReady}});await tx.bravoAudit.create({data:{actorId:actor.id,action:'MIDIA_EVENTO_INSERIDA',resource:'EVENTO',resourceId:eventId,after:{mediaId:x.id}}});return x;});
  }
  async submit(eventId:string,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','OPERACOES');const e=await this.fetch(eventId);assertCanEditEvent(e.status as never);
    validateEvent({...e,venueState:e.venueState,startAt:e.startsAt.toISOString(),endAt:e.endsAt.toISOString(),salesStartAt:e.salesStartAt?.toISOString(),policyUrl:e.policyUrl});
    if(!e.producers.some(p=>p.role==='PRINCIPAL')) throw new BadRequestException('Produtor principal obrigatório');
    if(e.sessions.length===0||e.lots.length===0||!e.channels.some(c=>c.channel==='ONLINE'&&c.enabled))throw new BadRequestException('Preencha sessões, lotes e canal de venda online');
    return this.db.$transaction(async tx=>{
      const res=await tx.bravoEvent.update({where:{id:eventId},data:{status:'EM_ANALISE',submittedBy:actor.id,submittedAt:new Date()}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'EVENTO_ENVIADO_ANALISE',resource:'EVENTO',resourceId:eventId,after:{status:'EM_ANALISE'}}});return {id:res.id,status:res.status};
    });
  }
  async approve(eventId:string,step:ApprovalStep,decision:'APROVADO'|'REPROVADO',reason:string|undefined,actor:Actor){
    requireInternal(actor,'ADMIN','CADASTRO','COMERCIAL','OPERACOES','PUBLICACAO');
    const role=roleForStep(actor,steps[step]||[]);
    return this.db.$transaction(async tx=>{
      const e=await tx.bravoEvent.findUnique({where:{id:eventId},include:{approvals:true,fees:true,producers:{include:{producer:true}},sessions:true,lots:true,channels:true}});if(!e)throw new NotFoundException();
      if(e.status!=='EM_ANALISE')throw new ConflictException('Evento não está em análise');
      const prev:ApprovalRecord[]=e.approvals.filter(a=>a.revision===e.revision).map(a=>({step:a.step as ApprovalStep,actorId:a.actorId,decision:a.decision as 'APROVADO'|'REPROVADO'}));
      assertCanApprove(step,role as never,e.submittedBy||e.createdBy,actor.id,prev);
      if(decision==='REPROVADO' && !reason?.trim())throw new BadRequestException('Justificativa obrigatória para reprovação');
      if(step==='CADASTRAL' && !e.producers.some(p=>p.role==='PRINCIPAL'&&p.producer.status==='VALIDADO'))throw new BadRequestException('Produtora principal pendente de validação');
      if(step==='COMERCIAL' && !e.fees.some(f=>f.status==='APROVADA'&&f.effectiveFrom.getTime()<=(e.salesStartAt||e.startsAt).getTime())) throw new BadRequestException('Taxa Disk vigente não aprovada');
      if(step==='OPERACIONAL' && (!e.sessions.length||!e.lots.length||!e.channels.some(c=>c.channel==='ONLINE'&&c.enabled)))throw new BadRequestException('Estrutura operacional incompleta');
      const approval=await tx.bravoEventApproval.create({data:{eventId,revision:e.revision,step,decision,actorId:actor.id,reason}});
      const completed=decision==='APROVADO' && step==='PUBLICACAO';
      if(decision==='REPROVADO'||completed) await tx.bravoEvent.update({where:{id:eventId},data:{status:decision==='REPROVADO'?'REPROVADO':'APROVADO',approvedAt:completed?new Date():undefined}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'EVENTO_AVALIADO',resource:'EVENTO',resourceId:eventId,after:{step,decision,revision:e.revision},reason}});
      return {id:approval.id,eventId,step,decision,eventStatus:decision==='REPROVADO'?'REPROVADO':completed?'APROVADO':'EM_ANALISE'};
    },{isolationLevel:'Serializable'});
  }
  async issues(eventId:string,actor:Actor){requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO','OPERACOES','PUBLICACAO');const e=await this.fetch(eventId);return this.readyModel(e).issues;}
  private readyModel(e:Awaited<ReturnType<EventsService['fetch']>>){
    const presentApproved=e.fees.filter(f=>f.status==='APROVADA'&&f.effectiveFrom.getTime()<=(e.salesStartAt||e.startsAt).getTime()).sort((a,b)=>b.version-a.version)[0];
    const approvalRecords=e.approvals.filter(a=>a.revision===e.revision).map(a=>({step:a.step as ApprovalStep,actorId:a.actorId,decision:a.decision as 'APROVADO'|'REPROVADO'}));
    const model={status:e.status as never,producerVerified:e.producers.some(p=>p.role==='PRINCIPAL'&&p.producer.status==='VALIDADO'),primaryProducerCount:e.producers.filter(p=>p.role==='PRINCIPAL').length,event:{name:e.name,description:e.description,venueName:e.venueName,venueCity:e.venueCity,venueState:e.venueState,startAt:e.startsAt.toISOString(),endAt:e.endsAt.toISOString(),salesStartAt:e.salesStartAt?.toISOString(),ageRating:e.ageRating,policyUrl:e.policyUrl},sessions:e.sessions.map(s=>({startsAt:s.startsAt.toISOString(),endsAt:s.endsAt.toISOString(),capacity:s.capacity})),lots:e.lots.map(l=>({name:l.name,faceValueCents:l.faceValueCents,startsAt:l.startsAt.toISOString(),endsAt:l.endsAt.toISOString(),capacity:l.capacity})),channels:e.channels.filter(c=>c.enabled).map(c=>c.channel),approvedFeeCount:presentApproved?1:0,approvals:approvalRecords};
    return {model,issues:readinessIssues(model)};
  }
  async requestPublication(eventId:string,actor:Actor){
    requireInternal(actor,'ADMIN','PUBLICACAO');const e=await this.fetch(eventId);
    const {model}=this.readyModel(e);assertCanRequestPublication(model);
    const command=publicationCommand(e.id,e.revision);
    return this.db.$transaction(async tx=>{
      const prior=await tx.bravoPublication.findUnique({where:{idempotencyKey:command.idempotencyKey}});
      if(prior)return {id:prior.id,status:prior.status,alreadyExists:true};
      const current=await tx.bravoEvent.findUnique({where:{id:eventId}});
      if(current?.status!=='APROVADO')throw new ConflictException('Estado mudou; atualize antes de publicar');
      const publication=await tx.bravoPublication.create({data:{eventId,revision:e.revision,idempotencyKey:command.idempotencyKey,requestedBy:actor.id}});
      await tx.bravoOutbox.create({data:{key:command.idempotencyKey,kind:command.kind,payload:{eventId,revision:e.revision,destination:command.destination}}});
      await tx.bravoEvent.update({where:{id:eventId},data:{status:'PUBLICACAO_SOLICITADA'}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'PUBLICACAO_SOLICITADA',resource:'EVENTO',resourceId:eventId,after:{publicationId:publication.id,status:'PENDENTE_INTEGRACAO'}}});
      return {id:publication.id,status:publication.status,alreadyExists:false};
    },{isolationLevel:'Serializable'});
  }
  /** Endpoint interno deve ser acionado SOMENTE por worker autenticado após recibo assinado do site. */
  async confirmFromTrustedWorker(eventId:string,revision:number,externalPublicationId:string){
    if(!externalPublicationId?.trim())throw new BadRequestException('Comprovante externo obrigatório');
    return this.db.$transaction(async tx=>{
      const p=await tx.bravoPublication.findUnique({where:{eventId_revision:{eventId,revision}}});if(!p)throw new NotFoundException();
      if(p.status==='CONFIRMADA')return {status:p.status};
      await tx.bravoPublication.update({where:{id:p.id},data:{status:'CONFIRMADA',externalPublicationId,confirmedAt:new Date()}});
      await tx.bravoPriceLot.updateMany({where:{eventId,status:'RASCUNHO'},data:{status:'ATIVO'}});
      await tx.bravoEventSession.updateMany({where:{eventId,status:'RASCUNHO'},data:{status:'ATIVA'}});
      await tx.bravoEvent.update({where:{id:eventId},data:{status:'PUBLICADO'}});
      await tx.bravoAudit.create({data:{actorId:'worker:publishing',action:'PUBLICACAO_CONFIRMADA_EXTERNO',resource:'EVENTO',resourceId:eventId,after:{externalPublicationId,revision}}});
      return {status:'CONFIRMADA'};
    });
  }
  async publicProjectionForWorker(eventId:string){
    const e=await this.fetch(eventId);
    if(e.status!=='PUBLICACAO_SOLICITADA')throw new ConflictException('Evento sem publicação pendente');
    return publicEventProjection({id:e.id,status:e.status as never,event:{name:e.name,description:e.description,venueName:e.venueName,venueCity:e.venueCity,venueState:e.venueState,startAt:e.startsAt.toISOString(),endAt:e.endsAt.toISOString(),salesStartAt:e.salesStartAt?.toISOString(),ageRating:e.ageRating,policyUrl:e.policyUrl},sessions:e.sessions.map(s=>({startsAt:s.startsAt.toISOString(),endsAt:s.endsAt.toISOString(),capacity:s.capacity})),lots:e.lots.map(l=>({name:l.name,faceValueCents:l.faceValueCents,startsAt:l.startsAt.toISOString(),endsAt:l.endsAt.toISOString(),capacity:l.capacity}))});
  }
  async requestChangeCase(eventId:string,body:{type:'ADIAMENTO'|'CANCELAMENTO'|'SUSPENSAO'|'ALTERACAO';reason:string},actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES','COMERCIAL');
    if(!['ADIAMENTO','CANCELAMENTO','SUSPENSAO','ALTERACAO'].includes(body.type)||!body.reason?.trim()||body.reason.trim().length<10) throw new BadRequestException('Tipo ou justificativa de ocorrência inválida');
    const event=await this.db.bravoEvent.findUnique({where:{id:eventId}});if(!event)throw new NotFoundException('Evento não localizado');
    return this.db.$transaction(async tx=>{
      const caseRecord=await tx.bravoEventChangeCase.create({data:{eventId,type:body.type,reason:body.reason,requestedBy:actor.id}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'OCORRENCIA_EVENTO_ABERTA',resource:'EVENTO',resourceId:eventId,reason:body.reason,after:{caseId:caseRecord.id,type:body.type,status:'SOLICITADO'}}});
      // A criação de ocorrência NÃO altera status do evento, cancela ingresso ou inicia estorno.
      return {id:caseRecord.id,status:caseRecord.status,type:caseRecord.type};
    });
  }

}
