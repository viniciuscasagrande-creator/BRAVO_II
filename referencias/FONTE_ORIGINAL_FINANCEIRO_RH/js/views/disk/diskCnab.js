/**
 * CNAB e Remessas Bancárias - Financeiro Disk (Pacote 19)
 * Fila de remessas CNAB 240/400, processamento de retornos e tratamento operacional de ocorrências.
 */
import { formatCurrency } from '../../formatters.js';

export function renderDiskCnab(state) {
  const batches = state.data.cnabBatches || [];
  const occurrences = state.data.cnabOccurrences || [];
  const returns = state.data.cnabReturns || [];
  const pendingOccurrences = occurrences.filter(o => o.status === 'Pendente');

  const selectedProd = state.data.producers?.find(p => p.id === state.selectedProducerId);
  const selectedEvt = state.data.events?.find(e => e.id === state.selectedEventId);
  const hasContext = state.selectedProducerId && state.selectedProducerId !== 'all';

  return `
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span>Tesouraria</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">CNAB & Remessas Bancárias</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-file-code text-primary"></i> CNAB e Remessas Bancárias (240 / 400)
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Geração de arquivos de remessa, leitura de retornos bancários e tratamento operacional de ocorrências.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-outline-light btn-sm" onclick="window.app.p19CnabReturnsModal()">
            <i class="ph-files me-1"></i> Arquivos de Retorno (${returns.length})
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.p19PrepareCnab()" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
            <i class="ph-file-arrow-down me-1"></i> Preparar Arquivo CNAB
          </button>
        </div>
      </div>
    </div>

    <div class="limitless-content">

      ${hasContext ? `
        <div class="card-panel" style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 18px; margin-bottom: 18px;">
          <div style="font-size: 0.85rem; color: #92400e; font-weight: 700;">
            <i class="ph-info me-1"></i> Contexto: ${selectedProd?.name || state.selectedProducerId} ${selectedEvt ? '→ ' + selectedEvt.name : ''}
          </div>
          <div style="font-size: 0.8rem; color: #78350f;">
            Lotes CNAB agregam pagamentos multi-produtor para transmissão unificada em arquivo bancário.
          </div>
        </div>
      ` : ''}

      <!-- KPIs Operacionais Clicáveis -->
      <div class="kpi-grid">
        <div class="kpi-card highlight" style="cursor: pointer;" onclick="window.app.p19BatchDetail('CNAB-240-20260929-01')" title="Clique para ver lotes abertos">
          <div class="kpi-header"><span class="kpi-title">Lotes Abertos</span></div>
          <div class="kpi-value">3</div>
          <div class="kpi-subtext"><span>Aguardam homologação/envio</span></div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" onclick="window.app.navigate('diskAgendaPagamentos')" title="Clique para abrir a Agenda de Pagamentos">
          <div class="kpi-header"><span class="kpi-title">Valor em Lotes</span></div>
          <div class="kpi-value" style="color: #2563eb;">R$ 642.890,00</div>
          <div class="kpi-subtext"><span>14 pagamentos em fila</span></div>
        </div>

        <div class="kpi-card success-accent" style="cursor: pointer;" onclick="window.app.p19CnabReturnsModal()" title="Clique para visualizar os arquivos de retorno recebidos">
          <div class="kpi-header"><span class="kpi-title">Retornos Recebidos</span></div>
          <div class="kpi-value" style="color: #059669;">8</div>
          <div class="kpi-subtext"><span>${returns.length} arquivos processados hoje</span></div>
        </div>

        <div class="kpi-card warning-accent" style="cursor: pointer;" onclick="window.app.p19CnabOccurrencesModal()" title="Clique para abrir a mesa de tratamento de ocorrências">
          <div class="kpi-header"><span class="kpi-title">Ocorrências CNAB</span></div>
          <div class="kpi-value" style="color: #dc2626;">${pendingOccurrences.length}</div>
          <div class="kpi-subtext"><span><strong class="text-danger">Exigem tratamento manual</strong> &bull; Clique para tratar</span></div>
        </div>
      </div>

      <!-- Tabela de Lotes CNAB -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Lotes de Remessa e Retorno CNAB</h2>
            <p class="card-subtitle">Controle de lotes gerados, convênios bancários e situação do retorno de liquidação</p>
          </div>
          <button class="btn btn-outline-danger btn-sm" onclick="window.app.p19CnabOccurrencesModal()">
            <i class="ph-warning me-1"></i> Ver Ocorrências (${pendingOccurrences.length})
          </button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Banco / Convênio</th>
                  <th>Conta Origem</th>
                  <th>Qtd Pagamentos</th>
                  <th style="text-align: right;">Valor Total</th>
                  <th style="text-align: center;">Situação</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${batches.map(b => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #1e40af;">${b.batchId}</td>
                    <td><strong>${b.bank}</strong></td>
                    <td style="font-size: 0.8rem; color: #64748b;">${b.agencyAccount}</td>
                    <td><strong>${b.count}</strong> pagamentos</td>
                    <td style="text-align: right; font-weight: 800; color: #1e293b;">
                      ${formatCurrency(b.totalAmount)}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge ${b.status.includes('Conciliado') ? 'badge-success' : 'badge-info'}">
                        ${b.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-light btn-xs" onclick="window.app.p19BatchDetail('${b.batchId}')">
                        <i class="ph-eye me-1"></i> Ver Lote
                      </button>
                    </td>
                  </tr>
                `).join('')}
                <tr>
                  <td style="font-family: monospace; font-weight: 700; color: #1e40af;">CNAB-20260928-03</td>
                  <td><strong>Itaú Unibanco (341)</strong></td>
                  <td style="font-size: 0.8rem; color: #64748b;">Ag 0910 • C/C 28910-2</td>
                  <td><strong>22</strong> pagamentos</td>
                  <td style="text-align: right; font-weight: 800; color: #1e293b;">
                    ${formatCurrency(884200.00)}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge badge-success">🟢 Retorno conciliado</span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-light btn-xs" onclick="window.app.p19BatchDetail('CNAB-20260928-03')">
                      <i class="ph-eye me-1"></i> Ver Lote
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: monospace; font-weight: 700; color: #1e40af;">CNAB-20260928-02</td>
                  <td><strong>Banco do Brasil (001)</strong></td>
                  <td style="font-size: 0.8rem; color: #64748b;">Ag 1890-X • C/C 55400-1</td>
                  <td><strong>8</strong> pagamentos</td>
                  <td style="text-align: right; font-weight: 800; color: #1e293b;">
                    ${formatCurrency(201500.00)}
                  </td>
                  <td style="text-align: center;">
                    <span class="badge badge-danger" style="cursor: pointer;" onclick="window.app.p19CnabOccurrencesModal()" title="Clique para tratar">
                      🔴 2 ocorrências
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger btn-xs" onclick="window.app.p19CnabOccurrencesModal()" style="font-weight: 700;">
                      <i class="ph-warning me-1"></i> Tratar Ocorrências
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}
