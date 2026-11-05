/** BRAVO_II — pacote 06. Regras puras: sem rede, sem banco, sem dados simulados. */
export type DiskRole = 'ADMIN'|'COMERCIAL'|'CADASTRO'|'OPERACOES'|'PUBLICACAO'|'FINANCEIRO_DISK'|'AUDITOR'|'PRODUTOR';
export type FeeKind = 'PERCENTUAL'|'FIXA';
export type ApprovalStep = 'CADASTRAL'|'COMERCIAL'|'OPERACIONAL'|'PUBLICACAO';
export const REQUIRED_APPROVALS: readonly ApprovalStep[] = ['CADASTRAL','COMERCIAL','OPERACIONAL','PUBLICACAO'];
export type EventStatus = 'RASCUNHO'|'EM_ANALISE'|'APROVADO'|'PUBLICACAO_SOLICITADA'|'PUBLICADO'|'REPROVADO'|'SUSPENSO'|'ADIADO'|'CANCELADO'|'ENCERRADO';
export class DomainError extends Error { constructor(public code: string, message: string) { super(message); this.name='DomainError'; } }
const must=(test:unknown, code:string, message:string): asserts test => { if(!test) throw new DomainError(code,message); };
export function ensure(test:unknown,code:string,message:string): void { if(!test) throw new DomainError(code,message); }
/** CNPJ numérico legado e alfanumérico (padrão Receita Federal em produção desde julho/2026).
 * Os 12 caracteres-base são 0-9/A-Z, os dois últimos dígitos verificadores continuam numéricos.
 * Fonte técnica oficial: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 */
export function normalizeCnpj(raw:string):string { return typeof raw==='string'?raw.toUpperCase().replace(/[.\/\-\s]/g,''):''; }
export function isValidCnpj(raw:string):boolean {
  const cnpj=normalizeCnpj(raw);
  if(!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)|| /^(.)\1{13}$/.test(cnpj)) return false;
  const verify=(length:number):number=>{
    let weight=length===12?5:6,sum=0;
    for(let i=0;i<length;i++){
      sum+=(cnpj.charCodeAt(i)-48)*weight;
      weight=weight===2?9:weight-1;
    }
    const mod=sum%11;return mod<2?0:11-mod;
  };
  return verify(12)===Number(cnpj[12])&&verify(13)===Number(cnpj[13]);
}
export interface ProducerInput { legalName:string; tradeName?:string; cnpj:string; email:string; phone:string; address:{street:string; number:string; district:string; city:string; state:string; postalCode:string}; legalRepresentative:{name:string; email:string; role:string}; }
export function validateProducer(p:ProducerInput):void {
  ensure(p && typeof p==='object','DADOS','Informações da produtora são obrigatórias');
  ensure(isValidCnpj(p.cnpj),'CNPJ_INVALIDO','CNPJ inválido');
  ensure(p.legalName?.trim().length>=3,'RAZAO_SOCIAL','Razão social obrigatória');
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email||''),'EMAIL','E-mail inválido');
  ensure((p.phone||'').replace(/\D/g,'').length>=10,'TELEFONE','Telefone obrigatório');
  ensure(!!p.address && !!p.address.street?.trim() && !!p.address.number?.trim() && !!p.address.city?.trim() && /^[A-Za-z]{2}$/.test(p.address.state||''),'ENDERECO','Endereço da produtora incompleto');
  ensure(!!p.legalRepresentative && !!p.legalRepresentative.name?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.legalRepresentative.email||''),'REPRESENTANTE','Representante legal incompleto');
}
export interface FeeRule { type:FeeKind; percentBasisPoints?:number|null; fixedCents?:number|null; effectiveFrom:string; negotiationReference:string; }
export function validateFee(f:FeeRule):void {
  ensure(f && (f.type==='PERCENTUAL'||f.type==='FIXA'),'TIPO_TAXA','Taxa deve ser percentual ou fixa');
  ensure(!!f.negotiationReference?.trim(),'NEGOCIACAO','Referência de negociação obrigatória');
  ensure(isFiniteDate(f.effectiveFrom),'VIGENCIA','Data de vigência obrigatória');
  if(f.type==='PERCENTUAL') {
    ensure(Number.isSafeInteger(f.percentBasisPoints) && Number(f.percentBasisPoints)>=0 && Number(f.percentBasisPoints)<=10000,'PERCENTUAL','Percentual em pontos-base deve estar entre 0 e 10000');
    ensure(f.fixedCents==null,'TAXA_EXCLUSIVA','Taxa percentual não pode ter valor fixo');
  } else {
    ensure(Number.isSafeInteger(f.fixedCents) && Number(f.fixedCents)>=0,'VALOR_FIXO','Valor fixo deve ser em centavos e não negativo');
    ensure(f.percentBasisPoints==null,'TAXA_EXCLUSIVA','Taxa fixa não pode ter percentual');
  }
}
export function calculateFeeCents(ticketFaceValueCents:number, fee:FeeRule):number {
  validateFee(fee);
  ensure(Number.isSafeInteger(ticketFaceValueCents)&&ticketFaceValueCents>=0,'PRECO','Valor do ingresso inválido');
  if(fee.type==='FIXA') return fee.fixedCents!;
  // arredondamento half-up para centavos, sem floating-point de moeda
  return Number((BigInt(ticketFaceValueCents)*BigInt(fee.percentBasisPoints!)+5000n)/10000n);
}
export function assertFeeCanBeApproved(proposerId:string,approverId:string,role:DiskRole):void {
  ensure(role==='COMERCIAL'||role==='ADMIN','PAPEL_TAXA','Somente Comercial autorizado aprova taxas');
  ensure(proposerId!==approverId,'AUTOAPROVACAO','Quem propôs a taxa não pode aprová-la');
}
export function assertFeeBelongsToEvent(feeEventId:string,eventId:string):void { ensure(feeEventId===eventId,'TAXA_EVENTO','Taxa de outro evento não pode ser utilizada'); }
export function assertProspectiveFeeChange(effectiveFrom:string,now:string):void { ensure(Date.parse(effectiveFrom)>Date.parse(now),'VIGENCIA_RETROATIVA','Nova versão de taxa não pode alterar vendas passadas'); }
export function isFiniteDate(s:string):boolean {return typeof s==='string' && s.trim().length>0 && Number.isFinite(Date.parse(s));}
export interface EventInput { name:string; description:string; venueName:string; venueCity:string; venueState:string; startAt:string; endAt:string; salesStartAt?:string; ageRating:string; policyUrl:string; }
export function validateEvent(e:EventInput):void {
  ensure(e.name?.trim().length>=4,'EVENTO_NOME','Nome do evento obrigatório');
  ensure(e.description?.trim().length>=15,'DESCRICAO','Descrição do evento obrigatória (mínimo de 15 caracteres)');
  ensure(!!e.venueName?.trim()&&!!e.venueCity?.trim()&& /^[A-Za-z]{2}$/.test(e.venueState||''),'LOCAL','Local completo obrigatório');
  ensure(isFiniteDate(e.startAt)&&isFiniteDate(e.endAt)&&Date.parse(e.endAt)>=Date.parse(e.startAt),'DATAS','Datas do evento inválidas');
  if(e.salesStartAt!==undefined) ensure(isFiniteDate(e.salesStartAt)&&Date.parse(e.salesStartAt)<Date.parse(e.startAt),'ABERTURA_VENDAS','Abertura de vendas deve anteceder o evento');
  ensure(!!e.ageRating?.trim() && !!e.policyUrl?.trim(),'POLITICAS','Classificação indicativa e política pública obrigatórias');
}
export interface SessionShape { startsAt:string; endsAt:string; capacity:number; }
export function validateSession(session:SessionShape,event:Pick<EventInput,'startAt'|'endAt'>):void {
  ensure(isFiniteDate(session.startsAt)&&isFiniteDate(session.endsAt)&&Date.parse(session.startsAt)<Date.parse(session.endsAt),'SESSAO_DATA','Horário de sessão inválido');
  ensure(Date.parse(session.startsAt)>=Date.parse(event.startAt)&&Date.parse(session.endsAt)<=Date.parse(event.endAt),'SESSAO_FORA_EVENTO','Sessão fora do período do evento');
  ensure(Number.isSafeInteger(session.capacity)&&session.capacity>0,'CAPACIDADE','Capacidade da sessão inválida');
}
export interface LotShape { name:string; faceValueCents:number; startsAt:string; endsAt:string; capacity:number; }
export function validateLot(lot:LotShape):void {
  ensure(!!lot.name?.trim()&& Number.isSafeInteger(lot.faceValueCents)&&lot.faceValueCents>=0,'LOTE_VALOR','Lote e preço devem ser válidos');
  ensure(Number.isSafeInteger(lot.capacity)&&lot.capacity>0,'LOTE_CAPACIDADE','Capacidade do lote inválida');
  ensure(isFiniteDate(lot.startsAt)&&isFiniteDate(lot.endsAt)&&Date.parse(lot.startsAt)<Date.parse(lot.endsAt),'LOTE_VIGENCIA','Vigência do lote inválida');
}
export interface ApprovalRecord {step:ApprovalStep; actorId:string; decision:'APROVADO'|'REPROVADO'; }
const permitted:Record<ApprovalStep,DiskRole[]> = {CADASTRAL:['CADASTRO','ADMIN'],COMERCIAL:['COMERCIAL','ADMIN'],OPERACIONAL:['OPERACOES','ADMIN'],PUBLICACAO:['PUBLICACAO','ADMIN']};
export function assertCanApprove(step:ApprovalStep,role:DiskRole,submitterId:string,actorId:string,previous:ApprovalRecord[]):void {
  ensure(permitted[step]?.includes(role),'SEM_PERMISSAO','Perfil não autorizado a aprovar esta etapa');
  ensure(submitterId!==actorId,'AUTOAPROVACAO','Solicitante não pode aprovar o próprio evento');
  ensure(!previous.some(x=>x.step===step && x.decision==='APROVADO'),'ETAPA_APROVADA','Etapa já aprovada');
  const idx=REQUIRED_APPROVALS.indexOf(step);
  ensure(idx>=0,'ETAPA','Etapa inexistente');
  ensure(REQUIRED_APPROVALS.slice(0,idx).every(required=>previous.some(x=>x.step===required&&x.decision==='APROVADO')),'ETAPA_FORA_ORDEM','Aprovações devem seguir a ordem estabelecida');
}
export interface Readiness { status:EventStatus; producerVerified:boolean; primaryProducerCount:number; event:EventInput; sessions:SessionShape[]; lots:LotShape[]; channels:string[]; approvedFeeCount:number; approvals:ApprovalRecord[]; }
export function readinessIssues(r:Readiness):string[] {
  const errors:string[]=[];
  try{validateEvent(r.event);}catch(e){ errors.push((e as Error).message); }
  if(!r.event.salesStartAt) errors.push('Abertura de vendas não definida');
  if(!r.producerVerified) errors.push('Produtor principal não validado');
  if(r.primaryProducerCount!==1) errors.push('Deve existir exatamente um produtor principal');
  if(!r.sessions.length) errors.push('Nenhuma sessão cadastrada');
  for(const s of r.sessions){try{validateSession(s,r.event);}catch(e){errors.push((e as Error).message);}}
  if(!r.lots.length) errors.push('Nenhum lote com preço cadastrado');
  for(const l of r.lots){try{validateLot(l);}catch(e){errors.push((e as Error).message);}}
  if(!r.channels.includes('ONLINE')) errors.push('Canal online não habilitado');
  if(r.approvedFeeCount!==1) errors.push('Deve existir exatamente uma versão aprovada e vigente da Taxa Disk');
  for(const step of REQUIRED_APPROVALS){if(!r.approvals.some(a=>a.step===step&&a.decision==='APROVADO')) errors.push(`Aprovação ${step} pendente`);}
  return errors;
}
export function assertCanRequestPublication(r:Readiness):void {
  ensure(r.status==='APROVADO','ESTADO_PUBLICACAO','Evento não está aprovado');
  const issues=readinessIssues(r);
  ensure(issues.length===0,'EVENTO_INCOMPLETO',issues.join('; '));
}
export function assertCanEditEvent(status:EventStatus):void { ensure(status==='RASCUNHO'||status==='REPROVADO','EDICAO_BLOQUEADA','Editar evento submetido, aprovado ou publicado exige fluxo de alteração versionado'); }
export function publicEventProjection(data:{id:string;event:EventInput; sessions:SessionShape[];lots:LotShape[]; status:EventStatus; fee?:FeeRule; producer?:ProducerInput}):object {
  const {fee,producer,...safe}=data;
  // nunca propagamos valores negociados ou dados cadastrais internos.
  void fee; void producer;
  return safe;
}
export interface PublishedOutbox { idempotencyKey:string; kind:'EVENT_PUBLICATION_REQUESTED'; eventId:string; destination:'DISKINGRESSOS'; }
export function publicationCommand(eventId:string,revision:number):PublishedOutbox {
  ensure(!!eventId && Number.isSafeInteger(revision)&&revision>=1,'REVISAO','Evento e revisão são obrigatórios');
  return {idempotencyKey:`publication:${eventId}:v${revision}`,kind:'EVENT_PUBLICATION_REQUESTED',eventId,destination:'DISKINGRESSOS'};
}
