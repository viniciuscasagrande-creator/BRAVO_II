import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {assertAttemptAllowed,assertPagbankSandbox,assertSandboxCheckoutId,CheckoutRuleError,providerStatusReadOnly,safeSandboxPayload,validateCheckoutInput} from '@bravo-ii/domain-p09';
import {CorePrismaService} from '../../core/prisma/prisma.service.js';
import {Actor,requireInternal} from '../pacote06/security.js';

type AttemptInput={provider:string;method:string;idempotencyKey:string};
const SANDBOX_BASE='https://sandbox.api.pagseguro.com';
function adapt<T>(fn:()=>T):T{try{return fn();}catch(e){if(e instanceof CheckoutRuleError)throw new BadRequestException(e.message);throw e;}}
function safeCode(value:string){return String(value).slice(0,80).replace(/[^A-Za-z0-9_-]/g,'_');}
@Injectable()
export class BravoCheckoutService {
 constructor(private readonly db:CorePrismaService){}
 async list(orderId:string,actor:Actor){
  requireInternal(actor,'ADMIN','OPERACOES','FINANCEIRO_DISK','AUDITOR');
  const order=await this.db.bravoSaleOrder.findUnique({where:{id:orderId},select:{id:true,status:true,totalCents:true,channel:true}});
  if(!order)throw new NotFoundException('Pedido não localizado');
  const items=await this.db.bravoCheckoutAttempt.findMany({where:{orderId},orderBy:{createdAt:'desc'},select:{id:true,provider:true,method:true,status:true,amountCents:true,sandboxCheckoutId:true,lastError:true,createdAt:true}});
  return {order,items,warning:'Consulta de homologação. Nenhum pagamento ou ingresso foi confirmado por este módulo.'};
 }
 async prepare(orderId:string,body:AttemptInput,actor:Actor){
  requireInternal(actor,'ADMIN','OPERACOES');
  const value=adapt(()=>validateCheckoutInput(body));
  const digest=createHash('sha256').update(JSON.stringify({orderId,provider:value.provider,method:value.method})).digest('hex');
  try{return await this.db.$transaction(async tx=>{
   const locked=await tx.$queryRaw<{id:string;status:string;expiresAt:Date;totalCents:number;channel:string}[]>`SELECT "id","status","expiresAt","totalCents","channel" FROM "BravoSaleOrder" WHERE "id"=${orderId}::uuid FOR UPDATE`;
   const order=locked[0];if(!order)throw new NotFoundException('Pedido não encontrado');
   adapt(()=>assertAttemptAllowed(order,new Date()));
   const existing=await tx.bravoCheckoutAttempt.findFirst({where:{OR:[{idempotencyKey:value.idempotencyKey},{orderId}]}});
   if(existing){if(existing.idempotencyKey===value.idempotencyKey&&existing.requestHash===digest)return {id:existing.id,status:existing.status,alreadyCreated:true,amountCents:existing.amountCents};throw new ConflictException('Pedido já tem tentativa ou chave usada com outro conteúdo');}
   const attempt=await tx.bravoCheckoutAttempt.create({data:{orderId,idempotencyKey:value.idempotencyKey,provider:value.provider,method:value.method,requestHash:digest,amountCents:order.totalCents,createdBy:actor.id,status:'PENDENTE_HOMOLOGACAO'}});
   await tx.bravoAudit.create({data:{actorId:actor.id,action:'CHECKOUT_TENTATIVA_PREPARADA',resource:'PEDIDO',resourceId:orderId,after:{attemptId:attempt.id,provider:value.provider,method:value.method,amountCents:order.totalCents,status:attempt.status}}});
   return {id:attempt.id,status:attempt.status,alreadyCreated:false,amountCents:attempt.amountCents};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}catch(e){if((e as {code?:string}).code==='P2002')throw new ConflictException('Tentativa já registrada; consulte o pedido');throw e;}
 }
 /** SOMENTE sandbox oficial; nunca captura, confirma pedido, processa webhook ou emite ingresso. */
 async startPagbankSandbox(attemptId:string,actor:Actor){
  requireInternal(actor,'ADMIN');
  const token=adapt(()=>assertPagbankSandbox(process.env));
  const attempt=await this.db.bravoCheckoutAttempt.findUnique({where:{id:attemptId},include:{order:{include:{lot:true}}}});
  if(!attempt)throw new NotFoundException('Tentativa não localizada');
  if(attempt.provider!=='PAGBANK'||attempt.method!=='PIX'||attempt.order.channel!=='ONLINE')throw new BadRequestException('Sandbox limitado a PIX PagBank e pedidos ONLINE');
  adapt(()=>assertAttemptAllowed(attempt.order,new Date()));
  const payload=adapt(()=>safeSandboxPayload({id:attempt.order.id,quantity:attempt.order.quantity,unitCents:attempt.order.unitCents,totalCents:attempt.order.totalCents,expiresAt:attempt.order.expiresAt,lot:attempt.order.lot}));
  const locked=await this.db.bravoCheckoutAttempt.updateMany({where:{id:attemptId,status:'PENDENTE_HOMOLOGACAO'},data:{status:'ENVIANDO_SANDBOX'}});
  if(locked.count!==1)throw new ConflictException('Tentativa enviada ou resultado incerto; NÃO reenviar automaticamente');
  try{
   const response=await fetch(`${SANDBOX_BASE}/checkouts`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw new Error(`HTTP_${response.status}`);
   const data=await response.json() as {id?:string};
   const ref=adapt(()=>assertSandboxCheckoutId(data.id||''));
   await this.db.bravoCheckoutAttempt.update({where:{id:attemptId},data:{status:'CRIADO_SANDBOX',sandboxCheckoutId:ref}});
   await this.db.bravoAudit.create({data:{actorId:actor.id,action:'CHECKOUT_PAGBANK_SANDBOX_CRIADO',resource:'CHECKOUT',resourceId:attemptId,after:{sandboxCheckoutId:ref,status:'CRIADO_SANDBOX'}}});
   return {id:attemptId,status:'CRIADO_SANDBOX',sandboxCheckoutId:ref,paid:false,issuedTickets:0};
  }catch(e){
   await this.db.bravoCheckoutAttempt.update({where:{id:attemptId},data:{status:'RESULTADO_INDETERMINADO',lastError:safeCode((e as Error).message)}}).catch(()=>{});
   throw new ServiceUnavailableException('Criação sandbox incerta; consultar manualmente antes de qualquer nova tentativa');
  }
 }
 async consultPagbankSandbox(attemptId:string,actor:Actor){
  requireInternal(actor,'ADMIN','FINANCEIRO_DISK','AUDITOR');
  const token=adapt(()=>assertPagbankSandbox(process.env));
  const attempt=await this.db.bravoCheckoutAttempt.findUnique({where:{id:attemptId}});
  if(!attempt||attempt.provider!=='PAGBANK'||!attempt.sandboxCheckoutId)throw new NotFoundException('Checkout sandbox não localizado');
  const ref=adapt(()=>assertSandboxCheckoutId(attempt.sandboxCheckoutId!));
  try{
   const response=await fetch(`${SANDBOX_BASE}/checkouts/${encodeURIComponent(ref)}`,{headers:{Authorization:`Bearer ${token}`,accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw new Error(`HTTP_${response.status}`);
   const body=await response.json() as {status?:string;id?:string};
   if(body.id!==ref)throw new Error('IDENTIFICADOR_DIVERGENTE');
   return {id:attemptId,sandboxCheckoutId:ref,provider:'PAGBANK',...providerStatusReadOnly(body.status),notice:'Consulta informativa. Não liquida pedido nem emite ingresso.'};
  }catch{throw new ServiceUnavailableException('Consulta sandbox indisponível; pedido original não foi alterado');}
 }
}
