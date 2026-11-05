/**
 * Central de Conciliação Financeira Multicamadas (Pacote 19)
 * 7 Camadas de Auditoria: Bancária, PIX/CNAB, Gateways, Adquirentes, Recebíveis, Repasses e Ledger.
 * Regra Arquitetural: Divergências exigem causa, responsável, evidência e ação corretiva.
 * Nunca altera valores contábeis originais e nunca duplica lançamentos no Ledger.
 */
import { formatCurrency } from '../../formatters.js';
import { renderScrollSpyNav } from '../../components/scrollSpy.js';

function badgeStatus(status) {
  if (status === 'Conciliado') return '<span class="badge badge-success">🟢 Conciliado</span>';
  if (status === 'Divergência') return '<span class="badge badge-danger">🔴 Divergência</span>';
  if (status === 'Resolvida') return '<span class="badge badge-info">🔵 Resolvida</span>';
  return `<span class="badge badge-warning">🟡 ${status}</span>`;
}

export function renderDiskConciliacao(state) {
  const data = state?.data || state || {};
  const itens = data.reconciliationItems || [];
  const divergencias = itens.filter(i => i.status === 'Divergência');
  const conciliados = itens.filter(i => i.status === 'Conciliado');
  const resolvidas = itens.filter(i => i.status === 'Resolvida');
  const diferencaLiquida = itens.reduce((s, i) => s + (i.realizado - i.esperado), 0);
  const totalVolume = itens.reduce((s, i) => s + i.esperado, 0);

  const activeLayer = (typeof window !== 'undefined' ? window.app?.currentConcLayer : null) || 'all';

  const layersList = [
    { id: 'all', name: 'Todas as Camadas', subtitle: 'Visão Global 360°' },
    { id: 'Bancária', name: '1. Bancária', subtitle: 'Ledger × Extrato' },
    { id: 'PIX/CNAB', name: '2. PIX e CNAB', subtitle: 'Banco × PIX/SPI' },
    { id: 'Gateways', name: '3. Gateways', subtitle: 'Pedido × Gateway' },
    { id: 'Adquirentes', name: '4. Adquirentes', subtitle: 'Gateway × Adquirente' },
    { id: 'Recebíveis', name: '5. Recebíveis', subtitle: 'Venda × Liquidação' },
    { id: 'Repasses', name: '6. Repasses', subtitle: 'Obrigação × Pagamento' },
    { id: 'Ledger', name: '7. Ledger', subtitle: 'Contabilidade × Caixa' }
  ];

  const concSpyItems = [
    { id: 'sec-conc-kpis', label: 'Painel Geral 360°', icon: 'ph-chart-pie' },
    { id: 'sec-conc-camadas', label: '7 Camadas de Auditoria', icon: 'ph-stack', badge: '7' },
    { id: 'sec-conc-tabela', label: 'Itens em Auditoria', icon: 'ph-list-checks', badge: itens.length },
    { id: 'sec-conc-divergencias', label: 'Tratamento & Governança', icon: 'ph-warning-octagon', badge: divergencias.length }
  ];

  return `
    <!-- Header Oficial Limitless -->
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">Central de Conciliação</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-arrows-left-right text-primary"></i> Central de Conciliação Financeira Multicamadas
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Auditoria financeira em 7 camadas: Banco × PIX/CNAB × Gateways × Adquirentes × Recebíveis × Repasses × Ledger.
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-light btn-sm" onclick="window.app.p19ConcFilter('')">
            <i class="ph-list me-1"></i> Ver Todas
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.p19ConcFilter('Divergência')" style="background: #dc2626; border-color: #b91c1c; font-weight: 700;">
            <i class="ph-warning me-1"></i> Filtrar Divergências (${divergencias.length})
          </button>
        </div>
      </div>
    </div>

    <div class="limitless-content">

      <!-- Sticky ScrollSpy Navigation Bar -->
      ${renderScrollSpyNav(concSpyItems, 'sec-conc-kpis', { navId: 'conc-scrollspy-nav' })}

      <!-- SEÇÃO 1: KPIs da Conciliação -->
      <section id="sec-conc-kpis" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <div class="kpi-header"><span class="kpi-title">Volume Analisado</span></div>
            <div class="kpi-value">${formatCurrency(totalVolume)}</div>
            <div class="kpi-subtext"><span>Conferência multiorigem</span></div>
          </div>

          <div class="kpi-card success-accent">
            <div class="kpi-header"><span class="kpi-title">Conciliados Positivos</span></div>
            <div class="kpi-value" style="color: #059669;">${conciliados.length + resolvidas.length}</div>
            <div class="kpi-subtext"><span>${conciliados.length} automáticos · ${resolvidas.length} tratadas</span></div>
          </div>

          <div class="kpi-card warning-accent">
            <div class="kpi-header"><span class="kpi-title">Divergências Abertas</span></div>
            <div class="kpi-value" style="color: ${divergencias.length > 0 ? '#dc2626' : '#059669'};">${divergencias.length}</div>
            <div class="kpi-subtext"><span>${divergencias.length > 0 ? 'Exigem investigação formal' : 'Nenhuma pendente'}</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-title">Diferença Líquida</span></div>
            <div class="kpi-value" style="color: ${diferencaLiquida < 0 ? '#dc2626' : '#1e293b'};">${formatCurrency(diferencaLiquida)}</div>
            <div class="kpi-subtext"><span>Sem ajuste automático · Rastreabilidade estrita</span></div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 2: Barra de Seleção das 7 Camadas de Conciliação -->
      <section id="sec-conc-camadas" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel" style="padding: 16px 20px; background: white;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span>Selecione a Camada de Auditoria Multicamadas</span>
            <span style="font-weight: 500; text-transform: none; font-size: 0.78rem;">Exibindo: <strong>${activeLayer === 'all' ? 'Todas as Camadas' : activeLayer}</strong></span>
          </div>
          <div class="row g-2">
            ${layersList.map((layer, idx) => {
              const isCurrent = activeLayer === layer.id;
              const hasDiv = layer.id === 'PIX/CNAB' && divergencias.length > 0;
              return `
                <div class="col-6 col-md-3">
                  <button class="btn ${isCurrent ? 'btn-primary' : 'btn-light'} w-100 text-start p-2 h-100" 
                          style="${isCurrent ? 'background: #2563eb; border-color: #1d4ed8;' : 'background: #f8fafc; border: 1px solid #e2e8f0;'}"
                          onclick="window.app.p19ConcLayer('${layer.id}')">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="fs-xxs ${isCurrent ? 'text-white-50' : 'text-muted'}">${idx === 0 ? 'GERAL' : `CAMADA ${idx}`}</span>
                      ${hasDiv ? '<span class="badge bg-danger text-white fs-xxs">1 div</span>' : ''}
                    </div>
                    <strong class="fs-xs ${isCurrent ? 'text-white' : 'text-dark'} d-block mt-1">${layer.name}</strong>
                    <div class="fs-xxs ${isCurrent ? 'text-white-50' : 'text-muted'}">${layer.subtitle}</div>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- SEÇÃO 3: Tabela de Itens de Conciliação -->
      <section id="sec-conc-tabela" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Itens em Auditoria e Conciliação</h2>
              <p class="card-subtitle">Cada divergência permanece aberta com valor original até classificação de causa, justificativa e resolução auditada.</p>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm" onclick="window.app.p19ConcFilter('')">Limpar Filtros</button>
              <button class="btn btn-outline-primary btn-sm" onclick="window.app.p19ImportBankStatement()">
                <i class="ph-upload me-1"></i> Importar Extrato
              </button>
            </div>
          </div>
          <div class="card-body card-body-no-padding">
            <div class="table-responsive">
              <table class="limitless-table" id="rec-operational-table">
                <thead>
                  <tr>
                    <th>Protocolo / Camada</th>
                    <th>Origem / Evento</th>
                    <th>Referência Externa</th>
                    <th style="text-align: right;">Esperado</th>
                    <th style="text-align: right;">Realizado</th>
                    <th style="text-align: right;">Diferença</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: right;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${itens.filter(i => {
                    const matchLayer = activeLayer === 'all' || i.layer === activeLayer;
                    const curFilter = typeof window !== 'undefined' ? window.app?.currentConcFilter : null;
                    const matchStatus = !curFilter || i.status === curFilter;
                    return matchLayer && matchStatus;
                  }).map(i => {
                    const diff = i.realizado - i.esperado;
                    return `
                      <tr data-layer="${i.layer}" data-status="${i.status}">
                        <td>
                          <div class="fw-bold text-dark font-monospace">${i.id}</div>
                          <span class="badge bg-light text-muted border fs-xxs">${i.layer}</span>
                        </td>
                        <td>
                          <div class="fw-semibold fs-xs">${i.source}</div>
                          <div class="text-muted fs-xxs">${i.date}</div>
                        </td>
                        <td class="font-monospace fs-xs">${i.ref}</td>
                        <td style="text-align: right; font-weight: 600;">${formatCurrency(i.esperado)}</td>
                        <td style="text-align: right; font-weight: 600;">${formatCurrency(i.realizado)}</td>
                        <td style="text-align: right; font-weight: 700; color: ${diff === 0 ? '#059669' : (diff < 0 ? '#dc2626' : '#2563eb')};">
                          ${diff === 0 ? 'R$ 0,00' : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                        </td>
                        <td style="text-align: center;">${badgeStatus(i.status)}</td>
                        <td style="text-align: right;">
                          ${i.status === 'Divergência' ? `
                            <button class="btn btn-danger btn-xs" onclick="window.app.p19ConcInvestigate('${i.id}')">
                              <i class="ph-magnifying-glass me-1"></i> Investigar
                            </button>
                          ` : `
                            <button class="btn btn-light btn-xs" onclick="window.app.p19ConcDetail('${i.id}')">
                              <i class="ph-eye me-1"></i> ${i.status === 'Resolvida' ? 'Ver Tratamento' : 'Detalhes'}
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 4: Painéis de Tratamento e Regras de Segurança Contábil -->
      <section id="sec-conc-divergencias" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="row g-3">
          <div class="col-lg-7">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div class="card-title-group">
                  <h2>Fluxo de Tratamento de Divergências</h2>
                  <p class="card-subtitle">Procedimento operacional padrão auditável</p>
                </div>
              </div>
              <div class="card-body">
                <div class="d-flex flex-column gap-2">
                  ${[
                    '1. Identificar a camada de origem (Bancária, PIX, Gateway, Adquirente, etc.) e o protocolo da transação.',
                    '2. Apurar a diferença líquida entre o esperado contratual e o montante realizado pela instituição financeira.',
                    '3. Classificar o motivo formal da divergência (Tarifa bancária, MDR divergente, Liquidação parcial, Rejeição, etc.).',
                    '4. Anexar evidência documental ou extrato bancário comprobatório ao protocolo.',
                    '5. Atribuir responsável e acionar a ação corretiva autorizada (Reprocessar, Registrar tarifa, Ajuste autorizado).',
                    '6. Gravar a resolução no histórico imutável com preservação dos registros de auditoria.'
                  ].map(step => `
                    <div class="p-2 border rounded bg-light fs-xs d-flex align-items-center gap-2">
                      <i class="ph-check-circle text-primary fs-5"></i>
                      <span>${step}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-5">
            <div class="card-panel h-100">
              <div class="card-header-bar">
                <div class="card-title-group">
                  <h2>Invariantes de Segurança e Governança</h2>
                  <p class="card-subtitle">Diretrizes da Controladoria Disk Ingressos</p>
                </div>
              </div>
              <div class="card-body fs-xs">
                <div class="alert alert-info py-2 px-3 mb-3">
                  <i class="ph-shield-check me-1"></i> A conciliação é um processo estritamente analítico e idempotente.
                </div>
                <ul class="list-unstyled mb-0" style="line-height: 1.8;">
                  <li><i class="ph-x-circle text-danger me-1"></i> <strong>Proibido ajuste silencioso:</strong> nenhuma divergência é encerrada sem classificação de causa.</li>
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Valores originais preservados:</strong> o lançamento histórico nunca é sobregravado.</li>
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Não duplica Ledger:</strong> reprocessamentos geram lançamentos compensatórios identificados.</li>
                  <li><i class="ph-check-circle text-success me-1"></i> <strong>Sigilo do MDR:</strong> taxas de adquirência interna não são expostas aos produtores.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  `;
}
