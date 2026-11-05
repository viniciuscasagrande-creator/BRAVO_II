/**
 * Central de Aprovações - Fila Operacional Única
 * Ponto de decisão central do Financeiro Disk para repasses, antecipações, contas e ocorrências
 */
import { formatCurrency, createStatusBadge } from '../../formatters.js';

export function renderDiskAprovacoes(state, filterType = 'all') {
  const selectedProducer = (state.selectedProducerId && state.selectedProducerId !== 'all')
    ? (state.data.producers || []).find(p => p.id === state.selectedProducerId)
    : null;

  let items = state.data.approvalQueue || [];

  if (selectedProducer) {
    items = items.filter(i => i.producerId === selectedProducer.id);
  }

  if (filterType && filterType !== 'all') {
    items = items.filter(i => i.type.toLowerCase().includes(filterType.toLowerCase()));
  }

  return `
    <!-- Header -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Central de Aprovações</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Central de Aprovações Operacional
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Fila unificada de trabalho. Analise e aprove solicitações geradas pelos produtores sem alternar entre diferentes telas.
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Informative Notice -->
      <div class="info-banner info-banner-amber">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Regra de Encadeamento Automático:</strong> Toda aprovação de repasse ou antecipação aciona imediatamente o lançamento em partidas dobradas no <strong>Ledger</strong>, decrementa a obrigação e prepara a linha de pagamento na remessa bancária <strong>CNAB 240</strong>.
        </div>
      </div>

      ${selectedProducer ? `
        <div class="alert alert-primary d-flex align-items-center justify-content-between p-2 px-3 mb-3 shadow-sm rounded-3">
          <div class="d-flex align-items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span class="fs-xs text-dark">
              Fila Filtrada: <strong>${selectedProducer.tradeName || selectedProducer.name}</strong> (CNPJ: ${selectedProducer.cnpj}) &bull; ${items.length} solicitações encontradas.
            </span>
          </div>
          <button class="btn btn-xs btn-outline-primary fw-semibold" onclick="window.app.clearProducerContext()">Ver Todas</button>
        </div>
      ` : ''}

      <!-- Card Table com Fila Unificada -->
      <div class="card-panel">
        <div class="filter-bar">
          <div class="search-input-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar por produtor, evento ou protocolo..." oninput="window.app.searchApprovalQueue(this.value)">
          </div>

          <div class="filter-controls-group">
            <button class="btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.renderDiskAprovacoesView('all')">Todos (${state.data.approvalQueue.length})</button>
            <button class="btn btn-sm ${filterType === 'Repasse' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.renderDiskAprovacoesView('Repasse')">Repasses</button>
            <button class="btn btn-sm ${filterType === 'Antecipação' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.renderDiskAprovacoesView('Antecipação')">Antecipações</button>
            <button class="btn btn-sm ${filterType === 'Alteração Bancária' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.renderDiskAprovacoesView('Alteração Bancária')">Contas Bancárias</button>
            <button class="btn btn-sm ${filterType === 'Chargeback' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.renderDiskAprovacoesView('Chargeback')">Chargebacks</button>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table" id="approvalTable">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Produtor & Evento</th>
                  <th>Tipo da Operação</th>
                  <th>Data Solicitação</th>
                  <th style="text-align: right;">Valor</th>
                  <th>Conta Bancária</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação Operacional</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--primary); font-size: 0.85rem;">
                      ${item.id}
                    </td>
                    <td>
                      <!-- Destaque: Produtor como entidade de primeira classe -->
                      <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
                        ${item.producerName}
                      </div>
                      <div style="font-size: 0.74rem; color: var(--primary); font-weight: 600;">
                        ${item.eventName || 'Cadastro Geral do Produtor'}
                      </div>
                    </td>
                    <td>
                      <span class="badge ${item.type === 'Repasse' ? 'badge-info' : (item.type === 'Antecipação' ? 'badge-purple' : 'badge-neutral')}">
                        ${item.type}
                      </span>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${item.requestDate}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                      ${formatCurrency(item.requestedAmount || item.netAmount || 0)}
                    </td>
                    <td style="font-size: 0.78rem; color: var(--text-muted);">
                      ${item.bankName || 'Não aplicável'}
                    </td>
                    <td style="text-align: center;">
                      ${createStatusBadge(item.status)}
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" onclick="window.app.openApprovalSheet('${item.id}')">
                        Analisar Ficha →
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
