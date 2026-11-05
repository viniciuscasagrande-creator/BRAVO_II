/**
 * Agenda de Pagamentos - Financeiro Disk (Pacote 19)
 * Calendário de obrigações financeiras, repasses e fornecedores com drill-down operacional.
 */
import { formatCurrency } from '../../formatters.js';

export function renderDiskAgendaPagamentos(state) {
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
        <span style="color: #60a5fa;">Agenda de Pagamentos</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-calendar-check text-primary"></i> Agenda de Pagamentos & Obrigações
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Cronograma de liquidações, obrigações com produtores e títulos de fornecedores por data de vencimento.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-outline-light btn-sm" onclick="window.app.p19AgendaDrillDown('repasses')">
            <i class="ph-users me-1"></i> Ver Repasses em Fila (14)
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.navigate('diskPagamentosLote')" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
            <i class="ph-stack me-1"></i> Ir para Pagamentos em Lote
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
            Obrigações deste contexto estão destacadas na agenda. Os KPIs consolidados exibem os compromissos totais da Disk Ingressos.
          </div>
        </div>
      ` : ''}

      <!-- KPIs Clicáveis para Drill-Down Operacional -->
      <div class="kpi-grid">
        <div class="kpi-card highlight" style="cursor: pointer;" onclick="window.app.p19AgendaDrillDown('hoje')" title="Clique para abrir compromissos de hoje">
          <div class="kpi-header"><span class="kpi-title">Hoje</span></div>
          <div class="kpi-value">R$ 182.900,00</div>
          <div class="kpi-subtext"><span>12 compromissos &bull; Clique para detalhar</span></div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" onclick="window.app.p19AgendaDrillDown('semana')" title="Clique para ver próximos 7 dias">
          <div class="kpi-header"><span class="kpi-title">Próximos 7 Dias</span></div>
          <div class="kpi-value" style="color: #2563eb;">R$ 912.600,00</div>
          <div class="kpi-subtext"><span>48 compromissos &bull; Total agendado</span></div>
        </div>

        <div class="kpi-card success-accent" style="cursor: pointer;" onclick="window.app.p19AgendaDrillDown('repasses')" title="Clique para abrir os 14 produtores favorecidos">
          <div class="kpi-header"><span class="kpi-title">Repasses Produtores</span></div>
          <div class="kpi-value" style="color: #059669;">R$ 642.890,00</div>
          <div class="kpi-subtext"><span>14 produtores favorecidos &bull; Drill-down</span></div>
        </div>

        <div class="kpi-card" style="cursor: pointer;" onclick="window.app.p19AgendaDrillDown('fornecedores')" title="Clique para abrir títulos de fornecedores">
          <div class="kpi-header"><span class="kpi-title">Fornecedores Disk</span></div>
          <div class="kpi-value" style="color: #d97706;">R$ 269.710,00</div>
          <div class="kpi-subtext"><span>34 títulos programados &bull; Drill-down</span></div>
        </div>
      </div>

      <!-- Tabela da Agenda -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Compromissos Financeiros por Data</h2>
            <p class="card-subtitle">Clique em 'Detalhar Favorecidos' para conferir protocolos, contas bancárias validadas e assinaturas digitais</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Data de Liquidação</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th style="text-align: right;">Valor Programado</th>
                  <th style="text-align: center;">Situação</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>29/09/2026</strong></td>
                  <td><span class="badge badge-info">Repasses</span></td>
                  <td><strong>6</strong> produtores</td>
                  <td style="text-align: right; font-weight: 700;">R$ 128.400,00</td>
                  <td style="text-align: center;"><span class="badge badge-info">Programado</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline-primary btn-xs" onclick="window.app.p19AgendaDrillDown('repasses-29')">
                      <i class="ph-magnifying-glass me-1"></i> Detalhar Favorecidos
                    </button>
                  </td>
                </tr>
                <tr>
                  <td><strong>29/09/2026</strong></td>
                  <td><span class="badge badge-neutral">Fornecedores</span></td>
                  <td><strong>6</strong> títulos</td>
                  <td style="text-align: right; font-weight: 700;">R$ 54.500,00</td>
                  <td style="text-align: center;"><span class="badge badge-warning">Em aprovação</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="window.app.p19AgendaDrillDown('fornecedores')">
                      <i class="ph-magnifying-glass me-1"></i> Detalhar Títulos
                    </button>
                  </td>
                </tr>
                <tr>
                  <td><strong>30/09/2026</strong> (Hoje)</td>
                  <td><span class="badge badge-info">Repasses</span></td>
                  <td><strong>8</strong> produtores</td>
                  <td style="text-align: right; font-weight: 800; color: #1e40af;">R$ 514.490,00</td>
                  <td style="text-align: center;"><span class="badge badge-success">🟢 Pronto para Lote</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-primary btn-xs" onclick="window.app.p19AgendaDrillDown('repasses-30')" style="font-weight: 700;">
                      <i class="ph-arrow-square-out me-1"></i> Ver 8 Repasses (Drill-Down)
                    </button>
                  </td>
                </tr>
                <tr>
                  <td><strong>30/09/2026</strong> (Hoje)</td>
                  <td><span class="badge badge-neutral">Fornecedores</span></td>
                  <td><strong>12</strong> títulos</td>
                  <td style="text-align: right; font-weight: 700;">R$ 215.210,00</td>
                  <td style="text-align: center;"><span class="badge badge-info">Programado</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline-secondary btn-xs" onclick="window.app.p19AgendaDrillDown('fornecedores')">
                      <i class="ph-magnifying-glass me-1"></i> Detalhar Títulos
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
