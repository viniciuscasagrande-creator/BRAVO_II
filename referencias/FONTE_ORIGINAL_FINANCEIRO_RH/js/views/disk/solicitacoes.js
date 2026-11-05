import { formatCurrency, createStatusBadge } from '../../formatters.js';

export function renderDiskSolicitacoes(state, filterType = 'all') {
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

  const allItems = selectedProducer
    ? (state.data.approvalQueue || []).filter(i => i.producerId === selectedProducer.id)
    : (state.data.approvalQueue || []);
  const pending = allItems.filter(i => !['Pago', 'Rejeitado'].includes(i.status));
  const reservedAmount = pending.reduce((acc, i) => acc + (i.requestedAmount || i.netAmount || 0), 0);
  const paidCount = allItems.filter(i => i.status === 'Pago').length;

  return `
    <!-- Header Limitless -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Central de Solicitações</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <i class="ph-files me-2" style="color: #60a5fa;"></i>
            Central de Solicitações Operacionais
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Entrada centralizada de todas as solicitações originadas no ambiente do Produtor (Repasses, Antecipações e Borderôs) com controle de reserva de saldo.
          </p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onclick="window.app.navigate('diskAprovacoes')">
            <i class="ph-scales"></i> Ir para Central de Aprovações &rarr;
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Informative Notice Banner -->
      <div class="info-banner info-banner-blue">
        <i class="ph-info fs-5 me-2"></i>
        <div>
          <strong>Fluxo Operacional Produtor &rarr; Financeiro Disk:</strong> Toda solicitação feita pelo produtor reserva o saldo automaticamente no evento de origem para evitar duplo resgate. O Financeiro Disk audita os dados e decide na Central de Aprovações.
        </div>
      </div>

      ${selectedProducer ? `
        <div class="alert alert-primary d-flex align-items-center justify-content-between p-2 px-3 mb-3 shadow-sm rounded-3">
          <div class="d-flex align-items-center gap-2">
            <i class="ph-funnel text-primary fs-5"></i>
            <span class="fs-xs text-dark">
              Contexto Ativo: <strong>${selectedProducer.tradeName || selectedProducer.name}</strong> (CNPJ: ${selectedProducer.cnpj}) &bull; Exibindo solicitações e repasses exclusivos deste produtor.
            </span>
          </div>
          <button class="btn btn-xs btn-outline-primary fw-semibold" onclick="window.app.clearProducerContext()">Ver Todas</button>
        </div>
      ` : ''}

      <!-- Métricas da Central de Solicitações -->
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header">
            <span class="kpi-title">Total de Solicitações</span>
            <div class="kpi-icon-wrap" style="background: rgba(37,99,235,0.1); color: #2563eb;">
              <i class="ph-folders fs-5"></i>
            </div>
          </div>
          <div class="kpi-value">${allItems.length}</div>
          <div class="kpi-subtext"><span>Protocoladas no Core Financeiro</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header">
            <span class="kpi-title">Pendentes no Fluxo</span>
            <div class="kpi-icon-wrap" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
              <i class="ph-clock-countdown fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #d97706;">${pending.length}</div>
          <div class="kpi-subtext"><span>Em análise ou aguardando assinaturas</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Valor com Reserva Ativa</span>
            <div class="kpi-icon-wrap" style="background: rgba(139,92,246,0.1); color: #8b5cf6;">
              <i class="ph-lock-key fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #7c3aed;">${formatCurrency(reservedAmount)}</div>
          <div class="kpi-subtext"><span>Saldo retido até liquidação/rejeição</span></div>
        </div>

        <div class="kpi-card success-accent">
          <div class="kpi-header">
            <span class="kpi-title">Liquidadas / Pagas</span>
            <div class="kpi-icon-wrap" style="background: rgba(16,185,129,0.1); color: #10b981;">
              <i class="ph-check-circle fs-5"></i>
            </div>
          </div>
          <div class="kpi-value" style="color: #059669;">${paidCount}</div>
          <div class="kpi-subtext"><span>Concluídas e conciliadas em banco</span></div>
        </div>
      </div>

      <!-- Tabela de Solicitações -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Fila Geral de Solicitações</h2>
            <p class="card-subtitle">Entradas originadas do Portal do Produtor com identificação de reserva</p>
          </div>
          <div class="filter-controls-group">
            <button class="btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'all')">Todas (${allItems.length})</button>
            <button class="btn btn-sm ${filterType === 'Repasse' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Repasse')">Repasses</button>
            <button class="btn btn-sm ${filterType === 'Antecipação' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Antecipação')">Antecipações</button>
            <button class="btn btn-sm ${filterType === 'Borderô' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Borderô')">Borderôs</button>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Produtor / Evento</th>
                  <th>Operação</th>
                  <th>Data Solicitação</th>
                  <th style="text-align: right;">Valor Solicitado</th>
                  <th style="text-align: center;">Reserva de Saldo</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(i => {
                  const resStatus = i.reservation?.status || (i.status === 'Pago' ? 'Encerrada' : (i.status === 'Rejeitado' ? 'Liberada' : 'Reservado'));
                  const resBadgeClass = resStatus === 'Reservado' ? 'badge bg-warning text-dark' : (resStatus === 'Encerrada' ? 'badge bg-success' : 'badge bg-secondary');

                  return `
                    <tr>
                      <td style="font-family: monospace; font-weight: 700; color: var(--primary);">
                        ${i.id}
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem;">${i.producerName}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${i.eventName || 'Conta Corrente Geral'}</div>
                      </td>
                      <td>
                        <span class="badge ${i.type === 'Repasse' ? 'badge-info' : (i.type === 'Antecipação' ? 'badge-purple' : 'badge-neutral')}">
                          ${i.type}
                        </span>
                      </td>
                      <td style="font-size: 0.8rem; color: var(--text-muted);">
                        ${i.requestDate || '—'}
                      </td>
                      <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                        ${formatCurrency(i.requestedAmount || i.netAmount || 0)}
                      </td>
                      <td style="text-align: center;">
                        <span class="${resBadgeClass}" style="font-size: 0.72rem;">
                          <i class="ph-lock-key me-1"></i> ${resStatus}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        ${createStatusBadge(i.status)}
                      </td>
                      <td style="text-align: right;">
                        <button class="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" onclick="window.app.focusOperation('${i.id}', 'diskAprovacoes'); setTimeout(() => window.app.openApprovalSheet('${i.id}'), 60)">
                          <span>Analisar</span> <i class="ph-arrow-right fs-xxs"></i>
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
