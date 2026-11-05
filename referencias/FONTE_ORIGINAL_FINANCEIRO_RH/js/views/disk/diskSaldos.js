import { formatCurrency } from '../../formatters.js';

function btn(key, label, active) {
  return `<button class="btn btn-sm ${active === key ? 'btn-primary' : 'btn-outline-secondary'}" onclick="window.app.setDiskBalanceTab('${key}')">${label}</button>`;
}

export function renderDiskSaldos(state, activeTab = 'consolidado') {
  const producers = state.data.producers || [];
  const events = state.data.events || [];
  const selectedProducerId = state.selectedProducerId || 'all';
  const selectedEventId = state.selectedEventId || 'all';
  const pending = (state.data.approvalQueue || []).filter(x => !['Pago', 'Rejeitado', 'Recusado'].includes(x.status));

  const reservedByProducer = id => pending.filter(x => x.producerId === id).reduce((s, x) => s + Number(x.requestedAmount || x.netAmount || 0), 0);
  const transitByProducer = id => pending.filter(x => x.producerId === id && (x.approvedBy || x.signatures?.producer?.signed)).reduce((s, x) => s + Number(x.requestedAmount || x.netAmount || 0), 0);

  const total = (field) => producers.reduce((s, p) => s + Number(p.totals?.[field] || 0), 0);
  const totalReserved = producers.reduce((s, p) => s + reservedByProducer(p.id), 0);
  const totalTransit = producers.reduce((s, p) => s + transitByProducer(p.id), 0);

  let rows = [];
  if (activeTab === 'por-evento' || activeTab === 'evento') {
    rows = events.filter(e => (selectedProducerId === 'all' || e.producerId === selectedProducerId) && (selectedEventId === 'all' || e.id === selectedEventId)).map(e => ({
      id: e.id,
      name: e.name,
      sub: e.producerName || '',
      total: e.totalBalance,
      available: e.availableBalance,
      receivable: e.futureReceivables,
      blocked: e.blockedBalance || 0,
      reserved: pending.filter(x => x.eventId === e.id).reduce((s, x) => s + Number(x.requestedAmount || x.netAmount || 0), 0),
      transit: pending.filter(x => x.eventId === e.id && (x.approvedBy || x.signatures?.producer?.signed)).reduce((s, x) => s + Number(x.requestedAmount || x.netAmount || 0), 0),
      type: 'event'
    }));
  } else {
    rows = producers.filter(p => activeTab === 'consolidado' || selectedProducerId === 'all' || p.id === selectedProducerId).map(p => ({
      id: p.id,
      name: p.name,
      sub: p.cnpj,
      total: p.totals.totalBalance,
      available: p.totals.availableBalance,
      receivable: p.totals.futureReceivables,
      blocked: p.totals.blockedBalance || 0,
      reserved: reservedByProducer(p.id),
      transit: transitByProducer(p.id),
      risk: p.rating,
      type: 'producer'
    }));

    if (activeTab === 'disponivel') rows = rows.filter(r => r.available > 0);
    if (activeTab === 'a-receber') rows = rows.filter(r => r.receivable > 0);
    if (activeTab === 'bloqueado') rows = rows.filter(r => r.blocked > 0);
    if (activeTab === 'em-reserva') rows = rows.filter(r => r.reserved > 0);
    if (activeTab === 'transito') rows = rows.filter(r => r.transit > 0);
  }

  const producerOptions = [
    `<option value="all" ${selectedProducerId === 'all' ? 'selected' : ''}>Todos os produtores</option>`,
    ...producers.map(p => `<option value="${p.id}" ${selectedProducerId === p.id ? 'selected' : ''}>${p.name}</option>`)
  ].join('');

  const eventOptions = [
    `<option value="all" ${selectedEventId === 'all' ? 'selected' : ''}>Todos os eventos</option>`,
    ...events.filter(e => selectedProducerId === 'all' || e.producerId === selectedProducerId).map(e => `<option value="${e.id}" ${selectedEventId === e.id ? 'selected' : ''}>${e.name}</option>`)
  ].join('');

  const currentTab = (activeTab === 'evento' ? 'por-evento' : (activeTab === 'produtor' ? 'por-produtor' : activeTab));

  return `
    <div class="limitless-page-header">
      <div class="breadcrumbs">
        <span>Financeiro Disk</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-active">Saldos por Produtor & por Evento</span>
      </div>
      <div class="page-title-row">
        <div class="page-title-group">
          <h1>Saldos por Produtor & por Evento</h1>
          <p class="page-title-desc">Consolidação funcional de saldos disponíveis, recebíveis, bloqueios, reservas e valores em trânsito.</p>
        </div>
      </div>
    </div>

    <div class="limitless-content">
      <div class="card-panel" style="padding:14px 18px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <select class="form-control" style="max-width:290px" onchange="window.app.selectProducerInDisk(this.value)">${producerOptions}</select>
          <select class="form-control" style="max-width:290px" onchange="window.app.setSelectedEvent(this.value)">${eventOptions}</select>
          <button class="btn btn-outline-secondary" onclick="window.app.refreshData()">↻ Atualizar</button>
          <button class="btn btn-primary" onclick="window.app.navigate('diskAprovacoes')">Central de Aprovações</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-title">Passivo total em custódia</div>
          <div class="kpi-value">${formatCurrency(total('totalBalance'))}</div>
          <div class="kpi-subtext">Saldo total sob custódia da Disk</div>
        </div>
        <div class="kpi-card success-accent">
          <div class="kpi-title">Disponível para repasse imediato</div>
          <div class="kpi-value" style="color:#059669">${formatCurrency(total('availableBalance'))}</div>
          <div class="kpi-subtext">Liberado para operações</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Recebíveis futuros</div>
          <div class="kpi-value" style="color:#2563eb">${formatCurrency(total('futureReceivables'))}</div>
          <div class="kpi-subtext">Fluxo a liquidar</div>
        </div>
        <div class="kpi-card warning-accent">
          <div class="kpi-title">Bloqueado + reservas</div>
          <div class="kpi-value" style="color:#b45309">${formatCurrency(total('blockedBalance') + totalReserved)}</div>
          <div class="kpi-subtext">Bloqueios e solicitações reservadas</div>
        </div>
      </div>

      <div class="card-panel">
        <div class="card-header-bar">
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            ${btn('consolidado', 'Consolidado', currentTab)}
            ${btn('por-produtor', 'Por Produtor', currentTab)}
            ${btn('por-evento', 'Por Evento', currentTab)}
            ${btn('disponivel', 'Disponível', currentTab)}
            ${btn('a-receber', 'A Receber', currentTab)}
            ${btn('bloqueado', 'Bloqueado', currentTab)}
            ${btn('em-reserva', 'Em Reserva', currentTab)}
            ${btn('transito', 'Valores em Trânsito', currentTab)}
          </div>
        </div>
        <div class="card-body card-body-no-padding">
          <div class="table-responsive">
            <table class="limitless-table">
              <thead>
                <tr>
                  <th>${currentTab === 'por-evento' ? 'Evento / Produção' : 'Produtor'}</th>
                  <th style="text-align:right">Saldo Total</th>
                  <th style="text-align:right">Disponível</th>
                  <th style="text-align:right">A Receber</th>
                  <th style="text-align:right">Bloqueado</th>
                  <th style="text-align:right">Em Reserva</th>
                  <th style="text-align:right">Em Trânsito</th>
                  <th style="text-align:right">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map(r => `
                  <tr>
                    <td>
                      <strong>${r.name}</strong>
                      <div class="text-muted fs-xs">${r.sub || ''}</div>
                    </td>
                    <td style="text-align:right;font-weight:700">${formatCurrency(r.total)}</td>
                    <td style="text-align:right;color:#059669;font-weight:700">${formatCurrency(r.available)}</td>
                    <td style="text-align:right;color:#2563eb">${formatCurrency(r.receivable)}</td>
                    <td style="text-align:right;color:#b45309">${formatCurrency(r.blocked)}</td>
                    <td style="text-align:right">${formatCurrency(r.reserved)}</td>
                    <td style="text-align:right">${formatCurrency(r.transit)}</td>
                    <td style="text-align:right">
                      ${r.type === 'producer' 
                        ? `<button class="btn btn-primary btn-sm" onclick="window.app.openProducerDossier('${r.id}')">Ver Dossiê →</button>`
                        : `<button class="btn btn-outline-primary btn-sm" onclick="window.app.openExceptionalPayoutAuthorization('${r.id}')" title="Autorizar Exceção Administrativa (Mesa Disk)">Autorizar Exceção →</button>`
                      }
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="8" style="text-align:center;padding:28px;color:var(--text-muted)">
                      Nenhum registro corresponde ao filtro selecionado.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card-panel" style="padding:14px 18px">
        <strong>Resumo do filtro:</strong> ${rows.length} registro(s) • Reservas: ${formatCurrency(totalReserved)} • Em trânsito: ${formatCurrency(totalTransit)}
      </div>
    </div>
  `;
}
