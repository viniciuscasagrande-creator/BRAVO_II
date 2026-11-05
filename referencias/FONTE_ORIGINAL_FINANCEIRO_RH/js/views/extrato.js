/**
 * Extrato - Livro-caixa Financeiro do Produtor
 * Cada lançamento: Evento -> Pedido -> Tipo -> Bruto -> Desconto -> Líquido -> Status -> Data
 */
import { formatCurrency, createStatusBadge } from '../formatters.js';

export function renderExtrato(state) {
  let entries = state.data.statementEntries;

  // Filtro por evento se selecionado
  if (state.selectedEventId !== 'all') {
    entries = entries.filter(e => e.eventId === state.selectedEventId);
  }

  // Filtro por tipo de movimentação
  if (state.statementFilter === 'entradas') {
    entries = entries.filter(e => e.grossAmount > 0 && !e.type.includes('Antecipação'));
  } else if (state.statementFilter === 'repasses') {
    entries = entries.filter(e => e.type.includes('Repasse'));
  } else if (state.statementFilter === 'estornos') {
    entries = entries.filter(e => e.type.includes('Estorno') || e.type.includes('Chargeback'));
  } else if (state.statementFilter === 'antecipacoes') {
    entries = entries.filter(e => e.type.includes('Antecipação'));
  }

  const totalBruto = entries.reduce((acc, curr) => acc + curr.grossAmount, 0);
  const totalTaxas = entries.reduce((acc, curr) => acc + (curr.deductions || 0), 0);
  const totalLiquido = entries.reduce((acc, curr) => acc + curr.netAmount, 0);

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Extrato Financeiro</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Extrato & Livro-Caixa do Produtor
          </h1>
          <p class="page-title-desc">Histórico analítico detalhado de todas as receitas de ingressos, deduções contratuais, estornos e repasses.</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-secondary" onclick="window.app.exportCurrentView('csv')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar CSV / Excel
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Summary Bar -->
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Movimentação Bruta Filtrada</span></div>
          <div class="kpi-value">${formatCurrency(totalBruto)}</div>
          <div class="kpi-subtext"><span>${entries.length} lançamentos encontrados</span></div>
        </div>
        <div class="kpi-card danger-accent">
          <div class="kpi-header"><span class="kpi-title">Deduções / Taxas do Produtor</span></div>
          <div class="kpi-value" style="color: #dc2626;">-${formatCurrency(totalTaxas)}</div>
          <div class="kpi-subtext"><span>Taxas contratuais Disk</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Resultado Líquido do Produtor</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(totalLiquido)}</div>
          <div class="kpi-subtext"><span>Impacto líquido no saldo</span></div>
        </div>
      </div>

      <!-- Card Table -->
      <div class="card-panel">
        <!-- Filter Toolbar -->
        <div class="filter-bar">
          <div class="search-input-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar por pedido ou evento..." oninput="window.app.searchExtrato(this.value)">
          </div>

          <div class="filter-controls-group">
            <button class="btn btn-sm ${state.statementFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.filterExtrato('all')">Todos</button>
            <button class="btn btn-sm ${state.statementFilter === 'entradas' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.filterExtrato('entradas')">Vendas (Entradas)</button>
            <button class="btn btn-sm ${state.statementFilter === 'repasses' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.filterExtrato('repasses')">Repasses</button>
            <button class="btn btn-sm ${state.statementFilter === 'estornos' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.filterExtrato('estornos')">Estornos</button>
            <button class="btn btn-sm ${state.statementFilter === 'antecipacoes' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.filterExtrato('antecipacoes')">Antecipações</button>
          </div>
        </div>

        <!-- Table -->
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Data & Hora</th>
                  <th>ID Lançamento</th>
                  <th>Evento Vinculado</th>
                  <th>Ref. / Pedido</th>
                  <th>Tipo da Movimentação</th>
                  <th>Forma</th>
                  <th style="text-align: right;">Bruto</th>
                  <th style="text-align: right;">Descontos / Taxas</th>
                  <th style="text-align: right;">Líquido Produtor</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map(item => `
                  <tr>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${item.date}</td>
                    <td style="font-family: monospace; font-size: 0.78rem; font-weight: 600;">${item.id}</td>
                    <td style="font-weight: 600;">${item.eventName}</td>
                    <td style="font-family: monospace; font-size: 0.78rem; color: var(--primary);">${item.orderId}</td>
                    <td style="font-weight: 600; color: var(--text-main);">${item.type}</td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">${item.paymentMethod}</td>
                    <td style="text-align: right; font-weight: 600;">
                      ${formatCurrency(item.grossAmount)}
                    </td>
                    <td style="text-align: right; color: #dc2626;">
                      ${item.deductions > 0 ? '-' + formatCurrency(item.deductions) : 'R$ 0,00'}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: ${item.netAmount < 0 ? '#dc2626' : '#059669'};">
                      ${formatCurrency(item.netAmount)}
                    </td>
                    <td style="text-align: center;">
                      ${createStatusBadge(item.status)}
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
