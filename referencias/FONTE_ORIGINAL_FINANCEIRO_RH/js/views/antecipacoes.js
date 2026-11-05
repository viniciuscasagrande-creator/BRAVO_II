/**
 * Antecipações - Antecipação de Recebíveis Futuros (Operação Financeira Segregada de Repasse)
 * Permite simular e contratar liquidação antecipada de vendas no cartão de crédito
 */
import { formatCurrency, formatPercent, createStatusBadge } from '../formatters.js';

export function renderAntecipacoes(state) {
  const ant = state.data.anticipations;
  const events = state.data.events;
  const pendingAnticipationSign = state.data.approvalQueue.find(a => a.type === 'Antecipação' && a.status === 'Aguardando assinatura do Produtor');

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Antecipações de Recebíveis</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            Antecipação de Recebíveis
          </h1>
          <p class="page-title-desc">Antecipe recursos de vendas no cartão de crédito parcelado antes da data original de liquidação bancária.</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Alerta de Assinatura do Contrato de Antecipação -->
      ${pendingAnticipationSign ? `
        <div class="info-banner info-banner-green" style="border-width: 2px; box-shadow: var(--shadow-md); margin-bottom: 20px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <div style="flex: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <strong style="font-size: 0.95rem;">Ação Necessária: Contrato de Antecipação Aprovado pela Disk</strong>
              <div style="font-size: 0.8rem; margin-top: 2px;">
                A operação <strong>${pendingAnticipationSign.id}</strong> (Bruto: ${formatCurrency(pendingAnticipationSign.requestedAmount)} / Líquido: ${formatCurrency(pendingAnticipationSign.netAmount)}) aguarda sua assinatura digital (Produtor assina primeiro) para que a Tesouraria Disk assine por último e transfira os recursos.
              </div>
            </div>
            <button class="btn btn-success" onclick="window.app.openSignDocumentModal('${pendingAnticipationSign.id}')">
              ✍️ Assinar Contrato Agora
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Informative Notice Banner -->
      <div class="info-banner info-banner-amber">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <div>
          <strong>Diferença entre Repasse e Antecipação:</strong> O <em>Repasse</em> transfere o saldo já disponível e liquidado em conta sem incidência de juros. A <em>Antecipação</em> é uma operação de crédito que adianta recebíveis de cartões parcelados a vencer, aplicando a taxa contratual de ${formatPercent(ant.monthlyRate)} a.m.
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Limite Elegível para Antecipação</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(ant.eligibleAmount)}</div>
          <div class="kpi-subtext"><span>Calculado sobre parcelas futuras de cartão</span></div>
        </div>

        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Recebíveis Reservados</span></div>
          <div class="kpi-value" style="color: #d97706;">${formatCurrency(state.activeProducer?.totals?.reservedReceivables || 0)}</div>
          <div class="kpi-subtext"><span>Retido em solicitações de antecipação</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Taxa Contratual de Antecipação</span></div>
          <div class="kpi-value" style="color: #7c3aed;">${ant.monthlyRate}% <span style="font-size: 0.9rem; font-weight: 500;">a.m.</span></div>
          <div class="kpi-subtext"><span>Taxa negociada no contrato Disk</span></div>
        </div>

        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Prazo de Liberação</span></div>
          <div class="kpi-value" style="color: #059669;">Mesmo Dia (D+0)</div>
          <div class="kpi-subtext"><span>Para pedidos aprovados até 15h</span></div>
        </div>
      </div>

      <!-- Simulador Interativo de Antecipação Limitless -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Simulador de Antecipação de Recebíveis</h2>
            <p class="card-subtitle">Informe o valor desejado e visualize imediatamente o desconto e o líquido previsto</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center;">
            
            <!-- Formulário do Simulador -->
            <div>
              <div class="form-group">
                <label class="form-label">Selecione o Evento</label>
                <select class="form-control" id="antEventSelect" onchange="window.app.updateAnticipationSimulation()">
                  <option value="all">Todos os Eventos (Pool de Recebíveis)</option>
                  ${events.map(e => `<option value="${e.id}">${e.name} (Disponível p/ antecipar: ${formatCurrency(e.futureReceivables)})</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Valor a Antecipar</label>
                <input type="range" class="form-control" id="antRangeInput" min="5000" max="${ant.eligibleAmount}" step="1000" value="50000" oninput="window.app.onAnticipationRangeChange(this.value)">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                  <span>Mín: R$ 5.000,00</span>
                  <span>Máx Elegível: ${formatCurrency(ant.eligibleAmount)}</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Valor Digitado (R$)</label>
                <input type="number" class="form-control" id="antNumberInput" value="50000" min="5000" max="${ant.eligibleAmount}" oninput="window.app.onAnticipationNumberChange(this.value)">
              </div>
            </div>

            <!-- Card de Prévia Financeira -->
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; gap: 14px;">
              <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
                Demonstrativo da Operação
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span style="color: var(--text-muted);">Valor Bruto Solicitado:</span>
                <strong id="simGross" style="font-size: 1rem;">R$ 50.000,00</strong>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #dc2626;">
                <span>Taxa Financeira Disk (${ant.monthlyRate}%):</span>
                <strong id="simDiscount">- R$ 1.100,00</strong>
              </div>

              <hr style="border: none; border-top: 1px solid var(--border-color);">

              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; font-size: 1rem;">Líquido a Receber:</span>
                <strong id="simNet" style="font-size: 1.5rem; color: #059669; font-weight: 800;">R$ 48.900,00</strong>
              </div>

              <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                Conta de crédito: <strong>Itaú Unibanco (341) Ag 0432 C/C 48291-0</strong>
              </div>

              <button class="btn btn-primary" style="margin-top: 8px; width: 100%; padding: 12px;" onclick="window.app.submitAnticipation()">
                Confirmar e Solicitar Antecipação
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- Histórico de Antecipações -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Histórico de Operações de Antecipação</h2>
            <p class="card-subtitle">Registro de contratos de adiantamento de recebíveis já contratados</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código Operação</th>
                  <th>Evento</th>
                  <th>Data Solicitação</th>
                  <th>Data Liberação</th>
                  <th style="text-align: right;">Valor Bruto</th>
                  <th style="text-align: right;">Desconto Financeiro</th>
                  <th style="text-align: right;">Líquido Creditado</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${ant.history.map(h => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700;">${h.id}</td>
                    <td style="font-weight: 600;">${h.eventName}</td>
                    <td style="font-size: 0.82rem; color: var(--text-muted);">${h.requestDate}</td>
                    <td style="font-size: 0.82rem; font-weight: 600;">${h.disbursementDate}</td>
                    <td style="text-align: right; font-weight: 600;">${formatCurrency(h.requestedAmount)}</td>
                    <td style="text-align: right; color: #dc2626;">-${formatCurrency(h.discountFee)}</td>
                    <td style="text-align: right; font-weight: 800; color: #059669;">${formatCurrency(h.netDisbursed)}</td>
                    <td style="text-align: center;">${createStatusBadge(h.status)}</td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 6px;">
                        ${h.status === 'Aguardando assinatura do Produtor' ? `
                          <button class="btn btn-success btn-sm" onclick="window.app.openSignDocumentModal('${h.id}')">
                            ✍️ Assinar
                          </button>
                        ` : ''}
                        ${h.status === 'Pago' ? `
                          <button class="btn btn-secondary btn-sm" onclick="window.app.showPayoutReceipt('${h.id}')">
                            Comprovante
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" onclick="window.app.openAuditTrailModal('${h.id}')" title="Trilha de Auditoria">
                          📜
                        </button>
                      </div>
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
