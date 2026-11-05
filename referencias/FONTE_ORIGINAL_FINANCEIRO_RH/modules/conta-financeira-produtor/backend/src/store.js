/**
 * Store Central da Conta Financeira do Produtor — Homologação PDT Novo (v0.3)
 * Regra Arquitetural Obrigatória:
 *  - Uso exclusivo do Financeiro Disk (invisível ao produtor).
 *  - Reservas e Retenções preventivas para aluguel, ECAD, fornecedores e operacionais.
 *  - Fila de Estornos com reserva imediata de saldo e Dupla Autorização Estrita (SoD).
 *  - Invariante contábil: Saldo anterior + créditos - débitos = saldo atual.
 */

export const state = {
  producer: {
    id: "PROD-001",
    name: "Produtora Alpha Brasil Ltda.",
    cnpj: "14.829.301/0001-92",
    email: "financeiro@alphabrasil.com.br",
    manager: "Karine Mendes (Financeiro Disk)"
  },

  policy: {
    minimumSalesPercent: 50,
    releasePercent: 20,
    considerBlocks: true,
    considerCreditAmortization: true,
    requireApproval: true,
    requireSignature: true,
    refundDualAuthorization: true,
    allowAdministrativeException: true,
    updatedAt: "2026-10-02T11:00:00Z",
    updatedBy: "Diretoria Financeira Disk"
  },

  events: [
    {
      id: "EV-001",
      name: "Festival de Homologação 2026",
      salesTarget: 1000000.00,
      sold: 540000.00,
      grossSales: 540000.00,
      netRevenue: 486000.00,
      date: "15/11/2026"
    },
    {
      id: "EV-002",
      name: "Show de Outono Curitiba",
      salesTarget: 800000.00,
      sold: 240000.00,
      grossSales: 240000.00,
      netRevenue: 216000.00,
      date: "28/11/2026"
    },
    {
      id: "EV-003",
      name: "Arena Eletrônica Fest",
      salesTarget: 2000000.00,
      sold: 1500000.00,
      grossSales: 1500000.00,
      netRevenue: 1350000.00,
      date: "12/12/2026"
    }
  ],

  ledger: [
    {
      id: "L-001",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      type: "CREDITO_CONCEDIDO",
      value: 100000.00,
      balanceAfter: 100000.00,
      reason: "Concessão de crédito pré-evento para custeio de infraestrutura de som e luz",
      actor: "Karine (Financeiro Disk)",
      createdAt: "2026-09-20T10:00:00Z"
    },
    {
      id: "L-002",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      type: "AMORTIZACAO_CREDITO",
      value: 22000.00,
      balanceAfter: 78000.00,
      reason: "Amortização da 1ª parcela de crédito retida da bilheteria líquida",
      actor: "Motor de Conciliação Automática",
      createdAt: "2026-09-30T14:30:00Z"
    },
    {
      id: "L-003",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      type: "RETENCAO",
      value: 80000.00,
      balanceAfter: 158000.00,
      reason: "Reserva preventiva para garantia do aluguel do espaço",
      beneficiary: "Teatro Positivo Ltda.",
      actor: "Financeiro Disk",
      createdAt: "2026-10-01T12:00:00Z"
    },
    {
      id: "L-004",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      type: "RETENCAO",
      value: 15000.00,
      balanceAfter: 173000.00,
      reason: "Reserva preventiva para garantia de direitos autorais ECAD",
      beneficiary: "ECAD",
      actor: "Financeiro Disk",
      createdAt: "2026-10-01T12:10:00Z"
    },
    {
      id: "L-005",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      type: "REPASSE",
      value: 20000.00,
      balanceAfter: 153000.00,
      reason: "Repasse ordinário liberado conforme protocolo REP-2026-00041",
      actor: "Carlos (Tesouraria Disk)",
      createdAt: "2026-09-25T16:00:00Z"
    }
  ],

  obligations: [
    {
      id: "OB-001",
      eventId: "EV-001",
      category: "ALUGUEL_ESPACO",
      description: "Aluguel do Teatro / Espaço Principal",
      beneficiary: "Teatro Positivo Ltda.",
      value: 80000.00,
      dueDate: "2026-11-10",
      documentRef: "Contrato 2026/04",
      status: "RESERVADO", // 'PREVISTO', 'RESERVADO', 'RETIDO', 'LIQUIDADO'
      createdAt: "2026-10-01T12:00:00Z",
      actor: "Financeiro Disk"
    },
    {
      id: "OB-002",
      eventId: "EV-001",
      category: "ECAD",
      description: "Direitos Autorais / ECAD",
      beneficiary: "ECAD",
      value: 15000.00,
      dueDate: "2026-11-15",
      documentRef: "Guia ECAD 10/2026",
      status: "RESERVADO",
      createdAt: "2026-10-01T12:10:00Z",
      actor: "Financeiro Disk"
    },
    {
      id: "OB-003",
      eventId: "EV-001",
      category: "OPERACIONAL",
      description: "Segurança e Brigada",
      beneficiary: "Alfa Segurança",
      value: 10000.00,
      dueDate: "2026-11-05",
      documentRef: "OS-8821",
      status: "RESERVADO",
      createdAt: "2026-10-01T12:20:00Z",
      actor: "Financeiro Disk"
    }
  ],

  refunds: [
    {
      id: "ES-001",
      eventId: "EV-001",
      orderId: "PED-98421",
      value: 1250.00,
      reason: "Cancelamento VIP Duplo solicitado via SAC",
      status: "AGUARDANDO_SEGUNDA_AUTORIZACAO",
      requestedBy: "João Analista (Financeiro Disk)",
      approvals: [
        {
          approvalIndex: 1,
          user: "Karine Mendes",
          at: "2026-10-02T10:15:00Z",
          factor: "MFA_TOKEN_VALIDADO",
          notes: "1ª autorização técnica"
        }
      ],
      createdAt: "2026-10-02T10:00:00Z"
    }
  ],

  credits: [
    {
      id: "CR-2026-001",
      protocol: "CR-2026-0001",
      producerId: "PROD-001",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      principal: 100000.00,
      interestRate: 2.0, // 2% a.m.
      installmentsCount: 5,
      installmentValue: 22000.00,
      amortizationModel: "PARCELAS_FIXAS",
      receivablePercent: 15.0,
      totalDebt: 110000.00,
      outstandingDebt: 88000.00,
      amortizedTotal: 22000.00,
      status: "ATIVO",
      grantedAt: "2026-09-20T10:00:00Z",
      grantedBy: "Karine (Financeiro Disk)",
      notes: "Adiantamento para contratação de headliners e montagem de palco",
      amortizationHistory: [
        {
          id: "AM-1",
          date: "2026-09-30 14:30",
          value: 22000.00,
          type: "PARCELA_FIXA",
          balanceAfter: 88000.00,
          actor: "Motor de Conciliação Automática"
        }
      ]
    }
  ],

  requests: [
    {
      id: "RP-2026-00089",
      protocol: "RP-2026-00089",
      producerId: "PROD-001",
      eventId: "EV-001",
      eventName: "Festival de Homologação 2026",
      value: 35000.00,
      bankAccount: "Banco do Brasil - Ag 1234 CC 56789-0",
      status: "AGUARDANDO_APROVACAO",
      requestedAt: "2026-10-02T09:15:00Z",
      workflowStep: "ANALISE_MESA",
      signatures: {
        producer: { signed: true, at: "2026-10-02T09:15:00Z", user: "João Silva" },
        disk: { signed: false, at: null, user: null }
      }
    }
  ]
};

export function addLedgerEntry({ eventId, type, value, reason, actor, beneficiary }) {
  const numericValue = parseFloat(value);
  if (!numericValue || isNaN(numericValue)) return null;

  const ev = state.events.find(e => e.id === eventId);
  const previousEntries = state.ledger.filter(l => l.eventId === eventId);
  const previousBalance = previousEntries.length > 0 ? previousEntries[0].balanceAfter : 0;

  let newBalance = previousBalance;
  if (["CREDITO_CONCEDIDO", "BLOQUEIO", "RETENCAO", "RESERVA_ESTORNO"].includes(type)) {
    newBalance += numericValue;
  } else if (["AMORTIZACAO_CREDITO", "LIBERACAO", "REPASSE", "ESTORNO_EFETIVADO"].includes(type)) {
    newBalance = Math.max(0, newBalance - numericValue);
  }

  const entry = {
    id: `L-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId,
    eventName: ev ? ev.name : "Evento Geral",
    producerId: state.producer.id,
    type,
    value: numericValue,
    balanceAfter: Math.round(newBalance * 100) / 100,
    reason: (reason || "").trim(),
    beneficiary: beneficiary ? beneficiary.trim() : null,
    actor: actor || "Financeiro Disk",
    createdAt: new Date().toISOString()
  };

  state.ledger.unshift(entry);
  return entry;
}

export function calculateAccount() {
  const eventsCalculated = state.events.map(event => {
    const entries = state.ledger.filter(l => l.eventId === event.id);

    // Bloqueios ativos: soma de BLOQUEIO + RETENCAO - LIBERACAO
    const blockedSum = entries
      .filter(l => l.type === "BLOQUEIO" || l.type === "RETENCAO")
      .reduce((acc, l) => acc + l.value, 0);

    const releasedSum = entries
      .filter(l => l.type === "LIBERACAO")
      .reduce((acc, l) => acc + l.value, 0);

    const activeBlocked = Math.max(0, blockedSum - releasedSum);

    // Repasses já realizados
    const paidSum = entries
      .filter(l => l.type === "REPASSE")
      .reduce((acc, l) => acc + l.value, 0);

    // Obrigações internas (aluguel, ECAD, fornecedores)
    const obligationsForEvent = (state.obligations || []).filter(
      o => o.eventId === event.id && ["RESERVADO", "RETIDO"].includes(o.status)
    );
    const obligationsHold = obligationsForEvent.reduce((s, o) => s + Number(o.value || 0), 0);

    // Reservas de estornos em andamento
    const pendingRefundsForEvent = (state.refunds || []).filter(
      r => r.eventId === event.id && !["EFETIVADO", "REJEITADO", "CANCELADO"].includes(r.status)
    );
    const refundsHold = pendingRefundsForEvent.reduce((s, r) => s + Number(r.value || 0), 0);

    // Créditos concedidos e amortizações
    const creditsForEvent = state.credits.filter(c => c.eventId === event.id && c.status === "ATIVO");
    const outstandingDebtForEvent = creditsForEvent.reduce((acc, c) => acc + c.outstandingDebt, 0);

    let amortizationHold = 0;
    for (const c of creditsForEvent) {
      if (c.amortizationModel === "PARCELAS_FIXAS") {
        amortizationHold += Math.min(c.outstandingDebt, c.installmentValue || 0);
      } else if (c.amortizationModel === "PERCENTUAL_RECEBIVEIS") {
        const percentAmount = (event.sold * (c.receivablePercent / 100));
        amortizationHold += Math.min(c.outstandingDebt, percentAmount);
      }
    }

    const amortized = entries
      .filter(l => l.type === "AMORTIZACAO_CREDITO")
      .reduce((acc, l) => acc + l.value, 0);

    const refunds = entries
      .filter(l => l.type === "ESTORNO_EFETIVADO")
      .reduce((acc, l) => acc + l.value, 0);

    // Regra canônica de elegibilidade de repasse (50% vendas -> 20% liberação)
    const salesPercent = event.salesTarget > 0 ? (event.sold / event.salesTarget) * 100 : 0;
    const ruleMet = salesPercent >= state.policy.minimumSalesPercent;
    const faltamVendas = ruleMet ? 0 : Math.max(0, (event.salesTarget * (state.policy.minimumSalesPercent / 100)) - event.sold);

    const grossLimit = ruleMet ? event.sold * (state.policy.releasePercent / 100) : 0;

    // Disponível para solicitar (V0.5):
    // Limite bruto - repasses já realizados - bloqueios/retenções - obrigações - reservas de estornos - estornos efetivados - amortizações
    const effectiveAmortization = Math.max(amortized, amortizationHold);
    const deductions = paidSum + activeBlocked + obligationsHold + refundsHold + refunds + (state.policy.considerCreditAmortization ? effectiveAmortization : amortized);
    const availableToRequest = Math.max(0, grossLimit - deductions);

    return {
      ...event,
      salesPercent: Math.round(salesPercent * 10) / 10,
      blocked: activeBlocked,
      reserved: activeBlocked + obligationsHold + refundsHold,
      obligationsHold,
      refundsHold,
      refunds,
      paid: paidSum,
      amortized,
      outstandingDebt: outstandingDebtForEvent,
      amortizationHold,
      creditDebt: outstandingDebtForEvent,
      eligibility: {
        ruleMet,
        eligible: ruleMet,
        salesPercent: Math.round(salesPercent * 10) / 10,
        minimumSalesPercent: state.policy.minimumSalesPercent,
        releasePercent: state.policy.releasePercent,
        faltamVendas: Math.round(faltamVendas * 100) / 100,
        grossLimit: Math.round(grossLimit * 100) / 100,
        paid: paidSum,
        blocked: activeBlocked,
        reserved: activeBlocked + obligationsHold + refundsHold,
        obligationsHold,
        refundsHold,
        refunds,
        amortized,
        amortizationHold,
        availableToRequest: Math.round(availableToRequest * 100) / 100
      }
    };
  });

  // Consolidação por CNPJ
  const totalSold = eventsCalculated.reduce((acc, e) => acc + e.sold, 0);
  const totalPaid = eventsCalculated.reduce((acc, e) => acc + e.paid, 0);
  const totalBlocked = eventsCalculated.reduce((acc, e) => acc + e.blocked, 0);
  const totalObligationsHold = (state.obligations || [])
    .filter(o => ["RESERVADO", "RETIDO"].includes(o.status))
    .reduce((s, o) => s + Number(o.value || 0), 0);
  const totalRefundsHold = (state.refunds || [])
    .filter(r => !["EFETIVADO", "REJEITADO", "CANCELADO"].includes(r.status))
    .reduce((s, r) => s + Number(r.value || 0), 0);

  const totalOutstandingCredits = state.credits
    .filter(c => c.status === "ATIVO")
    .reduce((acc, c) => acc + c.outstandingDebt, 0);

  const totalAvailableForRepasse = eventsCalculated.reduce(
    (acc, e) => acc + e.eligibility.availableToRequest,
    0
  );

  const consolidatedBalance = Math.max(0, totalSold - totalPaid);
  const futurePending = Math.max(0, consolidatedBalance - totalAvailableForRepasse - totalBlocked - totalObligationsHold - totalRefundsHold);

  return {
    producer: state.producer,
    summary: {
      consolidatedBalance: Math.round(consolidatedBalance * 100) / 100,
      availableForRepasse: Math.round(totalAvailableForRepasse * 100) / 100,
      futurePending: Math.round(futurePending * 100) / 100,
      blocked: Math.round(totalBlocked * 100) / 100,
      obligationsReserved: Math.round(totalObligationsHold * 100) / 100,
      pendingRefundsHold: Math.round(totalRefundsHold * 100) / 100,
      retained: Math.round(totalObligationsHold * 100) / 100,
      outstandingCredits: Math.round(totalOutstandingCredits * 100) / 100,
      totalSold: Math.round(totalSold * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100
    },
    events: eventsCalculated,
    credits: state.credits,
    obligations: state.obligations || [],
    refunds: state.refunds || [],
    ledger: state.ledger
  };
}