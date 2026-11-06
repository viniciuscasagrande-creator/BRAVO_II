import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {AdapterReceipt,assertConfirmedPayment,calculateLineTotal,expiresAt,formatTicketNumber,mayReserve,SalesRuleError,settlementCanonical,validateReservation} from '@bravo-ii/domain-p08';
import {CorePrismaService} from '../../core/prisma/prisma.service.js';
import {Actor,requireInternal} from '../pacote06/security.js';

export type ReserveInput={eventId:string;sessionId:string;lotId:string;customerId:string;quantity:number;channel:'ONLINE'|'PDV'|'BILHETERIA';idempotencyKey:string};
function asRequestError(fn:()=>void){try{fn();}catch(e){if(e instanceof SalesRuleError)throw new BadRequestException(e.message);throw e;}}
const includePublic={customer:{select:{fullName:true}},event:{select:{name:true}},session:{select:{name:true}},lot:{select:{name:true}},tickets:{select:{number:true,status:true,issuedAt:true}}} as const;
@Injectable()
export class BravoOrdersService {
  constructor(private readonly db:CorePrismaService){}
  async reserve(body:ReserveInput,actor:Actor,trustedPdv?:{terminalId:string;shiftId:string}){
    requireInternal(actor,'ADMIN','OPERACOES',...(trustedPdv?['PDV']:[]));
    asRequestError(()=>{validateReservation(body);});
    // Nenhum PDV e nenhum checkout de site foi conectado: prevenir pedidos que aparentem venda real nesses canais.
    if(body.channel==='BILHETERIA'||(body.channel==='PDV'&&!trustedPdv)||(body.channel==='ONLINE'&&trustedPdv))throw new ServiceUnavailableException('Canal ou terminal não homologado');
    if(body.channel==='ONLINE')requireInternal(actor,'ADMIN','OPERACOES');
    const requestHash=createHash('sha256').update(JSON.stringify({actor:actor.id,customerId:body.customerId,eventId:body.eventId,sessionId:body.sessionId,lotId:body.lotId,quantity:body.quantity,channel:body.channel,terminalId:trustedPdv?.terminalId,shiftId:trustedPdv?.shiftId})).digest('hex');
    const existing=await this.db.bravoSaleOrder.findUnique({where:{idempotencyKey:body.idempotencyKey}});
    if(existing){if(existing.requestHash!==requestHash)throw new ConflictException('Chave idempotente reutilizada com dados diferentes');return {id:existing.id,status:existing.status,expiresAt:existing.expiresAt,totalCents:existing.totalCents,reused:true};}
    const [customer,lot]=await Promise.all([
      this.db.bravoCustomer.findUnique({where:{id:body.customerId},select:{id:true}}),
      this.db.bravoPriceLot.findUnique({where:{id:body.lotId},include:{event:{include:{channels:true}},session:true,area:true}})
    ]);
    if(!customer)throw new NotFoundException('Cliente não localizado');
    if(!lot||lot.eventId!==body.eventId||lot.sessionId!==body.sessionId)throw new BadRequestException('Lote não pertence ao evento/sessão solicitados');
    const now=new Date();
    asRequestError(()=>{mayReserve({eventStatus:lot.event.status,lotStatus:lot.status,sessionStatus:lot.session.status,lotStartsAt:lot.startsAt,lotEndsAt:lot.endsAt,salesStartAt:lot.event.salesStartAt,eventStartsAt:lot.event.startsAt,now,enabledChannels:lot.event.channels.filter(c=>c.enabled).map(c=>c.channel),channel:body.channel,numbered:!!lot.area?.isNumbered});});
    let totalCents=0;
    asRequestError(()=>{totalCents=calculateLineTotal(lot.faceValueCents,body.quantity);});
    const exp=expiresAt(now);
    const execute=async()=>this.db.$transaction(async tx=>{
      // Impede corrida com alterações de status do evento durante a reserva.
      const locked=await tx.$queryRaw<{status:string}[]>`SELECT "status" FROM "BravoEvent" WHERE "id" = ${body.eventId}::uuid FOR SHARE`;
      if(locked[0]?.status!=='PUBLICADO')throw new ConflictException('Evento indisponível para vendas');
      // Atualização atômica no PostgreSQL. Não existe leitura separada do estoque para decidir.
      const updated=await tx.$executeRaw`UPDATE "BravoPriceLot" SET "reservedCount"="reservedCount"+${body.quantity} WHERE "id"=${body.lotId}::uuid AND "status"='ATIVO' AND "capacity"-"reservedCount"-"issuedCount">=${body.quantity}`;
      if(updated!==1)throw new ConflictException('Ingressos indisponíveis ou lote não liberado');
      const order=await tx.bravoSaleOrder.create({data:{customerId:body.customerId,eventId:body.eventId,sessionId:body.sessionId,lotId:body.lotId,channel:body.channel,quantity:body.quantity,unitCents:lot.faceValueCents,totalCents,status:'RESERVADO',idempotencyKey:body.idempotencyKey,requestHash,expiresAt:exp,createdBy:actor.id,pdvTerminalId:trustedPdv?.terminalId,pdvShiftId:trustedPdv?.shiftId}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'PEDIDO_RESERVADO',resource:'PEDIDO',resourceId:order.id,after:{eventId:body.eventId,lotId:body.lotId,quantity:body.quantity,totalCents,expiresAt:exp.toISOString()}}});
      return {id:order.id,status:order.status,expiresAt:order.expiresAt,totalCents:order.totalCents,reused:false};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    for(let attempt=0;attempt<3;attempt++){
      try{return await execute();}
      catch(e){
        if((e as {code?:string}).code==='P2002'){
          const already=await this.db.bravoSaleOrder.findUnique({where:{idempotencyKey:body.idempotencyKey}});
          if(already?.requestHash===requestHash)return {id:already.id,status:already.status,expiresAt:already.expiresAt,totalCents:already.totalCents,reused:true};
          throw new ConflictException('Chave idempotente já utilizada');
        }
        if((e as {code?:string}).code==='P2034'&&attempt<2)continue;
        throw e;
      }
    }
    throw new ConflictException('Conflito de concorrência no estoque');
  }
  async list(actor:Actor){requireInternal(actor,'ADMIN','OPERACOES','SAC','FINANCEIRO_DISK','AUDITOR');
    const orders=await this.db.bravoSaleOrder.findMany({orderBy:{createdAt:'desc'},take:100,select:{id:true,eventId:true,status:true,quantity:true,totalCents:true,channel:true,expiresAt:true,createdAt:true,event:{select:{name:true}},customer:{select:{fullName:true}}}});
    return {items:orders};
  }
  async get(id:string,actor:Actor){requireInternal(actor,'ADMIN','OPERACOES','SAC','FINANCEIRO_DISK','AUDITOR');
    const order=await this.db.bravoSaleOrder.findUnique({where:{id},include:includePublic});
    if(!order)throw new NotFoundException('Pedido não encontrado');return order;
  }
  async expireReserved(actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES');
    const ids=await this.db.bravoSaleOrder.findMany({where:{status:'RESERVADO',expiresAt:{lte:new Date()}},select:{id:true},orderBy:{expiresAt:'asc'},take:100});
    let expired=0;
    for(const orderId of ids.map(r=>r.id)){
      const result=await this.db.$transaction(async tx=>{
        const orders=await tx.$queryRaw<{id:string;status:string;expiresAt:Date;lotId:string;quantity:number}[]>`SELECT "id","status","expiresAt","lotId","quantity" FROM "BravoSaleOrder" WHERE "id"=${orderId}::uuid FOR UPDATE`;
        const order=orders[0];if(!order||order.status!=='RESERVADO'||order.expiresAt>new Date())return false;
        const changed=await tx.$executeRaw`UPDATE "BravoPriceLot" SET "reservedCount"="reservedCount"-${order.quantity} WHERE "id"=${order.lotId}::uuid AND "reservedCount">=${order.quantity}`;
        if(changed!==1)throw new ConflictException('Estoque inconsistente; requer auditoria');
        await tx.bravoSaleOrder.update({where:{id:orderId},data:{status:'EXPIRADO'}});
        await tx.bravoAudit.create({data:{actorId:actor.id,action:'RESERVA_EXPIRADA',resource:'PEDIDO',resourceId:orderId,after:{status:'EXPIRADO'}}});
        return true;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      if(result)expired++;
    }
    return {processed:ids.length,expired,remainingMayExist:ids.length===100};
  }
  async findTicket(number:string,actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES','SAC','AUDITOR');
    if(!/^\d{8}$/.test(number))throw new BadRequestException('Informe oito dígitos numéricos');
    const ticket=await this.db.bravoIssuedTicket.findUnique({where:{number},include:{order:{select:{id:true,status:true,customer:{select:{fullName:true}},event:{select:{id:true,name:true}},session:{select:{id:true,name:true}}}}}});
    if(!ticket)throw new NotFoundException('Ingresso não encontrado');
    return {number:ticket.number,status:ticket.status,issuedAt:ticket.issuedAt,orderId:ticket.orderId,event:ticket.order.event,session:ticket.order.session,customerName:ticket.order.customer.fullName};
  }
  async cancelUnpaid(id:string,actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES');
    return this.db.$transaction(async tx=>{
      const rows=await tx.$queryRaw<{id:string;status:string;lotId:string;quantity:number}[]>`SELECT "id","status","lotId","quantity" FROM "BravoSaleOrder" WHERE "id"=${id}::uuid FOR UPDATE`;
      const order=rows[0];if(!order)throw new NotFoundException('Pedido não encontrado');
      if(order.status==='CANCELADO')return {id,status:'CANCELADO',alreadyCancelled:true};
      if(order.status!=='RESERVADO')throw new ConflictException('Pedido liquidado ou expirado exige outro fluxo');
      const updated=await tx.$executeRaw`UPDATE "BravoPriceLot" SET "reservedCount"="reservedCount"-${order.quantity} WHERE "id"=${order.lotId}::uuid AND "reservedCount">=${order.quantity}`;
      if(updated!==1)throw new ConflictException('Estoque inconsistente');
      await tx.bravoSaleOrder.update({where:{id},data:{status:'CANCELADO'}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'RESERVA_CANCELADA',resource:'PEDIDO',resourceId:id}});
      return {id,status:'CANCELADO',alreadyCancelled:false};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
  /** INTERNAL ONLY: sem Controller. O adaptador futuro deve validar webhook do provedor,
   * gerar prova HMAC de seu processamento interno e chamar este serviço por canal autenticado.
   * Em homologação, a flag ENABLE_REAL_PAYMENTS=false bloqueia tudo. */
  async confirmVerifiedSettlement(receipt:AdapterReceipt){
    if(process.env.ENABLE_REAL_PAYMENTS!=='true')throw new ServiceUnavailableException('Liquidação real proibida neste ambiente');
    const secret=process.env.PAYMENT_ADAPTER_SIGNING_SECRET||'';
    if(secret.length<32)throw new ServiceUnavailableException('Assinatura do adaptador não configurada');
    if(!receipt||!receipt.provider||!receipt.providerRef||!receipt.orderId||!Number.isSafeInteger(receipt.amountCents)||receipt.amountCents<0||!/^[a-f\d]{64}$/i.test(receipt.signature))throw new BadRequestException('Comprovante inválido');
    const when=new Date(receipt.verifiedAt);
    if(Number.isNaN(when.getTime())||Math.abs(Date.now()-when.getTime())>5*60_000)throw new BadRequestException('Comprovante fora da janela');
    const expected=createHmac('sha256',secret).update(settlementCanonical(receipt)).digest();
    const provided=Buffer.from(receipt.signature,'hex');
    if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw new BadRequestException('Comprovante sem assinatura válida');
    return this.db.$transaction(async tx=>{
      const rows=await tx.$queryRaw<{id:string;status:string;lotId:string;eventId:string;sessionId:string;quantity:number;totalCents:number;expiresAt:Date}[]>`SELECT "id","status","lotId","eventId","sessionId","quantity","totalCents","expiresAt" FROM "BravoSaleOrder" WHERE "id"=${receipt.orderId}::uuid FOR UPDATE`;
      const order=rows[0];if(!order)throw new NotFoundException('Pedido não encontrado');
      if(order.status==='PAGO'){
        const previous=await tx.bravoPaymentConfirmation.findUnique({where:{orderId:order.id}});
        if(previous?.provider===receipt.provider&&previous.providerRef===receipt.providerRef&&previous.amountCents===receipt.amountCents)return {id:order.id,status:'PAGO',alreadyProcessed:true};
        throw new ConflictException('Confirmação divergente para pedido já liquidado');
      }
      const activeEvent=await tx.bravoEvent.findUnique({where:{id:order.eventId},select:{status:true}});
      if(activeEvent?.status!=='PUBLICADO')throw new ConflictException('Evento não pode receber nova liquidação automática');
      asRequestError(()=>assertConfirmedPayment({status:order.status as 'RESERVADO',expiresAt:order.expiresAt,totalCents:order.totalCents},{amountCents:receipt.amountCents,verified:true},new Date()));
      const change=await tx.$executeRaw`UPDATE "BravoPriceLot" SET "reservedCount"="reservedCount"-${order.quantity},"issuedCount"="issuedCount"+${order.quantity} WHERE "id"=${order.lotId}::uuid AND "reservedCount">=${order.quantity}`;
      if(change!==1)throw new ConflictException('Estoque inconsistente');
      await tx.bravoTicketSequence.upsert({where:{id:1},create:{id:1,lastNumber:0},update:{}});
      const sequence=await tx.bravoTicketSequence.update({where:{id:1},data:{lastNumber:{increment:order.quantity}}});
      const first=sequence.lastNumber-order.quantity+1;
      const ticketNumbers=Array.from({length:order.quantity},(_,i)=>formatTicketNumber(first+i));
      await tx.bravoIssuedTicket.createMany({data:ticketNumbers.map(number=>({number,orderId:order.id,eventId:order.eventId,sessionId:order.sessionId,lotId:order.lotId}))});
      await tx.bravoPaymentConfirmation.create({data:{orderId:order.id,provider:receipt.provider,providerRef:receipt.providerRef,amountCents:receipt.amountCents,evidenceHash:createHash('sha256').update(receipt.signature).digest('hex')}});
      await tx.bravoSaleOrder.update({where:{id:order.id},data:{status:'PAGO',confirmedAt:new Date()}});
      await tx.bravoOutbox.create({data:{key:`bravo-order-paid:${order.id}`,kind:'BRAVO_ORDER_PAID',payload:{orderId:order.id,eventId:order.eventId,totalCents:order.totalCents,provider:receipt.provider,providerRef:receipt.providerRef}}});
      await tx.bravoAudit.create({data:{actorId:'worker:adquirente',action:'PAGAMENTO_CONFIRMADO',resource:'PEDIDO',resourceId:order.id,after:{status:'PAGO',quantity:order.quantity,amountCents:order.totalCents}}});
      return {id:order.id,status:'PAGO',tickets:ticketNumbers.length,alreadyProcessed:false};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }
}
