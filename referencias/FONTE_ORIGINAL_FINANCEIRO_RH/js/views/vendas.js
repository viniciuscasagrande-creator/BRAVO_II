/**
 * Vendas e Recebimentos - Origem dos Recursos e Meios de Captura
 * Detalha PIX, Cartão (à vista e parcelado), Boleto, status de liquidação e canais
 */
import { formatCurrency, formatNumber, formatPercent } from '../formatters.js';

export function renderVendas(state) {
  const breakdown = state.data.paymentBreakdown;
  const totals = state.data.consolidatedTotals;

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Vendas e Recebimentos</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            Origem de Vendas & Recebimentos
          </h1>
          <p class="page-title-desc">Compreenda a distribuição dos métodos de pagamento, canais de venda e prazos de liquidação de recebíveis.</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Status de Vendas (Processadas vs. Em Processamento vs. Canceladas) -->
      <div class="kpi-grid">
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Vendas Processadas & Aprovadas</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(970000.00)}</div>
          <div class="kpi-subtext"><span>7.900 ingressos emitidos e confirmados</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Em Processamento / Compensação</span></div>
          <div class="kpi-value" style="color: #d97706;">${formatCurrency(18540.00)}</div>
          <div class="kpi-subtext"><span>Boletos emitidos e PIX pendentes</span></div>
        </div>

        <div class="kpi-card danger-accent">
          <div class="kpi-header"><span class="kpi-title">Vendas Canceladas / Rejeitadas</span></div>
          <div class="kpi-value" style="color: #dc2626;">${formatCurrency(31200.00)}</div>
          <div class="kpi-subtext"><span>Recusa de emissor ou cancelamento voluntário</span></div>
        </div>

        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Recebíveis Futuros (Cartão)</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(totals.futureReceivables)}</div>
          <div class="kpi-subtext"><span>Parcelamentos a liquidar nos próximos meses</span></div>
        </div>
      </div>

      <!-- Detalhamento por Método de Pagamento -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Mix de Meios de Pagamento</h2>
            <p class="card-subtitle">Volume financeiro transacionado, quantidade de pedidos e ticket médio por método</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Meio de Pagamento</th>
                  <th>Participação (%)</th>
                  <th style="text-align: right;">Volume Total</th>
                  <th style="text-align: right;">Transações</th>
                  <th style="text-align: right;">Ticket Médio</th>
                  <th>Prazo Padrão de Liquidação</th>
                </tr>
              </thead>
              <tbody>
                ${breakdown.byMethod.map(m => `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 12px; height: 12px; border-radius: 50%; background: ${m.color}; display: inline-block;"></span>
                        <strong>${m.method}</strong>
                      </div>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; width: 35px;">${m.share}%</span>
                        <div style="width: 100px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                          <div style="width: ${m.share}%; height: 100%; background: ${m.color};"></div>
                        </div>
                      </div>
                    </td>
                    <td style="text-align: right; font-weight: 700; font-size: 0.95rem;">${formatCurrency(m.amount)}</td>
                    <td style="text-align: right; font-weight: 600;">${formatNumber(m.transactions)}</td>
                    <td style="text-align: right; color: var(--text-muted);">${formatCurrency(m.avgTicket)}</td>
                    <td>
                      <span class="badge ${m.method.includes('PIX') ? 'badge-success' : 'badge-neutral'}">
                        ${m.method.includes('PIX') ? 'D+0 / Instantâneo' : (m.method.includes('Boleto') ? 'D+1 Compensação' : 'D+30 ou Conforme Parcelas')}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Canais de Venda e Recebimento -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Canais de Distribuição Disk</h2>
              <p class="card-subtitle">Onde seus ingressos foram comprados</p>
            </div>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 18px;">
            ${breakdown.byChannel.map(c => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.84rem; margin-bottom: 6px;">
                  <span style="font-weight: 600;">${c.channel}</span>
                  <span style="font-weight: 700;">${c.share}% • ${formatCurrency(c.amount)}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${c.share}%; height: 100%; background: #2563eb;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Grade de Recebíveis Futuros</h2>
              <p class="card-subtitle">Previsão cronológica de liberação de parcelas</p>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border-light); font-size: 0.84rem;">
                <span>Até 30 dias (Outubro/2026):</span>
                <strong style="color: #059669;">${formatCurrency(120500.00)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--border-light); font-size: 0.84rem;">
                <span>De 31 a 60 dias (Novembro/2026):</span>
                <strong style="color: #2563eb;">${formatCurrency(62020.00)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.84rem;">
                <span>Acima de 60 dias (Dezembro/2026):</span>
                <strong style="color: #d97706;">${formatCurrency(30000.00)}</strong>
              </div>
            </div>

            <div style="background: var(--surface-alt); padding: 12px 14px; border-radius: var(--radius-sm); margin-top: 20px; font-size: 0.78rem; color: var(--text-muted);">
              💡 <em>Precisa desse montante antes do prazo?</em> Você pode contratar a <strong>Antecipação de Recebíveis</strong> com liberação no mesmo dia.
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}
