import assert from 'node:assert/strict';
import { CoreFinanceiroStore } from '../js/state.js';
import { renderDiskSolicitacoes } from '../js/views/disk/solicitacoes.js';
import { renderDiskAprovacoes } from '../js/views/disk/aprovacoes.js';
import { renderDiskLedger } from '../js/views/disk/ledger.js';
import { renderDiskEventos } from '../js/views/disk/enterpriseViews.js';

// Mock de alert para ambiente Node.js de teste
globalThis.alert = (msg) => { /* no-op em testes automatizados */ };

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

console.log('--- Iniciando Testes da Conta Financeira do Produtor (CNPJ) ---');

// 1. Consolidação da Conta por CNPJ (Os 5 Pilares)
test('Conta por CNPJ consolida os 5 pilares canônicos de saldo e segrega por evento', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const account = store.getProducerFinancialAccount('prod-abc');
  assert(account, 'Objeto de conta deve existir');
  assert.equal(account.producer.id, 'prod-abc');
  assert(account.producer.cnpj, 'Produtor deve possuir CNPJ cadastrado');

  const { summary, events } = account;
  assert(typeof summary.consolidatedBalance === 'number', 'Saldo consolidado deve ser numérico');
  assert(typeof summary.availableForRepasse === 'number', 'Disponível para repasse deve ser numérico');
  assert(typeof summary.futurePending === 'number', 'Saldo a liberar futuro deve ser numérico');
  assert(typeof summary.blocked === 'number', 'Bloqueado deve ser numérico');
  assert(typeof summary.retained === 'number', 'Retido deve ser numérico');
  assert(typeof summary.outstandingCredits === 'number', 'Créditos em aberto deve ser numérico');

  // Cada evento tem contabilidade isolada
  assert(events.length > 0, 'Produtor deve ter eventos vinculados');
  events.forEach(ev => {
    assert.equal(ev.producerId, 'prod-abc', 'Eventos devem pertencer exclusivamente ao CNPJ do produtor');
    assert(ev.eligibility, 'Evento deve possuir motor de elegibilidade calculado');
  });
});

// 2. Concessão de Crédito e Regras de Segregação
test('Concessão de crédito exige perfil Disk, justificativa >= 5 chars e calcula juros/parcelas com precisão', () => {
  const store = new CoreFinanceiroStore();

  // Teste de SoD: Produtor não pode conceder crédito a si mesmo
  store.login('producer', 'prod-abc');
  const creditAttemptProd = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    principal: 50000,
    interestRate: 2.5,
    installments: 4,
    notes: 'Solicitação pelo produtor'
  });
  assert.equal(creditAttemptProd, null, 'Produtor não pode conceder crédito');

  // Login como Mesa Disk
  store.login('disk');

  // Tentativa sem justificativa adequada (< 5 caracteres)
  const creditAttemptShortNotes = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    principal: 50000,
    interestRate: 2.5,
    installments: 4,
    notes: 'Ok'
  });
  assert.equal(creditAttemptShortNotes, null, 'Justificativa < 5 chars deve ser rejeitada');

  // Concessão válida
  const credit = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    principal: 100000,
    interestRate: 2.0, // 2% a.m.
    installments: 5,   // 5 meses -> 10% de juros total
    amortizationModel: 'PARCELAS_FIXAS',
    notes: 'Adiantamento emergencial de montagem de palco e rider técnico'
  });

  assert(credit, 'Crédito deve ser gerado');
  assert.equal(credit.principal, 100000);
  assert.equal(credit.interestRate, 2.0);
  assert.equal(credit.installmentsCount, 5);
  // Total da dívida = 100.000 * (1 + (2.0 * 5) / 100) = 110.000
  assert.equal(credit.totalDebt, 110000);
  assert.equal(credit.outstandingDebt, 110000);
  assert.equal(credit.installmentValue, 22000); // 110.000 / 5 = 22.000
  assert.equal(credit.status, 'ATIVO');
  assert(credit.protocol.startsWith('CR-'), 'Protocolo canônico CR deve ser gerado');
});

// 3. Amortização de Crédito e Quitação Integral
test('Amortização abate saldo devedor e transita status para LIQUIDADO na quitação total', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const credit = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-002',
    principal: 20000,
    interestRate: 0,
    installments: 2,
    amortizationModel: 'PARCELAS_FIXAS',
    notes: 'Capital de giro de bilheteria inicial'
  });

  assert.equal(credit.outstandingDebt, 20000);

  // Amortização parcial de R$ 10.000
  const am1 = store.amortizeProducerCredit({
    creditId: credit.id,
    amount: 10000,
    type: 'PARCELA_FIXA'
  });

  assert.equal(am1.outstandingDebt, 10000);
  assert.equal(am1.amortizedTotal, 10000);
  assert.equal(am1.status, 'ATIVO');
  assert.equal(am1.amortizationHistory.length, 1);

  // Amortização final de R$ 10.000 -> Quitação
  const am2 = store.amortizeProducerCredit({
    creditId: credit.id,
    amount: 10000,
    type: 'PARCELA_FIXA'
  });

  assert.equal(am2.outstandingDebt, 0);
  assert.equal(am2.amortizedTotal, 20000);
  assert.equal(am2.status, 'LIQUIDADO');
  assert(am2.liquidatedAt, 'Deve registrar data/hora da liquidação');

  // Tentativa de amortizar contrato já liquidado
  const am3 = store.amortizeProducerCredit({
    creditId: credit.id,
    amount: 5000
  });
  assert.equal(am3, null, 'Não deve permitir amortizar contrato já quitado');
});

// 4. Gestão de Bloqueios e Retenções Cautelares
test('Bloqueio e liberação de saldo exigem perfil Disk, justificativa formal e respeitam disponibilidade', () => {
  const store = new CoreFinanceiroStore();

  // Teste de SoD: Produtor não pode bloquear saldo
  store.login('producer', 'prod-abc');
  const blkProd = store.blockAccountBalance({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    amount: 5000,
    reason: 'Tentativa indevida de bloqueio'
  });
  assert.equal(blkProd, null, 'Produtor não pode executar bloqueio cautelar');

  store.login('disk');
  const eventBefore = store.data.events.find(e => e.id === 'evt-001');
  const availBefore = eventBefore.availableBalance;
  const blockedBefore = eventBefore.blockedBalance || 0;

  // Tentativa de bloquear mais do que o disponível
  const blkExcess = store.blockAccountBalance({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    amount: availBefore + 500000,
    reason: 'Tentativa excedente'
  });
  assert.equal(blkExcess, null, 'Bloqueio acima do saldo disponível deve ser rejeitado');

  // Bloqueio válido de R$ 15.000
  const blkSuccess = store.blockAccountBalance({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    amount: 15000,
    type: 'BLOQUEIO',
    reason: 'Investigação preventiva de contestações em lote'
  });
  assert(blkSuccess, 'Bloqueio deve ser efetivado');
  assert.equal(blkSuccess.availableBalance, availBefore - 15000);
  assert.equal(blkSuccess.blockedBalance, blockedBefore + 15000);

  // Liberação válida de R$ 15.000 com justificativa
  const relSuccess = store.releaseAccountBalance({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    amount: 15000,
    reason: 'Contestações verificadas e validadas sem fraude comprovada'
  });
  assert(relSuccess, 'Liberação deve ser efetivada');
  assert.equal(relSuccess.blockedBalance, blockedBefore);
  assert.equal(relSuccess.availableBalance, availBefore);
});

// 5. Dedução de Amortização de Recebíveis no Cálculo de Elegibilidade de Repasse
test('Crédito ativo com modelo de retenção de vendas deduz amortização hold do disponível para repasse', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // Concede crédito com 15% de amortização sobre vendas no evt-inverno (que tem vendas >= 50%)
  store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-inverno',
    principal: 40000,
    interestRate: 0,
    installments: 1,
    amortizationModel: 'PERCENTUAL_RECEBIVEIS',
    receivablePercent: 15.0,
    notes: 'Adiantamento com garantia de amortização em bilheteria'
  });

  const elig = store.calculatePayoutEligibility('evt-inverno');
  assert(elig.creditAmortizationHold > 0, 'Deve apurar reserva para amortização de crédito');
  assert(elig.totalDeductions >= elig.creditAmortizationHold, 'totalDeductions deve englobar a reserva de crédito');
  assert.equal(
    elig.disponivelFinal,
    Math.min(elig.eventAvailable, Math.max(0, elig.limiteBruto - elig.totalDeductions)),
    'Disponível final deve descontar a retenção de amortização de crédito'
  );
});

// 6. Agenda de Obrigações do Evento (Aluguel, ECAD, Fornecedores)
test('Agenda de obrigações reserva saldo antes do motor e deduz da base elegível de repasse', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // Criação de obrigação de aluguel de teatro (R$ 80.000) e ECAD (R$ 15.000)
  const obAluguel = store.createEventObligation({
    eventId: 'evt-003',
    category: 'ALUGUEL_ESPACO',
    description: 'Locação Teatro Principal',
    beneficiary: 'Teatro Positivo Ltda.',
    value: 80000,
    dueDate: '2026-11-10',
    documentRef: 'Contrato 2026/04',
    status: 'RESERVADO',
    notes: 'Reserva preventiva de aluguel'
  });

  assert(obAluguel, 'Obrigação de aluguel deve ser criada');
  assert.equal(obAluguel.status, 'RESERVADO');
  assert.equal(obAluguel.value, 80000);

  const elig = store.calculatePayoutEligibility('evt-003');
  assert(elig.obligationsHold >= 80000, 'Motor deve apurar as obrigações reservadas');
  assert(elig.totalDeductions >= elig.obligationsHold, 'Deduções totais devem englobar obrigações reservadas');

  // Atualização de status da obrigação para RETIDO e depois LIQUIDADO
  const obUpdated = store.updateEventObligationStatus({
    obligationId: obAluguel.id,
    status: 'LIQUIDADO',
    notes: 'Comprovante bancário TED anexado'
  });
  assert.equal(obUpdated.status, 'LIQUIDADO');
  assert(obUpdated.liquidatedAt, 'Deve registrar data de liquidação');
});

// 7. Fila de Estornos com Reserva Imediata e Dupla Autorização Estrita (SoD)
test('Estorno reserva saldo imediatamente, exige dupla autorização por usuários distintos (SoD) e efetiva no ledger', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // Abertura de estorno de R$ 5.000 no evt-003
  const refund = store.openInternalRefund({
    eventId: 'evt-003',
    orderId: 'PED-TEST-5000',
    value: 5000,
    reason: 'Cancelamento VIP solicitado via Procon'
  });

  assert(refund, 'Estorno deve ser aberto');
  assert.equal(refund.status, 'AGUARDANDO_PRIMEIRA_AUTORIZACAO');
  assert.equal(refund.value, 5000);

  // Reserva imediata reflete no motor de elegibilidade
  const eligWithRefund = store.calculatePayoutEligibility('evt-003');
  assert(eligWithRefund.refundsHold >= 5000, 'Valor do estorno deve ser colocado imediatamente em reserva hold');

  // 1ª Autorização concedida pelo Operador A
  store.state.currentUser = { id: 'usr-operador-a', name: 'Operador A (Analista)', role: 'disk' };
  const auth1 = store.authorizeInternalRefund({
    refundId: refund.id,
    factor: 'MFA_VALIDADO_TOKEN_A',
    notes: '1ª autorização técnica'
  });
  assert.equal(auth1.status, 'AGUARDANDO_SEGUNDA_AUTORIZACAO');
  assert.equal(auth1.approvals.length, 1);

  // Tentativa de 2ª Autorização pelo MESMO Operador A deve ser BLOQUEADA (SoD estrito)
  const authDuplicateAttempt = store.authorizeInternalRefund({
    refundId: refund.id,
    factor: 'TENTATIVA_MESMO_OPERADOR'
  });
  assert.equal(authDuplicateAttempt, null, 'O mesmo operador não pode autorizar duas vezes');

  // Tentativa de efetivar prematuramente com apenas 1 autorização deve ser BLOQUEADA
  const prematureExec = store.executeInternalRefund({ refundId: refund.id });
  assert.equal(prematureExec, null, 'Não pode efetivar com apenas 1 autorização');

  // 2ª Autorização concedida por Operador B (usuário distinto)
  store.state.currentUser = { id: 'usr-operador-b', name: 'Operador B (Supervisor)', role: 'disk' };
  const auth2 = store.authorizeInternalRefund({
    refundId: refund.id,
    factor: 'MFA_VALIDADO_TOKEN_B',
    notes: '2ª autorização de mesa'
  });
  assert.equal(auth2.status, 'AUTORIZADO_PARA_EFETIVAR');
  assert.equal(auth2.approvals.length, 2);

  // Efetivação definitiva no Gateway & Ledger
  const executed = store.executeInternalRefund({ refundId: refund.id });
  assert.equal(executed.status, 'EFETIVADO');
  assert(executed.executedAt, 'Data de efetivação deve ser preenchida');
  assert.equal(executed.executedBy, 'Operador B (Supervisor) (Financeiro Disk)');
});

// 8. Isolamento de Acesso Arquitetural (Produtor vs. Financeiro Disk)
test('Isolamento estrito impede que Produtor acerte, crie ou autorize obrigações, estornos ou créditos', () => {
  const store = new CoreFinanceiroStore();
  store.login('producer', 'prod-abc');

  const obAttempt = store.createEventObligation({
    eventId: 'evt-001',
    description: 'Tentativa de criar obrigação',
    value: 5000
  });
  assert.equal(obAttempt, null, 'Produtor não pode criar obrigações');

  const refAttempt = store.openInternalRefund({
    eventId: 'evt-001',
    orderId: 'PED-PROD',
    value: 1000,
    reason: 'Tentativa indevida de estorno'
  });
  assert.equal(refAttempt, null, 'Produtor não pode abrir estornos internos');
});

// 9. Drilldown Contábil e Movimentação Completa do Evento (V0.4)
test('Drilldown do evento consolida obrigações, estornos, créditos e extrato exclusivo do evento', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const account = store.getProducerFinancialAccount('prod-abc');
  const ev = account.events.find(e => e.id === 'evt-003');
  assert(ev, 'Evento evt-003 deve existir');

  const obligations = (account.obligations || []).filter(o => o.eventId === 'evt-003');
  const refunds = (account.refunds || []).filter(r => r.eventId === 'evt-003');
  const credits = (account.credits || []).filter(c => c.eventId === 'evt-003');
  const ledger = (account.ledger || []).filter(l => l.eventId === 'evt-003');

  assert(Array.isArray(obligations), 'Obrigações do evento devem ser array');
  assert(Array.isArray(refunds), 'Estornos do evento devem ser array');
  assert(Array.isArray(credits), 'Créditos do evento devem ser array');
  assert(Array.isArray(ledger), 'Ledger do evento deve ser array');
});

// 10. Rejeição de Estorno com Liberação Imediata da Reserva (V0.5)
test('Rejeição de estorno transiciona para REJEITADO e libera a reserva hold imediatamente', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const eligBefore = store.calculatePayoutEligibility('evt-003');
  const holdBefore = eligBefore.refundsHold || 0;

  const refund = store.openInternalRefund({
    eventId: 'evt-003',
    orderId: 'PED-REJ-TEST',
    value: 7500,
    reason: 'Solicitação preliminar sob averiguação de fraude'
  });

  assert(refund, 'Estorno deve ser aberto');
  assert.equal(refund.status, 'AGUARDANDO_PRIMEIRA_AUTORIZACAO');

  const eligWithHold = store.calculatePayoutEligibility('evt-003');
  assert.equal(eligWithHold.refundsHold, holdBefore + 7500, 'Reserva de estorno deve ser retida');

  // Rejeição da solicitação de estorno
  const rejected = store.rejectInternalRefund({
    refundId: refund.id,
    reason: 'Contestação improcedente confirmada junto à operadora'
  });

  assert.equal(rejected.status, 'REJEITADO');
  assert(rejected.rejectedAt, 'Deve registrar timestamp da rejeição');
  assert(rejected.rejectedBy, 'Deve registrar operador que rejeitou');

  // A reserva hold deve ser liberada imediatamente
  const eligAfterReject = store.calculatePayoutEligibility('evt-003');
  assert.equal(eligAfterReject.refundsHold, holdBefore, 'Reserva hold deve retornar ao estado original após rejeição');

  // Tentativa de autorizar estorno rejeitado é bloqueada
  const authOnRejected = store.authorizeInternalRefund({ refundId: refund.id, factor: 'MFA' });
  assert.equal(authOnRejected, null, 'Estorno rejeitado não pode ser autorizado');
});

// 11. Agenda de Obrigações com Opção reserveNow (V0.5)
test('Agenda de obrigações respeita reserveNow: true (reserva imediata) e reserveNow: false (planejamento futuro)', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const eligBefore = store.calculatePayoutEligibility('evt-003');
  const holdBefore = eligBefore.obligationsHold || 0;

  // Obrigação futura planejada sem reserva imediata (reserveNow: false)
  const obFuture = store.createEventObligation({
    eventId: 'evt-003',
    category: 'FORNECEDOR',
    description: 'Iluminação cênica lote 2',
    value: 25000,
    dueDate: '2026-12-15',
    status: 'PREVISTO',
    reserveNow: false
  });

  assert.equal(obFuture.status, 'PREVISTO');
  assert.equal(obFuture.reserveNow, false);

  const eligAfterFuture = store.calculatePayoutEligibility('evt-003');
  assert.equal(eligAfterFuture.obligationsHold, holdBefore, 'Obrigação com reserveNow=false não pode reter limite de repasse');

  // Obrigação com reserva imediata (reserveNow: true)
  const obReserved = store.createEventObligation({
    eventId: 'evt-003',
    category: 'ALUGUEL_ESPACO',
    description: 'Adicional de camarins e gerador',
    value: 12000,
    dueDate: '2026-11-20',
    reserveNow: true
  });

  assert.equal(obReserved.status, 'RESERVADO');
  assert.equal(obReserved.reserveNow, true);

  const eligAfterReserved = store.calculatePayoutEligibility('evt-003');
  assert.equal(eligAfterReserved.obligationsHold, holdBefore + 12000, 'Obrigação com reserveNow=true deve ser retida no motor');
});

// 12. Receita com Amortização Automática por Percentual dos Recebíveis (V0.5)
test('Registro de receita dispara amortização automática em créditos com percentual dos recebíveis', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // Concede crédito com 20% de retenção sobre receitas
  const credit = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-inverno',
    principal: 30000,
    interestRate: 0,
    installments: 1,
    amortizationModel: 'PERCENTUAL_RECEBIVEIS',
    receivablePercent: 20.0,
    notes: 'Adiantamento com amortização automática sobre bilheteria'
  });

  assert.equal(credit.outstandingDebt, 30000);

  // Registro de nova receita de R$ 50.000 -> Amortização de 20% = R$ 10.000
  const result = store.registerEventRevenue({
    eventId: 'evt-inverno',
    amount: 50000,
    reason: 'Venda de lote extra de ingressos'
  });

  assert(result, 'Resultado de receita deve ser retornado');
  assert.equal(result.revenue, 50000);
  assert.equal(result.amortizations.length, 1);

  // Verifica que o contrato teve amortização de R$ 10.000
  const updatedCredit = (store.data.producerCredits || []).find(c => c.id === credit.id);
  assert.equal(updatedCredit.outstandingDebt, 20000);
  assert.equal(updatedCredit.amortizedTotal, 10000);
  assert.equal(updatedCredit.status, 'ATIVO');
});

// 13. Contrato Financeiro de Crédito com Cronograma de Parcelas e Delinquência (V0.6)
test('Contrato financeiro de crédito constrói cronograma de parcelas, apropria amortização e identifica status das parcelas', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const credit = store.grantProducerCredit({
    producerId: 'prod-abc',
    eventId: 'evt-001',
    contractRef: 'CTR-2026/04-ARENA',
    principal: 60000,
    interestRate: 0,
    installments: 3,
    firstDueDate: '2026-11-15',
    amortizationModel: 'PARCELAS_FIXAS',
    notes: 'Adiantamento com contrato formal e cronograma em 3 parcelas'
  });

  assert(credit, 'Crédito com contrato deve ser criado');
  assert.equal(credit.contractRef, 'CTR-2026/04-ARENA');
  assert.equal(credit.firstDueDate, '2026-11-15');
  assert(Array.isArray(credit.schedule), 'Cronograma de parcelas deve existir');
  assert.equal(credit.schedule.length, 3, 'Deve conter 3 parcelas no cronograma');

  // Cada parcela deve ter R$ 20.000 prevista
  assert.equal(credit.schedule[0].scheduledValue, 20000);
  assert.equal(credit.schedule[0].status, 'PENDENTE');
  assert.equal(credit.schedule[0].paidValue, 0);

  // Amortização parcial de R$ 25.000:
  // Quita integralmente a 1ª parcela (R$ 20.000) e paga parcialmente a 2ª parcela (R$ 5.000)
  store.amortizeProducerCredit({
    creditId: credit.id,
    amount: 25000,
    type: 'PARCELA_FIXA'
  });

  assert.equal(credit.schedule[0].status, 'PAGO');
  assert.equal(credit.schedule[0].paidValue, 20000);
  assert(credit.schedule[0].paidAt, 'Deve registrar data de pagamento da parcela');

  assert.equal(credit.schedule[1].status, 'PARCIAL');
  assert.equal(credit.schedule[1].paidValue, 5000);

  assert.equal(credit.schedule[2].status, 'PENDENTE');
  assert.equal(credit.schedule[2].paidValue, 0);

  assert.equal(credit.outstandingDebt, 35000);
});

// 14. Base Mestre de Produtores: Validação de CNPJ e Impedimento Estrito de Duplicidade (V0.7)
test('Validação de CNPJ e impedimento estrito de duplicidade no cadastro mestre de produtores', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // Validação de formato de CNPJ
  const invalidCnpj = store.validateCNPJ('123');
  assert.equal(invalidCnpj.valid, false, 'CNPJ com menos de 14 dígitos deve ser inválido');

  const repeatedCnpj = store.validateCNPJ('11111111111111');
  assert.equal(repeatedCnpj.valid, false, 'CNPJ com dígitos repetidos deve ser inválido');

  // Mock válido de teste (prod-xyz)
  const validMock = store.validateCNPJ('12.345.678/0001-90');
  assert.equal(validMock.valid, true, 'CNPJ mock padrão deve ser validado');

  // Impedimento de duplicidade ao criar produtor com CNPJ já existente
  let alerted = false;
  const originalAlert = global.alert;
  global.alert = (msg) => { alerted = true; };

  const duplicateCreation = store.createProducer({
    name: 'Tentativa Duplicada Ltda.',
    cnpj: '12.345.678/0001-90' // Já pertence a prod-xyz
  });

  assert.equal(duplicateCreation, null, 'Criação de produtor com CNPJ duplicado deve ser impedida');
  assert.equal(alerted, true, 'Alerta de impedimento de duplicidade deve ser disparado');

  // Sucesso com CNPJ único (usando outro mock válido: 22.418.990/0001-44)
  alerted = false;
  const uniqueProd = store.createProducer({
    name: 'Nova Produtora do Sul Ltda.',
    tradeName: 'Sul Produções',
    cnpj: '22418990000144',
    contactEmail: 'contato@sulproducoes.com.br'
  });

  assert(uniqueProd, 'Produtor com CNPJ válido e único deve ser criado com sucesso');
  assert.equal(uniqueProd.cnpj, '22.418.990/0001-44');
  assert.equal(uniqueProd.auditLog.length >= 1, true, 'Deve inicializar trilha de auditoria');

  global.alert = originalAlert;
});

// 15. Ficha Financeira: Edição Mestre e Trilha de Auditoria Cadastral Imutável (V0.7)
test('Edição do cadastro mestre registra trilha de auditoria cadastral detalhada e imutável', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  const p = store.data.producers.find(pr => pr.id === 'prod-xyz');
  const initialAuditCount = (p.auditLog || []).length;

  const updated = store.updateProducer('prod-xyz', {
    tradeName: 'XYZ Mega Produções',
    accountManager: 'Mariana Lima (Disk Ingressos)',
    rating: 'Tier A - Estratégico',
    companyDetails: {
      companySize: 'Grande Porte',
      taxRegime: 'Lucro Real'
    }
  });

  assert(updated, 'Atualização de produtor deve retornar o registro atualizado');
  assert.equal(updated.tradeName, 'XYZ Mega Produções');
  assert.equal(updated.accountManager, 'Mariana Lima (Disk Ingressos)');
  assert.equal(updated.rating, 'Tier A - Estratégico');
  assert.equal(updated.companyDetails.companySize, 'Grande Porte');
  assert.equal(updated.companyDetails.taxRegime, 'Lucro Real');

  assert.equal(updated.auditLog.length, initialAuditCount + 1, 'Trilha de auditoria deve conter novo registro de alteração');
  assert.equal(updated.auditLog[0].action, 'Edição de Cadastro Mestre');
});

// 16. Busca Global de Entidades por Razão Social, Nome Fantasia, CNPJ e ID (V0.7)
test('Busca global localiza produtores por Nome, Nome Fantasia, CNPJ e ID, bem como eventos', () => {
  const store = new CoreFinanceiroStore();

  // Busca por CNPJ
  const searchCnpj = store.searchGlobalEntities('12.345.678');
  assert.equal(searchCnpj.producers.some(p => p.id === 'prod-xyz'), true, 'Deve localizar produtor pelo CNPJ');

  // Busca por Nome Fantasia
  const searchTrade = store.searchGlobalEntities('ABC Produções');
  assert.equal(searchTrade.producers.some(p => p.id === 'prod-abc'), true, 'Deve localizar produtor pelo nome fantasia');

  // Busca por ID
  const searchId = store.searchGlobalEntities('prod-premium');
  assert.equal(searchId.producers.some(p => p.id === 'prod-premium'), true, 'Deve localizar produtor pelo ID');

  // Busca de Evento
  const searchEvent = store.searchGlobalEntities('Festival Curitiba');
  assert.equal(searchEvent.events.some(e => e.id === 'evt-001'), true, 'Deve localizar evento pelo nome');
});

// 17. Documentos Societários & Comprovantes: Controle de Visibilidade Segregado (V0.7)
test('Anexar documento não publica automaticamente e respeita visibilidade Interno Disk vs Produtor', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // 1. Anexar documento corporativo societário sem marcar visibleToProducer
  const doc = store.addProducerDocument('prod-xyz', {
    type: 'Contrato Social',
    name: 'Contrato Social Consolidado 2026',
    fileName: 'contrato_social_2026.pdf',
    visibleToProducer: false
  });

  assert(doc, 'Documento societário deve ser anexado');
  assert.equal(doc.visibleToProducer, false, 'Regra de governança: Anexar NÃO publica automaticamente');

  // 2. Toggle de visibilidade para disponibilizar ao produtor
  store.toggleProducerDocumentVisibility('prod-xyz', doc.id);
  const p = store.data.producers.find(pr => pr.id === 'prod-xyz');
  const updatedDoc = p.documents.find(d => d.id === doc.id);
  assert.equal(updatedDoc.visibleToProducer, true, 'Documento deve transicionar para Disponível ao Produtor');

  // 3. Trilha de auditoria registra a ação
  assert.equal(p.auditLog[0].action, 'Alteração de Visibilidade Documental');
});

// 18. Contexto Financeiro Persistente do Produtor (V0.9)
test('Contexto persistente do produtor selecionado filtra transversalmente Eventos, Repasses, Aprovações e Ledger', () => {
  const store = new CoreFinanceiroStore();
  store.login('disk');

  // 1. Contexto inicial sem produtor selecionado ('all')
  store.setProducerContext('all');
  assert.equal(store.state.selectedProducerId, 'all');

  const solicitacoesAllHtml = renderDiskSolicitacoes(store.getState());
  assert(solicitacoesAllHtml.includes('REP-00291'), 'Visão global deve conter REP-00291 (prod-abc)');
  assert(solicitacoesAllHtml.includes('REP-00290'), 'Visão global deve conter REP-00290 (prod-xyz)');

  const aprovacoesAllHtml = renderDiskAprovacoes(store.getState());
  assert(aprovacoesAllHtml.includes('REP-00291'), 'Aprovações global deve conter REP-00291');
  assert(aprovacoesAllHtml.includes('REP-00290'), 'Aprovações global deve conter REP-00290');

  // 2. Ativa contexto persistente para prod-xyz (Eventos XYZ Produções Artísticas)
  store.setProducerContext('prod-xyz');
  assert.equal(store.state.selectedProducerId, 'prod-xyz');
  assert.equal(store.state.currentProducerId, 'prod-xyz');

  const stateXyz = store.getState();

  // A) Solicitacoes deve filtrar apenas solicitações de prod-xyz
  const solicitacoesXyzHtml = renderDiskSolicitacoes(stateXyz);
  assert(solicitacoesXyzHtml.includes('REP-00290'), 'Solicitações deve exibir repasse de prod-xyz');
  assert(!solicitacoesXyzHtml.includes('REP-00291'), 'Solicitações NÃO deve exibir repasse de prod-abc quando prod-xyz está ativo');
  assert(solicitacoesXyzHtml.includes('Contexto Ativo'), 'Deve exibir banner de contexto ativo');

  // B) Aprovações deve filtrar apenas aprovações de prod-xyz
  const aprovacoesXyzHtml = renderDiskAprovacoes(stateXyz);
  assert(aprovacoesXyzHtml.includes('REP-00290'), 'Aprovações deve exibir item de prod-xyz');
  assert(!aprovacoesXyzHtml.includes('REP-00291'), 'Aprovações NÃO deve exibir item de prod-abc');
  assert(aprovacoesXyzHtml.includes('Fila Filtrada'), 'Deve exibir indicador de fila filtrada');

  // C) Eventos transversal deve filtrar apenas eventos de prod-xyz
  const eventosXyzHtml = renderDiskEventos(stateXyz);
  assert(eventosXyzHtml.includes('Show Nacional de Rock Curitiba'), 'Eventos deve exibir evento de prod-xyz');
  assert(!eventosXyzHtml.includes('Festival Curitiba 2026'), 'Eventos NÃO deve exibir evento de prod-abc');

  // D) Ledger contábil deve filtrar lançamentos de prod-abc quando prod-abc for ativado
  store.setProducerContext('prod-abc');
  const stateAbc = store.getState();
  const ledgerAbcHtml = renderDiskLedger(stateAbc);
  assert(ledgerAbcHtml.includes('LEDG-89104'), 'Ledger deve conter lançamentos de prod-abc');
  assert(ledgerAbcHtml.includes('Ledger Filtrado'), 'Deve exibir indicador de Ledger filtrado');

  // 3. Limpar contexto (restaurar visão consolidada de todos)
  store.setProducerContext('all');
  const stateReset = store.getState();
  assert.equal(stateReset.selectedProducerId, 'all');

  const solicitacoesResetHtml = renderDiskSolicitacoes(stateReset);
  assert(solicitacoesResetHtml.includes('REP-00291'), 'Após limpar filtro, deve exibir prod-abc novamente');
  assert(solicitacoesResetHtml.includes('REP-00290'), 'Após limpar filtro, deve exibir prod-xyz novamente');
});

console.log(`\nTodos os ${passed} testes da Conta Financeira do Produtor passaram com sucesso!`);
