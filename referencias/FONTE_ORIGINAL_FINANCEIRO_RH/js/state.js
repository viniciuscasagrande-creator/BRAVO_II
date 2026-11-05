/**
 * Core Financeiro Unificado - Gerenciador de Estado Reativo
 * Padrão de Arquitetura Limitless: Trilha de Auditoria, Fluxo Formal de Assinaturas e Autenticação
 */
import { getFreshDatabase } from './mockData.js';

export class CoreFinanceiroStore {
  constructor() {
    this.storageKey = 'disk-financeiro-v1-p24-v0623';
    this.data = this.loadPersistedData() || getFreshDatabase();
    if (!this.data.__p12Enriched) {
      this.enrichApprovalQueueWithAuditAndSignatures();
      this.data.__p12Enriched = true;
    }
    this.ensureOperationModel();

    const fresh = getFreshDatabase();
    if (!this.data.rhColaboradores) this.data.rhColaboradores = fresh.rhColaboradores;
    if (!this.data.rhDepartamentos) this.data.rhDepartamentos = fresh.rhDepartamentos;
    if (!this.data.rhCargos) this.data.rhCargos = fresh.rhCargos;
    if (!this.data.rhGeofences) this.data.rhGeofences = fresh.rhGeofences;
    if (!this.data.rhRegistrosPonto) this.data.rhRegistrosPonto = fresh.rhRegistrosPonto;
    if (!this.data.rhAjustesPonto) this.data.rhAjustesPonto = fresh.rhAjustesPonto;
    if (!this.data.rhEquipesCustosEvento) this.data.rhEquipesCustosEvento = fresh.rhEquipesCustosEvento;
    if (!this.data.rhAuditLogs) this.data.rhAuditLogs = fresh.rhAuditLogs;

    this.state = {
      isLoggedIn: true,
      currentUser: {
        id: "usr-prod-01",
        name: "João Silva",
        role: "producer", // "producer" | "disk"
        email: "joao@produtoraabc.com.br",
        title: "Diretor Financeiro (Produtora ABC)",
        producerId: "prod-abc"
      },
      viewMode: 'producer',        // 'producer' | 'disk'
      currentView: 'overview',     // Produtor: overview, saldos, etc. | Disk: diskDashboard, diskProdutores, diskAprovacoes, etc.
      selectedProducerId: 'prod-abc', // No produtor é estritamente travado no prod-abc; no Disk pode selecionar qualquer um
      selectedEventId: 'all',
      statementFilter: 'all',
      activeToast: null,
      searchTerm: ''
    };

    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r === 'financeiro' || r === 'disk') {
        this.state.currentUser = {
          id: "usr-disk-01",
          name: "Karine",
          role: "disk",
          email: "karine@diskingressos.com.br",
          title: "Administradora do Financeiro",
          producerId: null
        };
        this.state.viewMode = 'disk';
        this.state.currentView = 'diskDashboard';
        this.state.selectedProducerId = 'all';
        this.state.selectedEventId = 'all';
      } else if (r === 'admin') {
        this.state.currentUser = {
          id: "usr-admin-01",
          name: "Karine",
          role: "admin",
          email: "karine@diskingressos.com.br",
          title: "Administradora do Financeiro",
          producerId: null
        };
        this.state.viewMode = 'disk';
        this.state.currentView = 'diskDashboard';
        this.state.selectedProducerId = 'all';
        this.state.selectedEventId = 'all';
      }
    }

    // V0.9: restaura o contexto operacional do Financeiro Disk entre telas e recargas.
    if (this.state.viewMode === 'disk' && typeof localStorage !== 'undefined') {
      try {
        const ctx = JSON.parse(localStorage.getItem('disk-financeiro-context-v09') || 'null');
        if (ctx?.producerId && (ctx.producerId === 'all' || this.data.producers.some(p => p.id === ctx.producerId))) {
          this.state.selectedProducerId = ctx.producerId;
          const eventOk = ctx.eventId === 'all' || this.data.events.some(e => e.id === ctx.eventId && (ctx.producerId === 'all' || e.producerId === ctx.producerId));
          this.state.selectedEventId = eventOk ? (ctx.eventId || 'all') : 'all';
        }
      } catch (_) {}
    }

    this.listeners = [];
  }

  persistOperationalContext() {
    if (typeof localStorage === 'undefined' || this.state.viewMode !== 'disk') return;
    try {
      localStorage.setItem('disk-financeiro-context-v09', JSON.stringify({
        producerId: this.state.selectedProducerId || 'all',
        eventId: this.state.selectedEventId || 'all'
      }));
    } catch (_) {}
  }

  // Enriquece itens da fila com modelo formal de assinaturas e trilha de auditoria
  enrichApprovalQueueWithAuditAndSignatures() {
    this.data.approvalQueue = this.data.approvalQueue.map(item => {
      const isPaid = item.status === 'Pago';
      const isApproved = item.status === 'Aprovado' || isPaid;

      return {
        ...item,
        status: isPaid ? 'Pago' : (item.status === 'Em Análise' ? 'Em análise' : 'Aguardando análise'),
        documentId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
        documentTitle: item.type === 'Repasse' ? 'Termo de Liberação de Repasse Financeiro' : (item.type === 'Antecipação' ? 'Contrato de Antecipação de Recebíveis' : 'Termo de Fechamento de Borderô'),
        signatures: {
          producer: {
            signed: isPaid,
            signedBy: isPaid ? "João Silva (Produtora ABC)" : null,
            signedAt: isPaid ? "28/09/2026 14:10" : null,
            ip: isPaid ? "177.136.241.10" : null,
            certAuth: isPaid ? "ICP-BRASIL-A1-CERT-98214" : null
          },
          disk: {
            signed: isPaid,
            signedBy: isPaid ? "Karine (Adm do Financeiro)" : null,
            signedAt: isPaid ? "28/09/2026 14:35" : null,
            ip: isPaid ? "189.40.12.8" : null,
            certAuth: isPaid ? "DISK-AUTH-E-CNPJ-4410" : null,
            lockedUntilProducerSigns: !isPaid
          }
        },
        auditTrail: [
          { timestamp: "29/09/2026 09:14", actor: "João Silva (Produtor)", action: "Criou a solicitação de repasse", details: `Valor: R$ ${(item.requestedAmount || 80000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          { timestamp: "29/09/2026 09:27", actor: "João Silva (Produtor)", action: "Conferiu dados bancários e enviou para análise", details: "Status: Aguardando análise" },
          { timestamp: "29/09/2026 09:28", actor: "Sistema Disk", action: "Notificou a mesa de aprovação do Financeiro Disk", details: "Entrou na Central de Aprovações" }
        ],
        reservation: item.reservation || {
          type: item.type === 'Antecipação' ? 'RECEBIVEL_FUTURO' : 'SALDO_DISPONIVEL',
          amount: item.requestedAmount || item.netAmount || 0,
          status: isPaid ? 'Encerrada' : (item.status === 'Rejeitado' ? 'Liberada / Cancelada' : 'Reservado')
        },
        rejection: null
      };
    });
  }

  loadPersistedData() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.approvalQueue)) {
        parsed.approvalQueue.forEach(a => {
          if (a.signatures?.disk?.signedBy && a.signatures.disk.signedBy.includes('Maria Valente')) {
            a.signatures.disk.signedBy = a.signatures.disk.signedBy.replace('Maria Valente', 'Karine');
          }
        });
      }
      if (parsed && Array.isArray(parsed.events)) {
        const evt1 = parsed.events.find(e => e.id === 'evt-001');
        if (evt1 && (evt1.payoutsDone === 150000 || !evt1.payoutsDoneUnderPolicy)) {
          evt1.payoutsDone = 0.00;
          evt1.payoutsDoneUnderPolicy = 0.00;
          evt1.payoutBlockedBalance = 0.00;
          evt1.payoutReservedBalance = 0.00;
          evt1.payoutRetainedBalance = 0.00;
        }
      }
      return parsed;
    } catch (_) { return null; }
  }

  persist() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (_) {}
  }

  // ==========================================================================
  // CADASTRO MESTRE DO PRODUTOR — VALIDAÇÃO, UNICIDADE E HIERARQUIA CANÔNICA
  // Produtor (CNPJ) → Eventos → Movimentações Financeiras
  // ==========================================================================

  validateCNPJ(cnpj) {
    if (!cnpj) return { valid: false, error: 'CNPJ é obrigatório.' };
    const clean = String(cnpj).replace(/\D/g, '');
    if (clean.length !== 14) return { valid: false, error: 'CNPJ deve conter exatamente 14 dígitos.' };
    if (/^(\d)\1+$/.test(clean)) return { valid: false, error: 'CNPJ inválido (dígitos repetidos).' };

    // Permissão para mock/demo conhecidos
    const isMockAccepted = ['12345678000190', '14829301000192', '08992114000108', '22418990000144'].includes(clean);
    if (!isMockAccepted) {
      let size = clean.length - 2;
      let numbers = clean.substring(0, size);
      const digits = clean.substring(size);
      let sum = 0;
      let pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
      }
      let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(0), 10)) {
        return { valid: false, error: 'Primeiro dígito verificador do CNPJ inválido.' };
      }

      size = size + 1;
      numbers = clean.substring(0, size);
      sum = 0;
      pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
      }
      result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      if (result !== parseInt(digits.charAt(1), 10)) {
        return { valid: false, error: 'Segundo dígito verificador do CNPJ inválido.' };
      }
    }

    const formatted = clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    return { valid: true, clean, formatted };
  }

  findProducerByCNPJ(cnpj) {
    if (!cnpj) return null;
    const clean = String(cnpj).replace(/\D/g, '');
    return (this.data.producers || []).find(p => String(p.cnpj).replace(/\D/g, '') === clean) || null;
  }

  createProducer({
    name,
    tradeName,
    cnpj,
    contactEmail = '',
    phone = '',
    accountManager = 'Carlos Menezes (Disk Ingressos)',
    rating = 'Tier B - Padrão',
    status = 'Ativo',
    companyDetails = {},
    address = {},
    legalRepresentatives = [],
    financialContacts = [],
    contract = {},
    bankAccounts = [],
    documents = []
  }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas o Financeiro Disk pode cadastrar novos produtores.");
      return null;
    }

    if (!name || !name.trim()) {
      alert("A Razão Social é obrigatória.");
      return null;
    }

    const cnpjCheck = this.validateCNPJ(cnpj);
    if (!cnpjCheck.valid) {
      alert(`CNPJ inválido: ${cnpjCheck.error}`);
      return null;
    }

    const existing = this.findProducerByCNPJ(cnpjCheck.clean);
    if (existing) {
      alert(`Impedimento de Duplicidade: Já existe um produtor cadastrado com o CNPJ ${cnpjCheck.formatted} (${existing.name}).`);
      return null;
    }

    const newId = `prod-${Date.now()}`;
    const newProducer = {
      id: newId,
      name: name.trim(),
      tradeName: (tradeName || name).trim(),
      cnpj: cnpjCheck.formatted,
      contactEmail: contactEmail.trim(),
      phone: phone.trim(),
      accountManager,
      rating,
      status,
      riskScore: 'Baixo Risco (Score 90/100)',
      hasBlock: false,
      blockedAmount: 0.00,
      companyDetails: {
        stateRegistration: companyDetails.stateRegistration || '',
        municipalRegistration: companyDetails.municipalRegistration || '',
        cnae: companyDetails.cnae || '90.01-9-02 - Produção musical e eventos',
        companySize: companyDetails.companySize || 'Médio Porte',
        taxRegime: companyDetails.taxRegime || 'Lucro Presumido',
        openedAt: companyDetails.openedAt || new Date().toISOString().slice(0, 10),
        ...companyDetails
      },
      address: {
        street: address.street || '',
        city: address.city || 'Curitiba',
        state: address.state || 'PR',
        zipCode: address.zipCode || '',
        ...address
      },
      legalRepresentatives: legalRepresentatives.length ? legalRepresentatives : [
        { name: name.trim(), cpf: '', role: 'Representante Legal', email: contactEmail, phone }
      ],
      financialContacts: financialContacts.length ? financialContacts : [
        { name: tradeName || name, role: 'Financeiro Principal', email: contactEmail, phone }
      ],
      contract: {
        number: contract.number || `DISK-CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        diskFeePercent: Number(contract.diskFeePercent || 10.0),
        processingFeePercent: Number(contract.processingFeePercent || 2.9),
        anticipationRateMonthly: Number(contract.anticipationRateMonthly || 2.0),
        settlementDaysRule: contract.settlementDaysRule || 'D+2 após evento',
        retainedReservePercent: Number(contract.retainedReservePercent || 5.0),
        creditLimit: Number(contract.creditLimit || 100000.00),
        ...contract
      },
      totals: {
        grossSales: 0.00,
        netSales: 0.00,
        totalBalance: 0.00,
        availableBalance: 0.00,
        futureReceivables: 0.00,
        transferredAmount: 0.00,
        blockedBalance: 0.00,
        refundsAndChargebacks: 0.00
      },
      bankAccounts: bankAccounts || [],
      documents: documents || [],
      auditLog: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toLocaleString('pt-BR'),
          user: this.state.currentUser.name || 'Financeiro Disk',
          action: 'Criação do Cadastro Mestre',
          summary: `Produtor ${name.trim()} homologado com CNPJ ${cnpjCheck.formatted}.`
        }
      ]
    };

    this.data.producers.push(newProducer);
    this.persist();
    this.notify();
    return newProducer;
  }

  updateProducer(producerId, data) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas o Financeiro Disk pode atualizar o Cadastro Mestre do Produtor.");
      return null;
    }
    const producer = (this.data.producers || []).find(p => p.id === producerId);
    if (!producer) {
      alert("Produtor não localizado.");
      return null;
    }

    const changes = [];

    if (data.cnpj && String(data.cnpj).replace(/\D/g, '') !== String(producer.cnpj).replace(/\D/g, '')) {
      const check = this.validateCNPJ(data.cnpj);
      if (!check.valid) {
        alert(`CNPJ inválido: ${check.error}`);
        return null;
      }
      const existing = this.findProducerByCNPJ(check.clean);
      if (existing && existing.id !== producerId) {
        alert(`Impedimento de Duplicidade: CNPJ ${check.formatted} já pertence a outro produtor (${existing.name}).`);
        return null;
      }
      changes.push(`CNPJ alterado de ${producer.cnpj} para ${check.formatted}`);
      producer.cnpj = check.formatted;
    }

    if (data.name && data.name.trim() !== producer.name) {
      changes.push(`Razão Social alterada para ${data.name.trim()}`);
      producer.name = data.name.trim();
    }
    if (data.tradeName && data.tradeName.trim() !== producer.tradeName) {
      changes.push(`Nome Fantasia alterado para ${data.tradeName.trim()}`);
      producer.tradeName = data.tradeName.trim();
    }
    if (data.contactEmail !== undefined && data.contactEmail !== producer.contactEmail) {
      producer.contactEmail = data.contactEmail.trim();
    }
    if (data.phone !== undefined && data.phone !== producer.phone) {
      producer.phone = data.phone.trim();
    }
    if (data.accountManager !== undefined && data.accountManager !== producer.accountManager) {
      changes.push(`Gerente de Conta alterado para ${data.accountManager}`);
      producer.accountManager = data.accountManager.trim();
    }
    if (data.rating && data.rating !== producer.rating) {
      changes.push(`Rating alterado para ${data.rating}`);
      producer.rating = data.rating;
    }
    if (data.status && data.status !== producer.status) {
      changes.push(`Status cadastral alterado para ${data.status}`);
      producer.status = data.status;
    }

    if (data.companyDetails) {
      producer.companyDetails = { ...(producer.companyDetails || {}), ...data.companyDetails };
    }
    if (data.address) {
      producer.address = { ...(producer.address || {}), ...data.address };
    }
    if (data.legalRepresentatives) {
      producer.legalRepresentatives = data.legalRepresentatives;
    }
    if (data.financialContacts) {
      producer.financialContacts = data.financialContacts;
    }
    if (data.contract) {
      producer.contract = { ...(producer.contract || {}), ...data.contract };
    }

    producer.auditLog = producer.auditLog || [];
    const auditEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      at: new Date().toLocaleString('pt-BR'),
      user: this.state.currentUser.name || 'Financeiro Disk',
      by: this.state.currentUser.name || 'Financeiro Disk',
      action: 'Edição de Cadastro Mestre',
      summary: changes.length ? changes.join('; ') : 'Informações cadastrais atualizadas na Ficha Financeira.'
    };
    producer.auditLog.unshift(auditEntry);
    producer.auditHistory = producer.auditHistory || [];
    producer.auditHistory.unshift(auditEntry);

    this.persist();
    this.notify();
    return producer;
  }

  addProducerDocument(producerId, doc) {
    const producer = (this.data.producers || []).find(p => p.id === producerId);
    if (!producer) return null;
    producer.documents = producer.documents || [];
    const newDoc = {
      id: doc.id || `DOC-SOC-${Date.now()}`,
      type: doc.type || 'Documento Societário',
      name: doc.name || 'Documento Anexado',
      fileName: doc.fileName || 'documento.pdf',
      uploadDate: doc.uploadDate || new Date().toLocaleDateString('pt-BR'),
      status: doc.status || 'Válido',
      visibleToProducer: doc.visibleToProducer === true
    };
    producer.documents.unshift(newDoc);
    producer.auditLog = producer.auditLog || [];
    producer.auditLog.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: this.state.currentUser.name || 'Financeiro Disk',
      action: 'Anexo de Documento Societário',
      summary: `Documento ${newDoc.name} (${newDoc.type}) anexado. Visibilidade: ${newDoc.visibleToProducer ? 'Disponível ao Produtor' : 'Interno Disk'}.`
    });
    this.persist();
    this.notify();
    return newDoc;
  }

  toggleProducerDocumentVisibility(producerId, docId) {
    const producer = (this.data.producers || []).find(p => p.id === producerId);
    if (!producer) return;
    const doc = (producer.documents || []).find(d => d.id === docId);
    if (!doc) return;
    doc.visibleToProducer = !doc.visibleToProducer;
    producer.auditLog = producer.auditLog || [];
    producer.auditLog.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: this.state.currentUser.name || 'Financeiro Disk',
      action: 'Alteração de Visibilidade Documental',
      summary: `Documento ${doc.name} alterado para: ${doc.visibleToProducer ? 'Disponível ao Produtor' : 'Interno Disk'}.`
    });
    this.persist();
    this.notify();
  }

  getProducerSummary(producerId) {
    const acc = this.getProducerFinancialAccount(producerId);
    const producer = (this.data.producers || []).find(p => p.id === producerId) || this.data.producers[0];
    const summary = acc?.summary || {};
    const events = (this.data.events || []).filter(e => e.producerId === producer.id);

    const approvals = (this.data.approvalQueue || []).filter(a => a.producerId === producer.id);
    const pendingApprovals = approvals.filter(a => !['Pago', 'Rejeitado'].includes(a.status));
    const pendingPayoutAmount = pendingApprovals.reduce((acc, a) => acc + (a.requestedAmount || a.netAmount || 0), 0);

    const availableBalance = summary.availableForRepasse !== undefined ? summary.availableForRepasse : (producer.totals?.availableBalance || 0);
    const totalBalance = summary.consolidatedBalance !== undefined ? summary.consolidatedBalance : (producer.totals?.totalBalance || 0);
    const futureReceivables = summary.futurePending !== undefined ? summary.futurePending : (producer.totals?.futureReceivables || 0);
    const blockedBalance = summary.blocked !== undefined ? summary.blocked : (producer.totals?.blockedBalance || 0);
    const retainedBalance = summary.retained !== undefined ? summary.retained : 0;
    const outstandingDebt = summary.outstandingCredits !== undefined ? summary.outstandingCredits : 0;

    return {
      totalBalance,
      availableBalance,
      retainedAndReserved: retainedBalance + blockedBalance,
      futureReceivables,
      pendingPayouts: pendingPayoutAmount,
      pendingPayoutCount: pendingApprovals.length,
      outstandingDebt
    };
  }

  searchGlobalEntities(query) {
    if (!query || query.trim().length < 2) return { producers: [], events: [] };
    const q = query.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');

    const producers = (this.data.producers || []).filter(p => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchTrade = (p.tradeName || '').toLowerCase().includes(q);
      const matchId = (p.id || '').toLowerCase().includes(q);
      const cleanCNPJ = String(p.cnpj || '').replace(/\D/g, '');
      const matchCNPJ = (p.cnpj || '').toLowerCase().includes(q) || (cleanQ.length >= 3 && cleanCNPJ.includes(cleanQ));
      return matchName || matchTrade || matchId || matchCNPJ;
    });

    const events = (this.data.events || []).filter(e => {
      const matchName = (e.name || '').toLowerCase().includes(q);
      const matchId = (e.id || '').toLowerCase().includes(q);
      const matchVenue = (e.venue || '').toLowerCase().includes(q);
      const matchProdName = (e.producerName || '').toLowerCase().includes(q);
      return matchName || matchId || matchVenue || matchProdName;
    });

    return { producers, events };
  }

  ensureOperationModel() {
    this.data.operationEvents = this.data.operationEvents || [];
    this.data.spreadRules = this.data.spreadRules || [
      { id: 'SPR-001', name: 'Cartão de Crédito Parcelado (2 a 6x)', acquirer: 'Cielo', paymentMethod: 'Cartão de Crédito', brand: 'Visa/Mastercard', installments: '2 a 6x', chargedRate: 8.00, mdr: 2.80, fixedFee: 0.80, payer: 'Comprador (Conveniência)', term: 'D+30', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-002', name: 'Cartão de Crédito à Vista (1x)', acquirer: 'Rede', paymentMethod: 'Cartão de Crédito', brand: 'Visa/Mastercard', installments: '1x', chargedRate: 4.80, mdr: 2.00, fixedFee: 0.50, payer: 'Produtor (Retenção)', term: 'D+14', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-003', name: 'Cartão de Crédito Parcelado (7 a 12x Premium)', acquirer: 'Stone', paymentMethod: 'Cartão de Crédito', brand: 'Visa/Mastercard', installments: '7 a 12x', chargedRate: 9.90, mdr: 3.40, fixedFee: 1.00, payer: 'Comprador (Conveniência)', term: 'D+30', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-004', name: 'PIX Instantâneo EFI / Safra', acquirer: 'EfiPix', paymentMethod: 'PIX', brand: 'Todas', installments: 'À vista', chargedRate: 1.50, mdr: 0.40, fixedFee: 0.00, payer: 'Produtor (Retenção)', term: 'D+0', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-005', name: 'Cartão de Débito Balcão PDV & Online', acquirer: 'PagBank', paymentMethod: 'Cartão de Débito', brand: 'Elo/Visa/Master', installments: 'À vista', chargedRate: 3.90, mdr: 1.10, fixedFee: 0.30, payer: 'Produtor (Retenção)', term: 'D+1', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-006', name: 'Boleto Bancário Registrado', acquirer: 'Rede', paymentMethod: 'Boleto', brand: 'Todas', installments: 'À vista', chargedRate: 4.30, mdr: 1.20, fixedFee: 2.50, payer: 'Produtor (Retenção)', term: 'D+2', scopeType: 'Geral Disk', scopeId: 'all', validFrom: '2026-01-01', validTo: '', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-007', name: 'Condição Especial VIP - Produtora ABC', acquirer: 'Cielo', paymentMethod: 'Cartão de Crédito', brand: 'Visa/Mastercard', installments: '2 a 6x', chargedRate: 6.90, mdr: 2.80, fixedFee: 0.50, payer: 'Produtor', term: 'D+14', scopeType: 'Produtor', scopeId: 'prod-abc', validFrom: '2026-03-01', validTo: '2026-12-31', status: 'Ativa', version: 1, history: [] },
      { id: 'SPR-008', name: 'Taxa Promocional - Festival de Verão Curitiba', acquirer: 'Rede', paymentMethod: 'Cartão de Crédito', brand: 'Visa/Mastercard', installments: '1x', chargedRate: 3.90, mdr: 2.00, fixedFee: 0.00, payer: 'Produtor', term: 'D+7', scopeType: 'Evento', scopeId: 'evt-001', validFrom: '2026-06-01', validTo: '2026-08-31', status: 'Ativa', version: 1, history: [] }
    ];

    // Normalização defensiva para regras já existentes em memória/persistência
    this.data.spreadRules.forEach(r => {
      if (!r.scopeType) r.scopeType = 'Geral Disk';
      if (!r.scopeId) r.scopeId = 'all';
      if (!r.paymentMethod) r.paymentMethod = 'Cartão de Crédito';
      if (!r.version) r.version = 1;
      if (!r.history) r.history = [];
    });

    this.data.gatewayConfigs = this.data.gatewayConfigs || (this.data.gateways || []).map((g, i) => ({
      id: g.id,
      name: g.name,
      providerType: 'Adquirente / Gateway',
      environment: i === 3 ? 'Sandbox' : 'Produção',
      enabled: !g.status.includes('Backup'),
      connectionStatus: i === 3 ? 'Não configurado' : 'Conectado (Produção)',
      lastTestAt: '30/09/2026 09:12',
      merchantId: i === 0 ? '••••8421' : '••••' + String(5100 + i),
      clientId: '••••••••' + String(2100 + i),
      secretConfigured: i !== 3,
      cards: ['Visa', 'Mastercard', 'Elo', 'American Express'],
      pix: { enabled: i !== 3, keyType: 'CNPJ', key: '12.345.678/0001-90', term: i === 0 ? 'D+0' : 'D+1', immediateSplit: true },
      boleto: {
        enabled: i < 2,
        bank: i === 0 ? 'Banco do Brasil (001)' : 'Itaú Unibanco (341)',
        wallet: i === 0 ? '17' : '109',
        agreement: i === 0 ? '3482109' : '9823412',
        agency: '1234',
        account: '56789-0',
        dueDays: 3,
        finePercent: 2.0,
        dailyInterestPercent: 0.033,
        instructions: 'Sr. Caixa, não receber após 10 dias do vencimento. Aceitar somente valor nominal.'
      },
      installments: { max: 12, interestFrom: 7, minInstallmentAmount: 15.0 },
      antifraud: { enabled: true, provider: i % 2 === 0 ? 'ClearSale Total' : 'Konduto Enterprise', mode: 'Automático com 3DS 2.0', scoreMinApproval: 85 },
      webhooks: { enabled: i !== 3, urlConfigured: i !== 3, url: `https://api.diskingressos.com.br/v1/webhooks/${g.id}`, hmacConfigured: true },
      updatedAt: '30/09/2026 09:30',
      logs: [
        { at: '30/09/2026 09:12', action: 'Teste de conexão executado', actor: 'Karine (Adm Financeiro)', result: i === 3 ? 'Pendente de credenciais' : 'Conexão local validada' },
        { at: '29/09/2026 14:00', action: 'Homologação de ambiente', actor: 'Karine (Adm Financeiro)', result: 'Ambiente definido para ' + (i === 3 ? 'Sandbox' : 'Produção') }
      ]
    }));

    // Normalização defensiva para gatewayConfigs existentes
    this.data.gatewayConfigs.forEach(g => {
      if (!g.cards) g.cards = ['Visa', 'Mastercard', 'Elo'];
      if (!g.pix) g.pix = { enabled: true, term: 'D+0' };
      if (!g.boleto) g.boleto = { enabled: true, bank: 'Banco do Brasil' };
      if (!g.installments) g.installments = { max: 12, interestFrom: 7 };
      if (!g.antifraud) g.antifraud = { enabled: true, provider: 'ClearSale Total' };
      if (!g.webhooks) g.webhooks = { enabled: true, urlConfigured: true };
      if (!g.logs) g.logs = [];
    });
    this.data.splitRules = this.data.splitRules || [{
      id: 'SPL-001',
      eventId: 'evt-001',
      name: 'Regra padrão do evento',
      status: 'Ativa',
      beneficiaries: [
        { name: 'Organizador (Principal)', percent: 70 },
        { name: 'Afiliado / Coprodutor', percent: 10 },
        { name: 'Produtor Artístico', percent: 15 },
        { name: 'Plataforma DiskIngressos', percent: 5 }
      ],
      updatedAt: new Date().toLocaleString('pt-BR')
    }];
    this.data.payables = this.data.payables || [
      { id: 'PAG-001', creditor: 'Mega Som & Iluminação', dueDate: '19/07/2026', amount: 14500, status: 'Pendente' },
      { id: 'PAG-002', creditor: 'Segurança Forte Ltda', dueDate: '12/07/2026', amount: 9800, status: 'Pendente' },
      { id: 'PAG-003', creditor: 'Agência Tráfego Ads', dueDate: '05/07/2026', amount: 7600, status: 'Pendente' }
    ];
    this.data.refundRequests = this.data.refundRequests || [];

    // Pacote 19: Conciliação Financeira Multicamadas
    this.data.reconciliationItems = this.data.reconciliationItems || [
      { id: 'CON-001', camada: 'Adquirentes', origem: 'Adquirente → Recebível', ref: 'LIQ-20260929-0182', produtor: 'Produtora ABC Ltda.', evento: 'Festival Curitiba 2026', esperado: 184520.00, realizado: 184520.00, status: 'Conciliado' },
      { id: 'CON-002', camada: 'Gateways', origem: 'Gateway → Adquirente', ref: 'GTW-20260929-7710', produtor: 'Live Music Produções', evento: 'Arena Music Festival', esperado: 96340.50, realizado: 96340.50, status: 'Conciliado' },
      { id: 'CON-003', camada: 'PIX/CNAB', origem: 'Banco → PIX', ref: 'PIX-20260929-4412', produtor: 'Produtora ABC Ltda.', evento: 'Festival Curitiba 2026', esperado: 48200.00, realizado: 48150.00, status: 'Divergência' },
      { id: 'CON-004', camada: 'Bancária', origem: 'Ledger × Extrato Banco do Brasil', ref: 'LDG-20260929-9182', produtor: 'Produtora ABC Ltda.', evento: 'Festival Curitiba 2026', esperado: 126800.00, realizado: 126800.00, status: 'Conciliado' },
      { id: 'CON-005', camada: 'Recebíveis', origem: 'Venda × Agenda × Recebimento', ref: 'REC-20260929-0044', produtor: 'Disk Ingressos (Geral)', evento: 'Consolidado Vendas', esperado: 884200.00, realizado: 884200.00, status: 'Conciliado' },
      { id: 'CON-006', camada: 'Repasses', origem: 'Obrigação Repasse → Banco', ref: 'REP-2026-00128', produtor: 'Produtora ABC Ltda.', evento: 'Festival Curitiba 2026', esperado: 50000.00, realizado: 50000.00, status: 'Conciliado' }
    ];

    // Pacote 19: Ocorrências e Retornos de Remessas Bancárias CNAB
    this.data.cnabOccurrences = this.data.cnabOccurrences || [
      {
        id: 'OC-01',
        batchId: 'CNAB-20260928-02',
        paymentRef: 'PGT-REP-00119',
        producer: 'Produtora ABC Ltda.',
        bank: 'Caixa Econômica Federal (104)',
        bankCode: '03 - Conta corrente encerrada / inválida',
        reason: 'Divergência de dígito verificador na conta cadastrada',
        amount: 1850.00,
        attempts: 2,
        owner: 'Karine (Adm Financeiro)',
        status: 'Pendente'
      },
      {
        id: 'OC-02',
        batchId: 'CNAB-20260928-02',
        paymentRef: 'PGT-REP-00121',
        producer: 'Live Music Produções',
        bank: 'Bradesco (237)',
        bankCode: '15 - Titularidade divergente (CPF/CNPJ)',
        reason: 'CNPJ favorecido não confere com contrato do produtor',
        amount: 4200.00,
        attempts: 1,
        owner: 'Karine (Adm Financeiro)',
        status: 'Pendente'
      }
    ];

    this.data.cnabReturns = this.data.cnabReturns || [
      {
        id: 'RET-20260929-01.ret',
        batchId: 'CNAB-240-20260929-01',
        bank: 'Banco do Brasil S.A. (001)',
        processedAt: '29/09/2026 17:45',
        settledCount: 14,
        totalSettled: 642890.00,
        occurrencesCount: 0,
        status: 'Processado e Conciliado'
      },
      {
        id: 'RET-20260928-03.ret',
        batchId: 'CNAB-20260928-03',
        bank: 'Itaú Unibanco (341)',
        processedAt: '28/09/2026 18:20',
        settledCount: 22,
        totalSettled: 884200.00,
        occurrencesCount: 0,
        status: 'Processado e Conciliado'
      },
      {
        id: 'RET-20260928-02.ret',
        batchId: 'CNAB-20260928-02',
        bank: 'Banco do Brasil S.A. (001)',
        processedAt: '28/09/2026 16:30',
        settledCount: 6,
        totalSettled: 195450.00,
        occurrencesCount: 2,
        status: 'Ocorrências Pendentes'
      }
    ];

    // Pacote 19: Contas Corporativas da Tesouraria com Finalidade Definida
    this.data.treasuryAccounts = this.data.treasuryAccounts || [
      {
        id: 'bb-operacional',
        bankName: 'Banco do Brasil S.A. (001)',
        accountType: 'Conta Corrente Corporativa PJ',
        agency: '1890-X',
        accountNumber: '55400-1',
        balance: 1240500.00,
        purpose: 'Conta Operacional (Pagamentos, Fornecedores & CNAB 240/400)',
        settlementChannel: 'CNAB / TED / TEF',
        status: 'Ativa',
        isMain: true,
        updatedAt: '30/09/2026 08:30'
      },
      {
        id: 'itau-liquidacao',
        bankName: 'Itaú Unibanco (341)',
        accountType: 'Conta Corrente Corporativa PJ',
        agency: '0910',
        accountNumber: '28910-2',
        balance: 699500.00,
        purpose: 'Conta de Liquidação (PIX Instantâneo, Recebimentos & Split SPI)',
        settlementChannel: 'PIX SPI / DICT Bacen',
        status: 'Ativa',
        isMain: false,
        updatedAt: '30/09/2026 08:30'
      }
    ];

    // Retenções Detalhadas do Produtor (Reserva operacional R$ 20.000, Chargeback R$ 10.000, Estornos pendentes R$ 5.000, Regra contratual R$ 10.000 = Total R$ 45.000)
    this.data.retentions = this.data.retentions || [
      {
        id: 'RET-001',
        producerId: 'prod-abc',
        eventId: 'evt-001',
        eventName: 'Festival Curitiba 2026',
        category: 'Reserva operacional',
        origin: 'Vendas Cartão de Crédito Lote 2',
        reason: 'Garantia operacional pós-evento para despesas e contingências',
        amount: 20000.00,
        date: '15/09/2026',
        status: 'Ativa',
        releaseCondition: 'D+30 após encerramento do evento (15/12/2026)'
      },
      {
        id: 'RET-002',
        producerId: 'prod-abc',
        eventId: 'evt-001',
        eventName: 'Festival Curitiba 2026',
        category: 'Chargeback',
        origin: 'Disputa Portador Cartão #CB-9941',
        reason: 'Contestação comercial em análise pela adquirente Cielo',
        amount: 10000.00,
        date: '22/09/2026',
        status: 'Sob Análise',
        releaseCondition: 'Após encerramento e deferimento da contestação pela adquirente'
      },
      {
        id: 'RET-003',
        producerId: 'prod-abc',
        eventId: 'evt-002',
        eventName: 'Show Artista A - Turnê Especial',
        category: 'Estornos pendentes',
        origin: 'Protocolo #EST-2026-0089',
        reason: 'Estornos solicitados por compradores em fase de processamento bancário',
        amount: 5000.00,
        date: '25/09/2026',
        status: 'Processando',
        releaseCondition: 'Após confirmação de débito e liquidação no extrato do gateway'
      },
      {
        id: 'RET-004',
        producerId: 'prod-abc',
        eventId: 'evt-002',
        eventName: 'Show Artista A - Turnê Especial',
        category: 'Regra contratual',
        origin: 'Contrato DISK-CTR-2025-089 (Cláusula 8.2)',
        reason: 'Retenção cautelar de 5% sobre faturamento bruto até emissão do borderô final',
        amount: 10000.00,
        date: '01/09/2026',
        status: 'Ativa',
        releaseCondition: 'Assinatura mútua do Termo de Encerramento e Borderô Final'
      }
    ];

    this.data.eventTransfers = this.data.eventTransfers || [
      {
        id: 'TRF-2026-00128',
        fromEventId: 'evt-001',
        fromEventName: 'Festival Curitiba 2026',
        toEventId: 'evt-002',
        toEventName: 'Show Artista A - Turnê Especial',
        amount: 50000.00,
        reason: 'Reforço de caixa operacional para adiantamento de fornecedores',
        timestamp: '28/09/2026 15:30',
        createdBy: 'João Silva (Produtor)',
        status: 'Concluída'
      }
    ];

    this.data.approvalQueue = this.data.approvalQueue || [];
    if (!this.data.approvalQueue.some(a => a.id === 'REP-2026-00128')) {
      this.data.approvalQueue.unshift({
        id: 'REP-2026-00128',
        protocol: 'REP-2026-00128',
        workflowId: 'WF-REP-2026-00128',
        type: 'Repasse',
        producerId: 'prod-abc',
        producerName: 'Produtora ABC Ltda.',
        eventId: 'evt-001',
        eventName: 'Festival Curitiba 2026',
        requestedAmount: 50000.00,
        amount: 50000.00,
        netAmount: 50000.00,
        requestDate: '30/09/2026 09:32',
        status: 'Em análise',
        bankName: 'Itaú Unibanco (341)',
        bankAccount: 'Ag 0432 • C/C 48291-0',
        pixKey: '14.829.301/0001-92 (CNPJ)',
        createdByUserId: 'usr-prod-01',
        createdBy: 'João Silva (Produtor)',
        documentId: 'DOC-2026-00128',
        checklist: {
          balanceSufficient: true,
          bankDataValidated: true,
          eventRegular: true,
          noActiveBlocks: true,
          limitPermitted: true,
          chargebackWarning: 'Sem pendências'
        },
        auditPosition: {
          grossSales: 500000.00,
          netRevenue: 450000.00,
          availableBefore: 200000.00,
          requested: 50000.00,
          retainedAndBlocked: 40000.00,
          availableAfter: 150000.00
        },
        reservation: {
          type: 'SALDO_DISPONIVEL',
          amount: 50000.00,
          status: 'Reservado'
        },
        signatures: {
          producer: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null },
          disk: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null, lockedUntilProducerSigns: true }
        },
        auditTrail: [
          { timestamp: '30/09/2026 09:32', actor: 'João Silva (Produtor)', action: 'Solicitou repasse financeiro', details: 'Protocolo REP-2026-00128 criado no valor de R$ 50.000,00' },
          { timestamp: '30/09/2026 09:32', actor: 'Sistema Disk', action: 'Recebido pelo Financeiro Disk', details: 'Reserva de saldo de R$ 50.000,00 efetuada no Festival Curitiba 2026' },
          { timestamp: '30/09/2026 09:35', actor: 'Karine (Financeiro Disk)', action: 'Entrou em análise financeira', details: 'Conferência de adimplência e saldo disponível' }
        ],
        notes: 'Repasse solicitado para pagamento de fornecedores do Festival Curitiba 2026.'
      });
    }

    this.data.approvalQueue = this.data.approvalQueue.map(item => ({
      ...item,
      protocol: item.protocol || item.id,
      workflowId: item.workflowId || `WF-${item.id}`,
      documentId: item.documentId || `DOC-${item.id}`,
      createdByUserId: item.createdByUserId || 'usr-prod-01',
      createdBy: item.createdBy || 'Produtor',
      checklist: item.checklist || {
        balanceSufficient: true,
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: true,
        limitPermitted: true,
        chargebackWarning: 'Sem pendências'
      },
      updatedAt: item.updatedAt || item.requestDate || new Date().toLocaleString('pt-BR')
    }));

    if (this.data.producers) {
      this.data.producers.forEach(p => {
        if (!p.bankAccounts) p.bankAccounts = [];
        p.bankAccounts.forEach(b => {
          if (!b.status) b.status = 'Ativa';
          if (!b.bindingType) b.bindingType = 'geral';
          if (!b.documents || !b.documents.length) {
            b.documents = [{
              id: `doc-${b.id}`,
              name: 'comprovante_titularidade.pdf',
              type: 'Comprovante bancário',
              uploadedAt: b.validatedAt || '15/01/2025'
            }];
          }
          if (!b.version) b.version = 1;
        });
      });
      const xyz = this.data.producers.find(p => p.id === 'prod-xyz');
      if (xyz && !xyz.bankAccounts.some(b => b.status === 'Pendente de validação')) {
        xyz.bankAccounts.push({
          id: 'bnk-xyz-2',
          bankName: 'Santander Brasil (033)',
          accountType: 'Conta Corrente PJ',
          agency: '4321',
          accountNumber: '9872-1',
          digit: '1',
          holderName: 'Eventos XYZ Produções Artísticas',
          cnpj: '22.418.990/0001-44',
          pixKey: '22.418.990/0001-44',
          pixType: 'CNPJ',
          purpose: 'Repasse',
          bindingType: 'evento',
          eventId: 'evt-002',
          eventName: 'Show Internacional Rock Tour',
          isDefault: false,
          status: 'Pendente de validação',
          createdAt: '28/09/2026 11:20',
          documents: [
            { id: 'doc-bnk-xyz-2', name: 'comprovante_bancario_santander.pdf', type: 'Comprovante bancário', uploadedAt: '28/09/2026' }
          ]
        });
      }
    }

    // Pacote 23: Política Oficial de Repasse & Motor de Elegibilidade (50% vendas -> 20% liberação)
    if (!this.data.payoutPolicies) {
      this.data.payoutPolicies = getFreshDatabase().payoutPolicies;
    }
    if (!this.data.exceptionalAuthorizations) {
      this.data.exceptionalAuthorizations = getFreshDatabase().exceptionalAuthorizations;
    }
    if (Array.isArray(this.data.events)) {
      this.data.events.forEach(e => {
        if (!e.salesTarget) {
          e.salesTarget = e.id === 'evt-001' ? 1000000 : (e.id === 'evt-002' ? 600000 : (e.id === 'evt-003' ? 200000 : (e.grossSales ? e.grossSales * 2 : 500000)));
        }
      });
    }

    // Pacote 24: Créditos e Antecipações ao Produtor (vinculados ao CNPJ)
    if (!this.data.producerCredits) {
      this.data.producerCredits = [
        {
          id: "CR-2026-001",
          protocol: "CR-2026-0001",
          producerId: "prod-abc",
          eventId: "evt-003",
          eventName: "Arena Sertaneja 2026",
          principal: 100000.00,
          interestRate: 2.0,
          installmentsCount: 5,
          installmentValue: 22000.00,
          amortizationModel: "PARCELAS_FIXAS",
          receivablePercent: 15.0,
          totalDebt: 110000.00,
          outstandingDebt: 88000.00,
          amortizedTotal: 22000.00,
          status: "ATIVO",
          grantedAt: "2026-09-20T10:00:00Z",
          grantedBy: "Karine Mendes (Financeiro Disk)",
          notes: "Adiantamento pré-evento para custeio de estrutura de palco e camarins",
          amortizationHistory: [
            {
              id: "AM-1",
              date: "30/09/2026 14:30",
              value: 22000.00,
              type: "PARCELA_FIXA",
              balanceAfter: 88000.00,
              actor: "Motor Financeiro Automático"
            }
          ]
        }
      ];
    }

    // Pacote 24 / V0.3: Agenda de Obrigações e Reservas Internas (Aluguel, ECAD, Fornecedores, etc.)
    if (!this.data.eventObligations) {
      this.data.eventObligations = [
        {
          id: "OB-2026-001",
          eventId: "evt-003",
          producerId: "prod-abc",
          category: "ALUGUEL_ESPACO",
          description: "Aluguel do espaço / Arena Principal",
          beneficiary: "Arena Positivo / Teatro",
          value: 80000.00,
          dueDate: "2026-11-10",
          documentRef: "Contrato Locação 2026/04",
          status: "RESERVADO", // 'PREVISTO', 'RESERVADO', 'RETIDO', 'LIQUIDADO'
          createdAt: "2026-10-01T12:00:00Z",
          actor: "Financeiro Disk",
          notes: "Reserva preventiva para garantia do aluguel do espaço"
        },
        {
          id: "OB-2026-002",
          eventId: "evt-003",
          producerId: "prod-abc",
          category: "ECAD",
          description: "Direitos Autorais / ECAD",
          beneficiary: "ECAD - Escritório Central de Arrecadação",
          value: 15000.00,
          dueDate: "2026-11-15",
          documentRef: "Guia ECAD ref. 10/2026",
          status: "RESERVADO",
          createdAt: "2026-10-01T12:10:00Z",
          actor: "Financeiro Disk",
          notes: "Reserva preventiva obrigatória de execução musical"
        },
        {
          id: "OB-2026-003",
          eventId: "evt-003",
          producerId: "prod-abc",
          category: "OPERACIONAL",
          description: "Segurança e Brigada de Incêndio",
          beneficiary: "Grupo Alfa Segurança Armada",
          value: 10000.00,
          dueDate: "2026-11-05",
          documentRef: "Ordem de Serviço OS-8821",
          status: "RESERVADO",
          createdAt: "2026-10-01T12:20:00Z",
          actor: "Financeiro Disk",
          notes: "Obrigação operacional indispensável para realização"
        }
      ];
    }

    // Pacote 24 / V0.3: Fila Interna de Estornos com Reserva Imediata e Dupla Autorização (SoD)
    if (!this.data.internalRefunds) {
      this.data.internalRefunds = [
        {
          id: "ES-2026-001",
          eventId: "evt-003",
          producerId: "prod-abc",
          orderId: "PED-98421",
          value: 1250.00,
          reason: "Contestação de compra / cancelamento de ingresso VIP Duplo",
          status: "AGUARDANDO_SEGUNDA_AUTORIZACAO",
          requestedBy: "João Analista (Financeiro Disk)",
          approvals: [
            {
              approvalIndex: 1,
              userId: "usr-disk-01",
              userName: "Karine Mendes",
              userRole: "Financeiro Disk",
              at: "2026-10-02T10:15:00Z",
              factor: "MFA_TOKEN_VALIDADO",
              notes: "1ª autorização: Comprovante de cancelamento conferido no SAC"
            }
          ],
          executedBy: null,
          executedAt: null,
          createdAt: "2026-10-02T10:00:00Z"
        },
        {
          id: "ES-2026-002",
          eventId: "evt-003",
          producerId: "prod-abc",
          orderId: "PED-98770",
          value: 450.00,
          reason: "Cancelamento no prazo legal do consumidor (Art. 49 CDC)",
          status: "AGUARDANDO_PRIMEIRA_AUTORIZACAO",
          requestedBy: "Mesa Financeiro Disk",
          approvals: [],
          executedBy: null,
          executedAt: null,
          createdAt: "2026-10-02T11:00:00Z"
        }
      ];
    }
  }

  recordOperationEvent(item, action, details = '', module = 'Core Financeiro') {
    if (!item) return;
    const event = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      workflowId: item.workflowId || `WF-${item.id}`,
      protocol: item.protocol || item.id,
      producerId: item.producerId,
      eventId: item.eventId,
      module,
      action,
      details,
      actor: this.state?.currentUser?.name || 'Sistema Disk',
      timestamp: new Date().toLocaleString('pt-BR')
    };
    item.updatedAt = event.timestamp;
    this.data.operationEvents.unshift(event);
    item.auditTrail = item.auditTrail || [];
    item.auditTrail.push({ timestamp: event.timestamp, actor: event.actor, action, details });
    this.persist();
  }

  findOperation(protocol) {
    return this.data.approvalQueue.find(i => i.id === protocol || i.protocol === protocol || i.workflowId === protocol);
  }

  getState() {
    const isAllProducers = this.state.selectedProducerId === 'all' || !this.state.selectedProducerId;
    let activeProd = null;
    let consolidatedTotals = null;

    if (isAllProducers && this.state.viewMode === 'disk') {
      const sumTotals = this.data.producers.reduce((acc, p) => ({
        grossSales: acc.grossSales + (p.totals?.grossSales || 0),
        netSales: acc.netSales + (p.totals?.netSales || 0),
        totalBalance: acc.totalBalance + (p.totals?.totalBalance || 0),
        availableBalance: acc.availableBalance + (p.totals?.availableBalance || 0),
        reservedBalance: acc.reservedBalance + (p.totals?.reservedBalance || 0),
        reservedReceivables: acc.reservedReceivables + (p.totals?.reservedReceivables || 0),
        futureReceivables: acc.futureReceivables + (p.totals?.futureReceivables || 0),
        transferredAmount: acc.transferredAmount + (p.totals?.transferredAmount || 0),
        blockedBalance: acc.blockedBalance + (p.totals?.blockedBalance || 0),
        refundsAndChargebacks: acc.refundsAndChargebacks + (p.totals?.refundsAndChargebacks || 0),
      }), { grossSales: 0, netSales: 0, totalBalance: 0, availableBalance: 0, reservedBalance: 0, reservedReceivables: 0, futureReceivables: 0, transferredAmount: 0, blockedBalance: 0, refundsAndChargebacks: 0 });

      activeProd = {
        id: 'all',
        name: 'Todos os Produtores (Consolidado)',
        tradeName: 'Carteira Global Disk Ingressos',
        cnpj: 'Consolidado Geral',
        rating: 'Carteira Geral',
        status: 'Ativo',
        hasBlock: false,
        contract: {
          number: 'MASTER-GLOBAL',
          diskFeePercent: 10.0,
          anticipationRateMonthly: 2.5
        },
        totals: sumTotals,
        bankAccounts: []
      };
      consolidatedTotals = sumTotals;
    } else {
      activeProd = this.data.producers.find(p => p.id === this.state.selectedProducerId) || this.data.producers[0];
      consolidatedTotals = activeProd.totals || {
        grossSales: 890000.00,
        netSales: 801000.00,
        totalBalance: 785000.00,
        availableBalance: 310000.00,
        reservedBalance: 0.00,
        reservedReceivables: 0.00,
        futureReceivables: 245000.00,
        transferredAmount: 920000.00,
        blockedBalance: 25000.00,
        refundsAndChargebacks: 15000.00
      };
    }

    return {
      ...this.state,
      data: {
        ...this.data,
        producer: activeProd,
        bankAccounts: activeProd.bankAccounts || [],
        consolidatedTotals: consolidatedTotals
      },
      activeProducer: activeProd,
      pendingApprovalsCount: this.data.approvalQueue.filter(a => a.status === 'Aguardando análise' || a.status === 'Em análise' || a.status === 'Aguardando assinatura do Financeiro').length
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.persist();
    const currentState = this.getState();
    this.listeners.forEach(listener => listener(currentState));
  }

  // ==========================================================================
  // AUTENTICAÇÃO E PERFIS DE USUÁRIO (Uma única tela de login)
  // ==========================================================================
  login(role, producerId = "prod-abc") {
    if (role === 'producer') {
      const prod = this.data.producers.find(p => p.id === producerId) || this.data.producers[0];
      this.state.currentUser = {
        id: "usr-prod-01",
        name: "João Silva",
        role: "producer",
        email: prod.contactEmail || "joao@produtoraabc.com.br",
        title: "Diretor Geral",
        producerId: producerId
      };
      this.state.viewMode = 'producer';
      this.state.currentView = 'overview';
      this.state.selectedProducerId = producerId;
      this.state.selectedEventId = 'all';
    } else if (role === 'admin') {
      this.state.currentUser = {
        id: "usr-admin-01",
        name: "Karine",
        role: "admin",
        email: "karine@diskingressos.com.br",
        title: "Administradora do Financeiro",
        producerId: null
      };
      this.state.viewMode = 'disk';
      this.state.currentView = 'diskDashboard';
      this.state.selectedProducerId = 'all';
      this.state.selectedEventId = 'all';
    } else {
      this.state.currentUser = {
        id: "usr-disk-01",
        name: "Karine",
        role: "disk",
        email: "karine@diskingressos.com.br",
        title: "Administradora do Financeiro",
        producerId: null
      };
      this.state.viewMode = 'disk';
      this.state.currentView = 'diskDashboard';
      this.state.selectedProducerId = 'all';
      this.state.selectedEventId = 'all';
    }
    this.state.isLoggedIn = true;
    this.showToast(
      "Perfil de demonstração ativo",
      `Simulação ativa como ${this.state.currentUser.name} (${this.state.currentUser.title})`,
      "info"
    );
    this.notify();
  }

  logout() {
    this.state.isLoggedIn = false;
    this.notify();
  }

  // Navegação
  setView(viewName) {
    this.state.currentView = viewName;
    this.notify();
  }

  setViewMode(mode) {
    if (mode === 'producer') {
      this.login('producer', 'prod-abc');
    } else {
      this.login('disk');
    }
  }

  setSelectedProducer(producerId) {
    if (this.state.currentUser.role === 'producer') {
      // Regra de segurança: Produtor NUNCA pode trocar de produtor!
      this.state.selectedProducerId = this.state.currentUser.producerId;
      this.state.currentProducerId = this.state.currentUser.producerId;
    } else {
      this.state.selectedProducerId = producerId;
      if (producerId && producerId !== 'all') {
        this.state.currentProducerId = producerId;
      }
    }
    this.state.selectedEventId = 'all';
    this.persistOperationalContext();
    this.persist?.();
    this.notify();
  }

  setProducerContext(producerId) {
    this.setSelectedProducer(producerId);
  }

  setSelectedEvent(eventId) {
    if (eventId !== 'all' && this.state.selectedProducerId !== 'all') {
      const evt = (this.data.events || []).find(e => e.id === eventId);
      if (!evt || evt.producerId !== this.state.selectedProducerId) eventId = 'all';
    }
    this.state.selectedEventId = eventId;
    this.persistOperationalContext();
    this.notify();
  }

  // Pacote 22: atualiza contexto operacional em uma única notificação, evitando
  // renders intermediários ao atravessar módulos da mesma operação.
  setOperationalContext({ producerId = null, eventId = null, viewName = null } = {}) {
    if (this.state.currentUser.role === 'producer') {
      this.state.selectedProducerId = this.state.currentUser.producerId;
    } else if (producerId) {
      this.state.selectedProducerId = producerId;
    }

    if (eventId) {
      this.state.selectedEventId = eventId;
    } else if (producerId) {
      this.state.selectedEventId = 'all';
    }

    if (viewName) this.state.currentView = viewName;
    this.notify();
  }

  setStatementFilter(filter) {
    this.state.statementFilter = filter;
    this.notify();
  }

  showToast(title, message, type = 'info', meta = null) {
    this.state.activeToast = { title, message, type, meta, timestamp: Date.now() };
    this.notify();
    setTimeout(() => {
      if (this.state.activeToast && Date.now() - this.state.activeToast.timestamp >= 5000) {
        this.state.activeToast = null;
        this.notify();
      }
    }, 5500);
  }

  closeToast() {
    this.state.activeToast = null;
    this.notify();
  }

  // ==========================================================================
  // FLUXO OFICIAL: SOLICITAÇÃO → ANÁLISE → DECISÃO → ASSINATURAS → LIBERAÇÃO
  // ==========================================================================

  // 1. Produtor Cria e Envia Solicitação
  requestPayout({ eventId, amount, bankAccountId, notes }) {
    const producer = this.getState().activeProducer;
    const event = this.data.events.find(e => e.id === eventId) || this.data.events.find(e => e.producerId === producer.id);
    const bank = producer.bankAccounts.find(b => b.id === bankAccountId) || producer.bankAccounts[0];
    const numericAmount = parseFloat(amount);

    if (this.state.currentUser.role !== 'producer') {
      alert("Somente o Produtor pode criar esta solicitação no Portal do Produtor.");
      return null;
    }
    if (!event || event.producerId !== producer.id) {
      alert("Evento inválido para este produtor.");
      return null;
    }
    if (!numericAmount || numericAmount <= 0) {
      alert("Informe um valor válido para o repasse.");
      return null;
    }
    if (numericAmount > event.availableBalance) {
      alert(`Saldo insuficiente: O valor solicitado (${numericAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) excede o saldo disponível de ${event.name} (${event.availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
      return null;
    }
    if (!bank || !['Ativa', 'Validada & Ativa'].includes(bank.status)) {
      alert("Pagamento bloqueado — Produtor sem conta bancária validada.");
      return null;
    }

    // Validação Canônica do Motor de Elegibilidade (50% vendas -> 20% liberação ou Exceção Administrativa)
    const elig = this.calculatePayoutEligibility(event.id);
    if (elig) {
      if (!elig.ruleMet && !elig.isExceptional) {
        const msg = `Solicitação bloqueada: O evento ainda não atingiu a política mínima de vendas (${elig.minSalesPercent}%). Progresso atual: ${elig.progressPercent.toFixed(1)}%. Faltam R$ ${elig.faltamVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas para liberar o primeiro repasse.`;
        alert(msg);
        return null;
      }
      if (numericAmount > elig.disponivelFinal) {
        const msg = `Valor solicitado (R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o limite disponível para repasse pela política vigente (R$ ${elig.disponivelFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
        alert(msg);
        return null;
      }
    }

    const payoutId = `REP-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('pt-BR');

    // Se for exceção administrativa ativa, marca e consome a autorização
    if (elig?.isExceptional && elig.activeException) {
      elig.activeException.consumed = true;
      elig.activeException.payoutId = payoutId;
      elig.activeException.consumedAt = new Date().toISOString();
    }

    const newApprovalItem = {
      id: payoutId,
      protocol: payoutId,
      workflowId: `WF-${payoutId}`,
      type: "Repasse",
      producerId: producer.id,
      producerName: producer.name,
      eventId: event.id,
      eventName: event.name,
      requestedAmount: numericAmount,
      requestDate: `${nowDate} ${nowTime}`,
      status: "Aguardando análise",
      stepIndex: 1,
      documentId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      documentTitle: "Termo de Liberação de Repasse Financeiro",
      bankName: bank.bankName,
      bankAccount: `${bank.agency} • ${bank.accountNumber}`,
      pixKey: bank.pixKey,
      createdByUserId: this.state.currentUser.id,
      createdBy: `${this.state.currentUser.name} (Produtor)`,
      checklist: {
        balanceSufficient: numericAmount <= event.availableBalance,
        bankDataValidated: Boolean(bank && ['Ativa', 'Validada & Ativa'].includes(bank.status)),
        eventRegular: Boolean(event && event.status !== 'Suspenso' && event.status !== 'Bloqueado'),
        noActiveBlocks: !producer.hasBlock && Number(event.payoutBlockedBalance !== undefined ? event.payoutBlockedBalance : (event.id === 'evt-001' ? 0 : (event.blockedBalance || 0))) === 0,
        limitPermitted: numericAmount <= this.getTransferableAmount(event),
        eligibilityMet: elig ? (elig.ruleMet || elig.isExceptional) : true,
        chargebackWarning: event.chargebackCases > 0 ? `${event.chargebackCases} chargeback(s) sob monitoramento` : 'Sem pendências'
      },
      eligibilitySnapshot: elig || null,
      exceptionalAuthorizationId: elig?.isExceptional ? elig.activeException?.id : null,
      exceptionalAuthorization: elig?.isExceptional ? elig.activeException : null,
      auditPosition: {
        grossSales: event.grossSales,
        netRevenue: event.netRevenue,
        availableBefore: event.availableBalance,
        requested: numericAmount,
        availableAfter: Math.max(0, event.availableBalance - numericAmount)
      },
      signatures: {
        producer: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null },
        disk: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null, lockedUntilProducerSigns: true }
      },
      auditTrail: [
        { timestamp: `${nowTime}`, actor: `${this.state.currentUser.name} (Produtor)`, action: "Criou solicitação de repasse", details: `R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        elig?.isExceptional
          ? { timestamp: `${nowTime}`, actor: "Mesa Financeira Disk", action: "Autorização Excepcional Aplicada", details: `Protocolo ${elig.activeException.protocol} autorizou R$ ${elig.activeException.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Motivo: ${elig.activeException.reason}` }
          : { timestamp: `${nowTime}`, actor: "Motor de Elegibilidade", action: "Elegibilidade Atestada", details: `Regra de ${elig?.minSalesPercent || 50}% de vendas atingida (${elig?.progressPercent?.toFixed(1) || '0'}%). Limite liberado: ${elig?.releasePercent || 20}%.` },
        { timestamp: `${nowTime}`, actor: `${this.state.currentUser.name} (Produtor)`, action: "Conferiu valores e enviou para análise", details: "Status: Aguardando análise" },
        { timestamp: `${nowTime}`, actor: "Sistema Disk", action: "Notificou a Tesouraria Disk", details: "Entrou na Central de Aprovações" }
      ],
      rejection: null,
      notes: notes || "Solicitado pelo Produtor via Portal"
    };

    // Insere no topo da Fila
    this.data.approvalQueue.unshift(newApprovalItem);

    // Reserva operacional: o valor deixa de ficar livre para novas solicitações
    event.reservedBalance = (event.reservedBalance || 0) + numericAmount;
    newApprovalItem.reservation = { type: "SALDO_DISPONIVEL", amount: numericAmount, status: "Reservado" };
    event.availableBalance = Math.max(0, event.availableBalance - numericAmount);
    producer.totals.availableBalance = Math.max(0, producer.totals.availableBalance - numericAmount);
    producer.totals.reservedBalance = (producer.totals.reservedBalance || 0) + numericAmount;

    this.showToast(
      "🔔 Nova Solicitação Enviada",
      `${producer.name} · ${event.name} — R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} enviado para análise da Disk (Saldo Reservado).`,
      "warning"
    );

    this.recordOperationEvent(newApprovalItem, 'Solicitação enviada', 'Saldo reservado e encaminhado ao Financeiro Disk', 'Ambiente Produtor');
    this.notify();
    return newApprovalItem;
  }

  // ==========================================================================
  // MOTOR DE ELEGIBILIDADE DE REPASSES & POLÍTICA PARAMETRIZÁVEL (PACOTE 23)
  // Hierarquia: Geral Disk → Produtor → Evento | Gatilho 50% → Libera 20%
  // ==========================================================================

  getPayoutPolicy(producerId = null, eventId = null) {
    const globalPolicy = this.data.payoutPolicies?.global || {
      minSalesPercent: 50,
      releasePercent: 20,
      considerRefunds: true,
      considerChargebacks: true,
      considerMdr: true,
      requireValidatedBank: true,
      requireDiskApproval: true,
      requireDigitalSignature: true,
      allowAdministrativeException: true,
      updatedAt: "2026-09-30 10:00:00",
      updatedBy: "Diretoria Financeira Disk"
    };

    const prodOverride = producerId && this.data.payoutPolicies?.byProducer?.[producerId]
      ? this.data.payoutPolicies.byProducer[producerId]
      : {};

    const eventOverride = eventId && this.data.payoutPolicies?.byEvent?.[eventId]
      ? this.data.payoutPolicies.byEvent[eventId]
      : {};

    const appliedScope = (eventOverride && Object.keys(eventOverride).length > 0)
      ? 'Evento'
      : ((prodOverride && Object.keys(prodOverride).length > 0) ? 'Produtor' : 'Geral Disk');

    return {
      ...globalPolicy,
      ...prodOverride,
      ...eventOverride,
      _appliedScope: appliedScope
    };
  }

  updatePayoutPolicy({ scope = 'global', targetId = null, policy = {} }) {
    if (!this.data.payoutPolicies) {
      this.data.payoutPolicies = { global: {}, byProducer: {}, byEvent: {} };
    }
    const actor = this.state.currentUser?.name || "Administrador Disk";
    const timestamp = new Date().toLocaleString('pt-BR');

    if (scope === 'global') {
      this.data.payoutPolicies.global = {
        ...this.data.payoutPolicies.global,
        ...policy,
        updatedAt: timestamp,
        updatedBy: actor
      };
    } else if (scope === 'producer' && targetId) {
      this.data.payoutPolicies.byProducer = this.data.payoutPolicies.byProducer || {};
      this.data.payoutPolicies.byProducer[targetId] = {
        ...(this.data.payoutPolicies.byProducer[targetId] || {}),
        ...policy,
        updatedAt: timestamp,
        updatedBy: actor
      };
    } else if (scope === 'event' && targetId) {
      this.data.payoutPolicies.byEvent = this.data.payoutPolicies.byEvent || {};
      this.data.payoutPolicies.byEvent[targetId] = {
        ...(this.data.payoutPolicies.byEvent[targetId] || {}),
        ...policy,
        updatedAt: timestamp,
        updatedBy: actor
      };
    }

    this.persist();
    this.showToast(
      "✓ Política de Repasse Atualizada",
      `Parâmetros atualizados no escopo [${scope.toUpperCase()}] com sucesso.`,
      "success"
    );
    this.notify();
    return this.getPayoutPolicy(scope === 'producer' ? targetId : null, scope === 'event' ? targetId : null);
  }

  calculatePayoutEligibility(eventId) {
    const event = this.data.events.find(e => e.id === eventId);
    if (!event) return null;

    const producer = this.data.producers.find(p => p.id === event.producerId) || this.getState().activeProducer;
    const policy = this.getPayoutPolicy(producer?.id, event.id);

    const salesTarget = Number(event.salesTarget || (event.capacity ? event.capacity * 150 : (event.grossSales * 2)) || 1000000);
    const grossSales = Number(event.grossSales || 0);

    // Percentual atingido das vendas em relação à meta
    const progressPercent = salesTarget > 0 ? (grossSales / salesTarget) * 100 : 0;
    const minSalesPercent = Number(policy.minSalesPercent ?? 50);
    const releasePercent = Number(policy.releasePercent ?? 20);

    // Gatilho: atingiu percentual mínimo de vendas?
    const ruleMet = progressPercent >= minSalesPercent;

    // Faltam vendas para liberar o primeiro repasse?
    const targetMinSales = salesTarget * (minSalesPercent / 100);
    const faltamVendas = ruleMet ? 0 : Math.max(0, targetMinSales - grossSales);

    // Limite bruto liberado sobre as vendas realizadas
    const limiteBruto = ruleMet ? (grossSales * (releasePercent / 100)) : 0;

    // Deduções operacionais de repasse estritamente específicas deste evento sob a política comercial (50% vendas -> 20% liberação):
    // Segregação estrita: Não desconta valores consolidados do produtor nem reservas de transferências entre eventos
    const previousPayouts = Number(event.payoutsDoneUnderPolicy !== undefined ? event.payoutsDoneUnderPolicy : (event.id === 'evt-001' ? 0 : (event.payoutsDone || 0)));
    const blockedBalance = Number(event.payoutBlockedBalance !== undefined ? event.payoutBlockedBalance : (event.id === 'evt-001' ? 0 : (event.blockedBalance || 0)));
    const reservedBalance = Number(event.payoutReservedBalance !== undefined ? event.payoutReservedBalance : 0);
    const retainedBalance = Number(event.payoutRetainedBalance !== undefined ? event.payoutRetainedBalance : 0);

    // Amortização de crédito ativo vinculado ao evento (se houver e política considerar)
    const activeCreditForEvent = (this.data.producerCredits || []).find(
      c => c.eventId === event.id && c.status === 'ATIVO'
    );
    let creditAmortizationHold = 0;
    if (activeCreditForEvent && (policy.considerCreditAmortization ?? true)) {
      if (activeCreditForEvent.amortizationModel === 'PARCELAS_FIXAS') {
        creditAmortizationHold = Math.min(activeCreditForEvent.outstandingDebt, activeCreditForEvent.installmentValue || 0);
      } else if (activeCreditForEvent.amortizationModel === 'PERCENTUAL_RECEBIVEIS') {
        creditAmortizationHold = Math.min(activeCreditForEvent.outstandingDebt, grossSales * ((activeCreditForEvent.receivablePercent || 15) / 100));
      }
    }

    // Pacote 24 / V0.3: Obrigações internas do evento (aluguel, ECAD, fornecedores, etc.)
    const obligationsForEvent = (this.data.eventObligations || []).filter(
      o => o.eventId === event.id && ['RESERVADO', 'RETIDO'].includes(o.status)
    );
    const obligationsHold = obligationsForEvent.reduce((s, o) => s + Number(o.value || 0), 0);

    // Pacote 24 / V0.3: Reservas de estornos em andamento (aguardando autorização/efetivação)
    const pendingRefundsForEvent = (this.data.internalRefunds || []).filter(
      r => r.eventId === event.id && ['AGUARDANDO_PRIMEIRA_AUTORIZACAO', 'AGUARDANDO_SEGUNDA_AUTORIZACAO', 'AUTORIZADO_PARA_EFETIVAR'].includes(r.status)
    );
    const refundsHold = pendingRefundsForEvent.reduce((s, r) => s + Number(r.value || 0), 0);

    // Estornos já efetivados
    const executedRefundsForEvent = (this.data.internalRefunds || []).filter(
      r => r.eventId === event.id && r.status === 'EFETIVADO'
    );
    const executedRefunds = executedRefundsForEvent.reduce((s, r) => s + Number(r.value || 0), 0);

    // Deduções operacionais canônicas do limite de repasse:
    // Limite = (Vendas * %Liberado) - repasses anteriores - bloqueados - amortização de crédito - obrigações - estornos
    const totalDeductions = previousPayouts + blockedBalance + reservedBalance + retainedBalance + creditAmortizationHold + obligationsHold + refundsHold + executedRefunds;
    const standardAvailable = Math.max(0, limiteBruto - totalDeductions);

    // Trava de saldo disponível no evento (descontando reservas de obrigações e estornos em hold)
    const rawEventAvailable = Number(event.availableBalance || 0);
    const eventAvailable = Math.max(0, rawEventAvailable - obligationsHold - refundsHold);
    const maxStandardEligible = Math.min(eventAvailable, standardAvailable);

    // Verifica se há Autorização Excepcional ativa para este evento
    const activeException = (this.data.exceptionalAuthorizations || []).find(
      a => a.eventId === event.id && a.status === 'ATIVA' && !a.consumed
    );

    const isExceptional = Boolean(activeException);
    let finalAvailable = maxStandardEligible;

    if (isExceptional && activeException) {
      // Exceção administrativa permite repasse até o limite autorizado e saldo do evento
      finalAvailable = Math.min(eventAvailable, Number(activeException.amount));
    }

    return {
      eventId: event.id,
      eventName: event.name,
      producerId: producer?.id || event.producerId,
      producerName: producer?.name || event.producerName,
      salesTarget,
      grossSales,
      progressPercent: Math.round(progressPercent * 10) / 10,
      minSalesPercent,
      releasePercent,
      ruleMet,
      faltamVendas,
      limiteBruto,
      previousPayouts,
      reservedBalance,
      retainedBalance,
      blockedBalance,
      creditAmortizationHold,
      obligationsHold,
      refundsHold,
      executedRefunds,
      obligations: obligationsForEvent,
      pendingRefunds: pendingRefundsForEvent,
      activeCredit: activeCreditForEvent || null,
      totalDeductions,
      eventAvailable,
      rawEventAvailable,
      standardAvailable,
      disponivelPadrao: maxStandardEligible,
      disponivelFinal: finalAvailable,
      isExceptional,
      activeException: activeException || null,
      status: isExceptional ? 'EXCECAO_AUTORIZADA' : (ruleMet ? 'HABILITADO' : 'BLOQUEADO'),
      policy
    };
  }

  authorizeExceptionalPayout({ eventId, amount, reason, authorizedBy = null }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a mesa do Financeiro Disk pode emitir Autorizações Excepcionais.");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert("Informe um valor válido para a autorização excepcional.");
      return null;
    }

    if (numericAmount > event.availableBalance) {
      alert(`O valor autorizado (${numericAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) excede o saldo financeiro do evento (${event.availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
      return null;
    }

    if (!reason || reason.trim().length < 5) {
      alert("É obrigatório fornecer uma justificativa formal com no mínimo 5 caracteres para fins de auditoria.");
      return null;
    }

    const producer = this.data.producers.find(p => p.id === event.producerId);
    const actor = authorizedBy || `${this.state.currentUser.name} (${this.state.currentUser.title || 'Financeiro Disk'})`;
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('pt-BR');

    const authId = `AUT-${Date.now()}`;
    const protocol = `AUT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newAuth = {
      id: authId,
      protocol,
      eventId: event.id,
      eventName: event.name,
      producerId: producer?.id || event.producerId,
      producerName: producer?.name || event.producerName,
      amount: numericAmount,
      reason: reason.trim(),
      authorizedBy: actor,
      createdAt: nowIso,
      createdDate: `${nowDate} ${nowTime}`,
      status: 'ATIVA',
      consumed: false,
      payoutId: null
    };

    this.data.exceptionalAuthorizations = this.data.exceptionalAuthorizations || [];
    this.data.exceptionalAuthorizations.unshift(newAuth);

    this.showToast(
      "🛡️ Autorização Excepcional Concedida",
      `Protocolo ${protocol} emitido para ${event.name} no valor de ${numericAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      "success"
    );

    this.recordOperationEvent(
      { id: protocol, protocol, type: 'Autorização Excepcional', producerName: producer?.name, eventName: event.name },
      'Autorização Excepcional Emitida',
      `Liberado repasse de até R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Justificativa: ${reason.trim()}`,
      'Mesa Financeiro Disk'
    );

    this.persist();
    this.notify();
    return newAuth;
  }

  // ==========================================================================
  // REGRAS DE INTEGRIDADE, GOVERNANÇA E SEGREGAÇÃO DE FUNÇÕES (SoD)
  // ==========================================================================
  getEventRestrictions(event) {
    return {
      reserved: Number(event?.reservedBalance || 0),
      retained: Number(event?.retainedBalance || 0),
      blocked: Number(event?.blockedBalance || 0)
    };
  }

  getTransferableAmount(event) {
    const base = Number(event?.financialBalance ?? event?.availableBalance ?? 0);
    const { reserved, retained, blocked } = this.getEventRestrictions(event);
    return Math.max(0, base - reserved - retained - blocked);
  }

  isChecklistValid(checklist = {}) {
    return checklist.balanceSufficient === true &&
      checklist.bankDataValidated === true &&
      checklist.eventRegular === true &&
      checklist.noActiveBlocks === true &&
      checklist.limitPermitted === true;
  }

  assertSegregation(item, action) {
    const userId = this.state.currentUser?.id;
    if (!userId) throw new Error('Usuário autenticado inválido.');
    
    // Regra SoD 1: O criador da operação não pode aprovar ou rejeitar a própria operação
    if (item.createdByUserId && item.createdByUserId === userId && ['APROVAR', 'REJEITAR'].includes(action)) {
      throw new Error('Segregação de funções: o criador da operação não pode decidir a própria operação.');
    }
    // Regra SoD 2: Quem aprovou a operação não pode liquidá-la
    if (item.approvedByUserId && item.approvedByUserId === userId && action === 'LIQUIDAR') {
      throw new Error('Segregação de funções: quem aprova não pode liquidar a mesma operação.');
    }
  }

  // 2. Financeiro Disk: Aprova a Operação (Gera Documento e Aguarda Assinatura do Produtor)
  approveOperationByDisk(requestId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error("Aprovação permitida somente ao Financeiro Disk.");
    }
    const item = this.data.approvalQueue.find(a => a.id === requestId);
    if (!item) throw new Error("Solicitação não encontrada.");

    if (!['Aguardando análise', 'Em análise'].includes(item.status)) {
      throw new Error(`Operação ${item.id} não pode ser aprovada no status ${item.status}.`);
    }

    this.assertSegregation(item, 'APROVAR');

    if (!this.isChecklistValid(item.checklist)) {
      throw new Error('Aprovação bloqueada: checklist financeiro possui validações pendentes.');
    }

    // Recalcula posição de saldo no instante exato da decisão para evitar condição de corrida
    const decisionEvt = this.data.events.find(e => e.id === item.eventId);
    const reqAmt = Number(item.requestedAmount ?? item.netAmount ?? 0);
    if (decisionEvt && item.type === 'Repasse') {
      const liveAvail = Number(decisionEvt.availableBalance || 0) + (item.reservation?.status === 'Reservado' ? Number(item.reservation.amount || 0) : 0);
      if (reqAmt > liveAvail) {
        throw new Error(`Saldo insuficiente no momento da decisão: solicitado R$ ${reqAmt.toLocaleString('pt-BR')}, disponível R$ ${liveAvail.toLocaleString('pt-BR')}.`);
      }
      item.auditPosition = {
        grossSales: decisionEvt.grossSales || 500000,
        netRevenue: decisionEvt.netRevenue || 450000,
        availableBefore: item.auditPosition?.availableBefore ?? Number(decisionEvt.availableBalance || 200000),
        requested: reqAmt,
        retainedAndBlocked: (decisionEvt.retainedBalance || 0) + (decisionEvt.blockedBalance || 0),
        availableAfter: Math.max(0, (item.auditPosition?.availableBefore ?? Number(decisionEvt.availableBalance || 200000)) - reqAmt)
      };
    }

    const operator = this.state.currentUser.name;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDateStr = new Date().toLocaleDateString('pt-BR');

    item.status = "Aguardando assinatura do Produtor";
    item.stepIndex = 3;
    item.approvedBy = operator;
    item.approvedByUserId = this.state.currentUser.id;
    item.approvedAt = `${nowDateStr} ${nowTime}`;
    item.decisionRecalculatedAt = `${nowDateStr} ${nowTime}`;

    // Regra central de segurança: O Financeiro Disk NUNCA assina antes do Produtor
    item.signatures.disk.lockedUntilProducerSigns = true;

    item.auditTrail.push(
      { timestamp: `${nowTime}`, actor: `${operator} (Financeiro Disk)`, action: "Analisou e aprovou a operação", details: "Checklist de risco validado com sucesso" },
      { timestamp: `${nowTime}`, actor: "Sistema de Formalização", action: `Gerou documento ${item.documentId}`, details: "Aguardando assinatura digital do Produtor" }
    );

    this.recordOperationEvent(item, 'Operação aprovada', 'Documento liberado para assinatura do Produtor', 'Central de Aprovações');

    this.showToast(
      "✓ Solicitação Aprovada pelo Financeiro",
      `Documento ${item.documentId} gerado. Aguardando assinatura digital do Produtor para posterior liberação da Disk.`,
      "info"
    );

    this.notify();
    return item;
  }

  // 3. Financeiro Disk: Rejeita a Operação Formalmente (com motivo obrigatório e devolução automática da reserva)
  rejectOperationByDisk(requestId, { reasonCategory, observation } = {}) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error("Rejeição permitida somente ao Financeiro Disk.");
    }
    if (!reasonCategory || !observation?.trim()) {
      throw new Error("Informe o motivo e a observação para rejeitar a operação.");
    }
    const item = this.data.approvalQueue.find(a => a.id === requestId);
    if (!item) throw new Error("Solicitação não encontrada.");

    if (!['Aguardando análise', 'Em análise'].includes(item.status)) {
      throw new Error(`Operação ${item.id} não pode ser rejeitada no status ${item.status}.`);
    }

    this.assertSegregation(item, 'REJEITAR');

    const operator = this.state.currentUser.name;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    item.status = "Rejeitado";
    item.stepIndex = 0;
    item.rejectedByUserId = this.state.currentUser.id;
    item.rejection = {
      rejectedBy: operator,
      rejectedAt: `${new Date().toLocaleDateString('pt-BR')} ${nowTime}`,
      reasonCategory: reasonCategory,
      observation: observation
    };

    if (item.reservation) {
      item.reservation.status = "Liberada / Cancelada";
    }

    // Estorna saldo ou recebíveis de volta ao disponível e cancela a reserva operacional
    const event = this.data.events.find(e => e.id === item.eventId);
    const producer = this.data.producers.find(p => p.id === item.producerId);

    if (item.type === "Repasse") {
      if (event) {
        event.availableBalance += item.requestedAmount;
        event.reservedBalance = Math.max(0, (event.reservedBalance || 0) - item.requestedAmount);
      }
      if (producer) {
        producer.totals.availableBalance += item.requestedAmount;
        producer.totals.reservedBalance = Math.max(0, (producer.totals.reservedBalance || 0) - item.requestedAmount);
      }
    } else if (item.type === "Antecipação") {
      if (event) {
        event.futureReceivables += item.requestedAmount;
        event.reservedReceivables = Math.max(0, (event.reservedReceivables || 0) - item.requestedAmount);
      }
      if (producer) {
        producer.totals.futureReceivables += item.requestedAmount;
        producer.totals.reservedReceivables = Math.max(0, (producer.totals.reservedReceivables || 0) - item.requestedAmount);
      }
      if (this.data.anticipations?.history) {
        const hist = this.data.anticipations.history.find(h => h.id === item.id);
        if (hist) hist.status = "Rejeitado";
      }
    }

    item.auditTrail.push(
      { timestamp: `${nowTime}`, actor: `${operator} (Financeiro Disk)`, action: "Rejeitou a solicitação", details: `Motivo: ${reasonCategory} — Obs: ${observation} (Reserva estornada com sucesso)` }
    );

    this.recordOperationEvent(item, 'Operação rejeitada', `${reasonCategory}: ${observation}`, 'Central de Aprovações');

    this.showToast(
      "✕ Solicitação Rejeitada",
      `A solicitação ${item.id} foi rejeitada (${reasonCategory}). O produtor foi notificado e o saldo reservado foi restabelecido.`,
      "danger"
    );

    this.notify();
  }

  // 4. Produtor Assina Digitalmente em Primeiro Lugar
  signByProducer(requestId) {
    if (this.state.currentUser.role !== 'producer') {
      throw new Error("A assinatura do Produtor deve ocorrer no ambiente do Produtor.");
    }
    const item = this.data.approvalQueue.find(a => a.id === requestId);
    if (!item) throw new Error("Solicitação não encontrada.");

    if (item.status !== "Aguardando assinatura do Produtor" && item.status !== "Aprovado") {
      throw new Error(`Este documento não pode ser assinado pelo Produtor no status atual: ${item.status}.`);
    }

    if (item.signatures?.producer?.signed) {
      throw new Error("Documento já assinado pelo Produtor.");
    }

    const signer = this.state.currentUser.name;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    item.signatures.producer.signed = true;
    item.signatures.producer.signedBy = `${signer} (${item.producerName})`;
    item.signatures.producer.signedAt = `${new Date().toLocaleDateString('pt-BR')} ${nowTime}`;
    item.signatures.producer.ip = "177.136.241.10";
    item.signatures.producer.certAuth = `ICP-BRASIL-A1-${Math.floor(100000 + Math.random() * 900000)}`;

    // Agora o Financeiro é desbloqueado para assinar por último
    item.signatures.disk.lockedUntilProducerSigns = false;
    item.status = "Aguardando assinatura do Financeiro";

    item.auditTrail.push(
      { timestamp: `${nowTime}`, actor: `${signer} (Produtor)`, action: `Assinou digitalmente ${item.documentId}`, details: `Autenticação: ${item.signatures.producer.certAuth}` },
      { timestamp: `${nowTime}`, actor: "Sistema de Assinaturas", action: "Notificou o Financeiro Disk para assinatura final", details: "Status: Aguardando assinatura do Financeiro" }
    );

    this.recordOperationEvent(item, 'Assinatura do Produtor concluída', `Documento ${item.documentId}`, 'Assinaturas');

    this.showToast(
      "✍️ Documento Assinado pelo Produtor",
      `O documento ${item.documentId} foi assinado por ${signer}. Encaminhado para a assinatura final do Financeiro Disk.`,
      "success"
    );

    this.notify();
    return item;
  }

  signDocumentAsProducer(requestId) {
    return this.signByProducer(requestId);
  }

  // 5. Financeiro Disk Assina (SEMPRE POR ÚLTIMO) e Formaliza
  signByDisk(requestId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error("Assinatura final permitida somente ao Financeiro Disk.");
    }
    const item = this.data.approvalQueue.find(a => a.id === requestId);
    if (!item) throw new Error("Solicitação não encontrada.");

    // TRAVA OBRIGATÓRIA DO SISTEMA: O Financeiro NUNCA assina antes do Produtor
    if (!item.signatures?.producer?.signed) {
      throw new Error("BLOQUEIO DE SEGURANÇA: O Financeiro Disk é sempre o último signatário. O documento deve ser assinado primeiramente pelo Produtor.");
    }

    if (item.signatures?.disk?.signed) {
      throw new Error("Documento já assinado pelo Financeiro Disk.");
    }

    if (item.status !== 'Aguardando assinatura do Financeiro') {
      throw new Error(`Status inválido para assinatura final: ${item.status}.`);
    }

    this.assertSegregation(item, 'ASSINAR_DISK');

    const operator = this.state.currentUser.name;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    item.signatures.disk.signed = true;
    item.signatures.disk.signedBy = `${operator} (Tesouraria Disk)`;
    item.signatures.disk.signedAt = `${new Date().toLocaleDateString('pt-BR')} ${nowTime}`;
    item.signatures.disk.ip = "189.40.12.8";
    item.signatures.disk.certAuth = `DISK-AUTH-E-CNPJ-${Math.floor(1000 + Math.random() * 9000)}`;

    item.status = "Documento assinado";

    item.auditTrail.push(
      { timestamp: `${nowTime}`, actor: `${operator} (Financeiro Disk)`, action: `Assinou por último o documento ${item.documentId}`, details: `Autenticação: ${item.signatures.disk.certAuth}` },
      { timestamp: `${nowTime}`, actor: "Sistema de Formalização", action: "Documento Formalizado e Concluído", details: "Operação liberada para transferência financeira" }
    );

    this.recordOperationEvent(item, 'Assinatura final da Disk concluída', `Documento ${item.documentId}`, 'Assinaturas');

    this.showToast(
      "📜 Documento Formalizado com Sucesso",
      `Ambas as partes assinaram o documento ${item.documentId}. Liberado para pagamento na Tesouraria.`,
      "success"
    );

    this.notify();
    return item;
  }

  signDocumentAsDisk(requestId) {
    return this.signByDisk(requestId);
  }

  // 6. Liberação Financeira / Transferência (PIX / TED / CNAB) → Ledger → Conciliação → Concluído / Pago
  executeFinalTransfer(requestId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error("Liquidação permitida somente ao Financeiro Disk.");
    }
    const item = this.data.approvalQueue.find(a => a.id === requestId);
    if (!item) throw new Error("Solicitação não encontrada.");

    if (item.status === 'Pago' || item.paidDate || item.liquidationId) {
      throw new Error(`Liquidação duplicada bloqueada para ${item.id}.`);
    }

    if (!item.signatures?.disk?.signed || !item.signatures?.producer?.signed || item.status !== 'Documento assinado') {
      throw new Error("BLOQUEIO: a liquidação exige aprovação e ambas as assinaturas concluídas.");
    }

    const prodCheck = this.data.producers.find(p => p.id === item.producerId);
    const activeBank = prodCheck?.bankAccounts?.find(b => ['Ativa', 'Validada & Ativa'].includes(b.status));
    if (!activeBank) {
      throw new Error("Pagamento bloqueado — Produtor sem conta bancária validada.");
    }

    this.assertSegregation(item, 'LIQUIDAR');

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('pt-BR');

    item.liquidationId = `LIQ-${Math.floor(100000 + Math.random() * 900000)}`;
    item.status = "Pago";
    item.stepIndex = 5;
    item.paidDate = `${nowDate} ${nowTime}`;
    item.liquidatedByUserId = this.state.currentUser.id;
    item.authCode = `DISK-PIX-TED-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const event = this.data.events.find(e => e.id === item.eventId);
    const producer = this.data.producers.find(p => p.id === item.producerId);
    const finalAmount = item.requestedAmount || item.netAmount;

    if (item.reservation) {
      item.reservation.status = "Encerrada / Liquidada";
    }

    if (event) {
      event.payoutsDone += finalAmount;
      if (item.type === "Repasse") {
        event.reservedBalance = Math.max(0, (event.reservedBalance || 0) - (item.requestedAmount || finalAmount));
      } else if (item.type === "Antecipação") {
        event.reservedReceivables = Math.max(0, (event.reservedReceivables || 0) - (item.requestedAmount || finalAmount));
      }
    }
    if (producer) {
      producer.totals.transferredAmount += finalAmount;
      if (item.type === "Repasse") {
        producer.totals.reservedBalance = Math.max(0, (producer.totals.reservedBalance || 0) - (item.requestedAmount || finalAmount));
      } else if (item.type === "Antecipação") {
        producer.totals.reservedReceivables = Math.max(0, (producer.totals.reservedReceivables || 0) - (item.requestedAmount || finalAmount));
      }
    }

    if (item.type === "Antecipação" && this.data.anticipations?.history) {
      const histItem = this.data.anticipations.history.find(h => h.id === item.id);
      if (histItem) {
        histItem.status = "Pago";
        histItem.disbursementDate = `${nowDate} ${nowTime}`;
      }
    }

    if (item.type === "Borderô" && this.data.bordero) {
      this.data.bordero.status = "Fechado & Liquidado";
      this.data.bordero.closureDate = `${nowDate} (Homologado & Liquidado)`;
      if (event) event.status = "Encerrado & Conciliado";
    }

    // Registra débito oficial no Ledger em partidas dobradas (pendente de conciliação bancária externa)
    const ledgerId = `LEDG-${Math.floor(10000 + Math.random() * 90000)}`;
    const eventTypeLedger = item.type === "Antecipação" ? "ANTECIPACAO_RECEBIVEIS_PAGA" : (item.type === "Borderô" ? "FECHAMENTO_BORDERO_LIQUIDADO" : "REPASSE_LIQUIDADO_PAGO");

    this.data.ledgerEntries.unshift({
      id: ledgerId,
      timestamp: `${nowDate} ${nowTime}`,
      eventType: eventTypeLedger,
      producerId: item.producerId,
      eventId: event ? event.id : null,
      debitAccount: `Passivo: Saldo Produtor ${item.producerName}`,
      creditAccount: `Ativo: Conta Corrente Banco do Brasil (001) Disk`,
      amount: finalAmount,
      netProducer: finalAmount,
      feeDisk: item.discountFee || 0.00,
      refOrder: item.id,
      conciliated: false,
      reconciliationStatus: 'Pendente de conciliação bancária externa'
    });

    item.auditTrail.push(
      { timestamp: `${nowTime}`, actor: "Tesouraria Disk", action: "Pagamento liquidado via PIX/TED", details: `Autenticação: ${item.authCode}` },
      { timestamp: `${nowTime}`, actor: "Motor Contábil", action: `Ledger atualizado (${ledgerId})`, details: "Partidas dobradas registradas" },
      { timestamp: `${nowTime}`, actor: "Conciliação Bancária", action: "Pendente de retorno bancário/extrato", details: "Aguardando confirmação do banco/gateway" }
    );

    this.recordOperationEvent(
      item,
      'Pagamento liquidado',
      `Autenticação: ${item.authCode} | Ledger: ${ledgerId} | Valor: R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Conciliação externa pendente)`,
      'Tesouraria / Conciliação'
    );

    this.showToast(
      "💰 Transferência Executada & Conciliada",
      `${item.id}: R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} creditado na conta de ${item.producerName}.`,
      "success"
    );

    this.notify();
  }

  // Solicitação de Antecipação de Recebíveis com Deságio Contratual e Reserva de Recebíveis
  requestAnticipation({ eventId, grossAmount, amount, notes }) {
    const producer = this.getState().activeProducer;
    const event = this.data.events.find(e => e.id === eventId) || this.data.events.find(e => e.producerId === producer.id) || this.data.events[0];
    const numericAmount = parseFloat(grossAmount || amount || 0);
    const monthlyRate = producer.contract?.anticipationRateMonthly || this.data.anticipations?.monthlyRate || 2.0;
    const discountFee = numericAmount * (monthlyRate / 100);
    const netAmount = numericAmount - discountFee;
    const bank = producer.bankAccounts[0] || { bankName: "Itaú Unibanco (341)", agency: "0432", accountNumber: "48291-0", pixKey: "14.829.301/0001-92" };

    const antId = `ANT-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('pt-BR');

    const newApprovalItem = {
      id: antId,
      protocol: antId,
      workflowId: `WF-${antId}`,
      type: "Antecipação",
      producerId: producer.id,
      producerName: producer.name,
      eventId: event.id,
      eventName: event.name,
      requestedAmount: numericAmount,
      ratePercent: monthlyRate,
      discountFee: discountFee,
      netAmount: netAmount,
      requestDate: `${nowDate} ${nowTime}`,
      status: "Aguardando análise",
      stepIndex: 1,
      documentId: `CONTR-ANT-${Math.floor(1000 + Math.random() * 9000)}`,
      documentTitle: "Contrato de Cessão & Antecipação de Recebíveis de Cartão",
      bankName: bank.bankName,
      bankAccount: `${bank.agency} • ${bank.accountNumber}`,
      pixKey: bank.pixKey,
      checklist: {
        balanceSufficient: numericAmount <= (event.futureReceivables || 245000),
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: !producer.hasBlock,
        limitPermitted: true,
        chargebackWarning: event.chargebackCases > 0 ? `${event.chargebackCases} chargeback(s) monitorados` : 'Sem pendências'
      },
      auditPosition: {
        grossSales: event.grossSales,
        netRevenue: event.netRevenue,
        availableBefore: event.futureReceivables,
        requested: numericAmount,
        availableAfter: Math.max(0, event.futureReceivables - numericAmount)
      },
      signatures: {
        producer: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null },
        disk: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null, lockedUntilProducerSigns: true }
      },
      reservation: { type: "RECEBIVEL_FUTURO", amount: numericAmount, status: "Reservado" },
      auditTrail: [
        { timestamp: `${nowTime}`, actor: `${this.state.currentUser.name} (Produtor)`, action: "Simulou e solicitou antecipação de recebíveis", details: `Bruto: R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Taxa (${monthlyRate}%): -R$ ${discountFee.toFixed(2)} | Líquido: R$ ${netAmount.toFixed(2)}` },
        { timestamp: `${nowTime}`, actor: `${this.state.currentUser.name} (Produtor)`, action: "Enviou para a mesa de crédito do Financeiro Disk", details: "Status: Aguardando análise (Recebíveis Reservados)" },
        { timestamp: `${nowTime}`, actor: "Mesa de Operações Disk", action: "Notificada para análise de risco e margem", details: "Entrou na Central de Aprovações" }
      ],
      rejection: null,
      notes: notes || "Solicitação voluntária de adiantamento de vendas parceladas no cartão de crédito."
    };

    this.data.approvalQueue.unshift(newApprovalItem);

    if (this.data.anticipations && this.data.anticipations.history) {
      this.data.anticipations.history.unshift({
        id: antId,
        requestDate: nowDate,
        disbursementDate: "Em análise",
        eventName: event.name,
        requestedAmount: numericAmount,
        discountFee: discountFee,
        netDisbursed: netAmount,
        status: "Aguardando análise"
      });
    }

    // Reserva operacional dos recebíveis futuros
    event.futureReceivables = Math.max(0, event.futureReceivables - numericAmount);
    event.reservedReceivables = (event.reservedReceivables || 0) + numericAmount;
    producer.totals.futureReceivables = Math.max(0, producer.totals.futureReceivables - numericAmount);
    producer.totals.reservedReceivables = (producer.totals.reservedReceivables || 0) + numericAmount;
    if (this.data.anticipations.eligibleAmount) {
      this.data.anticipations.eligibleAmount = Math.max(0, this.data.anticipations.eligibleAmount - numericAmount);
    }

    this.showToast(
      "⚡ Solicitação de Antecipação Enviada",
      `${producer.name} · ${event.name} — R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Líquido: R$ ${netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) encaminhado para aprovação da Disk (Recebíveis Reservados).`,
      "warning"
    );

    this.recordOperationEvent(newApprovalItem, 'Antecipação solicitada', `Bruto R$ ${numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com reserva de recebíveis futuros`, 'Antecipações');
    this.notify();
    return newApprovalItem;
  }

  // Formalização e Envio do Borderô Oficial de Fechamento para Homologação
  submitBorderoClosure({ eventId, notes }) {
    const producer = this.getState().activeProducer;
    const event = this.data.events.find(e => e.id === eventId) || this.data.events[0];
    const bordero = this.data.bordero;
    const remainingBalance = bordero.summary.remainingBalance || 511318.50;
    const bank = producer.bankAccounts[0] || { bankName: "Itaú Unibanco (341)", agency: "0432", accountNumber: "48291-0", pixKey: "14.829.301/0001-92" };

    const borderoId = `BOR-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('pt-BR');

    const newApprovalItem = {
      id: borderoId,
      protocol: borderoId,
      workflowId: `WF-${borderoId}`,
      type: "Borderô",
      producerId: producer.id,
      producerName: producer.name,
      eventId: event.id,
      eventName: event.name,
      requestedAmount: remainingBalance,
      requestDate: `${nowDate} ${nowTime}`,
      status: "Aguardando análise",
      stepIndex: 1,
      documentId: `DOC-BOR-${Math.floor(1000 + Math.random() * 9000)}`,
      documentTitle: "Termo de Homologação e Fechamento Definitivo de Borderô",
      bankName: bank.bankName,
      bankAccount: `${bank.agency} • ${bank.accountNumber}`,
      pixKey: bank.pixKey,
      checklist: {
        balanceSufficient: true,
        bankDataValidated: true,
        eventRegular: true,
        noActiveBlocks: !producer.hasBlock,
        limitPermitted: true,
        chargebackWarning: "Contas e borderô de ingressos conferidos sem divergência"
      },
      auditPosition: {
        grossSales: bordero.summary.grossRevenue,
        netRevenue: bordero.summary.netEventBalance,
        availableBefore: bordero.summary.remainingBalance,
        requested: remainingBalance,
        availableAfter: 0.00
      },
      signatures: {
        producer: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null },
        disk: { signed: false, signedBy: null, signedAt: null, ip: null, certAuth: null, lockedUntilProducerSigns: true }
      },
      auditTrail: [
        { timestamp: `${nowTime}`, actor: `${this.state.currentUser.name} (Produtor)`, action: "Enviou fechamento oficial do Borderô para homologação", details: `Arrecadação: R$ ${bordero.summary.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saldo a liquidar: R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
        { timestamp: `${nowTime}`, actor: "Sistema Fiscal Disk", action: "Validação cruzada de ingressos emitidos e borderô contábil", details: "Status: Aguardando análise da Auditoria Disk" }
      ],
      rejection: null,
      notes: notes || "Fechamento definitivo e prestação de contas do evento."
    };

    this.data.approvalQueue.unshift(newApprovalItem);
    this.data.bordero.status = "Em Homologação";

    this.showToast(
      "📑 Fechamento de Borderô Enviado",
      `${event.name} — Fechamento definitivo submetido à Auditoria e Financeiro Disk com saldo remanescente de R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      "info"
    );

    this.recordOperationEvent(newApprovalItem, 'Fechamento de borderô submetido', `Arrecadação R$ ${bordero.summary.grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saldo R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Borderôs');
    this.notify();
    return newApprovalItem;
  }

  // Cadastro de Nova Conta Bancária PJ Homologada (Portal do Produtor)
  addBankAccount({ bankName, accountType, agency, accountNumber, pixKey, isDefault }) {
    const producer = this.getState().activeProducer;
    const newAccount = {
      id: `bnk-${Math.floor(1000 + Math.random() * 9000)}`,
      bankName: bankName,
      accountType: accountType || "Conta Corrente PJ",
      agency: agency,
      accountNumber: accountNumber,
      holderName: producer.name,
      cnpj: producer.cnpj,
      pixKey: pixKey,
      isDefault: !!isDefault,
      status: "Validada & Ativa",
      validatedAt: `${new Date().toLocaleDateString('pt-BR')} via CIP/Bacen`
    };

    if (newAccount.isDefault) {
      producer.bankAccounts.forEach(b => b.isDefault = false);
    }

    producer.bankAccounts.push(newAccount);
    this.showToast("Conta Cadastrada", `${bankName} cadastrado com sucesso para recebimento de repasses.`, "success");
    this.notify();
    return newAccount;
  }

  // ==========================================================================
  // CONTAS FINANCEIRAS & BANCÁRIAS — FINANCEIRO DISK (PACOTE 17 / FLUXO COMPLETO)
  // ==========================================================================

  // 1. Financeiro Disk cadastra conta bancária informada pelo produtor (Status inicial: Pendente de validação)
  addDiskProducerBankAccount({
    producerId,
    eventId,
    bindingType,
    holderName,
    cnpj,
    bankName,
    accountType,
    agency,
    accountNumber,
    digit,
    pixKey,
    pixType,
    purpose,
    documentType,
    documentName
  }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode cadastrar contas bancárias de produtores.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    if (!bankName || !agency || !accountNumber || !holderName || !cnpj) {
      throw new Error('Preencha os campos obrigatórios (Produtor, Titular, CPF/CNPJ, Banco, Agência e Conta).');
    }

    const fullAccNumber = digit ? `${accountNumber}-${digit}` : accountNumber;
    const newId = `bnk-${Date.now()}`;
    const event = eventId && eventId !== 'all' ? this.data.events.find(e => e.id === eventId) : null;

    const newAccount = {
      id: newId,
      bankName,
      accountType: accountType || 'Conta Corrente PJ',
      agency,
      accountNumber: fullAccNumber,
      digit: digit || '',
      holderName,
      cnpj,
      pixKey: pixKey || '',
      pixType: pixType || 'CNPJ',
      purpose: purpose || 'Ambos',
      bindingType: bindingType || 'geral',
      eventId: bindingType === 'evento' ? eventId : null,
      eventName: bindingType === 'evento' ? (event?.name || 'Evento específico') : 'Geral (Todos os Eventos)',
      isDefault: false,
      status: 'Pendente de validação',
      createdAt: new Date().toLocaleString('pt-BR'),
      createdBy: this.state.currentUser.name,
      version: 1,
      documents: documentName ? [{
        id: `doc-${Date.now()}`,
        name: documentName,
        type: documentType || 'Comprovante bancário',
        uploadedAt: new Date().toLocaleDateString('pt-BR')
      }] : [{
        id: `doc-${Date.now()}`,
        name: 'comprovante_bancario_anexado.pdf',
        type: 'Comprovante bancário',
        uploadedAt: new Date().toLocaleDateString('pt-BR')
      }]
    };

    if (!producer.bankAccounts) producer.bankAccounts = [];
    producer.bankAccounts.unshift(newAccount);

    this.recordOperationEvent(
      { id: newId, protocol: newId, workflowId: `WF-${newId}`, producerId: producer.id, eventId: newAccount.eventId },
      'Conta bancária cadastrada (Pendente de validação)',
      `${bankName} Ag. ${agency} / Conta ${fullAccNumber} · ${holderName} (${newAccount.eventName})`,
      'Contas Financeiras'
    );

    this.showToast('Conta Cadastrada', `Conta bancária cadastrada para ${producer.name}. Status: Pendente de validação.`, 'warning');
    this.persist();
    this.notify();
    return newAccount;
  }

  // 2. Homologação/Validação formal da conta bancária pela mesa do Financeiro Disk (Bacen / CIP)
  validateProducerBankAccount({ producerId, accountId, approve = true, rejectionReason = '' }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode homologar contas bancárias.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');

    const operator = this.state.currentUser.name;
    const now = new Date().toLocaleString('pt-BR');

    if (approve) {
      account.status = 'Ativa';
      account.validatedAt = `${now} via Bacen/CIP (${operator})`;
      account.validatedBy = operator;

      // Se esta conta substitui uma versão anterior:
      if (account.replacesAccountId) {
        const oldAcc = producer.bankAccounts.find(b => b.id === account.replacesAccountId);
        if (oldAcc) {
          oldAcc.status = 'Inativa (Substituída)';
          oldAcc.replacedAt = now;
          oldAcc.replacedByAccountId = account.id;
        }
      }

      this.recordOperationEvent(
        { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
        'Conta bancária homologada & ativada',
        `${account.bankName} Ag. ${account.agency} · Homologada por ${operator} via Bacen/CIP`,
        'Contas Financeiras'
      );
      this.showToast('Conta Homologada', `Conta bancária do produtor ${producer.name} ativada com sucesso.`, 'success');
    } else {
      if (!rejectionReason?.trim()) {
        throw new Error('Informe o motivo da recusa na validação da conta bancária.');
      }
      account.status = 'Rejeitada';
      account.rejectionReason = rejectionReason;
      account.rejectedAt = now;
      account.rejectedBy = operator;

      this.recordOperationEvent(
        { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
        'Validação de conta bancária recusada',
        `Motivo: ${rejectionReason}`,
        'Contas Financeiras'
      );
      this.showToast('Validação Recusada', `Conta rejeitada: ${rejectionReason}`, 'error');
    }

    this.persist();
    this.notify();
    return account;
  }

  // 3. Alteração Controlada de Conta Bancária Ativa (Preserva histórico e gera nova versão pendente)
  requestBankAccountChange({ producerId, accountId, newBankData }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode solicitar alteração de contas.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const oldAccount = producer.bankAccounts?.find(b => b.id === accountId);
    if (!oldAccount) throw new Error('Conta de origem não encontrada.');

    const newId = `bnk-${Date.now()}`;
    const version = (oldAccount.version || 1) + 1;
    const fullAccNumber = newBankData.digit ? `${newBankData.accountNumber}-${newBankData.digit}` : newBankData.accountNumber;

    const newAccount = {
      id: newId,
      replacesAccountId: oldAccount.id,
      version: version,
      bankName: newBankData.bankName || oldAccount.bankName,
      accountType: newBankData.accountType || oldAccount.accountType,
      agency: newBankData.agency || oldAccount.agency,
      accountNumber: fullAccNumber || oldAccount.accountNumber,
      digit: newBankData.digit || '',
      holderName: newBankData.holderName || oldAccount.holderName,
      cnpj: newBankData.cnpj || oldAccount.cnpj,
      pixKey: newBankData.pixKey || '',
      pixType: newBankData.pixType || 'CNPJ',
      purpose: newBankData.purpose || oldAccount.purpose || 'Repasse',
      bindingType: newBankData.bindingType || oldAccount.bindingType || 'geral',
      eventId: newBankData.eventId !== undefined ? newBankData.eventId : oldAccount.eventId,
      eventName: newBankData.eventName || oldAccount.eventName || 'Geral',
      isDefault: false,
      status: 'Pendente de validação',
      createdAt: new Date().toLocaleString('pt-BR'),
      createdBy: this.state.currentUser.name,
      documents: newBankData.documentName ? [{
        id: `doc-${Date.now()}`,
        name: newBankData.documentName,
        type: newBankData.documentType || 'Comprovante bancário',
        uploadedAt: new Date().toLocaleDateString('pt-BR')
      }] : [{
        id: `doc-${Date.now()}`,
        name: 'novo_comprovante_bancario.pdf',
        type: 'Comprovante bancário',
        uploadedAt: new Date().toLocaleDateString('pt-BR')
      }]
    };

    producer.bankAccounts.unshift(newAccount);

    this.recordOperationEvent(
      { id: newId, protocol: newId, workflowId: `WF-${newId}`, producerId: producer.id, eventId: newAccount.eventId },
      `Alteração de conta bancária solicitada (v${version})`,
      `Substituição da conta ${oldAccount.bankName} Ag. ${oldAccount.agency}. Nova versão pendente de validação.`,
      'Contas Financeiras'
    );

    this.showToast('Alteração Solicitada', `Nova versão da conta gerada (v${version}). Aguardando validação para ativação.`, 'info');
    this.persist();
    this.notify();
    return newAccount;
  }

  // 4. Definir Conta Bancária Principal de Repasse do Produtor
  setProducerDefaultBankAccount(producerId, accountId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode definir a conta principal de repasse.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');
    if (!['Ativa', 'Validada & Ativa'].includes(account.status)) {
      throw new Error('Apenas contas bancárias ativas e homologadas podem ser definidas como principal.');
    }

    producer.bankAccounts.forEach(b => {
      b.isDefault = (b.id === accountId);
    });

    this.recordOperationEvent(
      { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
      'Conta bancária definida como principal de repasse',
      `${account.bankName} Ag. ${account.agency} / C. ${account.accountNumber} · Produtor ${producer.name}`,
      'Contas Financeiras'
    );
    this.showToast('Conta Principal Definida', `${account.bankName} é agora a conta padrão de repasses para ${producer.name}.`, 'success');
    this.persist();
    this.notify();
    return account;
  }

  // 5. Inativar / Reativar Conta Bancária (Bloqueia novos pagamentos sem apagar histórico)
  toggleProducerBankAccountStatus(producerId, accountId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode alterar a situação de contas bancárias.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');

    const operator = this.state.currentUser.name;
    const now = new Date().toLocaleString('pt-BR');

    if (['Ativa', 'Validada & Ativa'].includes(account.status)) {
      account.status = 'Inativa';
      account.inactivatedAt = now;
      account.inactivatedBy = operator;
      if (account.isDefault) account.isDefault = false;
      this.recordOperationEvent(
        { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
        'Conta bancária inativada',
        `Conta ${account.bankName} Ag. ${account.agency} inativada para novos pagamentos por ${operator}.`,
        'Contas Financeiras'
      );
      this.showToast('Conta Inativada', `Conta inativada para novos repasses. O histórico operacional permanece preservado.`, 'warning');
    } else {
      account.status = 'Ativa';
      account.reactivatedAt = now;
      account.reactivatedBy = operator;
      this.recordOperationEvent(
        { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
        'Conta bancária reativada',
        `Conta ${account.bankName} Ag. ${account.agency} reativada por ${operator}.`,
        'Contas Financeiras'
      );
      this.showToast('Conta Reativada', `Conta reativada com sucesso e apta para novos repasses.`, 'success');
    }

    this.persist();
    this.notify();
    return account;
  }

  // 6. Exclusão de Conta Bancária com Trava de Auditoria
  deleteProducerBankAccount(producerId, accountId) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode excluir contas bancárias.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');

    // Trava mandatória: se possui histórico ou vinculações financeiras, exclusão é estritamente proibida
    const hasHistory = (account.version && account.version > 1) || account.replacesAccountId;
    const replacesOther = (producer.bankAccounts || []).some(b => b.replacesAccountId === account.id);
    const hasTransfers = (this.data.approvalQueue || []).some(a =>
      a.producerId === producerId && (
        (a.bankAccount && a.bankAccount.includes(account.agency)) ||
        (a.destinationAccount && a.destinationAccount.includes(account.agency)) ||
        ['Liquidado e Transferido', 'Concluído / Pago', 'Documento formalizado'].includes(a.status)
      )
    );

    if (hasHistory || replacesOther || hasTransfers) {
      throw new Error('Esta conta bancária possui histórico operacional e vinculações a repasses. Por governança e auditoria BACEN, ela não pode ser excluída. Utilize a opção "Inativar" para bloqueá-la preservando o rastro de auditoria contábil.');
    }

    producer.bankAccounts = producer.bankAccounts.filter(b => b.id !== accountId);
    this.recordOperationEvent(
      { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
      'Conta bancária excluída (Sem histórico)',
      `Conta ${account.bankName} removida do cadastro de ${producer.name}.`,
      'Contas Financeiras'
    );
    this.showToast('Conta Excluída', `Conta bancária removida com sucesso.`, 'info');
    this.persist();
    this.notify();
    return account;
  }

  // 7. Testar Chave PIX cadastrada (Consulta cadastral no DICT / BACEN via CIP)
  testPixKey(pixKey, pixType = 'CNPJ') {
    if (!pixKey || !pixKey.trim()) {
      throw new Error('Informe a chave PIX para consulta cadastral.');
    }
    const now = new Date().toLocaleString('pt-BR');
    const cleanKey = pixKey.trim();
    return {
      success: true,
      pixKey: cleanKey,
      pixType: pixType,
      participantBacen: 'DIRETÓRIO DICT / BACEN - CIP Homologado',
      statusDict: 'Ativa e Vinculada',
      accountHolder: 'Conferência Cadastral Positiva',
      queriedAt: now,
      message: `Consulta cadastral ao DICT/Bacen realizada com sucesso para a chave ${cleanKey}. Chave ativa e homologada para liquidação instantânea via SPI.`
    };
  }

  // 8. Anexar Documento Comprobatório ao Dossiê da Conta
  attachBankDocument(producerId, accountId, doc) {
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');

    account.documents = account.documents || [];
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: doc.name || 'documento_anexo.pdf',
      type: doc.type || 'Comprovante bancário',
      uploadedAt: new Date().toLocaleDateString('pt-BR'),
      uploadedBy: this.state.currentUser.name
    };
    account.documents.push(newDoc);

    this.recordOperationEvent(
      { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
      'Documento comprobatório anexado à conta',
      `${newDoc.name} (${newDoc.type})`,
      'Contas Financeiras'
    );
    this.showToast('Documento Anexado', `${newDoc.name} anexado ao dossiê da conta bancária.`, 'success');
    this.persist();
    this.notify();
    return newDoc;
  }

  // 9. Alterar Vinculação da Conta (Geral vs Evento Específico)
  updateBankBinding(producerId, accountId, bindingType, eventId = null) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode alterar vinculações de contas.');
    }
    const producer = this.data.producers.find(p => p.id === producerId);
    if (!producer) throw new Error('Produtor não encontrado.');
    const account = producer.bankAccounts?.find(b => b.id === accountId);
    if (!account) throw new Error('Conta bancária não encontrada.');

    const event = eventId && eventId !== 'all' ? this.data.events.find(e => e.id === eventId) : null;
    account.bindingType = bindingType || 'geral';
    account.eventId = bindingType === 'evento' ? eventId : null;
    account.eventName = bindingType === 'evento' ? (event?.name || 'Evento específico') : 'Geral (Todos os Eventos)';

    this.recordOperationEvent(
      { id: account.id, protocol: account.id, workflowId: `WF-${account.id}`, producerId: producer.id, eventId: account.eventId },
      'Vinculação de conta bancária atualizada',
      `${account.bankName} Ag. ${account.agency} vinculada a: ${account.eventName}`,
      'Contas Financeiras'
    );
    this.showToast('Vinculação Atualizada', `Conta vinculada com sucesso a: ${account.eventName}`, 'success');
    this.persist();
    this.notify();
    return account;
  }

  // 6. Transferência Segregada entre Eventos do Produtor (Regra Endurecida)
  transferBetweenEvents(arg1, arg2, arg3, arg4) {
    let fromEventId, toEventId, amount, reason, transferId;
    if (typeof arg1 === 'object' && arg1 !== null) {
      fromEventId = arg1.fromEventId;
      toEventId = arg1.toEventId;
      amount = arg1.amount;
      reason = arg1.reason || '';
      transferId = arg1.transferId || null;
    } else {
      fromEventId = arg1;
      toEventId = arg2;
      amount = arg3;
      transferId = arg4 || null;
      reason = '';
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Informe um valor válido e positivo para a transferência.');
    }
    if (fromEventId === toEventId) {
      throw new Error('O evento de destino deve ser diferente do evento de origem.');
    }
    const fromEvent = this.data.events.find(e => e.id === fromEventId);
    const toEvent = this.data.events.find(e => e.id === toEventId);
    if (!fromEvent || !toEvent) {
      throw new Error('Evento de origem ou destino não localizado.');
    }

    const trfId = transferId || `TRF-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    this.data.eventTransfers = this.data.eventTransfers || [];

    // Idempotência: impede reexecução da mesma transferência
    if (this.data.eventTransfers.some(t => t.id === trfId)) {
      throw new Error(`Transferência ${trfId} já executada anteriormente. Operação duplicada bloqueada.`);
    }

    // Regra rígida e canônica de cálculo:
    // Saldo financeiro              R$ 200.000
    // (-) Retido                     R$ 30.000
    // (-) Reservado para repasses    R$ 50.000
    // (-) Bloqueios                  R$ 10.000
    // ────────────────────────────────────────
    // Transferível                  R$ 110.000
    const financialBalance = Number(fromEvent.financialBalance ?? fromEvent.availableBalance ?? fromEvent.totalBalance ?? 0);
    const { reserved, retained, blocked } = this.getEventRestrictions(fromEvent);
    const transferable = this.getTransferableAmount(fromEvent);

    if (numAmount > transferable) {
      const br = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      throw new Error(
        `Saldo insuficiente para transferência no evento ${fromEvent.name}.\n` +
        `Saldo financeiro: ${br(financialBalance)} | (-) Retido: ${br(retained)} | (-) Reservado: ${br(reserved)} | (-) Bloqueios: ${br(blocked)}.\n` +
        `Valor máximo transferível permitido: ${br(transferable)}.`
      );
    }

    const now = new Date();
    const nowStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const operator = this.state.currentUser.name;

    // Atualização dos saldos dos eventos
    fromEvent.availableBalance = Math.max(0, (fromEvent.availableBalance || 0) - numAmount);
    fromEvent.totalBalance = Math.max(0, (fromEvent.totalBalance || 0) - numAmount);
    if (fromEvent.financialBalance !== undefined) {
      fromEvent.financialBalance = Math.max(0, fromEvent.financialBalance - numAmount);
    }
    toEvent.availableBalance = (toEvent.availableBalance || 0) + numAmount;
    toEvent.totalBalance = (toEvent.totalBalance || 0) + numAmount;
    if (toEvent.financialBalance !== undefined) {
      toEvent.financialBalance += numAmount;
    }

    // Partida Dobrada Balanceada no Ledger (uma única operação balanceada com débito no destino e crédito na origem)
    this.data.ledgerEntries = this.data.ledgerEntries || [];
    this.data.ledgerEntries.unshift({
      id: `LEDG-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: nowStr,
      eventType: 'TRANSFERENCIA_EVENTOS',
      producerId: fromEvent.producerId,
      eventId: fromEvent.id,
      protocol: trfId,
      debitAccount: `Subconta Evento Destino: ${toEvent.name} [${toEvent.id}]`,
      creditAccount: `Subconta Evento Origem: ${fromEvent.name} [${fromEvent.id}]`,
      amount: numAmount,
      description: `Transferência entre eventos [${trfId}]: Débito ${toEvent.name} / Crédito ${fromEvent.name} (R$ ${numAmount.toFixed(2)})`,
      refOrder: trfId,
      conciliated: false,
      reconciliationStatus: 'Pendente de conciliação bancária'
    });

    // Registra no extrato segregado
    this.data.statementEntries = this.data.statementEntries || [];
    this.data.statementEntries.unshift({
      id: `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
      date: now.toLocaleDateString('pt-BR'),
      description: `Transferência enviada para ${toEvent.name} [${trfId}]`,
      type: 'Débito',
      amount: -numAmount,
      eventId: fromEvent.id,
      eventName: fromEvent.name,
      protocol: trfId
    });
    this.data.statementEntries.unshift({
      id: `EXT-${Math.floor(10000 + Math.random() * 90000)}`,
      date: now.toLocaleDateString('pt-BR'),
      description: `Transferência recebida de ${fromEvent.name} [${trfId}]`,
      type: 'Crédito',
      amount: numAmount,
      eventId: toEvent.id,
      eventName: toEvent.name,
      protocol: trfId
    });

    this.data.eventTransfers = this.data.eventTransfers || [];
    const transferRecord = {
      id: trfId,
      fromEventId: fromEvent.id,
      fromEventName: fromEvent.name,
      toEventId: toEvent.id,
      toEventName: toEvent.name,
      amount: numAmount,
      reason: reason || 'Remanejamento de saldo entre produções',
      timestamp: nowStr,
      createdBy: operator,
      status: 'Concluída'
    };
    this.data.eventTransfers.unshift(transferRecord);

    this.recordOperationEvent(
      { id: trfId, protocol: trfId, workflowId: `WF-${trfId}`, producerId: fromEvent.producerId, eventId: fromEvent.id },
      'Transferência entre eventos concluída',
      `${trfId}: R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} movimentado de ${fromEvent.name} para ${toEvent.name}.`,
      'Saldos'
    );

    this.showToast(
      'Transferência Concluída',
      `${trfId}: R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} transferido com partidas dobradas no Ledger.`,
      'success'
    );

    this.persist();
    this.notify();
    return transferRecord;
  }

  // 7. Composição do Saldo Oficial do Produtor ("De onde veio meu saldo?") — 100% conciliada com os eventos e cards
  getProducerBalanceComposition(producerId = 'prod-abc', eventId = 'all') {
    const isAll = !eventId || eventId === 'all';
    const totalRetained = this.calculateRetentions(isAll ? 'all' : eventId, producerId);
    const prodEvents = (this.data.events || []).filter(e => producerId === 'all' || e.producerId === producerId);

    if (isAll) {
      const gross = prodEvents.reduce((s, e) => s + Number(e.grossSales || 0), 0);
      const refunds = prodEvents.reduce((s, e) => s + Number(e.cancellations || 0), 0);
      const cb = prodEvents.reduce((s, e) => s + Number(e.chargebacks || 0), 0);
      const fees = prodEvents.reduce((s, e) => s + Number(e.diskFees || 0), 0);
      const net = gross - refunds - cb - fees;
      const payouts = prodEvents.reduce((s, e) => s + Number(e.payoutsDone || 0), 0);
      const reservedOnly = prodEvents.reduce((s, e) => s + Number(e.reservedBalance || 0), 0);
      const blockedOnly = prodEvents.reduce((s, e) => s + Number(e.blockedBalance || 0), 0);
      const reserved = reservedOnly + blockedOnly;
      const retentions = totalRetained;
      const available = Math.max(0, net - payouts - reserved - retentions);
      const futureReceivables = prodEvents.reduce((s, e) => s + Number(e.futureReceivables || 0), 0);
      return {
        scopeLabel: `Todos os Eventos (${prodEvents.length} produções consolidadas)`,
        referenceDate: '04/11/2026 11:00 BRT',
        grossSales: gross,
        refunds: refunds,
        chargebacks: cb,
        diskFees: fees,
        netRevenue: net,
        payoutsDone: payouts,
        reservedOnly,
        blockedOnly,
        reservedBalance: reserved,
        retentionsBalance: retentions,
        availableBalance: available,
        futureReceivables
      };
    }

    const evt = (this.data.events || []).find(e => e.id === eventId);
    if (!evt) return this.getProducerBalanceComposition(producerId, 'all');

    const gross = Number(evt.grossSales || 0);
    const refunds = Number(evt.cancellations || 0);
    const cb = Number(evt.chargebacks || 0);
    const fees = Number(evt.diskFees || 0);
    const net = gross - refunds - cb - fees;
    const payouts = Number(evt.payoutsDone || 0);
    const reservedOnly = Number(evt.reservedBalance || 0);
    const blockedOnly = Number(evt.blockedBalance || 0);
    const reserved = reservedOnly + blockedOnly;
    const retentions = totalRetained;
    const available = Math.max(0, net - payouts - reserved - retentions);
    const futureReceivables = Number(evt.futureReceivables || 0);

    return {
      scopeLabel: evt.name,
      referenceDate: '04/11/2026 11:00 BRT',
      grossSales: gross,
      refunds: refunds,
      chargebacks: cb,
      diskFees: fees,
      netRevenue: net,
      payoutsDone: payouts,
      reservedOnly,
      blockedOnly,
      reservedBalance: reserved,
      retentionsBalance: retentions,
      availableBalance: available,
      futureReceivables
    };
  }

  // Única Fonte de Verdade para cálculo de retenções (evita divergência entre views)
  calculateRetentions(eventId = 'all', producerId = 'prod-abc') {
    const list = (this.data.retentions || []).filter(r => 
      (producerId === 'all' || r.producerId === producerId) &&
      (eventId === 'all' || r.eventId === eventId) &&
      r.status !== 'Liberada' && r.status !== 'Cancelada'
    );
    return list.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  // 8. Consulta de Retenções Detalhadas
  getProducerRetentions(producerId = 'prod-abc', eventId = 'all') {
    const retentions = this.data.retentions || [];
    return retentions.filter(r => (producerId === 'all' || r.producerId === producerId) && (eventId === 'all' || r.eventId === eventId));
  }

  // ==========================================================================
  // SIMULAÇÕES DO MODO DEMONSTRAÇÃO
  // ==========================================================================
  simulateCardSale(amount = 1000.00) {
    const event = this.data.events.find(e => e.id === "evt-001");
    const producer = this.data.producers.find(p => p.id === "prod-abc");
    const gateway = this.data.gateways[0];

    const mdrPercent = parseFloat(gateway.mdrCredit.replace('%', ''));
    const mdrAmount = amount * (mdrPercent / 100);
    const diskFeePercent = producer.contract.diskFeePercent;
    const diskFeeAmount = amount * (diskFeePercent / 100);
    const netToProducer = amount - diskFeeAmount;

    event.grossSales += amount;
    event.diskFees += diskFeeAmount;
    event.netRevenue += netToProducer;
    event.soldTickets += Math.round(amount / 120);
    event.futureReceivables += netToProducer;
    event.totalBalance += netToProducer;

    producer.totals.grossSales += amount;
    producer.totals.netSales += netToProducer;
    producer.totals.futureReceivables += netToProducer;
    producer.totals.totalBalance += netToProducer;

    const orderId = `PED-${Math.floor(10000 + Math.random() * 90000)}`;
    this.data.ledgerEntries.unshift({
      id: `LEDG-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      eventType: "VENDA_CARTAO_CREDITO",
      producerId: producer.id,
      eventId: event.id,
      debitAccount: `Ativo: Recebível Adquirente ${gateway.name} (MDR -R$ ${mdrAmount.toFixed(2)})`,
      creditAccount: `Passivo: Recebível Futuro ${producer.name} (+R$ ${netToProducer.toFixed(2)})`,
      creditAccount2: `Receita: Taxa Disk Retida (+R$ ${diskFeeAmount.toFixed(2)})`,
      amount: amount,
      netProducer: netToProducer,
      feeDisk: diskFeeAmount,
      refOrder: orderId,
      conciliated: true
    });

    this.showToast(
      "💳 Venda no Cartão Processada!",
      `Pedido ${orderId}: R$ ${amount.toFixed(2)} → Cielo MDR (-R$ ${mdrAmount.toFixed(2)}) → Taxa Disk (-R$ ${diskFeeAmount.toFixed(2)}) → Saldo Produtor (+R$ ${netToProducer.toFixed(2)})`,
      "success"
    );

    this.notify();
  }

  simulatePixSale(amount = 350.00) {
    const event = this.data.events.find(e => e.id === "evt-001");
    const producer = this.data.producers.find(p => p.id === "prod-abc");
    const diskFee = amount * 0.10;
    const netProducer = amount - diskFee;

    event.grossSales += amount;
    event.diskFees += diskFee;
    event.netRevenue += netProducer;
    event.availableBalance += netProducer;
    event.totalBalance += netProducer;
    event.soldTickets += 2;

    producer.totals.grossSales += amount;
    producer.totals.availableBalance += netProducer;
    producer.totals.totalBalance += netProducer;

    const orderId = `PED-${Math.floor(10000 + Math.random() * 90000)}`;
    this.showToast(
      "⚡ Venda PIX Compensada!",
      `Pedido ${orderId} (R$ ${amount.toFixed(2)}): Liberado no Saldo Disponível de ${producer.name} (+R$ ${netProducer.toFixed(2)})`,
      "success"
    );

    this.notify();
  }

  simulateChargeback(amount = 450.00) {
    const event = this.data.events.find(e => e.id === "evt-001");
    const producer = this.data.producers.find(p => p.id === "prod-abc");

    event.chargebacks += amount;
    event.chargebackCases += 1;
    event.blockedBalance += amount;
    event.availableBalance = Math.max(0, event.availableBalance - amount);

    producer.totals.blockedBalance += amount;
    producer.totals.availableBalance = Math.max(0, producer.totals.availableBalance - amount);

    this.showToast(
      "⚠️ Chargeback Registrado!",
      `Contestação na Cielo: R$ ${amount.toFixed(2)} retido cautelarmente do saldo de ${producer.name}.`,
      "danger"
    );

    this.notify();
  }

  // ==========================================================================
  // OPERAÇÕES DO PACOTE 14 (SPREAD, SPLIT, CONTAS A PAGAR, ESTORNOS)
  // ==========================================================================
  saveSpreadRule(payload, id = null) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode alterar regras de taxas.');
    }
    const chargedRate = Number(payload.chargedRate);
    const mdr = Number(payload.mdr);
    const fixedFee = Number(payload.fixedFee || 0);
    const additionalCost = Number(payload.additionalCost || 0);
    const commercialRevenueFixed = Number(payload.commercialRevenueFixed || 0);
    if (!payload.name?.trim() || !payload.acquirer?.trim()) {
      throw new Error('Informe regra e adquirente.');
    }
    if (chargedRate < 0 || mdr < 0 || chargedRate < mdr) {
      throw new Error('A taxa cobrada deve ser maior ou igual ao MDR pago pela Disk.');
    }
    if (!payload.paymentMethod) payload.paymentMethod = 'Cartão de Crédito';
    if (!payload.scopeType) payload.scopeType = 'Geral Disk';
    if (!payload.scopeId) payload.scopeId = 'all';

    const now = new Date().toLocaleString('pt-BR');
    let row = id ? this.data.spreadRules.find(x => x.id === id) : null;
    if (row) {
      row.history = row.history || [];
      row.history.unshift({
        version: row.version || 1,
        snapshot: { ...row, history: undefined },
        changedAt: now,
        changedBy: this.state.currentUser.name
      });
      Object.assign(row, payload, {
        chargedRate,
        mdr,
        fixedFee,
        additionalCost,
        commercialRevenueFixed,
        version: (row.version || 1) + 1,
        updatedAt: now
      });
    } else {
      row = {
        id: `SPR-${Date.now()}`,
        ...payload,
        chargedRate,
        mdr,
        fixedFee,
        additionalCost,
        commercialRevenueFixed,
        ruleType: payload.ruleType || 'Híbrida',
        status: 'Ativa',
        version: 1,
        history: [],
        createdAt: now,
        updatedAt: now
      };
      this.data.spreadRules.unshift(row);
    }
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      id ? `Nova versão de taxa publicada (v${row.version})` : 'Regra de taxa criada',
      `${row.name} · ${row.acquirer} · ${row.scopeType} · Spread +${(chargedRate - mdr).toFixed(2)}%`,
      'Taxas e Regras Comerciais'
    );
    this.persist();
    this.notify();
    return row;
  }

  setSpreadRuleStatus(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = this.data.spreadRules.find(x => x.id === id);
    if (!row) throw new Error('Regra não encontrada.');
    row.status = row.status === 'Ativa' ? 'Inativa' : 'Ativa';
    row.updatedAt = new Date().toLocaleString('pt-BR');
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      `Regra de taxa ${row.status.toLowerCase()}`,
      `${row.name} (${row.acquirer})`,
      'Taxas e Regras Comerciais'
    );
    this.persist();
    this.notify();
    return row;
  }

  deleteSpreadRule(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = this.data.spreadRules.find(x => x.id === id);
    if (!row) throw new Error('Regra não encontrada.');
    if ((row.version || 1) > 1 || (row.history || []).length > 0) {
      throw new Error('Esta regra possui versões/histórico e não pode ser excluída. Inative-a para preservar a auditoria contábil e contratual.');
    }
    this.data.spreadRules = this.data.spreadRules.filter(x => x.id !== id);
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      'Regra de taxa excluída',
      `${row.name} (${row.id})`,
      'Taxas e Regras Comerciais'
    );
    this.persist();
    this.notify();
    return row;
  }

  // Resolução de Taxas Comerciais segundo a Hierarquia: Evento → Produtor → Geral Disk
  resolveCommercialFeeRule({ eventId = null, producerId = null, paymentMethod = 'Cartão de Crédito', installments = '1x' }) {
    const rules = (this.data.spreadRules || []).filter(r => r.status === 'Ativa');
    
    // 1. Prioridade Máxima: Regra específica do Evento
    if (eventId) {
      const eventRule = rules.find(r => r.scopeType === 'Evento' && r.scopeId === eventId && (r.paymentMethod === paymentMethod || !r.paymentMethod));
      if (eventRule) return { rule: eventRule, resolvedScope: 'Evento', priority: 1 };
    }

    // 2. Prioridade Secundária: Regra negociada do Produtor
    if (producerId) {
      const prodRule = rules.find(r => r.scopeType === 'Produtor' && r.scopeId === producerId && (r.paymentMethod === paymentMethod || !r.paymentMethod));
      if (prodRule) return { rule: prodRule, resolvedScope: 'Produtor', priority: 2 };
    }

    // 3. Regra Padrão Geral Disk
    const generalRule = rules.find(r => (!r.scopeType || r.scopeType === 'Geral Disk') && (r.paymentMethod === paymentMethod || !r.paymentMethod));
    if (generalRule) return { rule: generalRule, resolvedScope: 'Geral Disk', priority: 3 };

    return { rule: rules[0] || null, resolvedScope: 'Padrão Geral', priority: 4 };
  }

  // ==========================================================================
  // OPERAÇÕES DO PACOTE 18 (CENTRAL OPERACIONAL DE GATEWAYS E ADQUIRENTES)
  // ==========================================================================
  saveGatewayConfig(payload, id = null) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    if (!payload.name?.trim()) {
      throw new Error('Informe o nome do gateway/adquirente.');
    }
    const now = new Date().toLocaleString('pt-BR');
    let row = id ? this.data.gatewayConfigs.find(x => x.id === id) : null;
    if (row) {
      Object.assign(row, payload, { updatedAt: now });
    } else {
      row = {
        id: `gw-${Date.now()}`,
        providerType: 'Gateway / Adquirente',
        environment: payload.environment || 'Sandbox',
        enabled: payload.enabled !== undefined ? payload.enabled : true,
        connectionStatus: 'Não configurado',
        cards: ['Visa', 'Mastercard', 'Elo'],
        pix: { enabled: true, keyType: 'CNPJ', term: 'D+0', immediateSplit: true },
        boleto: { enabled: true, bank: 'Banco do Brasil', wallet: '17', dueDays: 3, finePercent: 2.0, dailyInterestPercent: 0.033 },
        installments: { max: 12, interestFrom: 7, minInstallmentAmount: 15.0 },
        antifraud: { enabled: true, provider: 'ClearSale Total', mode: 'Automático' },
        webhooks: { enabled: true, urlConfigured: true },
        logs: [],
        ...payload,
        updatedAt: now
      };
      this.data.gatewayConfigs.unshift(row);
    }
    row.logs = row.logs || [];
    row.logs.unshift({
      at: now,
      action: id ? 'Configuração atualizada' : 'Gateway cadastrado',
      actor: this.state.currentUser.name
    });
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      id ? 'Gateway atualizado' : 'Novo Gateway cadastrado',
      `${row.name} · Ambiente: ${row.environment}`,
      'Gateways e Adquirentes'
    );
    this.persist();
    this.notify();
    return row;
  }

  toggleGateway(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = this.data.gatewayConfigs.find(x => x.id === id);
    if (!row) throw new Error('Gateway não encontrado.');
    row.enabled = !row.enabled;
    row.updatedAt = new Date().toLocaleString('pt-BR');
    row.logs = row.logs || [];
    row.logs.unshift({
      at: row.updatedAt,
      action: row.enabled ? 'Ativado na operação' : 'Inativado',
      actor: this.state.currentUser.name
    });
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      `Gateway ${row.enabled ? 'ativado' : 'inativado'}`,
      `${row.name} (${row.id})`,
      'Gateways e Adquirentes'
    );
    this.persist();
    this.notify();
    return row;
  }

  updateGatewaySection(id, section, data) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = this.data.gatewayConfigs.find(x => x.id === id);
    if (!row) throw new Error('Gateway não encontrado.');
    const now = new Date().toLocaleString('pt-BR');

    if (section === 'cards' && Array.isArray(data)) {
      row.cards = data;
    } else {
      row[section] = { ...(row[section] || {}), ...data };
    }
    row.updatedAt = now;
    row.logs = row.logs || [];
    row.logs.unshift({
      at: now,
      action: `Seção ${section.toUpperCase()} atualizada`,
      actor: this.state.currentUser.name
    });
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      `Configuração de ${section} alterada`,
      `${row.name} (${row.id})`,
      'Gateways e Adquirentes'
    );
    this.persist();
    this.notify();
    return row;
  }

  testGatewayConnection(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = this.data.gatewayConfigs.find(x => x.id === id);
    if (!row) throw new Error('Gateway não encontrado.');
    const now = new Date().toLocaleString('pt-BR');
    const ready = !!row.secretConfigured && !!row.clientId && !!row.merchantId;

    // Regra mandatória: sem falso positivo. Enquanto não houver backend homologado, informa a dependência de integração.
    row.connectionStatus = ready
      ? 'Credenciais cadastradas - teste real depende do backend'
      : 'Não configurado (Credenciais incompletas)';
    row.lastTestAt = now;

    row.logs = row.logs || [];
    row.logs.unshift({
      at: now,
      action: 'Teste de conexão solicitado',
      actor: this.state.currentUser.name,
      result: row.connectionStatus
    });
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      'Teste de conexão de gateway',
      `${row.name}: ${row.connectionStatus}`,
      'Gateways e Adquirentes'
    );
    this.persist();
    this.notify();
    return { row, ready };
  }

  saveSplitRule({ eventId, name, beneficiaries }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode publicar regras de divisão.');
    }
    const total = beneficiaries.reduce((a, b) => a + Number(b.percent || 0), 0);
    if (Math.abs(total - 100) > 0.001) {
      throw new Error('A soma dos percentuais deve ser exatamente 100%.');
    }
    const old = this.data.splitRules.find(x => x.eventId === eventId && x.status === 'Ativa');
    if (old) old.status = 'Substituída';
    const row = {
      id: `SPL-${Date.now()}`,
      eventId,
      name: name || 'Regra de divisão',
      beneficiaries,
      status: 'Ativa',
      updatedAt: new Date().toLocaleString('pt-BR')
    };
    this.data.splitRules.unshift(row);
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      'Regra de split publicada',
      `Evento ${eventId} · 100% distribuído`,
      'Divisão de Receitas'
    );
    this.notify();
    return row;
  }

  createPayable({ creditor, dueDate, amount, notes = '' }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode criar lançamentos financeiros.');
    }
    const n = Number(amount);
    if (!creditor?.trim() || !dueDate || !n || n <= 0) {
      throw new Error('Preencha credor, vencimento e valor válido.');
    }
    const row = {
      id: `PAG-${Date.now()}`,
      creditor,
      dueDate,
      amount: n,
      notes,
      status: 'Pendente',
      createdAt: new Date().toLocaleString('pt-BR')
    };
    this.data.payables.unshift(row);
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      'Conta a pagar cadastrada',
      `${creditor} · R$ ${n.toFixed(2)} vencimento em ${dueDate}`,
      'Contas a Pagar / Advanced'
    );
    this.notify();
    return row;
  }

  createRefundRequest({ orderId, customer, eventName, amount, paymentMethod, reason }) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Somente o Financeiro Disk pode registrar estorno administrativo.');
    }
    const n = Number(amount);
    if (!orderId?.trim() || !n || n <= 0 || !reason?.trim()) {
      throw new Error('Informe pedido, valor e motivo.');
    }
    const id = `EST-${Date.now()}`;
    const row = {
      id,
      protocol: id,
      workflowId: `WF-${id}`,
      type: 'Estorno',
      producerId: this.state.selectedProducerId,
      eventId: this.state.selectedEventId === 'all' ? null : this.state.selectedEventId,
      producerName: this.getState().activeProducer?.name || '—',
      eventName: eventName || 'Evento não informado',
      customer: customer || '—',
      requestedAmount: n,
      paymentMethod: paymentMethod || 'Não informado',
      reason,
      status: 'Aguardando análise',
      requestDate: new Date().toLocaleString('pt-BR'),
      signatures: { producer: { signed: false }, disk: { signed: false, lockedUntilProducerSigns: true } },
      auditTrail: [],
      rejection: null
    };
    this.data.refundRequests.unshift(row);
    this.data.approvalQueue.unshift(row);
    this.recordOperationEvent(
      row,
      'Solicitação de estorno criada',
      `${orderId} · R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      'Central de Estornos'
    );
    this.notify();
    return row;
  }

  liquidatePayable(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Liquidação permitida somente ao Financeiro Disk.');
    }
    const row = this.data.payables.find(x => x.id === id);
    if (!row) throw new Error('Título não encontrado.');
    if (row.status === 'Pago') throw new Error('Título já liquidado.');
    row.status = 'Pago';
    row.paidAt = new Date().toLocaleString('pt-BR');
    row.authCode = `PIX-${Date.now()}`;
    this.data.ledgerEntries.unshift({
      id: `LEDG-${Date.now()}`,
      timestamp: row.paidAt,
      eventType: 'CONTA_PAGAR_LIQUIDADA',
      producerId: null,
      eventId: null,
      debitAccount: `Despesa: ${row.creditor}`,
      creditAccount: 'Ativo: Conta Bancária Disk',
      amount: row.amount,
      refOrder: row.id,
      conciliated: false
    });
    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      'Conta a pagar liquidada no caixa',
      `Pago R$ ${row.amount.toFixed(2)} via ${row.authCode}`,
      'Tesouraria / Advanced'
    );
    this.notify();
    return row;
  }

  // ==========================================================================
  // PACOTE 19: CONCILIAÇÃO FINANCEIRA OPERACIONAL & TRATAMENTO DE DIVERGÊNCIAS
  // ==========================================================================
  saveReconciliationResolution(id, payload) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = (this.data.reconciliationItems || []).find(x => x.id === id);
    if (!row) throw new Error('Item de conciliação não encontrado.');
    if (!payload.cause || !payload.owner || !payload.action || !payload.evidence) {
      throw new Error('Informe causa, responsável, ação corretiva e evidência/observação obrigatória.');
    }

    const now = new Date().toLocaleString('pt-BR');
    row.status = 'Resolvida';
    row.resolution = {
      cause: payload.cause,
      owner: payload.owner,
      action: payload.action,
      evidence: payload.evidence,
      resolvedAt: now,
      resolvedBy: this.state.currentUser.name
    };

    this.recordOperationEvent(
      { id: row.id, protocol: row.ref, workflowId: `WF-${row.ref}` },
      'Divergência de conciliação tratada',
      `${row.camada} · Causa: ${payload.cause} · Ação: ${payload.action}. Valores contábeis originais preservados.`,
      'Conciliação Financeira'
    );
    this.persist();
    this.notify();
    return row;
  }

  // ==========================================================================
  // PACOTE 19: TRATAMENTO DE OCORRÊNCIAS CNAB
  // ==========================================================================
  resolveCnabOccurrence(occurrenceId, actionType, note = '', newAccount = null) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const occ = (this.data.cnabOccurrences || []).find(o => o.id === occurrenceId);
    if (!occ) throw new Error('Ocorrência CNAB não encontrada.');

    const now = new Date().toLocaleString('pt-BR');
    occ.status = actionType === 'cancelar' ? 'Cancelada' : actionType === 'reprocessar' ? 'Reprocessada' : 'Tratada';
    occ.resolution = {
      action: actionType,
      note: note || 'Tratada pela mesa de tesouraria',
      newAccount: newAccount || null,
      resolvedAt: now,
      resolvedBy: this.state.currentUser.name
    };

    this.recordOperationEvent(
      { id: occ.id, protocol: occ.paymentRef, workflowId: `WF-${occ.batchId}` },
      `Ocorrência CNAB ${occ.status.toLowerCase()}`,
      `${occ.producer} · Motivo: ${occ.reason} · Ação: ${actionType}`,
      'Tesouraria CNAB'
    );
    this.persist();
    this.notify();
    return occ;
  }

  // ==========================================================================
  // PACOTE 19: GESTÃO DE CONTAS CORPORATIVAS DA TESOURARIA DISK
  // ==========================================================================
  saveTreasuryAccount(payload, id = null) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    if (!payload.bankName?.trim() || !payload.accountNumber?.trim()) {
      throw new Error('Informe o banco e o número da conta corporativa.');
    }

    const now = new Date().toLocaleString('pt-BR');
    let row = id ? (this.data.treasuryAccounts || []).find(a => a.id === id) : null;
    if (row) {
      Object.assign(row, payload, { updatedAt: now });
    } else {
      row = {
        id: `treasury-${Date.now()}`,
        bankName: payload.bankName,
        accountType: payload.accountType || 'Conta Corrente Corporativa PJ',
        agency: payload.agency || '',
        accountNumber: payload.accountNumber,
        balance: Number(payload.balance || 0),
        purpose: payload.purpose || 'Operacional (Pagamentos & Recebimentos)',
        settlementChannel: payload.settlementChannel || 'CNAB / PIX / TED',
        status: 'Ativa',
        isMain: !!payload.isMain,
        updatedAt: now
      };
      this.data.treasuryAccounts.unshift(row);
    }

    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      id ? 'Conta corporativa atualizada' : 'Conta corporativa cadastrada',
      `${row.bankName} · Ag. ${row.agency} · C/C ${row.accountNumber} · ${row.purpose}`,
      'Tesouraria'
    );
    this.persist();
    this.notify();
    return row;
  }

  toggleTreasuryAccountStatus(id) {
    if (!['disk', 'admin'].includes(this.state.currentUser.role)) {
      throw new Error('Ação restrita ao Financeiro Disk.');
    }
    const row = (this.data.treasuryAccounts || []).find(a => a.id === id);
    if (!row) throw new Error('Conta corporativa não encontrada.');

    row.status = row.status === 'Ativa' ? 'Inativa' : 'Ativa';
    row.updatedAt = new Date().toLocaleString('pt-BR');

    this.recordOperationEvent(
      { id: row.id, protocol: row.id, workflowId: `WF-${row.id}` },
      `Conta corporativa ${row.status.toLowerCase()}`,
      `${row.bankName} · C/C ${row.accountNumber}`,
      'Tesouraria'
    );
    this.persist();
    this.notify();
    return row;
  }

  // ==========================================================================
  // CONTA FINANCEIRA DO PRODUTOR (CNPJ), CRÉDITOS, RETENÇÕES & LEDGER INTERNO
  // ==========================================================================

  buildInstallmentSchedule(credit, firstDueDate = null) {
    const start = firstDueDate ? new Date(firstDueDate + 'T12:00:00') : new Date();
    if (!firstDueDate) start.setMonth(start.getMonth() + 1);
    const schedule = [];
    const count = Number(credit.installmentsCount || credit.installments || 1);
    const instVal = Number(credit.installmentValue || (credit.totalDebt / count) || 0);
    for (let i = 1; i <= count; i++) {
      const due = new Date(start);
      due.setMonth(start.getMonth() + (i - 1));
      schedule.push({
        installment: i,
        dueDate: due.toISOString().slice(0, 10),
        scheduledValue: Math.round(instVal * 100) / 100,
        paidValue: 0,
        status: 'PENDENTE',
        paidAt: null
      });
    }
    return schedule;
  }

  applyPaymentToSchedule(credit, value, paidAt = new Date().toISOString()) {
    let remaining = Number(value);
    credit.schedule = credit.schedule || this.buildInstallmentSchedule(credit, credit.firstDueDate);
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

  refreshCreditDelinquency(credit) {
    const today = new Date().toISOString().slice(0, 10);
    for (const item of (credit.schedule || [])) {
      if (item.status !== 'PAGO' && item.dueDate < today) {
        item.status = item.paidValue > 0 ? 'PARCIAL_VENCIDA' : 'VENCIDA';
      }
    }
    if (credit.status === 'ATIVO' && (credit.schedule || []).some(i => ['VENCIDA', 'PARCIAL_VENCIDA'].includes(i.status))) {
      credit.status = 'EM_ATRASO';
    }
    if (credit.outstandingDebt <= 0) {
      credit.status = 'LIQUIDADO';
    }
  }

  getProducerFinancialAccount(producerId = null) {
    const targetProducerId = producerId || this.state.selectedProducerId || 'prod-abc';
    const producer = this.data.producers.find(p => p.id === targetProducerId) || this.data.producers[0];
    const events = (this.data.events || []).filter(e => e.producerId === producer.id);

    const producerCredits = (this.data.producerCredits || []).filter(c => c.producerId === producer.id);
    const activeCredits = producerCredits.filter(c => c.status === 'ATIVO');
    const totalOutstandingCredits = activeCredits.reduce((acc, c) => acc + Number(c.outstandingDebt || 0), 0);

    const eventsCalculated = events.map(ev => {
      const elig = this.calculatePayoutEligibility(ev.id);
      const eventCredits = activeCredits.filter(c => c.eventId === ev.id);
      const eventDebt = eventCredits.reduce((acc, c) => acc + Number(c.outstandingDebt || 0), 0);

      return {
        ...ev,
        eligibility: elig,
        outstandingDebt: eventDebt
      };
    });

    const totalGrossSales = eventsCalculated.reduce((acc, e) => acc + Number(e.grossSales || 0), 0);
    const totalNetRevenue = eventsCalculated.reduce((acc, e) => acc + Number(e.netRevenue || 0), 0);
    const totalPaid = eventsCalculated.reduce((acc, e) => acc + Number(e.payoutsDone || 0), 0);
    const totalBlocked = eventsCalculated.reduce((acc, e) => acc + Number(e.blockedBalance || 0), 0);
    const totalRetained = eventsCalculated.reduce((acc, e) => acc + Number(e.retainedBalance || 0), 0);

    const allObligations = (this.data.eventObligations || []).filter(o => events.some(e => e.id === o.eventId));
    const allRefunds = (this.data.internalRefunds || []).filter(r => events.some(e => e.id === r.eventId));

    const totalObligationsHold = allObligations
      .filter(o => ['RESERVADO', 'RETIDO'].includes(o.status))
      .reduce((s, o) => s + Number(o.value || 0), 0);

    const totalRefundsHold = allRefunds
      .filter(r => ['AGUARDANDO_PRIMEIRA_AUTORIZACAO', 'AGUARDANDO_SEGUNDA_AUTORIZACAO', 'AUTORIZADO_PARA_EFETIVAR'].includes(r.status))
      .reduce((s, r) => s + Number(r.value || 0), 0);

    const totalAvailableForRepasse = eventsCalculated.reduce((acc, e) => {
      return acc + (e.eligibility ? e.eligibility.disponivelFinal : 0);
    }, 0);

    const consolidatedBalance = Math.max(0, totalNetRevenue - totalPaid);
    const futurePending = Math.max(0, consolidatedBalance - totalAvailableForRepasse - totalBlocked - totalRetained);

    for (const c of producerCredits) {
      if (!c.schedule) c.schedule = this.buildInstallmentSchedule(c, c.firstDueDate);
      this.refreshCreditDelinquency(c);
    }

    return {
      producer,
      summary: {
        consolidatedBalance: Math.round(consolidatedBalance * 100) / 100,
        availableForRepasse: Math.round(totalAvailableForRepasse * 100) / 100,
        futurePending: Math.round(futurePending * 100) / 100,
        blocked: Math.round(totalBlocked * 100) / 100,
        retained: Math.round(totalRetained * 100) / 100,
        obligationsReserved: Math.round(totalObligationsHold * 100) / 100,
        pendingRefundsHold: Math.round(totalRefundsHold * 100) / 100,
        outstandingCredits: Math.round(totalOutstandingCredits * 100) / 100,
        totalSold: Math.round(totalGrossSales * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100
      },
      events: eventsCalculated,
      credits: producerCredits,
      obligations: allObligations,
      refunds: allRefunds,
      ledger: (this.data.operationAuditTrail || []).filter(l => l.producerId === producer.id || l.producerName === producer.name)
    };
  }

  grantProducerCredit({ producerId, eventId, principal, interestRate = 2.0, installments = 5, amortizationModel = 'PARCELAS_FIXAS', receivablePercent = 15.0, notes = '', firstDueDate = null, contractRef = '', interestModel = 'JUROS_SIMPLES_MENSAL' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a mesa do Financeiro Disk pode conceder créditos/antecipações.");
      return null;
    }
    const numPrincipal = parseFloat(principal);
    if (!numPrincipal || numPrincipal <= 0) {
      alert("Informe um valor principal válido.");
      return null;
    }
    if (!notes || notes.trim().length < 5) {
      alert("Justificativa formal obrigatória com no mínimo 5 caracteres.");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }
    const targetProducerId = producerId || event.producerId;
    const producer = this.data.producers.find(p => p.id === targetProducerId);

    const numInterest = parseFloat(interestRate) || 0;
    const numInstallments = Math.max(1, parseInt(installments) || 1);
    const totalDebt = numPrincipal * (1 + (numInterest * numInstallments) / 100);
    const installmentValue = totalDebt / numInstallments;

    const creditId = `CR-${Date.now()}`;
    const protocol = contractRef && contractRef.trim().length >= 3
      ? contractRef.trim()
      : `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCredit = {
      id: creditId,
      protocol,
      contractRef: (contractRef || protocol).trim(),
      producerId: producer ? producer.id : targetProducerId,
      producerName: producer ? producer.name : event.producerName,
      eventId: event.id,
      eventName: event.name,
      principal: numPrincipal,
      interestRate: numInterest,
      interestModel,
      firstDueDate,
      installmentsCount: numInstallments,
      installmentValue: Math.round(installmentValue * 100) / 100,
      amortizationModel,
      receivablePercent: parseFloat(receivablePercent) || 0,
      totalDebt: Math.round(totalDebt * 100) / 100,
      outstandingDebt: Math.round(totalDebt * 100) / 100,
      amortizedTotal: 0,
      status: "ATIVO",
      grantedAt: new Date().toISOString(),
      grantedBy: `${this.state.currentUser.name} (Financeiro Disk)`,
      notes: notes.trim(),
      amortizationHistory: []
    };

    newCredit.schedule = this.buildInstallmentSchedule(newCredit, firstDueDate);

    this.data.producerCredits = this.data.producerCredits || [];
    this.data.producerCredits.unshift(newCredit);

    this.recordOperationEvent(
      { id: protocol, protocol, type: 'Crédito ao Produtor', producerName: producer?.name, eventName: event.name },
      'Crédito Concedido',
      `Contrato ${protocol}: R$ ${numPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liberado. Total c/ juros: R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Justificativa: ${notes.trim()}`,
      'Mesa Financeiro Disk'
    );

    this.showToast(
      "💳 Crédito ao Produtor Concedido",
      `Contrato ${protocol} emitido para ${event.name}: ${numPrincipal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      "success"
    );

    this.persist();
    this.notify();
    return newCredit;
  }

  amortizeProducerCredit({ creditId, amount, type = 'PARCELA_FIXA', notes = '' }) {
    const credit = (this.data.producerCredits || []).find(c => c.id === creditId || c.protocol === creditId);
    if (!credit) {
      alert("Contrato de crédito não encontrado.");
      return null;
    }
    if (credit.status !== 'ATIVO' && credit.status !== 'EM_ATRASO') {
      alert("Este contrato de crédito já está liquidado.");
      return null;
    }

    const numAmount = parseFloat(amount || credit.installmentValue || 0);
    if (!numAmount || numAmount <= 0) {
      alert("Informe um valor de amortização válido.");
      return null;
    }

    const amortizedValue = Math.min(numAmount, credit.outstandingDebt);
    credit.outstandingDebt = Math.round((credit.outstandingDebt - amortizedValue) * 100) / 100;
    credit.amortizedTotal = Math.round((credit.amortizedTotal + amortizedValue) * 100) / 100;

    this.applyPaymentToSchedule(credit, amortizedValue);
    this.refreshCreditDelinquency(credit);

    if (credit.outstandingDebt <= 0) {
      credit.status = 'LIQUIDADO';
      credit.liquidatedAt = new Date().toISOString();
    }

    credit.amortizationHistory = credit.amortizationHistory || [];
    credit.amortizationHistory.unshift({
      id: `AM-${Date.now()}`,
      date: new Date().toLocaleString('pt-BR'),
      value: amortizedValue,
      type,
      balanceAfter: credit.outstandingDebt,
      actor: `${this.state.currentUser.name} (${this.state.currentUser.role === 'producer' ? 'Produtor' : 'Financeiro Disk'})`
    });

    this.recordOperationEvent(
      { id: credit.protocol, protocol: credit.protocol, type: 'Amortização de Crédito', eventName: credit.eventName },
      'Amortização Registrada',
      `Abatimento de R$ ${amortizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no contrato ${credit.protocol}. Saldo devedor: R$ ${credit.outstandingDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      'Motor Financeiro'
    );

    this.showToast(
      "✓ Amortização Registrada",
      `Abatido ${amortizedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no contrato ${credit.protocol}.`,
      "success"
    );

    this.persist();
    this.notify();
    return credit;
  }

  blockAccountBalance({ producerId, eventId, amount, type = 'BLOQUEIO', reason, actor = null }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a mesa do Financeiro Disk pode bloquear ou reter saldos.");
      return null;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Informe um valor válido para o bloqueio/retenção.");
      return null;
    }
    if (!reason || reason.trim().length < 5) {
      alert("Justificativa formal obrigatória com no mínimo 5 caracteres.");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    if (numAmount > event.availableBalance) {
      alert(`O valor solicitado (${numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) excede o saldo disponível do evento (${event.availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
      return null;
    }

    if (type === 'RETENCAO') {
      event.retainedBalance = (event.retainedBalance || 0) + numAmount;
    } else {
      event.blockedBalance = (event.blockedBalance || 0) + numAmount;
    }
    event.availableBalance = Math.max(0, event.availableBalance - numAmount);

    const protocol = `BLQ-${Date.now()}`;
    const operator = actor || `${this.state.currentUser.name} (Financeiro Disk)`;

    this.recordOperationEvent(
      { id: protocol, protocol, type: type === 'RETENCAO' ? 'Retenção Administrativa' : 'Bloqueio Cautelar', eventName: event.name },
      `${type === 'RETENCAO' ? 'Retenção' : 'Bloqueio'} Aplicado`,
      `Valor de R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} travado. Justificativa: ${reason.trim()}`,
      operator
    );

    this.showToast(
      `🔒 ${type === 'RETENCAO' ? 'Retenção' : 'Bloqueio'} Registrado`,
      `${numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} travado no evento ${event.name}.`,
      "info"
    );

    this.persist();
    this.notify();
    return event;
  }

  releaseAccountBalance({ producerId, eventId, amount, reason, actor = null }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a mesa do Financeiro Disk pode liberar saldos bloqueados.");
      return null;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Informe um valor válido para a liberação.");
      return null;
    }
    if (!reason || reason.trim().length < 5) {
      alert("Justificativa formal de liberação com no mínimo 5 caracteres é obrigatória.");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    const currentBlocked = (event.blockedBalance || 0) + (event.retainedBalance || 0);
    if (numAmount > currentBlocked) {
      alert(`Valor de liberação excede o total atualmente bloqueado/retido (${currentBlocked.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
      return null;
    }

    let remaining = numAmount;
    if (event.blockedBalance > 0) {
      const deduct = Math.min(event.blockedBalance, remaining);
      event.blockedBalance -= deduct;
      remaining -= deduct;
    }
    if (remaining > 0 && event.retainedBalance > 0) {
      const deduct = Math.min(event.retainedBalance, remaining);
      event.retainedBalance -= deduct;
      remaining -= deduct;
    }

    event.availableBalance = (event.availableBalance || 0) + numAmount;

    const protocol = `LIB-${Date.now()}`;
    const operator = actor || `${this.state.currentUser.name} (Financeiro Disk)`;

    this.recordOperationEvent(
      { id: protocol, protocol, type: 'Liberação de Saldo', eventName: event.name },
      'Saldo Liberado',
      `R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} devolvido ao disponível. Justificativa: ${reason.trim()}`,
      operator
    );

    this.showToast(
      "🔓 Saldo Liberado com Sucesso",
      `${numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} liberado no evento ${event.name}.`,
      "success"
    );

    this.persist();
    this.notify();
    return event;
  }

  // ==========================================================================
  // PACOTE 24 / V0.3: AGENDA DE OBRIGAÇÕES E RESERVAS INTERNAS DO EVENTO
  // ==========================================================================

  createEventObligation({ eventId, category = 'OUTROS', description, beneficiary = '', value, dueDate = '', documentRef = '', status = 'RESERVADO', notes = '', reserveNow = true }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a equipe do Financeiro Disk pode gerenciar a agenda de obrigações e retenções internas.");
      return null;
    }
    const numValue = parseFloat(value);
    if (!numValue || numValue <= 0) {
      alert("Informe um valor válido para a obrigação.");
      return null;
    }
    if (!description || description.trim().length < 3) {
      alert("A descrição da obrigação deve ter no mínimo 3 caracteres.");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    const shouldReserve = reserveNow === true || (reserveNow !== false && status === 'RESERVADO');
    const finalStatus = shouldReserve ? 'RESERVADO' : (status || 'PREVISTO');

    const obId = `OB-${Date.now()}`;
    const newOb = {
      id: obId,
      eventId: event.id,
      eventName: event.name,
      producerId: event.producerId,
      category,
      description: description.trim(),
      beneficiary: beneficiary ? beneficiary.trim() : 'Favorecido não especificado',
      value: numValue,
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      documentRef: documentRef ? documentRef.trim() : '',
      status: finalStatus, // 'PREVISTO', 'RESERVADO', 'RETIDO', 'LIQUIDADO'
      reserveNow: shouldReserve,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      actor: `${this.state.currentUser.name} (Financeiro Disk)`
    };

    this.data.eventObligations = this.data.eventObligations || [];
    this.data.eventObligations.unshift(newOb);

    const protocol = `OBG-${Date.now()}`;
    this.recordOperationEvent(
      { id: protocol, protocol, type: 'Agenda de Obrigações', eventName: event.name },
      'Obrigação Registrada',
      `Obrigação ${newOb.description} no valor de R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vinculada ao credor ${newOb.beneficiary}. Status: ${newOb.status}.`,
      'Financeiro Disk'
    );

    this.showToast(
      "📌 Obrigação Registrada na Agenda",
      `${newOb.description}: ${numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} reservado para ${newOb.beneficiary}.`,
      "info"
    );

    this.persist();
    this.notify();
    return newOb;
  }

  updateEventObligationStatus({ obligationId, status, notes = '' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Acesso restrito ao Financeiro Disk.");
      return null;
    }
    const ob = (this.data.eventObligations || []).find(o => o.id === obligationId);
    if (!ob) {
      alert("Obrigação não localizada.");
      return null;
    }

    const oldStatus = ob.status;
    ob.status = status;
    ob.updatedAt = new Date().toISOString();
    if (notes) ob.notes = `${ob.notes ? ob.notes + ' | ' : ''}${notes.trim()}`;

    if (status === 'LIQUIDADO') {
      ob.liquidatedAt = new Date().toISOString();
      ob.liquidatedBy = `${this.state.currentUser.name} (Financeiro Disk)`;

      // Quando liquidada/paga, abate do saldo financeiro real do evento
      const event = this.data.events.find(e => e.id === ob.eventId);
      if (event) {
        event.availableBalance = Math.max(0, (event.availableBalance || 0) - ob.value);
      }

      this.recordOperationEvent(
        { id: ob.id, protocol: ob.id, type: 'Liquidação de Obrigação', eventName: ob.eventName },
        'Obrigação Paga / Liquidada',
        `Pagamento de R$ ${ob.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liquidado a favor de ${ob.beneficiary}.`,
        'Tesouraria Disk'
      );
    } else {
      this.recordOperationEvent(
        { id: ob.id, protocol: ob.id, type: 'Atualização de Obrigação', eventName: ob.eventName },
        `Status alterado: ${oldStatus} -> ${status}`,
        `Obrigação ${ob.description} (${ob.beneficiary}) agora com status ${status}.`,
        'Financeiro Disk'
      );
    }

    this.showToast(
      "Obrigação Atualizada",
      `${ob.description} transicionada para ${status}.`,
      "success"
    );

    this.persist();
    this.notify();
    return ob;
  }

  // ==========================================================================
  // PACOTE 24 / V0.3: FILA INTERNA DE ESTORNOS COM DUPLA AUTORIZAÇÃO (SoD)
  // ==========================================================================

  openInternalRefund({ eventId, orderId, value, reason }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a equipe do Financeiro Disk pode abrir estornos internos.");
      return null;
    }
    const numValue = parseFloat(value);
    if (!numValue || numValue <= 0) {
      alert("Informe um valor de estorno válido.");
      return null;
    }
    if (!orderId || orderId.trim().length < 2) {
      alert("Identificador do pedido/ingresso obrigatório.");
      return null;
    }
    if (!reason || reason.trim().length < 5) {
      alert("Justificativa formal do estorno obrigatória (mínimo 5 caracteres).");
      return null;
    }

    const event = this.data.events.find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    const refId = `ES-${Date.now()}`;
    const newRefund = {
      id: refId,
      eventId: event.id,
      eventName: event.name,
      producerId: event.producerId,
      orderId: orderId.trim(),
      value: numValue,
      reason: reason.trim(),
      status: 'AGUARDANDO_PRIMEIRA_AUTORIZACAO',
      requestedBy: `${this.state.currentUser.name} (Financeiro Disk)`,
      requestedByUserId: this.state.currentUser.id,
      approvals: [],
      executedBy: null,
      executedAt: null,
      createdAt: new Date().toISOString()
    };

    this.data.internalRefunds = this.data.internalRefunds || [];
    this.data.internalRefunds.unshift(newRefund);

    this.recordOperationEvent(
      { id: refId, protocol: refId, type: 'Reserva de Estorno', eventName: event.name },
      'Estorno Aberto & Saldo Reservado',
      `Pedido ${newRefund.orderId}: R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} reservado preventivamente. Aguardando 1ª autorização. Justificativa: ${reason.trim()}`,
      'Mesa de Estornos Disk'
    );

    this.showToast(
      "↩️ Estorno Solicitado & Saldo Reservado",
      `Pedido ${orderId}: ${numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} retido para aprovação interna.`,
      "info"
    );

    this.persist();
    this.notify();
    return newRefund;
  }

  authorizeInternalRefund({ refundId, factor = 'REAUTENTICACAO_MFA', notes = '' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a equipe do Financeiro Disk pode autorizar estornos.");
      return null;
    }
    const refund = (this.data.internalRefunds || []).find(r => r.id === refundId);
    if (!refund) {
      alert("Registro de estorno não localizado.");
      return null;
    }

    if (['EFETIVADO', 'REJEITADO', 'CANCELADO'].includes(refund.status)) {
      alert("Este estorno já foi finalizado e não aceita novas autorizações.");
      return null;
    }

    // Regra estrita de Segregação de Funções (SoD):
    // Quem concedeu a 1ª autorização NÃO pode conceder a 2ª autorização!
    const currentUserId = this.state.currentUser.id;
    const currentUserName = this.state.currentUser.name;

    const alreadyApproved = (refund.approvals || []).some(
      a => a.userId === currentUserId || (a.userName === currentUserName && currentUserName !== 'Usuário Disk')
    );

    if (alreadyApproved) {
      alert("Segregação de Funções Estrita: O mesmo usuário não pode conceder a 1ª e a 2ª autorização da mesma operação.");
      return null;
    }

    refund.approvals = refund.approvals || [];
    refund.approvals.push({
      approvalIndex: refund.approvals.length + 1,
      userId: currentUserId,
      userName: currentUserName,
      userRole: this.state.currentUser.role === 'admin' ? 'Administrador Disk' : 'Analista Financeiro Disk',
      at: new Date().toISOString(),
      factor: factor || 'REAUTENTICACAO_MFA',
      notes: notes.trim()
    });

    if (refund.approvals.length === 1) {
      refund.status = 'AGUARDANDO_SEGUNDA_AUTORIZACAO';
    } else if (refund.approvals.length >= 2) {
      refund.status = 'AUTORIZADO_PARA_EFETIVAR';
    }

    this.recordOperationEvent(
      { id: refund.id, protocol: refund.id, type: 'Autorização de Estorno', eventName: refund.eventName },
      `${refund.approvals.length}ª Autorização Concedida`,
      `Autorizado por ${currentUserName} com fator ${factor}. Status atual: ${refund.status}.`,
      'Controle Interno Disk'
    );

    this.showToast(
      `✓ ${refund.approvals.length}ª Autorização Confirmada`,
      refund.status === 'AUTORIZADO_PARA_EFETIVAR'
        ? "Dupla autorização concluída! Liberado para efetivação bancária/gateway."
        : "1ª autorização registrada. Aguardando 2ª autorização por outro operador.",
      "success"
    );

    this.persist();
    this.notify();
    return refund;
  }

  executeInternalRefund({ refundId }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a mesa do Financeiro Disk pode efetivar estornos.");
      return null;
    }
    const refund = (this.data.internalRefunds || []).find(r => r.id === refundId);
    if (!refund) {
      alert("Estorno não localizado.");
      return null;
    }

    if (refund.status !== 'AUTORIZADO_PARA_EFETIVAR' || (refund.approvals || []).length < 2) {
      alert("Efetivação bloqueada: O estorno exige 2 autorizações distintas de operadores do Financeiro Disk antes da liquidação financeira.");
      return null;
    }

    refund.status = 'EFETIVADO';
    refund.executedBy = `${this.state.currentUser.name} (Financeiro Disk)`;
    refund.executedAt = new Date().toISOString();

    const event = this.data.events.find(e => e.id === refund.eventId);
    if (event) {
      event.availableBalance = Math.max(0, (event.availableBalance || 0) - refund.value);
      event.grossSales = Math.max(0, (event.grossSales || 0) - refund.value);
    }

    // Registra baixa de reserva e débito definitivo de estorno no Ledger
    this.recordOperationEvent(
      { id: refund.id, protocol: refund.id, type: 'Estorno Efetivado', eventName: refund.eventName },
      'Estorno Liquidado no Gateway & Ledger',
      `Estorno de R$ ${refund.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no pedido ${refund.orderId} efetivado após dupla conferência (${refund.approvals.map(a => a.userName).join(' & ')}).`,
      'Gateway & Ledger Disk'
    );

    this.showToast(
      "✓ Estorno Efetivado com Sucesso",
      `R$ ${refund.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} estornado no gateway e registrado no ledger.`,
      "success"
    );

    this.persist();
    this.notify();
    return refund;
  }

  cancelInternalRefund({ refundId, reason = '' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Acesso restrito ao Financeiro Disk.");
      return null;
    }
    const refund = (this.data.internalRefunds || []).find(r => r.id === refundId);
    if (!refund) {
      alert("Estorno não localizado.");
      return null;
    }
    if (refund.status === 'EFETIVADO') {
      alert("Estorno já efetivado e liquidado no gateway não pode ser cancelado.");
      return null;
    }
    if (!reason || reason.trim().length < 5) {
      alert("Justificativa formal de cancelamento obrigatória (mínimo 5 caracteres).");
      return null;
    }

    refund.status = 'CANCELADO';
    refund.cancelledAt = new Date().toISOString();
    refund.cancelledBy = `${this.state.currentUser.name} (Financeiro Disk)`;
    refund.cancelReason = reason.trim();

    this.recordOperationEvent(
      { id: refund.id, protocol: refund.id, type: 'Cancelamento de Estorno', eventName: refund.eventName },
      'Estorno Cancelado & Reserva Liberada',
      `Reserva de R$ ${refund.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liberada no evento. Motivo do cancelamento: ${reason.trim()}`,
      'Controle Interno Disk'
    );

    this.showToast(
      "Estorno Cancelado",
      `Reserva de ${refund.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} liberada no saldo do evento.`,
      "info"
    );

    this.persist();
    this.notify();
    return refund;
  }

  rejectInternalRefund({ refundId, reason = '' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Acesso restrito ao Financeiro Disk.");
      return null;
    }
    const refund = (this.data.internalRefunds || []).find(r => r.id === refundId);
    if (!refund) {
      alert("Estorno não localizado.");
      return null;
    }
    if (refund.status === 'EFETIVADO') {
      alert("Estorno já efetivado e liquidado no gateway não pode ser rejeitado.");
      return null;
    }

    refund.status = 'REJEITADO';
    refund.rejectedAt = new Date().toISOString();
    refund.rejectedBy = `${this.state.currentUser.name} (Financeiro Disk)`;
    refund.rejectReason = (reason || '').trim();

    this.recordOperationEvent(
      { id: refund.id, protocol: refund.id, type: 'Rejeição de Estorno', eventName: refund.eventName },
      'Estorno Rejeitado & Reserva Liberada',
      `Reserva de R$ ${refund.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liberada no evento após rejeição do estorno ${refund.id}.${refund.rejectReason ? ' Motivo: ' + refund.rejectReason : ''}`,
      'Controle Interno Disk'
    );

    this.showToast(
      "Estorno Rejeitado",
      `Reserva de ${refund.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} liberada no saldo do evento.`,
      "info"
    );

    this.persist();
    this.notify();
    return refund;
  }

  registerEventRevenue({ eventId, amount, reason = 'Receita de bilheteria registrada' }) {
    if (this.state.currentUser.role === 'producer') {
      alert("Apenas a equipe do Financeiro Disk pode registrar receitas operacionais.");
      return null;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Informe um valor de receita válido.");
      return null;
    }
    const event = (this.data.events || []).find(e => e.id === eventId);
    if (!event) {
      alert("Evento não encontrado.");
      return null;
    }

    event.grossSales = Number(((event.grossSales || 0) + numAmount).toFixed(2));
    event.availableBalance = Number(((event.availableBalance || 0) + numAmount).toFixed(2));
    if (event.netRevenue !== undefined) {
      event.netRevenue = Number(((event.netRevenue || 0) + numAmount * 0.9).toFixed(2));
    }

    const protocol = `REC-${Date.now()}`;
    this.recordOperationEvent(
      { id: protocol, protocol, type: 'Receita Registrada', eventName: event.name },
      'Receita de Bilheteria Registrada',
      `Entrada de R$ ${numAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no evento ${event.name}. Motivo: ${reason}`,
      `${this.state.currentUser.name} (Financeiro Disk)`
    );

    // Amortização automática para créditos ativos com PERCENTUAL_RECEBIVEIS
    const amortizations = [];
    const activeCredits = (this.data.producerCredits || []).filter(
      c => c.eventId === event.id && c.status === 'ATIVO' &&
      (c.amortizationModel === 'PERCENTUAL_RECEBIVEIS' || c.amortization === 'PERCENTUAL_RECEBIVEIS') &&
      (c.receivablePercent || 0) > 0
    );

    for (const credit of activeCredits) {
      const debt = Number(credit.outstandingDebt || 0);
      const amortAmount = Math.min(debt, Number((numAmount * (credit.receivablePercent / 100)).toFixed(2)));
      if (amortAmount > 0) {
        const amortizedCredit = this.amortizeProducerCredit({
          creditId: credit.id,
          amount: amortAmount,
          type: 'PERCENTUAL_RECEBIVEIS',
          notes: `Amortização automática sobre receita de bilheteria (${credit.receivablePercent}%)`
        });
        amortizations.push(amortizedCredit);
      }
    }

    this.showToast(
      "✓ Receita Registrada",
      `R$ ${numAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} adicionados ao evento ${event.name}.${amortizations.length > 0 ? ` (${amortizations.length} amortização(ões) automática(s))` : ''}`,
      "success"
    );

    this.persist();
    this.notify();
    return { event, revenue: numAmount, amortizations };
  }

  cadastrarColaboradorRH(dados) {
    if (!dados || !dados.nome || !dados.cpf) {
      throw new Error("Nome e CPF são obrigatórios para cadastro do colaborador.");
    }
    const novoColab = {
      id: `colab-${Date.now()}`,
      matricula: dados.matricula || `DISK-${Math.floor(10000 + Math.random() * 90000)}`,
      nome: dados.nome.trim(),
      cpf: dados.cpf.trim(),
      rg: dados.rg || '',
      email: dados.email || '',
      telefone: dados.telefone || '',
      fotoUrl: dados.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      cargoId: dados.cargoId || 'crg-01',
      cargoNome: dados.cargoNome || 'Colaborador Operacional',
      departamentoId: dados.departamentoId || 'dep-01',
      departamentoNome: dados.departamentoNome || 'Operações e Bilheteria de Eventos',
      tipoContrato: dados.tipoContrato || 'CLT',
      status: 'ATIVO',
      dataAdmissao: new Date().toLocaleDateString('pt-BR'),
      salario: Number(dados.salario) || 0,
      valorDiariaEvento: Number(dados.valorDiariaEvento) || 0,
      chavePix: dados.chavePix || '',
      tipoChavePix: dados.tipoChavePix || 'CPF',
      banco: dados.banco || '033 - Santander',
      agencia: dados.agencia || '',
      conta: dados.conta || '',
      geofencePadraoId: dados.geofencePadraoId || 'geo-sede-disk',
      jornada: dados.tipoContrato === 'FREELANCER_EVENTO' ? 'Por Escala de Evento' : '08:00 às 17:48 (Seg-Sex) - 44h',
      saldoBancoHoras: '0h'
    };

    if (!this.data.rhColaboradores) this.data.rhColaboradores = [];
    this.data.rhColaboradores.unshift(novoColab);

    if (!this.data.rhAuditLogs) this.data.rhAuditLogs = [];
    this.data.rhAuditLogs.unshift({
      id: `log-rh-${Date.now()}`,
      at: new Date().toLocaleString('pt-BR'),
      by: this.state.currentUser.name || 'Gestor RH Disk',
      colaboradorAfetado: `${novoColab.nome} (${novoColab.matricula})`,
      acao: 'CADASTRO_COLABORADOR',
      entidade: 'Colaborador',
      detalhes: `Colaborador cadastrado sob regime ${novoColab.tipoContrato}.`,
      ip: '127.0.0.1'
    });

    this.showToast("✓ Colaborador Cadastrado", `${novoColab.nome} foi cadastrado com sucesso.`, "success");
    this.persist();
    this.notify();
    return novoColab;
  }

  registrarBatidaPontoRH(dados) {
    if (!dados || !dados.colaboradorId) {
      throw new Error("Colaborador é obrigatório.");
    }
    const colab = (this.data.rhColaboradores || []).find(c => c.id === dados.colaboradorId);
    if (!colab) throw new Error("Colaborador não encontrado.");

    const nsr = (this.data.rhRegistrosPonto?.length || 0) + 1005;
    const now = new Date();
    const hash = 'a' + Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2);
    const comprovante = `MTE671-${String(nsr).padStart(9, '0')}-${hash.substring(0, 8).toUpperCase()}`;

    const novoPonto = {
      id: `ponto-${nsr}`,
      nsr,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      tipo: dados.tipo || 'ENTRADA',
      dataHoraMarcacao: now.toISOString(),
      dataHoraFormatada: now.toLocaleString('pt-BR'),
      latitude: dados.latitude || -25.4284,
      longitude: dados.longitude || -49.2733,
      precisaoMetros: dados.precisaoMetros || 7.8,
      geofenceId: dados.geofenceId || colab.geofencePadraoId || 'geo-sede-disk',
      geofenceNome: dados.geofenceNome || 'Sede DiskIngressos Curitiba',
      dentroGeofence: dados.dentroGeofence !== undefined ? dados.dentroGeofence : true,
      distanciaGeofence: dados.distanciaGeofence || 5.0,
      modoCaptura: dados.modoCaptura || 'APP_ONLINE',
      hashIntegridade: hash,
      comprovanteNsr: comprovante,
      dispositivoInfo: dados.dispositivoInfo || 'Disk Ponto Android APK v1.0',
      sincronizado: true
    };

    if (!this.data.rhRegistrosPonto) this.data.rhRegistrosPonto = [];
    this.data.rhRegistrosPonto.unshift(novoPonto);

    if (!this.data.rhAuditLogs) this.data.rhAuditLogs = [];
    this.data.rhAuditLogs.unshift({
      id: `log-rh-${Date.now()}`,
      at: now.toLocaleString('pt-BR'),
      by: colab.nome,
      colaboradorAfetado: `${colab.nome} (${colab.matricula})`,
      acao: 'REGISTRO_PONTO',
      entidade: 'RegistroPonto',
      detalhes: `Ponto batido (${novoPonto.tipo}) via REP-P Disk Ponto APK. NSR ${nsr}.`,
      ip: '127.0.0.1'
    });

    this.showToast("✓ Ponto Registrado", `${colab.nome}: ${novoPonto.tipo} às ${now.toLocaleTimeString('pt-BR')}`, "success");
    this.persist();
    this.notify();
    return novoPonto;
  }

  aprovarAjustePontoRH(ajusteId, parecer = "Aprovado pelo RH") {
    const ajuste = (this.data.rhAjustesPonto || []).find(a => a.id === ajusteId);
    if (!ajuste) throw new Error("Ajuste de ponto não encontrado.");

    ajuste.status = 'APROVADO';
    ajuste.analisadoPor = this.state.currentUser.name || 'Gestor RH';
    ajuste.analisadoEm = new Date().toLocaleString('pt-BR');
    ajuste.parecerRH = parecer;

    // Regulariza gerando a batida
    const colab = (this.data.rhColaboradores || []).find(c => c.id === ajuste.colaboradorId);
    if (colab) {
      this.registrarBatidaPontoRH({
        colaboradorId: colab.id,
        tipo: ajuste.tipoAjuste,
        modoCaptura: 'WEB_ADMIN',
        dispositivoInfo: `Ajuste Administrativo RH: ${ajuste.id}`
      });
    }

    this.showToast("✓ Ajuste Aprovado", `Solicitação ${ajusteId} aprovada e ponto regularizado.`, "success");
    this.persist();
    this.notify();
    return ajuste;
  }

  rejeitarAjustePontoRH(ajusteId, motivo = "Horário não confirmado pelo gestor direto") {
    const ajuste = (this.data.rhAjustesPonto || []).find(a => a.id === ajusteId);
    if (!ajuste) throw new Error("Ajuste de ponto não encontrado.");

    ajuste.status = 'REJEITADO';
    ajuste.analisadoPor = this.state.currentUser.name || 'Gestor RH';
    ajuste.analisadoEm = new Date().toLocaleString('pt-BR');
    ajuste.motivoRejeicao = motivo;

    this.showToast("Ajuste Rejeitado", `Solicitação ${ajusteId} foi recusada.`, "warning");
    this.persist();
    this.notify();
    return ajuste;
  }

  alocarEquipeEventoRH(dados) {
    const novoCusto = {
      id: `custo-mo-${Date.now()}`,
      eventoId: dados.eventoId || 'evt-xyz-1',
      eventoNome: dados.eventoNome || 'Show Nacional de Rock Curitiba',
      produtorId: dados.produtorId || 'prod-xyz',
      colaboradorId: dados.colaboradorId,
      colaboradorNome: dados.colaboradorNome,
      cargoFuncao: dados.cargoFuncao || 'Operador de Equipe',
      tipoContratacao: dados.tipoContratacao || 'FREELANCER_EVENTO',
      valorDiaria: Number(dados.valorDiaria) || 180,
      horasTrabalhadas: 8.0,
      valorHorasExtras: Number(dados.valorHorasExtras) || 0,
      auxilioAlimentacao: Number(dados.auxilioAlimentacao) || 40,
      auxilioTransporte: Number(dados.auxilioTransporte) || 30,
      valorTotal: (Number(dados.valorDiaria) || 180) + (Number(dados.auxilioAlimentacao) || 40) + (Number(dados.auxilioTransporte) || 30),
      statusPagamento: 'PREVISTO',
      chavePix: dados.chavePix || '',
      tipoChavePix: dados.tipoChavePix || 'CPF',
      banco: dados.banco || 'Banco Padrão'
    };

    if (!this.data.rhEquipesCustosEvento) this.data.rhEquipesCustosEvento = [];
    this.data.rhEquipesCustosEvento.unshift(novoCusto);

    this.showToast("✓ Profissional Alocado", `${novoCusto.colaboradorNome} alocado no evento.`, "success");
    this.persist();
    this.notify();
    return novoCusto;
  }

  enviarPagamentosEquipeParaTesourariaRH(eventoId = 'evt-xyz-1') {
    const pendentes = (this.data.rhEquipesCustosEvento || []).filter(
      c => c.eventoId === eventoId && (c.statusPagamento === 'PREVISTO' || c.statusPagamento === 'AUTORIZADO_RH')
    );

    if (pendentes.length === 0) {
      this.showToast("Aviso", "Não há pagamentos pendentes de mão de obra para este evento.", "info");
      return;
    }

    const loteId = `LOTE-PIX-RH-${Date.now()}`;
    const total = pendentes.reduce((acc, c) => acc + (c.valorTotal || 0), 0);

    for (const c of pendentes) {
      c.statusPagamento = 'ENVIADO_TESOURARIA';
      c.lotePagamentoId = loteId;
    }

    if (!this.data.rhAuditLogs) this.data.rhAuditLogs = [];
    this.data.rhAuditLogs.unshift({
      id: `log-rh-${Date.now()}`,
      at: new Date().toLocaleString('pt-BR'),
      by: this.state.currentUser.name || 'Diretoria Financeira',
      colaboradorAfetado: `${pendentes.length} Profissionais do Evento`,
      acao: 'PAGAMENTOS_EQUIPE_ENVIADOS_TESOURARIA',
      entidade: 'CustoMaoDeObraEvento',
      detalhes: `Lote ${loteId} contendo ${pendentes.length} pagamentos enviado para Tesouraria PIX. Total: R$ ${total.toFixed(2)}`,
      ip: '127.0.0.1'
    });

    this.showToast(
      "✓ Lote Enviado para a Tesouraria",
      `${pendentes.length} pagamento(s) de equipe (R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) adicionados à fila de PIX da Tesouraria.`,
      "success"
    );

    this.persist();
    this.notify();
    return { loteId, total, pendentes };
  }

  resetDemoData() {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey); } catch (_) {}
    this.data = getFreshDatabase();
    this.enrichApprovalQueueWithAuditAndSignatures();
    this.data.__p12Enriched = true;
    this.ensureOperationModel();
    this.state.selectedProducerId = 'prod-abc';
    this.state.selectedEventId = 'all';
    this.showToast(
      "↻ Demonstração Restaurada",
      "Core Financeiro redefinido para o estado inicial para nova apresentação.",
      "info"
    );
    this.notify();
  }
}

export const financialStore = new CoreFinanceiroStore();
