/** BRAVO_II P10 - transições de domínio puras. Nunca executar cobrança/estorno aqui. */
export type Role10='SAC'|'OPERACOES'|'FINANCEIRO_DISK'|'ADMIN'|'AUDITOR';
export type SacStatus='ABERTO'|'EM_ATENDIMENTO'|'AGUARDANDO_CLIENTE'|'ESCALADO'|'RESOLVIDO'|'FECHADO';
export type ChangeStatus='SOLICITADA'|'EM_ANALISE'|'APROVADA_OPERACAO'|'AGUARDANDO_PAGAMENTO'|'PRONTA_EXECUCAO'|'EXECUTADA'|'NEGADA'|'CANCELADA';
export type RefundStatus='SOLICITADO'|'EM_ANALISE'|'APROVADO_1'|'APROVADO_2'|'AGUARDANDO_CONECTOR'|'PROCESSANDO'|'CONCLUIDO'|'NEGADO'|'FALHOU';
export const SAC_FLOW:Record<SacStatus,readonly SacStatus[]>={
 ABERTO:['EM_ATENDIMENTO','ESCALADO','RESOLVIDO'],
 EM_ATENDIMENTO:['AGUARDANDO_CLIENTE','ESCALADO','RESOLVIDO'],
 AGUARDANDO_CLIENTE:['EM_ATENDIMENTO','ESCALADO'],
 ESCALADO:['EM_ATENDIMENTO','RESOLVIDO'],RESOLVIDO:['FECHADO','EM_ATENDIMENTO'],FECHADO:[]
};
export const CHANGE_FLOW:Record<ChangeStatus,readonly ChangeStatus[]>={
 SOLICITADA:['EM_ANALISE','CANCELADA'],EM_ANALISE:['APROVADA_OPERACAO','NEGADA'],
 APROVADA_OPERACAO:['AGUARDANDO_PAGAMENTO','PRONTA_EXECUCAO','CANCELADA'],
 AGUARDANDO_PAGAMENTO:['PRONTA_EXECUCAO','CANCELADA'],PRONTA_EXECUCAO:['EXECUTADA','CANCELADA'],
 EXECUTADA:[],NEGADA:[],CANCELADA:[]
};
export const REFUND_FLOW:Record<RefundStatus,readonly RefundStatus[]>={
 SOLICITADO:['EM_ANALISE','NEGADO'],EM_ANALISE:['APROVADO_1','NEGADO'],
 APROVADO_1:['APROVADO_2','NEGADO'],APROVADO_2:['AGUARDANDO_CONECTOR'],
 AGUARDANDO_CONECTOR:['PROCESSANDO','FALHOU'],PROCESSANDO:['CONCLUIDO','FALHOU'],
 CONCLUIDO:[],NEGADO:[],FALHOU:[]
};
export function checkTransition<T extends string>(map:Record<T,readonly T[]>,from:T,to:T):void{
 if(!map[from]?.includes(to))throw new Error(`Transição proibida: ${from} → ${to}`);
}
export function assertApproval(input:{requesterId:string;actorId:string;previousApproverIds:string[];status:RefundStatus}):1|2{
 const {requesterId,actorId,previousApproverIds,status}=input;
 if(!actorId||actorId===requesterId||previousApproverIds.includes(actorId))throw new Error('Aprovação exige pessoas distintas do solicitante e de aprovações anteriores');
 if(status==='EM_ANALISE')return 1;
 if(status==='APROVADO_1'&&previousApproverIds.length===1)return 2;
 throw new Error('Estorno fora da etapa de aprovação');
}
export function assertRefundAmount(orderTotal:number,otherActiveRefunds:number,amount:number):void{
 for(const n of [orderTotal,otherActiveRefunds,amount])if(!Number.isSafeInteger(n)||n<0)throw new Error('Valores devem ser centavos inteiros não negativos');
 if(amount===0||amount+otherActiveRefunds>orderTotal)throw new Error('Valor de estorno excede saldo disponível para devolução');
}
export function assertExchange(input:{ticketStatus:string;orderStatus:string;oldEventId:string;newEventId:string;sourceLotCents:number;targetLotCents:number;targetAvailable:number;seatNumbered:boolean;targetStartsAt:Date;now?:Date}):void{
 if(input.orderStatus!=='PAGO'||input.ticketStatus!=='EMITIDO')throw new Error('Ingresso já utilizado, não pago ou bloqueado');
 if(input.oldEventId!==input.newEventId)throw new Error('Mudança entre eventos diferentes requer fluxo específico');
 if(input.seatNumbered)throw new Error('Setor numerado exige seleção de assento e módulo de inventário');
 if(!Number.isSafeInteger(input.sourceLotCents)||!Number.isSafeInteger(input.targetLotCents)||input.sourceLotCents!==input.targetLotCents)throw new Error('Diferença de preço exige liquidação financeira específica');
 if(!Number.isInteger(input.targetAvailable)||input.targetAvailable<1)throw new Error('Sessão sem disponibilidade');
 if(input.targetStartsAt<= (input.now||new Date()))throw new Error('Sessão de destino já iniciou');
}
export function calculateSla(openedAt:Date,firstResponseMinutes:number,resolutionMinutes:number){
 if(!(openedAt instanceof Date)||!Number.isFinite(openedAt.getTime()))throw new Error('Data inválida');
 for(const n of [firstResponseMinutes,resolutionMinutes])if(!Number.isInteger(n)||n<=0||n>525600)throw new Error('Prazo inválido');
 if(resolutionMinutes<firstResponseMinutes)throw new Error('Resolução não pode anteceder primeira resposta');
 return {firstResponseDueAt:new Date(openedAt.getTime()+firstResponseMinutes*60000),resolutionDueAt:new Date(openedAt.getTime()+resolutionMinutes*60000)};
}
export function validateNote(value:unknown,label='Texto'):string{
 if(typeof value!=='string')throw new Error(`${label} inválido`);
 const text=value.trim();
 if(text.length<5||text.length>4000)throw new Error(`${label} deve ter entre 5 e 4000 caracteres`);
 return text;
}
export function assertRefundConnectorDisabled(env:Record<string,string|undefined>):void{
 if(env.BRAVO_ENV!=='HOMOLOGACAO'||env.ENABLE_REAL_REFUNDS!=='false')throw new Error('Conector de estorno desabilitado: ambiente não validado');
}
export const SUPPORT_CHANNELS=['TELEFONE','CHAT','EMAIL','WHATSAPP','INTERNO'] as const;
export const SUPPORT_PRIORITIES=['BAIXA','NORMAL','ALTA','CRITICA'] as const;
export const TICKET_REPLACEMENT_STATUS=['EMITIDO','SUBSTITUIDO','CANCELADO','VALIDADO'] as const;
