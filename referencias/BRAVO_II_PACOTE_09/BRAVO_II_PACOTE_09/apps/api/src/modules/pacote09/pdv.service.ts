import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {assertPdvTerminal,assertShiftMayOpen,CheckoutRuleError} from '@bravo-ii/domain-p09';
import {CorePrismaService} from '../../core/prisma/prisma.service.js';
import {Actor,requireInternal} from '../pacote06/security.js';
import {BravoOrdersService,ReserveInput} from '../pacote08/order.service.js';
@Injectable()
export class BravoPdvService {
 constructor(private readonly db:CorePrismaService,private readonly orders:BravoOrdersService){}
 async list(actor:Actor){requireInternal(actor,'ADMIN','OPERACOES','PDV','AUDITOR');return {items:await this.db.bravoPdvTerminal.findMany({orderBy:{createdAt:'desc'},select:{id:true,code:true,label:true,venue:true,status:true,createdAt:true},take:100})};}
 async register(data:{code:string;label:string;venue:string},actor:Actor){
  requireInternal(actor,'ADMIN');
  let input:ReturnType<typeof assertPdvTerminal>;
  try{input=assertPdvTerminal(data);}catch(e){if(e instanceof CheckoutRuleError)throw new BadRequestException(e.message);throw e;}
  return this.db.$transaction(async tx=>{
   const terminal=await tx.bravoPdvTerminal.create({data:{...input,status:'BLOQUEADO_HOMOLOGACAO',createdBy:actor.id}});
   await tx.bravoAudit.create({data:{actorId:actor.id,action:'PDV_TERMINAL_REGISTRADO',resource:'PDV',resourceId:terminal.id,after:{code:terminal.code,status:terminal.status}}});
   return {id:terminal.id,code:terminal.code,status:terminal.status};
  });
 }
 async openShift(terminalId:string,actor:Actor){
  requireInternal(actor,'ADMIN','OPERACOES','PDV');
  if(process.env.ENABLE_PDV_OPERATIONS!=='true')throw new ServiceUnavailableException('Turnos bloqueados até homologação do PDV');
  return this.db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<{status:string}[]>`SELECT "status" FROM "BravoPdvTerminal" WHERE "id"=${terminalId}::uuid FOR UPDATE`;
   if(!rows.length)throw new NotFoundException('Terminal não localizado');
   const existing=await tx.bravoPdvShift.findFirst({where:{terminalId,status:'ABERTO'}});
   try{assertShiftMayOpen(rows[0].status,!!existing,actor.roles.some(role=>['ADMIN','OPERACOES','PDV'].includes(role)),true);}catch(e){if(e instanceof CheckoutRuleError)throw new ConflictException(e.message);throw e;}
   const shift=await tx.bravoPdvShift.create({data:{terminalId,operatorId:actor.id,status:'ABERTO'}});
   await tx.bravoAudit.create({data:{actorId:actor.id,action:'PDV_TURNO_ABERTO',resource:'PDV_TURNO',resourceId:shift.id}});
   return {id:shift.id,status:shift.status};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async closeShift(shiftId:string,actor:Actor){
  requireInternal(actor,'ADMIN','OPERACOES','PDV');
  return this.db.$transaction(async tx=>{
   const rows=await tx.$queryRaw<{operatorId:string;status:string}[]>`SELECT "operatorId","status" FROM "BravoPdvShift" WHERE "id"=${shiftId}::uuid FOR UPDATE`;
   const shift=rows[0];if(!shift)throw new NotFoundException('Turno não localizado');
   if(shift.operatorId!==actor.id&&!actor.roles.includes('ADMIN'))throw new ConflictException('Turno pertence a outro operador');
   if(shift.status!=='ABERTO')return {id:shiftId,status:shift.status,alreadyClosed:true};
   await tx.bravoPdvShift.update({where:{id:shiftId},data:{status:'FECHADO',closedAt:new Date()}});
   await tx.bravoAudit.create({data:{actorId:actor.id,action:'PDV_TURNO_FECHADO',resource:'PDV_TURNO',resourceId:shiftId}});
   return {id:shiftId,status:'FECHADO',alreadyClosed:false};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async reserve(terminalId:string,shiftId:string,body:Omit<ReserveInput,'channel'>,actor:Actor){
  requireInternal(actor,'ADMIN','OPERACOES','PDV');
  if(process.env.ENABLE_PDV_OPERATIONS!=='true')throw new ServiceUnavailableException('Vendas PDV bloqueadas até homologação');
  const shift=await this.db.bravoPdvShift.findUnique({where:{id:shiftId},include:{terminal:true}});
  if(!shift||shift.terminalId!==terminalId||shift.operatorId!==actor.id||shift.status!=='ABERTO'||shift.terminal.status!=='ATIVO')throw new ConflictException('Terminal/turno não autenticado');
  return this.orders.reserve({...body,channel:'PDV'},actor,{terminalId,shiftId});
 }
}
