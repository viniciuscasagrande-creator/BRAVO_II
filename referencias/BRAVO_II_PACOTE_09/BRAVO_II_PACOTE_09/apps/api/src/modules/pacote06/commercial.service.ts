import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {assertFeeCanBeApproved,assertProspectiveFeeChange,validateFee,FeeRule} from '@bravo-ii/domain-p06';
import {P06PrismaService} from './prisma.js';
import {Actor,requireInternal} from './security.js';

@Injectable()
export class CommercialService {
  constructor(private readonly db:P06PrismaService){}
  async listForEvent(eventId:string,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','FINANCEIRO_DISK','AUDITOR');
    return this.db.bravoEventFee.findMany({where:{eventId},orderBy:{version:'desc'}});
  }
  async propose(eventId:string,rule:FeeRule,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL');validateFee(rule);
    const event=await this.db.bravoEvent.findUnique({where:{id:eventId}});
    if(!event) throw new NotFoundException('Evento não encontrado');
    if(['PUBLICADO','PUBLICACAO_SOLICITADA','APROVADO'].includes(event.status)) assertProspectiveFeeChange(rule.effectiveFrom,new Date().toISOString());
    return this.db.$transaction(async tx=>{
      const last=await tx.bravoEventFee.findFirst({where:{eventId},orderBy:{version:'desc'}});
      const newFee=await tx.bravoEventFee.create({data:{eventId,version:(last?.version??0)+1,type:rule.type,percentBasisPoints:rule.type==='PERCENTUAL'?rule.percentBasisPoints:null,fixedCents:rule.type==='FIXA'?rule.fixedCents:null,effectiveFrom:new Date(rule.effectiveFrom),negotiationReference:rule.negotiationReference,proposedBy:actor.id}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'TAXA_EVENTO_PROPOSTA',resource:'EVENTO',resourceId:eventId,after:{feeId:newFee.id,version:newFee.version,type:newFee.type}}});
      return newFee;
    },{isolationLevel:'Serializable'});
  }
  async approve(eventId:string,feeId:string,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL');
    return this.db.$transaction(async tx=>{
      const event=await tx.bravoEvent.findUnique({where:{id:eventId}});if(!event)throw new NotFoundException();
      const fee=await tx.bravoEventFee.findFirst({where:{id:feeId,eventId}});if(!fee)throw new NotFoundException('Proposta não localizada');
      if(fee.status!=='PROPOSTA')throw new BadRequestException('A proposta não está pendente');
      assertFeeCanBeApproved(fee.proposedBy,actor.id,actor.roles.includes('COMERCIAL')?'COMERCIAL':'ADMIN');
      if(['PUBLICADO','PUBLICACAO_SOLICITADA','APROVADO'].includes(event.status)) assertProspectiveFeeChange(fee.effectiveFrom.toISOString(),new Date().toISOString());
      // Manter versões anteriores APROVADAS para consultas as-of e snapshots de vendas passadas.
      const approved=await tx.bravoEventFee.update({where:{id:feeId},data:{status:'APROVADA',approvedBy:actor.id,approvedAt:new Date()}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'TAXA_EVENTO_APROVADA',resource:'EVENTO',resourceId:eventId,after:{feeId,version:approved.version}}});
      await tx.bravoOutbox.create({data:{key:`fee-approved:${eventId}:v${fee.version}`,kind:'commercial.event_fee_approved.v1',payload:{eventId,feeVersion:fee.version,feeId}}});
      return approved;
    },{isolationLevel:'Serializable'});
  }
}
