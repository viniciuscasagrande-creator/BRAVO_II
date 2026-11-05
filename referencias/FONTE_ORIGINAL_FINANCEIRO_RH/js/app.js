/**
 * Controlador Principal do Portal Financeiro Disk Ingressos (ERP / CRM)
 * Padrão Limitless Oficial: Referência visual e estrutural de https://financeiropdtnovo.web.app/
 * 
 * Regras Obrigatórias e Invariantes:
 * 1. Single Core, Duas Visões Especializadas: Produtor vs. Financeiro Disk (Backoffice).
 * 2. Fluxo Oficial e Assinaturas Sequenciais: Solicitação → Análise → Decisão → Assinaturas Digitais → Liberação.
 *    REGRA ESTRITA: O Financeiro Disk é SEMPRE O ÚLTIMO SIGNATÁRIO. O sistema bloqueia a assinatura do Financeiro até que o Produtor assine primeiro.
 * 3. Rejeição Formal: Motivo categorizado, observação obrigatória, notificação imediata ao produtor e devolução automática dos recursos retidos.
 * 4. Trilha de Auditoria Imutável para cada operação.
 * 5. Isolamento Estrito: Produtor só acessa seus próprios eventos e contas.
 */

import { financialStore } from './state.js';
window.financialStore = financialStore;
import { formatCurrency, formatNumber, createStatusBadge } from './formatters.js';

// Import Views do Produtor
import { renderOverview } from './views/overview.js';
import { renderSaldos } from './views/saldos.js';
import { renderExtrato } from './views/extrato.js';
import { renderRepasses } from './views/repasses.js';
import { renderAntecipacoes } from './views/antecipacoes.js';
import { renderVendas } from './views/vendas.js';
import { renderTaxas } from './views/taxas.js';
import { renderEstornos } from './views/estornos.js';
import { renderBordero } from './views/bordero.js';
import { mountDiskReport, renderDiskReport, reportTitles, reportType } from './views/disk/diskReports.js';
import { renderRelatorios } from './views/relatorios.js';
import { renderDadosBancarios } from './views/dadosBancarios.js';
import { renderComprovantes } from './views/comprovantes.js';

// Configuração oficial de menus dinâmicos por perfil
import { menusPorPerfil } from './menuConfig.js';

// Import Views do Financeiro Disk (Backoffice Enterprise)
import { renderDiskDashboard } from './views/disk/dashboard.js';
import {
  renderDiskPosicaoGeral,
  renderDiskIndicadores,
  renderDiskInteligencia
} from './views/disk/diskVisaoGeral.js';
import { renderDiskAprovacoes } from './views/disk/aprovacoes.js';
import { renderDiskSolicitacoes } from './views/disk/solicitacoes.js';
import { renderDiskProdutores } from './views/disk/produtores.js';
import { renderDiskGateways, renderGatewayTab } from './views/disk/gatewaysMdr.js';
import { renderDiskLedger } from './views/disk/ledger.js';
import { renderDiskTesouraria } from './views/disk/tesouraria.js';
import { renderDiskContasPagar } from './views/disk/diskContasPagar.js';
import { renderDiskContasReceber } from './views/disk/diskContasReceber.js';
import { renderDiskFluxoCaixa } from './views/disk/diskFluxoCaixa.js';
import { renderDiskPix } from './views/disk/diskPix.js';
import { renderDiskCnab } from './views/disk/diskCnab.js';
import { renderDiskAgendaPagamentos } from './views/disk/diskAgendaPagamentos.js';
import { renderDiskPagamentosLote } from './views/disk/diskPagamentosLote.js';
import { renderDiskTransferencias } from './views/disk/diskTransferencias.js';
import { renderDiskConciliacao } from './views/disk/diskConciliacao.js';
import { renderDiskFechamentos } from './views/disk/diskFechamentos.js';
import { renderDiskControladoria } from './views/disk/diskControladoria.js';
import { renderDiskAssinaturasIntegracoes } from './views/disk/diskAssinaturasIntegracoes.js';
import { renderDiskGovernanca } from './views/disk/diskGovernanca.js';
import { renderDiskCentralTrabalho } from './views/disk/diskCentralTrabalho.js';
import { renderDiskFinanceiroAvancado } from './views/disk/diskFinanceiroAvancado.js';
import { renderDiskSaldos } from './views/disk/diskSaldos.js';
import { renderDiskPoliticaRepasse } from './views/disk/diskPoliticaRepasse.js';
import { renderDiskContaFinanceira } from './views/disk/diskContaFinanceira.js';
import {
  renderDiskEventos,
  renderDiskRepasses,
  renderDiskAntecipacoes,
  renderDiskRecebiveis,
  renderDiskTaxas,
  renderDiskEstornos,
  renderDiskBordero,
  renderDiskAuditoria,
  renderDiskConfiguracoes,
  renderDiskFornecedores
} from './views/disk/enterpriseViews.js';
import {
  renderDiskRHVisaoGeral,
  renderDiskRHColaboradores,
  renderDiskRHOrganograma,
  renderDiskRHPonto,
  renderDiskRHGeofences,
  renderDiskRHEquipesEvento,
  renderDiskRHCustosEvento,
  renderDiskRHFolha,
  renderDiskRHAuditoria,
  renderDiskRHModulo,
  renderDiskRHDashboardOperacional
} from './views/rh/rhViews.js';
import { initScrollSpy } from './components/scrollSpy.js';

class LimitlessFinancialApp {
  constructor() {
    this.mainContainer = document.getElementById('view-container');
    this.sidebarNav = document.getElementById('main-sidebar-nav');
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-dynamic-content');
    this.activeScrollSpy = null;
    this.activeDossieTab = 'sec-dossie-resumo';
    this.dossieTab = 'sec-dossie-resumo';

    // Rastreamento persistente de submenus do menu lateral expandidos (não fecham sozinhos)
    try {
      const saved = JSON.parse(localStorage.getItem('opened_submenus') || '[]');
      this.openedSubmenus = new Set(Array.isArray(saved) ? saved : []);
    } catch (e) {
      this.openedSubmenus = new Set();
    }

    try {
      const wasCollapsed = localStorage.getItem('sidebar_desktop_collapsed') === 'true';
      if (wasCollapsed && window.innerWidth >= 992) {
        document.body.classList.add('sidebar-main-resized');
      }
    } catch (e) {}

    // Subscribe to state changes
    financialStore.subscribe((state) => {
      this.render(state);
    });

    const initialRoute = window.location.hash.slice(1);
    if (reportType(initialRoute) && financialStore.getState().viewMode === 'disk') {
      financialStore.setView(initialRoute);
    }

    // Initial render
    this.render(financialStore.getState());
    this.setupGlobalListeners();
  }

  setupGlobalListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeAllSearchDropdowns();
      }
    });

    document.addEventListener('click', (e) => {
      // Close search dropdowns if clicked outside
      const globalSearchBox = document.getElementById('global-search');
      const globalSearchDropdown = document.getElementById('global-search-dropdown');
      if (globalSearchDropdown && !globalSearchDropdown.contains(e.target) && e.target !== globalSearchBox) {
        globalSearchDropdown.classList.add('d-none');
      }

      const localSearchBox = document.getElementById('producer-local-search');
      const localSearchDropdown = document.getElementById('producer-local-search-results');
      if (localSearchDropdown && !localSearchDropdown.contains(e.target) && e.target !== localSearchBox) {
        localSearchDropdown.style.display = 'none';
      }
    });

    // Close modal when clicking outside modal card
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.closeModal();
        }
      });
    }

    const evtSelect = document.getElementById('globalEventSelect');
    if (evtSelect) {
      evtSelect.addEventListener('change', (e) => {
        this.setSelectedEvent(e.target.value);
      });
    }
  }

  setSelectedEvent(eventId) {
    financialStore.setSelectedEvent(eventId);
    const evtBadge = document.getElementById('header-event-badge');
    if (evtBadge) {
      const state = financialStore.getState();
      const evt = state.data.events.find(e => e.id === eventId);
      evtBadge.innerText = evt ? evt.name : 'Todos os Eventos (Consolidado)';
    }
  }

  setSelectedProducer(producerId) {
    financialStore.setSelectedProducer(producerId);
  }

  selectProducerInDisk(producerId) {
    financialStore.setSelectedProducer(producerId);
  }

  applyGlobalProducerSearch(value) {
    const st = financialStore.getState();
    const term = String(value || '').trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const p = (st.data.producers || []).find(x =>
      String(x.id || '').toLowerCase() === term ||
      String(x.name || '').toLowerCase() === term ||
      String(x.tradeName || '').toLowerCase() === term ||
      (digits && String(x.cnpj || '').replace(/\D/g, '') === digits)
    ) || (st.data.producers || []).find(x =>
      String(x.name || '').toLowerCase().includes(term) ||
      String(x.tradeName || '').toLowerCase().includes(term) ||
      (digits.length >= 4 && String(x.cnpj || '').replace(/\D/g, '').includes(digits))
    );
    if (!p) {
      financialStore.showToast('Produtor não encontrado', 'Busque por nome, nome fantasia, CNPJ ou ID.', 'warning');
      return;
    }
    financialStore.setSelectedProducer(p.id);
    this.render(financialStore.getState());
  }

  searchProducerMaster(term) {
    const q = String(term || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const state = financialStore.getState();
    const found = (state.data.producers || []).find(p => {
      const fields = [p.name, p.tradeName, p.cnpj, p.id].map(v => String(v || '').toLowerCase());
      return fields.some(v => v.includes(String(term || '').toLowerCase()) || v.replace(/[^a-z0-9]/g, '').includes(q));
    });
    if (found) this.selectProducerInDisk(found.id);
  }

  addFinancialDocument(producerId) {
    const state = financialStore.getState();
    const producer = state.data.producers.find(p => p.id === producerId);
    if (!producer) return;
    const type = prompt('Tipo da operação (Repasse, Transferência, Pagamento, Estorno, Outro):', 'Repasse');
    if (!type) return;
    const amount = Number(String(prompt('Valor da transação (R$):', '0') || '0').replace('.', '').replace(',', '.')) || 0;
    const eventId = prompt('ID do evento (deixe vazio para consolidado):', '') || null;
    const evt = state.data.events.find(e => e.id === eventId);
    const fileName = prompt('Nome do comprovante/arquivo:', `comprovante_${type.toLowerCase().replace(/\s+/g,'_')}.pdf`) || 'comprovante.pdf';
    const reference = prompt('Referência/NSU/Protocolo:', '') || '';
    const description = prompt('Descrição da transação:', '') || '';
    const visible = confirm('Disponibilizar este comprovante ao Produtor agora?');
    state.data.financialDocuments = state.data.financialDocuments || [];
    state.data.financialDocuments.unshift({id:`DOC-FIN-${Date.now()}`,producerId,eventId,eventName:evt?.name||'Consolidado',type,amount,fileName,reference,description,date:new Date().toLocaleDateString('pt-BR'),visibleToProducer:visible,uploadedBy:'Financeiro Disk'});
    financialStore.persist?.();
    this.render(financialStore.getState());
    financialStore.showToast('Documento financeiro', visible ? 'Transação anexada e disponibilizada ao produtor.' : 'Transação anexada como documento interno da Disk.', 'success');
  }

  toggleFinancialDocumentVisibility(producerIdOrDocId, maybeDocId) {
    const docId = maybeDocId || producerIdOrDocId;
    const producerId = maybeDocId ? producerIdOrDocId : null;
    const state = financialStore.getState();

    // Check in root financialDocuments
    const doc = (state.data.financialDocuments || []).find(d => d.id === docId);
    if (doc) {
      doc.visibleToProducer = !doc.visibleToProducer;
    }

    // Check in producer's financialDocuments / documents
    const p = producerId
      ? (state.data.producers || []).find(x => x.id === producerId)
      : (state.data.producers || []).find(x => (x.financialDocuments || []).some(d => d.id === docId) || (x.documents || []).some(d => d.id === docId));

    if (p) {
      const pDoc = (p.financialDocuments || []).find(d => d.id === docId) || (p.documents || []).find(d => d.id === docId);
      if (pDoc) {
        pDoc.visibleToProducer = !pDoc.visibleToProducer;
        p.auditHistory = p.auditHistory || [];
        p.auditHistory.unshift({
          at: new Date().toLocaleString('pt-BR'),
          by: state.currentUser?.name || 'Financeiro Disk',
          action: `${pDoc.visibleToProducer ? 'Publicado no portal' : 'Retirado do portal'}: ${pDoc.fileName || pDoc.name}`
        });
      }
    }

    financialStore.persist?.();
    financialStore.notify?.();
    financialStore.showToast("Visibilidade Alterada", "Controle de visibilidade documental atualizado com sucesso.", "info");
    this.render(financialStore.getState());
  }

  openFinancialDocumentModal(producerId) {
    const st = financialStore.getState();
    const p = (st.data.producers || []).find(x => x.id === producerId) || (st.data.producers || [])[0];
    const events = (st.data.events || []).filter(e => e.producerId === p.id);
    const html = `
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3">
          <div class="d-flex align-items-center gap-2">
            <i class="ph-file-text fs-4 text-warning"></i>
            <div>
              <h5 class="modal-title fs-sm fw-bold mb-0">Anexar Comprovante / Transação</h5>
              <div class="fs-xxs text-white-50">${p.name} &bull; ${p.cnpj}</div>
            </div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4 bg-light" onsubmit="window.app.saveFinancialDocument(event, '${p.id}')">
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fs-xs fw-bold text-dark">Tipo de Operação <span class="text-danger">*</span></label>
              <select class="form-select form-select-sm" name="type" required>
                <option value="Repasse">Repasse Bancário</option>
                <option value="Transferência">Transferência entre Eventos</option>
                <option value="Estorno">Estorno / Devolução</option>
                <option value="Pagamento de Obrigação">Pagamento de Obrigação</option>
                <option value="Outro">Outro Comprovante</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fs-xs fw-bold text-dark">Evento Vinculado</label>
              <select class="form-select form-select-sm" name="eventId">
                <option value="">Geral do Produtor (Consolidado)</option>
                ${events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fs-xs fw-bold text-dark">Valor da Transação (R$) <span class="text-danger">*</span></label>
              <input class="form-control form-control-sm" name="amount" type="number" step="0.01" placeholder="0,00" required>
            </div>
            <div class="col-md-6">
              <label class="form-label fs-xs fw-bold text-dark">Arquivo / Nome de Referência <span class="text-danger">*</span></label>
              <input class="form-control form-control-sm" name="fileName" placeholder="comprovante_transacao.pdf" required>
            </div>
          </div>
          <div class="p-3 bg-white rounded border mb-3">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" name="visibleToProducer" id="chkVisibleToProd">
              <label class="form-check-label fs-xs fw-bold text-dark" for="chkVisibleToProd">
                Disponibilizar ao Produtor no Portal
              </label>
            </div>
            <div class="fs-xxs text-muted mt-1">
              <i class="ph-shield-check text-primary me-1"></i> Regra de Governança: Anexar não publica automaticamente. Deixe desmarcado para manter interno.
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-sm btn-primary fw-bold px-3">
              <i class="ph-check me-1"></i> Salvar Comprovante
            </button>
          </div>
        </form>
      </div>
    `;
    this.openModal(html);
  }

  saveFinancialDocument(event, producerId) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const f = event?.target ? Object.fromEntries(new FormData(event.target)) : {};
    const st = financialStore.getState();
    const p = (st.data.producers || []).find(x => x.id === producerId);
    if (!p) return;
    const ev = (st.data.events || []).filter(e => e.id === f.eventId)[0];

    const newDoc = {
      id: 'fd-' + Date.now(),
      date: new Date().toLocaleDateString('pt-BR'),
      type: f.type || 'Repasse',
      eventId: f.eventId || null,
      eventName: ev?.name || 'Geral do produtor',
      amount: Number(f.amount || 0),
      fileName: f.fileName || 'comprovante.pdf',
      visibleToProducer: f.visibleToProducer === 'on' || f.visibleToProducer === true
    };

    p.financialDocuments = p.financialDocuments || [];
    p.financialDocuments.unshift(newDoc);

    st.data.financialDocuments = st.data.financialDocuments || [];
    st.data.financialDocuments.unshift({
      ...newDoc,
      producerId: p.id,
      uploadedBy: 'Financeiro Disk'
    });

    p.auditHistory = p.auditHistory || [];
    p.auditHistory.unshift({
      at: new Date().toLocaleString('pt-BR'),
      by: st.currentUser?.name || 'Financeiro Disk',
      action: `Comprovante anexado: ${newDoc.fileName} (${newDoc.visibleToProducer ? 'Disponível ao Produtor' : 'Interno Disk'})`
    });

    financialStore.persist?.();
    financialStore.notify?.();
    this.closeModal();
    financialStore.showToast("Comprovante Anexado", `Comprovante ${newDoc.fileName} registrado com sucesso.`, "success");
    this.render(financialStore.getState());
  }

  downloadFinancialDocument(id) {
    const state = financialStore.getState();
    const d = (state.data.financialDocuments || []).find(x => x.id === id);
    if (!d) return;
    const content = `DISK INGRESSOS - COMPROVANTE FINANCEIRO\nOperação: ${d.type}\nData: ${d.date}\nEvento: ${d.eventName||'Consolidado'}\nReferência: ${d.reference||'-'}\nValor: R$ ${Number(d.amount||0).toFixed(2)}\nDescrição: ${d.description||'-'}\nArquivo de referência: ${d.fileName}`;
    const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=d.fileName?.replace(/\.pdf$/i,'.txt')||'comprovante.txt'; a.click(); URL.revokeObjectURL(a.href);
  }

  addSocietaryDocumentModal(producerId) {
    const state = financialStore.getState();
    const producer = (state.data.producers || []).find(p => p.id === producerId);
    if (!producer) {
      financialStore.showToast("Erro", "Produtor não localizado.", "danger");
      return;
    }
    const html = `
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3">
          <div class="d-flex align-items-center gap-2">
            <i class="ph-file-lock fs-4 text-warning"></i>
            <div>
              <h5 class="modal-title fs-sm fw-bold mb-0">Anexar Documento Societário / Compliance</h5>
              <div class="fs-xxs text-white-50">${producer.name} &bull; ${producer.cnpj}</div>
            </div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4 bg-light" onsubmit="event.preventDefault(); window.app.saveSocietaryDocument('${producer.id}')">
          <div class="mb-3">
            <label class="form-label fs-xs fw-bold text-dark">Tipo de Documento <span class="text-danger">*</span></label>
            <select class="form-select form-select-sm" id="socDocType" required>
              <option value="Contrato Social / Estatuto">Contrato Social / Estatuto Vigente</option>
              <option value="Cartão CNPJ">Cartão CNPJ Atualizado</option>
              <option value="Procuração / Nomeação">Procuração / Nomeação de Administradores</option>
              <option value="CND Federal / Receita">CND Federal (Receita Federal / PGFN)</option>
              <option value="CND Estadual / Municipal">CND Estadual / Municipal</option>
              <option value="Comprovante de Domicílio Bancário">Comprovante de Domicílio Bancário</option>
              <option value="Outros / Compliance">Outros Documentos de Compliance</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label fs-xs fw-bold text-dark">Título / Descrição do Documento <span class="text-danger">*</span></label>
            <input type="text" class="form-control form-control-sm" id="socDocName" placeholder="Ex: Alteração Contratual Consolidada na Junta Comercial" required>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-7">
              <label class="form-label fs-xs fw-bold text-dark">Nome do Arquivo / PDF</label>
              <input type="text" class="form-control form-control-sm" id="socDocFileName" placeholder="contrato_social_consolidado.pdf">
            </div>
            <div class="col-5">
              <label class="form-label fs-xs fw-bold text-dark">Status</label>
              <select class="form-select form-select-sm" id="socDocStatus">
                <option value="Válido" selected>Válido</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Pendente de Renovação">Pendente de Renovação</option>
              </select>
            </div>
          </div>
          <div class="p-3 bg-white rounded border mb-3">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="socDocVisibleToProducer">
              <label class="form-check-label fs-xs fw-bold text-dark" for="socDocVisibleToProducer">
                Disponibilizar ao Produtor no Portal
              </label>
            </div>
            <div class="fs-xxs text-muted mt-1">
              <i class="ph-shield-check text-primary me-1"></i> Regra de Governança: Por padrão, anexar não publica automaticamente. Deixe desmarcado para manter o documento como <strong>Interno Disk</strong>.
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-sm btn-primary fw-bold px-3">
              <i class="ph-check me-1"></i> Salvar Documento
            </button>
          </div>
        </form>
      </div>
    `;
    this.showModal(html);
  }

  saveSocietaryDocument(producerId) {
    const docType = document.getElementById('socDocType')?.value;
    const docName = document.getElementById('socDocName')?.value;
    const fileName = document.getElementById('socDocFileName')?.value || `${(docName || 'documento').toLowerCase().replace(/\s+/g, '_')}.pdf`;
    const docStatus = document.getElementById('socDocStatus')?.value || 'Válido';
    const visibleToProducer = document.getElementById('socDocVisibleToProducer')?.checked === true;

    if (!docName || !docName.trim()) {
      alert("Informe o título/descrição do documento.");
      return;
    }

    financialStore.addProducerDocument(producerId, {
      type: docType,
      name: docName.trim(),
      fileName: fileName.trim(),
      status: docStatus,
      visibleToProducer
    });

    this.closeModal();
    financialStore.showToast(
      "Documento Anexado",
      `Documento "${docName}" inserido com sucesso. Visibilidade: ${visibleToProducer ? 'Disponível ao Produtor' : 'Interno Disk'}.`,
      "success"
    );
    this.render(financialStore.getState());
  }

  toggleSocietaryDocumentVisibility(producerId, docId) {
    financialStore.toggleProducerDocumentVisibility(producerId, docId);
    const state = financialStore.getState();
    const p = (state.data.producers || []).find(x => x.id === producerId);
    const doc = (p?.documents || []).find(d => d.id === docId);
    financialStore.showToast(
      "Visibilidade Alterada",
      `Documento agora está: ${doc?.visibleToProducer ? 'Disponível ao Produtor' : 'Restrito (Interno Disk)'}`,
      "info"
    );
    this.render(state);
  }

  downloadSocietaryDocument(producerId, docId) {
    const state = financialStore.getState();
    const p = (state.data.producers || []).find(x => x.id === producerId);
    const doc = (p?.documents || []).find(d => d.id === docId);
    if (!doc) return;
    const content = `DISK INGRESSOS - DOCUMENTO SOCIETÁRIO & COMPLIANCE\nProdutor: ${p?.name || '-'}\nCNPJ: ${p?.cnpj || '-'}\nTipo: ${doc.type}\nDocumento: ${doc.name}\nArquivo: ${doc.fileName}\nData de Upload: ${doc.uploadDate}\nStatus: ${doc.status}\nVisibilidade: ${doc.visibleToProducer ? 'Disponível ao Produtor' : 'Interno Disk'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = doc.fileName?.replace(/\.pdf$/i, '.txt') || 'documento.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  searchProducerMaster(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#sec-dossie-resumo table tbody tr, #sec-dossie-resumo .list-group-item, #sec-dossie-resumo .table-responsive tbody tr');
    rows.forEach(r => {
      const text = r.innerText.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  }

  exportCurrentView(format = 'excel') {
    financialStore.showToast("Exportação Iniciada", `Gerando demonstrativo analítico .${format === 'excel' ? 'xlsx' : 'pdf'}...`, "info");
  }

  setSelectedPeriod(period) {
    const labels = {
      'month': 'Mês Atual (Março/2026)',
      '30d': 'Últimos 30 dias',
      '90d': 'Últimos 90 dias',
      'year': 'Ano de 2026',
      'all': 'Todo o Histórico'
    };
    financialStore.showToast("Filtro Temporal", `Visão consolidada atualizada para: ${labels[period] || period}`, "info");
  }

  // Pacote 22 — ligação incremental entre módulos sem substituir as views existentes.
  // Mantém protocolo, produtor e evento enquanto o usuário percorre a cadeia financeira.
  focusOperation(requestId, targetView = 'diskAprovacoes') {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === requestId);
    if (!item) {
      financialStore.showToast('Operação não encontrada', `Não foi possível localizar ${requestId}.`, 'warning');
      return;
    }

    this.activeOperationId = requestId;
    this.currentFilterArg = requestId;
    this.closeModal();
    financialStore.setOperationalContext({
      producerId: item.producerId,
      eventId: item.eventId || 'all',
      viewName: targetView
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearOperationFocus() {
    this.activeOperationId = null;
    this.currentFilterArg = null;
    this.render(financialStore.getState());
  }

  navigate(viewName, filterArg = null) {
    this.currentFilterArg = filterArg;

    // View Aliases matching reference app https://financeiropdtnovo.web.app/
    const state = financialStore.getState();
    const isDisk = state.viewMode === 'disk';

    let targetView = viewName;
    const aliasMap = {
      'financial-dashboard': isDisk ? 'diskDashboard' : 'overview',
      'financial-posicao-geral': isDisk ? 'diskPosicaoGeral' : 'saldos',
      'financial-saldos': isDisk ? 'diskSaldos' : 'saldos',
      'financial-approvals': 'diskAprovacoes',
      'financial-repass': isDisk ? 'diskRepasses' : 'repasses',
      'financial-advance': isDisk ? 'diskAntecipacoes' : 'antecipacoes',
      'financial-statement': isDisk ? 'diskLedger' : 'extrato',
      'financial-gateways-adquirentes': 'diskGateways',
      'financial-accounts': isDisk ? 'diskTesouraria' : 'dadosBancarios',
      'financial-bordero': isDisk ? 'diskBordero' : 'bordero',
      'financial-taxas-custos': isDisk ? 'diskTaxas' : 'taxas',
      'financial-fechamento': isDisk ? 'diskBordero' : 'bordero',
      'financial-balance': isDisk ? 'diskTesouraria' : 'saldos',
      'financial-event-transfers': isDisk ? 'diskTesouraria' : 'saldos',
      'financial-refunds': isDisk ? 'diskEstornos' : 'estornos',
      'financial-analytics': isDisk ? 'diskRelatorios' : 'relatorios',
      'dashboard-main': isDisk ? 'diskDashboard' : 'overview',
      'dashboard-agenda': isDisk ? 'diskRecebiveis' : 'diskTesouraria',
      'dashboard-indicators': isDisk ? 'diskIndicadores' : 'relatorios',
      'events-list': isDisk ? 'diskEventos' : 'saldos',
      'accounting-disk': 'diskLedger',
      'reports-sales': isDisk ? 'diskRelatorios' : 'relatorios',
      'procure-to-pay': isDisk ? 'diskContasPagar' : 'diskTesouraria',
      'fin-my-requests': 'repasses',
      'financial-conta-financeira': 'diskContaFinanceira',
      'conta-financeira': 'diskContaFinanceira'
    };

    if (aliasMap[viewName]) {
      targetView = aliasMap[viewName];
    }

    if (targetView === 'diskDashboard') {
      if (filterArg === 'posicao') {
        targetView = 'diskPosicaoGeral';
      } else if (filterArg === 'indicadores') {
        targetView = 'diskIndicadores';
      } else if (filterArg === 'inteligencia') {
        targetView = 'diskInteligencia';
      }
    }

    if (targetView === 'diskProdutores') {
      // Produtores sempre abre no Dossiê Financeiro. Contas bancárias só por rota explícita.
      // Evita herdar a última aba visitada e parecer que o submenu Produtores não mudou.
      if (filterArg === 'contas' || filterArg === 'bancarias') {
        this.diskProdutoresTab = 'bancarias';
      } else if (filterArg === 'financeiras') {
        this.diskProdutoresTab = 'financeiras';
      } else {
        this.diskProdutoresTab = 'dossie';
      }
    }

    if (targetView === 'diskSaldos') {
      if (filterArg === 'evento' || filterArg === 'por-evento') {
        this.diskBalanceTab = 'por-evento';
      } else if (filterArg === 'produtor' || filterArg === 'por-produtor') {
        this.diskBalanceTab = 'por-produtor';
      } else if (filterArg) {
        this.diskBalanceTab = filterArg;
      }
    }

    financialStore.setView(targetView);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // REGRA DE USABILIDADE: O menu lateral expandido PERMANECE EXPANDIDO (não fecha sozinho ao navegar)
    // O usuário clica para expandir e ele fica. Só fecha se o usuário clicar no botão de fechar/alternar.
  }

  toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
      if (sidebar) {
        sidebar.classList.toggle('sidebar-mobile-expanded');
      }
    } else {
      // No Desktop, alterna entre o modo expandido oficial (270px) e compacto (72px)
      const isCurrentlyResized = document.body.classList.contains('sidebar-main-resized');
      document.body.classList.toggle('sidebar-main-resized', !isCurrentlyResized);
      try {
        localStorage.setItem('sidebar_desktop_collapsed', !isCurrentlyResized ? 'true' : 'false');
      } catch (e) {}
    }
  }

  toggleSubmenu(event, element, itemId) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    this.openedSubmenus = this.openedSubmenus || new Set();
    const li = element ? element.closest('.nav-item-submenu') : null;
    const id = itemId || (li ? li.getAttribute('data-submenu-id') : null);
    if (!id) return;

    const willOpen = !this.openedSubmenus.has(id);
    if (willOpen) {
      this.openedSubmenus.add(id);
      if (li) {
        li.classList.add('is-open', 'nav-item-open');
        const sub = li.querySelector('.nav-group-sub');
        if (sub) sub.style.display = 'flex';
      }
    } else {
      this.openedSubmenus.delete(id);
      if (li) {
        li.classList.remove('is-open', 'nav-item-open');
        const sub = li.querySelector('.nav-group-sub');
        if (sub) sub.style.display = 'none';
      }
    }

    try {
      localStorage.setItem('opened_submenus', JSON.stringify([...this.openedSubmenus]));
    } catch (e) {}
  }

  closeAllSearchDropdowns() {
    const globalDropdown = document.getElementById('global-search-dropdown');
    if (globalDropdown) {
      globalDropdown.style.display = 'none';
      globalDropdown.classList.add('d-none');
    }
    const localDropdown = document.getElementById('producer-local-search-results');
    if (localDropdown) {
      localDropdown.style.display = 'none';
    }
  }

  clearGlobalSearch() {
    const input = document.getElementById('global-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('global-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    this.closeAllSearchDropdowns();
  }

  handleGlobalSearch(query) {
    const clearBtn = document.getElementById('global-search-clear');
    const dropdown = document.getElementById('global-search-dropdown');
    if (!dropdown) return;

    if (!query || query.trim().length === 0) {
      if (clearBtn) clearBtn.style.display = 'none';
      dropdown.style.display = 'none';
      dropdown.classList.add('d-none');
      return;
    }

    if (clearBtn) clearBtn.style.display = 'block';

    if (query.trim().length < 2) {
      dropdown.style.display = 'none';
      dropdown.classList.add('d-none');
      return;
    }

    const { producers, events } = financialStore.searchGlobalEntities(query);

    let html = '';
    if (producers.length > 0) {
      html += `
        <div class="px-3 py-2 bg-light border-bottom text-muted fw-bold fs-xxs text-uppercase">
          <i class="ph-buildings me-1 text-primary"></i> Produtores Encontrados (${producers.length})
        </div>
      `;
      producers.forEach(p => {
        html += `
          <a href="#" class="dropdown-item py-2 px-3 border-bottom d-flex align-items-center justify-content-between" onclick="window.app.focusProducer('${p.id}'); return false;">
            <div>
              <div class="fw-bold fs-xs text-dark">${p.tradeName || p.name}</div>
              <div class="fs-xxs text-muted">CNPJ: <strong>${p.cnpj}</strong> &bull; ${p.name}</div>
            </div>
            <div class="text-end">
              <span class="badge ${p.status === 'Ativo' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} fs-xxs">${p.status || 'Ativo'}</span>
              <div class="fs-xxs text-muted mt-1">${p.rating || 'Tier B'}</div>
            </div>
          </a>
        `;
      });
    }

    if (events.length > 0) {
      html += `
        <div class="px-3 py-2 bg-light border-bottom text-muted fw-bold fs-xxs text-uppercase">
          <i class="ph-ticket me-1 text-success"></i> Eventos Encontrados (${events.length})
        </div>
      `;
      events.forEach(e => {
        html += `
          <a href="#" class="dropdown-item py-2 px-3 border-bottom d-flex align-items-center justify-content-between" onclick="window.app.focusEvent('${e.id}'); return false;">
            <div>
              <div class="fw-bold fs-xs text-dark">${e.name}</div>
              <div class="fs-xxs text-muted">${e.venue || 'Local'} &bull; Produtor: ${e.producerName || '-'}</div>
            </div>
            <div class="text-end">
              <span class="badge bg-primary-subtle text-primary fs-xxs">${e.id}</span>
            </div>
          </a>
        `;
      });
    }

    if (producers.length === 0 && events.length === 0) {
      html = `
        <div class="p-3 text-center text-muted fs-xs">
          <i class="ph-magnifying-glass fs-3 d-block mb-1 opacity-50"></i>
          Nenhum produtor, CNPJ ou evento encontrado para "<strong>${query.replace(/</g, '&lt;')}</strong>".
        </div>
      `;
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    dropdown.classList.remove('d-none');
  }

  filterMasterProducers(term = '') {
    const q = String(term).toLowerCase().replace(/[^a-z0-9]/g, '');
    const select = document.getElementById('masterProducerSelect');
    if (select) {
      const producers = financialStore.getState().data.producers || [];
      const currentVal = select.value;
      const filtered = producers.filter(p => {
        const hay = [p.id, p.name, p.tradeName, p.cnpj].join(' ').toLowerCase();
        return !q || hay.replace(/[^a-z0-9]/g, '').includes(q);
      });
      select.innerHTML = filtered.map(p => `<option value="${p.id}" ${p.id === currentVal ? 'selected' : ''}>${p.name} (${p.cnpj})</option>`).join('');
    }
    this.handleProducerLocalSearch(term);
  }

  handleProducerLocalSearch(query) {
    const resultsContainer = document.getElementById('producer-local-search-results');
    if (!resultsContainer) return;

    if (!query || query.trim().length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }

    const { producers } = financialStore.searchGlobalEntities(query);
    if (!producers.length) {
      resultsContainer.innerHTML = `<div class="p-3 text-center text-muted fs-xs">Nenhum produtor localizado para esta busca.</div>`;
      resultsContainer.style.display = 'block';
      return;
    }

    resultsContainer.innerHTML = producers.map(p => `
      <div class="p-2 px-3 border-bottom hover-bg d-flex align-items-center justify-content-between" style="cursor: pointer;" onclick="window.app.focusProducer('${p.id}')">
        <div>
          <div class="fw-bold fs-xs text-dark">${p.tradeName || p.name}</div>
          <div class="fs-xxs text-muted">CNPJ: <strong>${p.cnpj}</strong> &bull; ${p.name}</div>
        </div>
        <div class="text-end">
          <span class="badge bg-primary-subtle text-primary fs-xxs">Selecionar</span>
        </div>
      </div>
    `).join('');
    resultsContainer.style.display = 'block';
  }

  focusProducer(producerId) {
    this.closeAllSearchDropdowns();
    const state = financialStore.getState();
    const p = (state.data.producers || []).find(pr => pr.id === producerId);
    if (!p) return;

    financialStore.setProducerContext(producerId);

    // Se estiver no ambiente Disk, navega para o Dossiê do produtor
    if (state.viewMode === 'disk' || state.currentUser.role === 'admin') {
      this.diskProdutoresTab = 'dossie';
      this.navigate('diskProdutores', 'dossie');
    } else {
      this.render(financialStore.getState());
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    financialStore.showToast(
      "Produtor Selecionado",
      `Contexto ativado: ${p.tradeName || p.name} (CNPJ: ${p.cnpj}). Toda a navegação agora filtra por esta entidade.`,
      "info"
    );
  }

  focusEvent(eventId) {
    this.closeAllSearchDropdowns();
    const state = financialStore.getState();
    const evt = (state.data.events || []).find(e => e.id === eventId);
    if (!evt) return;

    financialStore.setOperationalContext({
      producerId: evt.producerId,
      eventId: evt.id,
      viewName: 'diskEventos'
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    financialStore.showToast("Evento Selecionado", `Contexto operacional alterado para o evento: ${evt.name}`, "info");
  }

  clearProducerContext() {
    this.clearGlobalSearch();
    financialStore.setProducerContext('all');
    financialStore.setSelectedEvent('all');
    financialStore.showToast("Contexto Redefinido", "Visualizando todos os produtores e eventos consolidados.", "info");
    this.render(financialStore.getState());
  }

  renderProducerContextBanner(state) {
    const container = document.getElementById('producer-context-banner-container');
    if (!container) return;

    const isDisk = state.viewMode === 'disk' || state.currentUser.role === 'admin';
    if (!isDisk || !state.selectedProducerId || state.selectedProducerId === 'all') {
      container.innerHTML = '';
      return;
    }

    const p = (state.data.producers || []).find(pr => pr.id === state.selectedProducerId);
    if (!p) {
      container.innerHTML = '';
      return;
    }

    const summary = financialStore.getProducerSummary(p.id);
    const account = financialStore.getProducerFinancialAccount(p.id);
    const events = (state.data.events || []).filter(e => e.producerId === p.id);
    const primaryAccount = (p.bankAccounts || []).find(b => b.isPrimary) || (p.bankAccounts || [])[0];
    const respName = p.responsibles?.[0]?.name || p.financialContacts?.[0]?.name || p.accountManager || 'Carlos Menezes (Disk Ingressos)';
    const accountDisplay = primaryAccount
      ? `${primaryAccount.bankName || primaryAccount.bank} Ag ${primaryAccount.agency} C/C ${primaryAccount.accountNumber || primaryAccount.account}`
      : (p.pixKeys?.[0]?.key ? `PIX: ${p.pixKeys[0].key}` : 'Conta em validação');

    const totalBalance = account?.summary?.consolidatedBalance ?? summary?.totalBalance ?? 0;
    const available = account?.summary?.availableForRepasse ?? summary?.availableBalance ?? 0;
    const retido = ((account?.summary?.blocked || 0) + (account?.summary?.obligationsReserved || 0) + (account?.summary?.retained || 0)) || summary?.blockedBalance || 0;
    const receivable = account?.summary?.futurePending ?? summary?.futureReceivables ?? 0;
    const pendingPayouts = summary?.pendingPayouts ?? 0;
    const creditDebt = account?.summary?.outstandingCredits ?? 0;

    container.innerHTML = `
      <div class="producer-context-persistent-card mb-4" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; border: 1px solid #3b82f6; box-shadow: 0 4px 15px rgba(0,0,0,0.15); color: #f8fafc; padding: 16px 20px;">
        <!-- Linha 1: Cabeçalho com Identificação e Governança -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="width: 44px; height: 44px; border-radius: 8px; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; box-shadow: 0 2px 6px rgba(37,99,235,0.4);">
              ${(p.tradeName || p.name).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge" style="background: #2563eb; color: white; font-weight: 700; font-size: 10px; padding: 3px 8px; border-radius: 4px;">
                  <i class="ph-funnel me-1"></i> CONTEXTO PERSISTENTE ATIVO
                </span>
                <h2 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #ffffff;">
                  ${p.tradeName || p.name}
                </h2>
                <span style="color: #94a3b8; font-size: 0.85rem;">| ${p.name}</span>
                <span style="color: #60a5fa; font-family: monospace; font-size: 0.85rem; font-weight: 600;">| CNPJ: ${p.cnpj}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 4px; font-size: 0.78rem; color: #cbd5e1;">
                <span><strong>Status:</strong> <span class="badge ${p.status === 'Ativo' ? 'badge-success' : 'badge-warning'}" style="font-size: 10px;">${p.status || 'Ativo'}</span></span>
                <span>&bull;</span>
                <span><strong>Responsável:</strong> ${respName}</span>
                <span>&bull;</span>
                <span><strong>Conta Homologada:</strong> <span style="font-family: monospace; color: #a5f3fc;">${accountDisplay}</span></span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-sm btn-outline-primary" style="color: #93c5fd; border-color: #3b82f6;" onclick="window.app.openProducerMasterModal('${p.id}')">
              <i class="ph-pencil-simple me-1"></i> Ficha Mestre
            </button>
            <button class="btn btn-sm btn-outline-danger" style="color: #fca5a5; border-color: #ef4444;" onclick="window.app.clearProducerContext()" title="Limpar contexto do produtor e visualizar todos">
              <i class="ph-x-circle me-1"></i> Limpar Contexto (Ver Todos)
            </button>
          </div>
        </div>

        <!-- Linha 2: Cards de Saldo do Produtor (6 Cards Canônicos) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Saldo Total</span>
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-top: 2px;">${formatCurrency(totalBalance)}</div>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #34d399; text-transform: uppercase;">Disponível</span>
            <div style="font-size: 15px; font-weight: 800; color: #34d399; margin-top: 2px;">${formatCurrency(available)}</div>
          </div>
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #f87171; text-transform: uppercase;">Retido / Reservado</span>
            <div style="font-size: 15px; font-weight: 800; color: #f87171; margin-top: 2px;">${formatCurrency(retido)}</div>
          </div>
          <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #60a5fa; text-transform: uppercase;">A Receber</span>
            <div style="font-size: 15px; font-weight: 800; color: #60a5fa; margin-top: 2px;">${formatCurrency(receivable)}</div>
          </div>
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #fbbf24; text-transform: uppercase;">Repasses Pendentes</span>
            <div style="font-size: 15px; font-weight: 800; color: #fbbf24; margin-top: 2px;">${formatCurrency(pendingPayouts)}</div>
          </div>
          <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 8px; padding: 8px 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #c084fc; text-transform: uppercase;">Crédito em Aberto</span>
            <div style="font-size: 15px; font-weight: 800; color: #c084fc; margin-top: 2px;">${formatCurrency(creditDebt)}</div>
          </div>
        </div>

        <!-- Linha 3: Barra de Navegação Contextual Rápida -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-right: 4px;">Ir Direto:</span>
          <button class="btn btn-xs ${state.currentView === 'diskProdutores' && (this.activeDossieTab === 'sec-dossie-resumo' || !this.activeDossieTab) ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerTab('sec-dossie-resumo')">
            <i class="ph-identification-card me-1"></i> Visão Geral &amp; Contrato
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskProdutores' && this.activeDossieTab === 'sec-dossie-eventos' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerTab('sec-dossie-eventos')">
            <i class="ph-ticket me-1"></i> Eventos (${(events || []).length})
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskProdutores' && this.activeDossieTab === 'sec-dossie-contas' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerTab('sec-dossie-contas')">
            <i class="ph-bank me-1"></i> Contas &amp; PIX
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskSolicitacoes' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigate('diskSolicitacoes')">
            <i class="ph-hand-coins me-1"></i> Repasses
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskAprovacoes' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigate('diskAprovacoes')">
            <i class="ph-scales me-1"></i> Aprovações
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskContaFinanceira' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerAccountTab('retencoes')">
            <i class="ph-lock-key me-1"></i> Retenções
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskContaFinanceira' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerAccountTab('creditos')">
            <i class="ph-credit-card me-1"></i> Créditos
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskProdutores' && this.activeDossieTab === 'sec-dossie-comprovantes' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigateToProducerTab('sec-dossie-comprovantes')">
            <i class="ph-files me-1"></i> Comprovantes
          </button>
          <button class="btn btn-xs ${state.currentView === 'diskLedger' ? 'btn-primary' : 'btn-dark'}" onclick="window.app.navigate('diskLedger')">
            <i class="ph-book-open me-1"></i> Ledger
          </button>
        </div>
      </div>
    `;
  }

  navigateToProducerTab(tabKey) {
    const keyMap = {
      'resumo': 'sec-dossie-resumo',
      'sec-dossie-resumo': 'sec-dossie-resumo',
      'posicao': 'sec-dossie-posicao',
      'sec-dossie-posicao': 'sec-dossie-posicao',
      'eventos': 'sec-dossie-eventos',
      'sec-dossie-eventos': 'sec-dossie-eventos',
      'solicitacoes': 'sec-dossie-solicitacoes',
      'sec-dossie-solicitacoes': 'sec-dossie-solicitacoes',
      'contas': 'sec-dossie-contas',
      'sec-dossie-contas': 'sec-dossie-contas',
      'documentos': 'sec-dossie-documentos',
      'sec-dossie-documentos': 'sec-dossie-documentos',
      'comprovantes': 'sec-dossie-comprovantes',
      'sec-dossie-comprovantes': 'sec-dossie-comprovantes'
    };
    const target = keyMap[tabKey] || tabKey || 'sec-dossie-resumo';
    this.activeDossieTab = target;
    this.diskProdutoresTab = 'dossie';
    this.navigate('diskProdutores', 'dossie');
    setTimeout(() => {
      this.setDossieTab(target);
    }, 50);
  }

  navigateToProducerAccountTab(tabKey) {
    const anchorMap = {
      'conta': 'sec-conta',
      'retencoes': 'sec-retencoes',
      'obrigacoes': 'sec-obrigacoes',
      'creditos': 'sec-creditos',
      'estornos': 'sec-estornos',
      'ledger': 'sec-ledger'
    };
    const targetAnchor = anchorMap[tabKey] || tabKey || 'sec-conta';
    this.navigate('diskContaFinanceira');
    setTimeout(() => {
      const el = document.getElementById(targetAnchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  openProducerMasterModal(producerId = null) {
    const state = financialStore.getState();
    const isEdit = Boolean(producerId);
    const producer = isEdit ? (state.data.producers || []).find(p => p.id === producerId) : null;

    if (isEdit && !producer) {
      financialStore.showToast("Erro", "Produtor não localizado para edição.", "danger");
      return;
    }

    const title = isEdit ? `Editar Cadastro Mestre — ${producer.tradeName || producer.name}` : `Novo Cadastro Mestre de Produtor`;
    const subtitle = isEdit ? `CNPJ ${producer.cnpj} &bull; Registro Mestre Oficial Disk Ingressos` : `Homologação corporativa e contratual de produtor`;

    const html = `
      <div class="modal-card" style="max-width: 860px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3 sticky-top" style="z-index: 10;">
          <div class="d-flex align-items-center gap-2">
            <i class="ph-buildings fs-4 text-warning"></i>
            <div>
              <h5 class="modal-title fs-sm fw-bold mb-0">${title}</h5>
              <div class="fs-xxs text-white-50">${subtitle}</div>
            </div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>

        <form class="modal-body p-4 bg-light" onsubmit="event.preventDefault(); window.app.saveProducerMaster()">
          <input type="hidden" id="masterProdId" value="${isEdit ? producer.id : ''}">

          <!-- Bloco 1: Dados Empresariais -->
          <div class="card border-0 shadow-sm p-3 mb-3 bg-white">
            <h6 class="fw-bold fs-xs text-uppercase text-primary mb-3">
              <i class="ph-identification-card me-1"></i> 1. Dados Cadastrais &amp; Fiscais
            </h6>
            <div class="row g-2">
              <div class="col-md-7">
                <label class="form-label fs-xs fw-bold text-dark">Razão Social <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="masterProdName" value="${isEdit ? producer.name : ''}" required placeholder="Ex: Arte &amp; Shows Entretenimento Ltda.">
              </div>
              <div class="col-md-5">
                <label class="form-label fs-xs fw-bold text-dark">Nome Fantasia <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="masterProdTradeName" value="${isEdit ? (producer.tradeName || producer.name) : ''}" required placeholder="Ex: Arte Shows">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">CNPJ (14 dígitos) <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm font-monospace" id="masterProdCNPJ" value="${isEdit ? producer.cnpj : ''}" required placeholder="00.000.000/0000-00">
                <div class="form-text fs-xxs">Validação automática com impedimento de duplicidade.</div>
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Inscrição Estadual (IE)</label>
                <input type="text" class="form-control form-control-sm" id="masterProdIE" value="${isEdit ? (producer.companyDetails?.stateRegistration || '') : ''}" placeholder="Ex: 90123456-78 ou Isento">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Inscrição Municipal (IM)</label>
                <input type="text" class="form-control form-control-sm" id="masterProdIM" value="${isEdit ? (producer.companyDetails?.municipalRegistration || '') : ''}" placeholder="Ex: 876543-2">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Porte da Empresa</label>
                <select class="form-select form-select-sm" id="masterProdSize">
                  <option value="ME / EPP" ${isEdit && producer.companyDetails?.companySize === 'ME / EPP' ? 'selected' : ''}>Microempresa / EPP</option>
                  <option value="Médio Porte" ${!isEdit || producer.companyDetails?.companySize === 'Médio Porte' ? 'selected' : ''}>Médio Porte</option>
                  <option value="Grande Porte" ${isEdit && producer.companyDetails?.companySize === 'Grande Porte' ? 'selected' : ''}>Grande Porte / Corporativo</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Regime Tributário</label>
                <select class="form-select form-select-sm" id="masterProdTaxRegime">
                  <option value="Simples Nacional" ${isEdit && producer.companyDetails?.taxRegime === 'Simples Nacional' ? 'selected' : ''}>Simples Nacional</option>
                  <option value="Lucro Presumido" ${!isEdit || producer.companyDetails?.taxRegime === 'Lucro Presumido' ? 'selected' : ''}>Lucro Presumido</option>
                  <option value="Lucro Real" ${isEdit && producer.companyDetails?.taxRegime === 'Lucro Real' ? 'selected' : ''}>Lucro Real</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">CNAE Principal</label>
                <input type="text" class="form-control form-control-sm" id="masterProdCNAE" value="${isEdit ? (producer.companyDetails?.cnae || '90.01-9-02') : '90.01-9-02 - Produção musical e eventos'}">
              </div>
            </div>
          </div>

          <!-- Bloco 2: Governança, Contato & Endereço -->
          <div class="card border-0 shadow-sm p-3 mb-3 bg-white">
            <h6 class="fw-bold fs-xs text-uppercase text-primary mb-3">
              <i class="ph-map-pin me-1"></i> 2. Endereço &amp; Governança
            </h6>
            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label fs-xs fw-bold text-dark">E-mail Corporativo</label>
                <input type="email" class="form-control form-control-sm" id="masterProdEmail" value="${isEdit ? (producer.contactEmail || '') : ''}" placeholder="financeiro@empresa.com.br">
              </div>
              <div class="col-md-6">
                <label class="form-label fs-xs fw-bold text-dark">Telefone / WhatsApp</label>
                <input type="text" class="form-control form-control-sm" id="masterProdPhone" value="${isEdit ? (producer.phone || '') : ''}" placeholder="(41) 3300-0000">
              </div>
              <div class="col-md-6">
                <label class="form-label fs-xs fw-bold text-dark">Logradouro / Bairro</label>
                <input type="text" class="form-control form-control-sm" id="masterProdStreet" value="${isEdit ? (producer.address?.street || '') : ''}" placeholder="Rua / Avenida, Número, Bairro">
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-dark">Cidade</label>
                <input type="text" class="form-control form-control-sm" id="masterProdCity" value="${isEdit ? (producer.address?.city || 'Curitiba') : 'Curitiba'}">
              </div>
              <div class="col-md-1">
                <label class="form-label fs-xs fw-bold text-dark">UF</label>
                <input type="text" class="form-control form-control-sm text-uppercase" id="masterProdState" value="${isEdit ? (producer.address?.state || 'PR') : 'PR'}" maxlength="2">
              </div>
              <div class="col-md-2">
                <label class="form-label fs-xs fw-bold text-dark">CEP</label>
                <input type="text" class="form-control form-control-sm font-monospace" id="masterProdZip" value="${isEdit ? (producer.address?.zipCode || '') : ''}" placeholder="80000-000">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Status Operacional</label>
                <select class="form-select form-select-sm" id="masterProdStatus">
                  <option value="Ativo" ${!isEdit || producer.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                  <option value="Em Homologação" ${isEdit && producer.status === 'Em Homologação' ? 'selected' : ''}>Em Homologação</option>
                  <option value="Bloqueado" ${isEdit && producer.status === 'Bloqueado' ? 'selected' : ''}>Bloqueado</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Rating de Risco</label>
                <select class="form-select form-select-sm" id="masterProdRating">
                  <option value="Tier A - Estratégico" ${isEdit && producer.rating === 'Tier A - Estratégico' ? 'selected' : ''}>Tier A - Estratégico</option>
                  <option value="Tier B - Padrão" ${!isEdit || producer.rating === 'Tier B - Padrão' ? 'selected' : ''}>Tier B - Padrão</option>
                  <option value="Tier C - Alto Risco" ${isEdit && producer.rating === 'Tier C - Alto Risco' ? 'selected' : ''}>Tier C - Alto Risco</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Gerente de Conta Disk</label>
                <input type="text" class="form-control form-control-sm" id="masterProdManager" value="${isEdit ? (producer.accountManager || 'Carlos Menezes (Disk Ingressos)') : 'Carlos Menezes (Disk Ingressos)'}">
              </div>
            </div>
          </div>

          <!-- Bloco 3: Representante & Contato Financeiro -->
          <div class="card border-0 shadow-sm p-3 mb-3 bg-white">
            <h6 class="fw-bold fs-xs text-uppercase text-primary mb-3">
              <i class="ph-users me-1"></i> 3. Representante Legal &amp; Contato Financeiro
            </h6>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Representante Legal</label>
                <input type="text" class="form-control form-control-sm" id="masterRepName" value="${isEdit ? (producer.legalRepresentatives?.[0]?.name || '') : ''}" placeholder="Nome do Administrador">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">CPF do Representante</label>
                <input type="text" class="form-control form-control-sm font-monospace" id="masterRepCpf" value="${isEdit ? (producer.legalRepresentatives?.[0]?.cpf || '') : ''}" placeholder="000.000.000-00">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Cargo / Função</label>
                <input type="text" class="form-control form-control-sm" id="masterRepRole" value="${isEdit ? (producer.legalRepresentatives?.[0]?.role || 'Sócio Administrador') : 'Sócio Administrador'}">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Contato Financeiro</label>
                <input type="text" class="form-control form-control-sm" id="masterFinName" value="${isEdit ? (producer.financialContacts?.[0]?.name || '') : ''}" placeholder="Nome do Responsável Financeiro">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">E-mail Financeiro</label>
                <input type="email" class="form-control form-control-sm" id="masterFinEmail" value="${isEdit ? (producer.financialContacts?.[0]?.email || '') : ''}" placeholder="financeiro@empresa.com">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Telefone Direto</label>
                <input type="text" class="form-control form-control-sm" id="masterFinPhone" value="${isEdit ? (producer.financialContacts?.[0]?.phone || '') : ''}" placeholder="(41) 99999-0000">
              </div>
            </div>
          </div>

          <!-- Bloco 4: Contrato Master & Regras Comerciais -->
          <div class="card border-0 shadow-sm p-3 mb-3 bg-white">
            <h6 class="fw-bold fs-xs text-uppercase text-primary mb-3">
              <i class="ph-file-text me-1"></i> 4. Contrato Master &amp; Regras Comerciais Disk
            </h6>
            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Número do Contrato</label>
                <input type="text" class="form-control form-control-sm font-monospace" id="masterContractNumber" value="${isEdit ? (producer.contract?.number || '') : ''}" placeholder="DISK-CTR-2026-001">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Taxa Disk (%)</label>
                <input type="number" step="0.1" class="form-control form-control-sm" id="masterContractFee" value="${isEdit ? (producer.contract?.diskFeePercent || 10.0) : 10.0}">
              </div>
              <div class="col-md-4">
                <label class="form-label fs-xs fw-bold text-dark">Taxa de Processamento (%)</label>
                <input type="number" step="0.1" class="form-control form-control-sm" id="masterProcessingFee" value="${isEdit ? (producer.contract?.processingFeePercent || 2.9) : 2.9}">
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-dark">Taxa de Antecipação (% a.m.)</label>
                <input type="number" step="0.1" class="form-control form-control-sm" id="masterAnticipationRate" value="${isEdit ? (producer.contract?.anticipationRateMonthly || 2.0) : 2.0}">
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-dark">Reserva Retida Hold (%)</label>
                <input type="number" step="0.5" class="form-control form-control-sm" id="masterReservePercent" value="${isEdit ? (producer.contract?.retainedReservePercent || 5.0) : 5.0}">
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-dark">Limite de Crédito Master (R$)</label>
                <input type="number" step="1000" class="form-control form-control-sm" id="masterCreditLimit" value="${isEdit ? (producer.contract?.creditLimit || 100000.0) : 100000.0}">
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-dark">Regra de Liquidação Final</label>
                <input type="text" class="form-control form-control-sm" id="masterSettlementRule" value="${isEdit ? (producer.contract?.settlementDaysRule || 'D+2 após evento') : 'D+2 após evento'}">
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4 sticky-bottom bg-light p-2 border-top">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-sm btn-primary fw-bold px-4">
              <i class="ph-check me-1"></i> ${isEdit ? 'Salvar Alterações no Cadastro Mestre' : 'Homologar Novo Produtor'}
            </button>
          </div>
        </form>
      </div>
    `;
    this.showModal(html);
  }

  saveProducerMaster(event, maybeProducerId) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const st = financialStore.getState();

    if (event && event.target && event.target.elements && (maybeProducerId || event.target.elements.name)) {
      const f = Object.fromEntries(new FormData(event.target));
      const producerId = maybeProducerId || f.producerId || document.getElementById('masterProdId')?.value;
      const p = (st.data.producers || []).find(x => x.id === producerId);
      if (p) {
        Object.assign(p, {
          name: f.name || p.name,
          tradeName: f.tradeName || p.tradeName || f.name || p.name,
          cnpj: f.cnpj || p.cnpj,
          contactEmail: f.contactEmail || p.contactEmail,
          phone: f.phone || p.phone,
          status: f.status || p.status
        });
        const auditEntry = {
          at: new Date().toLocaleString('pt-BR'),
          timestamp: new Date().toLocaleString('pt-BR'),
          by: st.currentUser?.name || 'Financeiro Disk',
          user: st.currentUser?.name || 'Financeiro Disk',
          action: 'Cadastro mestre do produtor atualizado',
          summary: `Ficha mestre salva com trilha de auditoria: ${p.name}`
        };
        p.auditHistory = p.auditHistory || [];
        p.auditHistory.unshift(auditEntry);
        p.auditLog = p.auditLog || [];
        p.auditLog.unshift(auditEntry);

        financialStore.persist?.();
        this.closeModal();
        financialStore.notify?.();
        financialStore.showToast('Cadastro atualizado', 'Ficha mestre salva com trilha de auditoria.', 'success');
        this.render(financialStore.getState());
        return;
      }
    }

    const producerId = maybeProducerId || document.getElementById('masterProdId')?.value;
    const name = document.getElementById('masterProdName')?.value?.trim();
    const tradeName = document.getElementById('masterProdTradeName')?.value?.trim() || name;
    const cnpj = document.getElementById('masterProdCNPJ')?.value?.trim();
    const status = document.getElementById('masterProdStatus')?.value || 'Ativo';
    const rating = document.getElementById('masterProdRating')?.value || 'Tier B - Padrão';
    const accountManager = document.getElementById('masterProdManager')?.value?.trim() || 'Carlos Menezes (Disk Ingressos)';
    const contactEmail = document.getElementById('masterProdEmail')?.value?.trim() || '';
    const phone = document.getElementById('masterProdPhone')?.value?.trim() || '';

    if (!name) {
      alert("A Razão Social é obrigatória.");
      return;
    }
    if (!cnpj) {
      alert("O CNPJ é obrigatório.");
      return;
    }

    const cnpjValidation = financialStore.validateCNPJ(cnpj);
    if (!cnpjValidation.valid) {
      alert(`CNPJ inválido: ${cnpjValidation.error}`);
      return;
    }

    const payload = {
      name,
      tradeName,
      cnpj: cnpjValidation.formatted,
      status,
      rating,
      accountManager,
      contactEmail,
      phone,
      companyDetails: {
        stateRegistration: document.getElementById('masterProdIE')?.value?.trim() || '',
        municipalRegistration: document.getElementById('masterProdIM')?.value?.trim() || '',
        companySize: document.getElementById('masterProdSize')?.value || 'Médio Porte',
        taxRegime: document.getElementById('masterProdTaxRegime')?.value || 'Lucro Presumido',
        cnae: document.getElementById('masterProdCNAE')?.value?.trim() || '90.01-9-02 - Produção musical e eventos'
      },
      address: {
        street: document.getElementById('masterProdStreet')?.value?.trim() || '',
        city: document.getElementById('masterProdCity')?.value?.trim() || 'Curitiba',
        state: document.getElementById('masterProdState')?.value?.trim() || 'PR',
        zipCode: document.getElementById('masterProdZip')?.value?.trim() || ''
      },
      legalRepresentatives: [
        {
          name: document.getElementById('masterRepName')?.value?.trim() || name,
          cpf: document.getElementById('masterRepCpf')?.value?.trim() || '',
          role: document.getElementById('masterRepRole')?.value?.trim() || 'Representante Legal',
          email: contactEmail,
          phone: phone
        }
      ],
      financialContacts: [
        {
          name: document.getElementById('masterFinName')?.value?.trim() || tradeName,
          role: document.getElementById('masterFinRole')?.value?.trim() || 'Financeiro Principal',
          email: contactEmail,
          phone: phone
        }
      ],
      contract: {
        number: document.getElementById('masterContractNumber')?.value?.trim() || `DISK-CTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        diskFeePercent: Number(document.getElementById('masterContractFee')?.value || 10.0),
        processingFeePercent: Number(document.getElementById('masterProcessingFee')?.value || 2.9),
        anticipationRateMonthly: Number(document.getElementById('masterAnticipationRate')?.value || 2.0),
        settlementDaysRule: document.getElementById('masterSettlementRule')?.value?.trim() || 'D+2 após evento',
        retainedReservePercent: Number(document.getElementById('masterReservePercent')?.value || 5.0),
        creditLimit: Number(document.getElementById('masterCreditLimit')?.value || 100000.0)
      }
    };

    let result;
    if (producerId) {
      result = financialStore.updateProducer(producerId, payload);
      if (!result) return;
      financialStore.showToast("Cadastro Atualizado", `Ficha Mestre de ${tradeName} atualizada com sucesso.`, "success");
    } else {
      result = financialStore.createProducer(payload);
      if (!result) return;
      financialStore.setProducerContext(result.id);
      this.navigate('diskProdutores', 'dossie');
      financialStore.showToast("Produtor Homologado", `Novo produtor ${tradeName} homologado com sucesso.`, "success");
    }

    this.closeModal();
    this.render(financialStore.getState());
  }

  changeLanguage(lang) {
    const labels = {
      'pt': 'Português (BR)',
      'en': 'English',
      'es': 'Español'
    };
    const el = document.getElementById('current-language-text');
    if (el) el.innerText = labels[lang] || 'Português (BR)';
    financialStore.showToast("Idioma Alterado", `Interface configurada para ${labels[lang] || lang}`, "info");
  }

  clearNotifications(event) {
    if (event) event.preventDefault();
    const badge = document.getElementById('notification-badge');
    const countBadge = document.getElementById('notification-count-badge');
    const list = document.getElementById('notification-list-container');
    if (badge) badge.style.display = 'none';
    if (countBadge) countBadge.innerText = '0 Novas';
    if (list) {
      list.innerHTML = `
        <div class="p-3 text-center text-muted fs-xs">
          <i class="ph-check-circle fs-3 text-success d-block mb-1"></i>
          Todas as notificações foram marcadas como lidas.
        </div>
      `;
    }
    financialStore.showToast("Notificações", "Todas as notificações foram limpas", "success");
  }

  setDiskBalanceTab(tab) {
    this.diskBalanceTab = tab;
    financialStore.setView('diskSaldos');
  }

  openProducerDossier(producerId) {
    const state = financialStore.getState();
    const p = state.data.producers.find(x => x.id === producerId);
    if (!p) return financialStore.showToast('Dossiê', 'Produtor não encontrado.', 'danger');
    this.closeModal();
    this.selectProducerInDisk(producerId);
    this.setDiskProdutoresTab('dossie');
    this.navigate('diskProdutores', 'dossie');
  }

  openModal(html) {
    this.showModal(html);
  }

  refreshData() {
    financialStore.showToast("Dados Atualizados", "Valores recalculados a partir do estado persistido desta homologação.", "success");
    this.render(financialStore.getState());
  }

  // ==========================================================================
  // FICHA COMPLETA DE ANÁLISE NA CENTRAL DE APROVAÇÕES (SOLICITAÇÃO #REP-00291)
  // Fluxo Oficial: Solicitação → Análise → Decisão → Assinaturas Sequenciais → Liberação
  // ==========================================================================
  openApprovalSheet(approvalId) {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === approvalId);
    if (!item) return;

    const evt = state.data.events.find(e => e.id === item.eventId);
    const reqAmt = Number(item.requestedAmount ?? item.netAmount ?? 0);
    const availBefore = Number(item.auditPosition?.availableBefore ?? (item.type === 'Antecipação' ? (evt?.futureReceivables ?? 200000) : (evt?.availableBalance ?? 200000)));
    const retainedAndBlocked = Number(item.auditPosition?.retainedAndBlocked ?? (evt ? ((evt.retainedBalance || 0) + (evt.blockedBalance || 0)) : 40000));
    const computedAfter = Math.max(0, availBefore - reqAmt);

    const audit = {
      grossSales: Number(item.auditPosition?.grossSales ?? (evt?.grossSales ?? 500000)),
      netRevenue: Number(item.auditPosition?.netRevenue ?? (evt?.netRevenue ?? 450000)),
      availableBefore: availBefore,
      requested: reqAmt,
      retainedAndBlocked,
      availableAfter: computedAfter
    };

    const isRejected = item.status === 'Rejeitado';
    const isApproved = item.approvedBy != null;
    const prodSigned = item.signatures?.producer.signed;
    const diskSigned = item.signatures?.disk.signed;
    const isPaid = item.status === 'Pago';

    const html = `
      <div class="modal-card" style="max-width: 740px;">
        <div class="modal-header d-flex justify-content-between align-items-center" style="background: #16191f; color: white; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div>
            <span class="fs-xxs text-uppercase fw-bold text-primary" style="letter-spacing: 0.05em;">ANÁLISE DE SOLICITAÇÃO &bull; CENTRAL UNIFICADA DE APROVAÇÕES</span>
            <h4 class="fw-bold mb-0 text-white mt-1">
              SOLICITAÇÃO DE ${item.type.toUpperCase()} #${item.id}
            </h4>
          </div>
          <button class="modal-close-btn btn btn-sm btn-icon text-white-50 border-0" onclick="window.app.closeModal()">&times;</button>
        </div>

        <div class="modal-body p-4">
          
          <!-- Identificação Produtor & Evento -->
          <div class="row g-3 p-3 rounded mb-3" style="background: #f8fafc; border: 1px solid #e2e8f0;">
            <div class="col-sm-6">
              <div class="fs-xxs text-uppercase text-muted fw-bold">Produtor Solicitante</div>
              <div class="fs-base fw-bold text-dark mt-1">${item.producerName}</div>
              <div class="fs-xs text-primary fw-semibold">CNPJ Homologado na Plataforma Disk</div>
            </div>
            <div class="col-sm-6">
              <div class="fs-xxs text-uppercase text-muted fw-bold">Evento Vinculado</div>
              <div class="fs-base fw-bold text-primary mt-1">${item.eventName || 'Conta Geral'}</div>
              <div class="fs-xs text-muted">Solicitado em: ${item.requestDate}</div>
            </div>
          </div>

          <!-- Se estiver rejeitado, exibe bloco formal de rejeição -->
          ${isRejected ? `
            <div class="p-3 rounded mb-3" style="background: #fef2f2; border: 2px solid #ef4444;">
              <div class="fs-xs fw-bold text-uppercase text-danger d-flex align-items-center gap-1">
                <i class="ph-warning-octagon"></i> SOLICITAÇÃO REJEITADA PELO FINANCEIRO DISK
              </div>
              <div class="mt-2 fs-sm text-danger">
                <strong>Motivo Formal:</strong> ${item.rejection?.reasonCategory}
              </div>
              <div class="mt-1 fs-sm text-dark bg-white p-2 rounded border border-danger border-opacity-25">
                <strong>Justificativa:</strong> ${item.rejection?.observation}
              </div>
              <div class="mt-2 fs-xxs text-muted">
                Rejeitado por <strong>${item.rejection?.rejectedBy}</strong> em ${item.rejection?.rejectedAt} &bull; Recursos retidos devolvidos ao saldo disponível.
              </div>
            </div>
          ` : ''}

          <!-- POSIÇÃO FINANCEIRA DO EVENTO (MEMÓRIA DE CÁLCULO AUDITÁVEL) -->
          <div class="mb-4">
            <div class="fs-xs fw-bold text-uppercase text-muted mb-2 d-flex align-items-center justify-content-between">
              <span class="d-flex align-items-center gap-1"><i class="ph-chart-pie-slice text-primary"></i> POSIÇÃO FINANCEIRA DO EVENTO (MEMÓRIA DE CÁLCULO)</span>
              <span class="badge bg-light text-dark border fs-xxs">Fórmula Conciliada</span>
            </div>
            <div class="card shadow-sm border overflow-hidden">
              <div class="d-flex justify-content-between p-2 px-3 border-bottom fs-sm">
                <span class="text-muted">Vendas brutas apuradas do evento:</span>
                <strong>${formatCurrency(audit.grossSales)}</strong>
              </div>
              <div class="d-flex justify-content-between p-2 px-3 border-bottom fs-sm">
                <span class="text-muted">Receita líquida acumulada (após taxas Disk e estornos):</span>
                <strong>${formatCurrency(audit.netRevenue)}</strong>
              </div>
              <div class="d-flex justify-content-between p-2 px-3 border-bottom fs-xs text-muted" style="background: #f8fafc;">
                <span>Retenções contratuais e bloqueios cautelares do evento (já segregados):</span>
                <strong>${formatCurrency(audit.retainedAndBlocked)}</strong>
              </div>
              <div class="d-flex justify-content-between p-2 px-3 border-bottom fs-sm" style="background: #f0fdf4;">
                <span class="fw-bold text-success">(A) Saldo disponível do evento antes do repasse:</span>
                <strong class="text-success fs-base">${formatCurrency(audit.availableBefore)}</strong>
              </div>
              <div class="d-flex justify-content-between p-3 border-bottom fs-sm" style="background: #eff6ff;">
                <span class="fw-bold text-primary">(-) (B) Valor solicitado nesta operação:</span>
                <strong class="text-primary fs-5">- ${formatCurrency(audit.requested)}</strong>
              </div>
              <div class="d-flex justify-content-between p-2 px-3 fs-sm" style="background: #ecfdf5;">
                <div>
                  <span class="fw-bold text-dark">(=) Saldo residual disponível após repasse (A − B):</span>
                  <div class="fs-xxs text-muted">${formatCurrency(audit.availableBefore)} − ${formatCurrency(audit.requested)} = ${formatCurrency(audit.availableAfter)}</div>
                </div>
                <strong class="text-success fw-bold fs-base">${formatCurrency(audit.availableAfter)}</strong>
              </div>
            </div>
          </div>

          <!-- CHECKLIST DE CONFORMIDADE -->
          <div class="mb-4">
            <div class="fs-xs fw-bold text-uppercase text-muted mb-2 d-flex align-items-center gap-1">
              <i class="ph-shield-check text-success"></i> CHECKLIST DE CONFORMIDADE &amp; RISCO
            </div>
            <div class="p-3 rounded border" style="background: #f8fafc;">
              <div class="row g-2 fs-xs">
                <div class="col-sm-6 text-success fw-bold"><i class="ph-check-circle me-1"></i> Saldo suficiente apurado</div>
                <div class="col-sm-6 text-success fw-bold"><i class="ph-check-circle me-1"></i> Dados bancários validados (Bacen/CIP)</div>
                <div class="col-sm-6 text-success fw-bold"><i class="ph-check-circle me-1"></i> Evento regular com borderô</div>
                <div class="col-sm-6 text-success fw-bold"><i class="ph-check-circle me-1"></i> Sem bloqueio no contrato</div>
                <div class="col-sm-6 text-success fw-bold"><i class="ph-check-circle me-1"></i> Limite de repasse permitido</div>
                <div class="col-sm-6 text-warning fw-bold"><i class="ph-warning me-1"></i> ${item.checklist?.chargebackWarning || '2 chargebacks em acompanhamento'}</div>
              </div>
            </div>
          </div>

          <!-- ESTEIRA OFICIAL DE ASSINATURAS SEQUENCIAIS -->
          <div class="mb-3">
            <div class="fs-xs fw-bold text-uppercase text-muted mb-2 d-flex align-items-center gap-1">
              <i class="ph-signature text-warning"></i> ESTEIRA FORMAL DE ASSINATURAS DIGITAIS (TERMO #${item.documentId})
            </div>
            <div class="card p-3 shadow-sm border d-flex flex-column gap-3">
              
              <!-- 1. Decisão Operacional da Disk -->
              <div class="d-flex justify-content-between align-items-center fs-sm">
                <div>
                  <strong>1. Decisão Operacional Disk:</strong>
                  <div class="fs-xs text-muted">
                    ${isApproved ? `✓ Aprovado por ${item.approvedBy} em ${item.approvedAt}` : (isRejected ? '✕ Rejeitado formalmente' : '● Aguardando análise da Tesouraria')}
                  </div>
                </div>
                <span class="badge ${isApproved ? 'bg-success' : (isRejected ? 'bg-danger' : 'bg-warning')}">
                  ${isApproved ? 'Aprovado' : (isRejected ? 'Rejeitado' : 'Pendente')}
                </span>
              </div>

              <hr class="my-1 border-secondary border-opacity-10">

              <!-- 2. Assinatura do Produtor (PRIMEIRO) -->
              <div class="d-flex justify-content-between align-items-center fs-sm">
                <div>
                  <strong>2. Assinatura Digital do Produtor:</strong>
                  <div class="fs-xs text-muted">
                    ${prodSigned ? `✓ Assinado por ${item.signatures.producer.signedBy} em ${item.signatures.producer.signedAt}` : '○ Aguardando assinatura digital do Produtor no Portal'}
                  </div>
                </div>
                <div>
                  ${prodSigned ? `
                    <span class="badge bg-success"><i class="ph-check"></i> Assinado (ICP-Brasil)</span>
                  ` : `
                    <span class="badge bg-warning text-dark"><i class="ph-clock"></i> Aguardando Produtor</span>
                  `}
                </div>
              </div>

              <hr class="my-1 border-secondary border-opacity-10">

              <!-- 3. Assinatura do Financeiro Disk (SEMPRE POR ÚLTIMO) -->
              <div class="d-flex justify-content-between align-items-center fs-sm">
                <div>
                  <strong>3. Assinatura Digital Disk (SEMPRE POR ÚLTIMO):</strong>
                  <div class="fs-xs text-muted">
                    ${diskSigned ? `✓ Assinado por ${item.signatures.disk.signedBy} em ${item.signatures.disk.signedAt}` : (!prodSigned ? '🔒 Bloqueado: O Financeiro Disk assina após o Produtor' : '○ Liberado para assinatura final da Disk')}
                  </div>
                </div>
                <div>
                  ${diskSigned ? `
                    <span class="badge bg-success"><i class="ph-check"></i> Assinado por Último</span>
                  ` : (!prodSigned ? `
                    <span class="badge bg-secondary opacity-75"><i class="ph-lock"></i> Bloqueado</span>
                  ` : `
                    <span class="badge bg-primary"><i class="ph-pencil"></i> Liberado p/ Assinatura</span>
                  `)}
                </div>
              </div>

              <hr class="my-1 border-secondary border-opacity-10">

              <!-- 4. Liberação e Liquidação Financeira -->
              <div class="d-flex justify-content-between align-items-center fs-sm">
                <div>
                  <strong>4. Liberação &amp; Liquidação Bancária:</strong>
                  <div class="fs-xs text-muted">
                    ${isPaid ? `✓ Transferido via PIX em ${item.paidDate} (Aut: ${item.authCode})` : (diskSigned ? 'Documento formalizado → Pronto para transferência bancária' : 'Aguardando formalização')}
                  </div>
                </div>
                <span class="badge ${isPaid ? 'bg-success' : (diskSigned ? 'bg-info text-dark' : 'bg-light text-muted')}">
                  ${isPaid ? 'Pago' : (diskSigned ? 'Liberado p/ Pagamento' : 'Aguardando')}
                </span>
              </div>

            </div>
          </div>

          <!-- BOTOES DE AÇÃO OPERACIONAL BASEADOS NO ESTADO ATUAL -->
          <div class="modal-footer px-0 pb-0 pt-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="d-flex gap-2">
              ${!isApproved && !isRejected ? `
                <button class="btn btn-outline-danger btn-sm d-flex align-items-center gap-1" onclick="window.app.openRejectModal('${item.id}')">
                  <i class="ph-x-circle"></i> <span>Rejeitar Solicitação</span>
                </button>
              ` : ''}
              <button class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onclick="window.app.openAuditTrailModal('${item.id}')">
                <i class="ph-scroll"></i> <span>Ver Trilha de Auditoria</span>
              </button>
            </div>

            <div class="d-flex gap-2 flex-wrap align-items-center">
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.focusOperation('${item.id}', 'diskAprovacoes')"><i class="ph-check-square me-1"></i>Aprovação</button>
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.focusOperation('${item.id}', 'diskAssinaturas')"><i class="ph-signature me-1"></i>Assinaturas</button>
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.focusOperation('${item.id}', 'diskTesouraria')"><i class="ph-bank me-1"></i>Tesouraria</button>
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.focusOperation('${item.id}', 'diskLedger')"><i class="ph-book-open me-1"></i>Ledger</button>
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.focusOperation('${item.id}', 'diskConciliacao')"><i class="ph-arrows-left-right me-1"></i>Conciliação</button>
            </div>

            <div class="d-flex gap-2 align-items-center" id="actionDecisionGroup">
              ${!isApproved && !isRejected ? `
                <button class="btn btn-primary d-flex align-items-center gap-1" onclick="window.app.handleApproveByDisk('${item.id}')">
                  <i class="ph-check"></i> <span>Aprovar &amp; Gerar Termo</span>
                </button>
              ` : ''}

              ${isApproved && !prodSigned ? `
                <button class="btn btn-secondary text-muted" onclick="alert('O Financeiro Disk é sempre o último signatário. O documento deve ser assinado primeiro pelo Produtor no login dele.')" style="cursor: not-allowed; opacity: 0.85;">
                  <i class="ph-lock"></i> Assinatura Disk Bloqueada (Aguardando Produtor)
                </button>
                <button class="btn btn-outline-primary btn-sm" onclick="window.app.simulateProducerSign('${item.id}')" title="Simula a assinatura do produtor para acelerar a apresentação">
                  ⚡ Simular Assinatura do Produtor
                </button>
              ` : ''}

              ${isApproved && prodSigned && !diskSigned ? `
                <button class="btn btn-primary d-flex align-items-center gap-1" onclick="window.app.handleSignByDisk('${item.id}')">
                  <i class="ph-signature"></i> <span>Assinar Documento Agora (Financeiro Disk)</span>
                </button>
              ` : ''}

              ${diskSigned && !isPaid ? `
                <button class="btn btn-success d-flex align-items-center gap-1" onclick="window.app.handleFinalPayment('${item.id}')">
                  <i class="ph-money"></i> <span>Executar Pagamento / Transferência (PIX)</span>
                </button>
              ` : ''}

              ${isPaid ? `
                <button class="btn btn-primary d-flex align-items-center gap-1" onclick="window.switchGlobalRole('PRODUTOR'); window.app.navigate('repasses'); window.app.closeModal();">
                  <i class="ph-user"></i> <span>Ver no Login do Produtor (Pago) &rarr;</span>
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      </div>
    `;

    this.showModal(html);
  }

  handleApproveByDisk(requestId) {
    financialStore.approveOperationByDisk(requestId);
    this.openApprovalSheet(requestId);
  }

  handleSignByDisk(requestId) {
    financialStore.signDocumentAsDisk(requestId);
    this.openApprovalSheet(requestId);
  }

  simulateProducerSign(requestId) {
    financialStore.signDocumentAsProducer(requestId);
    this.openApprovalSheet(requestId);
  }

  handleFinalPayment(requestId) {
    financialStore.executeFinalTransfer(requestId);
    this.openApprovalSheet(requestId);
  }

  // ==========================================================================
  // REJEIÇÃO FORMAL COM DEVOLUÇÃO IMEDIATA DOS RECURSOS
  // ==========================================================================
  openRejectModal(requestId) {
    const html = `
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header bg-danger text-white">
          <h5 class="fw-bold mb-0 text-white"><i class="ph-warning-octagon me-1"></i> REJEITAR SOLICITAÇÃO #${requestId}</h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <form onsubmit="window.app.handleConfirmRejectSubmit(event, '${requestId}')">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Motivo da Rejeição *</label>
              <select class="form-select" id="rejectReasonCategory" required>
                <option value="Inconsistência de valores">Inconsistência de valores</option>
                <option value="Divergência bancária">Divergência bancária</option>
                <option value="Documentação pendente">Documentação pendente</option>
                <option value="Saldo insuficiente">Saldo insuficiente</option>
                <option value="Bloqueio financeiro">Bloqueio financeiro ativo no contrato</option>
                <option value="Divergência no borderô">Divergência no borderô de vendas</option>
                <option value="Outros">Outros motivos contratuais</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Observação &amp; Justificativa Detalhada *</label>
              <textarea class="form-control" id="rejectObservation" rows="4" placeholder="Descreva os detalhes da inconsistência para que o Produtor possa ajustar..." required style="resize: vertical;"></textarea>
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="notifyProducerCheck" checked>
              <label class="form-check-label fs-xs text-dark fw-semibold" for="notifyProducerCheck">
                Notificar o Produtor imediatamente por e-mail e painel
              </label>
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-danger">
                Confirmar Rejeição Formal
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  handleConfirmRejectSubmit(e, requestId) {
    e.preventDefault();
    const reasonCategory = document.getElementById('rejectReasonCategory').value;
    const observation = document.getElementById('rejectObservation').value;

    financialStore.rejectOperationByDisk(requestId, { reasonCategory, observation });
    this.openApprovalSheet(requestId);
  }

  showRejectionDetails(requestId) {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === requestId);
    if (!item || !item.rejection) return;

    const html = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header bg-danger bg-opacity-10 border-bottom border-danger">
          <h5 class="fw-bold mb-0 text-danger"><i class="ph-warning-octagon me-1"></i> Motivo da Rejeição: ${item.id}</h5>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="d-flex flex-column gap-3 fs-sm">
            <div>
              <span class="fs-xxs text-uppercase text-muted fw-bold">Categoria:</span>
              <div class="fw-bold text-danger fs-base mt-1">${item.rejection.reasonCategory}</div>
            </div>
            <div>
              <span class="fs-xxs text-uppercase text-muted fw-bold">Justificativa Formal da Disk:</span>
              <div class="p-3 bg-light rounded border mt-1 fs-sm">
                ${item.rejection.observation}
              </div>
            </div>
            <div class="d-flex justify-content-between fs-xs text-muted border-top pt-2">
              <span>Rejeitado por: <strong>${item.rejection.rejectedBy}</strong></span>
              <span>Data/Hora: <strong>${item.rejection.rejectedAt}</strong></span>
            </div>
          </div>
          <div class="modal-footer px-0 pb-0 pt-3 d-flex justify-content-end gap-2">
            <button class="btn btn-secondary" onclick="window.app.closeModal()">Fechar</button>
            <button class="btn btn-primary" onclick="window.app.closeModal(); window.app.openPayoutModal();">
              Nova Solicitação Ajustada
            </button>
          </div>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  // ==========================================================================
  // TRILHA DE AUDITORIA IMUTÁVEL
  // ==========================================================================
  openAuditTrailModal(requestId) {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === requestId);
    if (!item) return;

    const html = `
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <h5 class="fw-bold mb-0"><i class="ph-scroll text-primary me-2"></i> Trilha de Auditoria: ${item.id}</h5>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Registro cronológico e imutável de todas as ações de operadores e sistemas na operação:
          </p>
          <div class="d-flex flex-column gap-3 border-start border-primary border-2 ps-3 ms-2">
            ${(item.auditTrail || []).map(a => `
              <div class="position-relative">
                <div class="position-absolute rounded-circle bg-primary" style="width: 10px; height: 10px; left: -22px; top: 4px;"></div>
                <div class="d-flex justify-content-between fs-xs">
                  <strong class="text-dark">${a.action}</strong>
                  <span class="text-muted">${a.timestamp}</span>
                </div>
                <div class="fs-xs text-primary fw-semibold">${a.actor}</div>
                ${a.details ? `<div class="fs-xs text-muted mt-1 bg-light p-1 rounded">${a.details}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="modal-footer px-0 pb-0 pt-3 mt-3 d-flex justify-content-end">
            <button class="btn btn-primary" onclick="window.app.closeModal()">Fechar</button>
          </div>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  // ==========================================================================
  // MODAL OFICIAL DE ASSINATURA DIGITAL DO PRODUTOR (ICP-BRASIL)
  // REGRA: O Produtor assina em PRIMEIRO LUGAR. O Financeiro Disk assina por ÚLTIMO.
  // ==========================================================================
  openSignDocumentModal(requestId) {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === requestId);
    if (!item) return;

    const producer = state.activeProducer;
    const certNumber = `ICP-BRASIL-A1-${Math.floor(100000 + Math.random() * 900000)}`;
    const hashDoc = `SHA256:${Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    const html = `
      <div class="modal-card" style="max-width: 640px;">
        <div class="modal-header bg-success text-white d-flex justify-content-between align-items-center">
          <div>
            <span class="fs-xxs text-uppercase fw-bold opacity-75">PORTAL DE ASSINATURAS DIGITAIS &bull; ICP-BRASIL</span>
            <h5 class="fw-bold mb-0 text-white mt-1">
              <i class="ph-signature me-1"></i> Assinatura Digital do Produtor
            </h5>
          </div>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>

        <div class="modal-body p-4">
          <!-- Document Badge & Overview -->
          <div class="p-3 rounded mb-3" style="background: #f8fafc; border: 1px solid #e2e8f0;">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="badge bg-primary text-white fs-xxs fw-bold">${item.type.toUpperCase()}</span>
                <h5 class="fw-bold text-dark mt-1 mb-0">${item.documentTitle || 'Termo de Liberação Financeira'}</h5>
                <div class="fs-xs text-muted mt-1">Protocolo: <strong>${item.id}</strong> &bull; Documento: <strong>${item.documentId}</strong></div>
              </div>
              <div class="text-end">
                <div class="fs-xxs text-muted text-uppercase fw-bold">Valor da Operação</div>
                <div class="fs-4 fw-bold text-success">${formatCurrency(item.requestedAmount || item.netAmount)}</div>
              </div>
            </div>
          </div>

          <!-- Parties Identification -->
          <div class="row g-2 mb-3 fs-xs">
            <div class="col-sm-6 p-2 rounded bg-light border">
              <div class="text-muted fw-bold fs-xxs text-uppercase">1º Signatário (Produtor Responsável)</div>
              <div class="fw-bold text-dark mt-1">${state.currentUser.name}</div>
              <div class="text-muted">${producer.name} (CNPJ: ${producer.cnpj})</div>
            </div>
            <div class="col-sm-6 p-2 rounded bg-light border">
              <div class="text-muted fw-bold fs-xxs text-uppercase">2º Signatário (Financeiro Disk - Assina por Último)</div>
              <div class="fw-bold text-dark mt-1">Tesouraria Disk Ingressos</div>
              <div class="text-muted">Disk Ingressos S.A. (CNPJ: 14.829.301/0001-92)</div>
            </div>
          </div>

          <!-- Legal & Term Text Preview -->
          <div class="p-3 rounded mb-3 border fs-xs" style="background: #fffbeb; border-color: #fde68a; max-height: 140px; overflow-y: auto;">
            <strong>DECLARAÇÃO FORMAL DE AUTORIZAÇÃO:</strong><br>
            Pelo presente instrumento, o PRODUTOR supra qualificado confirma a veracidade das informações financeiras apuradas na bilheteria do evento <strong>${item.eventName}</strong>, autorizando a transferência do valor líquido de <strong>${formatCurrency(item.requestedAmount || item.netAmount)}</strong> para a conta bancária homologada no contrato: <strong>${item.bankName} (${item.bankAccount})</strong>.<br><br>
            Fica acordado que esta assinatura é vinculante e que a liberação dos recursos ocorrerá imediatamente após a assinatura de encerramento do FINANCEIRO DISK INGRESSOS.
          </div>

          <!-- ICP-Brasil Certificate Simulator -->
          <div class="p-3 rounded mb-3 border bg-white shadow-sm">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="ph-shield-check fs-4 text-success"></i>
              <div>
                <div class="fw-bold fs-xs text-dark">Certificado Digital ICP-Brasil A1 Detectado</div>
                <div class="fs-xxs text-muted">Emissor: Autoridade Certificadora Raiz Brasileira v5</div>
              </div>
            </div>
            <div class="fs-xxs text-muted font-monospace bg-light p-2 rounded border">
              Certificado: ${certNumber}<br>
              Hash do Termo: ${hashDoc}<br>
              IP de Conexão: 177.136.241.10 (Curitiba, PR) &bull; Timestamp D-0
            </div>
          </div>

          <!-- Alert regra central -->
          <div class="alert alert-info py-2 px-3 fs-xs d-flex align-items-center gap-2 mb-0">
            <i class="ph-info fs-5 flex-shrink-0"></i>
            <div>
              <strong>Regra de Governança:</strong> Após você assinar, o documento será enviado à Mesa da Disk para a assinatura final do Financeiro e pagamento imediato via PIX.
            </div>
          </div>

          <div class="modal-footer px-0 pb-0 pt-3 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="button" class="btn btn-success fw-bold px-4" onclick="window.app.handleConfirmProducerSign('${item.id}')">
              ✍️ Assinar Digitalmente Agora (ICP-Brasil)
            </button>
          </div>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  handleConfirmProducerSign(requestId) {
    financialStore.signByProducer(requestId);
    this.closeModal();
    this.navigate('repasses');
  }

  // ==========================================================================
  // COMPROVANTE OFICIAL DE PAGAMENTO / LIQUIDAÇÃO BANCÁRIA
  // ==========================================================================
  showPayoutReceipt(requestId) {
    const state = financialStore.getState();
    const item = state.data.approvalQueue.find(a => a.id === requestId);
    if (!item) return;

    const html = `
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header d-flex justify-content-between align-items-center" style="background: #0f172a; color: white;">
          <div>
            <span class="fs-xxs text-uppercase fw-bold text-success" style="letter-spacing: 0.05em;">COMPROVANTE OFICIAL DE TRANSFERÊNCIA &bull; PIX / TED</span>
            <h5 class="fw-bold mb-0 text-white mt-1">Liquidação Financeira #${item.id}</h5>
          </div>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>

        <div class="modal-body p-4 bg-white">
          <div class="text-center pb-3 border-bottom">
            <div class="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-2" style="width: 48px; height: 48px;">
              <i class="ph-check fs-2"></i>
            </div>
            <h4 class="fw-bold text-dark mb-0">${formatCurrency(item.requestedAmount || item.netAmount)}</h4>
            <div class="text-success fw-semibold fs-xs mt-1">Transferência PIX Realizada com Sucesso</div>
            <div class="text-muted fs-xxs">Data/Hora: ${item.paidDate || new Date().toLocaleString('pt-BR')}</div>
          </div>

          <div class="py-3 border-bottom d-flex flex-column gap-2 fs-xs">
            <div class="d-flex justify-content-between">
              <span class="text-muted">Autenticação Bancária (Bacen):</span>
              <strong class="font-monospace text-dark">${item.authCode || 'DISK-PIX-TED-8942189012'}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Termo Vinculado:</span>
              <strong class="text-primary">${item.documentId || 'DOC-8921'}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Tipo da Operação:</span>
              <strong>${item.type}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Evento de Origem:</span>
              <strong>${item.eventName}</strong>
            </div>
          </div>

          <div class="py-3 border-bottom fs-xs">
            <div class="fw-bold text-muted text-uppercase fs-xxs mb-2">Dados da Conta Creditada (Produtor)</div>
            <div class="p-2 rounded bg-light border">
              <div class="fw-bold text-dark">${item.producerName}</div>
              <div class="text-muted">Banco: ${item.bankName} &bull; ${item.bankAccount}</div>
              <div class="text-primary fw-semibold mt-1">Chave PIX: ${item.pixKey || 'Não informada'}</div>
            </div>
          </div>

          <div class="py-3 border-bottom fs-xs">
            <div class="fw-bold text-muted text-uppercase fs-xxs mb-2">Dados da Conta Debitada (Disk Ingressos)</div>
            <div class="p-2 rounded bg-light border">
              <div class="fw-bold text-dark">Disk Ingressos Intermediação de Eventos S.A.</div>
              <div class="text-muted">Banco do Brasil S.A. (001) &bull; Ag 1890-X &bull; C/C 55400-1</div>
              <div class="text-muted">CNPJ: 14.829.301/0001-92</div>
            </div>
          </div>

          <div class="p-2 mt-2 bg-success bg-opacity-10 border border-success rounded text-success fs-xxs text-center">
            🔒 <strong>Conciliação Ledger Concluída:</strong> Partidas dobradas registradas no Livro-Razão Contábil imutável Disk.
          </div>

          <div class="modal-footer px-0 pb-0 pt-3 d-flex justify-content-between align-items-center">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.print()">
              <i class="ph-printer me-1"></i> Imprimir Comprovante
            </button>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.app.closeModal()">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  // ==========================================================================
  // SIMULADOR DE ANTECIPAÇÃO DE RECEBÍVEIS
  // ==========================================================================
  onAnticipationRangeChange(val) {
    const numInput = document.getElementById('antNumberInput');
    if (numInput) numInput.value = val;
    this.updateAnticipationSimulation();
  }

  onAnticipationNumberChange(val) {
    const rangeInput = document.getElementById('antRangeInput');
    if (rangeInput) rangeInput.value = val;
    this.updateAnticipationSimulation();
  }

  updateAnticipationSimulation() {
    const state = financialStore.getState();
    const eventSelect = document.getElementById('antEventSelect');
    const rangeInput = document.getElementById('antRangeInput');
    const numInput = document.getElementById('antNumberInput');
    const simGross = document.getElementById('simGross');
    const simDiscount = document.getElementById('simDiscount');
    const simNet = document.getElementById('simNet');

    if (!numInput || !simGross || !simDiscount || !simNet) return;

    const val = parseFloat(numInput.value) || 0;
    const rate = state.data.anticipations?.monthlyRate || 2.0;
    const discount = val * (rate / 100);
    const net = val - discount;

    simGross.innerText = formatCurrency(val);
    simDiscount.innerText = `- ${formatCurrency(discount)}`;
    simNet.innerText = formatCurrency(net);
  }

  submitAnticipation() {
    const eventSelect = document.getElementById('antEventSelect');
    const numInput = document.getElementById('antNumberInput');
    const val = parseFloat(numInput?.value || 50000);
    const eventId = eventSelect?.value === 'all' ? 'evt-001' : (eventSelect?.value || 'evt-001');

    financialStore.requestAnticipation({
      eventId: eventId,
      grossAmount: val,
      amount: val,
      notes: "Solicitação gerada via Simulador Limitless de Antecipação de Cartão."
    });

    this.navigate('antecipacoes');
  }

  // ==========================================================================
  // FORMALIZAÇÃO DO FECHAMENTO DE BORDERÔ COM DUPLA ASSINATURA
  // ==========================================================================
  openSubmitBorderoModal(eventId) {
    const state = financialStore.getState();
    const bordero = state.data.bordero;
    const remaining = bordero.summary.remainingBalance || 511318.50;

    const html = `
      <div class="modal-card" style="max-width: 560px;">
        <div class="modal-header bg-primary text-white">
          <h5 class="fw-bold mb-0 text-white"><i class="ph-signature me-2"></i> Fechamento Oficial do Borderô</h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Submeta o encerramento do evento <strong>${bordero.eventName}</strong> para auditoria contábil e homologação da Disk Ingressos.
          </p>

          <div class="p-3 bg-light rounded border mb-3 fs-xs">
            <div class="d-flex justify-content-between mb-1">
              <span>Arrecadação Bruta Total:</span>
              <strong>${formatCurrency(bordero.summary.grossRevenue)}</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span>Resultado Líquido do Evento:</span>
              <strong class="text-success">${formatCurrency(bordero.summary.netEventBalance)}</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span>Repasses Anteriores Já Pagos:</span>
              <strong class="text-muted">-${formatCurrency(bordero.summary.alreadyTransferred)}</strong>
            </div>
            <hr class="my-1">
            <div class="d-flex justify-content-between fs-sm fw-bold">
              <span>Saldo Remanescente a Liquidar:</span>
              <span class="text-primary">${formatCurrency(remaining)}</span>
            </div>
          </div>

          <div class="alert alert-warning fs-xs py-2 px-3 mb-3">
            🔒 <strong>Regra de Fechamento:</strong> Este fechamento exige dupla assinatura digital vinculante. O Produtor assina em primeiro lugar e a Auditoria Financeira Disk assina por último para encerramento do borderô.
          </div>

          <form onsubmit="window.app.handleBorderoClosureSubmit(event, '${eventId}')">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Observações da Produção</label>
              <textarea class="form-control" id="borderoNotes" rows="3" placeholder="Informações de encerramento, conferência de cortesias ou deduções específicas..."></textarea>
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                Enviar Fechamento para Homologação Disk
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  handleBorderoClosureSubmit(e, eventId) {
    e.preventDefault();
    const notes = document.getElementById('borderoNotes')?.value;
    financialStore.submitBorderoClosure({ eventId, notes });
    this.closeModal();
    this.navigate('repasses');
  }

  // ==========================================================================
  // GESTÃO DE CONTAS BANCÁRIAS DO PRODUTOR
  // ==========================================================================
  openAddBankModal() {
    const producer = financialStore.getState().activeProducer;
    const html = `
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header bg-primary text-white">
          <h5 class="fw-bold mb-0 text-white"><i class="ph-credit-card me-2"></i> Cadastrar Nova Conta Bancária PJ</h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Cadastre uma conta corrente PJ homologada vinculada ao CNPJ <strong>${producer.cnpj}</strong>.
          </p>

          <form onsubmit="window.app.handleAddBankSubmit(event)">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Instituição Bancária *</label>
              <select class="form-select" id="newBankName" required>
                <option value="Banco do Brasil (001)">Banco do Brasil (001)</option>
                <option value="Itaú Unibanco (341)">Itaú Unibanco (341)</option>
                <option value="Banco Bradesco (237)">Banco Bradesco (237)</option>
                <option value="Santander Brasil (033)">Santander Brasil (033)</option>
                <option value="BTG Pactual (208)">BTG Pactual (208)</option>
                <option value="Nubank PJ (260)">Nubank PJ (260)</option>
                <option value="Banco Inter (077)">Banco Inter (077)</option>
                <option value="C6 Bank (336)">C6 Bank (336)</option>
              </select>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-sm-4">
                <label class="form-label fw-bold fs-xs text-uppercase text-muted">Agência *</label>
                <input type="text" class="form-control" id="newBankAgency" placeholder="Ex: 0432" required>
              </div>
              <div class="col-sm-8">
                <label class="form-label fw-bold fs-xs text-uppercase text-muted">Conta com Dígito *</label>
                <input type="text" class="form-control" id="newBankAccount" placeholder="Ex: 48291-0" required>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Chave PIX Homologada *</label>
              <input type="text" class="form-control" id="newBankPix" value="${producer.cnpj}" required>
              <div class="form-text fs-xxs text-muted">Chaves homologadas devem coincidir com o CNPJ ou e-mail da produtora.</div>
            </div>

            <div class="form-check mb-3">
              <input class="form-check-input" type="checkbox" id="newBankDefault">
              <label class="form-check-label fs-xs text-dark fw-semibold" for="newBankDefault">
                Definir como conta padrão prioritária para repasses
              </label>
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Validar &amp; Salvar Conta</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  handleAddBankSubmit(e) {
    e.preventDefault();
    const bankName = document.getElementById('newBankName').value;
    const agency = document.getElementById('newBankAgency').value;
    const accountNumber = document.getElementById('newBankAccount').value;
    const pixKey = document.getElementById('newBankPix').value;
    const isDefault = document.getElementById('newBankDefault').checked;

    financialStore.addBankAccount({ bankName, agency, accountNumber, pixKey, isDefault });
    this.closeModal();
    this.navigate('dadosBancarios');
  }

  // ==========================================================================
  // UTILITÁRIOS DA VISÃO DISK E GLOBAIS
  // ==========================================================================
  openProducerAccount(producerId) {
    financialStore.setSelectedProducer(producerId);
    this.navigate('diskProdutores');
  }

  toggleRole(role) {
    if (role === 'producer') {
      window.switchGlobalRole('PRODUTOR');
    } else {
      window.switchGlobalRole('FINANCEIRO');
    }
  }

  renderDiskAprovacoesView(filterType) {
    this.navigate('diskAprovacoes', filterType);
  }

  searchApprovalQueue(query) {
    const q = (query || '').toLowerCase();
    const rows = document.querySelectorAll('#approvalTable tbody tr');
    rows.forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  searchExtrato(query) {
    const q = (query || '').toLowerCase();
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  }

  filterExtrato(filterType) {
    financialStore.setStatementFilter(filterType);
  }

  exportCurrentView(format) {
    financialStore.showToast("Exportação Iniciada", `Exportando dados da visão atual em formato .${format.toUpperCase()}`, "info");
  }

  generateReport(reportType) {
    financialStore.showToast("Relatório Gerado", `Relatório financeiro "${reportType}" compilado e pronto para download.`, "success");
  }

  approvePayoutDisk(payoutId) {
    this.openApprovalSheet(payoutId);
  }

  // ==========================================================================
  // MODAIS DE OPERAÇÃO DO PRODUTOR
  // ==========================================================================
  // MODAL DE REPASSE COM MOTOR DE ELEGIBILIDADE & EXCEÇÕES ADMINISTRATIVAS
  // ==========================================================================
  openPayoutModal(defaultEventId = null) {
    const state = financialStore.getState();
    if (state.viewMode === 'disk') {
      return this.openExceptionalPayoutAuthorization(defaultEventId);
    }
    let producer = state.activeProducer;
    let selectedEvent = null;

    if (defaultEventId) {
      selectedEvent = state.data.events.find(e => e.id === defaultEventId);
      if (selectedEvent && (!producer || producer.id === 'all' || producer.id !== selectedEvent.producerId)) {
        producer = state.data.producers.find(p => p.id === selectedEvent.producerId) || producer;
      }
    }

    if (!producer || producer.id === 'all') {
      producer = state.data.producers[0];
    }

    const events = state.data.events.filter(e => e.producerId === producer.id);
    if (!selectedEvent) {
      selectedEvent = events.find(e => e.id === defaultEventId) || events[0] || state.data.events[0];
    }
    const bankAccounts = (producer.bankAccounts && producer.bankAccounts.length > 0) ? producer.bankAccounts : (state.data.producers[0]?.bankAccounts || []);

    const elig = financialStore.calculatePayoutEligibility(selectedEvent.id) || {
      salesTarget: 1000000,
      grossSales: selectedEvent.grossSales,
      progressPercent: 50,
      minSalesPercent: 50,
      releasePercent: 20,
      ruleMet: true,
      faltamVendas: 0,
      limiteBruto: selectedEvent.grossSales * 0.2,
      totalDeductions: 0,
      disponivelFinal: selectedEvent.availableBalance,
      isExceptional: false,
      status: 'HABILITADO'
    };

    const isBlocked = !elig.ruleMet && !elig.isExceptional;
    const maxAmount = Math.max(0, elig.disponivelFinal);
    const initialAmount = isBlocked ? 0 : Math.min(Math.max(100, Math.min(80000, maxAmount)), maxAmount);
    const hasValidBank = bankAccounts.some(b => ['Ativa', 'Validada & Ativa'].includes(b.status));
    const canSubmit = !isBlocked && maxAmount > 0 && hasValidBank;

    const html = `
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header bg-success text-white">
          <h5 class="fw-bold mb-0 text-white"><i class="ph-hand-coins me-2"></i> Solicitar Repasse Financeiro</h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Transfira seu saldo elegível para a conta bancária homologada de <strong>${producer.name}</strong>.
          </p>

          <form id="payoutForm" onsubmit="window.app.handlePayoutSubmit(event)">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Origem do Saldo (Evento)</label>
              <select class="form-select" id="modalPayoutEvent" onchange="window.app.onPayoutEventSelect(this.value)">
                ${events.map(e => `
                  <option value="${e.id}" ${e.id === selectedEvent.id ? 'selected' : ''}>
                    ${e.name} (${Math.round((e.grossSales / (e.salesTarget || 1000000)) * 100)}% vendido &bull; Livre: ${formatCurrency(financialStore.calculatePayoutEligibility(e.id)?.disponivelFinal || 0)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Box Dinâmico de Elegibilidade do Evento -->
            <div id="modalEligibilityBox" class="p-3 mb-3 rounded" style="background: ${isBlocked ? '#fffbeb' : (elig.isExceptional ? '#eff6ff' : '#ecfdf5')}; border: 1px solid ${isBlocked ? '#fde68a' : (elig.isExceptional ? '#bfdbfe' : '#a7f3d0')};">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge ${isBlocked ? 'bg-warning text-dark' : (elig.isExceptional ? 'bg-primary text-white' : 'bg-success text-white')}" style="font-weight: 700; font-size: 0.75rem;">
                  ${isBlocked ? '🔒 REPASSE BLOQUEADO (< ' + elig.minSalesPercent + '%)' : (elig.isExceptional ? '🛡️ EXCEÇÃO ADMINISTRATIVA AUTORIZADA' : '✓ REPASSE HABILITADO')}
                </span>
                <span class="fw-bold fs-xs text-dark">${elig.progressPercent}% vendido (${formatCurrency(elig.grossSales)})</span>
              </div>
              ${isBlocked ? `
                <div class="text-amber-900 fs-xs mt-2" style="line-height: 1.35;">
                  <strong>Regra de liberação pendente:</strong> O evento atingiu ${elig.progressPercent}% de vendas da meta de ${formatCurrency(elig.salesTarget)}. Faltam <strong>${formatCurrency(elig.faltamVendas)}</strong> em vendas para liberar o primeiro repasse de ${elig.releasePercent}%.
                </div>
              ` : `
                <div class="d-flex justify-content-between text-muted fs-xxs mt-2">
                  <span>Limite (${elig.releasePercent}%): <strong>${formatCurrency(elig.limiteBruto)}</strong></span>
                  <span>Deduções anteriores: <strong>-${formatCurrency(elig.totalDeductions)}</strong></span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1 pt-1 border-top">
                  <span class="fw-bold text-dark fs-xs">Disponível para solicitar:</span>
                  <span class="fw-bold text-success fs-sm">${formatCurrency(elig.disponivelFinal)}</span>
                </div>
                ${elig.isExceptional && elig.activeException ? `
                  <div class="fs-xxs text-primary mt-1">★ Liberado por Exceção Administrativa: "${elig.activeException.reason}"</div>
                ` : ''}
              `}
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Valor a Transferir (R$)</label>
              <input type="number" class="form-control fw-bold" id="modalPayoutAmount" min="100" max="${maxAmount}" value="${initialAmount}" required step="0.01" ${isBlocked || maxAmount <= 0 ? 'disabled' : ''}>
              <div class="form-text fs-xs text-muted">Máximo disponível neste evento pela política: <strong id="modalMaxAvailable" class="${maxAmount > 0 ? 'text-success' : 'text-danger'}">${formatCurrency(maxAmount)}</strong></div>
            </div>

            ${hasValidBank ? `
              <div class="mb-3">
                <label class="form-label fw-bold fs-xs text-uppercase text-muted">Conta Bancária de Destino</label>
                <select class="form-select" id="modalPayoutBank">
                  ${bankAccounts.filter(b => ['Ativa', 'Validada & Ativa'].includes(b.status)).map(b => `
                    <option value="${b.id}">
                      ${b.bankName} - Ag: ${b.agency} Conta: ${b.accountNumber} (${b.isDefault ? 'Principal' : 'Secundária'})
                    </option>
                  `).join('')}
                </select>
                <div class="form-text fs-xs text-muted">Mesmo titular: ${producer.cnpj}</div>
              </div>
            ` : `
              <div class="alert alert-danger p-3 mb-3" style="font-size: 0.85rem; border-left: 4px solid #dc2626; background: #fef2f2; color: #991b1b; border-radius: 6px;">
                <div class="fw-bold mb-1"><i class="ph-warning-octagon"></i> Pagamento bloqueado — Produtor sem conta bancária validada.</div>
                <div style="font-size: 0.78rem; opacity: 0.9; margin-bottom: 8px;">Para solicitar repasses, é obrigatório possuir ao menos uma conta bancária PJ homologada via Bacen/CIP.</div>
                <button type="button" class="btn btn-sm btn-warning fw-bold" onclick="window.app.closeModal(); window.app.navigate('diskProdutores', 'contas'); window.app.openAddProducerBankModal('${producer.id}')">
                  Cadastrar Conta Bancária →
                </button>
              </div>
            `}

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Observações Internas (Opcional)</label>
              <input type="text" class="form-control" id="modalPayoutNotes" placeholder="Ex: Pagamento de cachê artístico / fornecedor de som">
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" id="modalPayoutSubmitBtn" class="btn btn-success" ${!canSubmit ? 'disabled' : ''}>Confirmar e Enviar para Análise</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  onPayoutEventSelect(eventId) {
    const state = financialStore.getState();
    const event = state.data.events.find(e => e.id === eventId);
    if (!event) return;

    const elig = financialStore.calculatePayoutEligibility(eventId) || {
      salesTarget: 1000000,
      grossSales: event.grossSales,
      progressPercent: 50,
      minSalesPercent: 50,
      releasePercent: 20,
      ruleMet: true,
      faltamVendas: 0,
      limiteBruto: event.grossSales * 0.2,
      totalDeductions: 0,
      disponivelFinal: event.availableBalance,
      isExceptional: false,
      status: 'HABILITADO'
    };

    const isBlocked = !elig.ruleMet && !elig.isExceptional;
    const maxAmount = Math.max(0, elig.disponivelFinal);
    const amountInput = document.getElementById('modalPayoutAmount');
    const submitBtn = document.getElementById('modalPayoutSubmitBtn');
    const maxLabel = document.getElementById('modalMaxAvailable');
    const box = document.getElementById('modalEligibilityBox');

    if (amountInput) {
      amountInput.max = maxAmount;
      amountInput.value = isBlocked ? 0 : Math.min(80000, maxAmount);
      amountInput.disabled = isBlocked || maxAmount <= 0;
    }
    if (maxLabel) {
      maxLabel.innerText = formatCurrency(maxAmount);
      maxLabel.className = maxAmount > 0 ? 'text-success' : 'text-danger';
    }
    if (submitBtn) {
      submitBtn.disabled = isBlocked || maxAmount <= 0;
    }
    if (box) {
      box.style.background = isBlocked ? '#fffbeb' : (elig.isExceptional ? '#eff6ff' : '#ecfdf5');
      box.style.borderColor = isBlocked ? '#fde68a' : (elig.isExceptional ? '#bfdbfe' : '#a7f3d0');
      box.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge ${isBlocked ? 'bg-warning text-dark' : (elig.isExceptional ? 'bg-primary text-white' : 'bg-success text-white')}" style="font-weight: 700; font-size: 0.75rem;">
            ${isBlocked ? '🔒 REPASSE BLOQUEADO (< ' + elig.minSalesPercent + '%)' : (elig.isExceptional ? '🛡️ EXCEÇÃO ADMINISTRATIVA AUTORIZADA' : '✓ REPASSE HABILITADO')}
          </span>
          <span class="fw-bold fs-xs text-dark">${elig.progressPercent}% vendido (${formatCurrency(elig.grossSales)})</span>
        </div>
        ${isBlocked ? `
          <div class="text-amber-900 fs-xs mt-2" style="line-height: 1.35;">
            <strong>Regra de liberação pendente:</strong> O evento atingiu ${elig.progressPercent}% de vendas da meta de ${formatCurrency(elig.salesTarget)}. Faltam <strong>${formatCurrency(elig.faltamVendas)}</strong> em vendas para liberar o primeiro repasse de ${elig.releasePercent}%.
          </div>
        ` : `
          <div class="d-flex justify-content-between text-muted fs-xxs mt-2">
            <span>Limite (${elig.releasePercent}%): <strong>${formatCurrency(elig.limiteBruto)}</strong></span>
            <span>Deduções anteriores: <strong>-${formatCurrency(elig.totalDeductions)}</strong></span>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-1 pt-1 border-top">
            <span class="fw-bold text-dark fs-xs">Disponível para solicitar:</span>
            <span class="fw-bold text-success fs-sm">${formatCurrency(elig.disponivelFinal)}</span>
          </div>
          ${elig.isExceptional && elig.activeException ? `
            <div class="fs-xxs text-primary mt-1">★ Liberado por Exceção Administrativa: "${elig.activeException.reason}"</div>
          ` : ''}
        `}
      `;
    }
  }

  handlePayoutSubmit(e) {
    e.preventDefault();
    const eventId = document.getElementById('modalPayoutEvent').value;
    const amount = document.getElementById('modalPayoutAmount').value;
    const bankAccountId = document.getElementById('modalPayoutBank').value;
    const notes = document.getElementById('modalPayoutNotes')?.value || '';

    const payout = financialStore.requestPayout({ eventId, amount, bankAccountId, notes });
    if (!payout) return;

    this.closeModal();
    this.navigate('repasses');
  }

  onRepasseViewEventSelect(eventId) {
    financialStore.state.selectedEventId = eventId;
    this.navigate('repasses');
  }

  openExceptionalPayoutAuthorization(defaultEventId = null) {
    return this.openExceptionalAuthorizationModal(defaultEventId);
  }

  openExceptionalAuthorizationModal(defaultEventId = null) {
    const state = financialStore.getState();
    const events = state.data.events || [];
    const selectedEvent = defaultEventId ? events.find(e => e.id === defaultEventId) : events[0];

    const html = `
      <div class="modal-card" style="max-width: 560px;">
        <div class="modal-header bg-primary text-white">
          <h5 class="fw-bold mb-0 text-white">
            <i class="ph-shield-plus me-2"></i> Autorizar Repasse Excepcional (Trava Humana)
          </h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Emita uma autorização administrativa pontual para liberar repasse financeiro antes do gatilho de 50% de vendas ou com condições comerciais especiais acordadas pela Diretoria Disk.
          </p>

          <form onsubmit="window.app.handleExceptionalAuthorizationSubmit(event)">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Evento / Produtor Beneficiário</label>
              <select class="form-select" id="authEventSelect" required onchange="window.app.onAuthEventSelect(this.value)">
                ${events.map(ev => `
                  <option value="${ev.id}" ${selectedEvent && ev.id === selectedEvent.id ? 'selected' : ''}>
                    ${ev.name} &bull; ${ev.producerName} (Saldo: ${formatCurrency(ev.availableBalance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Valor Autorizado para o Repasse (R$)</label>
              <input type="number" class="form-control fw-bold text-primary" id="authAmountInput" min="100" max="${selectedEvent ? selectedEvent.availableBalance : 500000}" value="${selectedEvent ? Math.min(50000, selectedEvent.availableBalance) : 25000}" required step="0.01">
              <div class="form-text fs-xxs text-muted">Saldo financeiro disponível do evento: <strong id="authEventMaxAvailable" class="text-success">${formatCurrency(selectedEvent ? selectedEvent.availableBalance : 0)}</strong></div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">
                Justificativa Obrigatória &bull; Trilha de Auditoria
              </label>
              <textarea class="form-control fs-xs" id="authReasonInput" rows="3" placeholder="Ex: Adiantamento emergencial de cachê artístico acordado em comitê comercial Disk." required minlength="5"></textarea>
              <div class="form-text fs-xxs text-muted">Esta justificativa fica registrada de forma imutável com seu usuário, IP e timestamp nos autos da operação.</div>
            </div>

            <div class="p-2 mb-3 bg-light border rounded text-muted fs-xxs">
              🛡️ <strong>Segregação de Funções:</strong> A concessão desta autorização não liquida o repasse; ela apenas habilita o produtor a enviar o pedido para a esteira normal de conferência, assinaturas e tesouraria.
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary btn-sm fw-bold px-3">
                <i class="ph-shield-check me-1"></i> Emitir Autorização Excepcional
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  onAuthEventSelect(eventId) {
    const state = financialStore.getState();
    const event = state.data.events.find(e => e.id === eventId);
    if (event) {
      const amountInput = document.getElementById('authAmountInput');
      const maxLabel = document.getElementById('authEventMaxAvailable');
      if (amountInput) {
        amountInput.max = event.availableBalance;
        amountInput.value = Math.min(50000, event.availableBalance);
      }
      if (maxLabel) {
        maxLabel.innerText = formatCurrency(event.availableBalance);
      }
    }
  }

  handleExceptionalAuthorizationSubmit(e) {
    e.preventDefault();
    const eventId = document.getElementById('authEventSelect')?.value;
    const amount = document.getElementById('authAmountInput')?.value;
    const reason = document.getElementById('authReasonInput')?.value;

    const auth = financialStore.authorizeExceptionalPayout({ eventId, amount, reason });
    if (!auth) return;

    this.closeModal();
    this.navigate(this.currentView || 'diskPoliticaRepasse', this.currentFilterArg);
  }

  handleSaveGlobalPayoutPolicy(e) {
    e.preventDefault();
    const minSales = Number(document.getElementById('policyMinSales')?.value || 50);
    const releasePercent = Number(document.getElementById('policyReleasePercent')?.value || 20);
    const refunds = Boolean(document.getElementById('policyRefunds')?.checked);
    const cb = Boolean(document.getElementById('policyChargebacks')?.checked);
    const mdr = Boolean(document.getElementById('policyMdr')?.checked);
    const bank = Boolean(document.getElementById('policyBank')?.checked);
    const approval = Boolean(document.getElementById('policyApproval')?.checked);
    const sig = Boolean(document.getElementById('policySignature')?.checked);
    const exc = Boolean(document.getElementById('policyException')?.checked);

    financialStore.updatePayoutPolicy({
      scope: 'global',
      policy: {
        minSalesPercent: minSales,
        releasePercent,
        considerRefunds: refunds,
        considerChargebacks: cb,
        considerMdr: mdr,
        requireValidatedBank: bank,
        requireDiskApproval: approval,
        requireDigitalSignature: sig,
        allowAdministrativeException: exc
      }
    });

    this.navigate(this.currentView || 'diskPoliticaRepasse', this.currentFilterArg);
  }

  cancelExceptionalAuthorization(authId) {
    if (!confirm('Deseja realmente revogar esta autorização excepcional? O evento voltará à regra padrão da política.')) return;
    const exc = (financialStore.data.exceptionalAuthorizations || []).find(e => e.id === authId);
    if (exc) {
      exc.status = 'CANCELADA';
      financialStore.showToast('Autorização Cancelada', `Protocolo ${exc.protocol} revogado com sucesso.`, 'info');
      financialStore.persist();
      financialStore.notify();
      this.navigate(this.currentView || 'diskPoliticaRepasse', this.currentFilterArg);
    }
  }

  // Modal de Transferência entre Eventos (Gestão de Saldos do Produtor)
  openTransferModal() {
    const state = financialStore.getState();
    const producer = state.activeProducer;
    const events = state.data.events.filter(e => e.producerId === producer.id);

    if (events.length < 2) {
      alert("A transferência entre eventos requer pelo menos 2 eventos ativos.");
      return;
    }

    const html = `
      <div class="modal-card" style="max-width: 540px;">
        <div class="modal-header bg-primary text-white">
          <h5 class="fw-bold mb-0 text-white"><i class="ph-arrows-clockwise me-2"></i> Transferência de Saldo entre Eventos</h5>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            Realoque saldo disponível entre eventos de <strong>${producer.name}</strong> para equilibrar fluxo de caixa.
          </p>

          <form onsubmit="window.app.handleTransferSubmit(event)">
            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Evento de Origem (Debitar)</label>
              <select class="form-select" id="transferOriginEvent" required>
                ${events.map((e, idx) => `
                  <option value="${e.id}" ${idx === 0 ? 'selected' : ''}>
                    ${e.name} (Disponível: ${formatCurrency(e.availableBalance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Evento de Destino (Creditar)</label>
              <select class="form-select" id="transferDestEvent" required>
                ${events.map((e, idx) => `
                  <option value="${e.id}" ${idx === 1 ? 'selected' : ''}>
                    ${e.name} (Saldo Atual: ${formatCurrency(e.availableBalance)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Valor a Transferir (R$)</label>
              <input type="number" class="form-control" id="transferAmount" min="10" value="25000" required step="0.01">
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-xs text-uppercase text-muted">Justificativa Operacional</label>
              <input type="text" class="form-control" id="transferReason" placeholder="Ex: Aporte emergencial de verba de marketing" required>
            </div>

            <div class="modal-footer px-0 pb-0 pt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar Transferência</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.showModal(html);
  }

  handleTransferSubmit(e) {
    e.preventDefault();
    const originId = document.getElementById('transferOriginEvent').value;
    const destId = document.getElementById('transferDestEvent').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const reason = document.getElementById('transferReason').value;

    if (originId === destId) {
      alert("Selecione eventos diferentes para origem e destino.");
      return;
    }

    const state = financialStore.getState();
    const originEvent = state.data.events.find(ev => ev.id === originId);
    const destEvent = state.data.events.find(ev => ev.id === destId);

    if (!originEvent || originEvent.availableBalance < amount) {
      alert(`Saldo insuficiente no evento de origem (${formatCurrency(originEvent?.availableBalance || 0)}).`);
      return;
    }

    // Executa a transferência no mockData
    originEvent.availableBalance -= amount;
    destEvent.availableBalance += amount;

    // Registra no Ledger de partidas dobradas
    if (state.data.ledgerEntries) {
      state.data.ledgerEntries.unshift({
        id: `LED-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        description: `Transferência interna entre eventos: ${originEvent.name} ➔ ${destEvent.name} (${reason})`,
        debitAccount: `Passivo Produtor: ${destEvent.name}`,
        creditAccount: `Passivo Produtor: ${originEvent.name}`,
        amount: amount,
        reference: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
        reconciled: true
      });
    }

    this.closeModal();
    financialStore.showToast(
      "Transferência Concluída",
      `${formatCurrency(amount)} transferido de ${originEvent.name} para ${destEvent.name}`,
      "success"
    );
    this.navigate('saldos');
  }

  // ==========================================================================
  // TELA DE AUTENTICAÇÃO / LOGIN ÚNICO COM ISOLAMENTO DE PRODUTOR
  // ==========================================================================
  openLoginModal() {
    const html = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header" style="background: #16191f; color: white;">
          <div>
            <span class="fs-xxs text-uppercase fw-bold text-primary">AUTENTICAÇÃO CENTRAL &bull; SINGLE SIGN-ON</span>
            <h5 class="fw-bold mb-0 text-white mt-1">Acesso ao Core Financeiro Disk</h5>
          </div>
          <button class="modal-close-btn text-white border-0 bg-transparent" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <p class="fs-xs text-muted mb-3">
            O perfil selecionado determina permissões de visualização e regras de isolamento:
          </p>

          <div class="d-flex flex-column gap-2 mb-3">
            <button class="btn btn-outline-primary p-3 d-flex align-items-center text-start gap-3" onclick="window.switchGlobalRole('PRODUTOR'); window.app.closeModal();">
              <i class="ph-user fs-2 text-primary"></i>
              <div>
                <div class="fw-bold text-dark fs-sm">Entrar como Produtora ABC Ltda.</div>
                <div class="fs-xxs text-muted">João Silva (Diretor) &bull; Festival Curitiba 2026</div>
              </div>
            </button>

            <button class="btn btn-outline-success p-3 d-flex align-items-center text-start gap-3" onclick="financialStore.login('producer', 'prod-xyz'); window.app.closeModal();">
              <i class="ph-buildings fs-2 text-success"></i>
              <div>
                <div class="fw-bold text-dark fs-sm">Entrar como Eventos XYZ Live</div>
                <div class="fs-xxs text-muted">Mariana Souza &bull; Turnês e Festivais SP</div>
              </div>
            </button>

            <button class="btn btn-outline-warning p-3 d-flex align-items-center text-start gap-3" onclick="window.switchGlobalRole('FINANCEIRO'); window.app.closeModal();">
              <i class="ph-shield-check fs-2 text-warning"></i>
              <div>
                <div class="fw-bold text-dark fs-sm">Entrar como Financeiro Disk (Backoffice)</div>
                <div class="fs-xxs text-muted">Karine (Adm do Financeiro) &bull; Mesa de Aprovações &bull; Tesouraria &bull; Ledger</div>
              </div>
            </button>

            <button class="btn btn-outline-dark p-3 d-flex align-items-center text-start gap-3" onclick="window.switchGlobalRole('ADMINISTRADOR'); window.app.closeModal();">
              <i class="ph-crown fs-2 text-danger"></i>
              <div>
                <div class="fw-bold text-dark fs-sm">Entrar como Administradora do Financeiro</div>
                <div class="fs-xxs text-muted">Karine &bull; karine@diskingressos.com.br &bull; Acesso Transversal</div>
              </div>
            </button>
          </div>

          <div class="p-2 bg-light rounded text-muted fs-xxs border">
            🔒 <strong>Governança Estrita:</strong> Produtores acessam exclusivamente seus próprios eventos e saldos. O Financeiro Disk é sempre o último signatário nas liberações bancárias.
          </div>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  showModal(html) {
    this.lastFocusedElement = document.activeElement;
    this.modalContent.innerHTML = html;
    this.modalOverlay.classList.add('active');
    this.modalOverlay.setAttribute('aria-hidden', 'false');
    this.modalContent.setAttribute('role', 'dialog');
    this.modalContent.setAttribute('aria-modal', 'true');

    // Associa o título do modal para leitores de tela (aria-labelledby)
    const heading = this.modalContent.querySelector('h1, h2, h3, h4, h5, .modal-title');
    if (heading) {
      if (!heading.id) heading.id = 'modal-dialog-title';
      this.modalContent.setAttribute('aria-labelledby', heading.id);
    } else {
      this.modalContent.setAttribute('aria-label', 'Janela de diálogo');
    }

    // Garante rótulo acessível no botão de fechar
    const closeBtn = this.modalContent.querySelector('.modal-close-btn');
    if (closeBtn && !closeBtn.getAttribute('aria-label')) {
      closeBtn.setAttribute('aria-label', 'Fechar diálogo');
    }

    // Oculta o fundo da árvore de acessibilidade enquanto o diálogo está aberto
    const appShell = document.querySelector('.app-shell');
    if (appShell) appShell.setAttribute('aria-hidden', 'true');

    // Move o foco para dentro do diálogo e habilita fechamento por Esc
    if (!this._escHandlerBound) {
      this._escHandlerBound = (ev) => {
        if (ev.key === 'Escape' && this.modalOverlay.classList.contains('active')) {
          this.closeModal();
        }
      };
      document.addEventListener('keydown', this._escHandlerBound);
    }

    setTimeout(() => {
      const focusTarget = this.modalContent.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not(.modal-close-btn), .modal-close-btn');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
      } else {
        this.modalContent.setAttribute('tabindex', '-1');
        this.modalContent.focus?.();
      }
    }, 20);
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
    this.modalOverlay.setAttribute('aria-hidden', 'true');
    this.modalContent.innerHTML = '';
    const appShell = document.querySelector('.app-shell');
    if (appShell) appShell.removeAttribute('aria-hidden');
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      try {
        this.lastFocusedElement.focus();
      } catch (_) {}
      this.lastFocusedElement = null;
    }
  }

  // ==========================================================================
  // SIMULAÇÕES DO MODO DEMONSTRAÇÃO
  // ==========================================================================
  simulateCardSale() {
    financialStore.simulateCardSale(1000.00);
  }

  simulatePixSale() {
    financialStore.simulatePixSale(350.00);
  }

  simulateChargeback() {
    financialStore.simulateChargeback(450.00);
  }

  resetDemo() {
    if (confirm("Deseja restaurar todos os dados simulados para o estado original da demonstração?")) {
      financialStore.resetDemoData();
    }
  }

  // ==========================================================================
  // RENDERIZADOR CENTRAL LIMITLESS (NAVBAR, SIDEBAR E VIEWPORT)
  // ==========================================================================
  render(state) {
    if (this.activeScrollSpy) {
      this.activeScrollSpy.destroy();
      this.activeScrollSpy = null;
    }
    const isDisk = state.viewMode === 'disk';
    const isMaster = state.currentUser.role === 'admin';

    // 1. Sincroniza Navbar Topo: Perfil & Badge
    this.renderTopNavbar(state);

    // 2. Sincroniza Sidebar Navigation (Accordion)
    this.renderSidebar(state);

    // 3. Sincroniza Page Header
    this.renderPageHeader(state);

    // 3.1 Sincroniza Banner de Contexto Persistente do Produtor
    this.renderProducerContextBanner(state);

    // 4. Popula Notificações
    this.populateNotifications(state);

    // 5. Renderiza a Barra Flutuante de Simulação e Toasts
    this.renderFloatingDemoBar(state);
    this.renderToast(state);

    // 6. Renderiza a Tela Selecionada no Viewport
    let viewHtml = '';
    try {
    if (isDisk) {
      switch (state.currentView) {
        case 'diskDashboard':
          viewHtml = (this.currentFilterArg === 'posicao'
            ? renderDiskPosicaoGeral(state)
            : (this.currentFilterArg === 'indicadores'
              ? renderDiskIndicadores(state)
              : (this.currentFilterArg === 'inteligencia'
                ? renderDiskInteligencia(state)
                : renderDiskDashboard(state))));
          break;
        case 'diskPosicaoGeral':
          viewHtml = renderDiskPosicaoGeral(state);
          break;
        case 'diskIndicadores':
          viewHtml = renderDiskIndicadores(state);
          break;
        case 'diskInteligencia':
          viewHtml = renderDiskInteligencia(state);
          break;
        case 'diskProdutores':
          viewHtml = renderDiskProdutores(state, this.currentFilterArg);
          break;
        case 'diskEventos':
          viewHtml = renderDiskEventos(state, this.currentFilterArg);
          break;
        case 'diskSolicitacoes':
          viewHtml = renderDiskSolicitacoes(state, this.currentFilterArg);
          break;
        case 'diskAprovacoes':
          viewHtml = renderDiskAprovacoes(state, this.currentFilterArg);
          break;
        case 'diskSaldos':
          viewHtml = renderDiskSaldos(state, this.diskBalanceTab || this.currentFilterArg || 'consolidado');
          break;
        case 'diskPoliticaRepasse':
          viewHtml = renderDiskPoliticaRepasse(state, this.currentFilterArg);
          break;
        case 'diskContaFinanceira':
          viewHtml = renderDiskContaFinanceira(state, this.currentFilterArg);
          break;
        case 'diskRepasses':
          viewHtml = (this.currentFilterArg === 'politica'
            ? renderDiskPoliticaRepasse(state, this.currentFilterArg)
            : renderDiskRepasses(state, this.currentFilterArg));
          break;
        case 'diskAntecipacoes':
          viewHtml = renderDiskAntecipacoes(state, this.currentFilterArg);
          break;
        case 'diskRecebiveis':
          viewHtml = renderDiskRecebiveis(state, this.currentFilterArg);
          break;
        case 'diskTaxas':
          viewHtml = renderDiskTaxas(state, this.currentFilterArg);
          break;
        case 'diskGateways':
          viewHtml = renderDiskGateways(state, this.currentFilterArg);
          break;
        case 'diskEstornos':
          viewHtml = renderDiskEstornos(state, this.currentFilterArg);
          break;
        case 'diskConciliacao':
          viewHtml = renderDiskConciliacao(state, this.currentFilterArg);
          break;
        case 'diskContasPagar':
          viewHtml = renderDiskContasPagar(state, this.currentFilterArg);
          break;
        case 'diskContasReceber':
          viewHtml = renderDiskContasReceber(state, this.currentFilterArg);
          break;
        case 'diskTesouraria':
          viewHtml = renderDiskTesouraria(state);
          break;
        case 'diskPix':
          viewHtml = renderDiskPix(state, this.currentFilterArg);
          break;
        case 'diskCnab':
          viewHtml = renderDiskCnab(state, this.currentFilterArg);
          break;
        case 'diskAgendaPagamentos':
          viewHtml = renderDiskAgendaPagamentos(state, this.currentFilterArg);
          break;
        case 'diskPagamentosLote':
          viewHtml = renderDiskPagamentosLote(state, this.currentFilterArg);
          break;
        case 'diskTransferencias':
          viewHtml = renderDiskTransferencias(state, this.currentFilterArg);
          break;
        case 'diskLedger':
          viewHtml = renderDiskLedger(state);
          break;
        case 'diskBordero':
          viewHtml = renderDiskBordero(state, this.currentFilterArg);
          break;
        case 'diskFechamentos':
          viewHtml = renderDiskFechamentos(state);
          break;
        case 'diskFluxoCaixa':
          viewHtml = renderDiskFluxoCaixa(state, this.currentFilterArg);
          break;
        case 'diskAssinaturas':
        case 'diskIntegracao_assinaturas':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'assinaturas');
          break;
        case 'diskIntegracao_documentos':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'documentos');
          break;
        case 'diskIntegracao_autentique':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'autentique');
          break;
        case 'diskIntegracao_contaazul':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'contaazul');
          break;
        case 'diskIntegracao_sincronizacoes':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'sincronizacoes');
          break;
        case 'diskIntegracao_logs':
          viewHtml = renderDiskAssinaturasIntegracoes(state, 'logs');
          break;
        case 'diskRelatorios':
        case 'diskRelatorios_extrato':
        case 'diskRelatorios_evento':
        case 'diskRelatorios_produtor':
        case 'diskRelatorios_consolidado':
        case 'diskRelatorios_receitas':
        case 'diskRelatorios_despesas':
        case 'diskRelatorios_taxas':
        case 'diskRelatorios_repasses':
        case 'diskRelatorios_antecipacoes':
          viewHtml = renderDiskReport();
          break;
        case 'diskGovernanca':
        case 'diskGovernanca_visao':
        case 'diskGovernanca_visaoGeral':
        case 'diskGov_visaoGeral':
          viewHtml = renderDiskGovernanca(state, 'visaoGeral');
          break;
        case 'diskGovernanca_usuarios':
        case 'diskGov_usuarios':
          viewHtml = renderDiskGovernanca(state, 'usuarios');
          break;
        case 'diskGovernanca_perfis':
        case 'diskGov_perfis':
          viewHtml = renderDiskGovernanca(state, 'perfis');
          break;
        case 'diskGovernanca_alcadas':
        case 'diskGov_alcadas':
          viewHtml = renderDiskGovernanca(state, 'alcadas');
          break;
        case 'diskGovernanca_fluxos':
        case 'diskGov_fluxos':
          viewHtml = renderDiskGovernanca(state, 'fluxos');
          break;
        case 'diskGovernanca_segregacao':
        case 'diskGov_segregacao':
          viewHtml = renderDiskGovernanca(state, 'segregacao');
          break;
        case 'diskGovernanca_sensiveis':
        case 'diskGovernanca_operacoes':
        case 'diskGov_operacoes':
          viewHtml = renderDiskGovernanca(state, 'operacoes');
          break;
        case 'diskGovernanca_bloqueios':
        case 'diskGov_bloqueios':
          viewHtml = renderDiskGovernanca(state, 'bloqueios');
          break;
        case 'diskGovernanca_acessos':
        case 'diskGovernanca_auditoria':
        case 'diskGov_auditoria':
        case 'diskAuditoria':
          viewHtml = renderDiskGovernanca(state, 'auditoria');
          break;
        case 'diskGovernanca_configuracoes':
        case 'diskGov_configuracoes':
        case 'diskConfiguracoes':
          viewHtml = renderDiskGovernanca(state, 'configuracoes');
          break;
        case 'diskFornecedores':
          viewHtml = renderDiskFornecedores(state, this.currentFilterArg);
          break;
        case 'diskControladoria':
        case 'diskControleFinanceiro':
          viewHtml = renderDiskControladoria(state, 'visao');
          break;
        case 'diskCentrosCustos':
          viewHtml = renderDiskControladoria(state, 'centros');
          break;
        case 'diskOrcamentos':
          viewHtml = renderDiskControladoria(state, 'orcamentos');
          break;
        case 'diskDre':
          viewHtml = renderDiskControladoria(state, 'dre');
          break;
        case 'diskRentabilidade':
          viewHtml = renderDiskControladoria(state, 'rentabilidade');
          break;
        case 'diskProjecoes':
          viewHtml = renderDiskControladoria(state, 'projecoes');
          break;
        case 'diskCentralTrabalho':
        case 'diskTrabalho_central':
        case 'diskTrabalho_visaoGeral':
          viewHtml = renderDiskCentralTrabalho(state, 'central');
          break;
        case 'diskTrabalho_alertas':
          viewHtml = renderDiskCentralTrabalho(state, 'alertas');
          break;
        case 'diskTrabalho_sla':
          viewHtml = renderDiskCentralTrabalho(state, 'sla');
          break;
        case 'diskTrabalho_pendencias':
          viewHtml = renderDiskCentralTrabalho(state, 'pendencias');
          break;
        case 'diskTrabalho_agenda':
          viewHtml = renderDiskCentralTrabalho(state, 'agenda');
          break;
        case 'diskTrabalho_notificacoes':
          viewHtml = renderDiskCentralTrabalho(state, 'notificacoes');
          break;
        case 'diskSpread':
          viewHtml = renderDiskFinanceiroAvancado(state, 'spread');
          break;
        case 'diskAdvanced':
          viewHtml = renderDiskFinanceiroAvancado(state, 'advanced');
          break;
        case 'diskDivisaoReceitas':
        case 'diskSplit':
          viewHtml = renderDiskFinanceiroAvancado(state, 'split');
          break;
        case 'diskCentralEstornos':
          viewHtml = renderDiskFinanceiroAvancado(state, 'estornos');
          break;
        case 'diskRH':
        case 'diskRH_visao':
          viewHtml = renderDiskRHVisaoGeral(state, this.currentFilterArg);
          break;
        case 'diskRH_colaboradores':
          viewHtml = renderDiskRHColaboradores(state, this.currentFilterArg);
          break;
        case 'diskRH_organograma':
          viewHtml = renderDiskRHOrganograma(state, this.currentFilterArg);
          break;
        case 'diskRH_ponto':
          viewHtml = renderDiskRHPonto(state, this.currentFilterArg);
          break;
        case 'diskRH_geofences':
          viewHtml = renderDiskRHGeofences(state, this.currentFilterArg);
          break;
        case 'diskRH_equipesEvento':
          viewHtml = renderDiskRHEquipesEvento(state, this.currentFilterArg);
          break;
        case 'diskRH_custosEvento':
          viewHtml = renderDiskRHCustosEvento(state, this.currentFilterArg);
          break;
        case 'diskRH_folha':
          viewHtml = renderDiskRHFolha(state, this.currentFilterArg);
          break;
        case 'diskRH_dashPessoas':
        case 'diskRH_dashDP':
        case 'diskRH_dashPonto':
        case 'diskRH_dashTalentos':
        case 'diskRH_dashSST':
        case 'diskRH_dashEventos':
        case 'diskRH_dashGestao':
        case 'diskRH_dashAdmin':
          viewHtml = renderDiskRHDashboardOperacional(state, this.currentFilterArg);
          break;
        case 'diskRH_aprovacoes':
        case 'diskRH_admissao':
        case 'diskRH_onboarding':
        case 'diskRH_ferias':
        case 'diskRH_ausencias':
        case 'diskRH_atestados':
        case 'diskRH_folhaCompleta':
        case 'diskRH_decimo':
        case 'diskRH_beneficios':
        case 'diskRH_recrutamento':
        case 'diskRH_desempenho':
        case 'diskRH_treinamentos':
        case 'diskRH_cargosSalarios':
        case 'diskRH_sst':
        case 'diskRH_epis':
        case 'diskRH_esocial':
        case 'diskRH_documentos':
        case 'diskRH_patrimonio':
        case 'diskRH_reembolsos':
        case 'diskRH_freelancers':
        case 'diskRH_centroCustos':
        case 'diskRH_rescisoes':
        case 'diskRH_desligamentos':
        case 'diskRH_portalColaborador':
        case 'diskRH_portalGestor':
        case 'diskRH_relatorios':
        case 'diskRH_integracoes':
        case 'diskRH_configuracoes':
          viewHtml = renderDiskRHModulo(state, this.currentFilterArg);
          break;
        case 'diskRH_auditoria':
          viewHtml = renderDiskRHAuditoria(state, this.currentFilterArg);
          break;
        default:
          viewHtml = renderDiskDashboard(state);
      }
    } else {
      switch (state.currentView) {
        case 'overview':
          viewHtml = renderOverview(state);
          break;
        case 'saldos':
          viewHtml = renderSaldos(state);
          break;
        case 'extrato':
          viewHtml = renderExtrato(state);
          break;
        case 'repasses':
          viewHtml = renderRepasses(state);
          break;
        case 'antecipacoes':
          viewHtml = renderAntecipacoes(state);
          break;
        case 'vendas':
          viewHtml = renderVendas(state);
          break;
        case 'taxas':
          viewHtml = renderTaxas(state);
          break;
        case 'estornos':
          viewHtml = renderEstornos(state);
          break;
        case 'bordero':
          viewHtml = renderBordero(state);
          break;
        case 'relatorios':
          viewHtml = renderRelatorios(state);
          break;
        case 'comprovantes':
          viewHtml = renderComprovantes(state);
          break;
        case 'dadosBancarios':
          viewHtml = renderDadosBancarios(state);
          break;
        default:
          viewHtml = renderOverview(state);
      }
    }
    } catch (error) {
      console.error(`[App] Falha ao renderizar view '${state.currentView}':`, error);
      viewHtml = `
        <div class="card border-warning my-4">
          <div class="card-header bg-warning bg-opacity-10 d-flex align-items-center justify-content-between">
            <span class="fw-bold text-warning-emphasis">
              <i class="ph-warning me-1"></i> Recuperação de Renderização: ${state.currentView}
            </span>
            <button class="btn btn-sm btn-outline-secondary" onclick="financialStore.resetAllData()">Restaurar Dados Padrão</button>
          </div>
          <div class="card-body">
            <p class="text-muted mb-2">A tela solicitada encontrou uma divergência transitória de estado e foi isolada para não interromper sua navegação.</p>
            <div class="alert alert-light border small text-monospace mb-3">${error?.message || error}</div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-primary" onclick="financialStore.setView('${isDisk ? 'diskDashboard' : 'overview'}')">Ir para a Página Inicial</button>
              <button class="btn btn-sm btn-outline-primary" onclick="window.location.reload()">Recarregar Sistema</button>
            </div>
          </div>
        </div>
      `;
    }

    this.mainContainer.innerHTML = viewHtml;
    const reportRoot = this.mainContainer.querySelector('[data-disk-report]');
    if (reportRoot) {
      const type = reportType(state.currentView);
      this.reportFilters ??= {};
      mountDiskReport(reportRoot, state, type, this.reportFilters[type] ??= {});
    }
    this.setupViewScrollSpy();
  }

  setupViewScrollSpy() {
    // ScrollSpy observador contínuo apenas para páginas longas como Gateways/MDR e Conciliação
    // Exclui #dossie-scrollspy-nav porque o Dossiê opera por abas independentes (tab panels)
    const navBar = document.querySelector('.limitless-scrollspy-bar:not(#dossie-scrollspy-nav)');
    if (!navBar) {
      if (this.activeScrollSpy) {
        this.activeScrollSpy.destroy();
        this.activeScrollSpy = null;
      }
      return;
    }

    if (this.activeScrollSpy) {
      this.activeScrollSpy.destroy();
      this.activeScrollSpy = null;
    }

    this.activeScrollSpy = initScrollSpy({
      navSelector: '.limitless-scrollspy-bar:not(#dossie-scrollspy-nav)',
      rootSelector: '#appMainContent',
      offset: 76
    });
  }

  setDossieTab(tabId, event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    this.activeDossieTab = tabId;
    this.dossieTab = tabId;

    // 1. Atualiza estado visual ativo nos botões de abas (pills)
    const nav = document.getElementById('dossie-scrollspy-nav') || document.querySelector('[data-scrollspy-nav="dossie-scrollspy-nav"]');
    if (nav) {
      nav.querySelectorAll('.scrollspy-pill').forEach(btn => {
        const match = btn.getAttribute('data-target') === tabId || btn.id === `spy-btn-${tabId}`;
        btn.classList.toggle('active', match);
        btn.setAttribute('aria-selected', match ? 'true' : 'false');
      });
    }

    // 2. Alterna visibilidade dos painéis: apenas a aba ativa fica visível, as outras 4 ficam ocultas
    const panels = document.querySelectorAll('.dossie-tab-panel');
    if (panels && panels.length > 0) {
      panels.forEach(panel => {
        const match = panel.id === tabId || panel.getAttribute('data-tab') === tabId;
        panel.style.display = match ? 'block' : 'none';
      });
    } else {
      this.render(financialStore.getState());
    }

    // 3. Rola suavemente para o topo do conteúdo para melhor ergonomia
    const rootEl = document.getElementById('appMainContent') || window;
    if (rootEl && typeof rootEl.scrollTo === 'function') {
      rootEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToSpySection(targetId, event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (targetId && (targetId.startsWith('sec-dossie-') || targetId.includes('dossie'))) {
      this.setDossieTab(targetId, event);
      return;
    }
    if (this.activeScrollSpy) {
      this.activeScrollSpy.scrollTo(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  runQuickTaxasSim() {
    const ticketEl = document.getElementById('quickSimTicket');
    const chargedEl = document.getElementById('quickSimCharged');
    const mdrEl = document.getElementById('quickSimMdr');
    const spreadResEl = document.getElementById('quickSimSpreadResult');
    const margemResEl = document.getElementById('quickSimMargemResult');

    if (!ticketEl || !chargedEl || !mdrEl) return;

    const ticket = parseFloat(ticketEl.value) || 0;
    const chargedPct = parseFloat(chargedEl.value) || 0;
    const mdrPct = parseFloat(mdrEl.value) || 0;

    const spreadPct = chargedPct - mdrPct;
    const margemReais = ticket * (spreadPct / 100);

    if (spreadResEl) {
      spreadResEl.innerText = (spreadPct >= 0 ? '+' : '') + spreadPct.toFixed(2) + '%';
      spreadResEl.className = 'fs-4 fw-bold ' + (spreadPct >= 0 ? 'text-success' : 'text-danger');
    }
    if (margemResEl) {
      margemResEl.innerText = `Margem Disk: ${formatCurrency(margemReais)} por ingresso`;
    }
  }

  renderTopNavbar(state) {
    const isDisk = state.viewMode === 'disk';
    const isMaster = state.currentUser.role === 'admin';

    // Role Indicator Badge in Header
    const roleIndicator = document.getElementById('navbar-role-indicator');
    if (roleIndicator) {
      if (isMaster) {
        roleIndicator.innerText = 'ADMINISTRADOR MASTER';
        roleIndicator.className = 'badge bg-warning text-dark fw-bold fs-xxs px-2 py-1';
      } else if (isDisk) {
        roleIndicator.innerText = 'FINANCEIRO DISK';
        roleIndicator.className = 'badge bg-success text-white fw-bold fs-xxs px-2 py-1';
      } else {
        roleIndicator.innerText = 'PORTAL DO PRODUTOR';
        roleIndicator.className = 'badge bg-primary text-white fw-bold fs-xxs px-2 py-1';
      }
    }

    // Dynamic Search Placeholder by Role
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      if (isDisk || isMaster) {
        searchInput.placeholder = '🔎 Buscar Produtor, CNPJ, Evento, Pedido...';
      } else {
        searchInput.placeholder = 'Pesquisa global (eventos, produtores, pedidos, repasses...)';
      }
    }

    // Avatar Circle & Email
    const avatarCircle = document.getElementById('user-avatar-circle');
    const displayEmail = document.getElementById('user-display-email');
    const dropdownName = document.getElementById('user-dropdown-name');
    const dropdownRole = document.getElementById('user-dropdown-role');

    if (avatarCircle && displayEmail) {
      if (isMaster) {
        avatarCircle.innerText = 'KA';
        avatarCircle.style.background = '#e11d48';
        displayEmail.innerText = state.currentUser.email;
        if (dropdownName) dropdownName.innerText = state.currentUser.name;
        if (dropdownRole) dropdownRole.innerText = 'Administradora do Financeiro';
      } else if (isDisk) {
        avatarCircle.innerText = 'KA';
        avatarCircle.style.background = '#10b981';
        displayEmail.innerText = state.currentUser.email;
        if (dropdownName) dropdownName.innerText = state.currentUser.name;
        if (dropdownRole) dropdownRole.innerText = 'Administradora do Financeiro';
      } else {
        avatarCircle.innerText = state.activeProducer.id === 'prod-xyz' ? 'XYZ' : 'ABC';
        avatarCircle.style.background = '#2563eb';
        displayEmail.innerText = state.currentUser.email;
        if (dropdownName) dropdownName.innerText = state.currentUser.name;
        if (dropdownRole) dropdownRole.innerText = `${state.activeProducer.name} (${state.currentUser.title})`;
      }
    }

    // Producer Context Card in Sidebar
    const prodAvatar = document.getElementById('sidebar-producer-avatar');
    const prodName = document.getElementById('sidebar-producer-name');
    const prodBadge = document.getElementById('sidebar-producer-badge');

    if (prodAvatar && prodName && prodBadge) {
      if (isMaster) {
        prodAvatar.innerText = 'ADM';
        prodAvatar.style.background = '#e11d48';
        prodName.innerText = 'Disk Ingressos (Master)';
        prodBadge.innerText = 'Governança & Risco Total';
      } else if (isDisk) {
        prodAvatar.innerText = 'DI';
        prodAvatar.style.background = '#10b981';
        prodName.innerText = 'Disk Ingressos (Matriz)';
        prodBadge.innerText = 'Mesa Financeira & Tesouraria';
      } else {
        prodAvatar.innerText = state.activeProducer.id === 'prod-xyz' ? 'XYZ' : 'ABC';
        prodAvatar.style.background = '#2563eb';
        prodName.innerText = state.activeProducer.name;
        prodBadge.innerText = state.activeProducer.rating || 'Produtor Homologado';
      }
    }

    // Sidebar Quick Action Buttons (conforme o perfil ativo)
    const quickActions = document.getElementById('sidebar-quick-actions');
    if (quickActions) {
      if (isDisk || isMaster) {
        quickActions.innerHTML = `
          <button class="btn btn-warning w-100 btn-sm text-dark fw-bold d-flex align-items-center justify-content-center gap-1" onclick="window.app.navigate('diskAprovacoes')">
            <i class="ph-scales"></i> <span>Mesa de Aprovações</span>
          </button>
          <button class="btn btn-success w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-1" onclick="window.app.navigate('diskTesouraria')">
            <i class="ph-vault"></i> <span>Lote CNAB 240</span>
          </button>
        `;
      } else {
        quickActions.innerHTML = `
          <button class="btn btn-warning w-100 btn-sm text-black fw-bold d-flex align-items-center justify-content-center gap-1" id="quick-new-event-btn" onclick="alert('Criar Novo Evento: Redirecionando para o Assistente de Configuração de Lotes...')">
            <i class="ph-calendar-plus"></i> <span>Criar Evento</span>
          </button>
          <button class="btn btn-success w-100 btn-sm fw-bold d-flex align-items-center justify-content-center gap-1" id="quick-repasse-btn" onclick="window.app.openPayoutModal()">
            <i class="ph-hand-coins"></i> <span>Solicitar Repasse</span>
          </button>
        `;
      }
    }
  }

  renderPageHeader(state) {
    const domainBadge = document.getElementById('header-domain-badge');
    const eventBadge = document.getElementById('header-event-badge');
    const viewTitle = document.getElementById('active-view-title');
    const viewSubtitle = document.getElementById('active-view-subtitle');

    const isDisk = state.viewMode === 'disk';
    const isMaster = state.currentUser.role === 'admin';
    const isRHView = String(state.currentView || '').startsWith('diskRH');

    if (domainBadge) {
      if (isRHView) {
        domainBadge.innerText = 'RECURSOS HUMANOS & JORNADA (RH DISK)';
        domainBadge.className = 'badge bg-primary text-white fw-bold fs-xxs';
      } else {
        domainBadge.innerText = (isDisk || isMaster) ? 'FINANCEIRO DISK' : 'FINANCEIRO DO PRODUTOR';
        domainBadge.className = (isDisk || isMaster) ? 'badge bg-dark text-white fw-bold fs-xxs' : 'badge bg-primary text-white fw-bold fs-xxs';
      }
    }

    if (eventBadge) {
      if (isDisk || isMaster) {
        const isAllProducers = state.selectedProducerId === 'all';
        const isAllEvents = state.selectedEventId === 'all';
        const p = state.data.producers.find(pr => pr.id === state.selectedProducerId);
        const pName = p ? p.name : 'Todos os Produtores';
        const ev = state.data.events.find(e => e.id === state.selectedEventId);
        const eName = ev ? ev.name : 'Todos os Eventos';

        let levelHtml = '';
        if (isAllProducers && isAllEvents) {
          levelHtml = '<span class="badge bg-dark text-white fw-bold fs-xxs px-2 py-1"><i class="ph-bank me-1"></i> NÍVEL 1 &bull; DISK (Todos os Produtores)</span>';
        } else if (!isAllProducers && isAllEvents) {
          levelHtml = `<span class="badge bg-primary text-white fw-bold fs-xxs px-2 py-1"><i class="ph-buildings me-1"></i> NÍVEL 2 &bull; PRODUTOR (${pName})</span>`;
        } else {
          levelHtml = `<span class="badge bg-success text-white fw-bold fs-xxs px-2 py-1"><i class="ph-ticket me-1"></i> NÍVEL 3 &bull; EVENTO (${eName})</span>`;
        }

        eventBadge.innerHTML = `
          ${levelHtml}
          <span class="text-muted fs-xxs mx-1">&bull;</span>
          <span class="fs-xs text-muted">Produtor selecionado: <strong class="text-dark">${isAllProducers ? 'Todos' : pName}</strong></span>
          <span class="text-muted fs-xxs mx-1">&bull;</span>
          <span class="fs-xs text-muted">Evento selecionado: <strong class="text-dark">${isAllEvents ? 'Todos' : eName}</strong></span>
        `;
      } else {
        const isAllEvents = !state.selectedEventId || state.selectedEventId === 'all';
        const currentEvent = isAllEvents ? null : state.data.events.find(e => e.id === state.selectedEventId);
        const scopeLabel = currentEvent ? currentEvent.name : 'Todos os Eventos (Consolidado)';
        eventBadge.innerHTML = `Produtor: <strong>${state.activeProducer.name}</strong> &bull; Escopo: <strong>${scopeLabel}</strong>`;
      }
    }

    const titlesMap = {
      // Produtor (11 Itens)
      'overview': { title: 'Visão Geral Financeira', subtitle: 'Resumo executivo consolidado das vendas, saldos disponíveis, repasses e retenções.' },
      'saldos': { title: 'Saldos Consolidados & por Evento', subtitle: 'Saldo disponível, valores a liberar e detalhamento por evento &bull; Fonte da verdade do Ledger.' },
      'extrato': { title: 'Extrato Financeiro Completo', subtitle: 'Livro-caixa unificado de vendas, liquidações, taxas, estornos e transferências.' },
      'repasses': { title: 'Gestão de Repasses Financeiros', subtitle: 'Solicitações de repasse, esteira de assinaturas digitais e comprovantes bancários.' },
      'antecipacoes': { title: 'Antecipação de Recebíveis', subtitle: 'Simulação e contratação de antecipação com taxas contratuais transparentes.' },
      'vendas': { title: 'Vendas & Recebimentos', subtitle: 'Acompanhamento do volume de vendas brutas, canais de pagamento e prazos de liquidação.' },
      'taxas': { title: 'Taxas & Custos Operacionais', subtitle: 'Demonstrativo detalhado de taxas Disk, processamento gateway, parcelamento e retenções.' },
      'estornos': { title: 'Estornos & Chargebacks', subtitle: 'Gestão de cancelamentos voluntários, disputas de contestação de compras e reservas cautelares.' },
      'bordero': { title: 'Borderô & Fechamento de Eventos', subtitle: 'Conferência final de bilheteria, custos, deduções e termo de encerramento assinado.' },
      'relatorios': { title: 'Relatórios Financeiros', subtitle: 'Demonstrativos gerenciais, curva de vendas e exportação oficial em PDF e Excel.' },
      'dadosBancarios': { title: 'Dados Bancários & Chaves PIX', subtitle: 'Contas bancárias PJ homologadas para recebimento dos repasses automáticos.' },

      // Financeiro Disk — 15 Domínios Administrativos
      'diskDashboard': { title: 'Dashboard Financeiro', subtitle: 'Painel executivo com volume transacionado, obrigações com produtores e liquidez.' },
      'diskPosicaoGeral': { title: 'Posição Geral', subtitle: 'Fotografia financeira consolidada: disponibilidades, recebíveis, obrigações, reservas e posição líquida.' },
      'diskIndicadores': { title: 'Indicadores Financeiros', subtitle: 'KPIs de desempenho calculados a partir do mesmo contexto e das operações do Financeiro Disk.' },
      'diskInteligencia': { title: 'Inteligência Financeira', subtitle: 'Leitura orientada por regras sobre os dados existentes; cada alerta leva ao módulo responsável.' },
      'diskProdutores': { title: 'Produtores & Contas Financeiras', subtitle: 'Gestão cadastral, contas financeiras, contratos, travas e limites de todos os produtores.' },
      'diskEventos': { title: 'Eventos & Posição Financeira', subtitle: 'Posição financeira individual e fechamentos de bilheteria de toda a grade Disk Ingressos.' },
      'diskSolicitacoes': { title: 'Central de Solicitações', subtitle: 'Acompanhamento transversal de repasses, antecipações e fechamentos de borderô de todos os produtores.' },
      'diskAprovacoes': { title: 'Central de Aprovações', subtitle: 'Workflow transversal &bull; Governança Maker/Checker &bull; Assinaturas sequenciais &bull; SLA.' },
      'diskSaldos': { title: 'Saldos por Produtor & por Evento', subtitle: 'Consolidação de saldos disponíveis, a receber, bloqueios e reservas por produtor e evento.' },
      'diskRepasses': { title: 'Repasses & Liquidação Bancária', subtitle: 'Gestão do ciclo de repasses: análise, aprovação, programação e liquidação bancária.' },
      'diskPoliticaRepasse': { title: 'Política de Repasse & Motor de Elegibilidade', subtitle: 'Parametrização dinâmica do gatilho de vendas (50%), liberação (20%), precedência de regras e autorizações excepcionais.' },
      'diskContaFinanceira': { title: 'Conta Financeira do Produtor (CNPJ)', subtitle: 'Conta financeira interna por CNPJ, gestão de créditos/antecipações, bloqueios cautelares e ledger interno.' },
      'diskAntecipacoes': { title: 'Antecipações de Recebíveis', subtitle: 'Análise de elegibilidade de risco, simulações, taxas e contratação de antecipações.' },
      'diskRecebiveis': { title: 'Recebíveis & Liquidações', subtitle: 'Previsão de caixa futuro por adquirente, bandeira e método de pagamento (PIX e Cartão).' },
      'diskTaxas': { title: 'Taxas & Regras Comerciais', subtitle: 'Configuração de MDR, spread comercial Disk (1,22%), parcelamento e vigências contratuais.' },
      'diskGateways': { title: 'Gateways & Adquirentes', subtitle: 'Roteamento inteligente de transações, taxas de adquirência e split de pagamentos.' },
      'diskEstornos': { title: 'Estornos & Chargebacks', subtitle: 'Monitoramento de cancelamentos voluntários, contestações de compras e reservas cautelares.' },
      'diskConciliacao': { title: 'Conciliação Contábil & Financeira', subtitle: 'Auditoria Multicamadas: Pedido × Gateway × Adquirente × Ledger × Extrato Bancário.' },
      'diskContasPagar': { title: 'Contas a Pagar', subtitle: 'Gestão de fornecedores, centros de custos, agendamentos de pagamentos e autorizações.' },
      'diskContasReceber': { title: 'Contas a Receber', subtitle: 'Previsões de recebimento, liquidação de borderôs, baixas automáticas e inadimplências.' },
      'diskTesouraria': { title: 'Tesouraria & Contas Bancárias', subtitle: 'Posição consolidada de caixa, contas bancárias, conciliação e gestão de liquidez.' },
      'diskPix': { title: 'PIX e Transferências Instantâneas', subtitle: 'Fila PIX, chaves homologadas, pagamentos instantâneos e retorno bancário.' },
      'diskCnab': { title: 'CNAB 240 / 400 Bancário', subtitle: 'Remessas e retornos bancários, conciliação de arquivos e ocorrências.' },
      'diskAgendaPagamentos': { title: 'Agenda de Pagamentos', subtitle: 'Cronograma diário de liquidações, vencimentos e transferências autorizadas.' },
      'diskPagamentosLote': { title: 'Pagamentos em Lote', subtitle: 'Processamento em massa de obrigações, agrupamento por banco e autorizações.' },
      'diskTransferencias': { title: 'Transferências entre Contas', subtitle: 'Movimentações entre contas bancárias da Disk, TED/DOC e compensações.' },
      'diskLedger': { title: 'Ledger Financeiro', subtitle: 'Livro-razão contábil de partidas dobradas imutável, conciliação e rastreabilidade total de cada centavo.' },
      'diskBordero': { title: 'Borderôs & Fechamentos', subtitle: 'Conferência final de bilheteria, custos, deduções, aprovação e termo de encerramento assinado.' },
      'diskFechamentos': { title: 'Fechamentos, Borderôs & Dossiês Financeiros', subtitle: 'Esteira de fechamento, prestação de contas, assinaturas duplas e dossiê do evento.' },
      'diskFluxoCaixa': { title: 'Fluxo de Caixa Realizado & Projetado', subtitle: 'Entradas e saídas operacionais consolidadas e projeção de liquidez futura.' },
      'diskAssinaturas': { title: 'Assinaturas & Integrações', subtitle: 'Central de Assinaturas (Autentique), Integração ERP (Conta Azul), Sincronizações e Logs.' },
      'diskIntegracao_assinaturas': { title: 'Central de Assinaturas', subtitle: 'Documentos com ordem obrigatória: Produtor primeiro e Financeiro Disk por último.' },
      'diskIntegracao_documentos': { title: 'Documentos para Assinatura', subtitle: 'Modelos de termos de repasse, antecipação, borderôs e contratos autorizados.' },
      'diskIntegracao_autentique': { title: 'Integração Autentique', subtitle: 'Motor externo de assinatura digital ICP-Brasil e gerenciamento de webhooks.' },
      'diskIntegracao_contaazul': { title: 'Integração Conta Azul', subtitle: 'Sincronização controlada com ERP, OAuth 2.0 e mapa de responsabilidade dos dados.' },
      'diskIntegracao_sincronizacoes': { title: 'Central de Sincronizações', subtitle: 'Fila única com idempotência, tentativas e tratamento de divergências.' },
      'diskIntegracao_logs': { title: 'Logs de Integração', subtitle: 'Rastreabilidade técnica de webhooks e sincronizações sem exposição de credenciais.' },
      'diskGovernanca': { title: 'Governança Financeira', subtitle: 'Visão geral, alçadas, perfis RBAC, segregação de funções e proteção de operações sensíveis.' },
      'diskGovernanca_visao': { title: 'Governança Financeira • Visão Geral', subtitle: 'Painel central de conformidade institucional, matriz de autorização e salvaguardas de processos.' },
      'diskGov_visaoGeral': { title: 'Governança Financeira • Visão Geral', subtitle: 'Painel central de conformidade institucional, matriz de autorização e salvaguardas de processos.' },
      'diskGovernanca_usuarios': { title: 'Usuários Financeiros', subtitle: 'Gestão individual de operadores, perfis atribuídos e limites de autorização financeira.' },
      'diskGov_usuarios': { title: 'Usuários Financeiros', subtitle: 'Gestão individual de operadores, perfis atribuídos e limites de autorização financeira.' },
      'diskGovernanca_perfis': { title: 'Perfis e Permissões (RBAC)', subtitle: 'Definição de privilégios granulares por módulo e nível de atuação operacional.' },
      'diskGov_perfis': { title: 'Perfis e Permissões (RBAC)', subtitle: 'Definição de privilégios granulares por módulo e nível de atuação operacional.' },
      'diskGovernanca_alcadas': { title: 'Alçadas de Aprovação', subtitle: 'Limites monetários parametrizáveis por tipo de operação (Repasses, Antecipações, Lotes e MDR).' },
      'diskGov_alcadas': { title: 'Alçadas de Aprovação', subtitle: 'Limites monetários parametrizáveis por tipo de operação (Repasses, Antecipações, Lotes e MDR).' },
      'diskGovernanca_fluxos': { title: 'Fluxos de Aprovação', subtitle: 'Sequenciamento formal das esteiras de decisão financeira, status e transições.' },
      'diskGov_fluxos': { title: 'Fluxos de Aprovação', subtitle: 'Sequenciamento formal das esteiras de decisão financeira, status e transições.' },
      'diskGovernanca_segregacao': { title: 'Segregação de Funções (SoD)', subtitle: 'Políticas rígidas para impedir acúmulo de etapas conflitantes (Criador, Aprovador, Pagador, Conciliador).' },
      'diskGov_segregacao': { title: 'Segregação de Funções (SoD)', subtitle: 'Políticas rígidas para impedir acúmulo de etapas conflitantes (Criador, Aprovador, Pagador, Conciliador).' },
      'diskGovernanca_sensiveis': { title: 'Operações Sensíveis & Críticas', subtitle: 'Relação de ações sujeitas a salvaguardas adicionais, dupla custódia e log imutável.' },
      'diskGov_operacoes': { title: 'Operações Sensíveis & Críticas', subtitle: 'Relação de ações sujeitas a salvaguardas adicionais, dupla custódia e log imutável.' },
      'diskGovernanca_bloqueios': { title: 'Bloqueios Preventivos & Exceções', subtitle: 'Quarentenas de segurança patrimonial, travas temporárias e delegação de alçadas.' },
      'diskGov_bloqueios': { title: 'Bloqueios Preventivos & Exceções', subtitle: 'Quarentenas de segurança patrimonial, travas temporárias e delegação de alçadas.' },
      'diskGovernanca_acessos': { title: 'Auditoria de Acessos & Log Imutável', subtitle: 'Registro contínuo e à prova de adulteração de todas as operações administrativas e financeiras.' },
      'diskGov_auditoria': { title: 'Auditoria de Acessos & Log Imutável', subtitle: 'Registro contínuo e à prova de adulteração de todas as operações administrativas e financeiras.' },
      'diskGovernanca_configuracoes': { title: 'Configurações de Governança', subtitle: 'Parâmetros operacionais globais de segurança, travas SoD e políticas da Disk Ingressos.' },
      'diskGov_configuracoes': { title: 'Configurações de Governança', subtitle: 'Parâmetros operacionais globais de segurança, travas SoD e políticas da Disk Ingressos.' },
      'diskAuditoria': { title: 'Auditoria & Governança', subtitle: 'Log imutável de operações manuais, aprovações, alterações de taxas e acessos sensíveis.' },
      'diskConfiguracoes': { title: 'Configurações Administrativas', subtitle: 'Políticas de repasse, travas de antecipação, alçadas de aprovação e calendário operacional.' },
      'diskFornecedores': { title: 'Gestão de Fornecedores & Contratos', subtitle: 'Cadastro, contratos, documentos, cotações, pedidos, parcelas e vencimentos.' },
      'diskControladoria': { title: 'Controladoria Financeira', subtitle: 'Centros de custos, orçamentos, DRE gerencial, rentabilidade e projeções da operação.' },
      'diskControleFinanceiro': { title: 'Controladoria Financeira', subtitle: 'Centros de custos, orçamentos, fluxo de caixa, projeções de caixa e DRE gerencial.' },
      'diskCentrosCustos': { title: 'Centros de Custos', subtitle: 'Orçado × Realizado por centro de custo com apuração de desvios operacionais.' },
      'diskOrcamentos': { title: 'Controle Orçamentário', subtitle: 'Acompanhamento de orçamentos previstos, realizados, comprometidos e governança de versões.' },
      'diskDre': { title: 'DRE Gerencial', subtitle: 'Demonstrativo de Resultado do Exercício gerencial da Disk (Receitas, Adquirência, Operação e Margem).' },
      'diskRentabilidade': { title: 'Rentabilidade por Evento & Produtor', subtitle: 'Margem de contribuição, resultado líquido e composição de custos por produção.' },
      'diskProjecoes': { title: 'Projeções de Caixa', subtitle: 'Horizontes de liquidez em 7, 15, 30 e 60 dias (cenários não alteram o Ledger).' },
      'diskCentralTrabalho': { title: 'Central de Trabalho Financeiro', subtitle: 'Painel operacional prioritário, fila de atividades, monitoramento de SLA e alertas do dia.' },
      'diskTrabalho_central': { title: 'Central de Trabalho Financeiro', subtitle: 'Painel operacional prioritário, fila de atividades, monitoramento de SLA e alertas do dia.' },
      'diskTrabalho_visaoGeral': { title: 'Central de Trabalho • Visão Geral', subtitle: 'Painel operacional prioritário, fila de atividades, monitoramento de SLA e alertas do dia.' },
      'diskTrabalho_alertas': { title: 'Alertas Financeiros Críticos', subtitle: 'Notificações ativas de risco, divergências e ações imediatas da mesa financeira.' },
      'diskTrabalho_sla': { title: 'SLA & Prazos Operacionais', subtitle: 'Metas e tempos de resposta de repasses, antecipações e fechamentos de borderô.' },
      'diskTrabalho_pendencias': { title: 'Pendências Financeiras', subtitle: 'Fila consolidada de itens aguardando ação, aprovação, assinatura ou conciliação.' },
      'diskTrabalho_agenda': { title: 'Agenda Operacional', subtitle: 'Compromissos, vencimentos de lotes bancários e cronograma financeiro diário.' },
      'diskTrabalho_notificacoes': { title: 'Notificações Operacionais', subtitle: 'Histórico de eventos, avisos e notificações da mesa financeira.' },
      'diskSpread': { title: 'Spread & Adquirentes', subtitle: 'Análise de receitas, tarifas retidas, custos de adquirentes e rentabilidade líquida do ecossistema de pagamentos.' },
      'diskAdvanced': { title: 'Financeiro Advanced · Previsto × Realizado', subtitle: 'Controle de liquidez, contas a receber, pagamentos agendados e previsão semestral de caixa.' },
      'diskDivisaoReceitas': { title: 'Divisão de Receitas / Split Financeiro', subtitle: 'Partilha automatizada de receitas entre organizador, coprodutor, artista e plataforma.' },
      'diskSplit': { title: 'Divisão de Receitas / Split Financeiro', subtitle: 'Partilha automatizada de receitas entre organizador, coprodutor, artista e plataforma.' },
      'diskCentralEstornos': { title: 'Centro de Controle de Estornos', subtitle: 'Gestão executiva de devoluções, aprovações por alçada, vouchers e risco operacional.' },

      // Recursos Humanos & Gestão de Jornada (RH Disk)
      'diskRH': { title: 'Recursos Humanos & Gestão de Jornada', subtitle: 'Portal integrado de RH, ponto eletrônico georreferenciado (Disk Ponto), equipes de eventos e apuração de custos no DRE.' },
      'diskRH_colaboradores': { title: 'RH • Colaboradores & Vínculos', subtitle: 'Cadastro de colaboradores CLT, PJ, freelancers de evento e terceirizados com custo hora/diária.' },
      'diskRH_organograma': { title: 'RH • Estrutura Organizacional & Centros de Custo', subtitle: 'Departamentos, cargos, turnos, jornadas de trabalho e vínculo contábil com o DRE.' },
      'diskRH_ponto': { title: 'RH • Ponto & Jornada (Disk Ponto APK)', subtitle: 'Espelho de ponto em tempo real, conformidade Portaria 671 MTE, batidas com geolocalização e ajustes.' },
      'diskRH_geofences': { title: 'RH • Cercas Virtuais (Geofences)', subtitle: 'Perímetros GPS autorizados para registro de ponto em sedes, bilheterias e arenas de eventos.' },
      'diskRH_equipes': { title: 'RH • Equipes & Escalas por Evento', subtitle: 'Alocação operacional de staff em eventos com check-in/check-out e apuração de diárias.' },
      'diskRH_custos': { title: 'RH • Custos de Pessoal no DRE do Evento', subtitle: 'Rateio automático de mão de obra operacional, horas extras e diárias por produção.' },
      'diskRH_folha': { title: 'RH • Pré-Folha & Integração Financeira', subtitle: 'Fechamento de variáveis de jornada, diárias aprovadas e geração de títulos no Contas a Pagar.' },
      'diskRH_auditoria': { title: 'RH • Auditoria AFD/AEJ & Conformidade LGPD', subtitle: 'Trilha imutável de marcações NSR, termos de geolocalização e conformidade trabalhista.' }
    };

    const report = reportType(state.currentView);
    const reportInfo = report && { title: reportTitles[report], subtitle: 'Consulte e exporte os registros no recorte selecionado.' };
    let currentInfo = reportInfo || titlesMap[state.currentView];
    if (!currentInfo && String(state.currentView || '').startsWith('diskRH')) {
      currentInfo = {
        title: 'Recursos Humanos & Gestão de Jornada',
        subtitle: 'Gestão integrada de colaboradores, ponto georreferenciado (Portaria 671 MTE), escalas e custos por evento.'
      };
    }
    if (!currentInfo) {
      currentInfo = { title: 'Módulo Financeiro', subtitle: 'Sistema integrado de gestão financeira Disk Ingressos.' };
    }
    if (viewTitle) viewTitle.innerText = currentInfo.title;
    if (viewSubtitle) viewSubtitle.innerHTML = currentInfo.subtitle;

    // Header Action Toolbar Dinâmica conforme o Perfil
    const toolbar = document.getElementById('header-action-toolbar');
    if (toolbar) {
      if (isDisk || isMaster) {
        let producerOptions = `<option value="all" ${state.selectedProducerId === 'all' ? 'selected' : ''}>Buscar produtor... (Todos) ▼</option>`;
        state.data.producers.forEach(p => {
          producerOptions += `<option value="${p.id}" ${state.selectedProducerId === p.id ? 'selected' : ''}>Produtor: ${p.name}</option>`;
        });

        let availableEvents = state.data.events;
        if (state.selectedProducerId && state.selectedProducerId !== 'all') {
          availableEvents = availableEvents.filter(e => e.producerId === state.selectedProducerId);
        }

        let eventOptions = `<option value="all" ${state.selectedEventId === 'all' ? 'selected' : ''}>Todos os eventos ▼</option>`;
        availableEvents.forEach(e => {
          eventOptions += `<option value="${e.id}" ${state.selectedEventId === e.id ? 'selected' : ''}>${e.name}</option>`;
        });

        const pendingCount = state.pendingApprovalsCount || 17;

        toolbar.innerHTML = `
          <div class="producer-selector-box d-flex align-items-center">
            <select class="form-select form-select-sm fw-semibold shadow-sm" id="globalProducerSelect" style="min-width: 215px;" onchange="window.app && window.app.setSelectedProducer(this.value)">
              ${producerOptions}
            </select>
          </div>
          <div class="event-selector-box d-flex align-items-center">
            <select class="form-select form-select-sm fw-semibold shadow-sm" id="globalEventSelect" style="min-width: 210px;" onchange="window.app && window.app.setSelectedEvent(this.value)">
              ${eventOptions}
            </select>
          </div>
          ${report ? '' : `<div class="period-selector-box d-flex align-items-center">
            <select class="form-select form-select-sm fw-semibold shadow-sm" id="globalPeriodSelect" style="min-width: 165px;" onchange="window.app && window.app.setSelectedPeriod(this.value)">
              <option value="month" selected>Período: Mês Atual ▼</option>
              <option value="30d">Período: Últimos 30 dias ▼</option>
              <option value="90d">Período: Últimos 90 dias ▼</option>
              <option value="year">Período: Ano 2026 ▼</option>
              <option value="all">Período: Todo o Histórico ▼</option>
            </select>
          </div>`}
          <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm" onclick="window.app && window.app.refreshData()" title="Sincronizar">
            <i class="ph-arrows-counter-clockwise"></i> <span class="d-none d-md-inline">Atualizar</span>
          </button>
          <button class="btn btn-sm btn-warning text-dark fw-bold d-flex align-items-center gap-1 shadow-sm" onclick="window.app && window.app.navigate('diskAprovacoes')">
            <i class="ph-bell fs-5"></i> <span>Central de Aprovações</span>
            <span class="badge rounded-pill bg-danger text-white fs-xxs ms-1">${pendingCount}</span>
          </button>
        `;
      } else {
        const producerEvents = state.data.events.filter(e => e.producerId === state.activeProducer.id);
        let eventOptions = `<option value="all" ${state.selectedEventId === 'all' ? 'selected' : ''}>Todos os Eventos (Consolidado)</option>`;
        producerEvents.forEach(e => {
          eventOptions += `<option value="${e.id}" ${state.selectedEventId === e.id ? 'selected' : ''}>${e.name}</option>`;
        });

        toolbar.innerHTML = `
          <div class="event-selector-box d-flex align-items-center">
            <select class="form-select form-select-sm fw-semibold shadow-sm" id="globalEventSelect" style="min-width: 260px;" onchange="window.app && window.app.setSelectedEvent(this.value)">
              ${eventOptions}
            </select>
          </div>
          <button class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-sm" onclick="window.app && window.app.refreshData()">
            <i class="ph-arrows-counter-clockwise"></i> <span>Atualizar</span>
          </button>
          <button class="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm" onclick="window.app && window.app.openPayoutModal()">
            <i class="ph-hand-coins"></i> <span>Solicitar Repasse</span>
          </button>
        `;
      }
    }
  }

  populateNotifications(state) {
    const list = document.getElementById('notification-list-container');
    const badge = document.getElementById('notification-badge');
    const countBadge = document.getElementById('notification-count-badge');

    const pendingQueue = state.data.approvalQueue.filter(a => a.status !== 'Pago');

    if (badge && countBadge) {
      badge.innerText = `${pendingQueue.length}`;
      countBadge.innerText = `${pendingQueue.length} Pendentes`;
      badge.style.display = pendingQueue.length > 0 ? '' : 'none';
    }

    if (list) {
      if (pendingQueue.length === 0) {
        list.innerHTML = `<div class="p-3 text-center text-muted fs-xs">Sem notificações pendentes</div>`;
      } else {
        list.innerHTML = pendingQueue.map(item => `
          <div class="p-2 px-3 border-bottom d-flex align-items-center justify-content-between hover-bg" style="cursor: pointer;" onclick="window.app.openApprovalSheet('${item.id}')">
            <div>
              <div class="fw-bold fs-xs text-dark">${item.type} #${item.id}</div>
              <div class="fs-xxs text-muted">${item.eventName} &bull; ${formatCurrency(item.requestedAmount)}</div>
            </div>
            <span class="badge ${item.status === 'Rejeitado' ? 'bg-danger' : 'bg-warning text-dark'} fs-xxs">
              ${item.status}
            </span>
          </div>
        `).join('');
      }
    }
  }

  // ==========================================================================
  // RENDERIZADOR DA SIDEBAR (ACCORDION & CANONICAL SUBMENUS POR PERFIL)
  // REGRA: Nunca renderizar menus duplicados. Uma única sidebar muda seus itens por perfil.
  // ==========================================================================
  renderSidebar(state) {
    if (!this.sidebarNav) return;

    const isDisk = state.viewMode === 'disk';
    const isMaster = state.currentUser.role === 'admin';
    const pendingCount = state.pendingApprovalsCount || 17;
    const currentView = state.currentView;

    let profileKey = 'PRODUTOR';
    if (isMaster) {
      profileKey = 'ADMINISTRADOR';
    } else if (isDisk || state.currentUser.role === 'disk') {
      profileKey = 'FINANCEIRO';
    }

    const menuItems = (menusPorPerfil[profileKey] || menusPorPerfil.PRODUTOR).filter(item => !item.hidden);

    this.openedSubmenus = this.openedSubmenus || new Set();

    this.sidebarNav.innerHTML = menuItems.map(item => {
      const hasSubs = Array.isArray(item.subItems) && item.subItems.length > 0;
      const isParentActive = currentView === item.id;
      const badgeHtml = item.badge === 'pendingCount' 
        ? `<span class="badge rounded-pill bg-danger fs-xxs">${pendingCount}</span>` 
        : '';

      if (hasSubs) {
        const isChildActive = item.subItems.some(sub => sub.id === currentView || (Array.isArray(sub.subItems) && sub.subItems.some(child => child.id === currentView)));
        if (isParentActive || isChildActive) {
          this.openedSubmenus.add(item.id);
        }
        const isOpen = this.openedSubmenus.has(item.id);

        return `
          <li class="nav-item nav-item-submenu ${isOpen ? 'is-open nav-item-open' : ''}" data-submenu-id="${item.id}">
            <a class="nav-link" href="javascript:void(0)" aria-label="${item.label}" aria-expanded="${isOpen ? 'true' : 'false'}" title="${item.label}" onclick="window.app && window.app.toggleSubmenu(event, this, '${item.id}')">
              <div class="nav-item-left">
                <i class="${item.icon} nav-item-icon" aria-hidden="true"></i>
                <span class="nav-item-title">${item.label}</span>
              </div>
              <div class="nav-item-right">
                ${badgeHtml}
                <i class="ph-caret-right nav-arrow" aria-hidden="true"></i>
              </div>
            </a>
            <ul class="nav-group-sub" style="display: ${isOpen ? 'flex' : 'none'};">
              ${item.subItems.map(sub => {
                if (sub.group && Array.isArray(sub.subItems)) {
                  const groupActive = sub.subItems.some(child => child.id === currentView);
                  if (groupActive) this.openedSubmenus.add(sub.id);
                  const groupOpen = this.openedSubmenus.has(sub.id);
                  return `
                    <li class="nav-item nav-item-submenu rh-nav-group ${groupOpen ? 'is-open nav-item-open' : ''}" data-submenu-id="${sub.id}">
                      <a class="nav-link rh-nav-group-toggle ${groupActive ? 'active-parent' : ''}" href="javascript:void(0)" aria-label="${sub.label}" aria-expanded="${groupOpen ? 'true' : 'false'}" title="${sub.label}" onclick="window.app && window.app.toggleSubmenu(event, this, '${sub.id}')">
                        <i class="${sub.icon || 'ph-folder'}" aria-hidden="true"></i>
                        <span>${sub.label}</span>
                        <i class="ph-caret-right nav-arrow ms-auto" aria-hidden="true"></i>
                      </a>
                      <ul class="nav-group-sub rh-nav-group-items" style="display: ${groupOpen ? 'flex' : 'none'};">
                        ${sub.subItems.map(child => {
                          const isChildActive = currentView === child.id && (!this.currentFilterArg || this.currentFilterArg === child.filterArg);
                          return `
                            <li class="nav-item">
                              <a class="nav-link ${isChildActive ? 'active' : ''}" href="javascript:void(0)" aria-label="${child.label}" title="${child.label}" onclick="window.app && window.app.navigate('${child.id}', '${child.filterArg || 'all'}')">
                                <i class="ph-caret-right" aria-hidden="true"></i>
                                <span>${child.label}</span>
                              </a>
                            </li>`;
                        }).join('')}
                      </ul>
                    </li>`;
                }
                if (sub.action === 'openPayoutModal') {
                  return `
                    <li class="nav-item">
                      <a class="nav-link" href="javascript:void(0)" aria-label="${sub.label}" title="${sub.label}" onclick="window.app && window.app.openPayoutModal()">
                        <i class="ph-plus-circle" aria-hidden="true"></i>
                        <span>${sub.label}</span>
                      </a>
                    </li>
                  `;
                }
                if (sub.action === 'openTransferModal') {
                  return `
                    <li class="nav-item">
                      <a class="nav-link" href="javascript:void(0)" aria-label="${sub.label}" title="${sub.label}" onclick="window.app && window.app.openTransferModal()">
                        <i class="ph-arrows-left-right" aria-hidden="true"></i>
                        <span>${sub.label}</span>
                      </a>
                    </li>
                  `;
                }
                const isSubActive = currentView === sub.id && (!sub.filterArg || !this.currentFilterArg || this.currentFilterArg === sub.filterArg);
                return `
                  <li class="nav-item">
                    <a class="nav-link ${isSubActive ? 'active' : ''}" href="javascript:void(0)" aria-label="${sub.label}" title="${sub.label}" onclick="window.app && window.app.navigate('${sub.id}', '${sub.filterArg || 'all'}')">
                      <i class="${sub.icon || 'ph-caret-right'}" aria-hidden="true"></i>
                      <span>${sub.label}</span>
                    </a>
                  </li>
                `;
              }).join('')}
            </ul>
          </li>
        `;
      }

      return `
        <li class="nav-item">
          <a class="nav-link ${isParentActive ? 'active' : ''}" href="javascript:void(0)" aria-label="${item.label}" title="${item.label}" onclick="window.app && window.app.navigate('${item.id}')">
            <div class="nav-item-left">
              <i class="${item.icon} nav-item-icon" aria-hidden="true"></i>
              <span class="nav-item-title">${item.label}</span>
            </div>
            ${badgeHtml ? `<div class="nav-item-right">${badgeHtml}</div>` : ''}
          </a>
        </li>
      `;
    }).join('');
  }

  // ==========================================================================
  // BARRA FLUTUANTE DO MODO DEMONSTRAÇÃO (ISOLADA DA NAVEGAÇÃO OFICIAL)
  // ==========================================================================
  renderFloatingDemoBar(state) {
    let bar = document.getElementById('demoFloatingBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'demoFloatingBar';
      bar.className = 'demo-floating-bar';
      document.body.appendChild(bar);
    }

    if (this.demoBarCollapsed) {
      bar.style.padding = '4px 10px';
      bar.innerHTML = `
        <button class="btn btn-sm btn-dark d-flex align-items-center gap-1 shadow" onclick="window.app.toggleDemoBarCollapse()" style="font-size: 0.78rem; font-weight: 700; background: #0f172a; border: 1px solid #3b82f6; border-radius: 20px; padding: 4px 12px; color: #60a5fa;">
          <i class="ph-flask"></i> <span>Ferramentas de Teste (Expandir)</span>
        </button>
      `;
      return;
    }

    bar.style.padding = '';
    const isDisk = state.viewMode === 'disk';
    const isMaster = state.currentUser.role === 'admin';
    const isProducer = !isDisk && !isMaster;
    const isRHActive = String(state.currentView || '').startsWith('diskRH');

    bar.innerHTML = `
      <span class="demo-badge-pill" title="Ambiente público de demonstração com dados simulados">🎮 Perfil Demo Ativo</span>

      <div class="demo-roles-group">
        <button class="demo-role-btn ${isProducer ? 'active-produtor' : ''}" onclick="window.switchGlobalRole('PRODUTOR')" title="Alternar para perfil de demonstração: Produtor">
          <i class="ph-user" aria-hidden="true"></i> <span>Produtor</span>
        </button>
        <button class="demo-role-btn ${isDisk && !isMaster && !isRHActive ? 'active-disk' : ''}" onclick="window.switchGlobalRole('FINANCEIRO')" title="Alternar para perfil de demonstração: Financeiro Disk">
          <i class="ph-shield-check" aria-hidden="true"></i> <span>Financeiro Disk</span>
        </button>
        <button class="demo-role-btn ${isRHActive ? 'active-disk' : ''}" onclick="window.switchGlobalRole('FINANCEIRO'); window.app.navigate('diskRH');" title="Alternar para perfil de demonstração: RH Disk">
          <i class="ph-identification-badge" aria-hidden="true"></i> <span>RH Disk</span>
        </button>
        <button class="demo-role-btn ${isMaster && !isRHActive ? 'active-admin' : ''}" onclick="window.switchGlobalRole('ADMINISTRADOR')" title="Alternar para perfil de demonstração: Adm Financeiro">
          <i class="ph-crown" aria-hidden="true"></i> <span>Adm Financeiro</span>
        </button>
      </div>

      <span class="demo-bar-divider" aria-hidden="true"></span>

      <div class="demo-actions-group">
        <button class="demo-action-btn" onclick="window.app.simulateCardSale()" title="Simula venda de R$ 1.000 no cartão via Cielo">
          + Venda Cartão (R$ 1.000)
        </button>
        <button class="demo-action-btn" onclick="window.app.simulatePixSale()" title="Simula venda de R$ 350 via PIX (liberação D+0)">
          + Venda PIX (R$ 350)
        </button>
        <button class="demo-action-btn" onclick="window.app.simulateChargeback()" title="Simula contestação com retenção cautelar">
          + Chargeback (R$ 450)
        </button>
        <button class="demo-action-btn reset" onclick="window.app.resetDemo()" title="Restaura os dados originais">
          ↻ Reset Demo
        </button>
      </div>

      <button class="demo-collapse-btn" onclick="window.app.toggleDemoBarCollapse()" aria-label="Recolher barra de demonstração" title="Recolher barra para liberar a tela">
        <i class="ph-caret-down" aria-hidden="true"></i>
      </button>
    `;
  }

  renderToast(state) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    if (!state.activeToast) {
      container.innerHTML = '';
      return;
    }

    const t = state.activeToast;
    const badgeClass = t.type === 'danger' ? 'toast-danger' : (t.type === 'warning' ? 'toast-warning' : 'toast-success');

    container.innerHTML = `
      <div class="limitless-toast ${badgeClass}">
        <div>
          <div class="toast-title">${t.title}</div>
          <div class="toast-message">${t.message}</div>
        </div>
        <button class="toast-close" onclick="window.app.closeToast()">&times;</button>
      </div>
    `;
  }

  closeToast() {
    financialStore.closeToast();
  }

  financeAction(action, id = '', data = null) {
    const routes = {
      'nova-regra': 'diskGovernanca_alcadas',
      'editar-alcadas': 'diskGovernanca_alcadas',
      'detalhar-regra': 'diskGovernanca_fluxos',
      'configurar-segregacao': 'diskGovernanca_segregacao',
      'regras-protecao': 'diskGovernanca_sensiveis',
      'tratar-excecoes': 'diskGovernanca_bloqueios',
      'gerenciar-usuarios': 'diskGovernanca_usuarios',
      'ver-alcadas': 'diskGovernanca_alcadas',
      'abrir-aprovacoes': 'diskAprovacoes',
      'ver-auditoria': 'diskGovernanca_acessos',
      'logs-integracao': 'diskIntegracao_logs',
      'central-assinaturas': 'diskIntegracao_assinaturas',
      'novo-repasse': 'repasses',
      'nova-antecipacao': 'antecipacoes',
      'abrir-conciliacao': 'diskConciliacao',
      'ver-recebiveis': 'diskRecebiveis',
      'ver-ledger': 'diskLedger',
      'ver-fechamentos': 'diskFechamentos',
      'ver-dossie': 'diskFechamentos',
      'ver-fluxo-caixa': 'diskFluxoCaixa',
      'ver-pix': 'diskPix',
      'ver-cnab': 'diskCnab',
      'ver-pagamentos-lote': 'diskPagamentosLote',
      'abrir-central-trabalho': 'diskCentralTrabalho'
    };

    const labels = {
      'nova-regra': 'Nova regra de alçada preparada para configuração.',
      'editar-alcadas': 'Matriz de alçadas aberta para edição administrativa.',
      'detalhar-regra': `Regra ${id !== '' ? Number(id) + 1 : ''} aberta com seu fluxo relacionado.`,
      'configurar-segregacao': 'Políticas de Segregação de Funções (SoD) abertas.',
      'regras-protecao': 'Catálogo de Operações Sensíveis aberto para auditoria.',
      'tratar-excecoes': 'Módulo de Quarentena e Exceções carregado.',
      'gerenciar-usuarios': 'Gestão de Usuários Financeiros e Perfis carregada.',
      'ver-alcadas': 'Navegando para Matriz de Alçadas.',
      'abrir-aprovacoes': 'Central de Aprovações aberta.',
      'ver-auditoria': 'Trilha de auditoria carregada.',
      'logs-integracao': 'Logs técnicos de integração carregados.',
      'central-assinaturas': 'Central de Assinaturas digitais carregada.',
      'aprovar-operacao': `Operação ${id || ''} aprovada com sucesso e encaminhada para assinatura/pagamento.`,
      'rejeitar-operacao': `Operação ${id || ''} rejeitada e reserva de saldo liberada.`,
      'assinar-termo': `Documento vinculado à operação ${id || ''} assinado digitalmente via ICP-Brasil.`,
      'executar-pagamento': `Ordem de pagamento ${id || ''} autorizada e enviada para liquidação PIX/CNAB.`,
      'conciliar-movimento': `Lançamento ${id || ''} conciliado com sucesso no Ledger e extrato bancário.`,
      'ajustar-ledger': 'Solicitação de ajuste contábil enviada para validação da Controladoria.',
      'exportar-dados': 'Relatório analítico exportado com sucesso em formato CSV.',
      'atualizar-central': 'Fila da Central de Trabalho atualizada com sucesso.'
    };

    // Ações operacionais que alteram o estado do sistema e refletem em tempo real
    if (action === 'aprovar-operacao' && id) {
      if (typeof financialStore.approveOperationByDisk === 'function') {
        financialStore.approveOperationByDisk(id);
      } else if (typeof financialStore.approveRequest === 'function') {
        financialStore.approveRequest(id, 'Aprovado via Governança/Ações Financeiras');
      }
      financialStore.showToast('Operação Aprovada', labels[action] || `Operação ${id} aprovada.`, 'success');
      this.navigate('diskAprovacoes');
      return;
    }

    if (action === 'rejeitar-operacao' && id) {
      if (typeof financialStore.rejectOperationByDisk === 'function') {
        financialStore.rejectOperationByDisk(id, {
          reasonCategory: 'Política de Risco',
          observation: 'Rejeitado por política de governança e alçadas'
        });
      } else if (typeof financialStore.rejectRequest === 'function') {
        financialStore.rejectRequest(id, 'Rejeitado por política de risco');
      }
      financialStore.showToast('Operação Rejeitada', labels[action] || `Operação ${id} rejeitada.`, 'warning');
      this.navigate('diskAprovacoes');
      return;
    }

    if (action === 'ver-dossie') {
      const state = financialStore.getState();
      if (id && state.data.producers.some(p => p.id === id)) {
        return this.openProducerDossier(id);
      }
      this.navigate('diskFechamentos', 'dossie');
      return;
    }

    if (action === 'assinar-termo') {
      financialStore.showToast('Assinatura Digital', labels[action] || 'Termo assinado.', 'success');
      this.navigate('diskIntegracao_assinaturas');
      return;
    }

    if (action === 'executar-pagamento') {
      financialStore.showToast('Tesouraria', labels[action] || 'Pagamento processado.', 'success');
      this.navigate('diskPix');
      return;
    }

    if (action === 'conciliar-movimento') {
      financialStore.showToast('Conciliação', labels[action] || 'Movimento conciliado.', 'success');
      this.navigate('diskConciliacao');
      return;
    }

    if (action === 'novo-repasse') {
      if (typeof this.openPayoutModal === 'function') {
        this.openPayoutModal();
      } else {
        this.navigate('repasses');
      }
      return;
    }

    financialStore.showToast('Ação Financeira', labels[action] || 'Ação executada e comunicada ao módulo relacionado.', 'info');
    if (routes[action]) {
      this.navigate(routes[action]);
    }
  }

  // ==========================================================================
  // BARRAMENTO FUNCIONAL DE AÇÕES INTEGRADAS (PACOTE 11 / PACOTE 12)
  // Comunicação transversal: Ação → Feedback → Módulo de Destino → Atualização
  // ==========================================================================
  integratedAction(action, options = {}) {
    const opts = typeof options === 'string' || typeof options === 'number' ? { id: String(options) } : (options || {});
    const id = opts.id || opts.protocol || '';

    const actionRoutes = {
      'novo-repasse': { route: 'repasses', msg: 'Formulário de solicitação de repasse iniciado.', type: 'info' },
      'nova-antecipacao': { route: 'antecipacoes', msg: 'Simulador de antecipação de recebíveis aberto.', type: 'info' },
      'abrir-aprovacoes': { route: 'diskAprovacoes', msg: 'Central de Aprovações carregada.', type: 'info' },
      'abrir-solicitacoes': { route: 'diskSolicitacoes', msg: 'Central de Solicitações carregada.', type: 'info' },
      'abrir-assinaturas': { route: 'diskAssinaturas', msg: 'Central de Assinaturas digitais carregada.', type: 'info' },
      'abrir-tesouraria': { route: 'diskTesouraria', msg: 'Módulo de Tesouraria e Contas Bancárias aberto.', type: 'info' },
      'abrir-conciliacao': { route: 'diskConciliacao', msg: 'Central de Conciliação Financeira carregada.', type: 'info' },
      'abrir-ledger': { route: 'diskLedger', msg: 'Livro-Razão Contábil (Ledger) carregado.', type: 'info' },
      'abrir-pix': { route: 'diskPix', msg: 'Módulo de transferências PIX carregado.', type: 'info' },
      'abrir-cnab': { route: 'diskCnab', msg: 'Processamento de Remessas e Retornos CNAB aberto.', type: 'info' },
      'abrir-autentique': { route: 'diskIntegracao_autentique', msg: 'Painel de integração Autentique carregado.', type: 'info' },
      'abrir-contaazul': { route: 'diskIntegracao_contaazul', msg: 'Painel de sincronização Conta Azul carregado.', type: 'info' },
      'abrir-governanca': { route: 'diskGovernanca', msg: 'Painel de Governança e Alçadas carregado.', type: 'info' },
      'abrir-central-trabalho': { route: 'diskCentralTrabalho', msg: 'Central de Trabalho Financeiro aberta.', type: 'info' },
      'aprovar-operacao': { route: 'diskAprovacoes', msg: `Operação ${id} aprovada com sucesso.`, type: 'success' },
      'rejeitar-operacao': { route: 'diskAprovacoes', msg: `Operação ${id} rejeitada formalmente.`, type: 'warning' },
      'assinar-termo': { route: 'diskAssinaturas', msg: `Termo vinculado à operação ${id} assinado.`, type: 'success' },
      'liquidar-operacao': { route: 'diskPix', msg: `Ordem de pagamento ${id} liquidada na Tesouraria.`, type: 'success' },
      'conciliar-operacao': { route: 'diskConciliacao', msg: `Operação ${id} conciliada no Ledger.`, type: 'success' },
      'sincronizar-erp': { route: 'diskIntegracao_sincronizacoes', msg: 'Sincronização com ERP enfileirada.', type: 'info' },
      'gerar-cnab': { route: 'diskCnab', msg: 'Arquivo de remessa CNAB 240 gerado com sucesso.', type: 'success' },
      'definir-conta-padrao': { route: 'dadosBancarios', msg: 'Conta bancária homologada definida como padrão.', type: 'success' },
      'exportar-relatorio': { route: null, msg: 'Relatório financeiro exportado com sucesso.', type: 'success' }
    };

    const targetDef = actionRoutes[action];

    if (action === 'novo-repasse') {
      if (typeof this.openPayoutModal === 'function') {
        this.openPayoutModal();
      } else {
        this.navigate('repasses');
      }
      return;
    }

    if (action === 'aprovar-operacao' && id) {
      if (typeof financialStore.approveOperationByDisk === 'function') {
        financialStore.approveOperationByDisk(id);
      } else if (typeof financialStore.approveRequest === 'function') {
        financialStore.approveRequest(id, opts.note || 'Aprovado via Ação Integrada');
      }
      this.navigate('diskAprovacoes');
      return;
    }

    if (action === 'rejeitar-operacao' && id) {
      if (typeof financialStore.rejectOperationByDisk === 'function') {
        financialStore.rejectOperationByDisk(id, {
          reasonCategory: opts.reasonCategory || 'Divergência Documental / Risco',
          observation: opts.observation || opts.reason || 'Rejeição formal solicitada via fluxo operacional.'
        });
      } else if (typeof financialStore.rejectRequest === 'function') {
        financialStore.rejectRequest(id, opts.reason || 'Rejeição via Ação Integrada');
      }
      this.navigate('diskAprovacoes');
      return;
    }

    if (action === 'assinar-termo' && id) {
      const state = financialStore.getState();
      if (state.currentUser.role === 'producer') {
        financialStore.signByProducer(id);
      } else {
        financialStore.signByDisk(id);
      }
      this.navigate('diskAssinaturas');
      return;
    }

    if (action === 'liquidar-operacao' && id) {
      financialStore.executeFinalTransfer(id);
      this.navigate('diskPix');
      return;
    }

    const message = opts.message || targetDef?.msg || `Ação ${action} processada com sucesso.`;
    const toastType = targetDef?.type || 'info';
    financialStore.showToast('Fluxo Integrado', message, toastType);

    const targetRoute = opts.target || targetDef?.route;
    if (targetRoute) {
      this.navigate(targetRoute, opts.filterArg || 'all');
    }
  }

  // ==========================================================================
  // FUNÇÕES AVANÇADAS DO PACOTE 13 E 14 (SPREAD, ADVANCED, SPLIT, ESTORNOS)
  // ==========================================================================
  p13Action(action, id = '') {
    try {
      if (action === 'nova-taxa' || action === 'editar-taxa' || action === 'duplicar-taxa') {
        return this.openSpreadRuleModal(action, id);
      }
      if (action === 'status-taxa') {
        const r = financialStore.setSpreadRuleStatus(id);
        financialStore.showToast('Situação Atualizada', `${r.name}: ${r.status}.`, 'success');
        financialStore.notify();
        return;
      }
      if (action === 'historico-taxa') {
        return this.openSpreadHistory(id);
      }
      if (action === 'excluir-taxa') {
        try {
          const r = financialStore.deleteSpreadRule(id);
          financialStore.showToast('Regra Excluída', `${r.name} removida com sucesso.`, 'success');
          financialStore.notify();
        } catch (e) {
          financialStore.showToast('Regra Preservada', e.message, 'warning');
        }
        return;
      }
      if (action === 'simular-spread') {
        return this.openSpreadSimulatorModal();
      }
      if (action === 'novo-lancamento') {
        return this.openPayableModal();
      }
      if (action === 'novo-estorno') {
        return this.openRefundModal();
      }
      if (action === 'editar-split') {
        return this.openSplitModal(id);
      }
      if (action === 'liquidar') {
        const row = financialStore.liquidatePayable(id);
        financialStore.showToast('Título Liquidado', `${row.id} · ${row.creditor} foi liquidado e lançado no Ledger.`, 'success');
        return this.navigate('diskAdvanced');
      }

      const routes = {
        'analisar-estorno': 'diskAprovacoes',
        'historico-split': 'diskDivisaoReceitas'
      };
      const map = {
        'historico-split': ['Histórico de Splits', 'Histórico operacional preservado no estado do Core Financeiro.'],
        'exportar-estornos': ['Exportação', 'Visão de estornos preparada para exportação analítica.'],
        'analisar-estorno': ['Central de Aprovações', `Estorno ${id || ''} aberto na fila de análise com o mesmo protocolo.`]
      };
      const x = map[action] || ['Ação Financeira', 'Ação registrada no fluxo operacional.'];
      financialStore.showToast(x[0], x[1], 'info');
      if (routes[action]) this.navigate(routes[action]);
    } catch (e) {
      financialStore.showToast('Operação não realizada', e.message, 'danger');
    }
  }

  // Filtros da Visão de Taxas e Spread
  setSpreadFilterScope(scope) {
    this.filterSpreadScope = scope;
    financialStore.notify();
  }
  setSpreadFilterAcquirer(acquirer) {
    this.filterSpreadAcquirer = acquirer;
    financialStore.notify();
  }
  setSpreadFilterStatus(status) {
    this.filterSpreadStatus = status;
    financialStore.notify();
  }

  openSpreadRuleModal(action = 'nova-taxa', id = '') {
    const st = financialStore.getState();
    let r = st.data.spreadRules?.find(x => x.id === id) || {
      name: '',
      acquirer: 'Cielo',
      paymentMethod: 'Cartão de Crédito',
      brand: 'Visa/Mastercard',
      installments: '1x',
      chargedRate: '',
      mdr: '',
      fixedFee: 0,
      additionalCost: 0,
      commercialRevenueFixed: 0,
      payer: 'Produtor',
      term: 'D+30',
      scopeType: 'Geral Disk',
      scopeId: 'all',
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: ''
    };
    if (action === 'duplicar-taxa') {
      r = { ...r, id: null, name: `${r.name} (cópia)`, version: 1, history: [] };
    }

    const producers = (st.data.producers || []).map(p =>
      `<option value="${p.id}" ${r.scopeId === p.id ? 'selected' : ''}>Produtor: ${p.name}</option>`
    ).join('');
    const events = (st.data.events || []).map(e =>
      `<option value="${e.id}" ${r.scopeId === e.id ? 'selected' : ''}>Evento: ${e.name}</option>`
    ).join('');
    const scopeOptions = `<option value="all" ${r.scopeId === 'all' ? 'selected' : ''}>Geral Disk (Todos)</option>${producers}${events}`;

    const titleText = action === 'nova-taxa'
      ? '+ Nova Taxa / Regra Comercial'
      : (action === 'duplicar-taxa' ? 'Duplicar Taxa Comercial' : `Editar Taxa · Versão v${(r.version || 1) + 1}`);

    this.showModal(`
      <div class="modal-card" style="max-width: 820px;">
        <div class="modal-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
              <i class="ph-percent" style="color: #60a5fa; margin-right: 6px;"></i>
              ${titleText}
            </h4>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              MDR é o custo pago pela Disk; taxa cobrada é a regra comercial aplicada. Spread líquido calculado em tempo real.
            </div>
          </div>
          <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitSpreadRule(event, '${action === 'editar-taxa' ? id : ''}')">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fw-bold">Nome da Regra Comercial *</label>
              <input name="name" class="form-control" required value="${r.name || ''}" placeholder="Ex: Cartão de Crédito Parcelado (2 a 6x)">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Adquirente / Gateway *</label>
              <select name="acquirer" class="form-select" required>
                <option value="Cielo" ${r.acquirer === 'Cielo' ? 'selected' : ''}>Cielo</option>
                <option value="Rede" ${r.acquirer === 'Rede' ? 'selected' : ''}>Rede</option>
                <option value="Stone" ${r.acquirer === 'Stone' ? 'selected' : ''}>Stone</option>
                <option value="EfiPix" ${r.acquirer === 'EfiPix' ? 'selected' : ''}>EfiPix</option>
                <option value="PagBank" ${r.acquirer === 'PagBank' ? 'selected' : ''}>PagBank</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Meio de Pagamento *</label>
              <select name="paymentMethod" class="form-select" required>
                <option ${r.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                <option ${r.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                <option ${r.paymentMethod === 'PIX' ? 'selected' : ''}>PIX</option>
                <option ${r.paymentMethod === 'Boleto' ? 'selected' : ''}>Boleto</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Bandeira</label>
              <input name="brand" class="form-control" value="${r.brand || 'Visa/Mastercard'}" placeholder="Ex: Visa/Mastercard, Elo, Todas">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Parcelamento</label>
              <input name="installments" class="form-control" value="${r.installments || '1x'}" placeholder="Ex: 1x, 2 a 6x, 7 a 12x">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Custo MDR Disk % *</label>
              <input id="modalInputMdr" name="mdr" type="number" step="0.01" min="0" class="form-control" required value="${r.mdr}" placeholder="Ex: 2.80" oninput="window.app.recalcModalSpread()">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Taxa Cobrada % *</label>
              <input id="modalInputCharged" name="chargedRate" type="number" step="0.01" min="0" class="form-control" required value="${r.chargedRate}" placeholder="Ex: 8.00" oninput="window.app.recalcModalSpread()">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Tarifa Fixa do Adquirente (R$)</label>
              <input id="modalInputFixed" name="fixedFee" type="number" step="0.01" min="0" class="form-control" value="${r.fixedFee || 0}" oninput="window.app.recalcModalSpread()">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Custos Adicionais (R$)</label>
              <input id="modalInputAdditional" name="additionalCost" type="number" step="0.01" min="0" class="form-control" value="${r.additionalCost || 0}" oninput="window.app.recalcModalSpread()">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Receita Fixa Comercial (R$)</label>
              <input id="modalInputRevenueFixed" name="commercialRevenueFixed" type="number" step="0.01" min="0" class="form-control" value="${r.commercialRevenueFixed || 0}" oninput="window.app.recalcModalSpread()">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Tipo de Regra</label>
              <select name="ruleType" class="form-select">
                <option value="Percentual" ${r.ruleType === 'Percentual' ? 'selected' : ''}>Percentual</option>
                <option value="Fixa" ${r.ruleType === 'Fixa' ? 'selected' : ''}>Fixa</option>
                <option value="Híbrida" ${!r.ruleType || r.ruleType === 'Híbrida' ? 'selected' : ''}>Híbrida</option>
              </select>
            </div>

            <!-- Box Dinâmico de Cálculo de Spread Líquido -->
            <div class="col-12">
              <div id="modalSpreadLiveBox" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.78rem; font-weight: 700; color: #166534; text-transform: uppercase;">Spread Bruto / Margem Líquida:</div>
                  <div id="modalSpreadText" style="font-size: 1.15rem; font-weight: 800; color: #15803d;">
                    Spread bruto ${(Number(r.chargedRate || 0) - Number(r.mdr || 0)).toFixed(2)}% · simule o ticket para margem líquida
                  </div>
                </div>
                <div style="font-size: 0.78rem; color: #166534; text-align: right;">
                  Fórmulas:<br><strong>Spread bruto = Taxa cobrada − MDR</strong><br><strong>Margem líquida = Receita − MDR − tarifas − custos adicionais</strong>
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label fw-bold">Quem Absorve a Taxa</label>
              <select name="payer" class="form-select">
                <option value="Produtor" ${r.payer === 'Produtor' ? 'selected' : ''}>Produtor (Retenção)</option>
                <option value="Comprador" ${r.payer === 'Comprador' ? 'selected' : ''}>Comprador (Conveniência)</option>
                <option value="Compartilhada" ${r.payer === 'Compartilhada' ? 'selected' : ''}>Compartilhada</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Prazo de Liquidação</label>
              <input name="term" class="form-control" value="${r.term || 'D+30'}" placeholder="Ex: D+0, D+1, D+14, D+30">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold">Abrangência da Regra *</label>
              <select name="scopeType" class="form-select" onchange="document.getElementById('spreadScopeId').disabled = (this.value === 'Geral Disk')">
                <option value="Geral Disk" ${r.scopeType === 'Geral Disk' ? 'selected' : ''}>Geral Disk</option>
                <option value="Produtor" ${r.scopeType === 'Produtor' ? 'selected' : ''}>Produtor Específico</option>
                <option value="Evento" ${r.scopeType === 'Evento' ? 'selected' : ''}>Evento Específico</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Produtor / Evento Vinculado</label>
              <select id="spreadScopeId" name="scopeId" class="form-select" ${r.scopeType === 'Geral Disk' ? 'disabled' : ''}>
                ${scopeOptions}
              </select>
              <div class="form-text" style="font-size: 0.75rem; color: #64748b;">
                Hierarquia Automática: Evento → Produtor → Geral Disk.
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Início da Vigência</label>
              <input name="validFrom" type="date" class="form-control" value="${r.validFrom || ''}">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Fim da Vigência</label>
              <input name="validTo" type="date" class="form-control" value="${r.validTo || ''}">
            </div>

            <div class="col-12">
              <div class="info-banner info-banner-blue mb-0" style="padding: 10px 14px; font-size: 0.8rem;">
                <i class="ph-info"></i>
                <div>
                  <strong>Auditoria e Versionamento:</strong> Ao editar uma taxa existente, uma nova versão (ex: v${(r.version || 1) + 1}) é registrada automaticamente e a versão anterior permanece no histórico de auditoria e contratos passados.
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer px-0 pb-0 mt-4">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold" style="background: #2563eb; border-color: #1d4ed8;">
              <i class="ph-floppy-disk me-1"></i> Salvar e Publicar Regra
            </button>
          </div>
        </form>
      </div>
    `);
  }

  recalcModalSpread() {
    const charged = parseFloat(document.getElementById('modalInputCharged')?.value) || 0;
    const mdr = parseFloat(document.getElementById('modalInputMdr')?.value) || 0;
    const fixed = parseFloat(document.getElementById('modalInputFixed')?.value) || 0;
    const additional = parseFloat(document.getElementById('modalInputAdditional')?.value) || 0;
    const revenueFixed = parseFloat(document.getElementById('modalInputRevenueFixed')?.value) || 0;
    const spread = charged - mdr;
    const box = document.getElementById('modalSpreadText');
    if (box) {
      box.innerText = `${spread >= 0 ? '+' : ''}${spread.toFixed(2)}% de Spread Bruto · tarifa R$ ${fixed.toFixed(2)} · outros R$ ${additional.toFixed(2)} · receita fixa R$ ${revenueFixed.toFixed(2)}`;
    }
  }

  submitSpreadRule(ev, id = '') {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      if (!f.scopeId) f.scopeId = 'all';
      const row = financialStore.saveSpreadRule(f, id || null);
      this.closeModal();
      financialStore.showToast(
        'Taxa Comercial Salva',
        `${row.id} · v${row.version} publicada e persistida com spread líquido de +${(row.chargedRate - row.mdr).toFixed(2)}%.`,
        'success'
      );
      this.navigate('diskTaxas');
    } catch (e) {
      financialStore.showToast('Não foi possível salvar', e.message, 'danger');
    }
  }

  openSpreadHistory(id = '') {
    const st = financialStore.getState();
    const r = st.data.spreadRules?.find(x => x.id === id);
    if (!r) return;
    const versions = [
      { version: r.version || 1, changedAt: r.updatedAt || r.createdAt || 'Atual', changedBy: 'Versão Vigente', snapshot: r },
      ...(r.history || [])
    ];

    this.showModal(`
      <div class="modal-card" style="max-width: 780px;">
        <div class="modal-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
              <i class="ph-clock-counter-clockwise" style="color: #60a5fa; margin-right: 6px;"></i>
              Histórico de Versões da Taxa Comercial
            </h4>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              ${r.id} · ${r.name} · Adquirente: ${r.acquirer}
            </div>
          </div>
          <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Versão</th>
                  <th>Data & Responsável</th>
                  <th style="text-align: right;">Taxa Cobrada</th>
                  <th style="text-align: right;">Custo MDR</th>
                  <th style="text-align: right;">Spread Líquido</th>
                  <th>Abrangência</th>
                </tr>
              </thead>
              <tbody>
                ${versions.map(v => {
                  const x = v.snapshot || {};
                  const charged = Number(x.chargedRate || 0);
                  const mdr = Number(x.mdr || 0);
                  const sp = charged - mdr;
                  return `
                    <tr>
                      <td><span class="badge ${v.version === r.version ? 'badge-primary' : 'badge-neutral'}">v${v.version}</span></td>
                      <td>
                        <div style="font-weight: 600; font-size: 0.85rem;">${v.changedAt || '—'}</div>
                        <div style="font-size: 0.72rem; color: #64748b;">${v.changedBy || 'Sistema'}</div>
                      </td>
                      <td style="text-align: right; font-weight: 700;">${charged.toFixed(2)}%</td>
                      <td style="text-align: right; color: #dc2626;">${mdr.toFixed(2)}%</td>
                      <td style="text-align: right; font-weight: 800; color: #059669;">+${sp.toFixed(2)}%</td>
                      <td>
                        <span class="badge badge-neutral" style="font-size: 0.72rem;">${x.scopeType || 'Geral Disk'}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  openSpreadSimulatorModal() {
    const st = financialStore.getState();
    const producers = st.data.producers || [];
    const events = st.data.events || [];

    this.showModal(`
      <div class="modal-card" style="max-width: 700px;">
        <div class="modal-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
              <i class="ph-calculator" style="color: #60a5fa; margin-right: 6px;"></i>
              Simulador Financeiro de Spread & Rentabilidade
            </h4>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Simulação baseada na hierarquia oficial: Regra do Evento → Regra do Produtor → Regra Geral Disk
            </div>
          </div>
          <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <label class="form-label fw-bold">Valor da Venda Simulado (R$)</label>
              <input id="simTransAmount" type="number" step="0.01" class="form-control form-control-lg fw-bold" value="1000.00" oninput="window.app.updateSpreadSimulation()">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Meio de Pagamento</label>
              <select id="simPayMethod" class="form-select form-select-lg" onchange="window.app.updateSpreadSimulation()">
                <option value="Cartão de Crédito" selected>Cartão de Crédito</option>
                <option value="PIX">PIX Instantâneo</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto Bancário</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Produtor Contratante</label>
              <select id="simProducerId" class="form-select" onchange="window.app.updateSpreadSimulation()">
                <option value="">Nenhum (Padrão Geral)</option>
                ${producers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Evento Específico</label>
              <select id="simEventId" class="form-select" onchange="window.app.updateSpreadSimulation()">
                <option value="">Nenhum (Padrão Geral)</option>
                ${events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Resultado da Simulação -->
          <div id="simResultBox" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <!-- Preenchido dinamicamente por updateSpreadSimulation -->
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
    this.updateSpreadSimulation();
  }

  updateSpreadSimulation() {
    const valInput = document.getElementById('simTransAmount');
    const methInput = document.getElementById('simPayMethod');
    const prodInput = document.getElementById('simProducerId');
    const evtInput = document.getElementById('simEventId');
    const resBox = document.getElementById('simResultBox');
    if (!resBox) return;

    const val = parseFloat(valInput?.value) || 1000.00;
    const method = methInput?.value || 'Cartão de Crédito';
    const prodId = prodInput?.value || null;
    const evtId = evtInput?.value || null;

    const resolved = financialStore.resolveCommercialFeeRule({
      eventId: evtId,
      producerId: prodId,
      paymentMethod: method,
      installments: '1x'
    });

    const rule = resolved.rule || { name: 'Regra Padrão', chargedRate: 5.0, mdr: 2.0, fixedFee: 0, acquirer: 'Cielo', term: 'D+30', payer: 'Produtor' };
    const chargedPercent = Number(rule.chargedRate || 0);
    const mdrPercent = Number(rule.mdr || 0);
    const fixedFee = Number(rule.fixedFee || 0);

    const chargedVal = (val * (chargedPercent / 100)) + fixedFee;
    const mdrVal = (val * (mdrPercent / 100));
    const spreadVal = chargedVal - mdrVal;
    const netProducer = val - chargedVal;

    resBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
        <div>
          <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Regra Resolvida por Prioridade</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: #1e293b;">${rule.name}</div>
          <div style="font-size: 0.75rem; color: #64748b;">Adquirente: ${rule.acquirer} · Liquidação: ${rule.term}</div>
        </div>
        <span class="badge ${resolved.resolvedScope === 'Evento' ? 'badge-info' : (resolved.resolvedScope === 'Produtor' ? 'badge-primary' : 'badge-neutral')}" style="padding: 6px 10px; font-weight: 700;">
          Prioridade: ${resolved.resolvedScope}
        </span>
      </div>

      <div class="row g-3">
        <div class="col-4">
          <div style="font-size: 0.75rem; color: #64748b;">Taxa Cobrada (${chargedPercent.toFixed(2)}%)</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #1e293b;">R$ ${chargedVal.toFixed(2)}</div>
        </div>
        <div class="col-4">
          <div style="font-size: 0.75rem; color: #dc2626;">Custo MDR Disk (${mdrPercent.toFixed(2)}%)</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #dc2626;">-R$ ${mdrVal.toFixed(2)}</div>
        </div>
        <div class="col-4">
          <div style="font-size: 0.75rem; color: #059669; font-weight: 700;">Spread Líquido Disk</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #059669;">+R$ ${spreadVal.toFixed(2)}</div>
        </div>
      </div>

      <div style="margin-top: 16px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 0.75rem; color: #64748b;">Líquido Creditado ao Produtor:</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #2563eb;">R$ ${netProducer.toFixed(2)}</div>
        </div>
        <div style="text-align: right; font-size: 0.75rem; color: #64748b;">
          Absorção: <strong>${rule.payer}</strong><br>
          Disponibilidade: <strong>${rule.term}</strong>
        </div>
      </div>
    `;
  }

  openPayableModal() {
    this.showModal(`
      <div class="modal-card" style="max-width: 560px;">
        <div class="modal-header">
          <h4 class="mb-0 fw-bold">Novo Lançamento Financeiro</h4>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitPayable(event)">
          <div class="mb-3">
            <label class="form-label fw-bold">Fornecedor / Credor</label>
            <input name="creditor" class="form-control" required placeholder="Ex: Mega Som & Iluminação">
          </div>
          <div class="row g-3">
            <div class="col-6">
              <label class="form-label fw-bold">Vencimento</label>
              <input name="dueDate" type="date" class="form-control" required>
            </div>
            <div class="col-6">
              <label class="form-label fw-bold">Valor (R$)</label>
              <input name="amount" type="number" step="0.01" class="form-control" required placeholder="0.00">
            </div>
          </div>
          <div class="mt-3">
            <label class="form-label fw-bold">Observação</label>
            <textarea name="notes" class="form-control" placeholder="Descreva a despesa ou centro de custo..."></textarea>
          </div>
          <div class="modal-footer px-0 pb-0 mt-4">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold">Salvar Lançamento</button>
          </div>
        </form>
      </div>
    `);
  }

  submitPayable(ev) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      const r = financialStore.createPayable(f);
      this.closeModal();
      financialStore.showToast('Lançamento Criado', `${r.id} (${r.creditor}) salvo e disponível no Financeiro Advanced.`, 'success');
      this.navigate('diskAdvanced');
    } catch (e) {
      financialStore.showToast('Não foi possível salvar', e.message, 'danger');
    }
  }

  openRefundModal() {
    this.showModal(`
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <h4 class="mb-0 fw-bold">Nova Solicitação de Estorno</h4>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitRefund(event)">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Pedido Original</label>
              <input name="orderId" class="form-control" required placeholder="Ex: #PED-154231">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Cliente</label>
              <input name="customer" class="form-control" placeholder="Nome do titular da compra">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Evento Vinculado</label>
              <input name="eventName" class="form-control" placeholder="Nome do evento">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Valor (R$)</label>
              <input name="amount" type="number" step="0.01" class="form-control" required placeholder="0.00">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Pagamento</label>
              <select name="paymentMethod" class="form-select">
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Motivo da Devolução</label>
              <textarea name="reason" class="form-control" required placeholder="Justifique o motivo do estorno para conferência de alçada..."></textarea>
            </div>
          </div>
          <div class="modal-footer px-0 pb-0 mt-4">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold">Enviar para Aprovação</button>
          </div>
        </form>
      </div>
    `);
  }

  submitRefund(ev) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      const r = financialStore.createRefundRequest(f);
      this.closeModal();
      financialStore.showToast('Estorno Protocolado', `${r.id} criado com protocolo único e encaminhado à Central de Aprovações.`, 'success');
      this.navigate('diskCentralEstornos');
    } catch (e) {
      financialStore.showToast('Não foi possível criar', e.message, 'danger');
    }
  }

  openSplitModal(id = '') {
    const st = financialStore.getState();
    const r = st.data.splitRules?.find(x => x.id === id) || st.data.splitRules?.find(x => x.status === 'Ativa');
    const b = r?.beneficiaries || [];
    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <h4 class="mb-0 fw-bold">Configurar Divisão de Receitas (Split)</h4>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitSplit(event)">
          <div class="mb-3">
            <label class="form-label fw-bold">Nome da Regra</label>
            <input name="name" class="form-control" value="${r?.name || 'Regra padrão do evento'}" required>
            <input type="hidden" name="eventId" value="${st.selectedEventId === 'all' ? 'evt-001' : st.selectedEventId}">
          </div>
          <label class="form-label fw-bold mb-2">Beneficiários e Percentuais (Soma obrigatória: 100%)</label>
          <div class="row g-2">
            ${[0, 1, 2, 3].map(i => `
              <div class="col-8">
                <input name="beneficiary${i}" class="form-control" required value="${b[i]?.name || ''}" placeholder="Nome do Beneficiário ${i + 1}">
              </div>
              <div class="col-4">
                <div class="input-group">
                  <input name="percent${i}" type="number" step="0.01" class="form-control" required value="${b[i]?.percent ?? 0}">
                  <span class="input-group-text">%</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="alert alert-info mt-3 mb-0 fs-xs">
            <i class="ph-info me-1"></i> A publicação desta regra substitui a regra ativa anterior do evento e recalcula os recebíveis com registro imutável no Ledger.
          </div>
          <div class="modal-footer px-0 pb-0 mt-4">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold">Publicar Regra de Split</button>
          </div>
        </form>
      </div>
    `);
  }

  submitSplit(ev) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      const beneficiaries = [0, 1, 2, 3]
        .filter(i => f[`beneficiary${i}`])
        .map(i => ({ name: f[`beneficiary${i}`], percent: Number(f[`percent${i}`]) }));
      const r = financialStore.saveSplitRule({ eventId: f.eventId, name: f.name, beneficiaries });
      this.closeModal();
      financialStore.showToast('Regra de Divisão Publicada', `${r.id} persistida e ativada para o evento com 100% distribuído.`, 'success');
      this.navigate('diskDivisaoReceitas');
    } catch (e) {
      financialStore.showToast('Regra não publicada', e.message, 'danger');
    }
  }

  p13RecalcSplit(raw) {
    const n = Number(String(raw).replace(/\./g, '').replace(',', '.')) || 0;
    const el = document.getElementById('p13SplitBars');
    if (!el) return;
    const money = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const st = financialStore.getState();
    const activeRule = (st.data.splitRules || []).find(x => x.status === 'Ativa') || {};
    const rows = (activeRule.beneficiaries && activeRule.beneficiaries.length) ? activeRule.beneficiaries : [
      { name: 'Organizador (Principal)', percent: 70 },
      { name: 'Afiliado / Coprodutor', percent: 10 },
      { name: 'Produtor Artístico', percent: 15 },
      { name: 'Plataforma DiskIngressos', percent: 5 }
    ];
    el.innerHTML = rows.map(x => `
      <div class="p13-bar">
        <div><strong>${x.name}</strong><span>${x.percent}% | ${money(n * x.percent / 100)}</span></div>
        <div class="p13-track"><i style="width:${x.percent}%"></i></div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // CONTAS FINANCEIRAS & BANCÁRIAS — MODAIS & AÇÕES (PACOTE 17)
  // ==========================================================================

  setDiskProdutoresTab(tab) {
    this.diskProdutoresTab = tab;
    financialStore.notify();
  }

  setBankFilterProducer(producerId) {
    this.filterBankProducer = producerId;
    financialStore.notify();
  }

  setBankFilterStatus(status) {
    this.filterBankStatus = status;
    financialStore.notify();
  }

  openAddProducerBankModal(defaultProducerId = null, defaultEventId = null) {
    const state = financialStore.getState();
    const producers = state.data.producers || [];
    const prodId = defaultProducerId || (state.selectedProducerId !== 'all' ? state.selectedProducerId : (producers[0]?.id || ''));
    const prod = producers.find(p => p.id === prodId) || producers[0];
    const events = (state.data.events || []).filter(e => e.producerId === prodId);

    const html = `
      <div class="modal-card" style="max-width: 660px;">
        <div class="modal-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
              <i class="ph-bank" style="color: #60a5fa; margin-right: 6px;"></i>
              Adicionar Conta Financeira / Bancária
            </h4>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Cadastro de conta bancária de repasse informada pelo produtor (Entra como 🟡 Pendente de Validação)
            </div>
          </div>
          <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <form id="addProducerBankForm" onsubmit="window.app.handleAddProducerBankSubmit(event)">
            
            <!-- Produtor -->
            <div class="form-group mb-3">
              <label class="form-label fw-bold">Produtor Titular *</label>
              <select class="form-control" id="addBank_producerId" required onchange="window.app.onAddBankProducerChange(this.value)">
                ${producers.map(p => `
                  <option value="${p.id}" ${p.id === prodId ? 'selected' : ''}>
                    ${p.name} (${p.cnpj})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Vinculação: Geral ou Evento -->
            <div class="form-group mb-3">
              <label class="form-label fw-bold">Vinculação da Conta *</label>
              <div style="display: flex; gap: 20px; margin-top: 4px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.88rem;">
                  <input type="radio" name="addBank_bindingType" value="geral" ${!defaultEventId ? 'checked' : ''} onchange="window.app.onAddBankBindingChange('geral')">
                  <span>● Conta geral do Produtor (Todos os eventos)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.88rem;">
                  <input type="radio" name="addBank_bindingType" value="evento" ${defaultEventId ? 'checked' : ''} onchange="window.app.onAddBankBindingChange('evento')">
                  <span>○ Vincular a evento específico</span>
                </label>
              </div>
            </div>

            <!-- Evento (se vinculado) -->
            <div class="form-group mb-3" id="addBank_eventWrapper" style="${defaultEventId ? '' : 'display: none;'}">
              <label class="form-label fw-bold">Evento Selecionado *</label>
              <select class="form-control" id="addBank_eventId">
                <option value="">Selecione o evento deste produtor...</option>
                ${events.map(e => `
                  <option value="${e.id}" ${e.id === defaultEventId ? 'selected' : ''}>
                    ${e.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold">Titular da Conta *</label>
                <input type="text" class="form-control" id="addBank_holderName" required value="${prod?.name || ''}" placeholder="Razão Social ou Nome do Titular">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">CPF/CNPJ do Titular *</label>
                <input type="text" class="form-control" id="addBank_cnpj" required value="${prod?.cnpj || ''}" placeholder="00.000.000/0000-00">
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">Instituição Bancária *</label>
                <select class="form-control" id="addBank_bankName" required>
                  <option value="Itaú Unibanco (341)">Itaú Unibanco (341)</option>
                  <option value="Banco Bradesco (237)">Banco Bradesco (237)</option>
                  <option value="Banco do Brasil (001)">Banco do Brasil (001)</option>
                  <option value="Santander Brasil (033)">Santander Brasil (033)</option>
                  <option value="Caixa Econômica (104)">Caixa Econômica (104)</option>
                  <option value="Nu Pagamentos / Nubank (260)">Nu Pagamentos / Nubank (260)</option>
                  <option value="Banco Inter (077)">Banco Inter (077)</option>
                  <option value="BTG Pactual (208)">BTG Pactual (208)</option>
                  <option value="Banco C6 (336)">Banco C6 (336)</option>
                  <option value="Banco Safra (422)">Banco Safra (422)</option>
                  <option value="Banco Sicredi (748)">Banco Sicredi (748)</option>
                  <option value="Banco Sicoob (756)">Banco Sicoob (756)</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Tipo de Conta *</label>
                <select class="form-control" id="addBank_accountType" required>
                  <option value="Conta Corrente PJ">Conta Corrente PJ</option>
                  <option value="Conta Poupança PJ">Conta Poupança PJ</option>
                  <option value="Conta de Pagamento PJ">Conta de Pagamento PJ</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">Agência (sem dígito) *</label>
                <input type="text" class="form-control" id="addBank_agency" required placeholder="Ex: 0432" maxlength="6">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">Número da Conta *</label>
                <input type="text" class="form-control" id="addBank_accountNumber" required placeholder="Ex: 48291" maxlength="15">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">Dígito *</label>
                <input type="text" class="form-control" id="addBank_digit" required placeholder="Ex: 0" maxlength="2">
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold">Chave PIX para Liquidação</label>
                <input type="text" class="form-control" id="addBank_pixKey" placeholder="CNPJ, E-mail, Celular ou EVP">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">Tipo da Chave PIX</label>
                <select class="form-control" id="addBank_pixType">
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Chave Aleatória (EVP)">Chave Aleatória (EVP)</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label fw-bold">Finalidade da Conta</label>
              <select class="form-control" id="addBank_purpose">
                <option value="Repasse">Repasse (Liquidação de Vendas)</option>
                <option value="Recebimento">Recebimento</option>
                <option value="Ambos" selected>Ambos (Repasse & Recebimento)</option>
              </select>
            </div>

            <!-- COMPROVAÇÃO E DOSSIÊ -->
            <div class="card-panel" style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 14px; margin-bottom: 20px;">
              <label class="form-label fw-bold" style="color: #1e293b; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                <i class="ph-file-arrow-up" style="color: #2563eb;"></i>
                Comprovação Documental (Dossiê Financeiro do Produtor)
              </label>
              <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 10px;">
                Anexe o comprovante bancário ou contrato social recebido do produtor para subsidiar a homologação via Bacen/CIP.
              </p>
              <div class="row g-2">
                <div class="col-md-5">
                  <select class="form-control form-control-sm" id="addBank_documentType">
                    <option value="Comprovante bancário">○ Comprovante bancário</option>
                    <option value="Comprovante de titularidade">○ Comprovante de titularidade</option>
                    <option value="Contrato Social">○ Contrato Social / PJ</option>
                    <option value="Outro">○ Outro documento</option>
                  </select>
                </div>
                <div class="col-md-7">
                  <input type="text" class="form-control form-control-sm" id="addBank_documentName" value="comprovante_bancario_homologacao.pdf" placeholder="Nome do arquivo ou anexo">
                </div>
              </div>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 0.8rem; color: #92400e;">
              <strong>Fluxo de Governança:</strong> Esta conta será salva com status <strong>PENDENTE DE VALIDAÇÃO</strong>. Os repasses para ela só serão liberados após a conferência documental e validação Bacen/CIP pela mesa financeira.
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
                Salvar Conta (Pendente de Validação)
              </button>
            </div>

          </form>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  onAddBankProducerChange(producerId) {
    const state = financialStore.getState();
    const prod = (state.data.producers || []).find(p => p.id === producerId);
    if (!prod) return;
    const nameEl = document.getElementById('addBank_holderName');
    const cnpjEl = document.getElementById('addBank_cnpj');
    if (nameEl) nameEl.value = prod.name;
    if (cnpjEl) cnpjEl.value = prod.cnpj;

    const events = (state.data.events || []).filter(e => e.producerId === producerId);
    const eventSel = document.getElementById('addBank_eventId');
    if (eventSel) {
      eventSel.innerHTML = '<option value="">Selecione o evento deste produtor...</option>' +
        events.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    }
  }

  onAddBankBindingChange(bindingType) {
    const wrap = document.getElementById('addBank_eventWrapper');
    if (wrap) {
      wrap.style.display = bindingType === 'evento' ? '' : 'none';
    }
  }

  handleAddProducerBankSubmit(e) {
    e.preventDefault();
    try {
      const producerId = document.getElementById('addBank_producerId').value;
      const bindingType = document.querySelector('input[name="addBank_bindingType"]:checked')?.value || 'geral';
      const eventId = bindingType === 'evento' ? document.getElementById('addBank_eventId').value : null;
      const holderName = document.getElementById('addBank_holderName').value;
      const cnpj = document.getElementById('addBank_cnpj').value;
      const bankName = document.getElementById('addBank_bankName').value;
      const accountType = document.getElementById('addBank_accountType').value;
      const agency = document.getElementById('addBank_agency').value;
      const accountNumber = document.getElementById('addBank_accountNumber').value;
      const digit = document.getElementById('addBank_digit').value;
      const pixKey = document.getElementById('addBank_pixKey').value;
      const pixType = document.getElementById('addBank_pixType').value;
      const purpose = document.getElementById('addBank_purpose').value;
      const documentType = document.getElementById('addBank_documentType')?.value;
      const documentName = document.getElementById('addBank_documentName')?.value;

      financialStore.addDiskProducerBankAccount({
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
      });

      this.closeModal();
      this.setDiskProdutoresTab('bancarias');
    } catch (err) {
      alert(err.message);
    }
  }

  openValidateBankModal(producerId, accountId) {
    const state = financialStore.getState();
    const prod = (state.data.producers || []).find(p => p.id === producerId);
    if (!prod) return;
    const b = (prod.bankAccounts || []).find(x => x.id === accountId);
    if (!b) return;

    const docName = b.documents && b.documents.length > 0 ? b.documents[0].name : 'comprovante_bancario.pdf';
    const docType = b.documents && b.documents.length > 0 ? b.documents[0].type : 'Comprovante bancário';

    const html = `
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header" style="background: #14532d; color: white; border-bottom: 2px solid #22c55e;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f0fdf4; font-size: 1.15rem;">
              <i class="ph-shield-check" style="color: #4ade80; margin-right: 6px;"></i>
              Homologação de Conta Bancária (Bacen / CIP)
            </h4>
            <div style="font-size: 0.78rem; color: #bbf7d0; margin-top: 2px;">
              Validação formal da conta cadastrada para liberação de repasses do produtor
            </div>
          </div>
          <button class="modal-close-btn" style="color: #bbf7d0;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Produtor</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #1e293b;">${prod.name}</div>
            <div style="font-size: 0.85rem; color: #475569; font-family: monospace;">CNPJ: ${prod.cnpj}</div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label" style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Banco</label>
              <div style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">${b.bankName}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${b.accountType || 'Conta Corrente PJ'}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label" style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Agência / Conta</label>
              <div style="font-weight: 800; font-size: 1rem; color: #1e293b; font-family: monospace;">Agência ${b.agency} / Conta ${b.accountNumber}</div>
              <div style="font-size: 0.78rem; color: #64748b;">Titular: ${b.holderName || prod.name}</div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label" style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Chave PIX</label>
              <div style="font-weight: 700; font-size: 0.9rem; color: #2563eb; font-family: monospace;">${b.pixKey || 'Não cadastrada'}</div>
              <div style="font-size: 0.75rem; color: #64748b;">${b.pixType || 'CNPJ'}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label" style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Vinculação</label>
              <div style="font-weight: 600; font-size: 0.88rem; color: #1e293b;">${b.eventName || 'Geral (Todos os Eventos)'}</div>
            </div>
          </div>

          <!-- Documento Comprobatório -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="badge bg-primary text-white" style="font-size: 0.7rem; margin-bottom: 4px;">${docType}</span>
                <div style="font-weight: 700; font-size: 0.9rem; color: #1e3a8a;"><i class="ph-file-pdf"></i> ${docName}</div>
                <div style="font-size: 0.75rem; color: #3b82f6;">Recebido da produção e anexado ao Dossiê Financeiro</div>
              </div>
              <button class="btn btn-outline-primary btn-sm" onclick="alert('Visualizador de Dossiê: Exibindo ${docName} do produtor ${prod.name}')">
                Abrir Documento
              </button>
            </div>
          </div>

          <!-- Checklist de Homologação -->
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Checklist de Conferência Cadastral:</div>
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="chk_titularidade" checked>
              <span>Titularidade e CNPJ da conta bancária conferem com o cadastro homologado</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="chk_bacen" checked>
              <span>Validação Bacen/CIP e chave PIX ativas no Diretório DICT</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="chk_doc" checked>
              <span>Comprovante bancário idôneo anexado ao dossiê financeiro</span>
            </label>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="window.app.handleValidateProducerBankSubmit('${prod.id}', '${b.id}', false)">
              Recusar Validação
            </button>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Fechar</button>
              <button type="button" class="btn btn-success" style="background: #16a34a; border-color: #15803d; font-weight: 700;" onclick="window.app.handleValidateProducerBankSubmit('${prod.id}', '${b.id}', true)">
                Homologar & Ativar Conta
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
    this.showModal(html);
  }

  handleValidateProducerBankSubmit(producerId, accountId, approve) {
    if (!approve) {
      const reason = prompt('Informe a justificativa/motivo para recusar a validação desta conta bancária:');
      if (!reason) return;
      try {
        financialStore.validateProducerBankAccount({ producerId, accountId, approve: false, rejectionReason: reason });
        this.closeModal();
      } catch (err) {
        alert(err.message);
      }
      return;
    }

    try {
      financialStore.validateProducerBankAccount({ producerId, accountId, approve: true });
      this.closeModal();
    } catch (err) {
      alert(err.message);
    }
  }

  openChangeBankModal(producerId, accountId) {
    const state = financialStore.getState();
    const prod = (state.data.producers || []).find(p => p.id === producerId);
    if (!prod) return;
    const b = (prod.bankAccounts || []).find(x => x.id === accountId);
    if (!b) return;

    const html = `
      <div class="modal-card" style="max-width: 660px;">
        <div class="modal-header" style="background: #78350f; color: white; border-bottom: 2px solid #f59e0b;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #fef3c7; font-size: 1.15rem;">
              <i class="ph-arrows-clockwise" style="color: #fbbf24; margin-right: 6px;"></i>
              Solicitar Alteração Controlada de Conta Bancária
            </h4>
            <div style="font-size: 0.78rem; color: #fde68a; margin-top: 2px;">
              Geração de nova versão da conta para ${prod.name} (Preservação de histórico)
            </div>
          </div>
          <button class="modal-close-btn" style="color: #fde68a;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 0.85rem; color: #92400e; line-height: 1.5;">
            <strong>Regra de Governança:</strong> A conta atual (<strong>${b.bankName} Ag. ${b.agency} / C. ${b.accountNumber}</strong>) permanecerá ativa e associada a repasses anteriores. Esta solicitação gerará uma <strong>nova versão (v${(b.version || 1) + 1})</strong> com status <strong>Pendente de validação</strong>. Somente após a homologação a nova conta passará a ser utilizada e a anterior será arquivada.
          </div>

          <form id="changeBankForm" onsubmit="window.app.handleChangeProducerBankSubmit(event, '${prod.id}', '${b.id}')">
            
            <div class="row g-2 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold">Novo Titular da Conta *</label>
                <input type="text" class="form-control" id="changeBank_holderName" required value="${b.holderName || prod.name}">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">Novo CPF/CNPJ *</label>
                <input type="text" class="form-control" id="changeBank_cnpj" required value="${b.cnpj || prod.cnpj}">
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">Novo Banco *</label>
                <select class="form-control" id="changeBank_bankName" required>
                  <option value="${b.bankName}" selected>${b.bankName} (Atual)</option>
                  <option value="Itaú Unibanco (341)">Itaú Unibanco (341)</option>
                  <option value="Banco Bradesco (237)">Banco Bradesco (237)</option>
                  <option value="Banco do Brasil (001)">Banco do Brasil (001)</option>
                  <option value="Santander Brasil (033)">Santander Brasil (033)</option>
                  <option value="Caixa Econômica (104)">Caixa Econômica (104)</option>
                  <option value="Nu Pagamentos / Nubank (260)">Nu Pagamentos / Nubank (260)</option>
                  <option value="Banco Inter (077)">Banco Inter (077)</option>
                  <option value="BTG Pactual (208)">BTG Pactual (208)</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Tipo de Conta *</label>
                <select class="form-control" id="changeBank_accountType" required>
                  <option value="Conta Corrente PJ" ${b.accountType === 'Conta Corrente PJ' ? 'selected' : ''}>Conta Corrente PJ</option>
                  <option value="Conta Poupança PJ" ${b.accountType === 'Conta Poupança PJ' ? 'selected' : ''}>Conta Poupança PJ</option>
                  <option value="Conta de Pagamento PJ" ${b.accountType === 'Conta de Pagamento PJ' ? 'selected' : ''}>Conta de Pagamento PJ</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">Nova Agência *</label>
                <input type="text" class="form-control" id="changeBank_agency" required value="${b.agency}" maxlength="6">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">Novo Número da Conta *</label>
                <input type="text" class="form-control" id="changeBank_accountNumber" required value="${b.accountNumber.split('-')[0] || b.accountNumber}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">Dígito *</label>
                <input type="text" class="form-control" id="changeBank_digit" required value="${b.digit || (b.accountNumber.includes('-') ? b.accountNumber.split('-')[1] : '0')}" maxlength="2">
              </div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold">Nova Chave PIX</label>
                <input type="text" class="form-control" id="changeBank_pixKey" value="${b.pixKey || ''}">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold">Tipo da Chave</label>
                <select class="form-control" id="changeBank_pixType">
                  <option value="CNPJ" ${b.pixType === 'CNPJ' ? 'selected' : ''}>CNPJ</option>
                  <option value="CPF" ${b.pixType === 'CPF' ? 'selected' : ''}>CPF</option>
                  <option value="E-mail" ${b.pixType === 'E-mail' ? 'selected' : ''}>E-mail</option>
                  <option value="Telefone" ${b.pixType === 'Telefone' ? 'selected' : ''}>Telefone</option>
                  <option value="Chave Aleatória (EVP)" ${b.pixType === 'Chave Aleatória (EVP)' ? 'selected' : ''}>Chave Aleatória (EVP)</option>
                </select>
              </div>
            </div>

            <div class="card-panel" style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 14px; margin-bottom: 20px;">
              <label class="form-label fw-bold" style="color: #1e293b; margin-bottom: 4px;">
                Novo Comprovante Bancário / Dossiê *
              </label>
              <div class="row g-2">
                <div class="col-md-5">
                  <select class="form-control form-control-sm" id="changeBank_documentType">
                    <option value="Comprovante bancário">○ Comprovante bancário</option>
                    <option value="Comprovante de titularidade">○ Comprovante de titularidade</option>
                    <option value="Contrato Social">○ Contrato Social / Alteração</option>
                  </select>
                </div>
                <div class="col-md-7">
                  <input type="text" class="form-control form-control-sm" id="changeBank_documentName" value="novo_comprovante_bancario_${prod.id}.pdf">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-warning" style="background: #d97706; border-color: #b45309; color: white; font-weight: 700;">
                Registrar Nova Versão para Validação
              </button>
            </div>

          </form>
        </div>
      </div>
    `;
    this.showModal(html);
  }

  handleChangeProducerBankSubmit(e, producerId, accountId) {
    e.preventDefault();
    try {
      const holderName = document.getElementById('changeBank_holderName').value;
      const cnpj = document.getElementById('changeBank_cnpj').value;
      const bankName = document.getElementById('changeBank_bankName').value;
      const accountType = document.getElementById('changeBank_accountType').value;
      const agency = document.getElementById('changeBank_agency').value;
      const accountNumber = document.getElementById('changeBank_accountNumber').value;
      const digit = document.getElementById('changeBank_digit').value;
      const pixKey = document.getElementById('changeBank_pixKey').value;
      const pixType = document.getElementById('changeBank_pixType').value;
      const documentType = document.getElementById('changeBank_documentType')?.value;
      const documentName = document.getElementById('changeBank_documentName')?.value;

      financialStore.requestBankAccountChange({
        producerId,
        accountId,
        newBankData: {
          holderName,
          cnpj,
          bankName,
          accountType,
          agency,
          accountNumber,
          digit,
          pixKey,
          pixType,
          documentType,
          documentName
        }
      });

      this.closeModal();
      this.setDiskProdutoresTab('bancarias');
    } catch (err) {
      alert(err.message);
    }
  }

  openViewBankDetails(producerId, accountId, revealSensitive = false) {
    const state = financialStore.getState();
    const prod = (state.data.producers || []).find(p => p.id === producerId);
    if (!prod) return;
    const b = (prod.bankAccounts || []).find(x => x.id === accountId);
    if (!b) return;

    const docs = b.documents || [];
    const isPending = b.status === 'Pendente de validação';
    const isActive = ['Ativa', 'Validada & Ativa'].includes(b.status);
    const isInactive = b.status && b.status.includes('Inativa');

    // Funções locais de mascaramento condicional
    const dispAccount = revealSensitive ? b.accountNumber : `••••${b.accountNumber.slice(-5)}`;
    const dispCnpj = revealSensitive ? prod.cnpj : `${prod.cnpj.slice(0, 2)}.•••.•••/${prod.cnpj.slice(-6)}`;
    const dispPix = revealSensitive ? (b.pixKey || '—') : (b.pixKey ? (b.pixKey.includes('@') ? `••••@${b.pixKey.split('@')[1]}` : `${b.pixKey.slice(0, 3)}••••${b.pixKey.slice(-3)}`) : '—');

    const html = `
      <div class="modal-card" style="max-width: 660px;">
        <div class="modal-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
          <div>
            <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
              <i class="ph-bank" style="color: #60a5fa; margin-right: 6px;"></i>
              Dossiê da Conta Bancária • ${prod.name}
            </h4>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Informações cadastrais, documentos de titularidade e esteira de auditoria Bacen/CIP
            </div>
          </div>
          <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${isActive ? 'badge-success' : (isPending ? 'badge-warning' : 'badge-neutral')}" style="padding: 5px 9px; font-weight: 700;">
                ${b.status}
              </span>
              <span class="badge badge-info">Versão v${b.version || 1}</span>
              ${b.isDefault ? `<span class="badge bg-primary text-white">★ Conta Principal</span>` : ''}
            </div>
            <div>
              <button class="btn btn-outline-secondary btn-xs" onclick="window.app.openViewBankDetails('${prod.id}', '${b.id}', ${!revealSensitive})">
                <i class="${revealSensitive ? 'ph-eye-slash' : 'ph-eye'}"></i> ${revealSensitive ? 'Ocultar Dados Sensíveis' : 'Revelar Dados Completos'}
              </button>
            </div>
          </div>

          <table class="table table-sm table-bordered" style="font-size: 0.88rem; margin-bottom: 20px;">
            <tbody>
              <tr><th style="width: 35%; background: #f8fafc;">Produtor Titular</th><td><b>${prod.name}</b></td></tr>
              <tr><th style="background: #f8fafc;">CNPJ / CPF</th><td><span style="font-family: monospace; font-weight: 700;">${dispCnpj}</span></td></tr>
              <tr><th style="background: #f8fafc;">Instituição Bancária</th><td>${b.bankName}</td></tr>
              <tr><th style="background: #f8fafc;">Tipo de Conta</th><td>${b.accountType || 'Conta Corrente PJ'}</td></tr>
              <tr><th style="background: #f8fafc;">Agência / Conta</th><td><b style="font-family: monospace;">Agência ${b.agency} / Conta ${dispAccount}</b></td></tr>
              <tr><th style="background: #f8fafc;">Titular Cadastrado</th><td>${b.holderName || prod.name}</td></tr>
              <tr>
                <th style="background: #f8fafc;">Chave PIX</th>
                <td>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #2563eb; font-weight: 700; font-family: monospace;">${dispPix}</span>
                    ${b.pixKey ? `
                      <button class="btn btn-outline-primary btn-xs" style="font-size: 0.72rem; padding: 2px 6px;" onclick="window.app.testBankPixKey('${b.pixKey}', '${b.pixType || 'CNPJ'}', '${prod.name}')">
                        <i class="ph-shield-check"></i> Testar no DICT
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
              <tr><th style="background: #f8fafc;">Vinculação</th><td>${b.eventName || 'Geral (Todos os eventos)'}</td></tr>
              <tr><th style="background: #f8fafc;">Finalidade</th><td>${b.purpose || 'Repasse'}</td></tr>
              <tr><th style="background: #f8fafc;">Validação Bacen/CIP</th><td>${b.validatedAt || 'Pendente de validação pela mesa'}</td></tr>
              <tr><th style="background: #f8fafc;">Data do Cadastro</th><td>${b.createdAt || 'Homologada no sistema'} por ${b.createdBy || 'Operador Disk'}</td></tr>
            </tbody>
          </table>

          <!-- Seção de Documentos Comprobatórios do Dossiê -->
          <div class="card-panel" style="background: #f8fafc; padding: 14px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">
                <i class="ph-file-pdf" style="color: #dc2626;"></i> Documentos do Dossiê Bancário:
              </div>
              <button class="btn btn-outline-primary btn-xs" onclick="window.app.attachBankDocumentModal('${prod.id}', '${b.id}')">
                <i class="ph-paperclip"></i> + Anexar Documento
              </button>
            </div>
            ${docs.length > 0 ? docs.map(d => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px;">
                <div>
                  <span style="font-weight: 700; font-size: 0.85rem;"><i class="ph-file-pdf" style="color: #dc2626; margin-right: 4px;"></i> ${d.name}</span>
                  <div style="font-size: 0.72rem; color: #64748b;">${d.type} • Enviado em ${d.uploadedAt} ${d.uploadedBy ? `por ${d.uploadedBy}` : ''}</div>
                </div>
                <button class="btn btn-outline-primary btn-xs" onclick="alert('Visualização do documento ${d.name} (${d.type}) do produtor ${prod.name}')">Ver</button>
              </div>
            `).join('') : '<div style="font-size: 0.8rem; color: #94a3b8;">Nenhum documento anexado ao cadastro.</div>'}
          </div>

          <!-- Ações Operacionais de Rodapé -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <button class="btn btn-outline-secondary btn-sm" onclick="window.app.goToProducerDossier('${prod.id}'); window.app.closeModal();">
              <i class="ph-folder-user"></i> Ir para Dossiê do Produtor
            </button>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${isPending ? `
                <button class="btn btn-success btn-sm fw-bold" onclick="window.app.closeModal(); window.app.openValidateBankModal('${prod.id}', '${b.id}')">
                  <i class="ph-shield-check"></i> Validar Esta Conta
                </button>
              ` : ''}
              ${isActive ? `
                ${!b.isDefault ? `
                  <button class="btn btn-outline-secondary btn-sm" onclick="window.app.setDefaultBank('${prod.id}', '${b.id}'); window.app.closeModal();">
                    <i class="ph-star"></i> Definir como Principal
                  </button>
                ` : ''}
                <button class="btn btn-outline-warning btn-sm" onclick="window.app.closeModal(); window.app.openChangeBankModal('${prod.id}', '${b.id}')">
                  <i class="ph-pencil"></i> Alterar Conta (v${(b.version||1)+1})
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="window.app.toggleBankStatus('${prod.id}', '${b.id}'); window.app.closeModal();">
                  <i class="ph-prohibit"></i> Inativar
                </button>
              ` : ''}
              ${isInactive ? `
                <button class="btn btn-outline-success btn-sm" onclick="window.app.toggleBankStatus('${prod.id}', '${b.id}'); window.app.closeModal();">
                  <i class="ph-arrow-counter-clockwise"></i> Reativar Conta
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal()">Fechar</button>
            </div>
          </div>

        </div>
      </div>
    `;
    this.showModal(html);
  }

  // Ações de Contas Bancárias (Pacote 17 / Governança Completa)
  setDefaultBank(producerId, accountId) {
    try {
      financialStore.setProducerDefaultBankAccount(producerId, accountId);
    } catch (err) {
      alert(err.message);
    }
  }

  toggleBankStatus(producerId, accountId) {
    try {
      financialStore.toggleProducerBankAccountStatus(producerId, accountId);
    } catch (err) {
      alert(err.message);
    }
  }

  deleteBank(producerId, accountId) {
    if (!confirm('Deseja realmente remover esta conta bancária do cadastro?')) return;
    try {
      financialStore.deleteProducerBankAccount(producerId, accountId);
    } catch (err) {
      alert(err.message);
    }
  }

  testBankPixKey(pixKey, pixType, producerName) {
    try {
      const res = financialStore.testPixKey(pixKey, pixType);
      this.showModal(`
        <div class="modal-card" style="max-width: 560px;">
          <div class="modal-header" style="background: #1e3a8a; color: white; border-bottom: 2px solid #3b82f6;">
            <div>
              <h4 class="mb-0 fw-bold" style="color: #f8fafc; font-size: 1.15rem;">
                <i class="ph-shield-check" style="color: #60a5fa; margin-right: 6px;"></i>
                Homologação DICT / Bacen (SPI)
              </h4>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
                Conferência cadastral oficial via Diretório de Identificadores de Contas Transacionais
              </div>
            </div>
            <button class="modal-close-btn" style="color: #94a3b8;" onclick="window.app.closeModal()">&times;</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: #166534; text-transform: uppercase;">Situação Cadastral no DICT</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #15803d; margin-top: 2px;">
                ✓ ${res.statusDict}
              </div>
              <div style="font-size: 0.82rem; color: #166534; margin-top: 4px;">
                ${res.participantBacen}
              </div>
            </div>

            <table class="table table-sm table-bordered" style="font-size: 0.88rem; margin-bottom: 20px;">
              <tbody>
                <tr><th style="width: 40%; background: #f8fafc;">Produtor Titular</th><td><b>${producerName || 'Produtor Homologado'}</b></td></tr>
                <tr><th style="background: #f8fafc;">Chave Consultada</th><td><code style="color: #2563eb; font-weight: 700;">${res.pixKey}</code></td></tr>
                <tr><th style="background: #f8fafc;">Tipo da Chave</th><td>${res.pixType}</td></tr>
                <tr><th style="background: #f8fafc;">Consulta Realizada em</th><td>${res.queriedAt}</td></tr>
                <tr><th style="background: #f8fafc;">Aptidão para Repasse</th><td><span class="badge badge-success">Apta para Liquidação SPI</span></td></tr>
              </tbody>
            </table>

            <div style="font-size: 0.8rem; color: #64748b; line-height: 1.4; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px;">
              <strong>Nota Técnica de Governança:</strong> A chave encontra-se ativa no DICT do Banco Central, vinculada ao CNPJ do produtor e apta para liquidação instantânea via API SPI (EFI / Safra / Itaú).
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button class="btn btn-primary" onclick="window.app.closeModal()">Entendido</button>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      alert(err.message);
    }
  }

  goToProducerDossier(producerId) {
    this.selectProducerInDisk(producerId);
    this.setDiskProdutoresTab('dossie');
  }

  attachBankDocumentModal(producerId, accountId) {
    const docName = prompt('Informe o nome do arquivo a anexar (ex: comprovante_domicilio_bancario.pdf):', 'comprovante_titularidade.pdf');
    if (!docName) return;
    const docType = prompt('Informe o tipo de documento (Comprovante bancário, Contrato Social, etc.):', 'Comprovante bancário');
    try {
      financialStore.attachBankDocument(producerId, accountId, { name: docName, type: docType || 'Comprovante bancário' });
      this.closeModal();
      this.openViewBankDetails(producerId, accountId);
    } catch (err) {
      alert(err.message);
    }
  }

  // ==========================================================================
  // PACOTE 18: CENTRAL OPERACIONAL DE GATEWAYS E ADQUIRENTES
  // ==========================================================================
  p18Tab(tab, btn) {
    this.currentP18Tab = tab;
    const targetSec = document.getElementById(`sec-gw-${tab}`);
    if (targetSec) {
      this.scrollToSpySection(`sec-gw-${tab}`);
      return;
    }
    const box = document.getElementById('p18-tab-content');
    if (!box) {
      this.navigate('diskGateways');
      setTimeout(() => {
        this.scrollToSpySection(`sec-gw-${tab}`);
      }, 50);
      return;
    }
    const state = financialStore.getState();
    box.innerHTML = renderGatewayTab(state, tab);
  }

  p18Action(action, id = '') {
    try {
      if (action === 'novo' || action === 'editar') {
        return this.openGatewayModal(id);
      }
      if (action === 'testar') {
        const r = financialStore.testGatewayConnection(id);
        const ready = !!(r.secretConfigured && r.clientId && r.merchantId);
        financialStore.showToast(
          ready ? 'Credenciais Cadastradas' : 'Integração Pendente',
          ready
            ? 'Credenciais mínimas cadastradas com sucesso. O teste operacional com o adquirente em produção depende do backend/endpoint homologado.'
            : 'Complete o cadastro de Merchant ID, Client ID e Secret antes de solicitar o teste.',
          ready ? 'info' : 'warning'
        );
        return this.refreshP18View();
      }
      if (action === 'status') {
        const r = financialStore.toggleGateway(id);
        financialStore.showToast(
          'Situação Atualizada',
          `${r.name} agora está ${r.enabled ? 'Ativo' : 'Inativo'}.`,
          r.enabled ? 'success' : 'warning'
        );
        return this.refreshP18View();
      }
      if (action === 'logs') {
        this.p18Tab('logs');
        return;
      }
      if (action.startsWith('configurar-')) {
        const key = action.replace('configurar-', '');
        return this.openGatewaySectionModal(id, key);
      }
    } catch (e) {
      financialStore.showToast('Operação não concluída', e.message, 'danger');
    }
  }

  refreshP18View() {
    const state = financialStore.getState();
    this.render(state);
  }

  openGatewayModal(id = '') {
    const state = financialStore.getState();
    const g = (state.data?.gatewayConfigs || []).find(x => x.id === id) || {};
    const isEdit = !!id;

    this.showModal(`
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header d-flex justify-content-between align-items-center" style="background: #0f172a; color: white;">
          <div>
            <div class="fs-xs text-primary fw-bold text-uppercase">Central de Gateways & Adquirentes</div>
            <h4 class="mb-0 text-white fw-bold">${isEdit ? 'Editar Configuração de Gateway' : 'Novo Gateway / Adquirente'}</h4>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitGateway(event, '${id}')">
          <div class="alert alert-info py-2 px-3 mb-3" style="font-size: 0.82rem; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;">
            <i class="ph-info me-1"></i> As credenciais são mascaradas na interface. Os segredos técnicos e chaves de API não devem ser trafegados em texto aberto.
          </div>
          <div class="row g-3">
            <div class="col-md-7">
              <label class="form-label fw-bold">Nome do Provedor / Gateway *</label>
              <input class="form-control" name="name" required value="${g.name || ''}" placeholder="Ex: Cielo 3.0, Rede e-Rede, Stone Pagar.me">
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">Ambiente de Execução *</label>
              <select class="form-select" name="environment">
                <option value="Produção" ${g.environment === 'Produção' ? 'selected' : ''}>Produção</option>
                <option value="Sandbox" ${g.environment === 'Sandbox' ? 'selected' : ''}>Sandbox (Homologação)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Merchant ID / Estabelecimento</label>
              <input class="form-control" name="merchantId" value="${g.merchantId || ''}" placeholder="Identificador do lojista">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Client ID / App Key</label>
              <input class="form-control" name="clientId" value="${g.clientId || ''}" placeholder="Identificador da aplicação">
            </div>
            <div class="col-12">
              <label class="form-label fw-bold">Client Secret / API Token</label>
              <input class="form-control" type="password" name="secret" placeholder="${g.secretConfigured ? '•••••••••••••••• (Deixe em branco para manter)' : 'Cole aqui a chave secreta'}">
              <div class="form-text fs-xs text-muted">
                Em produção, este valor é processado pelo secret manager e armazenado em vault com criptografia de ponta a ponta.
              </div>
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: #2563eb; border-color: #1d4ed8;">
              <i class="ph-check me-1"></i> Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    `);
  }

  submitGateway(e, id = '') {
    e.preventDefault();
    const f = new FormData(e.target);
    const secret = String(f.get('secret') || '').trim();
    const payload = {
      name: f.get('name'),
      environment: f.get('environment'),
      merchantId: f.get('merchantId'),
      clientId: f.get('clientId')
    };
    if (secret) {
      payload.secretConfigured = true;
    }
    const r = financialStore.saveGatewayConfig(payload, id || null);
    this.closeModal();
    financialStore.showToast(
      'Gateway Salvo',
      `${r.name} atualizado com sucesso na configuração local.`,
      'success'
    );
    this.refreshP18View();
  }

  openGatewaySectionModal(id, key) {
    const state = financialStore.getState();
    const g = (state.data?.gatewayConfigs || []).find(x => x.id === id);
    if (!g) return;

    const titles = {
      cred: 'Credenciais & Conectividade',
      cards: 'Bandeiras e Cartões Aceitos',
      pix: 'Configuração Técnica do PIX',
      boleto: 'Parâmetros de Boletos Bancários',
      installments: 'Regras de Parcelamento e Juros',
      antifraud: 'Mecanismos de Antifraude & 3DS',
      webhooks: 'Webhooks & Notificações de Eventos'
    };

    let fieldsHtml = '';

    if (key === 'cred') {
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">Ambiente</label>
            <select class="form-select" name="environment">
              <option value="Produção" ${g.environment === 'Produção' ? 'selected' : ''}>Produção</option>
              <option value="Sandbox" ${g.environment === 'Sandbox' ? 'selected' : ''}>Sandbox</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Merchant ID</label>
            <input class="form-control" name="merchantId" value="${g.merchantId || ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Client ID</label>
            <input class="form-control" name="clientId" value="${g.clientId || ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Client Secret</label>
            <input class="form-control" type="password" name="secret" placeholder="${g.secretConfigured ? '•••••••• (Manter atual)' : 'Informar secret'}">
          </div>
        </div>
      `;
    } else if (key === 'cards') {
      const currentCards = (g.cards || []).join(', ');
      fieldsHtml = `
        <div class="mb-3">
          <label class="form-label fw-bold">Bandeiras Habilitadas (separadas por vírgula)</label>
          <input class="form-control" name="cards" value="${currentCards}" placeholder="Visa, Mastercard, Elo, Amex, Hipercard">
          <div class="form-text fs-xs text-muted">Bandeiras suportadas: Visa, Mastercard, Elo, American Express, Hipercard, Diners Club, Cabal.</div>
        </div>
      `;
    } else if (key === 'pix') {
      const pix = g.pix || {};
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-bold">PIX Habilitado</label>
            <select class="form-select" name="enabled">
              <option value="true" ${pix.enabled ? 'selected' : ''}>Sim</option>
              <option value="false" ${!pix.enabled ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label fw-bold">Chave PIX Cadastrada</label>
            <input class="form-control" name="key" value="${pix.key || ''}" placeholder="Chave vinculada no PSP">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Prazo de Liquidação</label>
            <select class="form-select" name="term">
              <option value="D+0 (Instantâneo)" ${pix.term && pix.term.includes('D+0') ? 'selected' : ''}>D+0 (Instantâneo via SPI)</option>
              <option value="D+1" ${pix.term && pix.term.includes('D+1') ? 'selected' : ''}>D+1 (Próximo dia útil)</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Split SPI Nativo</label>
            <select class="form-select" name="spiSplit">
              <option value="true" ${pix.spiSplit !== false ? 'selected' : ''}>Habilitado (Direto na Conta)</option>
              <option value="false" ${pix.spiSplit === false ? 'selected' : ''}>Desabilitado (Acúmulo Conta Gráfica)</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-bold">Observações Técnicas</label>
            <input class="form-control" name="note" value="${pix.note || ''}" placeholder="Ex: Gateway homologado no DICT Bacen">
          </div>
        </div>
      `;
    } else if (key === 'boleto') {
      const boleto = g.boleto || {};
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-bold">Boleto Habilitado</label>
            <select class="form-select" name="enabled">
              <option value="true" ${boleto.enabled ? 'selected' : ''}>Sim</option>
              <option value="false" ${!boleto.enabled ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Banco Emissor</label>
            <input class="form-control" name="bank" value="${boleto.bank || 'Itaú Unibanco'}" placeholder="Itaú, Bradesco, Santander">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Carteira / Convênio</label>
            <input class="form-control" name="wallet" value="${boleto.wallet || '109'}" placeholder="Ex: 109 ou 09">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Dias para Vencimento</label>
            <input class="form-control" type="number" name="dueDays" value="${boleto.dueDays || 3}">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Multa por Atraso (%)</label>
            <input class="form-control" type="number" step="0.01" name="finePercent" value="${boleto.finePercent || 2.00}">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Juros ao Mês (%)</label>
            <input class="form-control" type="number" step="0.01" name="interestMonthly" value="${boleto.interestMonthly || 1.00}">
          </div>
          <div class="col-12">
            <label class="form-label fw-bold">Instruções de Impressão</label>
            <input class="form-control" name="instructions" value="${boleto.instructions || 'Não receber após o vencimento. Venda sujeita a estorno.'}">
          </div>
        </div>
      `;
    } else if (key === 'installments') {
      const inst = g.installments || {};
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-bold">Parcelamento Ativo</label>
            <select class="form-select" name="enabled">
              <option value="true" ${inst.enabled ? 'selected' : ''}>Sim</option>
              <option value="false" ${!inst.enabled ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Parcelas Máximas</label>
            <select class="form-select" name="max">
              ${[1, 2, 3, 4, 5, 6, 10, 12].map(n => `<option value="${n}" ${inst.max === n ? 'selected' : ''}>Até ${n}x</option>`).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Juros ao Comprador de</label>
            <input class="form-control" name="interestFrom" value="${inst.interestFrom || '2x'}" placeholder="Ex: 2x ou Sem juros">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Valor Mínimo da Parcela (R$)</label>
            <input class="form-control" type="number" step="0.01" name="minAmount" value="${inst.minAmount || 20.00}">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Observação</label>
            <input class="form-control" name="note" value="${inst.note || ''}" placeholder="Diretriz para o checkout">
          </div>
        </div>
      `;
    } else if (key === 'antifraud') {
      const anti = g.antifraud || {};
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-bold">Antifraude Ativo</label>
            <select class="form-select" name="enabled">
              <option value="true" ${anti.enabled ? 'selected' : ''}>Sim</option>
              <option value="false" ${!anti.enabled ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Provedor Integrado</label>
            <select class="form-select" name="provider">
              <option value="ClearSale Total" ${anti.provider === 'ClearSale Total' ? 'selected' : ''}>ClearSale Total</option>
              <option value="Konduto Shield" ${anti.provider === 'Konduto Shield' ? 'selected' : ''}>Konduto Shield</option>
              <option value="Stone Shield" ${anti.provider === 'Stone Shield' ? 'selected' : ''}>Stone Shield</option>
              <option value="Cybersource Decision" ${anti.provider === 'Cybersource Decision' ? 'selected' : ''}>Cybersource Decision</option>
              <option value="3DS 2.0 Nativo" ${anti.provider === '3DS 2.0 Nativo' ? 'selected' : ''}>3DS 2.0 Nativo</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold">Modo de Operação</label>
            <select class="form-select" name="mode">
              <option value="Análise Ativa + 3DS" ${anti.mode === 'Análise Ativa + 3DS' ? 'selected' : ''}>Análise Ativa + 3DS</option>
              <option value="Score Passivo" ${anti.mode === 'Score Passivo' ? 'selected' : ''}>Score Passivo</option>
              <option value="Bloqueio Automático" ${anti.mode === 'Bloqueio Automático' ? 'selected' : ''}>Bloqueio Automático</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Score de Corte / Limite</label>
            <input class="form-control" name="scoreThreshold" value="${anti.scoreThreshold || '85 pontos'}" placeholder="Ex: 85 pontos ou 90%">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Observações</label>
            <input class="form-control" name="note" value="${anti.note || ''}" placeholder="Regra de mitigação de chargeback">
          </div>
        </div>
      `;
    } else if (key === 'webhooks') {
      const wh = g.webhooks || {};
      fieldsHtml = `
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label fw-bold">Webhook Ativo</label>
            <select class="form-select" name="enabled">
              <option value="true" ${wh.enabled ? 'selected' : ''}>Sim</option>
              <option value="false" ${!wh.enabled ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label fw-bold">URL de Notificação Endpoint</label>
            <input class="form-control" name="url" value="${wh.url || ''}" placeholder="https://api.diskingressos.com.br/v1/gateways/webhook">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Validação de Assinatura HMAC</label>
            <select class="form-select" name="hmac">
              <option value="true" ${wh.hmac !== false ? 'selected' : ''}>Obrigatória (HMAC-SHA256)</option>
              <option value="false" ${wh.hmac === false ? 'selected' : ''}>Opcional (Não recomendado)</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Eventos Notificados</label>
            <input class="form-control" name="events" value="${wh.events || 'payment.authorized, payment.captured, chargeback'}" placeholder="payment.authorized, ...">
          </div>
        </div>
      `;
    }

    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center" style="background: #0f172a; color: white;">
          <div>
            <div class="fs-xs text-primary fw-bold text-uppercase">${g.name} &bull; Parâmetros Operacionais</div>
            <h4 class="mb-0 text-white fw-bold">${titles[key] || key}</h4>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitGatewaySection(event, '${id}', '${key}')">
          ${fieldsHtml}
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: #2563eb; border-color: #1d4ed8;">
              <i class="ph-check me-1"></i> Salvar Seção
            </button>
          </div>
        </form>
      </div>
    `);
  }

  submitGatewaySection(e, id, key) {
    e.preventDefault();
    const f = new FormData(e.target);
    const state = financialStore.getState();
    const g = (state.data?.gatewayConfigs || []).find(x => x.id === id);
    if (!g) return;

    if (key === 'cards') {
      const cards = String(f.get('cards') || '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
      financialStore.updateGatewaySection(id, 'cards', cards);
    } else if (key === 'cred') {
      const secret = String(f.get('secret') || '').trim();
      const payload = {
        environment: f.get('environment'),
        merchantId: f.get('merchantId'),
        clientId: f.get('clientId')
      };
      if (secret) payload.secretConfigured = true;
      financialStore.saveGatewayConfig(payload, id);
    } else if (key === 'pix') {
      financialStore.updateGatewaySection(id, 'pix', {
        enabled: f.get('enabled') === 'true',
        key: f.get('key') || '',
        term: f.get('term') || 'D+0 (Instantâneo)',
        spiSplit: f.get('spiSplit') === 'true',
        note: f.get('note') || ''
      });
    } else if (key === 'boleto') {
      financialStore.updateGatewaySection(id, 'boleto', {
        enabled: f.get('enabled') === 'true',
        bank: f.get('bank') || '',
        wallet: f.get('wallet') || '',
        dueDays: Number(f.get('dueDays')) || 3,
        finePercent: Number(f.get('finePercent')) || 2,
        interestMonthly: Number(f.get('interestMonthly')) || 1,
        instructions: f.get('instructions') || ''
      });
    } else if (key === 'installments') {
      financialStore.updateGatewaySection(id, 'installments', {
        enabled: f.get('enabled') === 'true',
        max: Number(f.get('max')) || 12,
        interestFrom: f.get('interestFrom') || '2x',
        minAmount: Number(f.get('minAmount')) || 20,
        note: f.get('note') || ''
      });
    } else if (key === 'antifraud') {
      financialStore.updateGatewaySection(id, 'antifraud', {
        enabled: f.get('enabled') === 'true',
        provider: f.get('provider') || '',
        mode: f.get('mode') || '',
        scoreThreshold: f.get('scoreThreshold') || '',
        note: f.get('note') || ''
      });
    } else if (key === 'webhooks') {
      financialStore.updateGatewaySection(id, 'webhooks', {
        enabled: f.get('enabled') === 'true',
        url: f.get('url') || '',
        hmac: f.get('hmac') === 'true',
        events: f.get('events') || ''
      });
    }

    this.closeModal();
    financialStore.showToast(
      'Configuração Salva',
      'As alterações foram persistidas no estado e estão operacionais.',
      'success'
    );
    this.refreshP18View();
  }

  toggleDemoBarCollapse() {
    this.demoBarCollapsed = !this.demoBarCollapsed;
    this.renderDemoFloatingBar(financialStore.getState());
  }

  p19FilterFees() {
    const scope = document.getElementById('p19Scope')?.value || '';
    const acq = document.getElementById('p19Acq')?.value || '';
    const method = document.getElementById('p19Method')?.value || '';
    const status = document.getElementById('p19Status')?.value || '';

    const rows = document.querySelectorAll('#p19FeeTable tbody tr');
    let visible = 0;
    rows.forEach(tr => {
      const d = tr.dataset;
      const match = (!scope || d.scope === scope) &&
                    (!acq || d.acq === acq) &&
                    (!method || d.method === method) &&
                    (!status || d.status === status);
      tr.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    const countEl = document.getElementById('p19FeeCount');
    if (countEl) countEl.innerText = `${visible} regras encontradas`;
  }

  p19SimulateRule(id = '') {
    const st = financialStore.getState();
    const r = (st.data.spreadRules && st.data.spreadRules.find(x => x.id === id)) ||
              (st.data.spreadRules && st.data.spreadRules.find(x => x.status === 'Ativa')) ||
              (st.data.taxRules && st.data.taxRules.find(x => x.id === id)) || {
                id: id || 'REG-TAXA-DEF',
                name: 'Regra Padrão Cartão Crédito à Vista',
                scopeType: 'Geral Disk',
                acquirer: 'Cielo',
                method: 'Cartão de Crédito',
                payer: 'Produtor',
                chargedRate: 8.90,
                mdr: 2.19,
                fixedFee: 0.40,
                version: 2
              };

    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const amount = 1000;
    const rate = Number(r.chargedRate || r.rate || 0);
    const mdr = Number(r.mdr || 0);
    const fixed = Number(r.fixedFee || 0);
    const revenue = amount * rate / 100;
    const cost = (amount * mdr / 100) + fixed;
    const spread = revenue - cost;

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Simulador de Taxa & Conferência de Spread</h4>
            <div class="text-muted fs-sm">${r.id} · Escopo: <strong>${r.scopeType || 'Geral Disk'}</strong> · Versão: <strong>v${r.version || 1}</strong></div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="mb-3">
            <label class="form-label fw-bold">Valor da Venda Simulada (R$)</label>
            <div class="input-group">
              <span class="input-group-text">R$</span>
              <input type="number" id="p19SimAmount" class="form-control form-control-lg fw-bold text-primary" value="${amount}" step="50" oninput="window.app.p19RecalcSim('${r.id}')">
            </div>
          </div>

          <div class="card p-3 mb-3 bg-light border-0">
            <div class="row g-3">
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Regra Identificada</span>
                <strong>${r.name || 'Regra Comercial'}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Adquirente / Meio</span>
                <strong>${r.acquirer || 'Gateway'} · ${r.method || 'Cartão'}</strong>
              </div>
              <div class="col-4">
                <span class="text-muted fs-xs text-uppercase d-block">Taxa Cobrada</span>
                <span class="fw-bold fs-md" id="p19SimRateLabel">${rate.toFixed(2)}%</span>
                <div class="text-success fs-xs fw-bold" id="p19SimRevVal">${br(revenue)}</div>
              </div>
              <div class="col-4">
                <span class="text-muted fs-xs text-uppercase d-block">Custo MDR + Tarifa</span>
                <span class="fw-bold fs-md text-danger" id="p19SimMdrLabel">${mdr.toFixed(2)}% + ${br(fixed)}</span>
                <div class="text-danger fs-xs fw-bold" id="p19SimCostVal">${br(cost)}</div>
              </div>
              <div class="col-4">
                <span class="text-muted fs-xs text-uppercase d-block">Spread Estimado</span>
                <span class="fw-bold fs-md text-primary" id="p19SimSpreadVal">${br(spread)}</span>
                <div class="text-muted fs-xs" id="p19SimSpreadPct">${((spread / amount) * 100).toFixed(2)}% margem</div>
              </div>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-6">
              <div class="p-2 border rounded">
                <span class="text-muted fs-xs d-block">Responsável pelo Custo (MDR)</span>
                <strong>${r.payer || 'Produtor (Descontado no Repasse)'}</strong>
              </div>
            </div>
            <div class="col-6">
              <div class="p-2 border rounded">
                <span class="text-muted fs-xs d-block">Status da Regra / Vigência</span>
                <span class="badge badge-success">Vigente (v${r.version || 1})</span>
              </div>
            </div>
          </div>

          <div class="info-banner info-banner-blue mb-0">
            <i class="ph-shield-check"></i>
            <div>
              <strong>Snapshot Imutável:</strong> Ao autorizar cada venda ou repasse, a regra e sua versão ativa são gravadas na transação para assegurar a rastreabilidade em estornos, no Ledger e na conciliação.
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end gap-2 p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  p19RecalcSim(ruleId) {
    const st = financialStore.getState();
    const r = (st.data.spreadRules && st.data.spreadRules.find(x => x.id === ruleId)) ||
              (st.data.taxRules && st.data.taxRules.find(x => x.id === ruleId)) || {
                chargedRate: 8.90,
                mdr: 2.19,
                fixedFee: 0.40
              };
    const valInput = document.getElementById('p19SimAmount');
    if (!valInput) return;
    const amount = Number(valInput.value) || 0;
    const rate = Number(r.chargedRate || r.rate || 0);
    const mdr = Number(r.mdr || 0);
    const fixed = Number(r.fixedFee || 0);

    const revenue = amount * rate / 100;
    const cost = amount > 0 ? (amount * mdr / 100) + fixed : 0;
    const spread = revenue - cost;
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const revEl = document.getElementById('p19SimRevVal');
    const costEl = document.getElementById('p19SimCostVal');
    const spreadEl = document.getElementById('p19SimSpreadVal');
    const pctEl = document.getElementById('p19SimSpreadPct');

    if (revEl) revEl.innerText = br(revenue);
    if (costEl) costEl.innerText = br(cost);
    if (spreadEl) spreadEl.innerText = br(spread);
    if (pctEl) pctEl.innerText = amount > 0 ? `${((spread / amount) * 100).toFixed(2)}% margem` : '0.00% margem';
  }

  p19PrepareCnab(batchId = 'CNAB-240-20260929-01') {
    const st = financialStore.getState();
    const b = (st.data.cnabBatches && st.data.cnabBatches.find(x => x.batchId === batchId)) || {
      batchId: batchId,
      bank: 'Banco do Brasil (001)',
      agencyAccount: 'Ag 3412-1 / CC 55400-2',
      count: 8,
      totalAmount: 642890.00,
      status: 'Arquivo Gerado / Homologação'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Preparação de Arquivo CNAB 240 (Homologação)</h4>
            <div class="text-muted fs-sm">Lote: <strong>${b.batchId}</strong> · Banco: <strong>${b.bank}</strong></div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="alert alert-warning mb-3">
            <i class="ph-warning-circle"></i>
            <div>
              <strong>Atenção Operacional (Regra de Homologação):</strong>
              O arquivo remessa foi compilado conforme o layout FEBRABAN CNAB 240. O sistema <strong>NÃO</strong> declara liquidação bancária sem recepção real do arquivo de retorno (.RET) ou confirmação de VAN bancária homologada.
            </div>
          </div>

          <div class="card p-3 mb-3 bg-light border-0">
            <div class="row g-3">
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Banco e Convênio</span>
                <strong>${b.bank}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Conta Origem (Disk Ingressos)</span>
                <strong>${b.agencyAccount}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Quantidade de Pagamentos</span>
                <strong>${b.count} obrigações (Repasses a Produtores)</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Valor Total do Lote</span>
                <strong class="text-primary fs-md">${br(b.totalAmount)}</strong>
              </div>
            </div>
          </div>

          <div class="border rounded p-3 mb-3">
            <h6 class="fw-bold mb-2">Estrutura da Remessa (Segmentos A e B):</h6>
            <ul class="fs-sm mb-0 text-muted" style="padding-left: 20px;">
              <li>Header de Arquivo: Código 001, Inscrição Disk Ingressos PJ, Remessa 240.</li>
              <li>Header de Lote: Serviço de Pagamento a Fornecedores / Repasses (Tipo 20).</li>
              <li>Segmento A: Dados de pagamento, banco favorecido, agência, conta, valor nominal e data.</li>
              <li>Segmento B: CNPJ/CPF favorecido, finalidade DOC/TED/PIX e autenticação digital.</li>
              <li>Trailer de Lote e Trailer de Arquivo: Somatórios e controle de integridade.</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
          <button type="button" class="btn btn-primary" onclick="window.app.p19DownloadCnabSample('${b.batchId}')">
            <i class="ph-download-simple"></i> Baixar Amostra Remessa (.REM)
          </button>
        </div>
      </div>
    `);
  }

  p19DownloadCnabSample(batchId) {
    const text = "00100000         20260929DISK INGRESSOS SERVICOS DE EVENTOS LTDA  001BANCO DO BRASIL S.A. 290920261025000001084016000000000000000000\\n" +
      "00100011C2001030 01DISK INGRESSOS SERVICOS DE EVENTOS LTDA                                      000000012909202600000000\\n" +
      "0010001300001A00000013410341200000000554002PRODUTORA ABC LTDA                   REP-2026-012829092026BRL0000000064289000\\n" +
      "0010001300002B00000010212345678000199PRODUTORA ABC LTDA                   FESTIVAL CTBA 2026              0000000000000000\\n" +
      "00100015         000002000000000006428900000000000000000000000000000000000000000000000000000000000000000000000000000000000000\\n" +
      "00199999         000001000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batchId.replace(/[^a-zA-Z0-9_-]/g, '_')}_HOMOLOGACAO.REM`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    financialStore.showToast('Arquivo Remessa Gerado', `Arquivo ${batchId}.REM compilado com sucesso para teste no ambiente bancário.`, 'success');
  }

  p19BatchDetail(id) {
    const st = financialStore.getState();
    const b = (st.data.cnabBatches && st.data.cnabBatches.find(x => x.batchId === id)) || {
      batchId: id,
      bank: 'Banco do Brasil (001)',
      agencyAccount: 'Ag 3412-1 / CC 55400-2',
      count: 8,
      totalAmount: 642890.00,
      status: 'Aguardando Retorno'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 700px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Dossiê do Lote CNAB: ${b.batchId}</h4>
            <div class="text-muted fs-sm">Status Atual: <span class="badge badge-info">${b.status}</span></div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <div class="p-2 border rounded">
                <span class="text-muted fs-xs d-block">Banco e Conta Débito</span>
                <strong>${b.bank} · ${b.agencyAccount}</strong>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-2 border rounded">
                <span class="text-muted fs-xs d-block">Total Consolidado</span>
                <strong class="text-primary">${br(b.totalAmount)} (${b.count} pagamentos)</strong>
              </div>
            </div>
          </div>

          <h6 class="fw-bold mb-2">Favorecidos Incluídos no Lote:</h6>
          <div class="table-responsive" style="max-height: 220px; overflow-y: auto;">
            <table class="limitless-table fs-sm">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Favorecido</th>
                  <th>Banco / Conta</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>REP-2026-0128</strong></td>
                  <td>Produtora ABC Ltda.</td>
                  <td>Itaú Ag 1234 CC 56789-0</td>
                  <td class="fw-bold">${br(642890.00)}</td>
                  <td><span class="badge badge-warning">Remessa Enviada</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="alert alert-info mt-3 mb-0">
            <i class="ph-info"></i>
            <div>A confirmação definitiva deste lote depende do processamento do respectivo arquivo de retorno bancário (.RET) ou notificação via API bancária.</div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
          <button type="button" class="btn btn-primary" onclick="window.app.p19DownloadCnabSample('${b.batchId}')">Baixar Remessa</button>
        </div>
      </div>
    `);
  }

  p19CnabOccurrencesModal() {
    const st = financialStore.getState();
    const occurrences = st.data.cnabOccurrences || [];
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 780px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Central de Ocorrências e Rejeições CNAB</h4>
            <div class="text-muted fs-sm">Tratamento pelo Financeiro Disk (Karine) · ${occurrences.length} ocorrências registradas</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Lote</th>
                  <th>Favorecido</th>
                  <th>Valor</th>
                  <th>Motivo da Ocorrência</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${occurrences.map(o => `
                  <tr>
                    <td><strong>${o.id || o.occurrenceId}</strong></td>
                    <td>${o.batchId}</td>
                    <td>${o.beneficiary}</td>
                    <td class="fw-bold">${br(o.amount)}</td>
                    <td><span class="text-danger fw-bold fs-xs">${o.reason}</span></td>
                    <td>
                      <span class="badge ${o.status === 'Resolvida' || o.status === 'Tratada' ? 'badge-success' : 'badge-danger'}">
                        ${o.status}
                      </span>
                    </td>
                    <td>
                      ${o.status === 'Resolvida' || o.status === 'Tratada' ? 
                        `<span class="text-muted fs-xs">Tratada por ${o.treatedBy || 'Karine'}</span>` :
                        `<button class="btn btn-danger btn-xs" onclick="window.app.p19TreatCnabOccurrence('${o.id || o.occurrenceId}')">Tratar</button>`
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  p19TreatCnabOccurrence(occurrenceId) {
    const st = financialStore.getState();
    const o = (st.data.cnabOccurrences && st.data.cnabOccurrences.find(x => (x.id === occurrenceId || x.occurrenceId === occurrenceId))) || {
      id: occurrenceId,
      batchId: 'CNAB-240-20260929-01',
      beneficiary: 'Favorecido',
      amount: 1850,
      reason: '03 - Dígito Verificador de Conta Inválido'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Tratar Ocorrência: ${o.id || o.occurrenceId}</h4>
            <div class="text-muted fs-sm">Lote: ${o.batchId} · Favorecido: ${o.beneficiary}</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.p19SubmitOccurrence(event, '${o.id || o.occurrenceId}')">
          <div class="alert alert-danger mb-3">
            <strong>Motivo apontado pelo banco:</strong><br>
            ${o.reason} — Valor envolvido: <strong>${br(o.amount)}</strong>
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Ação Corretiva *</label>
            <select name="actionType" class="form-select" required>
              <option value="CORRECAO_CADASTRO" selected>Atualizar dados bancários do produtor e reincluir no próximo lote</option>
              <option value="REABRIR_PAGAMENTO">Reabrir pagamento para cancelamento ou solicitação de novos dados</option>
              <option value="ESTORNO_JUSTIFICADO">Estornar obrigação com parecer de auditoria financeira</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Responsável</label>
            <input type="text" class="form-control" name="responsible" readonly value="karine@diskingressos.com.br (Adm Financeiro)">
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Parecer Técnico / Dados Corrigidos *</label>
            <textarea name="note" class="form-control" rows="3" required placeholder="Descreva os dados corrigidos (ex: Agência 3412-1 / CC 55400 com dígito 2) e o parecer financeiro..."></textarea>
          </div>

          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar e Resolver Ocorrência</button>
          </div>
        </form>
      </div>
    `);
  }

  p19SubmitOccurrence(ev, occurrenceId) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      financialStore.resolveCnabOccurrence(occurrenceId, f.actionType, f.note);
      this.closeModal();
      financialStore.showToast('Ocorrência Regularizada', `Ocorrência ${occurrenceId} tratada com sucesso e auditada.`, 'success');
      this.render();
    } catch (e) {
      financialStore.showToast('Erro ao regularizar', e.message, 'danger');
    }
  }

  p19CnabReturnsModal() {
    const st = financialStore.getState();
    const returns = st.data.cnabReturns || [
      { id: 'RET-20260929-01.ret', date: '29/09/2026 14:15', bank: 'Banco do Brasil', items: 8, total: 642890.00, occurrences: 1, status: 'Processado' },
      { id: 'RET-20260928-03.ret', date: '28/09/2026 16:40', bank: 'Itaú Unibanco', items: 12, total: 884200.00, occurrences: 1, status: 'Processado' },
      { id: 'RET-20260928-02.ret', date: '28/09/2026 11:10', bank: 'Banco do Brasil', items: 5, total: 195450.00, occurrences: 0, status: 'Processado' }
    ];
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 750px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Arquivos de Retorno Bancário Processados (.RET)</h4>
            <div class="text-muted fs-sm">Liquidação contábil e conciliação por arquivo retorno FEBRABAN</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Arquivo .RET</th>
                  <th>Data Processamento</th>
                  <th>Banco</th>
                  <th>Itens</th>
                  <th>Total Liquidado</th>
                  <th>Ocorrências</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${returns.map(r => `
                  <tr>
                    <td><strong>${r.id || r.file}</strong></td>
                    <td>${r.date}</td>
                    <td>${r.bank}</td>
                    <td>${r.items}</td>
                    <td class="fw-bold text-success">${br(r.total)}</td>
                    <td>${r.occurrences > 0 ? `<span class="badge badge-warning">${r.occurrences} rejeição</span>` : `<span class="badge badge-light">0</span>`}</td>
                    <td><span class="badge badge-success">${r.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  p19AgendaDrillDown(category = 'repasses') {
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let title = 'Detalhamento da Agenda de Pagamentos';
    let filterDesc = 'Todas as obrigações programadas';
    let items = [
      { date: '29/09/2026', type: 'Repasse', beneficiary: 'Produtora ABC Ltda.', event: 'Festival Curitiba 2026', amount: 514490.00, method: 'CNAB 240 / BB', status: 'Programado' },
      { date: '29/09/2026', type: 'Repasse', beneficiary: 'Prime Eventos Culturais', event: 'Stand-up Curitiba Especial', amount: 128400.00, method: 'PIX / Itaú', status: 'Programado' },
      { date: '29/09/2026', type: 'Fornecedor', beneficiary: 'Segurança & Portaria CTBA', event: 'Festival Curitiba 2026', amount: 35000.00, method: 'PIX / Itaú', status: 'Agendado' },
      { date: '30/09/2026', type: 'Fornecedor', beneficiary: 'Som & Iluminação Curitiba', event: 'Festival Curitiba 2026', amount: 84200.00, method: 'CNAB 240 / BB', status: 'Em Lote' },
      { date: '01/10/2026', type: 'Fornecedor', beneficiary: 'Arena Locações de Palco', event: 'Festival Curitiba 2026', amount: 150510.00, method: 'CNAB 240 / BB', status: 'Agendado' }
    ];

    if (category === 'repasses') {
      title = 'Obrigações: Repasses a Produtores';
      filterDesc = '8 repasses totalizando R$ 642.890,00 nos próximos 7 dias';
      items = items.filter(x => x.type === 'Repasse');
    } else if (category === 'fornecedores') {
      title = 'Obrigações: Fornecedores de Infraestrutura';
      filterDesc = 'Fornecedores e custos operacionais totalizando R$ 269.710,00 nos próximos 7 dias';
      items = items.filter(x => x.type === 'Fornecedor');
    } else if (category === 'today' || category === '2026-09-29') {
      title = 'Pagamentos Programados para Hoje (29/09/2026)';
      filterDesc = 'Total de R$ 182.900,00 com liberação programada para a data corrente';
      items = items.filter(x => x.date === '29/09/2026');
    } else if (category === '7days') {
      title = 'Pagamentos dos Próximos 7 Dias';
      filterDesc = 'Total consolidado de R$ 912.600,00 (Repasses: R$ 642.890 + Fornecedores: R$ 269.710)';
    }

    const totalVal = items.reduce((sum, it) => sum + it.amount, 0);

    this.showModal(`
      <div class="modal-card" style="max-width: 800px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">${title}</h4>
            <div class="text-muted fs-sm">${filterDesc}</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Tipo</th>
                  <th>Favorecido</th>
                  <th>Evento</th>
                  <th>Meio / Banco</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(it => `
                  <tr>
                    <td><strong>${it.date}</strong></td>
                    <td><span class="badge ${it.type === 'Repasse' ? 'badge-primary' : 'badge-secondary'}">${it.type}</span></td>
                    <td><strong>${it.beneficiary}</strong></td>
                    <td>${it.event}</td>
                    <td>${it.method}</td>
                    <td class="fw-bold">${br(it.amount)}</td>
                    <td><span class="badge badge-info">${it.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <span class="fw-bold text-muted">Total Selecionado na Visualização:</span>
            <span class="fs-lg fw-bold text-primary">${br(totalVal)}</span>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  p19ConcFilter(status = '') {
    this.currentConcFilter = status || '';
    const rows = document.querySelectorAll('#p19ConcTable tbody tr, #rec-operational-table tbody tr');
    rows.forEach(tr => {
      const matchLayer = !this.currentConcLayer || this.currentConcLayer === 'all' || !tr.dataset.layer || tr.dataset.layer === this.currentConcLayer;
      const matchStatus = !status || !tr.dataset.status || tr.dataset.status === status;
      tr.style.display = (matchLayer && matchStatus) ? '' : 'none';
    });
    this.render(financialStore.getState());
    financialStore.showToast('Filtro de Conciliação', status ? `Exibindo apenas: ${status}` : 'Exibindo todos os registros', 'info');
  }

  p19ConcLayer(layer = '') {
    this.currentConcLayer = layer || 'all';
    const rows = document.querySelectorAll('#p19ConcTable tbody tr, #rec-operational-table tbody tr');
    rows.forEach(tr => {
      const matchLayer = !layer || layer === 'all' || !tr.dataset.layer || tr.dataset.layer === layer;
      const matchStatus = !this.currentConcFilter || !tr.dataset.status || tr.dataset.status === this.currentConcFilter;
      tr.style.display = (matchLayer && matchStatus) ? '' : 'none';
    });
    this.render(financialStore.getState());
    financialStore.showToast('Camada de Conciliação', (layer && layer !== 'all') ? `Filtrando por camada: ${layer}` : 'Exibindo todas as camadas', 'info');
  }

  p19ConcInvestigate(id) {
    return this.p19Investigate(id);
  }

  p19ImportBankStatement() {
    this.showModal(`
      <div class="modal-card" style="max-width: 580px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0"><i class="ph-upload me-2 text-primary"></i>Importar Extrato para Conciliação</h4>
            <div class="text-muted fs-sm">Formatos suportados: OFX, CNAB 240 (.RET) e CSV Bancário</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="event.preventDefault(); window.app.closeModal(); financialStore.showToast('Extrato Importado', 'Arquivo OFX/CNAB processado e cruzado com as 7 camadas de auditoria.', 'success');">
          <div class="mb-3">
            <label class="form-label fw-bold">Conta Bancária / Origem *</label>
            <select class="form-select" required>
              <option value="itau">Itaú Empresas (Ag 0312 / CC 88412-9) — Liquidação PIX & CNAB</option>
              <option value="bradesco">Bradesco Corporate (Ag 2104 / CC 44100-1) — Custódia Eventos</option>
              <option value="stone">Adquirente Stone / Pagar.me — Extrato EDI</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Arquivo de Extrato (OFX / RET / CSV)</label>
            <input type="file" class="form-control" accept=".ofx,.ret,.rem,.csv,.txt">
            <div class="form-text">Para homologação, você pode confirmar diretamente para simular a importação do lote do dia.</div>
          </div>
          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold"><i class="ph-check me-1"></i> Processar e Conciliar</button>
          </div>
        </form>
      </div>
    `);
  }

  p19ConcDetail(id) {
    const st = financialStore.getState();
    const item = (st.data.reconciliationItems && st.data.reconciliationItems.find(x => x.id === id)) || {
      id: id,
      layer: 'Ledger',
      description: `Registro ${id}`,
      internalVal: 350.00,
      externalVal: 350.00,
      diff: 0.00,
      status: 'Conciliado',
      date: '29/09/2026'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Dossiê de Conciliação: ${item.id}</h4>
            <div class="text-muted fs-sm">Camada: <strong>${item.layer}</strong> · Data: ${item.date || '29/09/2026'}</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="card p-3 mb-3 bg-light border-0">
            <div class="row g-3">
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Valor Sistema / Interno</span>
                <strong class="fs-md">${br(item.internalVal)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Valor Externo (Banco/Adquirente)</span>
                <strong class="fs-md">${br(item.externalVal)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Diferença Apurada</span>
                <strong class="fs-md ${item.diff !== 0 ? 'text-danger' : 'text-success'}">${br(item.diff)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted fs-xs text-uppercase d-block">Status</span>
                <span class="badge ${item.status === 'Conciliado' ? 'badge-success' : 'badge-danger'}">${item.status}</span>
              </div>
            </div>
          </div>

          <div class="p-3 border rounded mb-3">
            <h6 class="fw-bold mb-1">Auditoria & Rastreabilidade Ledger:</h6>
            <div class="text-muted fs-sm">Partida dobrada vinculada: <code>#LEDGER-${item.id.replace(/[^0-9]/g, '') || '20260929-01'}</code></div>
            <div class="text-muted fs-sm">Origem dos dados: Base operacional de transações e extrato de homologação.</div>
            ${item.treatmentNote ? `<div class="mt-2 p-2 bg-light rounded text-dark fs-sm"><strong>Tratamento Registrado:</strong> ${item.treatmentNote} (por ${item.treatedBy || 'Karine'})</div>` : ''}
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  p19Investigate(id) {
    const st = financialStore.getState();
    const item = (st.data.reconciliationItems && st.data.reconciliationItems.find(x => x.id === id)) || {
      id: id,
      layer: 'PIX / CNAB',
      description: 'PIX Venda Balcão #4412',
      internalVal: 350.00,
      externalVal: 300.00,
      diff: -50.00,
      status: 'Divergência'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Investigar & Tratar Divergência: ${id}</h4>
            <div class="text-muted fs-sm">Valores originais são preservados com auditoria imutável</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.p19Resolve(event, '${id}')">
          <div class="alert alert-danger mb-3">
            <strong>Divergência detectada:</strong><br>
            Valor Sistema: <strong>${br(item.internalVal)}</strong> vs Valor Banco/Gateway: <strong>${br(item.externalVal)}</strong> (Diferença: <strong>${br(item.diff)}</strong>)
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Causa Identificada *</label>
            <select name="cause" class="form-select" required>
              <option value="">Selecione a causa</option>
              <option value="Tarifa bancária" selected>Tarifa bancária de liquidação PIX (R$ 50,00)</option>
              <option value="MDR divergente">MDR divergente entre adquirente e regra</option>
              <option value="Liquidação parcial">Liquidação parcial pelo banco</option>
              <option value="Pagamento rejeitado">Pagamento rejeitado ou devolvido</option>
              <option value="Data diferente">Data de corte diferente</option>
              <option value="Duplicidade">Duplicidade de transação</option>
              <option value="Chargeback">Chargeback ou contestação de compra</option>
              <option value="Erro cadastral">Erro cadastral de conta bancária</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Responsável Financeiro</label>
            <input type="text" name="owner" class="form-control" readonly value="karine@diskingressos.com.br (Adm Financeiro)">
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Ação Corretiva *</label>
            <select name="action" class="form-select" required>
              <option value="Registrar tarifa" selected>Lançar tarifa bancária como despesa de liquidação</option>
              <option value="Reprocessar">Reprocessar conciliação na próxima janela</option>
              <option value="Corrigir cadastro">Corrigir cadastro e reabrir obrigação</option>
              <option value="Ajuste autorizado">Registrar ajuste contábil autorizado</option>
              <option value="Encerrar com justificativa">Encerrar divergência com justificativa formal</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label fw-bold">Evidência / Observação de Auditoria *</label>
            <textarea name="evidence" class="form-control" rows="3" required placeholder="Descreva os detalhes da conciliação e a evidência comprovada no extrato bancário...">Extrato Itaú confirma débito de tarifa operacional de R$ 50,00 referente à chave PIX de liquidação imediata.</textarea>
          </div>

          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Registrar Tratamento e Atualizar Conciliação</button>
          </div>
        </form>
      </div>
    `);
  }

  p19Resolve(ev, id) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      financialStore.saveReconciliationResolution(id, f);
      this.closeModal();
      financialStore.showToast('Divergência Tratada', `Item ${id} regularizado com sucesso no painel de conciliação.`, 'success');
      this.render();
    } catch (e) {
      financialStore.showToast('Erro ao tratar', e.message, 'danger');
    }
  }

  p19OpenTreasuryAccountModal(id = '') {
    const st = financialStore.getState();
    const acc = (st.data.treasuryAccounts && st.data.treasuryAccounts.find(x => x.id === id)) || null;

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">${acc ? 'Editar Conta Corporativa Disk' : 'Nova Conta Corporativa Disk'}</h4>
            <div class="text-muted fs-sm">Gestão de Tesouraria e Contas Bancárias Oficiais</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.p19SubmitTreasuryAccount(event, '${acc ? acc.id : ''}')">
          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Instituição Bancária *</label>
              <select name="bank" class="form-select" required>
                <option value="Banco do Brasil (001)" ${acc && acc.bank.includes('001') ? 'selected' : ''}>Banco do Brasil (001)</option>
                <option value="Itaú Unibanco (341)" ${acc && acc.bank.includes('341') ? 'selected' : ''}>Itaú Unibanco (341)</option>
                <option value="Santander Brasil (033)" ${acc && acc.bank.includes('033') ? 'selected' : ''}>Santander Brasil (033)</option>
                <option value="Bradesco (237)" ${acc && acc.bank.includes('237') ? 'selected' : ''}>Bradesco (237)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Finalidade Estrita *</label>
              <select name="purpose" class="form-select" required>
                <option value="Operacional / CNAB Fornecedores" ${acc && acc.purpose.includes('Operacional') ? 'selected' : ''}>Operacional / CNAB Fornecedores</option>
                <option value="Liquidação / PIX Produtores" ${acc && acc.purpose.includes('Liquidação') ? 'selected' : ''}>Liquidação / PIX Produtores</option>
                <option value="Arrecadação de Vendas" ${acc && acc.purpose.includes('Arrecadação') ? 'selected' : ''}>Arrecadação de Vendas</option>
                <option value="Fundo de Reserva / Rendimento" ${acc && acc.purpose.includes('Reserva') ? 'selected' : ''}>Fundo de Reserva / Rendimento</option>
              </select>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-5">
              <label class="form-label fw-bold">Agência *</label>
              <input type="text" name="agency" class="form-control" required value="${acc ? acc.agency : '3412-1'}">
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">Conta Corrente *</label>
              <input type="text" name="account" class="form-control" required value="${acc ? acc.account : '55400'}">
            </div>
            <div class="col-md-2">
              <label class="form-label fw-bold">Dígito *</label>
              <input type="text" name="digit" class="form-control" required value="${acc ? acc.digit : '2'}">
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Chave PIX</label>
              <input type="text" name="pixKey" class="form-control" value="${acc ? acc.pixKey : 'financeiro@diskingressos.com.br'}">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Limite Diário Operacional (R$)</label>
              <input type="number" name="dailyLimit" class="form-control" value="${acc ? acc.dailyLimit : 2000000}">
            </div>
          </div>

          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">${acc ? 'Salvar Alterações' : 'Cadastrar Conta Corporativa'}</button>
          </div>
        </form>
      </div>
    `);
  }

  p19SubmitTreasuryAccount(ev, id = '') {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      financialStore.saveTreasuryAccount(f, id || null);
      this.closeModal();
      financialStore.showToast('Conta Salva', 'Conta bancária corporativa registrada na Tesouraria.', 'success');
      this.render();
    } catch (e) {
      financialStore.showToast('Erro ao salvar conta', e.message, 'danger');
    }
  }

  p19TreasuryAccountStatement(id) {
    const st = financialStore.getState();
    const acc = (st.data.treasuryAccounts && st.data.treasuryAccounts.find(x => x.id === id)) || {
      id: id,
      bank: 'Banco do Brasil (001)',
      agency: '3412-1',
      account: '55400-2',
      purpose: 'Operacional / CNAB Fornecedores',
      balance: 1240500.00
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 750px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Extrato Interno: ${acc.bank}</h4>
            <div class="text-muted fs-sm">Ag: ${acc.agency} · Conta: ${acc.account} · Finalidade: ${acc.purpose}</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="card p-3 mb-3 bg-light border-0 d-flex justify-content-between flex-row align-items-center">
            <div>
              <span class="text-muted fs-xs text-uppercase d-block">Saldo Disponível Conciliado</span>
              <strong class="fs-lg text-success">${br(acc.balance)}</strong>
            </div>
            <span class="badge badge-success">Sincronizado via D+0</span>
          </div>

          <h6 class="fw-bold mb-2">Lançamentos Recentes no Período:</h6>
          <div class="table-responsive">
            <table class="limitless-table fs-sm">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Histórico</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>29/09/2026</td>
                  <td>Liquidação Remessa CNAB 240 Lote 01</td>
                  <td><code>CNAB-01</code></td>
                  <td><span class="badge badge-danger">DÉBITO</span></td>
                  <td class="text-danger fw-bold">- ${br(642890.00)}</td>
                </tr>
                <tr>
                  <td>29/09/2026</td>
                  <td>Repasse Arrecadação Cielo Crédito</td>
                  <td><code>LIQ-CIELO-49</code></td>
                  <td><span class="badge badge-success">CRÉDITO</span></td>
                  <td class="text-success fw-bold">+ ${br(820000.00)}</td>
                </tr>
                <tr>
                  <td>28/09/2026</td>
                  <td>Tarifa de Manutenção e Mensageria CNAB</td>
                  <td><code>TAR-BB-09</code></td>
                  <td><span class="badge badge-danger">DÉBITO</span></td>
                  <td class="text-danger fw-bold">- R$ 142,50</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  openTransferBetweenEventsModal(fromEventId = '') {
    const st = financialStore.getState();
    const producer = st.activeProducer || st.data.producer;
    const events = st.data.events.filter(e => e.producerId === producer.id);

    if (events.length < 2) {
      financialStore.showToast('Transferência Indisponível', 'É necessário ter pelo menos 2 eventos ativos para realizar transferências de saldo.', 'warning');
      return;
    }

    const selectedFrom = fromEventId || events[0].id;
    const fromEvt = events.find(e => e.id === selectedFrom) || events[0];
    const availableDestEvents = events.filter(e => e.id !== fromEvt.id);
    const destEvt = availableDestEvents[0];

    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const financialBalance = fromEvt.availableBalance || fromEvt.totalBalance || 0;
    const retained = fromEvt.blockedBalance || 0;
    const reserved = fromEvt.reservedBalance || 0;
    const blocks = fromEvt.cautelarBlocks || 0;
    const transferable = Math.max(0, financialBalance - reserved);

    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Transferência de Saldo entre Eventos</h4>
            <div class="text-muted fs-sm">Movimentação segregada com dupla partida contábil no Ledger</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitTransferBetweenEvents(event)">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Evento de Origem (Débito) *</label>
              <select name="fromEventId" id="trf_fromEvent" class="form-select" onchange="window.app.recalcTransferableBalance(this.value)" required>
                ${events.map(e => `
                  <option value="${e.id}" ${e.id === fromEvt.id ? 'selected' : ''}>${e.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Evento de Destino (Crédito) *</label>
              <select name="toEventId" id="trf_toEvent" class="form-select" required>
                ${events.map(e => `
                  <option value="${e.id}" ${e.id === destEvt.id ? 'selected' : ''}>${e.name}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Card de Regra Rígida de Saldo Transferível -->
          <div class="card p-3 mb-3 bg-light border-0" id="trf_calcCard">
            <span class="text-muted fs-xs text-uppercase fw-bold d-block mb-2">Composição do Saldo do Evento de Origem:</span>
            <div class="row g-2 fs-sm">
              <div class="col-6">
                <span class="text-muted">Saldo financeiro bruto:</span>
                <strong class="d-block" id="trf_lblFinancial">${br(financialBalance)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted">(-) Retido (Garantias/CB):</span>
                <strong class="d-block text-danger" id="trf_lblRetained">- ${br(retained)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted">(-) Reservado para repasses:</span>
                <strong class="d-block text-warning" id="trf_lblReserved">- ${br(reserved)}</strong>
              </div>
              <div class="col-6">
                <span class="text-muted">(-) Bloqueios cautelares:</span>
                <strong class="d-block text-danger" id="trf_lblBlocks">- ${br(blocks)}</strong>
              </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
              <span class="fw-bold text-dark">Saldo Elegível Transferível:</span>
              <span class="fs-md fw-bold text-primary" id="trf_lblTransferable">${br(transferable)}</span>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Valor da Transferência (R$) *</label>
              <div class="input-group">
                <span class="input-group-text">R$</span>
                <input type="number" name="amount" id="trf_amount" class="form-control form-control-lg fw-bold text-primary" step="100" min="1" max="${transferable}" value="${Math.min(50000, transferable)}" required>
              </div>
              <div class="form-text fs-xs">Limite máximo permitido: <strong id="trf_maxHelp">${br(transferable)}</strong></div>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Motivo Operacional *</label>
              <input type="text" name="reason" class="form-control form-control-lg" placeholder="Ex: Reforço de caixa p/ fornecedores" value="Remanejamento de saldo operacional" required>
            </div>
          </div>

          <div class="info-banner info-banner-blue mb-0">
            <i class="ph-shield-check"></i>
            <div>
              <strong>Auditoria e Ledger:</strong> A transferência gera dois lançamentos vinculados com protocolo único (TRF-2026-XXXX). O saldo consolidado da produtora não se altera, preservando a conciliação individual de cada borderô.
            </div>
          </div>

          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">
              <i class="ph-check-circle"></i> Executar Transferência
            </button>
          </div>
        </form>
      </div>
    `);
  }

  recalcTransferableBalance(fromEventId) {
    const st = financialStore.getState();
    const fromEvt = st.data.events.find(e => e.id === fromEventId);
    if (!fromEvt) return;

    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const financialBalance = fromEvt.availableBalance || fromEvt.totalBalance || 0;
    const retained = fromEvt.blockedBalance || 0;
    const reserved = fromEvt.reservedBalance || 0;
    const blocks = fromEvt.cautelarBlocks || 0;
    const transferable = Math.max(0, financialBalance - reserved);

    const lblFinancial = document.getElementById('trf_lblFinancial');
    const lblRetained = document.getElementById('trf_lblRetained');
    const lblReserved = document.getElementById('trf_lblReserved');
    const lblBlocks = document.getElementById('trf_lblBlocks');
    const lblTransferable = document.getElementById('trf_lblTransferable');
    const maxHelp = document.getElementById('trf_maxHelp');
    const amountInput = document.getElementById('trf_amount');

    if (lblFinancial) lblFinancial.innerText = br(financialBalance);
    if (lblRetained) lblRetained.innerText = `- ${br(retained)}`;
    if (lblReserved) lblReserved.innerText = `- ${br(reserved)}`;
    if (lblBlocks) lblBlocks.innerText = `- ${br(blocks)}`;
    if (lblTransferable) lblTransferable.innerText = br(transferable);
    if (maxHelp) maxHelp.innerText = br(transferable);
    if (amountInput) {
      amountInput.max = transferable;
      if (Number(amountInput.value) > transferable) amountInput.value = transferable;
    }

    const toSelect = document.getElementById('trf_toEvent');
    if (toSelect) {
      const producer = st.activeProducer || st.data.producer;
      const otherEvents = st.data.events.filter(e => e.producerId === producer.id && e.id !== fromEventId);
      toSelect.innerHTML = otherEvents.map((e, idx) => `
        <option value="${e.id}" ${idx === 0 ? 'selected' : ''}>${e.name}</option>
      `).join('');
    }
  }

  submitTransferBetweenEvents(ev) {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      financialStore.transferBetweenEvents(f);
      this.closeModal();
      this.render();
    } catch (e) {
      financialStore.showToast('Transferência Bloqueada', e.message, 'danger');
    }
  }

  openRetentionsModal(eventId = 'all') {
    const st = financialStore.getState();
    const producer = st.activeProducer || st.data.producer;
    const retentions = financialStore.getProducerRetentions(producer.id, eventId);
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const total = retentions.reduce((s, r) => s + (r.amount || 0), 0) || 45000;

    this.showModal(`
      <div class="modal-card" style="max-width: 820px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Detalhamento de Retenções & Bloqueios</h4>
            <div class="text-muted fs-sm">Total Retido: <strong class="text-danger">${br(total)}</strong> · ${retentions.length} itens com rastreabilidade formal</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="alert alert-info mb-3">
            <i class="ph-info"></i>
            <div>
              <strong>Governança de Retenções:</strong> Nenhuma retenção é genérica. Cada linha indica sua origem técnica, motivo contratual/operacional, situação e as condições estritas para liberação e estorno ao saldo disponível.
            </div>
          </div>

          <div class="table-responsive">
            <table class="limitless-table fs-sm">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Origem / Referência</th>
                  <th>Motivo da Retenção</th>
                  <th>Data</th>
                  <th>Previsão / Condição de Liberação</th>
                  <th style="text-align: right;">Valor Retido</th>
                  <th style="text-align: center;">Situação</th>
                </tr>
              </thead>
              <tbody>
                ${retentions.map(r => `
                  <tr>
                    <td><strong class="text-dark">${r.category}</strong></td>
                    <td class="text-muted"><code>${r.origin}</code></td>
                    <td>${r.reason}</td>
                    <td class="text-muted">${r.date}</td>
                    <td><span class="badge bg-light text-dark">${r.releaseCondition}</span></td>
                    <td style="text-align: right; font-weight: 800; color: #dc2626;">${br(r.amount)}</td>
                    <td style="text-align: center;"><span class="badge ${r.status === 'Ativa' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid var(--border-color);">
                  <td colspan="5" style="text-transform: uppercase;">Total de Retenções Ativas</td>
                  <td style="text-align: right; font-size: 1.05rem; font-weight: 800; color: #dc2626;">${br(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  openBalanceCompositionModal(eventId = null) {
    const st = financialStore.getState();
    const producer = st.activeProducer || st.data.producer;
    const targetEventId = eventId || st.selectedEventId || 'all';
    const comp = financialStore.getProducerBalanceComposition(producer.id, targetEventId);
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.showModal(`
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0" id="modal-dialog-title">Composição do Saldo Financeiro</h4>
            <div class="text-muted fs-sm">Escopo: <strong>${comp.scopeLabel || 'Todos os Eventos (Consolidado)'}</strong> &bull; Referência: ${comp.referenceDate || '04/11/2026 11:00 BRT'}</div>
          </div>
          <button class="modal-close-btn" aria-label="Fechar diálogo" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="card p-3 mb-3 bg-light border-0">
            <div class="d-flex flex-column gap-2 fs-sm">
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span>Vendas Brutas (Canais Web, PDV e App):</span>
                <strong class="text-success">${br(comp.grossSales)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-danger">(-) Estornos de ingressos cancelados:</span>
                <strong class="text-danger">- ${br(comp.refunds)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-danger">(-) Chargebacks e contestações:</span>
                <strong class="text-danger">- ${br(comp.chargebacks)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-danger">(-) Taxas contratuais Disk Ingressos:</span>
                <strong class="text-danger">- ${br(comp.diskFees)}</strong>
              </div>
              <div class="d-flex justify-content-between py-2 border-bottom bg-white px-2 rounded">
                <span class="fw-bold text-dark">(=) Receita Líquida do Produtor:</span>
                <strong class="text-primary fs-md">${br(comp.netRevenue)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">(-) Repasses já realizados e creditados em conta:</span>
                <strong class="text-muted">- ${br(comp.payoutsDone)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-warning">(-) Reservas em análise / assinatura de repasses:</span>
                <strong class="text-warning">- ${br(comp.reservedBalance)}</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-danger">(-) Retenções operacionais e contratuais:</span>
                <strong class="text-danger">- ${br(comp.retentionsBalance)}</strong>
              </div>
              <div class="d-flex justify-content-between py-2 mt-2 bg-success text-white px-3 rounded align-items-center">
                <span class="fw-bold" style="font-size: 1rem;">(=) Saldo Disponível para Repasse Imediato:</span>
                <strong style="font-size: 1.3rem;">${br(comp.availableBalance)}</strong>
              </div>
            </div>
          </div>

          <div class="info-banner info-banner-blue mb-0">
            <i class="ph-info"></i>
            <div>
              <strong>Segregação entre Ambientes:</strong> Esta composição reflete exclusivamente os termos comerciais do seu contrato de produção. Custos bancários internos de adquirentes e spread de plataforma pertencem à gestão interna da Disk Ingressos.
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
          <button type="button" class="btn btn-success" onclick="window.app.closeModal(); window.app.openPayoutModal()">
            Solicitar Repasse Agora
          </button>
        </div>
      </div>
    `);
  }

  openRepasseTimelineModal(repasseId) {
    const st = financialStore.getState();
    const item = (st.data.approvalQueue && st.data.approvalQueue.find(a => a.id === repasseId)) || {
      id: repasseId || 'REP-2026-00128',
      type: 'Repasse',
      eventName: 'Festival Curitiba 2026',
      requestedAmount: 50000.00,
      requestDate: '30/09/2026 09:32',
      status: 'Em análise',
      bankName: 'Itaú Unibanco (341)',
      bankAccount: 'Ag 0432 • C/C 48291-0',
      pixKey: '14.829.301/0001-92 (CNPJ)'
    };
    const br = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const isPaid = item.status === 'Pago';
    const isAnalyzing = item.status.includes('análise') || item.status === 'Pendente';
    const isApproved = ['Aprovado', 'Documento formalizado', 'Programado', 'Pago'].includes(item.status);
    const prodSigned = item.signatures?.producer?.signed || isPaid;
    const diskSigned = item.signatures?.disk?.signed || isPaid;
    const isScheduled = ['Programado', 'Pago'].includes(item.status);

    const steps = [
      { step: 1, title: 'Solicitado pelo Produtor', status: 'done', actor: 'João Silva (Produtor)', time: '30/09 09:32', detail: `Protocolo ${item.id} criado no valor de ${br(item.requestedAmount || item.amount)}` },
      { step: 2, title: 'Recebido pelo Financeiro Disk', status: 'done', actor: 'Sistema Disk', time: '30/09 09:32', detail: 'Fila de aprovação notificada com reserva temporária de saldo' },
      { step: 3, title: 'Em análise', status: isAnalyzing ? 'current' : 'done', actor: 'Karine (Financeiro Disk)', time: isAnalyzing ? 'Em andamento' : '30/09 10:15', detail: 'Conferência de adimplência, saldo elegível e histórico do evento' },
      { step: 4, title: 'Aprovação Alçada Financeira', status: isApproved ? 'done' : 'pending', actor: 'Karine (Alçada Disk)', time: isApproved ? 'Aprovado' : 'Pendente', detail: 'Autorização com base na alçada de valor e governança Maker/Checker' },
      { step: 5, title: 'Assinatura do Produtor', status: prodSigned ? 'done' : (item.status.includes('Produtor') ? 'current' : 'pending'), actor: 'João Silva', time: prodSigned ? 'Assinado' : 'Aguardando', detail: 'Assinatura digital ICP-Brasil / Autentique do termo de liberação' },
      { step: 6, title: 'Assinatura Financeiro Disk', status: diskSigned ? 'done' : 'pending', actor: 'Karine (Adm Financeiro)', time: diskSigned ? 'Assinado' : 'Trava ativa', detail: 'Assinatura sequencial final após confirmação do produtor' },
      { step: 7, title: 'Programação de Tesouraria', status: isScheduled ? 'done' : 'pending', actor: 'Tesouraria Disk', time: isScheduled ? 'Em lote CNAB' : 'Fila', detail: 'Geração de lote CNAB 240 / Lote PIX bancário' },
      { step: 8, title: 'Pagamento & Conciliação', status: isPaid ? 'done' : 'pending', actor: 'Banco do Brasil / Itaú', time: isPaid ? 'Liquidado' : 'Aguardando retorno', detail: 'Liquidação com retorno bancário (.RET) e conciliação contábil' }
    ];

    this.showModal(`
      <div class="modal-card" style="max-width: 700px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Linha do Tempo do Repasse: ${item.id}</h4>
            <div class="text-muted fs-sm">Evento: <strong>${item.eventName}</strong> · Valor: <strong class="text-primary">${br(item.requestedAmount || item.amount)}</strong></div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="card p-3 mb-3 bg-light border-0">
            <div class="row g-2 fs-sm">
              <div class="col-6">
                <span class="text-muted">Conta de Destino:</span>
                <strong class="d-block">${item.bankName}</strong>
                <span class="text-muted fs-xs">${item.bankAccount}</span>
              </div>
              <div class="col-6">
                <span class="text-muted">Chave PIX:</span>
                <strong class="d-block text-primary">${item.pixKey}</strong>
                <span class="text-muted fs-xs">Favorecido: ${item.producerName || 'Produtora ABC Ltda.'}</span>
              </div>
            </div>
          </div>

          <h6 class="fw-bold mb-3">Evolução do Fluxo Operacional:</h6>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${steps.map(s => {
              const isDone = s.status === 'done';
              const isCur = s.status === 'current';
              const icon = isDone ? '✓' : (isCur ? '●' : '○');
              const color = isDone ? '#10b981' : (isCur ? '#f59e0b' : '#94a3b8');
              const bg = isCur ? '#fffbeb' : (isDone ? '#f0fdf4' : '#ffffff');

              return `
                <div class="p-3 border rounded d-flex align-items-start gap-3" style="background: ${bg}; border-left: 4px solid ${color} !important;">
                  <div style="font-size: 1.1rem; font-weight: 800; color: ${color}; width: 24px; text-align: center;">
                    ${icon}
                  </div>
                  <div style="flex: 1;">
                    <div class="d-flex justify-content-between align-items-center">
                      <strong style="color: var(--text-main); font-size: 0.9rem;">${s.step}. ${s.title}</strong>
                      <span class="badge ${isDone ? 'badge-success' : (isCur ? 'badge-warning' : 'badge-light')} fs-xxs">
                        ${s.time}
                      </span>
                    </div>
                    <div class="text-muted fs-xs mt-1">
                      <strong>Responsável:</strong> ${s.actor} • ${s.detail}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="info-banner info-banner-blue mt-3 mb-0">
            <i class="ph-shield-check"></i>
            <div>
              <strong>Rastreabilidade Total:</strong> Todas as movimentações deste protocolo são auditadas e registradas na Central de Formalização da Disk Ingressos.
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
          ${item.status === 'Aguardando assinatura do Produtor' ? `
            <button type="button" class="btn btn-success" onclick="window.app.closeModal(); window.app.openSignDocumentModal('${item.id}')">
              ✍️ Assinar Documento Agora
            </button>
          ` : ''}
        </div>
      </div>
    `);
  }

  openRequestBankChangeModal(accountId = '') {
    const st = financialStore.getState();
    const producer = st.activeProducer || st.data.producer;
    const currentAcc = accountId ? producer.bankAccounts?.find(b => b.id === accountId) : producer.bankAccounts?.find(b => b.isDefault) || producer.bankAccounts?.[0];

    this.showModal(`
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Solicitar Alteração de Conta Bancária</h4>
            <div class="text-muted fs-sm">A nova conta gerará uma nova versão (v2) sob validação pelo Financeiro Disk</div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form class="modal-body p-4" onsubmit="window.app.submitProducerBankChange(event, '${currentAcc ? currentAcc.id : ''}')">
          <div class="alert alert-warning mb-3">
            <i class="ph-shield-warning"></i>
            <div>
              <strong>Regra de Continuidade Operacional:</strong> Ao solicitar uma nova conta, sua conta bancária atual <strong>permanece ativa</strong> até que o Financeiro Disk valide o comprovante anexado. Não há risco de repasses serem bloqueados silenciosamente.
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-7">
              <label class="form-label fw-bold">Titular da Conta *</label>
              <input type="text" name="holderName" class="form-control" required value="${currentAcc ? currentAcc.holderName : producer.name}">
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">CNPJ Homologado *</label>
              <input type="text" name="cnpj" class="form-control" readonly value="${producer.cnpj}">
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-bold">Banco de Destino *</label>
              <select name="bankName" class="form-select" required>
                <option value="Itaú Unibanco (341)" ${currentAcc && currentAcc.bankName.includes('341') ? 'selected' : ''}>Itaú Unibanco (341)</option>
                <option value="Banco Bradesco (237)" ${currentAcc && currentAcc.bankName.includes('237') ? 'selected' : ''}>Banco Bradesco (237)</option>
                <option value="Banco do Brasil (001)" ${currentAcc && currentAcc.bankName.includes('001') ? 'selected' : ''}>Banco do Brasil (001)</option>
                <option value="Santander Brasil (033)" ${currentAcc && currentAcc.bankName.includes('033') ? 'selected' : ''}>Santander Brasil (033)</option>
                <option value="Caixa Econômica (104)">Caixa Econômica (104)</option>
                <option value="Nu Pagamentos / Nubank (260)">Nu Pagamentos / Nubank (260)</option>
                <option value="Banco Inter (077)">Banco Inter (077)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold">Tipo da Conta *</label>
              <select name="accountType" class="form-select" required>
                <option value="Conta Corrente PJ" selected>Conta Corrente PJ</option>
                <option value="Conta Poupança PJ">Conta Poupança PJ</option>
                <option value="Conta de Pagamento PJ">Conta de Pagamento PJ</option>
              </select>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-4">
              <label class="form-label fw-bold">Agência *</label>
              <input type="text" name="agency" class="form-control" required value="${currentAcc ? currentAcc.agency : ''}" placeholder="Ex: 0432" maxlength="6">
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">Conta Corrente *</label>
              <input type="text" name="accountNumber" class="form-control" required value="${currentAcc ? currentAcc.accountNumber.split('-')[0] : ''}" placeholder="Ex: 48291">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold">Dígito *</label>
              <input type="text" name="digit" class="form-control" required value="${currentAcc ? (currentAcc.digit || (currentAcc.accountNumber.includes('-') ? currentAcc.accountNumber.split('-')[1] : '0')) : '0'}" maxlength="2">
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col-md-7">
              <label class="form-label fw-bold">Chave PIX</label>
              <input type="text" name="pixKey" class="form-control" value="${currentAcc ? currentAcc.pixKey : producer.cnpj}" placeholder="Chave vinculada ao CNPJ">
            </div>
            <div class="col-md-5">
              <label class="form-label fw-bold">Tipo da Chave</label>
              <select name="pixType" class="form-select">
                <option value="CNPJ" selected>CNPJ</option>
                <option value="E-mail">E-mail</option>
                <option value="Telefone">Telefone</option>
                <option value="Aleatória">Chave Aleatória (EVP)</option>
              </select>
            </div>
          </div>

          <div class="p-3 border rounded bg-light mb-3">
            <label class="form-label fw-bold mb-1">Comprovante de Titularidade Bancária (PDF / Imagem) *</label>
            <div class="row g-2">
              <div class="col-md-6">
                <select name="documentType" class="form-select form-select-sm">
                  <option value="Comprovante de domicílio bancário">Comprovante de domicílio bancário</option>
                  <option value="Extrato com cabeçalho">Extrato com cabeçalho de titularidade</option>
                  <option value="Cartão CNPJ e Termo">Cartão CNPJ e Contrato</option>
                </select>
              </div>
              <div class="col-md-6">
                <input type="file" name="documentFile" class="form-control form-control-sm" onchange="document.getElementById('bankDoc_name').value = this.files[0] ? this.files[0].name : ''">
                <input type="hidden" name="documentName" id="bankDoc_name" value="comprovante_bancario_novo.pdf">
              </div>
            </div>
            <div class="form-text fs-xs mt-1">O documento deve comprovar a titularidade sob o mesmo CNPJ cadastrado.</div>
          </div>

          <div class="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">
              <i class="ph-paper-plane-tilt"></i> Enviar para Homologação
            </button>
          </div>
        </form>
      </div>
    `);
  }

  submitProducerBankChange(ev, accountId = '') {
    ev.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(ev.target).entries());
      const st = financialStore.getState();
      const producer = st.activeProducer || st.data.producer;
      const targetAccId = accountId || producer.bankAccounts?.[0]?.id;

      if (!targetAccId) throw new Error('Conta bancária de referência não localizada.');

      financialStore.updateProducerBankAccountVersion(producer.id, targetAccId, f);
      this.closeModal();
      this.render();
    } catch (e) {
      financialStore.showToast('Erro ao solicitar alteração', e.message, 'danger');
    }
  }

  openBankAccountHistoryModal(accountId) {
    const st = financialStore.getState();
    const producer = st.activeProducer || st.data.producer;
    const account = producer.bankAccounts?.find(b => b.id === accountId) || producer.bankAccounts?.[0];
    if (!account) return;

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">Histórico de Versões: ${account.bankName}</h4>
            <div class="text-muted fs-sm">Agência: ${account.agency} · Conta: ${account.accountNumber} · Versão Atual: <strong>v${account.version || 1}</strong></div>
          </div>
          <button class="modal-close-btn" onclick="window.app.closeModal()">&times;</button>
        </div>
        <div class="modal-body p-4">
          <div class="timeline p-2">
            <div class="p-3 border rounded mb-2 bg-light">
              <div class="d-flex justify-content-between">
                <strong>Versão v${account.version || 1} (${account.status})</strong>
                <span class="text-muted fs-xs">${account.createdAt || account.validatedAt || '15/01/2025'}</span>
              </div>
              <div class="fs-sm text-muted mt-1">
                Agência: ${account.agency} • Conta: ${account.accountNumber} • Chave PIX: ${account.pixKey || 'CNPJ'}
              </div>
              <div class="fs-xs text-primary mt-1">
                <i class="ph-file-check"></i> Documento: ${account.documents?.[0]?.name || 'comprovante_bancario.pdf'}
              </div>
            </div>

            ${account.replacesAccountId ? `
              <div class="p-3 border rounded mb-2 bg-white">
                <div class="d-flex justify-content-between">
                  <strong class="text-muted">Versão v1 (Inativa por Substituição)</strong>
                  <span class="text-muted fs-xs">Homologada em 15/01/2025</span>
                </div>
                <div class="fs-sm text-muted mt-1">
                  Conta original preservada no rastro contábil de repasses anteriores.
                </div>
              </div>
            ` : ''}
          </div>

          <div class="info-banner info-banner-blue mt-3 mb-0">
            <i class="ph-shield-check"></i>
            <div>
              <strong>Imutabilidade e Compliance:</strong> Contas bancárias antigas nunca são apagadas, garantindo que qualquer repasse do passado possua comprovação da conta onde foi depositado.
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-outline-secondary" onclick="window.app.closeModal()">Fechar</button>
        </div>
      </div>
    `);
  }

  setAccountAsDefault(accountId) {
    try {
      const st = financialStore.getState();
      const producer = st.activeProducer || st.data.producer;
      financialStore.setProducerDefaultBankAccount(producer.id, accountId);
      this.render();
    } catch (e) {
      financialStore.showToast('Ação Não Permitida', e.message, 'warning');
    }
  }

  onSelectProducer(producerId) {
    financialStore.setSelectedProducer(producerId);
  }

  openGrantCreditModal(producerId) {
    const st = financialStore.getState();
    const pid = producerId || st.selectedProducerId || 'prod-abc';
    const producer = (st.data.producers || []).find(p => p.id === pid) || st.data.producers[0];
    const events = (st.data.events || []).filter(e => e.producerId === producer.id);

    if (events.length === 0) {
      financialStore.showToast('Aviso', 'Nenhum evento vinculado a este produtor para concessão de crédito.', 'warning');
      return;
    }

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3">
          <div>
            <h4 class="mb-0 fw-bold"><i class="ph-credit-card me-2"></i>Conceder Crédito / Antecipação</h4>
            <div class="fs-xs text-light opacity-75">Produtor: ${producer.name} (${producer.cnpj || producer.id})</div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form onsubmit="window.app.handleGrantCreditSubmit(event)">
          <input type="hidden" name="producerId" value="${producer.id}">
          <div class="modal-body p-4">
            <div class="alert alert-info py-2 px-3 fs-xs mb-3">
              <i class="ph-info me-1"></i> Crédito concedido pela mesa do Financeiro Disk. Lançamento formal no ledger interno com modelo de amortização e taxa de juros parametrizável.
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Evento Vinculado:</label>
              <select name="eventId" class="form-select form-select-sm" required>
                ${events.map(ev => `
                  <option value="${ev.id}">
                    ${ev.name} (Vendas: ${formatCurrency(ev.grossSales || 0)} | Disp: ${formatCurrency(ev.availableBalance || 0)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Valor Principal (R$):</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">R$</span>
                  <input type="number" step="0.01" min="100" name="principal" class="form-control" placeholder="50.000,00" required>
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold fs-sm">Taxa de Juros:</label>
                <div class="input-group input-group-sm">
                  <input type="number" step="0.1" min="0" max="20" name="interestRate" class="form-control" value="2.0" required>
                  <span class="input-group-text">% a.m.</span>
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold fs-sm">Nº Parcelas:</label>
                <input type="number" min="1" max="24" name="installments" class="form-control form-control-sm" value="5" required>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold fs-sm">Modelo de Amortização:</label>
                <select name="amortizationModel" class="form-select form-select-sm">
                  <option value="PARCELAS_FIXAS">Parcelas Fixas Mensais / Quinzenais</option>
                  <option value="PERCENTUAL_RECEBIVEIS">Retenção de % das Vendas de Bilheteria</option>
                  <option value="FECHAMENTO_EVENTO">Liquidação Integral no Fechamento do Evento</option>
                </select>
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold fs-sm">% Retenção de Vendas:</label>
                <div class="input-group input-group-sm">
                  <input type="number" step="1" min="0" max="100" name="receivablePercent" class="form-control" value="15">
                  <span class="input-group-text">%</span>
                </div>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Referência Contratual:</label>
                <input type="text" name="contractRef" class="form-control form-control-sm" placeholder="Ex: CTR-2026/04 ou ADIT-02">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Primeiro Vencimento:</label>
                <input type="date" name="firstDueDate" class="form-control form-control-sm">
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Justificativa Operacional da Concessão (mín. 5 chars):</label>
              <textarea name="notes" class="form-control form-control-sm" rows="2" placeholder="Ex: Antecipação para montagem de infraestrutura de palco conforme aditivo contratual..." required minlength="5"></textarea>
            </div>
          </div>
          <div class="modal-footer d-flex justify-content-between p-3 bg-light">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm px-3 fw-bold">
              <i class="ph-check me-1"></i> Efetivar Concessão de Crédito
            </button>
          </div>
        </form>
      </div>
    `);
  }

  handleGrantCreditSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
      producerId: formData.get('producerId'),
      eventId: formData.get('eventId'),
      principal: parseFloat(formData.get('principal')),
      interestRate: parseFloat(formData.get('interestRate')) || 0,
      installments: parseInt(formData.get('installments')) || 1,
      amortizationModel: formData.get('amortizationModel'),
      receivablePercent: parseFloat(formData.get('receivablePercent')) || 0,
      contractRef: formData.get('contractRef') || '',
      firstDueDate: formData.get('firstDueDate') || null,
      notes: formData.get('notes')
    };

    const res = financialStore.grantProducerCredit(data);
    if (res) {
      this.closeModal();
      this.render();
    }
  }

  openAccountBlockModal(producerId, eventId = null) {
    const st = financialStore.getState();
    const pid = producerId || st.selectedProducerId || 'prod-abc';
    const producer = (st.data.producers || []).find(p => p.id === pid) || st.data.producers[0];
    const events = (st.data.events || []).filter(e => e.producerId === producer.id);

    if (events.length === 0) {
      financialStore.showToast('Aviso', 'Nenhum evento vinculado a este produtor.', 'warning');
      return;
    }

    const selectedEvt = eventId ? events.find(e => e.id === eventId) || events[0] : events[0];

    this.showModal(`
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-danger text-white p-3">
          <div>
            <h4 class="mb-0 fw-bold"><i class="ph-lock-simple me-2"></i>Trava de Saldo / Retenção Cautelar</h4>
            <div class="fs-xs text-light opacity-75">Produtor: ${producer.name} (${producer.cnpj || producer.id})</div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form onsubmit="window.app.handleAccountBlockSubmit(event)">
          <input type="hidden" name="producerId" value="${producer.id}">
          <div class="modal-body p-4">
            <div class="alert alert-warning py-2 px-3 fs-xs mb-3">
              <i class="ph-shield-warning me-1"></i> O saldo bloqueado ou retido é imediatamente deduzido do limite de repasse do produtor no ledger central.
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Evento de Origem:</label>
              <select name="eventId" class="form-select form-select-sm" required>
                ${events.map(ev => `
                  <option value="${ev.id}" ${ev.id === selectedEvt.id ? 'selected' : ''}>
                    ${ev.name} (Disponível: ${formatCurrency(ev.availableBalance || 0)} | Bloq/Ret: ${formatCurrency((ev.blockedBalance || 0) + (ev.retainedBalance || 0))})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Tipo de Operação:</label>
                <select name="type" class="form-select form-select-sm" required>
                  <option value="BLOQUEIO">🔒 Bloqueio Cautelar / Risco</option>
                  <option value="RETENCAO">⚖️ Retenção Administrativa / Judicial</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Valor a Bloquear (R$):</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">R$</span>
                  <input type="number" step="0.01" min="1" name="amount" class="form-control" placeholder="10.000,00" required>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Justificativa Formal Obrigatória (mín. 5 chars):</label>
              <textarea name="reason" class="form-control form-control-sm" rows="3" placeholder="Ex: Bloqueio cautelar de segurança preventiva devido a contestação de ingressos em lote..." required minlength="5"></textarea>
            </div>
          </div>
          <div class="modal-footer d-flex justify-content-between p-3 bg-light">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-danger btn-sm px-3 fw-bold">
              <i class="ph-lock me-1"></i> Confirmar Bloqueio no Ledger
            </button>
          </div>
        </form>
      </div>
    `);
  }

  handleAccountBlockSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
      producerId: formData.get('producerId'),
      eventId: formData.get('eventId'),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type') || 'BLOQUEIO',
      reason: formData.get('reason')
    };

    const res = financialStore.blockAccountBalance(data);
    if (res) {
      this.closeModal();
      this.render();
    }
  }

  handleReleaseAccountBalance(producerId, eventId, amount) {
    const reason = prompt(`Confirma a liberação do saldo bloqueado/retido de ${formatCurrency(amount)} no evento?\n\nDigite a justificativa formal de liberação (mínimo 5 caracteres):`, 'Liberação após conferência e regularização das pendências');
    if (!reason) return;
    if (reason.trim().length < 5) {
      financialStore.showToast('Erro de Validação', 'A justificativa de liberação deve ter pelo menos 5 caracteres.', 'warning');
      return;
    }

    const res = financialStore.releaseAccountBalance({
      producerId,
      eventId,
      amount,
      reason: reason.trim()
    });
    if (res) {
      this.render();
    }
  }

  handleAmortizeCredit(creditId) {
    const st = financialStore.getState();
    const credit = (st.data.producerCredits || []).find(c => c.id === creditId || c.protocol === creditId);
    if (!credit) {
      financialStore.showToast('Erro', 'Contrato de crédito não encontrado.', 'warning');
      return;
    }

    const defaultVal = credit.installmentValue || Math.min(10000, credit.outstandingDebt);
    const valStr = prompt(`Amortizar Parcela do Contrato ${credit.protocol}\nSaldo Devedor Atual: ${formatCurrency(credit.outstandingDebt)}\nValor sugerido da parcela: ${formatCurrency(defaultVal)}\n\nInforme o valor a amortizar (R$):`, defaultVal);
    if (!valStr) return;

    const val = parseFloat(valStr.replace(',', '.'));
    if (!val || val <= 0) {
      financialStore.showToast('Valor Inválido', 'Informe um valor numérico positivo para amortização.', 'warning');
      return;
    }

    const res = financialStore.amortizeProducerCredit({
      creditId,
      amount: val,
      type: 'PARCELA_FIXA',
      notes: 'Abatimento regular efetuado via mesa de controle.'
    });
    if (res) {
      this.render();
    }
  }

  // ==========================================================================
  // PACOTE 24 / V0.3: MODAIS DE OBRIGAÇÕES E ESTORNOS INTERNOS
  // ==========================================================================

  openNewObligationModal(producerId, eventId = null) {
    const st = financialStore.getState();
    const pid = producerId || st.selectedProducerId || 'prod-abc';
    const producer = (st.data.producers || []).find(p => p.id === pid) || st.data.producers[0];
    const events = (st.data.events || []).filter(e => e.producerId === producer.id);

    if (events.length === 0) {
      financialStore.showToast('Aviso', 'Nenhum evento vinculado a este produtor.', 'warning');
      return;
    }
    const selectedEvt = eventId ? events.find(e => e.id === eventId) || events[0] : events[0];

    this.showModal(`
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3">
          <div>
            <h4 class="mb-0 fw-bold"><i class="ph-calendar-check me-2"></i>Nova Obrigação / Reserva do Evento</h4>
            <div class="fs-xs text-light opacity-75">Produtor: ${producer.name} (${producer.cnpj || producer.id}) · Exclusivo Disk</div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form onsubmit="window.app.handleCreateObligationSubmit(event)">
          <input type="hidden" name="producerId" value="${producer.id}">
          <div class="modal-body p-4">
            <div class="alert alert-info py-2 px-3 fs-xs mb-3">
              <i class="ph-info me-1"></i> As reservas de obrigações (aluguel de espaço, ECAD, fornecedores, etc.) abatem imediatamente da base de repasse e <strong>não são visíveis para o produtor</strong>.
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Evento Vinculado:</label>
              <select name="eventId" class="form-select form-select-sm" required>
                ${events.map(ev => `
                  <option value="${ev.id}" ${ev.id === selectedEvt.id ? 'selected' : ''}>
                    ${ev.name} (Vendas: ${formatCurrency(ev.grossSales || 0)} | Disp: ${formatCurrency(ev.availableBalance || 0)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Categoria da Obrigação:</label>
                <select name="category" class="form-select form-select-sm" required>
                  <option value="ALUGUEL_ESPACO">🎭 Aluguel de Espaço / Teatro / Arena</option>
                  <option value="ECAD">🎵 Direitos Autorais / ECAD</option>
                  <option value="FORNECEDOR">📦 Fornecedor / Infraestrutura / Rider</option>
                  <option value="OPERACIONAL">🛡️ Segurança, Brigada e Operacional</option>
                  <option value="CONTINGENCIA">⚠️ Contingência / Reserva Preventiva</option>
                  <option value="OUTROS">📋 Outras Obrigações Contratuais</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Valor da Reserva (R$):</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">R$</span>
                  <input type="number" step="0.01" min="1" name="value" class="form-control" placeholder="50.000,00" required>
                </div>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-7">
                <label class="form-label fw-bold fs-sm">Favorecido / Beneficiário / Credor:</label>
                <input type="text" name="beneficiary" class="form-control form-control-sm" placeholder="Ex: Teatro Positivo Ltda." required>
              </div>
              <div class="col-md-5">
                <label class="form-label fw-bold fs-sm">Vencimento Previsto:</label>
                <input type="date" name="dueDate" class="form-control form-control-sm">
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Descrição Detalhada:</label>
              <input type="text" name="description" class="form-control form-control-sm" placeholder="Ex: Locação do salão nobre e taxas de limpeza do teatro" required minlength="3">
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Documento / Contrato / Anexo:</label>
                <input type="text" name="documentRef" class="form-control form-control-sm" placeholder="Ex: Contrato 2026/04 ou OS-8821">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Status Inicial:</label>
                <select name="status" class="form-select form-select-sm">
                  <option value="RESERVADO" selected>RESERVADO (Dedução imediata de repasse)</option>
                  <option value="RETIDO">RETIDO (Retenção formal)</option>
                  <option value="PREVISTO">PREVISTO (Planejamento futuro)</option>
                </select>
              </div>
            </div>

            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" name="reserveNow" id="obReserveNow" value="1" checked>
              <label class="form-check-label fw-bold fs-sm" for="obReserveNow">
                Reservar valor agora no Ledger (deduzir imediatamente da base de repasse)
              </label>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Observações da Mesa:</label>
              <textarea name="notes" class="form-control form-control-sm" rows="2" placeholder="Observações internas da auditoria Disk..."></textarea>
            </div>
          </div>
          <div class="modal-footer d-flex justify-content-between p-3 bg-light">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm px-3 fw-bold">
              <i class="ph-check me-1"></i> Cadastrar Obrigação &amp; Salvar
            </button>
          </div>
        </form>
      </div>
    `);
  }

  handleCreateObligationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const reserveNow = formData.get('reserveNow') === '1';
    const data = {
      eventId: formData.get('eventId'),
      category: formData.get('category'),
      description: formData.get('description'),
      beneficiary: formData.get('beneficiary'),
      value: parseFloat(formData.get('value')),
      dueDate: formData.get('dueDate'),
      documentRef: formData.get('documentRef'),
      status: formData.get('status') || 'RESERVADO',
      reserveNow,
      notes: formData.get('notes')
    };

    const res = financialStore.createEventObligation(data);
    if (res) {
      this.closeModal();
      this.render();
    }
  }

  handleUpdateObligationStatus(obligationId, newStatus) {
    const actionLabel = newStatus === 'LIQUIDADO' ? 'pagamento e liquidação definitiva' : `transição para ${newStatus}`;
    const reason = prompt(`Confirma a ${actionLabel} da obrigação?\nDigite observações complementares (opcional):`, `Atualização via mesa operacional para ${newStatus}`);
    if (reason === null) return;

    const res = financialStore.updateEventObligationStatus({
      obligationId,
      status: newStatus,
      notes: reason.trim()
    });
    if (res) {
      this.render();
    }
  }

  openInternalRefundModal(producerId, eventId = null) {
    const st = financialStore.getState();
    const pid = producerId || st.selectedProducerId || 'prod-abc';
    const producer = (st.data.producers || []).find(p => p.id === pid) || st.data.producers[0];
    const events = (st.data.events || []).filter(e => e.producerId === producer.id);

    if (events.length === 0) {
      financialStore.showToast('Aviso', 'Nenhum evento vinculado a este produtor.', 'warning');
      return;
    }
    const selectedEvt = eventId ? events.find(e => e.id === eventId) || events[0] : events[0];

    this.showModal(`
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-danger text-white p-3">
          <div>
            <h4 class="mb-0 fw-bold"><i class="ph-arrow-u-up-left me-2"></i>Abrir Estorno Interno (Reserva Imediata)</h4>
            <div class="fs-xs text-light opacity-75">Produtor: ${producer.name} · Exclusivo Financeiro Disk</div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>
        <form onsubmit="window.app.handleInternalRefundSubmit(event)">
          <input type="hidden" name="producerId" value="${producer.id}">
          <div class="modal-body p-4">
            <div class="alert alert-danger py-2 px-3 fs-xs mb-3">
              <i class="ph-shield-warning me-1"></i> <strong>Regra de Segurança Estrita:</strong> Ao abrir o estorno, o valor é <strong>imediatamente reservado</strong>, impedindo que o montante seja repassado. A efetivação exige <strong>dupla autorização de dois operadores distintos</strong> do Financeiro Disk.
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Evento de Origem do Pedido:</label>
              <select name="eventId" class="form-select form-select-sm" required>
                ${events.map(ev => `
                  <option value="${ev.id}" ${ev.id === selectedEvt.id ? 'selected' : ''}>
                    ${ev.name} (Disponível: ${formatCurrency(ev.availableBalance || 0)})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Nº do Pedido / Ingresso:</label>
                <input type="text" name="orderId" class="form-control form-control-sm" placeholder="Ex: PED-98421" required>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold fs-sm">Valor do Estorno (R$):</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text">R$</span>
                  <input type="number" step="0.01" min="1" name="value" class="form-control" placeholder="250,00" required>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold fs-sm">Justificativa Formal Obrigatória (mínimo 5 caracteres):</label>
              <textarea name="reason" class="form-control form-control-sm" rows="3" placeholder="Ex: Cancelamento no prazo do Art. 49 do CDC solicitado pelo cliente via SAC..." required minlength="5"></textarea>
            </div>
          </div>
          <div class="modal-footer d-flex justify-content-between p-3 bg-light">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-danger btn-sm px-3 fw-bold">
              <i class="ph-lock me-1"></i> Abrir Estorno &amp; Reservar Saldo
            </button>
          </div>
        </form>
      </div>
    `);
  }

  handleInternalRefundSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
      eventId: formData.get('eventId'),
      orderId: formData.get('orderId'),
      value: parseFloat(formData.get('value')),
      reason: formData.get('reason')
    };

    const res = financialStore.openInternalRefund(data);
    if (res) {
      this.closeModal();
      this.render();
    }
  }

  handleAuthorizeRefund(refundId) {
    const factor = prompt("Reautenticação Obrigatória para Autorização (MFA/2FA):\n\nDigite o código de verificação ou confirme o fator de segurança:", "MFA_TOKEN_CONFIRMADO");
    if (!factor) return;

    const res = financialStore.authorizeInternalRefund({
      refundId,
      factor: factor.trim(),
      notes: "Autorização validada no painel de controle Disk"
    });
    if (res) {
      this.render();
    }
  }

  handleExecuteRefund(refundId) {
    if (!confirm("Confirmar a efetivação e liquidação definitiva do estorno no gateway e no ledger?")) {
      return;
    }
    const res = financialStore.executeInternalRefund({ refundId });
    if (res) {
      this.render();
    }
  }

  handleCancelRefund(refundId) {
    const reason = prompt("Justificativa formal para o cancelamento do estorno e liberação do saldo retido (mínimo 5 caracteres):", "Solicitação cancelada após conferência documental");
    if (!reason) return;
    if (reason.trim().length < 5) {
      financialStore.showToast("Validação", "A justificativa de cancelamento deve ter pelo menos 5 caracteres.", "warning");
      return;
    }

    const res = financialStore.cancelInternalRefund({
      refundId,
      reason: reason.trim()
    });
    if (res) {
      this.render();
    }
  }

  handleRejectRefund(refundId) {
    const reason = prompt("Justificativa formal para a rejeição do estorno e liberação imediata da reserva (mínimo 5 caracteres):", "Estorno rejeitado após análise técnica e documental");
    if (!reason) return;
    if (reason.trim().length < 5) {
      financialStore.showToast("Validação", "A justificativa de rejeição deve ter pelo menos 5 caracteres.", "warning");
      return;
    }

    const res = financialStore.rejectInternalRefund({
      refundId,
      reason: reason.trim()
    });
    if (res) {
      this.render();
    }
  }

  handleRegisterRevenue(eventId) {
    const valStr = prompt("Valor da nova receita de bilheteria a ser registrada (R$):", "50000.00");
    if (!valStr) return;
    const amount = parseFloat(valStr.replace(',', '.'));
    if (!amount || amount <= 0) {
      financialStore.showToast("Validação", "Informe um valor positivo para a receita.", "warning");
      return;
    }

    const res = financialStore.registerEventRevenue({
      eventId,
      amount,
      reason: "Entrada de vendas de bilheteria registrada na mesa Disk"
    });
    if (res) {
      this.render();
    }
  }

  // ==========================================================================
  // V0.4: VISUALIZAR TODA A MOVIMENTAÇÃO DO EVENTO (DRILLDOWN COMPLETO)
  // ==========================================================================
  openEventMovementModal(eventId) {
    const st = financialStore.getState();
    const event = (st.data.events || []).find(e => e.id === eventId);
    if (!event) {
      financialStore.showToast('Erro', 'Evento não encontrado.', 'error');
      return;
    }

    const producer = (st.data.producers || []).find(p => p.id === event.producerId) || { name: 'Produtora Geral' };
    const elig = financialStore.calculatePayoutEligibility(eventId);
    const obligations = (st.eventObligations || []).filter(o => o.eventId === eventId);
    const refunds = (st.internalRefunds || []).filter(r => r.eventId === eventId);
    const credits = (st.data.producerCredits || []).filter(c => c.eventId === eventId);
    const ledger = (st.data.ledgerEntries || []).filter(l => l.eventId === eventId);

    const progress = elig.progressPercent || 0;
    const ruleMet = elig.ruleMet || elig.isExceptional;

    this.showModal(`
      <div class="modal-card" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header d-flex justify-content-between align-items-center bg-dark text-white p-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge bg-primary text-white text-uppercase" style="font-size: 10px;">Movimentação Contábil do Evento</span>
              <span class="badge bg-danger text-white text-uppercase" style="font-size: 10px;">Exclusivo Disk</span>
            </div>
            <h4 class="mb-0 fw-bold">${event.name} (${event.id})</h4>
            <div class="fs-xs text-light opacity-75">Produtor: ${producer.name} · Cidade: ${event.city || 'Curitiba'}</div>
          </div>
          <button class="modal-close-btn text-white" onclick="window.app.closeModal()">&times;</button>
        </div>

        <div class="modal-body p-4 bg-white">
          <!-- Cards de Resumo do Evento -->
          <div class="row g-2 mb-4">
            <div class="col-md-3">
              <div class="p-3 border rounded bg-light text-center">
                <span class="fs-xxs fw-bold text-muted text-uppercase d-block">Vendas Apuradas</span>
                <strong class="fs-sm text-dark">${formatCurrency(event.grossSales || 0)}</strong>
                <div class="fs-xxs text-muted mt-1">Meta: ${formatCurrency(event.salesTarget || 1000000)} (${progress.toFixed(1)}%)</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 border rounded bg-light text-center">
                <span class="fs-xxs fw-bold text-muted text-uppercase d-block">Limite Bruto (20%)</span>
                <strong class="fs-sm text-primary">${formatCurrency(elig.grossLimit || 0)}</strong>
                <div class="fs-xxs ${ruleMet ? 'text-success' : 'text-warning'} mt-1">${ruleMet ? '✓ Habilitado' : 'Aguardando 50%'}</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 border rounded bg-light text-center">
                <span class="fs-xxs fw-bold text-muted text-uppercase d-block">(-) Deduções &amp; Reservas</span>
                <strong class="fs-sm text-danger">-${formatCurrency((elig.totalDeductions || 0))}</strong>
                <div class="fs-xxs text-danger mt-1">Obrig: ${formatCurrency(elig.obligationsHold || 0)} · Est: ${formatCurrency(elig.refundsHold || 0)}</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="p-3 border rounded bg-primary bg-opacity-10 text-center border-primary">
                <span class="fs-xxs fw-bold text-primary text-uppercase d-block">(=) Disponível Repasse</span>
                <strong class="fs-sm text-primary">${formatCurrency(elig.disponivelFinal || 0)}</strong>
                <div class="fs-xxs text-primary fw-bold mt-1">Livre para Solicitação</div>
              </div>
            </div>
          </div>

          <!-- Seção de Obrigações do Evento -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold mb-0 text-dark"><i class="ph-calendar-check me-1 text-primary"></i> Obrigações e Reservas Programadas (${obligations.length})</h6>
              <button class="btn btn-xs btn-outline-primary" onclick="window.app.openNewObligationModal('${producer.id}', '${event.id}');">
                + Nova Obrigação
              </button>
            </div>
            <div class="table-responsive border rounded">
              <table class="table table-sm table-hover mb-0 fs-xs">
                <thead class="table-light">
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Favorecido</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${obligations.length === 0 ? `
                    <tr><td colspan="7" class="text-center text-muted py-3">Nenhuma obrigação registrada para este evento.</td></tr>
                  ` : obligations.map(o => `
                    <tr>
                      <td><span class="badge bg-light text-dark border">${o.category}</span></td>
                      <td><strong>${o.description}</strong></td>
                      <td>${o.beneficiary}</td>
                      <td>${o.dueDate || 'N/A'}</td>
                      <td><strong>${formatCurrency(o.value)}</strong></td>
                      <td><span class="badge ${o.status === 'LIQUIDADO' ? 'bg-success' : (o.status === 'RETIDO' ? 'bg-danger' : 'bg-warning')}">${o.status}</span></td>
                      <td>
                        ${o.status !== 'LIQUIDADO' ? `
                          <button class="btn btn-xs btn-success py-0 px-1" onclick="window.app.handleUpdateObligationStatus('${o.id}', 'LIQUIDADO')">✓ Liquidar</button>
                        ` : `<span class="text-success fw-bold">✓ Pago</span>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Seção de Estornos do Evento -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold mb-0 text-dark"><i class="ph-arrow-u-up-left me-1 text-danger"></i> Fila de Estornos &amp; Reservas Imediatas (${refunds.length})</h6>
              <button class="btn btn-xs btn-outline-danger" onclick="window.app.openInternalRefundModal('${producer.id}', '${event.id}');">
                + Novo Estorno
              </button>
            </div>
            <div class="table-responsive border rounded">
              <table class="table table-sm table-hover mb-0 fs-xs">
                <thead class="table-light">
                  <tr>
                    <th>Pedido</th>
                    <th>Valor</th>
                    <th>Motivo</th>
                    <th>1ª Aut</th>
                    <th>2ª Aut (SoD)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${refunds.length === 0 ? `
                    <tr><td colspan="6" class="text-center text-muted py-3">Nenhum estorno ativo para este evento.</td></tr>
                  ` : refunds.map(r => `
                    <tr>
                      <td><strong>${r.orderId}</strong></td>
                      <td><strong class="text-danger">${formatCurrency(r.value)}</strong></td>
                      <td>${r.reason}</td>
                      <td>${r.approvals && r.approvals[0] ? `<span class="text-success fw-bold">✓ ${r.approvals[0].userName}</span>` : '<span class="text-muted">Pendente</span>'}</td>
                      <td>${r.approvals && r.approvals[1] ? `<span class="text-success fw-bold">✓ ${r.approvals[1].userName}</span>` : '<span class="text-muted">Pendente</span>'}</td>
                      <td><span class="badge ${r.status === 'EFETIVADO' ? 'bg-success' : 'bg-warning'}">${r.status.replace(/_/g, ' ')}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Seção de Extrato Ledger do Evento -->
          <div>
            <h6 class="fw-bold mb-2 text-dark"><i class="ph-book-open me-1 text-secondary"></i> Extrato Imutável do Ledger deste Evento (${ledger.length})</h6>
            <div class="table-responsive border rounded" style="max-height: 220px; overflow-y: auto;">
              <table class="table table-sm table-hover mb-0 fs-xs">
                <thead class="table-light">
                  <tr>
                    <th>Data/Hora</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Saldo Após</th>
                    <th>Responsável</th>
                    <th>Motivo / Objeto</th>
                  </tr>
                </thead>
                <tbody>
                  ${ledger.length === 0 ? `
                    <tr><td colspan="6" class="text-center text-muted py-3">Nenhum lançamento no ledger para este evento.</td></tr>
                  ` : ledger.map(l => `
                    <tr>
                      <td><small class="text-muted">${new Date(l.createdAt || Date.now()).toLocaleString('pt-BR')}</small></td>
                      <td><span class="badge bg-light text-dark border">${l.type}</span></td>
                      <td><strong>${formatCurrency(l.value || 0)}</strong></td>
                      <td><strong class="text-primary">${formatCurrency(l.balanceAfter || 0)}</strong></td>
                      <td>${l.actor || 'Sistema'}</td>
                      <td>${l.reason || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer d-flex justify-content-end p-3 bg-light">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.closeModal()">Fechar Detalhamento</button>
        </div>
      </div>
    `);
  }
}

// ============================================================================
// FUNÇÃO GLOBAL DE ALTERNÂNCIA DE PERFIL (CONFORME LINK DE REFERÊNCIA)
// ============================================================================
window.switchGlobalRole = function(role) {
  if (role === 'FINANCEIRO') {
    financialStore.login('disk');
    window.app.navigate('diskDashboard');
  } else if (role === 'PRODUTOR') {
    financialStore.login('producer', 'prod-abc');
    window.app.navigate('overview');
  } else if (role === 'ADMINISTRADOR') {
    financialStore.login('admin');
    window.app.navigate('diskDashboard');
  }
};

window.integratedAction = function(action, options) {
  if (window.app && typeof window.app.integratedAction === 'function') {
    return window.app.integratedAction(action, options);
  }
};

window.financeAction = function(action, id, data) {
  if (window.app && typeof window.app.financeAction === 'function') {
    return window.app.financeAction(action, id, data);
  }
};

window.p13Action = function(action, id) {
  if (window.app && typeof window.app.p13Action === 'function') {
    return window.app.p13Action(action, id);
  }
};

window.p13RecalcSplit = function(raw) {
  if (window.app && typeof window.app.p13RecalcSplit === 'function') {
    return window.app.p13RecalcSplit(raw);
  }
};

window.p18Tab = function(tab, btn) {
  if (window.app && typeof window.app.p18Tab === 'function') {
    return window.app.p18Tab(tab, btn);
  }
};

window.p18Action = function(action, id) {
  if (window.app && typeof window.app.p18Action === 'function') {
    return window.app.p18Action(action, id);
  }
};

window.p19FilterFees = function() {
  if (window.app && typeof window.app.p19FilterFees === 'function') {
    return window.app.p19FilterFees();
  }
};

window.p19SimulateRule = function(id) {
  if (window.app && typeof window.app.p19SimulateRule === 'function') {
    return window.app.p19SimulateRule(id);
  }
};

window.p19RecalcSim = function(ruleId) {
  if (window.app && typeof window.app.p19RecalcSim === 'function') {
    return window.app.p19RecalcSim(ruleId);
  }
};

window.p19PrepareCnab = function(batchId) {
  if (window.app && typeof window.app.p19PrepareCnab === 'function') {
    return window.app.p19PrepareCnab(batchId);
  }
};

window.p19DownloadCnabSample = function(batchId) {
  if (window.app && typeof window.app.p19DownloadCnabSample === 'function') {
    return window.app.p19DownloadCnabSample(batchId);
  }
};

window.p19BatchDetail = function(id) {
  if (window.app && typeof window.app.p19BatchDetail === 'function') {
    return window.app.p19BatchDetail(id);
  }
};

window.p19CnabOccurrencesModal = function() {
  if (window.app && typeof window.app.p19CnabOccurrencesModal === 'function') {
    return window.app.p19CnabOccurrencesModal();
  }
};

window.p19TreatCnabOccurrence = function(occurrenceId) {
  if (window.app && typeof window.app.p19TreatCnabOccurrence === 'function') {
    return window.app.p19TreatCnabOccurrence(occurrenceId);
  }
};

window.p19SubmitOccurrence = function(ev, id) {
  if (window.app && typeof window.app.p19SubmitOccurrence === 'function') {
    return window.app.p19SubmitOccurrence(ev, id);
  }
};

window.p19CnabReturnsModal = function() {
  if (window.app && typeof window.app.p19CnabReturnsModal === 'function') {
    return window.app.p19CnabReturnsModal();
  }
};

window.p19AgendaDrillDown = function(category) {
  if (window.app && typeof window.app.p19AgendaDrillDown === 'function') {
    return window.app.p19AgendaDrillDown(category);
  }
};

window.p19ConcFilter = function(status) {
  if (window.app && typeof window.app.p19ConcFilter === 'function') {
    return window.app.p19ConcFilter(status);
  }
};

window.p19ConcLayer = function(layer) {
  if (window.app && typeof window.app.p19ConcLayer === 'function') {
    return window.app.p19ConcLayer(layer);
  }
};

window.p19ConcDetail = function(id) {
  if (window.app && typeof window.app.p19ConcDetail === 'function') {
    return window.app.p19ConcDetail(id);
  }
};

window.p19Investigate = function(id) {
  if (window.app && typeof window.app.p19Investigate === 'function') {
    return window.app.p19Investigate(id);
  }
};

window.p19Resolve = function(ev, id) {
  if (window.app && typeof window.app.p19Resolve === 'function') {
    return window.app.p19Resolve(ev, id);
  }
};

window.p19OpenTreasuryAccountModal = function(id) {
  if (window.app && typeof window.app.p19OpenTreasuryAccountModal === 'function') {
    return window.app.p19OpenTreasuryAccountModal(id);
  }
};

window.p19SubmitTreasuryAccount = function(ev, id) {
  if (window.app && typeof window.app.p19SubmitTreasuryAccount === 'function') {
    return window.app.p19SubmitTreasuryAccount(ev, id);
  }
};

window.p19TreasuryAccountStatement = function(id) {
  if (window.app && typeof window.app.p19TreasuryAccountStatement === 'function') {
    return window.app.p19TreasuryAccountStatement(id);
  }
};

window.toggleDemoBarCollapse = function() {
  if (window.app && typeof window.app.toggleDemoBarCollapse === 'function') {
    return window.app.toggleDemoBarCollapse();
  }
};

window.openTransferBetweenEventsModal = function(fromEventId) {
  if (window.app && typeof window.app.openTransferBetweenEventsModal === 'function') {
    return window.app.openTransferBetweenEventsModal(fromEventId);
  }
};

window.recalcTransferableBalance = function(fromEventId) {
  if (window.app && typeof window.app.recalcTransferableBalance === 'function') {
    return window.app.recalcTransferableBalance(fromEventId);
  }
};

window.submitTransferBetweenEvents = function(ev) {
  if (window.app && typeof window.app.submitTransferBetweenEvents === 'function') {
    return window.app.submitTransferBetweenEvents(ev);
  }
};

window.openRetentionsModal = function(eventId) {
  if (window.app && typeof window.app.openRetentionsModal === 'function') {
    return window.app.openRetentionsModal(eventId);
  }
};

window.openBalanceCompositionModal = function() {
  if (window.app && typeof window.app.openBalanceCompositionModal === 'function') {
    return window.app.openBalanceCompositionModal();
  }
};

window.openRepasseTimelineModal = function(repasseId) {
  if (window.app && typeof window.app.openRepasseTimelineModal === 'function') {
    return window.app.openRepasseTimelineModal(repasseId);
  }
};

window.openRequestBankChangeModal = function(accountId) {
  if (window.app && typeof window.app.openRequestBankChangeModal === 'function') {
    return window.app.openRequestBankChangeModal(accountId);
  }
};

window.submitProducerBankChange = function(ev, accountId) {
  if (window.app && typeof window.app.submitProducerBankChange === 'function') {
    return window.app.submitProducerBankChange(ev, accountId);
  }
};

window.openBankAccountHistoryModal = function(accountId) {
  if (window.app && typeof window.app.openBankAccountHistoryModal === 'function') {
    return window.app.openBankAccountHistoryModal(accountId);
  }
};

window.setAccountAsDefault = function(accountId) {
  if (window.app && typeof window.app.setAccountAsDefault === 'function') {
    return window.app.setAccountAsDefault(accountId);
  }
};

window.openGrantCreditModal = function(producerId) {
  if (window.app && typeof window.app.openGrantCreditModal === 'function') {
    return window.app.openGrantCreditModal(producerId);
  }
};

window.handleGrantCreditSubmit = function(ev) {
  if (window.app && typeof window.app.handleGrantCreditSubmit === 'function') {
    return window.app.handleGrantCreditSubmit(ev);
  }
};

window.openAccountBlockModal = function(producerId, eventId) {
  if (window.app && typeof window.app.openAccountBlockModal === 'function') {
    return window.app.openAccountBlockModal(producerId, eventId);
  }
};

window.handleAccountBlockSubmit = function(ev) {
  if (window.app && typeof window.app.handleAccountBlockSubmit === 'function') {
    return window.app.handleAccountBlockSubmit(ev);
  }
};

window.handleReleaseAccountBalance = function(producerId, eventId, amount) {
  if (window.app && typeof window.app.handleReleaseAccountBalance === 'function') {
    return window.app.handleReleaseAccountBalance(producerId, eventId, amount);
  }
};

window.handleAmortizeCredit = function(creditId) {
  if (window.app && typeof window.app.handleAmortizeCredit === 'function') {
    return window.app.handleAmortizeCredit(creditId);
  }
};

window.openNewObligationModal = function(producerId, eventId) {
  if (window.app && typeof window.app.openNewObligationModal === 'function') {
    return window.app.openNewObligationModal(producerId, eventId);
  }
};

window.handleCreateObligationSubmit = function(ev) {
  if (window.app && typeof window.app.handleCreateObligationSubmit === 'function') {
    return window.app.handleCreateObligationSubmit(ev);
  }
};

window.handleUpdateObligationStatus = function(obligationId, newStatus) {
  if (window.app && typeof window.app.handleUpdateObligationStatus === 'function') {
    return window.app.handleUpdateObligationStatus(obligationId, newStatus);
  }
};

window.openInternalRefundModal = function(producerId, eventId) {
  if (window.app && typeof window.app.openInternalRefundModal === 'function') {
    return window.app.openInternalRefundModal(producerId, eventId);
  }
};

window.handleInternalRefundSubmit = function(ev) {
  if (window.app && typeof window.app.handleInternalRefundSubmit === 'function') {
    return window.app.handleInternalRefundSubmit(ev);
  }
};

window.handleAuthorizeRefund = function(refundId) {
  if (window.app && typeof window.app.handleAuthorizeRefund === 'function') {
    return window.app.handleAuthorizeRefund(refundId);
  }
};

window.handleExecuteRefund = function(refundId) {
  if (window.app && typeof window.app.handleExecuteRefund === 'function') {
    return window.app.handleExecuteRefund(refundId);
  }
};

window.handleCancelRefund = function(refundId) {
  if (window.app && typeof window.app.handleCancelRefund === 'function') {
    return window.app.handleCancelRefund(refundId);
  }
};

window.handleRejectRefund = function(refundId) {
  if (window.app && typeof window.app.handleRejectRefund === 'function') {
    return window.app.handleRejectRefund(refundId);
  }
};

window.handleRegisterRevenue = function(eventId) {
  if (window.app && typeof window.app.handleRegisterRevenue === 'function') {
    return window.app.handleRegisterRevenue(eventId);
  }
};

window.openEventMovementModal = function(eventId) {
  if (window.app && typeof window.app.openEventMovementModal === 'function') {
    return window.app.openEventMovementModal(eventId);
  }
};

// ============================================================================
// BRIDGE GLOBAL RH DISK & DISK PONTO (INTERACTION HANDLERS)
// ============================================================================

window.LimitlessApp = {
  navigate(viewId, filterArg) {
    if (window.app) {
      financialStore.setState({ currentView: viewId, viewMode: 'disk' });
      if (filterArg) window.app.currentFilterArg = filterArg;
    }
  },

  abrirModalNovoColaborador() {
    const html = `
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="ph-user-plus me-2"></i>Novo Colaborador (RH Disk)</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4">
        <form id="form-novo-colaborador" onsubmit="window.LimitlessApp.salvarNovoColaborador(event)">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold small">Nome Completo *</label>
              <input type="text" class="form-control" name="nome" required placeholder="Ex: Lucas Ferreira dos Santos">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold small">CPF *</label>
              <input type="text" class="form-control" name="cpf" required placeholder="000.000.000-00">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold small">RG</label>
              <input type="text" class="form-control" name="rg" placeholder="10.234.567-8 SSP/PR">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">E-mail Profissional</label>
              <input type="email" class="form-control" name="email" placeholder="nome@diskingressos.com.br">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Telefone / WhatsApp</label>
              <input type="text" class="form-control" name="telefone" placeholder="(41) 99999-8888">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Cargo / Função *</label>
              <input type="text" class="form-control" name="cargoNome" required placeholder="Ex: Operador de Bilheteria">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Departamento *</label>
              <select class="form-select" name="departamentoNome">
                <option value="Operações e Bilheteria de Eventos">Operações e Bilheteria de Eventos</option>
                <option value="Financeiro, Controladoria e Tesouraria">Financeiro, Controladoria e Tesouraria</option>
                <option value="Tecnologia da Informação & Core">Tecnologia da Informação & Core</option>
                <option value="Comercial, Parcerias e Atendimento">Comercial, Parcerias e Atendimento</option>
                <option value="Gente, Gestão & Recursos Humanos">Gente, Gestão & Recursos Humanos</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Regime de Contrato *</label>
              <select class="form-select" name="tipoContrato" id="input-tipo-contrato">
                <option value="CLT">CLT (Quadro Efetivo)</option>
                <option value="FREELANCER_EVENTO">Freelancer de Evento (Diária)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
                <option value="ESTAGIO">Estágio</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Salário Base (CLT) R$</label>
              <input type="number" step="0.01" class="form-control" name="salario" placeholder="0.00" value="3500.00">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Valor Diária (Freelancer) R$</label>
              <input type="number" step="0.01" class="form-control" name="valorDiariaEvento" placeholder="0.00" value="180.00">
            </div>
            <div class="col-12"><hr class="my-2 text-muted"></div>
            <div class="col-12"><h6 class="fw-bold mb-0 text-primary"><i class="ph-bank me-1"></i>Dados Bancários & PIX para Pagamento Automático</h6></div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Banco</label>
              <input type="text" class="form-control" name="banco" placeholder="Ex: 033 - Santander" value="033 - Santander">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Tipo de Chave PIX</label>
              <select class="form-select" name="tipoChavePix">
                <option value="CPF">CPF</option>
                <option value="EMAIL">E-mail</option>
                <option value="TELEFONE">Telefone</option>
                <option value="ALEATORIA">Chave Aleatória (EVP)</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Chave PIX *</label>
              <input type="text" class="form-control" name="chavePix" required placeholder="Chave para transferências">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold"><i class="ph-check me-1"></i> Salvar Colaborador</button>
          </div>
        </form>
      </div>
    `;
    window.app.openModal(html);
  },

  salvarNovoColaborador(event) {
    if (event) event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const dados = Object.fromEntries(formData.entries());
    try {
      financialStore.cadastrarColaboradorRH(dados);
      window.app.closeModal();
    } catch (e) {
      alert("Erro ao cadastrar: " + e.message);
    }
  },

  abrirSimuladorPontoMobile() {
    const db = financialStore.getState().db || {};
    const colaboradores = db.rhColaboradores || [];
    const geofences = db.rhGeofences || [];

    const html = `
      <div class="modal-header bg-dark text-white">
        <h5 class="modal-title fw-bold"><i class="ph-device-mobile me-2 text-warning"></i>Simulador de Ponto (Disk Ponto Android APK)</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4 bg-light">
        <div class="card border-0 shadow-sm mx-auto" style="max-width: 420px; border-radius: 20px; overflow: hidden;">
          <div class="card-header bg-primary text-white text-center py-3">
            <div class="small text-white-50 text-uppercase fw-bold">DiskIngressos • Registrador REP-P</div>
            <h4 class="fw-bold mb-0">Disk Ponto Mobile</h4>
            <span class="badge bg-success-subtle text-white border border-white mt-1">
              <i class="ph-shield-check me-1"></i> Portaria 671 MTE
            </span>
          </div>
          <div class="card-body p-4">
            <form id="form-simulador-ponto" onsubmit="window.LimitlessApp.executarBatidaPontoSimulada(event)">
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Selecione o Colaborador</label>
                <select class="form-select" name="colaboradorId" required>
                  ${colaboradores.map(c => `<option value="${c.id}">${c.nome} (${c.matricula}) - ${c.cargoNome}</option>`).join('')}
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Tipo de Marcação</label>
                <select class="form-select fw-bold" name="tipo" required>
                  <option value="ENTRADA">🟢 Entrada</option>
                  <option value="INTERVALO_INICIO">🟡 Início Intervalo / Almoço</option>
                  <option value="INTERVALO_FIM">🔵 Retorno Intervalo</option>
                  <option value="SAIDA">🔴 Saída</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Local / Geofence Alvo</label>
                <select class="form-select" name="geofenceId" id="simulador-geofence-select">
                  ${geofences.map(g => `<option value="${g.id}">${g.nome} (Raio ${g.raioMetros}m)</option>`).join('')}
                </select>
              </div>

              <div class="p-3 bg-white border rounded-3 mb-4 text-center">
                <div class="small text-muted mb-1"><i class="ph-map-pin text-danger"></i> Coordenadas GPS Capturadas no Toque</div>
                <div class="fw-bold text-dark font-monospace" id="simulador-coords-display">-25.42841, -49.27329</div>
                <span class="badge bg-success-subtle text-success border border-success mt-1">Precisão: 8.2m • DENTRO DO RAIO</span>
              </div>

              <div class="d-grid gap-2">
                <button type="submit" class="btn btn-success btn-lg fw-bold py-3 shadow">
                  <i class="ph-fingerprint me-2 fs-4 align-middle"></i> REGISTRAR PONTO AGORA
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    window.app.openModal(html);
  },

  executarBatidaPontoSimulada(event) {
    if (event) event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const colabId = formData.get('colaboradorId');
    const tipo = formData.get('tipo');
    const geofenceId = formData.get('geofenceId');

    try {
      financialStore.registrarBatidaPontoRH({
        colaboradorId: colabId,
        tipo: tipo,
        geofenceId: geofenceId,
        modoCaptura: 'APP_ONLINE',
        dispositivoInfo: 'Simulador Disk Ponto Android APK'
      });
      window.app.closeModal();
    } catch (e) {
      alert("Erro na batida: " + e.message);
    }
  },

  aprovarAjustePonto(ajusteId) {
    if (confirm(`Confirma aprovação do ajuste de ponto ${ajusteId}? O horário será regularizado retroativamente conforme Portaria 671 MTE.`)) {
      financialStore.aprovarAjustePontoRH(ajusteId);
    }
  },

  rejeitarAjustePonto(ajusteId) {
    const motivo = prompt("Informe o motivo da recusa do ajuste de ponto:", "Horário inconsistente com a escala");
    if (motivo) {
      financialStore.rejeitarAjustePontoRH(ajusteId, motivo);
    }
  },

  enviarPagamentoRHParaTesouraria(eventoId) {
    financialStore.enviarPagamentosEquipeParaTesourariaRH(eventoId);
  },

  testarGeofence(geofenceId) {
    const db = financialStore.getState().db || {};
    const geo = (db.rhGeofences || []).find(g => g.id === geofenceId);
    if (!geo) return;
    alert(`Cerca Virtual: ${geo.nome}\nCentro: ${geo.latitude}, ${geo.longitude}\nRaio Permitido: ${geo.raioMetros} metros.\nStatus: Operacional e Ativa.`);
  },

  verEspelhoColaborador(colaboradorId) {
    const db = financialStore.getState().db || {};
    const colab = (db.rhColaboradores || []).find(c => c.id === colaboradorId);
    const batidas = (db.rhRegistrosPonto || []).filter(b => b.colaboradorId === colaboradorId);

    const html = `
      <div class="modal-header bg-dark text-white">
        <h5 class="modal-title fw-bold"><i class="ph-receipt me-2"></i>Espelho de Ponto • ${colab ? colab.nome : 'Colaborador'}</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4">
        <div class="p-3 bg-light rounded-3 mb-3 d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${colab ? colab.nome : ''} (${colab ? colab.matricula : ''})</div>
            <div class="small text-muted">${colab ? colab.cargoNome : ''} • ${colab ? colab.departamentoNome : ''}</div>
          </div>
          <div class="text-end">
            <div class="small text-muted">Competência: <strong>Outubro/2026</strong></div>
            <span class="badge bg-primary">Banco de Horas: ${colab ? colab.saldoBancoHoras : '0h'}</span>
          </div>
        </div>

        <h6 class="fw-bold mb-2">Batidas Registradas neste Mês:</h6>
        ${batidas.length === 0 ? '<div class="alert alert-info small">Nenhum registro para este colaborador no período.</div>' : `
          <div class="table-responsive">
            <table class="table table-bordered table-sm align-middle small">
              <thead class="table-light">
                <tr>
                  <th>NSR</th>
                  <th>Tipo</th>
                  <th>Data/Hora</th>
                  <th>Local Autorizado</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                ${batidas.map(b => `
                  <tr>
                    <td><span class="badge bg-dark">#${b.nsr}</span></td>
                    <td><span class="badge bg-light text-dark border">${b.tipo}</span></td>
                    <td class="fw-bold">${b.dataHoraFormatada || b.dataHoraMarcacao}</td>
                    <td>${b.geofenceNome || 'Sede'}</td>
                    <td><code>${b.comprovanteNsr}</code></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal()">Fechar</button>
      </div>
    `;
    window.app.openModal(html);
  },

  filtrarColaboradoresTabela(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#tabela-rh-colaboradores tbody tr');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(q) ? '' : 'none';
    });
  },

  filtrarColaboradoresRegime(regime) {
    const rows = document.querySelectorAll('#tabela-rh-colaboradores tbody tr');
    rows.forEach(r => {
      if (regime === 'TODOS') {
        r.style.display = '';
      } else {
        const text = r.textContent.toUpperCase();
        r.style.display = text.includes(regime) ? '' : 'none';
      }
    });
  },

  exportarColaboradores() {
    financialStore.showToast("Exportando CSV", "Relatório de Colaboradores e Dados PIX gerado.", "info");
  },

  gerarArquivoCnabRH() {
    financialStore.showToast("✓ Arquivo CNAB 240 Gerado", "Remessa bancária de folha de pagamento pronta para transmissão ao banco.", "success");
  },

  editarColaborador(colaboradorId) {
    const db = financialStore.getState().db || {};
    const colab = (db.rhColaboradores || []).find(c => c.id === colaboradorId);
    if (!colab) {
      financialStore.showToast("Colaborador não encontrado", "Registro de colaborador não localizado.", "warning");
      return;
    }

    const html = `
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="ph-pencil-simple me-2"></i>Editar Colaborador • ${colab.nome}</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4">
        <form id="form-editar-colaborador" onsubmit="window.LimitlessApp.salvarEdicaoColaborador(event, '${colab.id}')">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-bold small">Nome Completo *</label>
              <input type="text" class="form-control" name="nome" required value="${colab.nome || ''}">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold small">CPF *</label>
              <input type="text" class="form-control" name="cpf" required value="${colab.cpf || ''}">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-bold small">Status</label>
              <select class="form-select" name="status">
                <option value="ATIVO" ${colab.status === 'ATIVO' ? 'selected' : ''}>ATIVO</option>
                <option value="FERIAS" ${colab.status === 'FERIAS' ? 'selected' : ''}>FÉRIAS</option>
                <option value="AFASTADO" ${colab.status === 'AFASTADO' ? 'selected' : ''}>AFASTADO</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Cargo / Função *</label>
              <input type="text" class="form-control" name="cargoNome" required value="${colab.cargoNome || ''}">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Departamento *</label>
              <input type="text" class="form-control" name="departamentoNome" required value="${colab.departamentoNome || ''}">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Salário Base (CLT) R$</label>
              <input type="number" step="0.01" class="form-control" name="salario" value="${colab.salario || 0}">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Valor Diária (Freelancer) R$</label>
              <input type="number" step="0.01" class="form-control" name="valorDiariaEvento" value="${colab.valorDiariaEvento || 0}">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Chave PIX *</label>
              <input type="text" class="form-control" name="chavePix" required value="${colab.chavePix || ''}">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold"><i class="ph-check me-1"></i> Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;
    window.app.openModal(html);
  },

  salvarEdicaoColaborador(event, colaboradorId) {
    if (event) event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.target).entries());
    const db = financialStore.getState().db || {};
    const colab = (db.rhColaboradores || []).find(c => c.id === colaboradorId);
    if (colab) {
      colab.nome = dados.nome || colab.nome;
      colab.cpf = dados.cpf || colab.cpf;
      colab.status = dados.status || colab.status;
      colab.cargoNome = dados.cargoNome || colab.cargoNome;
      colab.departamentoNome = dados.departamentoNome || colab.departamentoNome;
      colab.salario = Number(dados.salario) || 0;
      colab.valorDiariaEvento = Number(dados.valorDiariaEvento) || 0;
      colab.chavePix = dados.chavePix || colab.chavePix;
      financialStore.persist?.();
      financialStore.notify?.();
      financialStore.showToast("✓ Ficha Atualizada", `Os dados de ${colab.nome} foram salvos com sucesso.`, "success");
    }
    window.app.closeModal();
  },

  abrirModalNovaGeofence() {
    const html = `
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="ph-map-pin me-2"></i>Nova Cerca Virtual (Geofence Portaria 671)</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4">
        <form id="form-nova-geofence" onsubmit="window.LimitlessApp.salvarNovaGeofence(event)">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label fw-bold small">Nome da Cerca / Arena *</label>
              <input type="text" class="form-control" name="nome" required placeholder="Ex: Arena Expotrade Pinhais">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Tipo *</label>
              <select class="form-select" name="tipo">
                <option value="ARENA_EVENTO">ARENA DE EVENTO</option>
                <option value="SEDE">SEDE ADMINISTRATIVA</option>
                <option value="PDV">PONTO DE VENDA (PDV)</option>
              </select>
            </div>
            <div class="col-md-8">
              <label class="form-label fw-bold small">Endereço Completo *</label>
              <input type="text" class="form-control" name="endereco" required placeholder="Rod. Dep. João Leopoldo Jacomel, 10454">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Raio Permitido (Metros) *</label>
              <input type="number" class="form-control" name="raioMetros" required value="250" min="20" max="2000">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Latitude *</label>
              <input type="number" step="0.00001" class="form-control" name="latitude" required value="-25.44112">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Longitude *</label>
              <input type="number" step="0.00001" class="form-control" name="longitude" required value="-49.19125">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold"><i class="ph-check me-1"></i> Ativar Cerca Virtual</button>
          </div>
        </form>
      </div>
    `;
    window.app.openModal(html);
  },

  salvarNovaGeofence(event) {
    if (event) event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.target).entries());
    const db = financialStore.getState().db || {};
    if (!db.rhGeofences) db.rhGeofences = [];
    db.rhGeofences.unshift({
      id: `geo-${Date.now()}`,
      nome: dados.nome,
      tipo: dados.tipo || 'ARENA_EVENTO',
      endereco: dados.endereco,
      cidade: 'Curitiba',
      uf: 'PR',
      latitude: Number(dados.latitude) || -25.4284,
      longitude: Number(dados.longitude) || -49.2733,
      raioMetros: Number(dados.raioMetros) || 200,
      colaboradoresVinculados: 12,
      ativa: true
    });
    financialStore.persist?.();
    financialStore.notify?.();
    financialStore.showToast("✓ Cerca Virtual Criada", `${dados.nome} ativada com raio de ${dados.raioMetros}m.`, "success");
    window.app.closeModal();
  },

  abrirModalAlocarEquipe() {
    const db = financialStore.getState().db || {};
    const colaboradores = db.rhColaboradores || [];

    const html = `
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="ph-users-three me-2"></i>Alocar Profissional em Evento</h5>
        <button type="button" class="btn-close btn-close-white" onclick="window.app.closeModal()"></button>
      </div>
      <div class="modal-body p-4">
        <form id="form-alocar-equipe" onsubmit="window.LimitlessApp.salvarAlocacaoEquipe(event)">
          <div class="row g-3">
            <div class="col-md-12">
              <label class="form-label fw-bold small">Profissional *</label>
              <select class="form-select" name="colaboradorId" required>
                ${colaboradores.map(c => `<option value="${c.id}">${c.nome} — ${c.cargoNome} (${c.tipoContrato})</option>`).join('')}
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Função na Operação do Evento *</label>
              <input type="text" class="form-control" name="cargoFuncao" required value="Operador de Bilheteria / Acesso">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Valor da Diária (R$) *</label>
              <input type="number" step="0.01" class="form-control" name="valorDiaria" required value="220.00">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Auxílio Alimentação (R$)</label>
              <input type="number" step="0.01" class="form-control" name="auxilioAlimentacao" value="45.00">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-bold small">Auxílio Transporte (R$)</label>
              <input type="number" step="0.01" class="form-control" name="auxilioTransporte" value="35.00">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <button type="button" class="btn btn-light" onclick="window.app.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary fw-bold"><i class="ph-check me-1"></i> Confirmar Alocação</button>
          </div>
        </form>
      </div>
    `;
    window.app.openModal(html);
  },

  salvarAlocacaoEquipe(event) {
    if (event) event.preventDefault();
    const dados = Object.fromEntries(new FormData(event.target).entries());
    const db = financialStore.getState().db || {};
    const colab = (db.rhColaboradores || []).find(c => c.id === dados.colaboradorId);
    financialStore.alocarEquipeEventoRH({
      colaboradorId: colab ? colab.id : dados.colaboradorId,
      colaboradorNome: colab ? colab.nome : 'Profissional Alocado',
      cargoFuncao: dados.cargoFuncao,
      tipoContratacao: colab ? colab.tipoContrato : 'FREELANCER_EVENTO',
      valorDiaria: Number(dados.valorDiaria) || 220,
      auxilioAlimentacao: Number(dados.auxilioAlimentacao) || 45,
      auxilioTransporte: Number(dados.auxilioTransporte) || 35,
      chavePix: colab ? colab.chavePix : '',
      tipoChavePix: colab ? colab.tipoChavePix : 'CPF',
      banco: colab ? colab.banco : '033 - Santander'
    });
    window.app.closeModal();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new LimitlessFinancialApp();
  });
} else {
  window.app = new LimitlessFinancialApp();
}

window.toggleSubmenu = function(event, element, itemId) {
  if (window.app && typeof window.app.toggleSubmenu === 'function') {
    return window.app.toggleSubmenu(event, element, itemId);
  }
};

window.toggleSidebar = function() {
  if (window.app && typeof window.app.toggleSidebar === 'function') {
    return window.app.toggleSidebar();
  }
};

