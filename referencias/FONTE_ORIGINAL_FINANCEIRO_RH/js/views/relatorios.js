/**
 * Relatórios Financeiros do Produtor
 * Centraliza exportações em CSV, Excel e PDF para todas as dimensões financeiras
 */

export function renderRelatorios(state) {
  const events = state.data.events;

  const reportPresets = [
    {
      title: "Vendas por Evento (Analítico)",
      desc: "Relação de ingressos vendidos, valores unitários, setores e receita bruta por produção.",
      icon: "file-text",
      formats: ["PDF", "EXCEL", "CSV"]
    },
    {
      title: "Vendas por Período (Diário / Mensal)",
      desc: "Evolução cronológica de faturamento diário com filtros de corte temporal.",
      icon: "calendar",
      formats: ["EXCEL", "CSV"]
    },
    {
      title: "Vendas por Forma de Pagamento",
      desc: "Demonstrativo segregado por PIX, Cartão à Vista, Cartão Parcelado e Boleto.",
      icon: "credit-card",
      formats: ["PDF", "EXCEL", "CSV"]
    },
    {
      title: "Demonstrativo de Taxas e Descontos",
      desc: "Histórico auditado de todas as taxas contratuais Disk e custos operacionais deduzidos.",
      icon: "percent",
      formats: ["PDF", "EXCEL"]
    },
    {
      title: "Relatório de Repasses e TED/PIX",
      desc: "Histórico completo de repasses solicitados, aprovados e comprovantes bancários.",
      icon: "arrow-up-right",
      formats: ["PDF", "EXCEL", "CSV"]
    },
    {
      title: "Relatório de Antecipações",
      desc: "Contratos de antecipação de recebíveis futuros, deságio aplicado e créditos liberados.",
      icon: "zap",
      formats: ["PDF", "EXCEL"]
    },
    {
      title: "Estornos, Cancelamentos e Chargebacks",
      desc: "Relação de cancelamentos efetuados pelo CDC, chargebacks e defesas antifraude.",
      icon: "alert-triangle",
      formats: ["PDF", "EXCEL", "CSV"]
    },
    {
      title: "Fechamento de Evento (Borderô Contábil)",
      desc: "Borderô consolidado definitivo para prestação de contas com patrocinadores e sócios.",
      icon: "clipboard",
      formats: ["PDF", "EXCEL"]
    }
  ];

  return `
    <!-- Header -->
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Relatórios Financeiros</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Central de Relatórios & Exportações
          </h1>
          <p class="page-title-desc">Exporte demonstrativos fiscais, livros-caixa, borderôs e relatórios analíticos em múltiplos formatos.</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="limitless-content">

      <!-- Filtro Global de Relatórios -->
      <div class="card-panel" style="padding: 18px 24px; background: #ffffff;">
        <div style="display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="margin-bottom: 0; min-width: 220px;">
            <label class="form-label">Filtrar por Evento</label>
            <select class="form-control" id="repEvent">
              <option value="all">Todos os Eventos Consolidados</option>
              ${events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0; min-width: 160px;">
            <label class="form-label">Data Inicial</label>
            <input type="date" class="form-control" value="2026-09-01">
          </div>

          <div class="form-group" style="margin-bottom: 0; min-width: 160px;">
            <label class="form-label">Data Final</label>
            <input type="date" class="form-control" value="2026-09-30">
          </div>

          <button class="btn btn-primary" onclick="alert('Filtros aplicados para a geração de relatórios.')">
            Filtrar Período
          </button>
        </div>
      </div>

      <!-- Grid de Relatórios Pré-configurados -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        ${reportPresets.map(rep => `
          <div class="card-panel" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                  📄
                </div>
                <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${rep.title}</h3>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                ${rep.desc}
              </p>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 14px;">
              <span style="font-size: 0.74rem; font-weight: 600; color: var(--text-muted);">Formatos disponíveis:</span>
              <div style="display: flex; gap: 6px;">
                ${rep.formats.map(fmt => `
                  <button class="btn btn-secondary btn-sm" onclick="window.app.generateReport('${rep.title}', '${fmt}')">
                    ${fmt}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}
