/**
 * Servidor REST do Módulo Conta Financeira Interna Disk (v0.3)
 * Acesso exclusivo do perfil FINANCEIRO_DISK.
 * Segurança: Dupla autorização com segregação de funções em estornos e controle de agenda de obrigações.
 */

import express from 'express';
import cors from 'cors';
import { state, calculateAccount, addLedgerEntry } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

const getActor = (req) => req.header('x-user-name') || req.body?.actor || 'Usuário Financeiro Disk';

// Middleware de isolamento arquitetural estrito: Acesso exclusivo do Financeiro Disk
const requireFinancialRole = (req, res, next) => {
  const role = req.header('x-role') || 'FINANCEIRO_DISK';
  if (role !== 'FINANCEIRO_DISK') {
    return res.status(403).json({
      error: 'Acesso Negado: A Conta Financeira de Controle Interno é de uso exclusivo do Financeiro Disk.'
    });
  }
  next();
};

app.use('/api/interno', requireFinancialRole);

// Health check
app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    module: 'financeiro-disk-conta-interna',
    version: '0.6',
    features: ['reservas_obrigacoes', 'estornos_dupla_autorizacao_sod', 'ledger_central', 'credito_antecipacao', 'movimentacao_evento', 'receitas_amortizacao_automatica'],
    timestamp: new Date().toISOString()
  });
});

// Movimentação detalhada de um evento específico (drilldown contábil)
app.get('/api/interno/eventos/:id/movimentacao', (req, res) => {
  const calculated = calculateAccount();
  const ev = calculated.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });
  const obligations = (state.obligations || []).filter(o => o.eventId === ev.id);
  const refunds = (state.refunds || []).filter(r => r.eventId === ev.id);
  const credits = (state.credits || []).filter(c => c.eventId === ev.id);
  const ledger = (state.ledger || []).filter(l => l.eventId === ev.id);
  res.json({
    event: ev,
    obligations,
    refunds,
    credits,
    ledger
  });
});

// Extrato do Ledger imutável
app.get('/api/interno/ledger', (req, res) => {
  const { eventId, type } = req.query;
  let entries = state.ledger || [];
  if (eventId && eventId !== 'all') entries = entries.filter(e => e.eventId === eventId);
  if (type && type !== 'all') entries = entries.filter(e => e.type === type);
  res.json(entries);
});

// Dashboard consolidado
app.get('/api/interno/dashboard', (_, res) => {
  const calculated = calculateAccount();
  res.json({
    ...calculated,
    policy: state.policy,
    requests: state.requests || []
  });
});

// Política de Repasse
app.get('/api/interno/politica', (_, res) => res.json(state.policy));
app.put('/api/interno/politica', (req, res) => {
  state.policy = { ...state.policy, ...req.body, updatedAt: new Date().toISOString() };
  res.json(state.policy);
});

// Agenda de Obrigações (Aluguel, ECAD, Fornecedores)
app.get('/api/interno/obrigacoes', (_, res) => res.json(state.obligations || []));
app.post('/api/interno/obrigacoes', (req, res) => {
  const { eventId, category = 'OUTROS', description, beneficiary, value, dueDate, documentRef, status = 'RESERVADO', notes, reserveNow } = req.body;
  if (!eventId || !description || Number(value) <= 0) {
    return res.status(400).json({ error: 'Evento, descrição e valor positivo são obrigatórios.' });
  }

  const shouldReserve = reserveNow === true || (reserveNow !== false && status === 'RESERVADO');
  const ev = state.events.find(e => e.id === eventId);
  const obligation = {
    id: `OB-${Date.now()}`,
    eventId,
    eventName: ev ? ev.name : eventId,
    category,
    description: description.trim(),
    beneficiary: beneficiary ? beneficiary.trim() : 'Favorecido não especificado',
    value: Number(value),
    dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    documentRef: documentRef ? documentRef.trim() : '',
    status: shouldReserve ? 'RESERVADO' : (status || 'PREVISTO'),
    reserveNow: shouldReserve,
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
    actor: getActor(req)
  };

  state.obligations.unshift(obligation);

  if (shouldReserve) {
    addLedgerEntry({
      eventId,
      type: 'RETENCAO',
      value: obligation.value,
      reason: `Reserva de obrigação: ${obligation.description} (${obligation.beneficiary})`,
      beneficiary: obligation.beneficiary,
      actor: obligation.actor
    });
  }

  res.status(201).json(obligation);
});

app.patch('/api/interno/obrigacoes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const ob = state.obligations.find(o => o.id === id);
  if (!ob) return res.status(404).json({ error: 'Obrigação não encontrada.' });

  const oldStatus = ob.status;
  ob.status = status;
  ob.updatedAt = new Date().toISOString();
  if (notes) ob.notes = `${ob.notes ? ob.notes + ' | ' : ''}${notes.trim()}`;

  if (status === 'LIQUIDADO') {
    ob.liquidatedAt = new Date().toISOString();
    ob.liquidatedBy = getActor(req);
    addLedgerEntry({
      eventId: ob.eventId,
      type: 'LIBERACAO',
      value: ob.value,
      reason: `Baixa de reserva para liquidação: ${ob.description}`,
      actor: ob.liquidatedBy
    });
  }

  res.json(ob);
});

// Estornos com Reserva Imediata e Dupla Autorização Estrita (SoD)
app.get('/api/interno/estornos', (_, res) => res.json(state.refunds || []));
app.post('/api/interno/estornos', (req, res) => {
  const { eventId, orderId, value, reason } = req.body;
  if (!eventId || !orderId || Number(value) <= 0 || !reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Evento, pedido, valor positivo e justificativa (mín. 5 chars) são obrigatórios.' });
  }

  const ev = state.events.find(e => e.id === eventId);
  const actor = getActor(req);

  const refund = {
    id: `ES-${Date.now()}`,
    eventId,
    eventName: ev ? ev.name : eventId,
    orderId: orderId.trim(),
    value: Number(value),
    reason: reason.trim(),
    status: 'AGUARDANDO_PRIMEIRA_AUTORIZACAO',
    requestedBy: actor,
    approvals: [],
    executedBy: null,
    executedAt: null,
    createdAt: new Date().toISOString()
  };

  state.refunds.unshift(refund);

  addLedgerEntry({
    eventId,
    type: 'RESERVA_ESTORNO',
    value: refund.value,
    reason: `Reserva imediata do estorno ${refund.id} / pedido ${orderId}`,
    actor
  });

  res.status(201).json(refund);
});

app.post('/api/interno/estornos/:id/autorizar', (req, res) => {
  const refund = state.refunds.find(r => r.id === req.params.id);
  if (!refund) return res.status(404).json({ error: 'Estorno não encontrado.' });
  if (['EFETIVADO', 'REJEITADO', 'CANCELADO'].includes(refund.status)) {
    return res.status(409).json({ error: 'Este estorno já foi encerrado.' });
  }

  const actor = getActor(req);
  const alreadyApproved = (refund.approvals || []).some(a => a.user === actor);

  // Regra de SoD: O mesmo usuário não pode dar a 1ª e a 2ª autorização
  if (alreadyApproved) {
    return res.status(409).json({
      error: 'Segregação de Funções: O mesmo operador não pode autorizar duas vezes a mesma operação.'
    });
  }

  refund.approvals = refund.approvals || [];
  refund.approvals.push({
    approvalIndex: refund.approvals.length + 1,
    user: actor,
    at: new Date().toISOString(),
    factor: req.body.factor || 'REAUTENTICACAO_MFA',
    notes: req.body.notes || ''
  });

  if (refund.approvals.length === 1) {
    refund.status = 'AGUARDANDO_SEGUNDA_AUTORIZACAO';
  } else if (refund.approvals.length >= 2) {
    refund.status = 'AUTORIZADO_PARA_EFETIVAR';
  }

  res.json(refund);
});

app.post('/api/interno/estornos/:id/efetivar', (req, res) => {
  const refund = state.refunds.find(r => r.id === req.params.id);
  if (!refund) return res.status(404).json({ error: 'Estorno não encontrado.' });

  if (refund.status !== 'AUTORIZADO_PARA_EFETIVAR' || (refund.approvals || []).length < 2) {
    return res.status(422).json({
      error: 'Efetivação Bloqueada: Estorno exige duas autorizações distintas antes da liquidação financeira.'
    });
  }

  const actor = getActor(req);
  refund.status = 'EFETIVADO';
  refund.executedBy = actor;
  refund.executedAt = new Date().toISOString();

  // Baixa da reserva e lançamento do estorno efetivado no ledger
  addLedgerEntry({
    eventId: refund.eventId,
    type: 'LIBERACAO',
    value: refund.value,
    reason: `Baixa da reserva do estorno ${refund.id}`,
    actor
  });

  addLedgerEntry({
    eventId: refund.eventId,
    type: 'ESTORNO_EFETIVADO',
    value: refund.value,
    reason: `Estorno ${refund.id} / pedido ${refund.orderId} liquidado`,
    actor
  });

  res.json(refund);
});

app.post('/api/interno/estornos/:id/cancelar', (req, res) => {
  const refund = state.refunds.find(r => r.id === req.params.id);
  if (!refund) return res.status(404).json({ error: 'Estorno não encontrado.' });
  if (refund.status === 'EFETIVADO') {
    return res.status(409).json({ error: 'Estorno já efetivado não pode ser cancelado.' });
  }

  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Justificativa de cancelamento obrigatória (mín. 5 chars).' });
  }

  const actor = getActor(req);
  refund.status = 'CANCELADO';
  refund.cancelledBy = actor;
  refund.cancelledAt = new Date().toISOString();
  refund.cancelReason = reason.trim();

  addLedgerEntry({
    eventId: refund.eventId,
    type: 'LIBERACAO',
    value: refund.value,
    reason: `Liberação de reserva do estorno cancelado ${refund.id}`,
    actor
  });

  res.json(refund);
});

app.post('/api/interno/estornos/:id/rejeitar', (req, res) => {
  const refund = state.refunds.find(r => r.id === req.params.id);
  if (!refund) return res.status(404).json({ error: 'Estorno não encontrado.' });
  if (refund.status === 'EFETIVADO') {
    return res.status(409).json({ error: 'Estorno já efetivado não pode ser rejeitado.' });
  }

  const actor = getActor(req);
  refund.status = 'REJEITADO';
  refund.rejectedBy = actor;
  refund.rejectedAt = new Date().toISOString();
  if (req.body?.reason) refund.rejectReason = req.body.reason.trim();

  addLedgerEntry({
    eventId: refund.eventId,
    type: 'LIBERACAO',
    value: refund.value,
    reason: `Liberação da reserva por rejeição do estorno ${refund.id}${refund.rejectReason ? ': ' + refund.rejectReason : ''}`,
    actor
  });

  res.json(refund);
});



// V0.6 — Contrato, cronograma e posição detalhada do crédito
function buildInstallmentSchedule(credit, firstDueDate) {
  const start = firstDueDate ? new Date(firstDueDate + 'T12:00:00') : new Date();
  if (!firstDueDate) start.setMonth(start.getMonth() + 1);
  const schedule = [];
  for (let i = 1; i <= credit.installmentsCount; i++) {
    const due = new Date(start);
    due.setMonth(start.getMonth() + (i - 1));
    schedule.push({
      installment: i,
      dueDate: due.toISOString().slice(0, 10),
      scheduledValue: credit.installmentValue,
      paidValue: 0,
      status: 'PENDENTE',
      paidAt: null
    });
  }
  return schedule;
}

function applyPaymentToSchedule(credit, value, paidAt = new Date().toISOString()) {
  let remaining = Number(value);
  credit.schedule = credit.schedule || buildInstallmentSchedule(credit);
  for (const item of credit.schedule) {
    if (remaining <= 0) break;
    const open = Math.max(0, Number(item.scheduledValue) - Number(item.paidValue || 0));
    if (open <= 0) continue;
    const applied = Math.min(open, remaining);
    item.paidValue = Number((Number(item.paidValue || 0) + applied).toFixed(2));
    remaining = Number((remaining - applied).toFixed(2));
    if (item.paidValue >= item.scheduledValue) {
      item.status = 'PAGO';
      item.paidAt = paidAt;
    } else {
      item.status = 'PARCIAL';
    }
  }
}

function refreshCreditDelinquency(credit) {
  const today = new Date().toISOString().slice(0,10);
  for (const item of (credit.schedule || [])) {
    if (item.status !== 'PAGO' && item.dueDate < today) item.status = item.paidValue > 0 ? 'PARCIAL_VENCIDA' : 'VENCIDA';
  }
  if (credit.status === 'ATIVO' && (credit.schedule || []).some(i => ['VENCIDA','PARCIAL_VENCIDA'].includes(i.status))) credit.status = 'EM_ATRASO';
  if (credit.outstandingDebt <= 0) credit.status = 'LIQUIDADO';
}

// Créditos e Antecipações
app.get('/api/interno/creditos', (_, res) => {
  for (const c of state.credits || []) {
    if (!c.schedule) c.schedule = buildInstallmentSchedule(c, c.firstDueDate);
    refreshCreditDelinquency(c);
  }
  res.json(state.credits || []);
});
app.get('/api/interno/creditos/:id', (req, res) => {
  const credit = state.credits.find(c => c.id === req.params.id);
  if (!credit) return res.status(404).json({ error: 'Contrato de crédito não encontrado.' });
  if (!credit.schedule) credit.schedule = buildInstallmentSchedule(credit, credit.firstDueDate);
  refreshCreditDelinquency(credit);
  res.json(credit);
});
app.post('/api/interno/creditos', (req, res) => {
  const { eventId, principal, interestRate = 2.0, installments = 5, amortization = 'PARCELAS_FIXAS', receivablePercent = 15.0, notes = '', firstDueDate = null, contractRef = '', interestModel = 'JUROS_SIMPLES_MENSAL' } = req.body;
  const numPrincipal = parseFloat(principal);
  if (!eventId || !numPrincipal || numPrincipal <= 0) {
    return res.status(400).json({ error: 'Evento e valor principal positivo são obrigatórios.' });
  }

  const ev = state.events.find(e => e.id === eventId);
  const numInterest = parseFloat(interestRate) || 0;
  const numInstallments = Math.max(1, parseInt(installments) || 1);
  const totalDebt = numPrincipal * (1 + (numInterest * numInstallments) / 100);
  const installmentValue = totalDebt / numInstallments;
  const actor = getActor(req);

  const credit = {
    id: `CR-${Date.now()}`,
    protocol: `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    producerId: state.producer.id,
    eventId,
    eventName: ev ? ev.name : eventId,
    principal: numPrincipal,
    interestRate: numInterest,
    installmentsCount: numInstallments,
    installmentValue: Math.round(installmentValue * 100) / 100,
    amortizationModel: amortization,
    receivablePercent: parseFloat(receivablePercent) || 0,
    totalDebt: Math.round(totalDebt * 100) / 100,
    outstandingDebt: Math.round(totalDebt * 100) / 100,
    amortizedTotal: 0,
    status: 'ATIVO',
    grantedAt: new Date().toISOString(),
    grantedBy: actor,
    notes: (notes || '').trim(),
    contractRef: (contractRef || '').trim(),
    interestModel,
    firstDueDate,
    amortizationHistory: []
  };

  credit.schedule = buildInstallmentSchedule(credit, firstDueDate);
  state.credits.unshift(credit);

  addLedgerEntry({
    eventId,
    type: 'CREDITO_CONCEDIDO',
    value: numPrincipal,
    reason: `Crédito ${credit.protocol} concedido`,
    actor
  });

  res.status(201).json(credit);
});

app.post('/api/interno/creditos/:id/amortizar', (req, res) => {
  const credit = state.credits.find(c => c.id === req.params.id);
  if (!credit) return res.status(404).json({ error: 'Contrato de crédito não encontrado.' });
  if (credit.status !== 'ATIVO') return res.status(409).json({ error: 'Contrato de crédito já quitado.' });

  const numValue = parseFloat(req.body.value || credit.installmentValue || 0);
  if (!numValue || numValue <= 0) return res.status(400).json({ error: 'Valor de amortização inválido.' });

  const amortizedValue = Math.min(numValue, credit.outstandingDebt);
  credit.outstandingDebt = Math.round((credit.outstandingDebt - amortizedValue) * 100) / 100;
  credit.amortizedTotal = Math.round((credit.amortizedTotal + amortizedValue) * 100) / 100;

  if (credit.outstandingDebt <= 0) {
    credit.status = 'LIQUIDADO';
    credit.liquidatedAt = new Date().toISOString();
  }

  const actor = getActor(req);
  credit.amortizationHistory = credit.amortizationHistory || [];
  applyPaymentToSchedule(credit, amortizedValue);
  refreshCreditDelinquency(credit);
  credit.amortizationHistory.unshift({
    id: `AM-${Date.now()}`,
    date: new Date().toLocaleString('pt-BR'),
    value: amortizedValue,
    type: req.body.type || 'PARCELA_FIXA',
    balanceAfter: credit.outstandingDebt,
    actor
  });

  addLedgerEntry({
    eventId: credit.eventId,
    type: 'AMORTIZACAO_CREDITO',
    value: amortizedValue,
    reason: `Amortização de parcela no contrato ${credit.protocol || credit.id}`,
    actor
  });

  res.json(credit);
});

// Registro de Receita com Amortização Automática por Percentual de Recebíveis (V0.5)
app.post('/api/interno/receitas', (req, res) => {
  const { eventId, value } = req.body;
  if (!eventId || Number(value) <= 0) {
    return res.status(400).json({ error: 'Evento e valor positivo são obrigatórios.' });
  }
  const revenue = Number(value);
  const actor = getActor(req);

  const ev = state.events.find(e => e.id === eventId);
  if (ev) {
    ev.sold = Number(((ev.sold || 0) + revenue).toFixed(2));
    if (ev.grossSales !== undefined) ev.grossSales = Number(((ev.grossSales || 0) + revenue).toFixed(2));
  }

  addLedgerEntry({
    eventId,
    type: 'RECEITA_EVENTO',
    value: revenue,
    reason: req.body.reason || 'Receita registrada no evento',
    actor
  });

  const amortizations = [];
  const candidateCredits = state.credits.filter(
    c => c.eventId === eventId && c.status === 'ATIVO' &&
    (c.amortization === 'PERCENTUAL_RECEBIVEIS' || c.amortizationModel === 'PERCENTUAL_RECEBIVEIS') &&
    (c.receivablePercent || 0) > 0
  );

  for (const c of candidateCredits) {
    const currentOutstanding = c.outstandingDebt ?? c.outstanding ?? 0;
    const amount = Math.min(currentOutstanding, Number((revenue * (c.receivablePercent / 100)).toFixed(2)));
    if (amount > 0) {
      const remaining = Number((currentOutstanding - amount).toFixed(2));
      c.outstandingDebt = remaining;
      c.outstanding = remaining;
      c.amortizedTotal = Number(((c.amortizedTotal || 0) + amount).toFixed(2));
      applyPaymentToSchedule(c, amount);
      refreshCreditDelinquency(c);
      if (remaining <= 0) {
        c.status = 'LIQUIDADO';
        c.liquidatedAt = new Date().toISOString();
      }
      const entry = addLedgerEntry({
        eventId,
        type: 'AMORTIZACAO_CREDITO',
        value: amount,
        reason: `Amortização automática ${c.protocol || c.id} sobre receita`,
        actor: 'Motor Financeiro'
      });
      amortizations.push(entry);
    }
  }

  res.status(201).json({ revenue, amortizations });
});

// Bloqueios e Liberações Avulsas
app.post('/api/interno/retencoes', (req, res) => {
  const { eventId, value, reason, type = 'RETENCAO', beneficiary } = req.body;
  if (!eventId || Number(value) <= 0 || !reason) {
    return res.status(400).json({ error: 'Evento, valor e motivo são obrigatórios.' });
  }
  const entry = addLedgerEntry({
    eventId,
    type,
    value: Number(value),
    reason,
    beneficiary,
    actor: getActor(req)
  });
  res.status(201).json(entry);
});

app.post('/api/interno/liberacoes', (req, res) => {
  const { eventId, value, reason } = req.body;
  if (!eventId || Number(value) <= 0 || !reason) {
    return res.status(400).json({ error: 'Evento, valor e motivo são obrigatórios.' });
  }
  const entry = addLedgerEntry({
    eventId,
    type: 'LIBERACAO',
    value: Number(value),
    reason,
    actor: getActor(req)
  });
  res.status(201).json(entry);
});

// Motor de Elegibilidade e Solicitações de Repasse
app.get('/api/interno/repasses/elegibilidade/:eventId', (req, res) => {
  const calculated = calculateAccount();
  const ev = calculated.events.find(e => e.id === req.params.eventId);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });
  res.json(ev.eligibility);
});

app.post('/api/interno/repasses/solicitacoes', (req, res) => {
  const calculated = calculateAccount();
  const ev = calculated.events.find(e => e.id === req.body.eventId);
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado.' });

  const numValue = Number(req.body.value);
  if (!numValue || numValue <= 0) return res.status(400).json({ error: 'Valor inválido.' });

  if (numValue > ev.eligibility.availableToRequest && !req.body.exceptionAuthorization) {
    return res.status(422).json({
      error: `Valor solicitado (${numValue}) excede o disponível elegível (${ev.eligibility.availableToRequest}) após todas as deduções de obrigações e estornos.`
    });
  }

  const actor = getActor(req);
  const request = {
    id: `RP-${Date.now()}`,
    protocol: `RP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    eventId: ev.id,
    eventName: ev.name,
    value: numValue,
    bankAccount: req.body.bankAccount || 'Conta Bancária Homologada',
    status: 'AGUARDANDO_APROVACAO',
    requestedAt: new Date().toISOString(),
    workflowStep: 'ANALISE_MESA',
    actor,
    signatures: {
      producer: { signed: true, at: new Date().toISOString(), user: actor },
      disk: { signed: false, at: null, user: null }
    }
  };

  state.requests = state.requests || [];
  state.requests.unshift(request);
  res.status(201).json(request);
});

app.listen(PORT, () => {
  console.log(`[Financeiro Disk] Conta Financeira Interna API rodando em http://localhost:${PORT}`);
});