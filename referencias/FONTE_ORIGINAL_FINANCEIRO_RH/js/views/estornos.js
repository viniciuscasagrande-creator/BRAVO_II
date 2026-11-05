/**
 * Estornos e Chargebacks - Ocorrências que Impactam o Saldo do Produtor
 * O produtor vê apenas aquilo que afeta financeiramente o recebimento dele.
 */
import { formatCurrency, createStatusBadge } from '../formatters.js';

export function renderEstornos(state) {
  const disputes = state.data.chargebacksAndRefunds;
  const totalRefunded = state.data.consolidatedTotals.refundsAndChargebacks;

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Estornos e Chargebacks</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Estornos, Cancelamentos & Chargebacks
          </h1>
          <p class="page-title-desc">Monitore cancelamentos legais de ingressos (CDC), estornos voluntários e contestações de operadoras de cartão.</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Informative Notice -->
      <div class="info-banner info-banner-amber">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Gestão de Disputas pela Disk Ingressos:</strong> A equipe de risco da Disk gerencia as defesas junto aos adquirentes e bancos emissores. Havendo vitória na contestação, o valor cautelarmente retido é estornado imediatamente para o seu saldo disponível.
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card danger-accent">
          <div class="kpi-header"><span class="kpi-title">Total Acumulado de Estornos</span></div>
          <div class="kpi-value" style="color: #dc2626;">${formatCurrency(totalRefunded)}</div>
          <div class="kpi-subtext"><span>Deduzido do saldo bruto de vendas</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Taxa de Estorno / Reembolso</span></div>
          <div class="kpi-value">2,54%</div>
          <div class="kpi-subtext"><span>Abaixo da média setorial de eventos (4,2%)</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Contestações em Disputa Ativa</span></div>
          <div class="kpi-value" style="color: #d97706;">1 caso <span style="font-size: 0.95rem; font-weight: 500;">(R$ 450,00)</span></div>
          <div class="kpi-subtext"><span>Defesa em andamento junto à bandeira</span></div>
        </div>
      </div>

      <!-- Tabela de Ocorrências -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Ocorrências Registradas</h2>
            <p class="card-subtitle">Detalhamento dos cancelamentos e impactos financeiros diretos no saldo</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.exportCurrentView('csv')">Exportar Ocorrências</button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Pedido / Ref.</th>
                  <th>Evento</th>
                  <th>Comprador</th>
                  <th>Data Registro</th>
                  <th>Tipo da Ocorrência</th>
                  <th>Motivo Alegado</th>
                  <th style="text-align: right;">Impacto no Saldo</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${disputes.map(d => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">${d.id}</td>
                    <td style="font-family: monospace; font-size: 0.8rem; color: var(--primary);">${d.orderId}</td>
                    <td style="font-weight: 600;">${d.eventName}</td>
                    <td style="font-size: 0.82rem;">${d.buyer}</td>
                    <td style="font-size: 0.82rem; color: var(--text-muted);">${d.date}</td>
                    <td><strong>${d.type}</strong></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 240px;">${d.reason}</td>
                    <td style="text-align: right; font-weight: 700; color: #dc2626;">
                      ${d.impact}
                    </td>
                    <td style="text-align: center;">
                      ${createStatusBadge(d.status)}
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
