/**
 * Visão Geral - Dashboard Financeiro Disk Interno
 * Apresenta a visão macro do ecossistema, fila unificada da Central de Aprovações e controle de produtores
 */
import { formatCurrency, formatNumber, createStatusBadge } from '../../formatters.js';

export function renderDiskDashboard(state) {
  const producerId = state.selectedProducerId;
  const eventId = state.selectedEventId;
  const events = state.data.events.filter(e =>
    (producerId === 'all' || !producerId || e.producerId === producerId) &&
    (eventId === 'all' || !eventId || e.id === eventId)
  );
  const producerIds = new Set(events.map(e => e.producerId));
  const producers = state.data.producers.filter(p =>
    producerId === 'all' || !producerId ? producerIds.has(p.id) : p.id === producerId
  );
  const approvals = state.data.approvalQueue.filter(a =>
    (producerId === 'all' || !producerId || a.producerId === producerId) &&
    (eventId === 'all' || !eventId || a.eventId === eventId)
  );

  const totalGross = events.reduce((acc, e) => acc + (Number(e.grossSales) || 0), 0);
  const totalProducerObligations = events.reduce((acc, e) => acc + (Number(e.totalBalance) || 0), 0);
  const totalAvailable = events.reduce((acc, e) => acc + (Number(e.availableBalance) || 0), 0);
  const totalReceivables = events.reduce((acc, e) => acc + (Number(e.futureReceivables) || 0), 0);

  const pendingCount = approvals.filter(a => !['Pago', 'Recusado', 'Rejeitado', 'Concluído'].includes(a.status)).length;
  const pendingPayouts = approvals.filter(a => a.type === 'Repasse' && !['Pago', 'Recusado', 'Rejeitado', 'Concluído'].includes(a.status)).length;
  const pendingAnts = approvals.filter(a => a.type === 'Antecipação' && !['Pago', 'Recusado', 'Rejeitado', 'Concluído'].includes(a.status)).length;
  const pendingBanks = approvals.filter(a => a.type === 'Alteração Bancária').length;
  const pendingChargebacks = approvals.filter(a => a.type === 'Chargeback').length;

  const contextLabel = eventId !== 'all' && eventId
    ? (state.data.events.find(e => e.id === eventId)?.name || 'Evento')
    : (producerId && producerId !== 'all'
      ? (state.data.producers.find(p => p.id === producerId)?.name || 'Produtor')
      : 'Disk Ingressos — Consolidado');

  const getProducerTotals = (p) => {
    if (eventId && eventId !== 'all') {
      const pEvents = events.filter(e => e.producerId === p.id);
      return {
        totalBalance: pEvents.reduce((a, e) => a + (Number(e.totalBalance) || 0), 0),
        availableBalance: pEvents.reduce((a, e) => a + (Number(e.availableBalance) || 0), 0),
        futureReceivables: pEvents.reduce((a, e) => a + (Number(e.futureReceivables) || 0), 0)
      };
    }
    return p.totals;
  };

  return `
    <!-- Limitless Page Header -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active" style="color: #60a5fa;">Visão Geral Executiva</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>
            Dashboard Financeiro Disk Ingressos
          </h1>
          <p class="page-title-desc" style="color: #94a3b8;">
            Consolidação da tesouraria, passivos com organizadores, fila operacional de aprovações e liquidação multiadquirente.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span class="badge bg-primary-subtle text-primary" style="font-size: 0.85rem; padding: 6px 12px; border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; background: rgba(59,130,246,0.15); color: #93c5fd !important;">Contexto: ${contextLabel}</span>
          <button class="btn btn-primary" onclick="window.app.navigate('diskAprovacoes')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Central de Aprovações (${pendingCount})
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Macro Financial KPIs Disk -->
      <div class="kpi-grid">
        <div class="kpi-card highlight" style="cursor:pointer" onclick="window.app.navigate('diskIndicadores')" title="Clique para ver os Indicadores Financeiros detalhados">
          <div class="kpi-header"><span class="kpi-title">Volume Bruto Transacionado</span></div>
          <div class="kpi-value">${formatCurrency(totalGross)}</div>
          <div class="kpi-subtext"><span>Todas as produções ativas ↗</span></div>
        </div>

        <div class="kpi-card warning-accent" style="cursor:pointer" onclick="window.app.navigate('diskPosicaoGeral')" title="Clique para ver a Posição Geral">
          <div class="kpi-header"><span class="kpi-title">Obrigações com Produtores</span></div>
          <div class="kpi-value" style="color: #b45309;">${formatCurrency(totalProducerObligations)}</div>
          <div class="kpi-subtext"><span>Passivo circulante segregado ↗</span></div>
        </div>

        <div class="kpi-card success-accent" style="cursor:pointer" onclick="window.app.setDiskBalanceTab('disponivel')" title="Clique para ver os saldos disponíveis">
          <div class="kpi-header"><span class="kpi-title">Disponível para Repasse Imediato</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(totalAvailable)}</div>
          <div class="kpi-subtext"><span>Fundos já compensados pelos bancos ↗</span></div>
        </div>

        <div class="kpi-card" style="cursor:pointer" onclick="window.app.navigate('diskRecebiveis')" title="Clique para ver os recebíveis">
          <div class="kpi-header"><span class="kpi-title">Recebíveis Futuros (Adquirentes)</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(totalReceivables)}</div>
          <div class="kpi-subtext"><span>Cielo, Rede, Stone a liquidar ↗</span></div>
        </div>
      </div>

      <!-- DESTAQUE CENTRAL: A FILA OPERACIONAL ÚNICA (Conforme especificação do usuário) -->
      <div class="card-panel" style="border: 2px solid #f59e0b; background: #fffdf5;">
        <div class="card-header-bar" style="background: #fef3c7; border-bottom: 1px solid #fde68a;">
          <div class="card-title-group">
            <h2 style="color: #92400e; display: flex; align-items: center; gap: 8px;">
              <span>⚡</span> CENTRAL DE APROVAÇÕES — FILA OPERACIONAL ÚNICA
            </h2>
            <p class="card-subtitle" style="color: #b45309;">Toda solicitação do ecossistema centralizada em um só lugar para rápida decisão</p>
          </div>
          <button class="btn btn-warning btn-sm" style="background: #d97706; color: white;" onclick="window.app.navigate('diskAprovacoes')">
            Abrir Central Completa →
          </button>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
            
            <div style="background: white; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 14px; cursor: pointer;" onclick="window.app.navigate('diskAprovacoes', 'Repasse')">
              <div style="font-size: 1.6rem; font-weight: 800; color: #d97706;">${pendingPayouts}</div>
              <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b;">Repasses aguardando análise</div>
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Ex: Produtora ABC (R$ 80.000)</div>
            </div>

            <div style="background: white; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 14px; cursor: pointer;" onclick="window.app.navigate('diskAprovacoes', 'Antecipação')">
              <div style="font-size: 1.6rem; font-weight: 800; color: #7c3aed;">${pendingAnts}</div>
              <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b;">Antecipações solicitadas</div>
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Ex: Antecipação R$ 50.000</div>
            </div>

            <div style="background: white; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 14px; cursor: pointer;" onclick="window.app.navigate('diskAprovacoes', 'Alteração Bancária')">
              <div style="font-size: 1.6rem; font-weight: 800; color: #0284c7;">${pendingBanks}</div>
              <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b;">Alterações bancárias</div>
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Validação Bacen/CIP</div>
            </div>

            <div style="background: white; border: 1px solid #fde68a; border-radius: var(--radius-sm); padding: 14px; cursor: pointer;" onclick="window.app.navigate('diskAprovacoes', 'Chargeback')">
              <div style="font-size: 1.6rem; font-weight: 800; color: #dc2626;">${pendingChargebacks}</div>
              <div style="font-size: 0.8rem; font-weight: 600; color: #1e293b;">Disputas & Chargebacks</div>
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">Defesa junto à Cielo</div>
            </div>

            <div style="background: #1e293b; color: white; border-radius: var(--radius-sm); padding: 14px; display: flex; flex-direction: column; justify-content: center;">
              <div style="font-size: 1.8rem; font-weight: 800; color: #fbbf24;">${pendingCount}</div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Total de Pendências</div>
              <div style="font-size: 0.7rem; color: #38bdf8; margin-top: 4px;">Fila operacional única</div>
            </div>

          </div>
        </div>
      </div>

      <!-- Grid: Produtores Homologados & Posição Consolidada -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Produtores Homologados na Disk Ingressos</h2>
            <p class="card-subtitle">Produtor como entidade de primeira classe: acesse a conta financeira individual ou filtre o sistema</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.navigate('diskProdutores')">
            Ver Todos os Produtores →
          </button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Produtor</th>
                  <th>CNPJ</th>
                  <th>Rating / Risco</th>
                  <th style="text-align: right;">Saldo Total</th>
                  <th style="text-align: right;">Disponível</th>
                  <th style="text-align: right;">A Receber</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${producers.map(p => {
                  const pTotals = getProducerTotals(p);
                  return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${p.name}</div>
                      <div style="font-size: 0.74rem; color: var(--text-muted);">${p.tradeName}</div>
                    </td>
                    <td style="font-family: monospace; font-size: 0.8rem;">${p.cnpj}</td>
                    <td>
                      <span class="badge ${p.riskScore && p.riskScore.includes('Baixo') ? 'badge-success' : 'badge-warning'}">
                        ${p.rating || 'A+'}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(pTotals.totalBalance)}</td>
                    <td style="text-align: right; font-weight: 800; color: #059669;">${formatCurrency(pTotals.availableBalance)}</td>
                    <td style="text-align: right; font-weight: 600; color: #d97706;">${formatCurrency(pTotals.futureReceivables)}</td>
                    <td style="text-align: center;"><span class="badge badge-success">${p.status || 'Ativo'}</span></td>
                    <td style="text-align: right;">
                      <button class="btn btn-outline-primary btn-sm" onclick="window.app.openProducerAccount('${p.id}')">
                        Conta Financeira →
                      </button>
                    </td>
                  </tr>
                `;
                }).join('') || '<tr><td colspan="8" style="text-align: center; padding: 24px;">Nenhum produtor no contexto selecionado.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
