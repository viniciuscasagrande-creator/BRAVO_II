import test from 'node:test';
import assert from 'node:assert/strict';
import {solicitarPagamentoRH,aprovarPagamentoRH,prepararTesouraria,confirmarLiquidacao,calcularTaxaDiskPorEvento} from '../contracts/bridge-rh-financeiro.mjs';
const rh={usuarioId:'rh-1',permissoes:['rh:solicitar_pagamento']};
const financeiro={usuarioId:'fin-2',permissoes:['financeiro:aprovar_pagamento_rh','financeiro:preparar_tesouraria','financeiro:conciliar_pagamento_rh']};
const base={tipo:'FOLHA',empresaId:'disk',loteRHId:'folha-2026-11',centroCustoId:'rh-geral',competencia:'2026-11',totalCentavos:5000};

test('RH solicita valor inteiro sem dados individuais e solicita somente aprovação financeira',()=>{
 const s=solicitarPagamentoRH(base,rh,'2026-11-05T12:00:00Z');
 assert.equal(s.status,'AGUARDANDO_FINANCEIRO'); assert.equal(s.totalCentavos,5000);
 assert.equal(s.eventoId,null);assert.equal('cpf' in s,false); assert.equal('salario' in s,false);
 assert.equal(s.auditoria.length,1);
});
test('RH não aprova pagamentos próprios nem se atribuída a permissão do Financeiro',()=>{
 const s=solicitarPagamentoRH(base,rh);
 assert.throws(()=>aprovarPagamentoRH(s,rh));
 assert.throws(()=>aprovarPagamentoRH(s,{...rh,permissoes:[...rh.permissoes,'financeiro:aprovar_pagamento_rh']}),/Segregação/);
});
test('aprovação financeira não implica pagamento liquidado',()=>{
 const s=solicitarPagamentoRH(base,rh);
 const a=aprovarPagamentoRH(s,financeiro);
 assert.equal(a.status,'APROVADO_FINANCEIRO');
 const p=prepararTesouraria(a,financeiro);
 assert.equal(p.status,'PENDENTE_INTEGRACAO_BANCARIA');
 assert.notEqual(p.status,'LIQUIDADO');
 assert.throws(()=>confirmarLiquidacao(p,{status:'EM_PROCESSAMENTO'},financeiro),/confirmação externa/);
});
test('apenas comprovante externo confirmado permite liquidar em contrato referencial',()=>{
 const s=solicitarPagamentoRH(base,rh);
 const p=prepararTesouraria(aprovarPagamentoRH(s,financeiro),financeiro);
 const l=confirmarLiquidacao(p,{status:'CONFIRMADO',idExterno:'retorno-123',provedor:'BANCO_HOMOLOGACAO'},financeiro);
 assert.equal(l.status,'LIQUIDADO');assert.equal(l.auditoria.length,4);
});
test('equipes temporárias exigem vínculo do evento; folha geral não mistura evento',()=>{
 assert.throws(()=>solicitarPagamentoRH({...base,tipo:'EQUIPE_EVENTO'},rh),/eventoId/);
 assert.throws(()=>solicitarPagamentoRH({...base,eventoId:'ev-1'},rh),/Folha empresarial/);
 assert.equal(solicitarPagamentoRH({...base,tipo:'EQUIPE_EVENTO',eventoId:'ev-1'},rh).eventoId,'ev-1');
});
test('valor inválido, dados insuficientes e tipo desconhecido bloqueados',()=>{
 assert.throws(()=>solicitarPagamentoRH({...base,totalCentavos:0},rh));
 assert.throws(()=>solicitarPagamentoRH({...base,totalCentavos:12.4},rh));
 assert.throws(()=>solicitarPagamentoRH({...base,tipo:'OUTRO'},rh));
 assert.throws(()=>solicitarPagamentoRH({...base,loteRHId:''},rh));
});
test('Taxa Disk percentual e fixa vinculada obrigatoriamente a evento',()=>{
 assert.equal(calcularTaxaDiskPorEvento({eventoId:'e1',tipo:'PERCENTUAL',valor:1050,valorIngressoCentavos:10000}),1050);
 assert.equal(calcularTaxaDiskPorEvento({eventoId:'e2',tipo:'VALOR_FIXO',valor:700,valorIngressoCentavos:10000}),700);
 assert.throws(()=>calcularTaxaDiskPorEvento({tipo:'PERCENTUAL',valor:1000,valorIngressoCentavos:10000}));
});
