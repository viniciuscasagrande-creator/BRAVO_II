/**
 * BRAVO_II — contrato de referência para integração RH→Financeiro.
 * NÃO É serviço bancário, repositório transacional, API pública ou motor de folha.
 * As funções são puras e imutáveis, para documentar decisões e exercitar regras.
 */

const PERMISSOES = Object.freeze({
  ENVIAR_RH: 'rh:solicitar_pagamento',
  APROVAR_FIN: 'financeiro:aprovar_pagamento_rh',
  PREPARAR: 'financeiro:preparar_tesouraria',
  CONCILIAR: 'financeiro:conciliar_pagamento_rh'
});

function exigir(ctx, permissao) {
  if (!ctx || !ctx.usuarioId || !Array.isArray(ctx.permissoes) || !ctx.permissoes.includes(permissao))
    throw new Error(`Acesso negado: requer ${permissao}`);
}
function obrigatorio(valor, nome) {
  if(typeof valor !== 'string' || !valor.trim()) throw new Error(`${nome} obrigatório`);
  return valor.trim();
}
function agora(registroTempo) { return typeof registroTempo==='string' && registroTempo ? registroTempo : new Date().toISOString(); }
function eventoAuditoria(acao, usuarioId, dataHora, detalhes={}) {
  return Object.freeze({acao, usuarioId, dataHora, detalhes});
}
function transicao(registro, status, evento, outros={}) {
  return Object.freeze({...registro,...outros,status,atualizadoEm:evento.dataHora,auditoria:Object.freeze([...registro.auditoria,evento])});
}

export function solicitarPagamentoRH(dados, ctx, dataHora) {
  exigir(ctx, PERMISSOES.ENVIAR_RH);
  const tipo = dados?.tipo;
  if(!['FOLHA','EQUIPE_EVENTO','REEMBOLSO_RH'].includes(tipo)) throw new Error('Tipo RH inválido');
  const empresaId=obrigatorio(dados.empresaId,'empresaId');
  const loteRHId=obrigatorio(dados.loteRHId,'loteRHId');
  const centroCustoId=obrigatorio(dados.centroCustoId,'centroCustoId');
  const competencia=obrigatorio(dados.competencia,'competencia');
  if(!/^\d{4}-\d{2}$/.test(competencia)) throw new Error('Competência inválida (AAAA-MM)');
  if(!Number.isSafeInteger(dados.totalCentavos) || dados.totalCentavos<=0) throw new Error('Total deve ser inteiro positivo em centavos');
  if(tipo==='EQUIPE_EVENTO' && !dados.eventoId) throw new Error('Custo de staff exige eventoId');
  if(tipo==='FOLHA' && dados.eventoId) throw new Error('Folha empresarial não deve ser classificada como despesa direta de um evento');
  const instante=agora(dataHora);
  const base={
    id: `rh-pag:${empresaId}:${loteRHId}`,
    idempotenciaKey:`rh.pagamento:${empresaId}:${loteRHId}`,
    tipo,empresaId,loteRHId,competencia,centroCustoId,
    eventoId:dados.eventoId||null,totalCentavos:dados.totalCentavos,
    solicitadoPor:ctx.usuarioId, aprovadoPor:null, confirmadoPor:null,
    status:'AGUARDANDO_FINANCEIRO',criadoEm:instante,atualizadoEm:instante,
    /** Não carregar dados individuais de folha/colaboradores, CPFs ou atestados. */
    auditoria:Object.freeze([eventoAuditoria('RH_SOLICITOU',ctx.usuarioId,instante)])
  };
  return Object.freeze(base);
}

export function aprovarPagamentoRH(solicitacao,ctx,dataHora) {
  exigir(ctx,PERMISSOES.APROVAR_FIN);
  if(solicitacao.status!=='AGUARDANDO_FINANCEIRO') throw new Error('Situação incompatível com aprovação');
  if(ctx.usuarioId===solicitacao.solicitadoPor) throw new Error('Segregação de funções: solicitante não pode aprovar');
  const instante=agora(dataHora);
  return transicao(solicitacao,'APROVADO_FINANCEIRO',eventoAuditoria('FINANCEIRO_APROVOU',ctx.usuarioId,instante),{aprovadoPor:ctx.usuarioId});
}

export function prepararTesouraria(solicitacao,ctx,dataHora) {
  exigir(ctx,PERMISSOES.PREPARAR);
  if(solicitacao.status!=='APROVADO_FINANCEIRO') throw new Error('Lote não autorizado pelo Financeiro');
  const instante=agora(dataHora);
  return transicao(solicitacao,'PENDENTE_INTEGRACAO_BANCARIA',eventoAuditoria('INSTRUCAO_PREPARADA_SEM_TRANSMISSAO',ctx.usuarioId,instante));
}

export function confirmarLiquidacao(solicitacao,confirmacao,ctx,dataHora) {
  exigir(ctx,PERMISSOES.CONCILIAR);
  if(solicitacao.status!=='PENDENTE_INTEGRACAO_BANCARIA') throw new Error('Aguardando instrução de tesouraria');
  if(confirmacao?.status!=='CONFIRMADO' || !confirmacao?.idExterno || !confirmacao?.provedor)
    throw new Error('Liquidação exige prova de confirmação externa');
  const instante=agora(dataHora);
  return transicao(solicitacao,'LIQUIDADO',eventoAuditoria('CONFIRMACAO_CONCILIADA',ctx.usuarioId,instante,{provedor:confirmacao.provedor,idExterno:confirmacao.idExterno}),{confirmadoPor:ctx.usuarioId});
}

export function calcularTaxaDiskPorEvento({eventoId,tipo,valor,valorIngressoCentavos}) {
  obrigatorio(eventoId,'eventoId');
  if(!Number.isSafeInteger(valorIngressoCentavos)||valorIngressoCentavos<0) throw new Error('Valor do ingresso inválido');
  if(tipo==='VALOR_FIXO') {
    if(!Number.isSafeInteger(valor)||valor<0) throw new Error('Taxa fixa deve ser em centavos');
    return valor;
  }
  if(tipo==='PERCENTUAL') {
    // valor = taxa inteira em pontos-base (1000 = 10,00%).
    if(!Number.isSafeInteger(valor)||valor<0||valor>10000) throw new Error('Percentual inválido em pontos-base');
    return Math.round(valorIngressoCentavos*valor/10000);
  }
  throw new Error('Tipo de Taxa Disk inválido');
}

export const bridgePermissoes=PERMISSOES;
