import assert from 'node:assert/strict';
import { CoreFinanceiroStore } from '../js/state.js';

const fresh = () => {
  const s = new CoreFinanceiroStore();
  return s;
};

let ok = 0;
const queue = [];
function test(name, fn) {
  queue.push(async () => {
    try {
      await fn();
      console.log('✓', name);
      ok++;
    } catch (e) {
      console.error('✗', name, '\n ', e.message);
      process.exitCode = 1;
    }
  });
}
function throws(fn, pattern) {
  assert.throws(fn, pattern);
}

// 1. Regra Transferível: Saldo - Reservado - Retido - Bloqueado
test('transferível desconta reservado + retido + bloqueado', () => {
  const s = fresh();
  const e = { financialBalance: 200000, reservedBalance: 50000, retainedBalance: 30000, blockedBalance: 10000 };
  assert.equal(s.getTransferableAmount(e), 110000);
});

// 2. Checklist de Risco: Validações reais
test('checklist só é válido com todas as validações verdadeiras', () => {
  const s = fresh();
  assert.equal(s.isChecklistValid({ balanceSufficient: true, bankDataValidated: true, eventRegular: true, noActiveBlocks: true, limitPermitted: true }), true);
  assert.equal(s.isChecklistValid({ balanceSufficient: true, bankDataValidated: false, eventRegular: true, noActiveBlocks: true, limitPermitted: true }), false);
});

// 3. Máquina de Estados: Aprovação de operação
test('aprovação fora do estado correto é bloqueada', () => {
  const s = fresh();
  s.login('disk');
  const item = s.data.approvalQueue[0];
  item.status = 'Pago';
  throws(() => s.approveOperationByDisk(item.id), /não pode ser aprovada/);
});

// 4. Ordem Rígida de Assinaturas: Produtor primeiro, Financeiro por último
test('Disk não assina antes do Produtor', () => {
  const s = fresh();
  s.login('disk');
  const item = s.data.approvalQueue[0];
  item.status = 'Aguardando assinatura do Financeiro';
  item.signatures.producer.signed = false;
  throws(() => s.signByDisk(item.id), /último signatário/);
});

// 5. Idempotência de Pagamento: Bloqueio de liquidação duplicada
test('liquidação duplicada é bloqueada', () => {
  const s = fresh();
  s.login('admin');
  const item = s.data.approvalQueue[0];
  item.status = 'Pago';
  item.paidDate = '30/09/2026';
  throws(() => s.executeFinalTransfer(item.id), /duplicada/);
});

// 6. Segregação de Funções (SoD): Aprovador não pode liquidar
test('quem aprovou não pode liquidar a mesma operação', () => {
  const s = fresh();
  s.login('disk');
  const item = s.data.approvalQueue[0];
  item.status = 'Documento assinado';
  item.paidDate = null;
  item.liquidationId = null;
  item.signatures.producer.signed = true;
  item.signatures.disk.signed = true;
  item.approvedByUserId = s.state.currentUser.id;
  throws(() => s.executeFinalTransfer(item.id), /quem aprova não pode liquidar/);
});

// 7. Trava de Transferência: Tentativa de transferir acima do Transferível falha
test('tentativa de transferir R$ 110.001 quando o transferível é R$ 110.000 é bloqueada', () => {
  const s = fresh();
  s.login('producer');
  throws(() => s.transferBetweenEvents({ fromEventId: 'evt-001', toEventId: 'evt-002', amount: 110001 }), /Saldo insuficiente/);
});

// 8. Transferência autorizada balanceia saldos exatamente
test('transferência de R$ 110.000 é permitida e balanceia saldo da origem e destino', () => {
  const s = fresh();
  s.login('producer');
  const originBefore = s.data.events.find(e => e.id === 'evt-001').availableBalance;
  const destBefore = s.data.events.find(e => e.id === 'evt-002').availableBalance;

  s.transferBetweenEvents({ fromEventId: 'evt-001', toEventId: 'evt-002', amount: 110000, transferId: 'TRF-TEST-110K' });

  const originAfter = s.data.events.find(e => e.id === 'evt-001').availableBalance;
  const destAfter = s.data.events.find(e => e.id === 'evt-002').availableBalance;

  assert.equal(originBefore - originAfter, 110000);
  assert.equal(destAfter - destBefore, 110000);
});

// 9. Idempotência Contábil: Transferência duplicada com mesmo ID é bloqueada
test('transferência duplicada com mesmo protocolo é bloqueada (idempotência)', () => {
  const s = fresh();
  s.login('producer');
  s.transferBetweenEvents({ fromEventId: 'evt-001', toEventId: 'evt-002', amount: 10000, transferId: 'TRF-IDEMP-01' });
  throws(() => s.transferBetweenEvents({ fromEventId: 'evt-001', toEventId: 'evt-002', amount: 10000, transferId: 'TRF-IDEMP-01' }), /duplicada bloqueada/);
});

// 10. Segregação de Funções: Criador da operação não pode aprovar a própria operação
test('segregação de funções impede criador de aprovar a própria operação', () => {
  const s = fresh();
  s.login('disk');
  const item = s.data.approvalQueue[0];
  item.createdByUserId = s.state.currentUser.id; // mesmo usuário que criou
  item.status = 'Aguardando análise';
  throws(() => s.approveOperationByDisk(item.id), /o criador da operação não pode decidir/);
});

// 11. Única Fonte da Verdade para Retenções
test('única fonte de verdade para retenções fecha exatamente entre eventos e total geral', () => {
  const s = fresh();
  const ret001 = s.calculateRetentions('evt-001');
  const ret002 = s.calculateRetentions('evt-002');
  const retAll = s.calculateRetentions('all');

  assert.equal(ret001, 30000);
  assert.equal(ret002, 15000);
  assert.equal(retAll, 45000);
  assert.equal(ret001 + ret002, retAll);
});

// 12. Invariante Contábil Canônica: Receita Líquida - Saídas = Disponível
test('invariante contábil: Receita Líquida - Repasses - Reservas - Retenções = Disponível', () => {
  const s = fresh();
  const comp = s.getProducerBalanceComposition('prod-abc', 'all');
  assert.equal(comp.grossSales - comp.refunds - comp.chargebacks - comp.diskFees, comp.netRevenue);
  assert.equal(comp.netRevenue - comp.payoutsDone - comp.reservedBalance - comp.retentionsBalance, comp.availableBalance);
});

// 13. Componente ScrollSpy: Geração de markup com pills, data-target e acessibilidade
test('renderScrollSpyNav gera barra sticky com pills e acessibilidade adequadas', async () => {
  const { renderScrollSpyNav } = await import('../js/components/scrollSpy.js');
  const items = [
    { id: 'sec-config', label: 'Configurações', icon: 'ph-sliders-horizontal' },
    { id: 'sec-credenciais', label: 'Credenciais', icon: 'ph-key' },
    { id: 'sec-pix', label: 'PIX', icon: 'ph-qr-code', badge: 'Novo' }
  ];

  const html = renderScrollSpyNav(items, 'sec-config', { navId: 'test-spy' });
  assert.ok(html.includes('limitless-scrollspy-bar'));
  assert.ok(html.includes('data-target="sec-config"'));
  assert.ok(html.includes('data-target="sec-credenciais"'));
  assert.ok(html.includes('data-target="sec-pix"'));
  assert.ok(html.includes('active'));
  assert.ok(html.includes('scrollspy-badge'));
  assert.ok(html.includes('role="tablist"'));
});

// 14. Integridade das Views com ScrollSpy: Gateways, Taxas e Conciliação
test('views com ScrollSpy geram seções correspondentes aos pills', async () => {
  const s = fresh();
  const state = s.getState();
  const { renderDiskGateways } = await import('../js/views/disk/gatewaysMdr.js');
  const { renderDiskConciliacao } = await import('../js/views/disk/diskConciliacao.js');

  const gwHtml = renderDiskGateways(state);
  assert.ok(gwHtml.includes('id="gateways-scrollspy-nav"'));
  assert.ok(gwHtml.includes('id="sec-gw-config"'));
  assert.ok(gwHtml.includes('id="sec-gw-pix"'));
  assert.ok(gwHtml.includes('id="sec-gw-relatorios"'));

  const concHtml = renderDiskConciliacao(state);
  assert.ok(concHtml.includes('id="conc-scrollspy-nav"'));
  assert.ok(concHtml.includes('id="sec-conc-kpis"'));
  assert.ok(concHtml.includes('id="sec-conc-camadas"'));
  assert.ok(concHtml.includes('id="sec-conc-tabela"'));
  assert.ok(concHtml.includes('id="sec-conc-divergencias"'));
});

for (const run of queue) {
  await run();
}

console.log(`\n${ok}/${queue.length} teste(s) aprovados com sucesso.`);
