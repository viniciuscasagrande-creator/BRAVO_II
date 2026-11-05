import { formatCurrency } from '../../formatters.js';

export const reportTitles = {
  extrato: 'Extrato Financeiro',
  evento: 'Relatórios por Evento',
  produtor: 'Relatórios por Produtor',
  consolidado: 'Relatório Consolidado',
  receitas: 'Receitas',
  despesas: 'Despesas',
  taxas: 'Taxas',
  repasses: 'Repasses',
  antecipacoes: 'Antecipações'
};

export function reportType(route) {
  if (route === 'diskRelatorios') return 'consolidado';
  const type = String(route || '').replace(/^diskRelatorios_/, '');
  return String(route || '').startsWith('diskRelatorios_') && Object.hasOwn(reportTitles, type) ? type : null;
}

const escape = value => String(value ?? '—').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function dateKey(value) {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value || '');
  return parts ? [parts[3], parts[2], parts[1]].join('-') : /^(\d{4}-\d{2}-\d{2})/.exec(value || '')?.[1] || '';
}

const amount = value => value == null ? null : Math.round(Number(value) * 100);
const displayMoney = cents => cents == null ? '—' : formatCurrency(cents / 100);

export function getReport(state, type, filters = {}) {
  const data = state.data;
  const events = new Map((data.events || []).map(event => [event.id, event]));
  const eventNames = new Map([...events.values()].map(event => [event.name, event]));
  const producers = new Map((data.producers || []).map(producer => [producer.id, producer.name]));
  const approvals = data.approvalQueue || [];
  const history = data.anticipations?.history || [];
  const approvalIds = new Set(approvals.map(item => item.id));

  const normalize = row => {
    const event = events.get(row.eventId) || eventNames.get(row.eventName);
    const producerId = row.producerId || event?.producerId;
    return {
      ...row,
      eventId: row.eventId || event?.id,
      eventName: event?.name || row.eventName,
      producerId,
      producerName: producers.get(producerId) || row.producerName
    };
  };
  const statement = (data.statementEntries || []).map(entry => normalize({
    ...entry,
    reference: entry.orderRef || entry.protocol,
    gross: amount(entry.grossAmount ?? entry.amount),
    fee: amount(entry.deductions),
    net: amount(entry.netAmount ?? entry.amount)
  }));

  let rows = statement;
  let description = 'Movimentações registradas no extrato da demonstração.';
  let moneyColumns = [['gross', 'Bruto'], ['fee', 'Deduções'], ['net', 'Líquido']];

  if (type === 'receitas') {
    rows = statement.filter(row => /^venda/i.test(row.type));
    description = 'Vendas registradas no extrato. Consulte o status para distinguir valores liquidados.';
  }
  if (type === 'despesas') {
    rows = (data.payables || []).map(entry => normalize({
      ...entry, date: entry.dueDate, type: entry.category || 'Conta a pagar',
      reference: entry.creditor, gross: amount(entry.amount)
    }));
    description = 'Títulos de contas a pagar por vencimento. Títulos sem vínculo só aparecem no escopo geral.';
    moneyColumns = [['gross', 'Valor do título']];
  }
  if (type === 'taxas') {
    rows = statement.filter(row => row.fee > 0).map(row => ({ ...row, type: 'Dedução no extrato' }));
    description = 'Deduções lançadas no extrato. A base de demonstração apresenta o valor agregado da dedução.';
    moneyColumns = [['gross', 'Base bruta'], ['fee', 'Dedução registrada']];
  }
  if (type === 'repasses' || type === 'antecipacoes') {
    const isPayout = type === 'repasses';
    const entries = approvals.filter(item => item.type === (isPayout ? 'Repasse' : 'Antecipação'));
    if (isPayout) {
      const existing = new Set(entries.flatMap(item => [item.id, item.protocol]).filter(Boolean));
      entries.push(...statement.filter(row => /^repasse/i.test(row.type) && !existing.has(row.reference)).map(row => ({
        ...row, id: row.reference || row.id, requestDate: row.date,
        requestedAmount: Math.abs(row.net ?? row.gross ?? 0) / 100
      })));
    } else {
      entries.push(...history.filter(item => !approvalIds.has(item.id)));
    }
    rows = entries.map(item => normalize({
      ...item, date: item.requestDate, type: isPayout ? 'Repasse' : 'Antecipação',
      reference: item.liquidationId || item.protocol || item.reference,
      gross: amount(item.requestedAmount ?? item.grossRequested),
      fee: amount(item.discountFee ?? item.feeDeducted),
      net: amount(item.netAmount ?? item.netDisbursed ?? item.netReleased)
    }));
    description = isPayout
      ? 'Solicitações e repasses registrados no extrato. O status indica a etapa da operação.'
      : 'Solicitações da fila financeira e histórico de antecipações, sem duplicar protocolos.';
    moneyColumns = isPayout ? [['gross', 'Valor do repasse']]
      : [['gross', 'Valor solicitado'], ['fee', 'Custo'], ['net', 'Líquido informado']];
  }

  const { selectedProducerId, selectedEventId } = state;
  const scoped = rows.filter(row =>
    (!selectedProducerId || selectedProducerId === 'all' || row.producerId === selectedProducerId)
    && (!selectedEventId || selectedEventId === 'all' || row.eventId === selectedEventId));
  const search = filters.search?.trim().toLocaleLowerCase('pt-BR');
  const filtered = scoped.filter(row => {
    const date = dateKey(row.date);
    return (!filters.from || date && date >= filters.from)
      && (!filters.to || date && date <= filters.to)
      && (!filters.status || row.status === filters.status)
      && (!search || [row.id, row.type, row.eventName, row.producerName, row.reference, row.paymentMethod]
        .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search)));
  }).sort((first, second) => dateKey(second.date).localeCompare(dateKey(first.date)));

  const groupKey = { evento: 'eventName', produtor: 'producerName', consolidado: 'type' }[type];
  const groups = new Map();
  if (groupKey) {
    description = 'Resumo dos lançamentos do extrato no recorte. Inclui movimentações de caixa e operações a liquidar conforme o status registrado.';
    for (const row of filtered) {
      const key = row[groupKey] || 'Sem identificação';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
  }

  return {
    rows: filtered, groups, description, moneyColumns,
    statuses: [...new Set(scoped.map(row => row.status).filter(Boolean))].sort()
  };
}

const fields = [
  ['date', 'Data'], ['id', 'Identificador'], ['producerName', 'Produtor'],
  ['eventName', 'Evento'], ['type', 'Operação'], ['status', 'Status']
];

function total(rows, key) {
  const values = rows.map(row => row[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export function reportCsv(report) {
  const columns = [...fields, ['reference', 'Referência'], ['paymentMethod', 'Meio de pagamento'], ...report.moneyColumns];
  const quote = value => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [
    columns.map(([, label]) => quote(label)),
    ...report.rows.map(row => columns.map(([key]) => {
      if (!report.moneyColumns.some(([moneyKey]) => moneyKey === key)) return quote(row[key]);
      return row[key] == null ? '""' : '"' + (row[key] / 100).toFixed(2).replace('.', ',') + '"';
    }))
  ].map(row => row.join(';')).join('\r\n');
}

export function renderDiskReport() {
  return `
    <section class="limitless-content" data-disk-report>
      <p class="text-muted">Dados de demonstração. Use os seletores no cabeçalho para definir produtor e evento.</p>
      <form class="card-panel p-3 mb-3" aria-label="Filtros do relatório">
        <div class="row g-2 align-items-end">
          <label class="col-sm"><span>De</span><input class="form-control" type="date" name="from"></label>
          <label class="col-sm"><span>Até</span><input class="form-control" type="date" name="to"></label>
          <label class="col-sm"><span>Status</span><select class="form-select" name="status"></select></label>
          <label class="col-sm"><span>Busca</span><input class="form-control" type="search" name="search" placeholder="ID, evento ou operação"></label>
          <div class="col-auto d-flex flex-wrap gap-2">
            <button class="btn btn-primary" type="submit">Aplicar filtros</button>
            <button class="btn btn-outline-secondary" type="reset">Limpar</button>
            <button class="btn btn-outline-primary" type="button" data-export disabled>Exportar CSV</button>
          </div>
        </div>
      </form>
      <p data-report-status role="status"></p>
      <div data-report-results></div>
    </section>`;
}

function renderResults(report) {
  const { rows, groups, moneyColumns } = report;
  const columns = [...fields, ...moneyColumns];
  const monetary = new Set(moneyColumns.map(([key]) => key));
  const headings = list => list.map(label => `<th scope="col">${escape(label)}</th>`).join('');
  const groupSummary = groups.size ? `
    <div class="table-responsive mb-3"><table class="limitless-table">
      <caption class="caption-top">Resumo do recorte</caption>
      <thead><tr>${headings(['Grupo', 'Registros', ...moneyColumns.map(([, label]) => label)])}</tr></thead>
      <tbody>${[...groups].map(([name, entries]) => `<tr><th scope="row">${escape(name)}</th><td>${entries.length}</td>
        ${moneyColumns.map(([key]) => `<td>${displayMoney(total(entries, key))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>` : '';

  return `<p class="text-muted">${escape(report.description)}</p>${groupSummary}
    <div class="table-responsive"><table class="limitless-table">
      <caption class="caption-top">Registros do recorte</caption>
      <thead><tr>${headings([...columns.map(([, label]) => label), 'Detalhes'])}</tr></thead>
      <tbody>${rows.map(row => `<tr>
        ${columns.map(([key]) => `<td>${monetary.has(key) ? displayMoney(row[key]) : escape(row[key])}</td>`).join('')}
        <td><details><summary>Ver ${escape(row.id)}</summary><dl>
          ${[
            ['Referência', row.reference], ['Meio de pagamento', row.paymentMethod],
            ['Descrição', row.description || row.notes], ['Data de pagamento', row.paidDate],
            ['Data informada no histórico', row.effectiveDate || row.disbursementDate]
          ].filter(([, value]) => value).map(([label, value]) => `<dt>${label}</dt><dd>${escape(value)}</dd>`).join('') || '<dd>Sem detalhes adicionais na base.</dd>'}
        </dl></details></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row" colspan="${fields.length}">Total do recorte</th>
        ${moneyColumns.map(([key]) => `<td>${displayMoney(total(rows, key))}</td>`).join('')}<td></td></tr></tfoot>
    </table></div>`;
}

export function mountDiskReport(root, state, type, filters) {
  const form = root.querySelector('form');
  const status = root.querySelector('[data-report-status]');
  const results = root.querySelector('[data-report-results]');
  const exportButton = root.querySelector('[data-export]');
  const available = getReport(state, type);
  if (filters.status && !available.statuses.includes(filters.status)) available.statuses.push(filters.status);
  form.elements.status.innerHTML = '<option value="">Todos</option>' +
    available.statuses.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join('');
  for (const [key, value] of Object.entries(filters)) form.elements[key].value = value;

  let report;
  const update = () => {
    report = getReport(state, type, filters);
    status.textContent = report.rows.length
      ? `${report.rows.length} registro(s) no recorte.`
      : 'Nenhum registro encontrado. Ajuste os filtros ou selecione outro produtor ou evento.';
    results.innerHTML = report.rows.length ? renderResults(report) : '';
    exportButton.disabled = report.rows.length === 0;
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(form));
    if (next.from && next.to && next.from > next.to) {
      status.textContent = 'A data inicial deve ser anterior ou igual à data final.';
      return;
    }
    Object.assign(filters, next);
    update();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    for (const key of ['from', 'to', 'status', 'search']) {
      delete filters[key];
      form.elements[key].value = '';
    }
    update();
  });
  exportButton.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${type}.csv`;
    root.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
}
