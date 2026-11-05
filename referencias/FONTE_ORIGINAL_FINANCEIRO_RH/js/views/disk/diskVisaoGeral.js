import { formatCurrency } from '../../formatters.js';

function ctx(state) {
  const producerId = state.selectedProducerId;
  const eventId = state.selectedEventId;
  let events = state.data.events || [];
  if (producerId && producerId !== 'all') {
    events = events.filter(e => e.producerId === producerId);
  }
  if (eventId && eventId !== 'all') {
    events = events.filter(e => e.id === eventId);
  }
  const producerIds = [...new Set(events.map(e => e.producerId))];
  const producers = (state.data.producers || []).filter(p =>
    producerId === 'all' || !producerId ? producerIds.includes(p.id) : p.id === producerId
  );
  const sum = k => events.reduce((a, e) => a + (Number(e[k]) || 0), 0);
  const gross = sum('grossSales');
  const available = sum('availableBalance');
  const receivables = sum('futureReceivables');
  const blocked = sum('blockedBalance');
  const obligations = sum('totalBalance');
  const chargebacks = sum('chargebacks');
  const approvals = (state.data.approvalQueue || []).filter(a =>
    (producerId === 'all' || !producerId || a.producerId === producerId) &&
    (eventId === 'all' || !eventId || a.eventId === eventId)
  );
  const pending = approvals.filter(a => !['Pago', 'Recusado', 'Rejeitado', 'Concluído'].includes(a.status));
  const label = eventId !== 'all' && eventId
    ? (state.data.events.find(e => e.id === eventId)?.name || 'Evento')
    : (producerId && producerId !== 'all'
      ? (state.data.producers.find(p => p.id === producerId)?.name || 'Produtor')
      : 'Disk Ingressos — Consolidado');

  return { events, producers, gross, available, receivables, blocked, obligations, chargebacks, pending, label };
}

const card = (title, value, sub, action) => `
  <div class="kpi-card" ${action ? `style="cursor:pointer" onclick="${action}"` : ''}>
    <div class="kpi-header"><span class="kpi-title">${title}</span></div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-subtext"><span>${sub}</span></div>
  </div>`;

const head = (title, desc, label) => `
  <div class="limitless-page-header">
    <div class="breadcrumbs">
      <span>Financeiro Disk</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-active">Visão Geral</span>
    </div>
    <div class="page-title-row">
      <div class="page-title-group">
        <h1>${title}</h1>
        <p class="page-title-desc">${desc}</p>
      </div>
      <span class="badge bg-primary-subtle text-primary" style="font-size: 0.85rem; padding: 6px 12px; border: 1px solid rgba(59,130,246,0.3); border-radius: 6px;">Contexto: ${label}</span>
    </div>
  </div>`;

export function renderDiskPosicaoGeral(state) {
  const c = ctx(state);
  const liquida = c.available + c.receivables - c.blocked;
  return `
    ${head('Posição Geral', 'Fotografia financeira consolidada: disponibilidades, recebíveis, obrigações, reservas e posição líquida.', c.label)}
    <div class="limitless-content">
      <div class="kpi-grid">
        ${card('Disponível', formatCurrency(c.available), 'Recursos compensados', "window.app.setDiskBalanceTab('disponivel')")}
        ${card('Recebíveis', formatCurrency(c.receivables), 'Valores a liquidar', "window.app.navigate('diskRecebiveis')")}
        ${card('Bloqueado / Reservado', formatCurrency(c.blocked), 'Valores indisponíveis', "window.app.setDiskBalanceTab('bloqueado')")}
        ${card('Posição Líquida', formatCurrency(liquida), 'Disponível + recebíveis − bloqueios')}
      </div>
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Composição por Evento</h2>
            <p class="card-subtitle">Drill-down da posição no contexto selecionado.</p>
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Produtor</th>
                  <th style="text-align: right;">Disponível</th>
                  <th style="text-align: right;">A Receber</th>
                  <th style="text-align: right;">Bloqueado</th>
                  <th style="text-align: right;">Posição</th>
                </tr>
              </thead>
              <tbody>
                ${c.events.map(e => `
                  <tr>
                    <td><b>${e.name}</b></td>
                    <td>${e.producerName}</td>
                    <td style="text-align: right; font-weight: 700; color: #059669;">${formatCurrency(e.availableBalance)}</td>
                    <td style="text-align: right; color: #2563eb;">${formatCurrency(e.futureReceivables)}</td>
                    <td style="text-align: right; color: #dc2626;">${formatCurrency(e.blockedBalance)}</td>
                    <td style="text-align: right; font-weight: 800;">${formatCurrency(e.totalBalance)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="6" style="text-align: center; padding: 24px;">Nenhum evento no contexto selecionado.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
}

export function renderDiskIndicadores(state) {
  const c = ctx(state);
  const net = c.events.reduce((a, e) => a + (Number(e.netRevenue) || 0), 0);
  const fees = c.events.reduce((a, e) => a + (Number(e.diskFees) || 0), 0);
  const margin = c.gross ? ((net / c.gross) * 100) : 0;
  const feeRate = c.gross ? ((fees / c.gross) * 100) : 0;
  const cbRate = c.gross ? ((c.chargebacks / c.gross) * 100) : 0;
  const conc = (state.data.conciliationItems || []);
  const concOk = conc.length ? Math.round(conc.filter(x => /concili/i.test(x.status || '')).length / conc.length * 100) : 0;

  return `
    ${head('Indicadores Financeiros', 'KPIs de desempenho calculados a partir do mesmo contexto e das operações do Financeiro Disk.', c.label)}
    <div class="limitless-content">
      <div class="kpi-grid">
        ${card('Margem líquida', margin.toFixed(2).replace('.', ',') + '%', 'Receita líquida / volume bruto')}
        ${card('Taxa Disk efetiva', feeRate.toFixed(2).replace('.', ',') + '%', 'Taxas / volume bruto', "window.app.navigate('diskSpread')")}
        ${card('Chargeback financeiro', cbRate.toFixed(2).replace('.', ',') + '%', 'Impacto sobre volume bruto', "window.app.navigate('diskCentralEstornos')")}
        ${card('Pendências operacionais', String(c.pending.length), 'Fila no contexto', "window.app.navigate('diskAprovacoes')")}
      </div>
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Indicadores com origem rastreável</h2>
            <p class="card-subtitle">Cada KPI aponta para o módulo responsável pelo dado.</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px">
            ${card('Volume bruto', formatCurrency(c.gross), 'Origem: eventos e vendas')}
            ${card('Receita líquida', formatCurrency(net), 'Origem: eventos / Ledger')}
            ${card('Recebíveis futuros', formatCurrency(c.receivables), 'Origem: adquirentes', "window.app.navigate('diskRecebiveis')")}
            ${card('Conciliação automática', concOk + '%', 'Origem: Central de Conciliação', "window.app.navigate('diskConciliacao')")}
          </div>
        </div>
      </div>
    </div>`;
}

export function renderDiskInteligencia(state) {
  const c = ctx(state);
  const alerts = [];
  if (c.pending.length) {
    alerts.push({
      level: 'warning',
      title: `${c.pending.length} operação(ões) aguardam tratamento`,
      text: 'Existem solicitações ainda abertas no contexto selecionado.',
      go: "window.app.navigate('diskAprovacoes')",
      label: 'Abrir Aprovações'
    });
  }
  if (c.blocked > 0) {
    alerts.push({
      level: 'warning',
      title: `${formatCurrency(c.blocked)} bloqueados ou reservados`,
      text: 'Revise reservas, chargebacks e bloqueios antes de liberar novos valores.',
      go: "window.app.setDiskBalanceTab('bloqueado')",
      label: 'Ver bloqueios'
    });
  }
  if (c.receivables > c.available) {
    alerts.push({
      level: 'info',
      title: 'Recebíveis superam o disponível imediato',
      text: `Há ${formatCurrency(c.receivables)} a receber contra ${formatCurrency(c.available)} disponíveis.`,
      go: "window.app.navigate('diskRecebiveis')",
      label: 'Ver recebíveis'
    });
  }
  if (c.chargebacks > 0) {
    alerts.push({
      level: 'danger',
      title: `Impacto de ${formatCurrency(c.chargebacks)} em chargebacks`,
      text: 'O valor reduz a posição financeira e deve permanecer conciliado com gateway e Ledger.',
      go: "window.app.navigate('diskCentralEstornos')",
      label: 'Analisar estornos'
    });
  }
  if (!alerts.length) {
    alerts.push({
      level: 'success',
      title: 'Nenhuma anomalia operacional relevante',
      text: 'Os dados atuais não acionaram as regras de atenção configuradas.',
      go: "window.app.navigate('diskDashboard')",
      label: 'Voltar ao Dashboard'
    });
  }

  const alertColors = {
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' }
  };

  return `
    ${head('Inteligência Financeira', 'Leitura orientada por regras sobre os dados existentes; cada alerta leva ao módulo responsável.', c.label)}
    <div class="limitless-content">
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Achados e prioridades</h2>
            <p class="card-subtitle">Não altera saldos nem Ledger; identifica situações que merecem ação.</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${alerts.map(a => {
              const cStyle = alertColors[a.level] || alertColors.info;
              return `
                <div style="background: ${cStyle.bg}; border: 1px solid ${cStyle.border}; color: ${cStyle.text}; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px;">${a.title}</div>
                    <div style="font-size: 0.85rem; opacity: 0.9;">${a.text}</div>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="${a.go}" style="white-space: nowrap;">${a.label} →</button>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="card-panel">
        <div class="card-header-bar">
          <div class="card-title-group">
            <h2>Base analisada</h2>
          </div>
        </div>
        <div class="card-body">
          <div style="font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">
            <b>${c.events.length}</b> evento(s) • <b>${formatCurrency(c.gross)}</b> processados • <b>${formatCurrency(c.receivables)}</b> a receber • <b>${c.pending.length}</b> pendência(s).<br>
            <span style="color: var(--text-muted); font-size: 0.82rem;">Todos os cálculos respeitam o Produtor e Evento selecionados no cabeçalho do sistema.</span>
          </div>
        </div>
      </div>
    </div>`;
}
