import assert from 'node:assert/strict';
import { CoreFinanceiroStore } from '../js/state.js';

// Produtor views
import { renderOverview } from '../js/views/overview.js';
import { renderSaldos } from '../js/views/saldos.js';
import { renderExtrato } from '../js/views/extrato.js';
import { renderRepasses } from '../js/views/repasses.js';
import { renderAntecipacoes } from '../js/views/antecipacoes.js';
import { renderVendas } from '../js/views/vendas.js';
import { renderTaxas } from '../js/views/taxas.js';
import { renderEstornos } from '../js/views/estornos.js';
import { renderBordero } from '../js/views/bordero.js';
import { renderRelatorios } from '../js/views/relatorios.js';
import { renderDadosBancarios } from '../js/views/dadosBancarios.js';

// Disk views
import { renderDiskDashboard } from '../js/views/disk/dashboard.js';
import { renderDiskPosicaoGeral, renderDiskIndicadores, renderDiskInteligencia } from '../js/views/disk/diskVisaoGeral.js';
import { renderDiskSaldos } from '../js/views/disk/diskSaldos.js';
import { renderDiskAprovacoes } from '../js/views/disk/aprovacoes.js';
import { renderDiskSolicitacoes } from '../js/views/disk/solicitacoes.js';
import { renderDiskGateways } from '../js/views/disk/gatewaysMdr.js';
import { renderDiskLedger } from '../js/views/disk/ledger.js';
import { renderDiskTesouraria } from '../js/views/disk/tesouraria.js';
import { renderDiskContasPagar } from '../js/views/disk/diskContasPagar.js';
import { renderDiskContasReceber } from '../js/views/disk/diskContasReceber.js';
import { renderDiskFluxoCaixa } from '../js/views/disk/diskFluxoCaixa.js';
import { renderDiskPix } from '../js/views/disk/diskPix.js';
import { renderDiskCnab } from '../js/views/disk/diskCnab.js';
import { renderDiskPagamentosLote } from '../js/views/disk/diskPagamentosLote.js';
import { renderDiskTransferencias } from '../js/views/disk/diskTransferencias.js';
import { renderDiskAgendaPagamentos } from '../js/views/disk/diskAgendaPagamentos.js';
import { renderDiskConciliacao } from '../js/views/disk/diskConciliacao.js';
import { renderDiskFechamentos } from '../js/views/disk/diskFechamentos.js';
import { renderDiskControladoria } from '../js/views/disk/diskControladoria.js';
import { renderDiskAssinaturasIntegracoes } from '../js/views/disk/diskAssinaturasIntegracoes.js';
import { renderDiskGovernanca } from '../js/views/disk/diskGovernanca.js';
import { renderDiskCentralTrabalho } from '../js/views/disk/diskCentralTrabalho.js';
import { renderDiskFinanceiroAvancado } from '../js/views/disk/diskFinanceiroAvancado.js';
import { renderDiskPoliticaRepasse } from '../js/views/disk/diskPoliticaRepasse.js';
import { renderDiskContaFinanceira } from '../js/views/disk/diskContaFinanceira.js';
import { renderDiskReport, getReport, reportCsv, reportTitles, reportType } from '../js/views/disk/diskReports.js';
import {
  renderDiskRHVisaoGeral,
  renderDiskRHColaboradores,
  renderDiskRHOrganograma,
  renderDiskRHPonto,
  renderDiskRHGeofences,
  renderDiskRHEquipesEvento,
  renderDiskRHCustosEvento,
  renderDiskRHFolha,
  renderDiskRHAuditoria
} from '../js/views/rh/rhViews.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
    passed++;
  } catch (err) {
    console.error('✗', name, '\n ', err.message);
    process.exitCode = 1;
  }
}

// 1. Produtor Views
const storeProd = new CoreFinanceiroStore();
const stateProd = storeProd.getState();

const prodViews = [
  ['Produtor: overview', () => renderOverview(stateProd)],
  ['Produtor: saldos', () => renderSaldos(stateProd)],
  ['Produtor: extrato', () => renderExtrato(stateProd)],
  ['Produtor: repasses', () => renderRepasses(stateProd)],
  ['Produtor: antecipacoes', () => renderAntecipacoes(stateProd)],
  ['Produtor: vendas', () => renderVendas(stateProd)],
  ['Produtor: taxas', () => renderTaxas(stateProd)],
  ['Produtor: estornos', () => renderEstornos(stateProd)],
  ['Produtor: bordero', () => renderBordero(stateProd)],
  ['Produtor: relatorios', () => renderRelatorios(stateProd)],
  ['Produtor: dadosBancarios', () => renderDadosBancarios(stateProd)]
];

for (const [name, fn] of prodViews) {
  test(name, () => {
    const html = fn();
    assert(typeof html === 'string', 'Retorno deve ser string');
    assert(html.length > 50, 'Retorno HTML não pode ser vazio');
  });
}

// 2. Disk Views
const storeDisk = new CoreFinanceiroStore();
storeDisk.login('disk');
const stateDisk = storeDisk.getState();

const diskViews = [
  ['Disk: dashboard', () => renderDiskDashboard(stateDisk)],
  ['Disk: posicaoGeral', () => renderDiskPosicaoGeral(stateDisk)],
  ['Disk: indicadores', () => renderDiskIndicadores(stateDisk)],
  ['Disk: inteligencia', () => renderDiskInteligencia(stateDisk)],
  ['Disk: aprovacoes', () => renderDiskAprovacoes(stateDisk)],
  ['Disk: solicitacoes', () => renderDiskSolicitacoes(stateDisk)],
  ['Disk: saldos', () => renderDiskSaldos(stateDisk, 'consolidado')],
  ['Disk: gateways', () => renderDiskGateways(stateDisk)],
  ['Disk: spread', () => renderDiskFinanceiroAvancado(stateDisk, 'spread')],
  ['Disk: advanced', () => renderDiskFinanceiroAvancado(stateDisk, 'advanced')],
  ['Disk: split', () => renderDiskFinanceiroAvancado(stateDisk, 'split')],
  ['Disk: centralEstornos', () => renderDiskFinanceiroAvancado(stateDisk, 'estornos')],
  ['Disk: ledger', () => renderDiskLedger(stateDisk)],
  ['Disk: tesouraria', () => renderDiskTesouraria(stateDisk)],
  ['Disk: contasPagar', () => renderDiskContasPagar(stateDisk)],
  ['Disk: contasReceber', () => renderDiskContasReceber(stateDisk)],
  ['Disk: fluxoCaixa', () => renderDiskFluxoCaixa(stateDisk)],
  ['Disk: pix', () => renderDiskPix(stateDisk)],
  ['Disk: cnab', () => renderDiskCnab(stateDisk)],
  ['Disk: pagamentosLote', () => renderDiskPagamentosLote(stateDisk)],
  ['Disk: transferencias', () => renderDiskTransferencias(stateDisk)],
  ['Disk: agendaPagamentos', () => renderDiskAgendaPagamentos(stateDisk)],
  ['Disk: conciliacao', () => renderDiskConciliacao(stateDisk)],
  ['Disk: fechamentos', () => renderDiskFechamentos(stateDisk)],
  ['Disk: controladoria', () => renderDiskControladoria(stateDisk, 'visao')],
  ['Disk: assinaturasIntegracoes', () => renderDiskAssinaturasIntegracoes(stateDisk, 'assinaturas')],
  ['Disk: governanca', () => renderDiskGovernanca(stateDisk, 'visao')],
  ['Disk: centralTrabalho', () => renderDiskCentralTrabalho(stateDisk, 'central')],
  ['Disk: politicaRepasse', () => renderDiskPoliticaRepasse(stateDisk)],
  ['Disk: contaFinanceira', () => renderDiskContaFinanceira(stateDisk)],
  ['Disk: RH Visao Geral', () => renderDiskRHVisaoGeral(stateDisk)],
  ['Disk: RH Colaboradores', () => renderDiskRHColaboradores(stateDisk)],
  ['Disk: RH Organograma', () => renderDiskRHOrganograma(stateDisk)],
  ['Disk: RH Ponto e Jornada', () => renderDiskRHPonto(stateDisk)],
  ['Disk: RH Geofences', () => renderDiskRHGeofences(stateDisk)],
  ['Disk: RH Equipes Evento', () => renderDiskRHEquipesEvento(stateDisk)],
  ['Disk: RH Custos Evento', () => renderDiskRHCustosEvento(stateDisk)],
  ['Disk: RH Folha', () => renderDiskRHFolha(stateDisk)],
  ['Disk: RH Auditoria & LGPD', () => renderDiskRHAuditoria(stateDisk)],
  ...Object.keys(reportTitles).map(type => [
    `Disk Relatórios: ${reportTitles[type]} (diskRelatorios_${type})`,
    () => {
      assert.equal(reportType(`diskRelatorios_${type}`), type);
      const report = getReport(stateDisk, type);
      assert(Array.isArray(report.rows) && report.rows.length > 0, `Relatório ${type} deve retornar registros`);
      const csv = reportCsv(report);
      assert(csv.startsWith('\uFEFF"Data";'), `CSV de ${type} deve conter cabeçalho BOM`);
      return renderDiskReport();
    }
  ])
];

for (const [name, fn] of diskViews) {
  test(name, () => {
    const html = fn();
    assert(typeof html === 'string', 'Retorno deve ser string');
    assert(html.length > 50, 'Retorno HTML não pode ser vazio');
  });
}

console.log(`\nTodos os ${passed} testes de renderização de views passaram com sucesso!`);
