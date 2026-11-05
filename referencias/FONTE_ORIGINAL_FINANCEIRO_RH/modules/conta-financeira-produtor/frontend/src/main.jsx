import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  WalletCards,
  LockKeyhole,
  Landmark,
  ArrowDownToLine,
  Settings2,
  FileClock,
  PlusCircle,
  FileSignature,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  X,
  TrendingUp,
  Percent,
  RefreshCw,
  Coins,
  Building2,
  Scale,
  Receipt,
  UserCheck,
  ShieldAlert,
  CalendarDays,
  Check,
  ArrowRight,
  Eye,
  FileText,
  Filter,
  CheckCircle,
  Clock
} from "lucide-react";
import "./style.css";

const API = "http://localhost:3333/api/interno";
const money = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const pct = n => `${Number(n || 0).toFixed(1)}%`;

function App() {
  // Telas da V0.4 Operacional: Conta Interna, Reservas e Retenções, Agenda de Obrigações, Créditos/Antecipações, Estornos e Ledger
  const [tab, setTab] = useState("conta"); // 'conta' | 'retencoes' | 'obrigacoes' | 'creditos' | 'estornos' | 'ledger'
  const [role, setRole] = useState("FINANCEIRO_DISK"); // 'PRODUTOR' | 'FINANCEIRO_DISK'

  // Simulação de operadores Disk para teste prático de Segregação de Funções (SoD)
  const [activeDiskUser, setActiveDiskUser] = useState("Karine Mendes (Analista Financeiro)");

  // Filtros da tela de Ledger
  const [ledgerEventFilter, setLedgerEventFilter] = useState("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");

  // Modal de visualização detalhada da movimentação do evento
  const [selectedEventDrilldown, setSelectedEventDrilldown] = useState(null);

  // Modais operacionais
  const [modalRetencao, setModalRetencao] = useState(false);
  const [modalObrigacao, setModalObrigacao] = useState(false);
  const [modalCredito, setModalCredito] = useState(false);
  const [modalEstorno, setModalEstorno] = useState(false);
  const [modalRepasse, setModalRepasse] = useState(false);

  // Form states: Nova Reserva / Retenção
  const [retentionForm, setRetentionForm] = useState({
    eventId: "EV-001",
    type: "RETENCAO",
    value: "25000",
    beneficiary: "Reserva Cautelar Disk",
    reason: "Reserva técnica para cobertura de riscos operacionais e contingências fiscais"
  });

  // Form states: Programar Obrigação
  const [obligationForm, setObligationForm] = useState({
    eventId: "EV-001",
    category: "ALUGUEL_ESPACO",
    description: "Aluguel do Teatro / Espaço Principal",
    beneficiary: "Teatro Positivo Ltda.",
    value: "80000",
    dueDate: "2026-11-10",
    documentRef: "Contrato 2026/04",
    status: "RESERVADO",
    notes: "Reserva preventiva retida de forma prioritária"
  });

  // Form states: Conceder Crédito / Antecipação
  const [creditForm, setCreditForm] = useState({
    eventId: "EV-001",
    principal: "100000",
    interestRate: "2.0",
    installments: "5",
    amortization: "PARCELAS_FIXAS",
    receivablePercent: "15.0",
    notes: "Adiantamento pré-evento aprovado em comitê comercial Disk"
  });

  // Form states: Novo Estorno
  const [refundForm, setRefundForm] = useState({
    eventId: "EV-001",
    orderId: "PED-99120",
    value: "1250",
    reason: "Cancelamento VIP Duplo solicitado via SAC dentro do prazo de arrependimento"
  });

  // Form states: Solicitar Repasse
  const [payoutForm, setPayoutForm] = useState({
    eventId: "EV-003",
    value: "30000"
  });

  // Dados reativos completos (Homologação v0.4)
  const [data, setData] = useState({
    producer: {
      id: "P-001",
      name: "Produtora Alpha Brasil Ltda.",
      cnpj: "14.829.301/0001-92",
      manager: "Karine Mendes (Financeiro Disk)"
    },
    policy: {
      minimumSalesPercent: 50,
      releasePercent: 20,
      requireApproval: true,
      requireSignature: true,
      refundDualAuthorization: true
    },
    summary: {
      sold: 890000.0,
      reserved: 105000.0,
      outstandingCredits: 120000.0,
      availableForRepasse: 50000.0,
      pendingRefunds: 1250.0,
      totalPaid: 210000.0
    },
    events: [
      {
        id: "EV-001",
        name: "Festival Curitiba 2026",
        salesTarget: 1000000.0,
        sold: 540000.0,
        salesPercent: 54.0,
        reserved: 105000.0,
        paid: 90000.0,
        outstandingDebt: 70000.0,
        eligibility: {
          eligible: true,
          salesPercent: 54.0,
          grossLimit: 108000.0,
          reserved: 105000.0,
          paid: 90000.0,
          availableToRequest: 0.0 // 108k bruto - (90k pago + 105k reservado) = 0
        }
      },
      {
        id: "EV-002",
        name: "Arena Verão 2026",
        salesTarget: 600000.0,
        sold: 210000.0,
        salesPercent: 35.0,
        reserved: 20000.0,
        paid: 0.0,
        outstandingDebt: 50000.0,
        eligibility: {
          eligible: false,
          salesPercent: 35.0,
          grossLimit: 0.0,
          reserved: 20000.0,
          paid: 0.0,
          availableToRequest: 0.0
        }
      },
      {
        id: "EV-003",
        name: "Show Especial Teatro",
        salesTarget: 400000.0,
        sold: 300000.0,
        salesPercent: 75.0,
        reserved: 10000.0,
        paid: 0.0,
        outstandingDebt: 0.0,
        eligibility: {
          eligible: true,
          salesPercent: 75.0,
          grossLimit: 60000.0,
          reserved: 10000.0,
          paid: 0.0,
          availableToRequest: 50000.0
        }
      }
    ],
    obligations: [
      {
        id: "OB-001",
        eventId: "EV-001",
        eventName: "Festival Curitiba 2026",
        category: "ALUGUEL_ESPACO",
        description: "Aluguel do Teatro / Espaço Principal",
        beneficiary: "Teatro Positivo Ltda.",
        value: 80000.0,
        dueDate: "2026-11-10",
        documentRef: "Contrato 2026/04",
        status: "RESERVADO",
        createdAt: "01/10/2026 12:00",
        actor: "Karine Mendes"
      },
      {
        id: "OB-002",
        eventId: "EV-001",
        eventName: "Festival Curitiba 2026",
        category: "ECAD",
        description: "Direitos Autorais / ECAD",
        beneficiary: "ECAD",
        value: 15000.0,
        dueDate: "2026-11-15",
        documentRef: "Guia ECAD 10/2026",
        status: "RESERVADO",
        createdAt: "01/10/2026 12:10",
        actor: "Karine Mendes"
      },
      {
        id: "OB-003",
        eventId: "EV-001",
        eventName: "Festival Curitiba 2026",
        category: "OPERACIONAL",
        description: "Segurança e Brigada de Incêndio",
        beneficiary: "Alfa Segurança & Serviços",
        value: 10000.0,
        dueDate: "2026-11-05",
        documentRef: "OS-8821",
        status: "RESERVADO",
        createdAt: "01/10/2026 12:20",
        actor: "Karine Mendes"
      }
    ],
    refunds: [
      {
        id: "ES-001",
        eventId: "EV-001",
        eventName: "Festival Curitiba 2026",
        orderId: "PED-98421",
        value: 1250.0,
        reason: "Cancelamento VIP Duplo solicitado via SAC",
        status: "AGUARDANDO_SEGUNDA_AUTORIZACAO",
        requestedBy: "João Analista (Financeiro Disk)",
        createdAt: "02/10/2026 10:00",
        approvals: [
          {
            approvalIndex: 1,
            user: "Karine Mendes (Analista Financeiro)",
            at: "02/10/2026 10:15",
            factor: "MFA_TOKEN_VALIDADO"
          }
        ]
      }
    ],
    credits: [
      {
        id: "CR-2026-001",
        protocol: "CR-2026-0001",
        eventId: "EV-001",
        eventName: "Festival Curitiba 2026",
        principal: 100000.0,
        interestRate: 2.0,
        installmentsCount: 5,
        installmentValue: 22000.0,
        amortizationModel: "PARCELAS_FIXAS",
        receivablePercent: 15.0,
        totalDebt: 110000.0,
        outstandingDebt: 70000.0,
        amortizedTotal: 40000.0,
        status: "ATIVO",
        grantedAt: "20/09/2026 10:00",
        grantedBy: "Karine Mendes",
        notes: "Adiantamento para contratação de headliners e montagem de palco",
        amortizationHistory: [
          { id: "AM-1", date: "30/09/2026 14:30", value: 20000.0, type: "PARCELA_FIXA", balanceAfter: 90000.0, actor: "Sistema" },
          { id: "AM-2", date: "01/10/2026 09:15", value: 20000.0, type: "PARCELA_FIXA", balanceAfter: 70000.0, actor: "Sistema" }
        ]
      },
      {
        id: "CR-2026-002",
        protocol: "CR-2026-0002",
        eventId: "EV-002",
        eventName: "Arena Verão 2026",
        principal: 50000.0,
        interestRate: 2.5,
        installmentsCount: 4,
        installmentValue: 13750.0,
        amortizationModel: "PERCENTUAL_RECEBIVEIS",
        receivablePercent: 15.0,
        totalDebt: 55000.0,
        outstandingDebt: 50000.0,
        amortizedTotal: 5000.0,
        status: "ATIVO",
        grantedAt: "28/09/2026 11:00",
        grantedBy: "Karine Mendes",
        notes: "Capital de giro com retenção de 15% das vendas líquidas",
        amortizationHistory: [
          { id: "AM-3", date: "30/09/2026 18:00", value: 5000.0, type: "RETENCAO_RECEIVABLE_AUTOMATICA", balanceAfter: 50000.0, actor: "Motor Bilheteria" }
        ]
      }
    ],
    ledger: [
      { id: "L-001", eventId: "EV-001", eventName: "Festival Curitiba 2026", type: "CREDITO_CONCEDIDO", value: 100000.0, balanceAfter: 100000.0, reason: "Concessão de crédito CR-2026-0001", actor: "Karine Mendes", createdAt: "20/09/2026 10:00" },
      { id: "L-002", eventId: "EV-001", eventName: "Festival Curitiba 2026", type: "AMORTIZACAO_CREDITO", value: 20000.0, balanceAfter: 80000.0, reason: "Amortização parcela CR-2026-0001", actor: "Sistema", createdAt: "30/09/2026 14:30" },
      { id: "L-003", eventId: "EV-001", eventName: "Festival Curitiba 2026", type: "RETENCAO", value: 80000.0, balanceAfter: 160000.0, reason: "Reserva preventiva: Aluguel do espaço (Teatro Positivo Ltda.)", beneficiary: "Teatro Positivo Ltda.", actor: "Karine Mendes", createdAt: "01/10/2026 12:00" },
      { id: "L-004", eventId: "EV-001", eventName: "Festival Curitiba 2026", type: "RETENCAO", value: 15000.0, balanceAfter: 175000.0, reason: "Reserva preventiva: Direitos Autorais / ECAD", beneficiary: "ECAD", actor: "Karine Mendes", createdAt: "01/10/2026 12:10" },
      { id: "L-005", eventId: "EV-001", eventName: "Festival Curitiba 2026", type: "RESERVA_ESTORNO", value: 1250.0, balanceAfter: 176250.0, reason: "Bloqueio cautelar para estorno PED-98421", actor: "João Analista", createdAt: "02/10/2026 10:00" }
    ],
    requests: []
  });

  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carregar dados da API se estiver rodando
  const loadFromApi = async () => {
    try {
      const res = await fetch(`${API}/dashboard`, {
        headers: { "x-role": "FINANCEIRO_DISK", "x-user-name": activeDiskUser }
      });
      if (res.ok) {
        const json = await res.json();
        setData(prev => ({ ...prev, ...json }));
      }
    } catch (_) {
      // Backend não conectado: mantém o store local perfeitamente funcional
    }
  };

  useEffect(() => {
    loadFromApi();
  }, []);

  // Recalcular saldo e elegibilidade de forma centralizada e canônica
  const recalculateState = (prev) => {
    const updatedEvents = prev.events.map(ev => {
      const entries = (prev.ledger || []).filter(l => l.eventId === ev.id);
      const reservedSum = entries
        .filter(l => ['RETENCAO', 'BLOQUEIO', 'RESERVA_ESTORNO'].includes(l.type))
        .reduce((s, l) => s + l.value, 0);
      const releasedSum = entries
        .filter(l => l.type === 'LIBERACAO')
        .reduce((s, l) => s + l.value, 0);
      const activeReserved = Math.max(0, reservedSum - releasedSum);

      const paidSum = (ev.paid || 0);
      const refundsSettled = entries
        .filter(l => l.type === 'ESTORNO_EFETIVADO')
        .reduce((s, l) => s + l.value, 0);

      const activeCredits = (prev.credits || []).filter(c => c.eventId === ev.id && c.status === "ATIVO");
      let amortHold = 0;
      for (const c of activeCredits) {
        if (c.amortizationModel === "PARCELAS_FIXAS") {
          amortHold += Math.min(c.outstandingDebt, c.installmentValue || 0);
        } else if (c.amortizationModel === "PERCENTUAL_RECEBIVEIS") {
          amortHold += Math.min(c.outstandingDebt, ev.sold * (c.receivablePercent / 100));
        }
      }

      const salesPercent = ev.salesTarget > 0 ? (ev.sold / ev.salesTarget) * 100 : 0;
      const eligible = salesPercent >= prev.policy.minimumSalesPercent;
      const grossLimit = eligible ? ev.sold * (prev.policy.releasePercent / 100) : 0;

      const deductions = paidSum + activeReserved + refundsSettled + amortHold;
      const available = Math.max(0, grossLimit - deductions);

      return {
        ...ev,
        salesPercent,
        reserved: activeReserved,
        eligibility: {
          ...ev.eligibility,
          eligible,
          salesPercent,
          grossLimit,
          reserved: activeReserved,
          paid: paidSum,
          availableToRequest: Math.round(available * 100) / 100
        }
      };
    });

    const totalReserved = updatedEvents.reduce((s, e) => s + Math.max(0, e.reserved), 0);
    const totalAvailable = updatedEvents.reduce((s, e) => s + e.eligibility.availableToRequest, 0);
    const totalPendingRefunds = (prev.refunds || [])
      .filter(r => !["EFETIVADO", "CANCELADO", "REJEITADO"].includes(r.status))
      .reduce((s, r) => s + Number(r.value || 0), 0);

    return {
      ...prev,
      events: updatedEvents,
      summary: {
        ...prev.summary,
        reserved: totalReserved,
        pendingRefunds: totalPendingRefunds,
        availableForRepasse: totalAvailable
      }
    };
  };

  // Handlers Operacionais: Criar Reserva / Retenção
  const handleCreateRetention = () => {
    const val = parseFloat(retentionForm.value);
    if (!val || val <= 0) {
      notify("Informe um valor válido e positivo.", "error");
      return;
    }
    if (!retentionForm.reason || retentionForm.reason.trim().length < 5) {
      notify("Justificativa formal com no mínimo 5 caracteres é obrigatória.", "error");
      return;
    }

    const event = data.events.find(e => e.id === retentionForm.eventId);
    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      type: retentionForm.type,
      value: val,
      balanceAfter: (data.summary.sold - (data.summary.reserved + val)),
      reason: retentionForm.reason.trim(),
      beneficiary: retentionForm.beneficiary.trim(),
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedger, ...prev.ledger]
    }));

    setModalRetencao(false);
    notify(`${retentionForm.type === 'RETENCAO' ? 'Retenção' : 'Bloqueio'} de ${money(val)} registrado no Ledger!`);
  };

  // Handlers Operacionais: Liberar Saldo de Retenção
  const handleReleaseRetention = (entry) => {
    const reason = prompt(`Informe a justificativa formal para liberação deste saldo de ${money(entry.value)}:`);
    if (!reason || reason.trim().length < 5) {
      notify("Justificativa de liberação deve ter pelo menos 5 caracteres.", "error");
      return;
    }

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: entry.eventId,
      eventName: entry.eventName,
      type: "LIBERACAO",
      value: entry.value,
      balanceAfter: (data.summary.sold - (data.summary.reserved - entry.value)),
      reason: `Liberação autorizada: ${reason.trim()} (Ref: ${entry.id})`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedger, ...prev.ledger]
    }));

    notify(`Saldo de ${money(entry.value)} liberado com sucesso no evento ${entry.eventName}!`);
  };

  // Handlers Operacionais: Programar Obrigação
  const handleCreateObligation = () => {
    const val = parseFloat(obligationForm.value);
    if (!val || val <= 0) {
      notify("Informe um valor válido e positivo.", "error");
      return;
    }
    if (!obligationForm.description || obligationForm.description.trim().length < 3) {
      notify("Descrição da obrigação é obrigatória.", "error");
      return;
    }

    const event = data.events.find(e => e.id === obligationForm.eventId);
    const newOb = {
      id: `OB-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      category: obligationForm.category,
      description: obligationForm.description.trim(),
      beneficiary: obligationForm.beneficiary.trim() || "Favorecido Geral",
      value: val,
      dueDate: obligationForm.dueDate,
      documentRef: obligationForm.documentRef.trim(),
      status: obligationForm.status || "RESERVADO",
      createdAt: new Date().toLocaleString("pt-BR"),
      actor: activeDiskUser
    };

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      type: "RETENCAO",
      value: val,
      balanceAfter: (data.summary.sold - (data.summary.reserved + val)),
      reason: `Reserva preventiva de obrigação: ${newOb.description} (${newOb.beneficiary})`,
      beneficiary: newOb.beneficiary,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      obligations: [newOb, ...prev.obligations],
      ledger: [newLedger, ...prev.ledger]
    }));

    setModalObrigacao(false);
    notify(`Obrigação ${newOb.description} de ${money(val)} programada com reserva de saldo!`);
  };

  const handleUpdateObligationStatus = (ob, newStatus) => {
    ob.status = newStatus;
    let newLedger = null;

    if (newStatus === "LIQUIDADO") {
      newLedger = {
        id: `L-${Date.now()}`,
        eventId: ob.eventId,
        eventName: ob.eventName,
        type: "LIBERACAO",
        value: ob.value,
        balanceAfter: (data.summary.sold),
        reason: `Baixa contábil de liquidação: ${ob.description} (${ob.beneficiary})`,
        actor: activeDiskUser,
        createdAt: new Date().toLocaleString("pt-BR")
      };
    }

    setData(prev => recalculateState({
      ...prev,
      ledger: newLedger ? [newLedger, ...prev.ledger] : prev.ledger
    }));

    notify(`Status da obrigação atualizado para ${newStatus}.`);
  };

  // Handlers Operacionais: Conceder Crédito / Antecipação
  const handleGrantCredit = () => {
    const numPrincipal = parseFloat(creditForm.principal);
    if (!numPrincipal || numPrincipal <= 0) {
      notify("Informe um valor principal válido.", "error");
      return;
    }
    if (!creditForm.notes || creditForm.notes.trim().length < 5) {
      notify("Justificativa formal com no mínimo 5 caracteres é obrigatória.", "error");
      return;
    }

    const numInterest = parseFloat(creditForm.interestRate) || 0;
    const numInstallments = parseInt(creditForm.installments) || 1;
    const totalDebt = numPrincipal * (1 + (numInterest * numInstallments) / 100);
    const installmentValue = totalDebt / numInstallments;
    const event = data.events.find(e => e.id === creditForm.eventId);

    const newCredit = {
      id: `CR-${Date.now()}`,
      protocol: `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      eventId: event.id,
      eventName: event.name,
      principal: numPrincipal,
      interestRate: numInterest,
      installmentsCount: numInstallments,
      installmentValue,
      amortizationModel: creditForm.amortization,
      receivablePercent: parseFloat(creditForm.receivablePercent) || 0,
      totalDebt,
      outstandingDebt: totalDebt,
      amortizedTotal: 0,
      status: "ATIVO",
      grantedAt: new Date().toLocaleString("pt-BR"),
      grantedBy: activeDiskUser,
      notes: creditForm.notes.trim(),
      amortizationHistory: []
    };

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      type: "CREDITO_CONCEDIDO",
      value: numPrincipal,
      balanceAfter: (data.summary.sold + numPrincipal),
      reason: `Concessão de crédito ${newCredit.protocol}: ${newCredit.notes}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      credits: [newCredit, ...prev.credits],
      ledger: [newLedger, ...prev.ledger],
      summary: {
        ...prev.summary,
        outstandingCredits: prev.summary.outstandingCredits + totalDebt
      }
    }));

    setModalCredito(false);
    notify(`Crédito ${newCredit.protocol} de ${money(numPrincipal)} concedido com sucesso!`);
  };

  const handleAmortizeCredit = (credit, customAmount = null) => {
    const amountToAmortize = customAmount !== null ? customAmount : Math.min(credit.outstandingDebt, credit.installmentValue);
    if (amountToAmortize <= 0) return;

    credit.outstandingDebt = Math.max(0, credit.outstandingDebt - amountToAmortize);
    credit.amortizedTotal += amountToAmortize;
    if (credit.outstandingDebt === 0) credit.status = "LIQUIDADO";

    credit.amortizationHistory = credit.amortizationHistory || [];
    credit.amortizationHistory.unshift({
      id: `AM-${Date.now()}`,
      date: new Date().toLocaleString("pt-BR"),
      value: amountToAmortize,
      type: "PARCELA_FIXA",
      balanceAfter: credit.outstandingDebt,
      actor: activeDiskUser
    });

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: credit.eventId,
      eventName: credit.eventName,
      type: "AMORTIZACAO_CREDITO",
      value: amountToAmortize,
      balanceAfter: (data.summary.sold - amountToAmortize),
      reason: `Amortização de crédito ${credit.protocol || credit.id}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedger, ...prev.ledger],
      summary: {
        ...prev.summary,
        outstandingCredits: Math.max(0, prev.summary.outstandingCredits - amountToAmortize)
      }
    }));

    notify(`Amortização de ${money(amountToAmortize)} realizada com sucesso!`);
  };

  const handleSimulateSale = (credit) => {
    const saleAmount = 30000;
    const netSale = saleAmount * 0.9;
    const deduction = Math.min(credit.outstandingDebt, netSale * (credit.receivablePercent / 100));

    credit.outstandingDebt = Math.max(0, credit.outstandingDebt - deduction);
    credit.amortizedTotal += deduction;
    if (credit.outstandingDebt === 0) credit.status = "LIQUIDADO";

    credit.amortizationHistory = credit.amortizationHistory || [];
    credit.amortizationHistory.unshift({
      id: `AM-${Date.now()}`,
      date: new Date().toLocaleString("pt-BR"),
      value: deduction,
      type: "RETENCAO_RECEIVABLE_AUTOMATICA",
      balanceAfter: credit.outstandingDebt,
      actor: "Motor de Bilheteria"
    });

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: credit.eventId,
      eventName: credit.eventName,
      type: "AMORTIZACAO_CREDITO",
      value: deduction,
      balanceAfter: (data.summary.sold - deduction),
      reason: `Amortização automática de ${credit.receivablePercent}% retida de nova bilheteria (${money(saleAmount)})`,
      actor: "Motor de Bilheteria",
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedger, ...prev.ledger],
      summary: {
        ...prev.summary,
        outstandingCredits: Math.max(0, prev.summary.outstandingCredits - deduction)
      }
    }));

    notify(`Venda de ${money(saleAmount)} simulada! Retenção de ${money(deduction)} amortizada.`);
  };

  // Handlers Operacionais: Estornos com Dupla Autorização SoD
  const handleOpenRefund = () => {
    const val = parseFloat(refundForm.value);
    if (!val || val <= 0) {
      notify("Informe um valor válido e positivo.", "error");
      return;
    }
    if (!refundForm.orderId || !refundForm.reason || refundForm.reason.trim().length < 5) {
      notify("Número do pedido e justificativa (mínimo 5 caracteres) são obrigatórios.", "error");
      return;
    }

    const event = data.events.find(e => e.id === refundForm.eventId);
    const newRef = {
      id: `ES-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      orderId: refundForm.orderId.trim(),
      value: val,
      reason: refundForm.reason.trim(),
      status: "AGUARDANDO_PRIMEIRA_AUTORIZACAO",
      requestedBy: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR"),
      approvals: []
    };

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      type: "RESERVA_ESTORNO",
      value: val,
      balanceAfter: (data.summary.sold - (data.summary.reserved + val)),
      reason: `Reserva cautelar imediata do estorno ${newRef.id} / pedido ${newRef.orderId}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      refunds: [newRef, ...prev.refunds],
      ledger: [newLedger, ...prev.ledger]
    }));

    setModalEstorno(false);
    notify(`Estorno do pedido ${newRef.orderId} iniciado com reserva imediata de ${money(val)}.`);
  };

  const handleAuthorizeRefund = (ref) => {
    ref.approvals = ref.approvals || [];
    const firstAuth = ref.approvals.find(a => a.approvalIndex === 1);

    // Validação estrita de Segregação de Funções (SoD)
    if (firstAuth && firstAuth.user.toLowerCase() === activeDiskUser.toLowerCase()) {
      notify(`Violação de Segregação de Funções (SoD): O usuário (${activeDiskUser}) que realizou a 1ª autorização NÃO pode conceder a 2ª autorização!`, "error");
      return;
    }

    const nextIndex = ref.approvals.length + 1;
    ref.approvals.push({
      approvalIndex: nextIndex,
      user: activeDiskUser,
      at: new Date().toLocaleString("pt-BR"),
      factor: nextIndex === 1 ? "MFA_TOKEN_VALIDADO" : "REAUTENTICACAO_GOVERNANCA"
    });

    if (ref.approvals.length === 1) {
      ref.status = "AGUARDANDO_SEGUNDA_AUTORIZACAO";
      notify(`1ª Autorização registrada por ${activeDiskUser}. Aguardando segundo operador.`);
    } else {
      ref.status = "AUTORIZADO_PARA_EFETIVAR";
      notify(`2ª Autorização concluída por ${activeDiskUser}! Pronto para efetivação.`);
    }

    setData(prev => ({ ...prev }));
  };

  const handleExecuteRefund = (ref) => {
    if (ref.status !== "AUTORIZADO_PARA_EFETIVAR" || (ref.approvals || []).length < 2) {
      notify("Estorno exige duas autorizações distintas antes da liquidação financeira.", "error");
      return;
    }

    ref.status = "EFETIVADO";
    ref.executedBy = activeDiskUser;
    ref.executedAt = new Date().toLocaleString("pt-BR");

    const newLedgerLiberacao = {
      id: `L-${Date.now()}-1`,
      eventId: ref.eventId,
      eventName: ref.eventName,
      type: "LIBERACAO",
      value: ref.value,
      balanceAfter: data.summary.sold,
      reason: `Baixa da reserva do estorno ${ref.id}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    const newLedgerEstorno = {
      id: `L-${Date.now()}-2`,
      eventId: ref.eventId,
      eventName: ref.eventName,
      type: "ESTORNO_EFETIVADO",
      value: ref.value,
      balanceAfter: (data.summary.sold - ref.value),
      reason: `Liquidação de estorno ${ref.id} / pedido ${ref.orderId}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    // Abate das vendas do evento
    const ev = data.events.find(e => e.id === ref.eventId);
    if (ev) {
      ev.sold = Math.max(0, ev.sold - ref.value);
    }

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedgerEstorno, newLedgerLiberacao, ...prev.ledger],
      summary: {
        ...prev.summary,
        sold: Math.max(0, prev.summary.sold - ref.value)
      }
    }));

    notify(`Estorno ${ref.orderId} efetivado com sucesso e lançado no Ledger!`);
  };

  const handleCancelRefund = (ref) => {
    ref.status = "CANCELADO";
    ref.canceledBy = activeDiskUser;
    ref.canceledAt = new Date().toLocaleString("pt-BR");

    const newLedger = {
      id: `L-${Date.now()}`,
      eventId: ref.eventId,
      eventName: ref.eventName,
      type: "LIBERACAO",
      value: ref.value,
      balanceAfter: (data.summary.sold + ref.value),
      reason: `Cancelamento de estorno e liberação da reserva: pedido ${ref.orderId}`,
      actor: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      ledger: [newLedger, ...prev.ledger]
    }));

    notify(`Estorno cancelado e reserva de ${money(ref.value)} liberada.`);
  };

  // Handlers Operacionais: Solicitar Repasse
  const handleRequestPayout = () => {
    const val = parseFloat(payoutForm.value);
    const event = data.events.find(e => e.id === payoutForm.eventId);
    if (!val || val <= 0) {
      notify("Informe um valor válido.", "error");
      return;
    }
    if (val > event.eligibility.availableToRequest) {
      notify(`Valor solicitado excede o limite elegível disponível (${money(event.eligibility.availableToRequest)}).`, "error");
      return;
    }

    event.paid = (event.paid || 0) + val;

    const newRequest = {
      id: `RP-${Date.now()}`,
      protocol: `REP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      eventId: event.id,
      eventName: event.name,
      value: val,
      status: "EM_ANALISE",
      applicant: activeDiskUser,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    setData(prev => recalculateState({
      ...prev,
      requests: [newRequest, ...(prev.requests || [])]
    }));

    setModalRepasse(false);
    notify(`Solicitação de repasse ${newRequest.protocol} enviada com sucesso!`);
  };

  // Filtragem de Ledger
  const filteredLedger = data.ledger.filter(l => {
    const matchesEvent = ledgerEventFilter === "all" || l.eventId === ledgerEventFilter;
    const matchesType = ledgerTypeFilter === "all" || l.type === ledgerTypeFilter;
    return matchesEvent && matchesType;
  });

  return (
    <div className="app">
      {toast && <div className="toast" style={{ background: toast.type === 'error' ? '#ef4444' : '#10b981' }}>{toast.msg}</div>}

      {/* Sidebar V0.4 */}
      <aside>
        <div className="brand">Disk<span>Financeiro</span></div>
        <div className="tag">CONTA FINANCEIRA V0.4 OPERACIONAL</div>
        <nav>
          <button className={tab === 'conta' ? 'active' : ''} onClick={() => setTab('conta')}>
            <WalletCards size={18} /> Conta Interna
          </button>
          <button className={tab === 'retencoes' ? 'active' : ''} onClick={() => setTab('retencoes')}>
            <LockKeyhole size={18} /> Reservas e Retenções
          </button>
          <button className={tab === 'obrigacoes' ? 'active' : ''} onClick={() => setTab('obrigacoes')}>
            <Receipt size={18} /> Agenda de Obrigações
          </button>
          <button className={tab === 'creditos' ? 'active' : ''} onClick={() => setTab('creditos')}>
            <Landmark size={18} /> Créditos / Antecipações
          </button>
          <button className={tab === 'estornos' ? 'active' : ''} onClick={() => setTab('estornos')}>
            <ShieldAlert size={18} /> Estornos (SoD)
          </button>
          <button className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>
            <FileClock size={18} /> Ledger Imutável
          </button>
        </nav>

        <div className="asideFooter">
          <small>Uso Exclusivo Financeiro Disk • PDT Novo</small>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Invisível ao Produtor
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <header>
          <div>
            <small>Mesa de Controle Financeiro Interno da Disk</small>
            <h1>{data.producer.name}</h1>
            <p>CNPJ: <strong>{data.producer.cnpj}</strong> · Gestora: {data.producer.manager}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className="roleBadge role-financeiro">
              🛡️ USO INTERNO • FINANCEIRO DISK
            </span>

            {/* Simulador de SoD para testes de governança */}
            <div className="userSwitcher">
              <UserCheck size={14} style={{ color: '#6366f1' }} />
              <span>Operador Ativo:</span>
              <select value={activeDiskUser} onChange={e => setActiveDiskUser(e.target.value)}>
                <option value="Karine Mendes (Analista Financeiro)">Karine Mendes (Analista)</option>
                <option value="Carlos Eduardo (Supervisor/Compliance)">Carlos Eduardo (Supervisor / Compliance)</option>
                <option value="Mariana Costa (Auditoria Interna)">Mariana Costa (Auditoria)</option>
              </select>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* TELA 1: CONTA INTERNA (SALDOS E ELEGIBILIDADE POR EVENTO) */}
        {/* ========================================================================= */}
        {tab === 'conta' && (
          <>
            {/* Os 5 Cards Canônicos */}
            <section className="cards">
              <div className="card">
                <small>Vendas Registradas</small>
                <strong>{money(data.summary.sold)}</strong>
                <span>Receita apurada total</span>
              </div>
              <div className="card danger">
                <small>Reservado / Retido</small>
                <strong>{money(data.summary.reserved)}</strong>
                <span>Obrigações e contingências</span>
              </div>
              <div className="card purple">
                <small>Créditos em Aberto</small>
                <strong>{money(data.summary.outstandingCredits)}</strong>
                <span>Dívida em amortização</span>
              </div>
              <div className="card primary">
                <small>Elegível a Repasse</small>
                <strong>{money(data.summary.availableForRepasse)}</strong>
                <span>Fórmula 50% → 20% líquida</span>
              </div>
              <div className="card">
                <small>Estornos Pendentes</small>
                <strong>{money(data.summary.pendingRefunds)}</strong>
                <span>Retidos cautelarmente</span>
              </div>
            </section>

            {/* Saldos e Elegibilidade por Evento com Ação de Visualizar Movimentação */}
            <section className="panel">
              <div className="panelHead">
                <div>
                  <h2>Saldos e Elegibilidade Canônica por Evento</h2>
                  <p>O motor libera até 20% das vendas ao atingir 50% da meta, deduzindo reservas, estornos e repasses anteriores.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" onClick={() => setModalRetencao(true)}>
                    <LockKeyhole size={14} /> + Nova Retenção
                  </button>
                  <button className="btn btn-primary" onClick={() => setModalRepasse(true)}>
                    <ArrowDownToLine size={14} /> + Solicitar Repasse
                  </button>
                </div>
              </div>

              <div className="tableContainer">
                <table>
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Meta de Vendas</th>
                      <th>Vendas Apuradas</th>
                      <th>Meta (%)</th>
                      <th>Reservado/Retido</th>
                      <th>Limite Bruto (20%)</th>
                      <th>Disponível Calculado</th>
                      <th>Status Regra</th>
                      <th>Ações de Mesa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map(ev => (
                      <tr key={ev.id}>
                        <td>
                          <strong>{ev.name}</strong>
                          <br /><small style={{ color: '#64748b' }}>{ev.id}</small>
                        </td>
                        <td>{money(ev.salesTarget)}</td>
                        <td><strong>{money(ev.sold)}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 55, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(ev.salesPercent, 100)}%`, height: '100%', background: ev.salesPercent >= 50 ? '#10b981' : '#f59e0b' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{pct(ev.salesPercent)}</span>
                          </div>
                        </td>
                        <td><strong style={{ color: ev.reserved > 0 ? '#dc2626' : '#64748b' }}>{money(ev.reserved)}</strong></td>
                        <td>{money(ev.eligibility.grossLimit)}</td>
                        <td><strong style={{ color: '#2563eb', fontSize: 14 }}>{money(ev.eligibility.availableToRequest)}</strong></td>
                        <td>
                          <span className={`badge ${ev.eligibility.eligible ? 'badge-ok' : 'badge-wait'}`}>
                            {ev.eligibility.eligible ? '✓ Elegível' : 'Aguardando 50%'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: 11, padding: '5px 8px' }}
                            onClick={() => setSelectedEventDrilldown(ev)}
                          >
                            <Eye size={12} /> Movimentação Completa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* TELA 2: RESERVAS E RETENÇÕES */}
        {/* ========================================================================= */}
        {tab === 'retencoes' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Central de Reservas e Retenções Administrativas</h2>
                <p>Controle exclusivo da Mesa Disk: Criação de travas preventivas e liberação formal auditada no Ledger.</p>
              </div>
              <button className="btn btn-danger" onClick={() => setModalRetencao(true)}>
                <PlusCircle size={14} /> + Nova Reserva / Retenção
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
              <div className="card danger">
                <small>Total Retido em Caixa</small>
                <strong>{money(data.summary.reserved)}</strong>
                <span>Retenções ativas consolidadas</span>
              </div>
              <div className="card">
                <small>Quantidade de Travas</small>
                <strong>{data.ledger.filter(l => ['RETENCAO', 'BLOQUEIO', 'RESERVA_ESTORNO'].includes(l.type)).length}</strong>
                <span>Lançamentos preventivos</span>
              </div>
              <div className="card primary">
                <small>Impacto em Repasse</small>
                <strong>-{money(data.summary.reserved)}</strong>
                <span>Dedução direta da base</span>
              </div>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Data / ID</th>
                    <th>Evento</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Favorecido / Motivo</th>
                    <th>Operador Responsável</th>
                    <th>Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.filter(l => ['RETENCAO', 'BLOQUEIO', 'RESERVA_ESTORNO'].includes(l.type)).map(l => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.id}</strong>
                        <br /><small style={{ color: '#64748b' }}>{l.createdAt}</small>
                      </td>
                      <td><strong>{l.eventName}</strong></td>
                      <td>
                        <span className={`badge ${l.type === 'RETENCAO' ? 'badge-danger' : 'badge-blocked'}`}>
                          {l.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td><strong style={{ color: '#dc2626' }}>{money(l.value)}</strong></td>
                      <td>
                        <strong>{l.beneficiary || "Reserva Cautelar"}</strong>
                        <br /><span style={{ fontSize: 12, color: '#334155' }}>{l.reason}</span>
                      </td>
                      <td><span style={{ fontSize: 11, fontWeight: 600 }}>{l.actor}</span></td>
                      <td>
                        <button
                          className="btn btn-success"
                          style={{ fontSize: 11, padding: '5px 8px' }}
                          onClick={() => handleReleaseRetention(l)}
                        >
                          Liberar Saldo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TELA 3: AGENDA DE OBRIGAÇÕES */}
        {/* ========================================================================= */}
        {tab === 'obrigacoes' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Agenda de Obrigações do Evento</h2>
                <p>Provisão de aluguel de teatro/espaço, ECAD, fornecedores críticos e custos operacionais prioritários.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setModalObrigacao(true)}>
                <PlusCircle size={14} /> + Programar Obrigação
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              <div className="card">
                <small>Aluguel de Espaço</small>
                <strong>
                  {money(data.obligations.filter(o => o.category === 'ALUGUEL_ESPACO' && o.status !== 'LIQUIDADO').reduce((s, o) => s + o.value, 0))}
                </strong>
                <span>Teatros e arenas</span>
              </div>
              <div className="card">
                <small>Direitos ECAD</small>
                <strong>
                  {money(data.obligations.filter(o => o.category === 'ECAD' && o.status !== 'LIQUIDADO').reduce((s, o) => s + o.value, 0))}
                </strong>
                <span>Guias provisionadas</span>
              </div>
              <div className="card">
                <small>Fornecedores / Palco</small>
                <strong>
                  {money(data.obligations.filter(o => ['FORNECEDOR', 'OPERACIONAL', 'OUTROS'].includes(o.category) && o.status !== 'LIQUIDADO').reduce((s, o) => s + o.value, 0))}
                </strong>
                <span>Segurança e infra</span>
              </div>
              <div className="card primary">
                <small>Total Reservado</small>
                <strong>{money(data.summary.reserved)}</strong>
                <span>Dedução na elegibilidade</span>
              </div>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Evento</th>
                    <th>Descrição do Objeto</th>
                    <th>Favorecido / Credor</th>
                    <th>Vencimento</th>
                    <th>Documento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações de Mesa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.obligations.map(ob => (
                    <tr key={ob.id}>
                      <td>
                        <span className="badge badge-category">
                          {ob.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td><strong>{ob.eventName}</strong></td>
                      <td><strong>{ob.description}</strong></td>
                      <td>{ob.beneficiary}</td>
                      <td><small>{ob.dueDate}</small></td>
                      <td><small>{ob.documentRef || "N/A"}</small></td>
                      <td><strong>{money(ob.value)}</strong></td>
                      <td>
                        <span className={`badge ${ob.status === 'LIQUIDADO' ? 'badge-ok' : (ob.status === 'RETIDO' ? 'badge-danger' : 'badge-wait')}`}>
                          {ob.status}
                        </span>
                      </td>
                      <td>
                        {ob.status !== 'LIQUIDADO' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-success"
                              style={{ fontSize: 11, padding: '5px 8px' }}
                              onClick={() => handleUpdateObligationStatus(ob, 'LIQUIDADO')}
                            >
                              Liquidar Pagamento
                            </button>
                            {ob.status === 'RESERVADO' && (
                              <button
                                className="btn btn-danger"
                                style={{ fontSize: 11, padding: '5px 8px' }}
                                onClick={() => handleUpdateObligationStatus(ob, 'RETIDO')}
                              >
                                Reter
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>✓ Baixado no Ledger</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TELA 4: CRÉDITOS / ANTECIPAÇÕES */}
        {/* ========================================================================= */}
        {tab === 'creditos' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Créditos e Antecipações ao Produtor</h2>
                <p>Gestão de juros, quantidade de parcelas, saldo devedor e retenção automática de bilheteria.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setModalCredito(true)}>
                <PlusCircle size={14} /> + Conceder Crédito / Antecipação
              </button>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Evento</th>
                    <th>Principal</th>
                    <th>Juros</th>
                    <th>Dívida Total</th>
                    <th>Saldo Devedor</th>
                    <th>Amortização</th>
                    <th>Status</th>
                    <th>Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody>
                  {data.credits.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.protocol}</strong>
                        <br /><small style={{ color: '#64748b' }}>{c.grantedAt}</small>
                      </td>
                      <td><strong>{c.eventName}</strong></td>
                      <td>{money(c.principal)}</td>
                      <td><span className="badge badge-purple">{c.interestRate}% a.m.</span></td>
                      <td><strong>{money(c.totalDebt)}</strong></td>
                      <td><strong style={{ color: '#dc2626' }}>{money(c.outstandingDebt)}</strong></td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>
                          {c.amortizationModel === 'PARCELAS_FIXAS' && `${c.installmentsCount}x de ${money(c.installmentValue)}`}
                          {c.amortizationModel === 'PERCENTUAL_RECEBIVEIS' && `${c.receivablePercent}% das vendas líquidas`}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'ATIVO' ? 'badge-wait' : 'badge-ok'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.status === 'ATIVO' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '5px 8px' }} onClick={() => handleAmortizeCredit(c)}>
                              Amortizar Parcela
                            </button>
                            {c.amortizationModel === 'PERCENTUAL_RECEBIVEIS' && (
                              <button className="btn btn-success" style={{ fontSize: 11, padding: '5px 8px' }} onClick={() => handleSimulateSale(c)}>
                                Simular Venda (15%)
                              </button>
                            )}
                          </div>
                        )}
                        {c.status === 'LIQUIDADO' && (
                          <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>✓ Totalmente Quitado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TELA 5: ESTORNOS (DUPLA AUTORIZAÇÃO SoD) */}
        {/* ========================================================================= */}
        {tab === 'estornos' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Fila de Estornos • Dupla Autorização Estrita (SoD)</h2>
                <p>Ao abrir o estorno, o saldo é retido imediatamente. Dois operadores diferentes devem autorizar antes da efetivação.</p>
              </div>
              <button className="btn btn-danger" onClick={() => setModalEstorno(true)}>
                <ShieldAlert size={14} /> + Solicitar Estorno Interno
              </button>
            </div>

            <div className="sodBanner">
              <ShieldAlert size={22} style={{ color: '#ca8a04', flexShrink: 0 }} />
              <div>
                <strong>Segregação de Funções (SoD) Obrigatória:</strong>
                {" "}O mesmo usuário não pode realizar a 1ª e a 2ª autorização. Alterne o operador ativo no cabeçalho superior para testar a validação em tempo real.
              </div>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Protocolo / Pedido</th>
                    <th>Evento</th>
                    <th>Valor Retido</th>
                    <th>Motivo Técnico</th>
                    <th>Status Esteira</th>
                    <th>1ª Autorização</th>
                    <th>2ª Autorização (SoD)</th>
                    <th>Ações da Mesa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.map(ref => {
                    const firstAuth = ref.approvals && ref.approvals.find(a => a.approvalIndex === 1);
                    const secondAuth = ref.approvals && ref.approvals.find(a => a.approvalIndex === 2);
                    const isSameAsFirst = firstAuth && firstAuth.user.toLowerCase() === activeDiskUser.toLowerCase();

                    return (
                      <tr key={ref.id}>
                        <td>
                          <strong>{ref.orderId}</strong>
                          <br /><small style={{ color: '#64748b' }}>{ref.id}</small>
                        </td>
                        <td><strong>{ref.eventName}</strong></td>
                        <td><strong style={{ color: '#dc2626' }}>{money(ref.value)}</strong></td>
                        <td><span style={{ fontSize: 12, color: '#334155' }}>{ref.reason}</span></td>
                        <td>
                          <span className={`badge ${ref.status === 'EFETIVADO' ? 'badge-ok' : (ref.status === 'AUTORIZADO_PARA_EFETIVAR' ? 'badge-purple' : (ref.status === 'CANCELADO' ? 'badge-gray' : 'badge-wait'))}`}>
                            {ref.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {firstAuth ? (
                            <div>
                              <strong style={{ color: '#059669', fontSize: 11 }}>✓ {firstAuth.user}</strong>
                              <br /><small style={{ color: '#64748b' }}>{firstAuth.at}</small>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>Pendente</span>
                          )}
                        </td>
                        <td>
                          {secondAuth ? (
                            <div>
                              <strong style={{ color: '#059669', fontSize: 11 }}>✓ {secondAuth.user}</strong>
                              <br /><small style={{ color: '#64748b' }}>{secondAuth.at}</small>
                            </div>
                          ) : (
                            <span style={{ color: '#d97706', fontSize: 11 }}>Aguardando 2º Operador</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['AGUARDANDO_PRIMEIRA_AUTORIZACAO', 'AGUARDANDO_SEGUNDA_AUTORIZACAO'].includes(ref.status) && (
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: 11, padding: '5px 8px' }}
                                title={isSameAsFirst ? "Bloqueado por SoD: Você concedeu a 1ª autorização" : "Conceder autorização"}
                                onClick={() => handleAuthorizeRefund(ref)}
                              >
                                <UserCheck size={12} /> {ref.status === 'AGUARDANDO_PRIMEIRA_AUTORIZACAO' ? '1ª Autorizar' : '2ª Autorizar'}
                              </button>
                            )}

                            {ref.status === 'AUTORIZADO_PARA_EFETIVAR' && (
                              <button
                                className="btn btn-success"
                                style={{ fontSize: 11, padding: '5px 8px' }}
                                onClick={() => handleExecuteRefund(ref)}
                              >
                                <Banknote size={12} /> Efetivar Estorno
                              </button>
                            )}

                            {['AGUARDANDO_PRIMEIRA_AUTORIZACAO', 'AGUARDANDO_SEGUNDA_AUTORIZACAO', 'AUTORIZADO_PARA_EFETIVAR'].includes(ref.status) && (
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: 11, padding: '5px 8px' }}
                                onClick={() => handleCancelRefund(ref)}
                              >
                                Cancelar
                              </button>
                            )}

                            {ref.status === 'EFETIVADO' && (
                              <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>✓ Liquidado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TELA 6: LEDGER IMUTÁVEL */}
        {/* ========================================================================= */}
        {tab === 'ledger' && (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Extrato Imutável do Ledger</h2>
                <p>Invariante: Saldo anterior + créditos − débitos = saldo atual. Nenhuma tela altera saldos diretamente.</p>
              </div>
            </div>

            <div className="filterBar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={14} style={{ color: '#64748b' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Filtrar por Evento:</span>
                <select value={ledgerEventFilter} onChange={e => setLedgerEventFilter(e.target.value)}>
                  <option value="all">Todos os Eventos</option>
                  {data.events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Tipo de Operação:</span>
                <select value={ledgerTypeFilter} onChange={e => setLedgerTypeFilter(e.target.value)}>
                  <option value="all">Todos os Tipos</option>
                  <option value="RETENCAO">RETENCAO</option>
                  <option value="LIBERACAO">LIBERACAO</option>
                  <option value="CREDITO_CONCEDIDO">CREDITO_CONCEDIDO</option>
                  <option value="AMORTIZACAO_CREDITO">AMORTIZACAO_CREDITO</option>
                  <option value="RESERVA_ESTORNO">RESERVA_ESTORNO</option>
                  <option value="ESTORNO_EFETIVADO">ESTORNO_EFETIVADO</option>
                  <option value="REPASSE">REPASSE</option>
                </select>
              </div>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Data / ID</th>
                    <th>Evento</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Saldo Após Lançamento</th>
                    <th>Responsável</th>
                    <th>Justificativa / Beneficiário</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map(l => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.id}</strong>
                        <br /><small style={{ color: '#64748b' }}>{l.createdAt}</small>
                      </td>
                      <td><strong>{l.eventName}</strong></td>
                      <td>
                        <span className={`badge ${l.type.includes('CREDITO') ? 'badge-purple' : (l.type.includes('AMORTIZACAO') ? 'badge-ok' : (l.type.includes('RETENCAO') || l.type.includes('BLOQUEIO') || l.type.includes('ESTORNO') ? 'badge-danger' : 'badge-blue'))}`}>
                          {l.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td><strong>{money(l.value)}</strong></td>
                      <td><strong style={{ color: '#0f172a' }}>{money(l.balanceAfter)}</strong></td>
                      <td><span style={{ fontSize: 11, fontWeight: 600 }}>{l.actor}</span></td>
                      <td>
                        <span style={{ fontSize: 12, color: '#334155' }}>{l.reason}</span>
                        {l.beneficiary && <><br /><small style={{ color: '#6366f1' }}>Favorecido: {l.beneficiary}</small></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL OPERACIONAL: VISUALIZAR TODA A MOVIMENTAÇÃO DO EVENTO (DRILLDOWN) */}
      {/* ========================================================================= */}
      {selectedEventDrilldown && (
        <div className="modalBackdrop">
          <div className="modalContent modalLarge">
            <div className="modalHeader">
              <div>
                <span className="badge badge-purple" style={{ marginBottom: 4 }}>DETALHAMENTO CONTÁBIL DO EVENTO</span>
                <h3>{selectedEventDrilldown.name} ({selectedEventDrilldown.id})</h3>
              </div>
              <button className="closeBtn" onClick={() => setSelectedEventDrilldown(null)}><X /></button>
            </div>

            {/* Resumo da Fórmula Canônica */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
                <div>
                  <small style={{ color: '#64748b', fontSize: 11 }}>Vendas Apuradas</small>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{money(selectedEventDrilldown.sold)}</div>
                  <small style={{ color: '#059669', fontWeight: 700 }}>Meta: {pct(selectedEventDrilldown.salesPercent)}</small>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: 11 }}>Limite Bruto (20%)</small>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{money(selectedEventDrilldown.eligibility.grossLimit)}</div>
                  <small style={{ color: '#64748b' }}>Gatilho 50% atingido</small>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: 11 }}>(-) Total Retido / Reservado</small>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>-{money(selectedEventDrilldown.reserved)}</div>
                  <small style={{ color: '#b91c1c' }}>Obrigações e contingências</small>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontSize: 11 }}>(=) Saldo Disponível p/ Repasse</small>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#2563eb' }}>{money(selectedEventDrilldown.eligibility.availableToRequest)}</div>
                  <small style={{ color: '#2563eb', fontWeight: 700 }}>Livre para solicitação</small>
                </div>
              </div>
            </div>

            {/* Obrigações do Evento */}
            <h4 style={{ margin: '14px 0 8px', fontSize: 14, fontWeight: 800 }}>Obrigações e Reservas Programadas</h4>
            <div className="tableContainer" style={{ marginBottom: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Favorecido</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.obligations.filter(o => o.eventId === selectedEventDrilldown.id).map(o => (
                    <tr key={o.id}>
                      <td><span className="badge badge-category">{o.category}</span></td>
                      <td><strong>{o.description}</strong></td>
                      <td>{o.beneficiary}</td>
                      <td><strong>{money(o.value)}</strong></td>
                      <td>{o.dueDate}</td>
                      <td><span className={`badge ${o.status === 'LIQUIDADO' ? 'badge-ok' : 'badge-wait'}`}>{o.status}</span></td>
                    </tr>
                  ))}
                  {data.obligations.filter(o => o.eventId === selectedEventDrilldown.id).length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhuma obrigação programada para este evento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Estornos do Evento */}
            <h4 style={{ margin: '14px 0 8px', fontSize: 14, fontWeight: 800 }}>Estornos e Cancelamentos em Andamento</h4>
            <div className="tableContainer" style={{ marginBottom: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Valor Retido</th>
                    <th>Motivo</th>
                    <th>Status SoD</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.filter(r => r.eventId === selectedEventDrilldown.id).map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.orderId}</strong></td>
                      <td><strong style={{ color: '#dc2626' }}>{money(r.value)}</strong></td>
                      <td>{r.reason}</td>
                      <td><span className="badge badge-purple">{r.status}</span></td>
                    </tr>
                  ))}
                  {data.refunds.filter(r => r.eventId === selectedEventDrilldown.id).length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>Nenhum estorno ativo para este evento.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger do Evento */}
            <h4 style={{ margin: '14px 0 8px', fontSize: 14, fontWeight: 800 }}>Extrato Exclusivo do Ledger deste Evento</h4>
            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Data / ID</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Saldo Após</th>
                    <th>Responsável / Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.filter(l => l.eventId === selectedEventDrilldown.id).map(l => (
                    <tr key={l.id}>
                      <td><small>{l.createdAt}</small><br /><strong>{l.id}</strong></td>
                      <td><span className="badge badge-gray">{l.type}</span></td>
                      <td><strong>{money(l.value)}</strong></td>
                      <td><strong>{money(l.balanceAfter)}</strong></td>
                      <td><span style={{ fontSize: 11, fontWeight: 600 }}>{l.actor}</span>: {l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modalFooter">
              <button className="btn btn-primary" onClick={() => setSelectedEventDrilldown(null)}>Fechar Detalhamento</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA RESERVA / RETENÇÃO */}
      {/* ========================================================================= */}
      {modalRetencao && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Nova Reserva ou Retenção Administrativa</h3>
              <button className="closeBtn" onClick={() => setModalRetencao(false)}><X /></button>
            </div>

            <div className="formGroup">
              <label>Evento Destino</label>
              <select value={retentionForm.eventId} onChange={e => setRetentionForm({ ...retentionForm, eventId: e.target.value })}>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Tipo de Operação</label>
                <select value={retentionForm.type} onChange={e => setRetentionForm({ ...retentionForm, type: e.target.value })}>
                  <option value="RETENCAO">Retenção Cautelar</option>
                  <option value="BLOQUEIO">Bloqueio Operacional</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Valor da Reserva (R$)</label>
                <input
                  type="number"
                  value={retentionForm.value}
                  onChange={e => setRetentionForm({ ...retentionForm, value: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label>Favorecido / Destino da Reserva</label>
              <input
                type="text"
                placeholder="Ex: Fundo de Contingência / Credor"
                value={retentionForm.beneficiary}
                onChange={e => setRetentionForm({ ...retentionForm, beneficiary: e.target.value })}
              />
            </div>

            <div className="formGroup">
              <label>Justificativa Formal Obrigatória (mínimo 5 caracteres)</label>
              <textarea
                rows="2"
                placeholder="Ex: Reserva preventiva para averiguação de riscos..."
                value={retentionForm.reason}
                onChange={e => setRetentionForm({ ...retentionForm, reason: e.target.value })}
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-outline" onClick={() => setModalRetencao(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleCreateRetention}>Confirmar Retenção no Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROGRAMAR OBRIGAÇÃO */}
      {/* ========================================================================= */}
      {modalObrigacao && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Programar Obrigação do Evento</h3>
              <button className="closeBtn" onClick={() => setModalObrigacao(false)}><X /></button>
            </div>

            <div className="formGroup">
              <label>Evento Vinculado</label>
              <select value={obligationForm.eventId} onChange={e => setObligationForm({ ...obligationForm, eventId: e.target.value })}>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Categoria</label>
                <select value={obligationForm.category} onChange={e => setObligationForm({ ...obligationForm, category: e.target.value })}>
                  <option value="ALUGUEL_ESPACO">Aluguel do Espaço / Teatro</option>
                  <option value="ECAD">Direitos Autorais / ECAD</option>
                  <option value="FORNECEDOR">Fornecedor Crítico</option>
                  <option value="OPERACIONAL">Segurança / Operacional</option>
                  <option value="OUTROS">Outras Obrigações</option>
                </select>
              </div>
              <div className="formGroup">
                <label>Valor da Provisão (R$)</label>
                <input
                  type="number"
                  value={obligationForm.value}
                  onChange={e => setObligationForm({ ...obligationForm, value: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label>Descrição do Objeto / Contrato</label>
              <input
                type="text"
                placeholder="Ex: Aluguel do espaço principal segundo contrato"
                value={obligationForm.description}
                onChange={e => setObligationForm({ ...obligationForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Favorecido / Credor</label>
                <input
                  type="text"
                  placeholder="Ex: Teatro Positivo Ltda."
                  value={obligationForm.beneficiary}
                  onChange={e => setObligationForm({ ...obligationForm, beneficiary: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Vencimento Previsto</label>
                <input
                  type="date"
                  value={obligationForm.dueDate}
                  onChange={e => setObligationForm({ ...obligationForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label>Documento de Referência</label>
              <input
                type="text"
                placeholder="Ex: Contrato 2026/04 ou OS-8821"
                value={obligationForm.documentRef}
                onChange={e => setObligationForm({ ...obligationForm, documentRef: e.target.value })}
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-outline" onClick={() => setModalObrigacao(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateObligation}>Programar &amp; Reservar Saldo</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONCEDER CRÉDITO */}
      {/* ========================================================================= */}
      {modalCredito && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Conceder Crédito / Antecipação ao Produtor</h3>
              <button className="closeBtn" onClick={() => setModalCredito(false)}><X /></button>
            </div>

            <div className="formGroup">
              <label>Evento Vinculado</label>
              <select value={creditForm.eventId} onChange={e => setCreditForm({ ...creditForm, eventId: e.target.value })}>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Valor Principal (R$)</label>
                <input
                  type="number"
                  value={creditForm.principal}
                  onChange={e => setCreditForm({ ...creditForm, principal: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Taxa de Juros (% a.m.)</label>
                <input
                  type="number"
                  step="0.1"
                  value={creditForm.interestRate}
                  onChange={e => setCreditForm({ ...creditForm, interestRate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Quantidade de Parcelas</label>
                <input
                  type="number"
                  value={creditForm.installments}
                  onChange={e => setCreditForm({ ...creditForm, installments: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Forma de Amortização</label>
                <select value={creditForm.amortization} onChange={e => setCreditForm({ ...creditForm, amortization: e.target.value })}>
                  <option value="PARCELAS_FIXAS">Parcelas fixas mensais</option>
                  <option value="PERCENTUAL_RECEBIVEIS">Percentual de recebíveis (15%)</option>
                </select>
              </div>
            </div>

            <div className="formGroup">
              <label>Justificativa Formal Obrigatória</label>
              <textarea
                rows="2"
                placeholder="Ex: Custeio pré-evento aprovado em comitê comercial Disk..."
                value={creditForm.notes}
                onChange={e => setCreditForm({ ...creditForm, notes: e.target.value })}
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-outline" onClick={() => setModalCredito(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGrantCredit}>Emitir Contrato no Ledger</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO ESTORNO (COM RESERVA IMEDIATA) */}
      {/* ========================================================================= */}
      {modalEstorno && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Solicitação de Estorno Interno (Reserva Imediata)</h3>
              <button className="closeBtn" onClick={() => setModalEstorno(false)}><X /></button>
            </div>

            <div className="formGroup">
              <label>Evento Vinculado</label>
              <select value={refundForm.eventId} onChange={e => setRefundForm({ ...refundForm, eventId: e.target.value })}>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="formGroup">
                <label>Número do Pedido / Ingresso</label>
                <input
                  type="text"
                  placeholder="Ex: PED-99120"
                  value={refundForm.orderId}
                  onChange={e => setRefundForm({ ...refundForm, orderId: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Valor a Estornar (R$)</label>
                <input
                  type="number"
                  value={refundForm.value}
                  onChange={e => setRefundForm({ ...refundForm, value: e.target.value })}
                />
              </div>
            </div>

            <div className="formGroup">
              <label>Justificativa Formal Técnica (mínimo 5 caracteres)</label>
              <textarea
                rows="2"
                placeholder="Ex: Cancelamento solicitado dentro do prazo de arrependimento..."
                value={refundForm.reason}
                onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })}
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-outline" onClick={() => setModalEstorno(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleOpenRefund}>Iniciar Estorno &amp; Reter Saldo</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SOLICITAR REPASSE */}
      {/* ========================================================================= */}
      {modalRepasse && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Solicitar Repasse Financeiro</h3>
              <button className="closeBtn" onClick={() => setModalRepasse(false)}><X /></button>
            </div>

            <div className="formGroup">
              <label>Evento</label>
              <select value={payoutForm.eventId} onChange={e => setPayoutForm({ ...payoutForm, eventId: e.target.value })}>
                {data.events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} (Disponível: {money(ev.eligibility.availableToRequest)})</option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label>Valor Solicitado (R$)</label>
              <input
                type="number"
                value={payoutForm.value}
                onChange={e => setPayoutForm({ ...payoutForm, value: e.target.value })}
              />
            </div>

            <div className="modalFooter">
              <button className="btn btn-outline" onClick={() => setModalRepasse(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleRequestPayout}>Enviar Solicitação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);