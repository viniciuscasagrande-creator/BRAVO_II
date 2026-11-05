/**
 * Views Especializadas do Módulo Financeiro Disk Enterprise
 * Padrão de Arquitetura Limitless: 23 Seções Canônicas com Submenus Dinâmicos
 */

import { formatCurrency, formatNumber, formatPercent, createStatusBadge } from '../../formatters.js';
import { renderScrollSpyNav } from '../../components/scrollSpy.js';

// Helper de cabeçalho padrão das telas do Financeiro Disk
function createHeader(sectionTitle, subTitle, activeFilter = 'all') {
  return `
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">${sectionTitle}</span>
        ${activeFilter && activeFilter !== 'all' ? `<span class="breadcrumb-separator">/</span><span class="badge bg-primary text-white fs-xxs">${activeFilter.toUpperCase()}</span>` : ''}
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-shield-check text-primary"></i> ${sectionTitle}
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">${subTitle}</p>
        </div>
        <div class="header-action-group">
          <button class="btn btn-secondary btn-sm" onclick="window.app.exportCurrentView('excel')">
            <i class="ph-file-xls me-1"></i> Exportar
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.refreshData()">
            <i class="ph-arrows-counter-clockwise me-1"></i> Sincronizar
          </button>
        </div>
      </div>
    </div>
  `;
}

// 3. EVENTOS (Todos os Eventos, Posição Financeira, Fechamentos)
export function renderDiskEventos(state, filter = 'all') {
  let events = state.data.events;
  if (state.selectedProducerId && state.selectedProducerId !== 'all') {
    events = events.filter(e => e.producerId === state.selectedProducerId);
  }

  const totalGross = events.reduce((acc, e) => acc + (e.grossSales || 0), 0);
  const totalAvailable = events.reduce((acc, e) => acc + (e.availableBalance || 0), 0);
  const totalReceivables = events.reduce((acc, e) => acc + (e.futureReceivables || 0), 0);
  const totalPayouts = events.reduce((acc, e) => acc + (e.payoutsDone || 0), 0);

  return `
    ${createHeader('3. Gestão Transversal de Eventos', 'Posição financeira individual e fechamentos de bilheteria de toda a grade Disk Ingressos.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Vendas Brutas Totais</span></div>
          <div class="kpi-value">${formatCurrency(totalGross)}</div>
          <div class="kpi-subtext"><span>Volume consolidado de ingressos</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Disponível em Custódia</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(totalAvailable)}</div>
          <div class="kpi-subtext"><span>Liberado para repasse aos produtores</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Recebíveis Futuros (Cartão)</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(totalReceivables)}</div>
          <div class="kpi-subtext"><span>Elegível para antecipação</span></div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Repasses Já Executados</span></div>
          <div class="kpi-value" style="color: #b45309;">${formatCurrency(totalPayouts)}</div>
          <div class="kpi-subtext"><span>Transferidos via PIX / TED</span></div>
        </div>
      </div>

      <div class="card-panel">
        <div class="filter-bar">
          <div class="search-input-box">
            <i class="ph-magnifying-glass"></i>
            <input type="text" placeholder="Buscar por evento, local ou produtor..." oninput="window.app.searchApprovalQueue(this.value)">
          </div>
          <div class="filter-controls-group">
            <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskEventos', 'all')">Todos os Eventos (${events.length})</button>
            <button class="btn btn-sm ${filter === 'posicao' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskEventos', 'posicao')">Posição Financeira</button>
            <button class="btn btn-sm ${filter === 'fechamentos' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskEventos', 'fechamentos')">Fechamentos</button>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Evento & Local</th>
                  <th>Produtor Vinculado</th>
                  <th style="text-align: right;">Vendas Brutas</th>
                  <th style="text-align: right;">Saldo Disponível</th>
                  <th style="text-align: right;">A Receber</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${events.map(e => `
                  <tr>
                    <td class="font-monospace fw-bold text-primary">${e.id}</td>
                    <td>
                      <div class="fw-bold text-dark">${e.name}</div>
                      <div class="fs-xxs text-muted">${e.venue} &bull; ${e.date}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">${e.producerName}</div>
                      <span class="badge bg-light text-muted fs-xxs">Homologado</span>
                    </td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(e.grossSales)}</td>
                    <td style="text-align: right; font-weight: 800; color: #059669;">${formatCurrency(e.availableBalance)}</td>
                    <td style="text-align: right; color: #2563eb;">${formatCurrency(e.futureReceivables)}</td>
                    <td style="text-align: center;">${createStatusBadge(e.status)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" onclick="window.app.setSelectedEvent('${e.id}'); window.app.navigate('diskBordero');">
                        Borderô &rarr;
                      </button>
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

// 4. SOLICITAÇÕES (Todas, Repasses, Antecipações, Borderôs)
export function renderDiskSolicitacoes(state, filter = 'all') {
  let items = state.data.approvalQueue;
  if (filter && filter !== 'all') {
    items = items.filter(i => i.type.toLowerCase().includes(filter.toLowerCase()));
  }

  return `
    ${createHeader('4. Central Unificada de Solicitações', 'Acompanhamento transversal de repasses, antecipações e termos de borderô em tramitação.', filter)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="filter-bar">
          <div class="search-input-box">
            <i class="ph-magnifying-glass"></i>
            <input type="text" placeholder="Filtrar por protocolo, produtor ou termo..." oninput="window.app.searchApprovalQueue(this.value)">
          </div>
          <div class="filter-controls-group">
            <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'all')">Todas (${state.data.approvalQueue.length})</button>
            <button class="btn btn-sm ${filter === 'Repasse' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Repasse')">Repasses</button>
            <button class="btn btn-sm ${filter === 'Antecipação' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Antecipação')">Antecipações</button>
            <button class="btn btn-sm ${filter === 'Borderô' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSolicitacoes', 'Borderô')">Borderôs</button>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Operação</th>
                  <th>Produtor & Evento</th>
                  <th>Data Solicitação</th>
                  <th style="text-align: right;">Valor</th>
                  <th>Assinaturas</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td class="font-monospace fw-bold text-primary">${item.id}</td>
                    <td>
                      <span class="badge ${item.type === 'Repasse' ? 'bg-primary' : (item.type === 'Antecipação' ? 'bg-purple text-white' : 'bg-success')}">
                        ${item.type}
                      </span>
                    </td>
                    <td>
                      <div class="fw-bold text-dark">${item.producerName}</div>
                      <div class="fs-xxs text-primary">${item.eventName}</div>
                    </td>
                    <td class="text-muted fs-xs">${item.requestDate}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 0.95rem;">
                      ${formatCurrency(item.requestedAmount || item.netAmount)}
                    </td>
                    <td class="fs-xxs">
                      <div class="${item.signatures?.producer.signed ? 'text-success fw-bold' : 'text-muted'}">
                        ${item.signatures?.producer.signed ? '✓ Produtor Assinou' : '○ Produtor Pendente'}
                      </div>
                      <div class="${item.signatures?.disk.signed ? 'text-success fw-bold' : 'text-muted'}">
                        ${item.signatures?.disk.signed ? '✓ Disk Assinou (Último)' : '🔒 Disk (Assina por Último)'}
                      </div>
                    </td>
                    <td style="text-align: center;">${createStatusBadge(item.status)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" onclick="window.app.openApprovalSheet('${item.id}')">
                        Analisar &rarr;
                      </button>
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

// 6. SALDOS (Consolidado, Por Produtor, Por Evento, Disponível, A Receber, Bloqueado, Em Reserva, Valores em Trânsito)
export function renderDiskSaldos(state, filter = 'consolidado') {
  const totals = state.data.consolidatedTotals;
  return `
    ${createHeader('6. Monitoramento de Saldos & Custódia', 'Gestão patrimonial de saldos líquidos, recebíveis futuros, bloqueios cautelares e reservas da Disk.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Passivo Total em Custódia</span></div>
          <div class="kpi-value">${formatCurrency(totals.totalBalance)}</div>
          <div class="kpi-subtext"><span>Saldo total sob custódia da Disk</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Disponível para Repasse Imediato</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(totals.availableBalance)}</div>
          <div class="kpi-subtext"><span>Liberado nas contas correntes</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Recebíveis Futuros (Cartões)</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(totals.futureReceivables)}</div>
          <div class="kpi-subtext"><span>Fluxo a liquidar pelas adquirentes</span></div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Bloqueado & Reserva de Risco</span></div>
          <div class="kpi-value" style="color: #b45309;">${formatCurrency(totals.blockedBalance)}</div>
          <div class="kpi-subtext"><span>Garantia de chargebacks e contestações</span></div>
        </div>
      </div>

      <div class="card-panel">
        <div class="filter-bar">
          <div class="filter-controls-group flex-wrap">
            <button class="btn btn-sm ${filter === 'consolidado' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'consolidado')">Consolidado</button>
            <button class="btn btn-sm ${filter === 'produtor' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'produtor')">Por Produtor</button>
            <button class="btn btn-sm ${filter === 'evento' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'evento')">Por Evento</button>
            <button class="btn btn-sm ${filter === 'disponivel' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'disponivel')">Disponível</button>
            <button class="btn btn-sm ${filter === 'receber' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'receber')">A Receber</button>
            <button class="btn btn-sm ${filter === 'bloqueado' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'bloqueado')">Bloqueado</button>
            <button class="btn btn-sm ${filter === 'reserva' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'reserva')">Em Reserva</button>
            <button class="btn btn-sm ${filter === 'transito' ? 'btn-primary' : 'btn-secondary'}" onclick="window.app.navigate('diskSaldos', 'transito')">Valores em Trânsito</button>
          </div>
        </div>

        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Produtor</th>
                  <th>CNPJ</th>
                  <th style="text-align: right;">Saldo Total</th>
                  <th style="text-align: right;">Disponível</th>
                  <th style="text-align: right;">A Receber Futuro</th>
                  <th style="text-align: right;">Bloqueado Cautelar</th>
                  <th style="text-align: center;">Risco</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${state.data.producers.map(p => `
                  <tr>
                    <td class="fw-bold">${p.name}</td>
                    <td class="font-monospace text-muted fs-xs">${p.cnpj}</td>
                    <td style="text-align: right; font-weight: 700;">${formatCurrency(p.totals.totalBalance)}</td>
                    <td style="text-align: right; font-weight: 800; color: #059669;">${formatCurrency(p.totals.availableBalance)}</td>
                    <td style="text-align: right; color: #2563eb;">${formatCurrency(p.totals.futureReceivables)}</td>
                    <td style="text-align: right; color: #b45309;">${formatCurrency(p.totals.blockedBalance)}</td>
                    <td style="text-align: center;">
                      <span class="badge bg-success-subtle text-success fs-xxs">${p.rating || 'Tier A'}</span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" onclick="window.app.openProducerAccount('${p.id}')">
                        Ver Dossiê &rarr;
                      </button>
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

// 7. REPASSES (Visão da Mesa Financeira Disk)
export function renderDiskRepasses(state, filter = 'all') {
  return renderDiskSolicitacoes(state, 'Repasse');
}

// 8. ANTECIPAÇÕES (Visão da Mesa Financeira Disk)
export function renderDiskAntecipacoes(state, filter = 'all') {
  return renderDiskSolicitacoes(state, 'Antecipação');
}

// 9. RECEBÍVEIS (Agenda de Recebíveis, Por Produtor, Evento, Adquirente, Cartões, PIX, A Liquidar, Liquidados, Divergências)
export function renderDiskRecebiveis(state, filter = 'agenda') {
  const methods = state.data.paymentBreakdown.byMethod;
  return `
    ${createHeader('9. Agenda & Matriz de Recebíveis', 'Liquidação de vendas, prazos contratuais de cartões (D+30), PIX (D+0) e conciliação por adquirente.', filter)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Composição dos Meios de Captura & Prazos de Liquidação</h2>
            <p class="card-subtitle">Volume processado e prazos contratuais acordados com as adquirentes Cielo, Rede e Stone</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Modalidade de Pagamento</th>
                  <th>Share %</th>
                  <th style="text-align: right;">Volume Processado</th>
                  <th style="text-align: right;">Transações</th>
                  <th style="text-align: right;">Ticket Médio</th>
                  <th>Prazo de Compensação</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${methods.map(m => `
                  <tr>
                    <td class="fw-bold">
                      <span class="status-indicator me-2" style="background: ${m.color}; display: inline-block; width: 10px; height: 10px; border-radius: 50%;"></span>
                      ${m.method}
                    </td>
                    <td class="fw-bold">${m.share}%</td>
                    <td style="text-align: right; font-weight: 800;">${formatCurrency(m.amount)}</td>
                    <td style="text-align: right;">${formatNumber(m.transactions)}</td>
                    <td style="text-align: right;">${formatCurrency(m.avgTicket)}</td>
                    <td class="fw-semibold text-primary">${m.settlement}</td>
                    <td style="text-align: center;"><span class="badge bg-success">Conciliado</span></td>
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

// 10. TAXAS E REGRAS COMERCIAIS ADMINISTRATIVAS (PACOTE 17 - FINANCEIRO DISK)
export function renderDiskTaxas(state, filter = 'disk') {
  const rules = state.data.spreadRules || [];
  const producers = state.data.producers || [];
  const events = state.data.events || [];

  const filterScope = window.app?.filterSpreadScope || 'all';
  const filterAcquirer = window.app?.filterSpreadAcquirer || 'all';
  const filterStatus = window.app?.filterSpreadStatus || 'all';

  let filtered = rules;
  if (filterScope !== 'all') {
    filtered = filtered.filter(r => (r.scopeType || 'Geral Disk') === filterScope);
  }
  if (filterAcquirer !== 'all') {
    filtered = filtered.filter(r => r.acquirer === filterAcquirer);
  }
  if (filterStatus !== 'all') {
    filtered = filtered.filter(r => r.status === filterStatus);
  }

  const activeRules = rules.filter(r => r.status === 'Ativa');
  const avgSpread = activeRules.length > 0
    ? (activeRules.reduce((acc, r) => acc + (Number(r.chargedRate || 0) - Number(r.mdr || 0)), 0) / activeRules.length).toFixed(2)
    : '0.00';
  const avgMdr = activeRules.length > 0
    ? (activeRules.reduce((acc, r) => acc + Number(r.mdr || 0), 0) / activeRules.length).toFixed(2)
    : '0.00';
  const customRulesCount = rules.filter(r => r.scopeType && r.scopeType !== 'Geral Disk').length;

  const taxasSpyItems = [
    { id: 'sec-taxas-kpis', label: 'Indicadores & KPIs', icon: 'ph-chart-line-up' },
    { id: 'sec-taxas-governanca', label: 'Governança & Hierarquia', icon: 'ph-shield-check' },
    { id: 'sec-taxas-matriz', label: 'Matriz de Tarifas & MDR', icon: 'ph-table', badge: filtered.length },
    { id: 'sec-taxas-simulador', label: 'Simulador de Spread', icon: 'ph-calculator' },
    { id: 'sec-taxas-politicas', label: 'Políticas & Prazos', icon: 'ph-clock-clockwise' }
  ];

  return `
    <div class="limitless-page-header" style="background: #0f172a; color: white; border-bottom: 2px solid #3b82f6;">
      <div class="breadcrumbs" style="color: #94a3b8;">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span style="color: #60a5fa;">Taxas & Regras Comerciais</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1 style="color: #f8fafc; font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
            <i class="ph-percent text-primary"></i> Taxas & Regras Comerciais Administrativas
          </h1>
          <p class="page-title-desc" style="color: #94a3b8; font-size: 0.85rem;">
            Gestão operacional de custos de adquirência (MDR), taxas comerciais cobradas, spread bruto, margem líquida efetiva, políticas de parcelamento e regras por escopo (Geral Disk, Produtor ou Evento).
          </p>
        </div>
        <div class="header-action-group" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-light btn-sm" onclick="window.app.scrollToSpySection('sec-taxas-simulador')">
            <i class="ph-calculator me-1"></i> Ir para Simulador
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.app.p13Action('nova-taxa')" style="background: #2563eb; border-color: #1d4ed8; font-weight: 700;">
            <i class="ph-plus me-1"></i> + Nova Taxa
          </button>
        </div>
      </div>
    </div>

    <div class="limitless-content">

      <!-- Barra de Navegação Interna Sticky ScrollSpy -->
      ${renderScrollSpyNav(taxasSpyItems, 'sec-taxas-kpis', { navId: 'taxas-scrollspy-nav' })}

      <!-- SEÇÃO 1: KPIs & Indicadores de Spread -->
      <section id="sec-taxas-kpis" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <div class="kpi-header"><span class="kpi-title">Total de Regras</span></div>
            <div class="kpi-value">${rules.length}</div>
            <div class="kpi-subtext"><span>${activeRules.length} ativas no motor financeiro</span></div>
          </div>

          <div class="kpi-card success-accent">
            <div class="kpi-header"><span class="kpi-title">Spread Bruto Médio</span></div>
            <div class="kpi-value" style="color: #059669;">+${avgSpread}%</div>
            <div class="kpi-subtext"><span>Diferença média entre taxa comercial e MDR</span></div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header"><span class="kpi-title">MDR Médio Adquirentes</span></div>
            <div class="kpi-value" style="color: #64748b;">${avgMdr}%</div>
            <div class="kpi-subtext"><span>Custo base retido pelas operadoras</span></div>
          </div>

          <div class="kpi-card warning-accent">
            <div class="kpi-header"><span class="kpi-title">Regras Customizadas</span></div>
            <div class="kpi-value" style="color: #d97706;">${customRulesCount}</div>
            <div class="kpi-subtext"><span>Exceções por Produtor ou Evento</span></div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 2: Governança & Hierarquia de Resolução -->
      <section id="sec-taxas-governanca" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel" style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 20px;">
          <div style="font-weight: 700; color: #1e40af; font-size: 0.95rem; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <i class="ph-shield-check" style="font-size: 1.1rem;"></i>
            Hierarquia de Prioridade das Regras Comerciais & Separação de Acessos
          </div>
          <div style="font-size: 0.85rem; color: #1e3a8a; line-height: 1.5;">
            <strong>Ordem de Aplicação Automática:</strong> 1º Regra do Evento → 2º Regra do Produtor → 3º Regra Geral Disk.<br>
            <strong>Segurança de Dados:</strong> O custo MDR interno pago às adquirentes e a margem de spread são confidenciais do Financeiro Disk. O ambiente do Produtor visualiza exclusivamente as taxas contratuais comerciais que lhe são aplicadas.
          </div>
        </div>
      </section>

      <!-- SEÇÃO 3: Matriz de Tarifas & Regras Comerciais -->
      <section id="sec-taxas-matriz" class="scrollspy-section mb-4" data-scrollspy-section>

      <!-- Barra de Filtros e Busca -->
      <div class="card-panel" style="padding: 14px 20px; background: white; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Abrangência:</span>
            <select class="form-control" style="width: 170px; font-weight: 600;" onchange="window.app.setSpreadFilterScope(this.value)">
              <option value="all" ${filterScope === 'all' ? 'selected' : ''}>Todos os Escopos</option>
              <option value="Geral Disk" ${filterScope === 'Geral Disk' ? 'selected' : ''}>Geral Disk</option>
              <option value="Produtor" ${filterScope === 'Produtor' ? 'selected' : ''}>Por Produtor</option>
              <option value="Evento" ${filterScope === 'Evento' ? 'selected' : ''}>Por Evento</option>
            </select>

            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-left: 6px;">Adquirente:</span>
            <select class="form-control" style="width: 160px; font-weight: 600;" onchange="window.app.setSpreadFilterAcquirer(this.value)">
              <option value="all" ${filterAcquirer === 'all' ? 'selected' : ''}>Todas</option>
              <option value="Cielo" ${filterAcquirer === 'Cielo' ? 'selected' : ''}>Cielo</option>
              <option value="Rede" ${filterAcquirer === 'Rede' ? 'selected' : ''}>Rede</option>
              <option value="Stone" ${filterAcquirer === 'Stone' ? 'selected' : ''}>Stone</option>
              <option value="EfiPix" ${filterAcquirer === 'EfiPix' ? 'selected' : ''}>EfiPix</option>
              <option value="PagBank" ${filterAcquirer === 'PagBank' ? 'selected' : ''}>PagBank</option>
            </select>

            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-left: 6px;">Situação:</span>
            <select class="form-control" style="width: 140px; font-weight: 600;" onchange="window.app.setSpreadFilterStatus(this.value)">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Todas</option>
              <option value="Ativa" ${filterStatus === 'Ativa' ? 'selected' : ''}>🟢 Ativa</option>
              <option value="Inativa" ${filterStatus === 'Inativa' ? 'selected' : ''}>⚪ Inativa</option>
            </select>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted);">
            Exibindo <strong>${filtered.length}</strong> de <strong>${rules.length}</strong> regras cadastradas
          </div>
        </div>
      </div>

      <!-- Tabela Administrativa de Taxas & Regras Comerciais -->
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Matriz Vigente de Tarifas, MDR e Spreads Comerciais</h2>
            <p class="card-subtitle">Cadastre, edite, versione e aplique regras gerais, por produtor ou por evento com cálculo automático de spread líquido</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.app.p13Action('nova-taxa')">
            <i class="ph-plus me-1"></i> Nova Taxa
          </button>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Regra / Meio de Pagamento</th>
                  <th>Adquirente</th>
                  <th>Abrangência / Escopo</th>
                  <th style="text-align: right;">Taxa Cobrada</th>
                  <th style="text-align: right;">Custo MDR Disk</th>
                  <th style="text-align: right;">Spread Líquido</th>
                  <th>Quem Paga</th>
                  <th>Prazo</th>
                  <th>Vigência</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length > 0 ? filtered.map(t => {
                  const chargedRate = Number(t.chargedRate || 0);
                  const mdr = Number(t.mdr || 0);
                  const spread = chargedRate - mdr;
                  const fixedFee = Number(t.fixedFee || 0);

                  let scopeBadge = '<span class="badge badge-neutral">Geral Disk</span>';
                  if (t.scopeType === 'Produtor') {
                    const p = producers.find(x => x.id === t.scopeId);
                    scopeBadge = `<span class="badge badge-primary" title="Produtor: ${p?.name || t.scopeId}">Produtor: ${p ? p.name.slice(0, 16) + '...' : t.scopeId}</span>`;
                  } else if (t.scopeType === 'Evento') {
                    const e = events.find(x => x.id === t.scopeId);
                    scopeBadge = `<span class="badge badge-info" title="Evento: ${e?.name || t.scopeId}">Evento: ${e ? e.name.slice(0, 16) + '...' : t.scopeId}</span>`;
                  }

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.9rem;">${t.name}</div>
                        <div style="font-size: 0.72rem; color: #64748b;">
                          ${t.paymentMethod || 'Cartão'} · ${t.brand || 'Todas'} · ${t.installments || '1x'}
                          <span style="margin-left: 6px; font-family: monospace; color: #94a3b8;">${t.id} · v${t.version || 1}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-info" style="font-weight: 700;">${t.acquirer}</span>
                      </td>
                      <td>
                        ${scopeBadge}
                      </td>
                      <td style="text-align: right; font-weight: 800; font-size: 0.95rem; color: #1e293b;">
                        ${chargedRate.toFixed(2)}%
                      </td>
                      <td style="text-align: right; font-weight: 600; color: #dc2626; font-size: 0.9rem;">
                        ${mdr.toFixed(2)}%
                      </td>
                      <td style="text-align: right;">
                        <span class="badge badge-success" style="font-size: 0.85rem; font-weight: 800; padding: 4px 8px;">
                          +${spread.toFixed(2)}%
                        </span>
                        ${fixedFee > 0 ? `<div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">+ ${formatCurrency(fixedFee)} fixa</div>` : ''}
                      </td>
                      <td>
                        <span style="font-size: 0.82rem; font-weight: 600;">${t.payer || 'Produtor'}</span>
                      </td>
                      <td>
                        <span class="badge badge-neutral" style="font-size: 0.75rem;">${t.term || 'D+30'}</span>
                      </td>
                      <td style="font-size: 0.75rem; color: #64748b;">
                        ${t.validFrom ? `${t.validFrom}` : 'Imediata'}
                        ${t.validTo ? `<br>até ${t.validTo}` : ''}
                      </td>
                      <td style="text-align: center;">
                        <span class="badge ${t.status === 'Ativa' ? 'badge-success' : 'badge-neutral'}" style="font-weight: 700; padding: 4px 8px;">
                          ${t.status === 'Ativa' ? '🟢 Ativa' : '⚪ Inativa'}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="btn btn-outline-success btn-xs" title="Simular taxa e conferir spread" onclick="window.app.p19SimulateRule('${t.id}')">
                            <i class="ph-calculator"></i>
                          </button>
                          <button class="btn btn-outline-primary btn-xs" title="Editar taxa (cria nova versão v${(t.version||1)+1})" onclick="window.app.p13Action('editar-taxa', '${t.id}')">
                            <i class="ph-pencil"></i>
                          </button>
                          <button class="btn btn-outline-secondary btn-xs" title="Duplicar taxa" onclick="window.app.p13Action('duplicar-taxa', '${t.id}')">
                            <i class="ph-copy"></i>
                          </button>
                          <button class="btn btn-outline-warning btn-xs" title="Ativar / Inativar taxa" onclick="window.app.p13Action('status-taxa', '${t.id}')">
                            <i class="ph-power"></i>
                          </button>
                          <button class="btn btn-outline-info btn-xs" title="Histórico de versões" onclick="window.app.p13Action('historico-taxa', '${t.id}')">
                            <i class="ph-clock-counter-clockwise"></i>
                          </button>
                          <button class="btn btn-outline-danger btn-xs" title="Excluir taxa (somente se não tiver versões)" onclick="window.app.p13Action('excluir-taxa', '${t.id}')">
                            <i class="ph-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="11" style="text-align: center; padding: 32px; color: var(--text-muted);">
                      Nenhuma regra de taxa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </section>

      <!-- SEÇÃO 4: Simulador Rápido de Spread & Viabilidade -->
      <section id="sec-taxas-simulador" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Simulador de Spread Líquido & Margem Transacional</h2>
              <p class="card-subtitle">Calcule o impacto financeiro imediato entre a taxa cobrada do organizador/comprador e o custo MDR da adquirente</p>
            </div>
            <button class="btn btn-outline-primary btn-sm" onclick="window.app.p13Action('simular-spread')">
              <i class="ph-arrows-clockwise me-1"></i> Abrir Assistente Avançado
            </button>
          </div>
          <div class="card-body p-4">
            <div class="row g-3 align-items-center">
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-uppercase text-muted">Ticket Médio Simulado</label>
                <div class="input-group">
                  <span class="input-group-text">R$</span>
                  <input type="number" id="quickSimTicket" class="form-control fw-bold" value="150" step="10" oninput="window.app.runQuickTaxasSim()">
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-uppercase text-muted">Taxa Comercial Cobrada (%)</label>
                <div class="input-group">
                  <input type="number" id="quickSimCharged" class="form-control fw-bold" value="10.0" step="0.1" oninput="window.app.runQuickTaxasSim()">
                  <span class="input-group-text">%</span>
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label fs-xs fw-bold text-uppercase text-muted">Custo Adquirente MDR (%)</label>
                <div class="input-group">
                  <input type="number" id="quickSimMdr" class="form-control fw-bold" value="2.15" step="0.05" oninput="window.app.runQuickTaxasSim()">
                  <span class="input-group-text">%</span>
                </div>
              </div>
              <div class="col-md-3">
                <div class="p-3 rounded border text-center" style="background: #f0fdf4; border-color: #86efac;">
                  <span class="fs-xxs fw-bold text-success text-uppercase">Spread Líquido Apurado</span>
                  <div class="fs-4 fw-bold text-success" id="quickSimSpreadResult">+7.85%</div>
                  <span class="fs-xxs text-muted" id="quickSimMargemResult">Margem Disk: R$ 11,78 por ingresso</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 5: Políticas de Parcelamento & Prazos de Liquidação -->
      <section id="sec-taxas-politicas" class="scrollspy-section mb-4" data-scrollspy-section>
        <div class="card-panel">
          <div class="card-header-bar">
            <div class="card-title-group">
              <h2>Políticas de Parcelamento, Split & Prazos de Liquidação</h2>
              <p class="card-subtitle">Regras de repasse de juros, compensação de antecipação e prazos contratuais homologados</p>
            </div>
          </div>
          <div class="card-body p-4">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="fw-bold text-dark fs-sm mb-1 d-flex align-items-center gap-2">
                    <i class="ph-credit-card text-primary"></i> Parcelamento sem Juros
                  </div>
                  <p class="fs-xs text-muted mb-0">Custos de juros são absorvidos conforme parametrização comercial. A Disk antecipa ou repassa em fluxo D+30.</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="fw-bold text-dark fs-sm mb-1 d-flex align-items-center gap-2">
                    <i class="ph-hourglass-high text-warning"></i> Prazo Padrão de Recebimento
                  </div>
                  <p class="fs-xs text-muted mb-0">Cartão de Crédito à Vista: D+30. PIX Direto: D+0. Antecipação opcional a 2,5% a.m. com trava de saldo.</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="fw-bold text-dark fs-sm mb-1 d-flex align-items-center gap-2">
                    <i class="ph-shield-check text-success"></i> Trava de Segurança Antifraude
                  </div>
                  <p class="fs-xs text-muted mb-0">Retenção de reserva técnica obrigatória (5% a 10%) para mitigação de chargebacks até 30 dias após o evento.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  `;
}

// 12. ESTORNOS E CHARGEBACKS (Visão Mesa Disk)
export function renderDiskEstornos(state, filter = 'estornos') {
  const disputes = state.data.chargebacksAndRefunds;
  return `
    ${createHeader('12. Monitoramento de Estornos & Chargebacks', 'Disputas com operadoras de cartão, retenções cautelares e defesa de contestações.', filter)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>ID Disputa</th>
                  <th>Pedido</th>
                  <th>Evento</th>
                  <th>Comprador</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th style="text-align: right;">Impacto Financeiro</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${disputes.map(d => `
                  <tr>
                    <td class="font-monospace fw-bold text-danger">${d.id}</td>
                    <td class="font-monospace">${d.orderId}</td>
                    <td class="fw-semibold">${d.eventName}</td>
                    <td>${d.buyer}</td>
                    <td class="text-muted fs-xs">${d.date}</td>
                    <td>${d.type}</td>
                    <td style="text-align: right; font-weight: 800; color: #dc2626;">${d.impact}</td>
                    <td style="text-align: center;">${createStatusBadge(d.status)}</td>
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

// 13. CONCILIAÇÃO
export function renderDiskConciliacao(state, filter = 'dashboard') {
  const rec = state.data.reconciliation;
  return `
    ${createHeader('13. Central de Conciliação Multi-Nível', 'Cruzamento quadruplo entre Pedidos, Adquirentes, Livro-Razão Ledger e Extratos Bancários D-0.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Pedidos × Gateways</span></div>
          <div class="kpi-value" style="color: #059669;">${rec.ordersVsGateway.accuracy}</div>
          <div class="kpi-subtext"><span>${formatNumber(rec.ordersVsGateway.matched)} transações conciliadas</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Gateways × Ledger</span></div>
          <div class="kpi-value" style="color: #059669;">${rec.gatewayVsLedger.accuracy}</div>
          <div class="kpi-subtext"><span>Partidas dobradas confirmadas</span></div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Ledger × Extrato Banco</span></div>
          <div class="kpi-value" style="color: #2563eb;">${rec.ledgerVsBank.accuracy}</div>
          <div class="kpi-subtext"><span>Batimento Banco do Brasil / Itaú</span></div>
        </div>
      </div>
    </div>
  `;
}

// 14. CONTAS A PAGAR
export function renderDiskContasPagar(state, filter = 'overview') {
  return `
    ${createHeader('14. Contas a Pagar & Obrigações', 'Gestão de repasses a produtores, taxas de intermediação, fornecedores e lote de pagamentos.', filter)}
    <div class="limitless-content">
      <div class="card-panel p-4 text-center">
        <i class="ph-arrow-fat-line-down fs-1 text-primary mb-2"></i>
        <h4 class="fw-bold">Módulo de Contas a Pagar Operacional</h4>
        <p class="text-muted fs-sm">Todas as obrigações com produtores originadas da bilheteria são liquidadas automaticamente via esteira de aprovação ou lote bancário CNAB 240.</p>
        <button class="btn btn-primary" onclick="window.app.navigate('diskTesouraria')">Acessar Lote CNAB 240 &rarr;</button>
      </div>
    </div>
  `;
}

// 15. CONTAS A RECEBER
export function renderDiskContasReceber(state, filter = 'overview') {
  return `
    ${createHeader('15. Contas a Receber & Liquidação Adquirentes', 'Previsões de entrada de cartão de crédito à vista, parcelado e conciliação bancária PIX.', filter)}
    <div class="limitless-content">
      <div class="card-panel p-4 text-center">
        <i class="ph-arrow-fat-line-up fs-1 text-success mb-2"></i>
        <h4 class="fw-bold">Contas a Receber das Adquirentes</h4>
        <p class="text-muted fs-sm">Acompanhamento dos fluxos a compensar de Cielo, Rede Itaú, Stone e PagBank.</p>
        <button class="btn btn-primary" onclick="window.app.navigate('diskRecebiveis')">Ver Agenda de Recebíveis &rarr;</button>
      </div>
    </div>
  `;
}

// 18. BORDERÔS E FECHAMENTOS (Visão Backoffice)
export function renderDiskBordero(state, filter = 'aberto') {
  return renderDiskSolicitacoes(state, 'Borderô');
}

// 19. FLUXO DE CAIXA
export function renderDiskFluxoCaixa(state, filter = 'realizado') {
  return `
    ${createHeader('19. Fluxo de Caixa Realizado & Projetado', 'Projeção de liquidez D+30, entradas de vendas futuras e saídas programadas de repasses.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Saldo Líquido Atual</span></div>
          <div class="kpi-value" style="color: #059669;">${formatCurrency(state.data.consolidatedTotals.availableBalance)}</div>
          <div class="kpi-subtext"><span>Disponível em contas correntes</span></div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Entradas Previstas (30 Dias)</span></div>
          <div class="kpi-value" style="color: #2563eb;">${formatCurrency(state.data.consolidatedTotals.futureReceivables)}</div>
          <div class="kpi-subtext"><span>Cartões a liquidar pelas adquirentes</span></div>
        </div>
      </div>
    </div>
  `;
}

// 20. ASSINATURAS DIGITAIS (Central de Governança ICP-Brasil)
export function renderDiskAssinaturas(state, filter = 'aguardando_produtor') {
  const items = state.data.approvalQueue;
  return `
    ${createHeader('20. Governança de Assinaturas Digitais', 'Esteira formal ICP-Brasil: o Produtor assina primeiro e o Financeiro Disk assina SEMPRE por último.', filter)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Documento Formal</th>
                  <th>Produtor</th>
                  <th>1º Signatário (Produtor)</th>
                  <th>2º Signatário (Disk - Último)</th>
                  <th style="text-align: center;">Status</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td class="font-monospace fw-bold text-primary">${item.id}</td>
                    <td>
                      <div class="fw-bold">${item.documentTitle}</div>
                      <div class="fs-xxs text-muted">ID: ${item.documentId}</div>
                    </td>
                    <td>${item.producerName}</td>
                    <td>
                      ${item.signatures?.producer.signed ? `
                        <span class="badge bg-success"><i class="ph-check"></i> Assinado (${item.signatures.producer.signedAt})</span>
                      ` : `
                        <span class="badge bg-warning text-dark"><i class="ph-clock"></i> Pendente</span>
                      `}
                    </td>
                    <td>
                      ${item.signatures?.disk.signed ? `
                        <span class="badge bg-success"><i class="ph-check"></i> Assinado por Último</span>
                      ` : (!item.signatures?.producer.signed ? `
                        <span class="badge bg-secondary opacity-75"><i class="ph-lock"></i> Bloqueado (Aguardando Produtor)</span>
                      ` : `
                        <span class="badge bg-primary"><i class="ph-pencil"></i> Liberado p/ Assinatura</span>
                      `)}
                    </td>
                    <td style="text-align: center;">${createStatusBadge(item.status)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" onclick="window.app.openApprovalSheet('${item.id}')">
                        Abrir Termo &rarr;
                      </button>
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

// 22. AUDITORIA
export function renderDiskAuditoria(state, filter = 'log') {
  const entries = state.data.approvalQueue.flatMap(a => (a.auditTrail || []).map(t => ({ ...t, protocol: a.id })));
  return `
    ${createHeader('22. Trilha de Auditoria & Logs do Sistema', 'Rastreabilidade imutável de todas as decisões, alterações de taxas, assinaturas e transferências.', filter)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operação</th>
                  <th>Usuário / Ator</th>
                  <th>Ação Realizada</th>
                  <th>Detalhes do Registro</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map(e => `
                  <tr>
                    <td class="font-monospace text-muted fs-xs">${e.timestamp}</td>
                    <td class="fw-bold text-primary font-monospace">${e.protocol}</td>
                    <td class="fw-semibold">${e.actor}</td>
                    <td class="fw-bold">${e.action}</td>
                    <td class="text-muted fs-xs">${e.details || '-'}</td>
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

// 23. CONFIGURAÇÕES
export function renderDiskConfiguracoes(state, filter = 'regras') {
  return `
    ${createHeader('23. Parâmetros & Configurações da Mesa Financeira', 'Políticas globais de repasse, limites operacionais, alçadas de aprovação e calendário bancário.', filter)}
    <div class="limitless-content">
      <div class="card-panel p-4">
        <h5 class="fw-bold text-dark mb-3"><i class="ph-gear-six text-primary me-1"></i> Parâmetros Globais de Risco & Alçadas</h5>
        <div class="row g-3 fs-sm">
          <div class="col-md-6 p-3 bg-light rounded border">
            <strong>Alçada de Aprovação Nível 1 (Até R$ 100.000,00):</strong>
            <div class="text-muted fs-xs mt-1">Aprovação direta por Operador da Mesa Financeira com dupla assinatura obrigatória.</div>
          </div>
          <div class="col-md-6 p-3 bg-light rounded border">
            <strong>Alçada de Aprovação Nível 2 (Acima de R$ 100.000,00):</strong>
            <div class="text-muted fs-xs mt-1">Exige confirmação conjunta do Gerente de Risco / Administrador Master.</div>
          </div>
          <div class="col-md-6 p-3 bg-light rounded border">
            <strong>Trava de Segurança Sequencial:</strong>
            <div class="text-success fs-xs fw-bold mt-1">ATIVADA: O Financeiro Disk é estritamente impedido pelo sistema de assinar antes do Produtor.</div>
          </div>
          <div class="col-md-6 p-3 bg-light rounded border">
            <strong>Regra de Liquidação D-0:</strong>
            <div class="text-muted fs-xs mt-1">Repasses aprovados até 15h00 são liquidados no mesmo dia útil via PIX instantâneo.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// FORNECEDORES (Cadastro, Contratos, Documentos, Cotações, Pedidos, Recebimentos, Parcelas, Vencimentos)
export function renderDiskFornecedores(state, filter = 'cadastro') {
  const fornecedores = [
    { id: 'FORN-001', name: 'Master Security Segurança Ltda.', cnpj: '12.345.678/0001-90', category: 'Segurança Operacional', contract: 'CTR-2026-08', value: 45000, due: '15/10/2026', status: 'Ativo' },
    { id: 'FORN-002', name: 'Stage & Light Sonorização Profissional', cnpj: '98.765.432/0001-11', category: 'Infraestrutura de Palco', contract: 'CTR-2026-12', value: 82000, due: '20/10/2026', status: 'Ativo' },
    { id: 'FORN-003', name: 'Clean & Eco Serviços de Limpeza', cnpj: '44.555.666/0001-22', category: 'Higienização e Facilities', contract: 'CTR-2026-19', value: 18500, due: '25/10/2026', status: 'Em Análise' },
    { id: 'FORN-004', name: 'Ticketing Cloud Infraestrutura AWS', cnpj: '33.222.111/0001-33', category: 'Tecnologia / Cloud', contract: 'CTR-2026-01', value: 34000, due: '05/11/2026', status: 'Ativo' }
  ];

  return `
    ${createHeader('Gestão de Fornecedores & Contratos', 'Homologação de prestadores, gestão contratual, pedidos, parcelas e vencimentos.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Fornecedores Homologados</span></div>
          <div class="kpi-value">${fornecedores.length} PJ</div>
          <div class="kpi-subtext"><span>Cadastros ativos e validados</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Contratos Vigentes</span></div>
          <div class="kpi-value">R$ 179.500,00</div>
          <div class="kpi-subtext"><span>Compromissos acordados</span></div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Vencimentos do Mês</span></div>
          <div class="kpi-value">R$ 145.500,00</div>
          <div class="kpi-subtext"><span>Previsto na Tesouraria</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Cotações Abertas</span></div>
          <div class="kpi-value">3 Pedidos</div>
          <div class="kpi-subtext"><span>Em cotação com compras</span></div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Fornecedores &amp; Compromissos Contratuais</h2>
            <p class="card-subtitle">Filtro ativo: ${filter.toUpperCase()}</p>
          </div>
          <div class="d-flex gap-2">
            <span class="badge bg-primary text-white">4 Fornecedores Cadastrados</span>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Razão Social / Fornecedor</th>
                  <th>CNPJ</th>
                  <th>Categoria</th>
                  <th>Contrato</th>
                  <th style="text-align: right;">Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${fornecedores.map(f => `
                  <tr>
                    <td><code>${f.id}</code></td>
                    <td class="fw-bold text-dark">${f.name}</td>
                    <td class="text-muted fs-xs">${f.cnpj}</td>
                    <td><span class="badge bg-light text-dark">${f.category}</span></td>
                    <td><code>${f.contract}</code></td>
                    <td style="text-align: right;" class="fw-bold">${formatCurrency(f.value)}</td>
                    <td>${f.due}</td>
                    <td><span class="badge ${f.status === 'Ativo' ? 'bg-success' : 'bg-warning text-dark'}">${f.status}</span></td>
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

// CONTROLE FINANCEIRO (Centros de Custos, Orçamentos, Fluxo de Caixa, Projeção de Caixa, DRE Gerencial)
export function renderDiskControleFinanceiro(state, filter = 'centros_custos') {
  return `
    ${createHeader('Controle Financeiro, Orçamentos & DRE', 'Controladoria executiva, centros de custos, projeções de fluxo e DRE gerencial.', filter)}
    <div class="limitless-content">
      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-header"><span class="kpi-title">Receita Bruta Gerencial</span></div>
          <div class="kpi-value">R$ 1.540.000,00</div>
          <div class="kpi-subtext"><span>Volume consolidado apurado</span></div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-header"><span class="kpi-title">Spread & Taxas Disk</span></div>
          <div class="kpi-value" style="color: #059669;">R$ 154.000,00</div>
          <div class="kpi-subtext"><span>Take rate médio de 10%</span></div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-header"><span class="kpi-title">Custos de Processamento</span></div>
          <div class="kpi-value" style="color: #d97706;">R$ 38.500,00</div>
          <div class="kpi-subtext"><span>Adquirência, gateways e antifraude</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-title">Margem de Contribuição</span></div>
          <div class="kpi-value" style="color: #2563eb;">R$ 115.500,00</div>
          <div class="kpi-subtext"><span>75% de margem operacional</span></div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Demonstrativo de Resultado do Exercício (DRE Gerencial)</h2>
            <p class="card-subtitle">Visão consolidada da operação Disk Ingressos • Competência 2026</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Linha do DRE Gerencial</th>
                  <th style="text-align: right;">Valor Acumulado</th>
                  <th style="text-align: right;">% da Receita</th>
                  <th>Comentário / Detalhe</th>
                </tr>
              </thead>
              <tbody>
                <tr class="fw-bold" style="background: #f8fafc;">
                  <td>(+) Receita Bruta de Serviços (Taxas de Conveniência)</td>
                  <td style="text-align: right;" class="text-success">R$ 154.000,00</td>
                  <td style="text-align: right;">100.0%</td>
                  <td>Taxas contratuais sobre bilheteria total de R$ 1.54M</td>
                </tr>
                <tr>
                  <td class="ps-4">(-) Custos de Adquirência (MDR Médio 1,77%)</td>
                  <td style="text-align: right;" class="text-danger">-R$ 27.258,00</td>
                  <td style="text-align: right;">-17.7%</td>
                  <td>Cielo, Stone, Rede e Mercado Pago</td>
                </tr>
                <tr>
                  <td class="ps-4">(-) Custos Antifraude &amp; Gateway</td>
                  <td style="text-align: right;" class="text-danger">-R$ 11.242,00</td>
                  <td style="text-align: right;">-7.3%</td>
                  <td>R$ 0,35 por transação analisada</td>
                </tr>
                <tr class="fw-bold" style="background: #f0fdf4;">
                  <td>(=) Margem Operacional Líquida Disk</td>
                  <td style="text-align: right;" class="text-success fs-base">R$ 115.500,00</td>
                  <td style="text-align: right;" class="text-success">75.0%</td>
                  <td>Spread operacional retido pela Disk Ingressos</td>
                </tr>
                <tr>
                  <td class="ps-4">(+) Spread de Antecipações Financeiras</td>
                  <td style="text-align: right;" class="text-primary">+R$ 18.420,00</td>
                  <td style="text-align: right;">+12.0%</td>
                  <td>Spread de 1,22% sobre R$ 150k antecipados</td>
                </tr>
                <tr class="fw-bold" style="background: #eff6ff;">
                  <td>(=) EBITDA Financeiro Consolidado</td>
                  <td style="text-align: right;" class="text-primary fs-5">R$ 133.920,00</td>
                  <td style="text-align: right;" class="text-primary">87.0%</td>
                  <td>Resultado líquido operacional da operação financeira</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}
