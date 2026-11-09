'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { dateBR, Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

type OrderRow = {
  id: string;
  eventId: string;
  status: string;
  quantity: number;
  totalCents: number;
  channel: string;
  createdAt: string;
  event: { name: string };
  customer: { fullName: string };
};

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatorioVendasIngressosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventFilter, setEventFilter] = useState('TODOS');
  const [channelFilter, setChannelFilter] = useState('TODOS');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([get<{ items: OrderRow[] }>('pedidos'), get<EventSummary[]>('eventos')])
      .then(([o, e]) => {
        setOrders(o.items);
        setEvents(e);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (eventFilter !== 'TODOS' && o.eventId !== eventFilter) return false;
      if (channelFilter !== 'TODOS' && o.channel !== channelFilter) return false;
      return true;
    });
  }, [orders, eventFilter, channelFilter]);

  const totalAmountCents = filtered.reduce((acc, o) => acc + o.totalCents, 0);
  const totalTickets = filtered.reduce((acc, o) => acc + o.quantity, 0);

  function exportCsv() {
    const header = 'pedido_id,evento,cliente,canal,status,quantidade,valor_centavos,criado_em';
    const lines = filtered.map(
      (o) =>
        `${o.id},"${o.event.name.replace(/"/g, '""')}","${o.customer.fullName.replace(
          /"/g,
          '""'
        )}",${o.channel},${o.status},${o.quantity},${o.totalCents},${o.createdAt}`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-vendas-bravo-ii.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="b6">
      <Head
        title="REL-02 · Relatório de Vendas, Reservas e Ingressos por Canal"
        description="Consolidação real de pedidos por evento e canal (Online, PDV, Bilheteria) com exportação CSV."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/relatorios">
              Central de Relatórios (REL-01)
            </Link>
            <button type="button" className="b6-btn" onClick={exportCsv} disabled={!filtered.length}>
              Exportar CSV
            </button>
          </div>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Filtros do relatório">
          <Field name="Evento">
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
              <option value="TODOS">Todos os eventos</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Canal">
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="TODOS">Todos os canais</option>
              <option value="ONLINE">ONLINE</option>
              <option value="PDV">PDV</option>
              <option value="BILHETERIA">BILHETERIA</option>
            </select>
          </Field>
        </Panel>

        <Panel title="Agregações reais dos registros filtrados">
          <div className="b6-sublist">
            <div>
              <strong>Pedidos filtrados:</strong> {filtered.length}
            </div>
            <div>
              <strong>Quantidade total de ingressos:</strong> {totalTickets}
            </div>
            <div>
              <strong>Volume financeiro (pedidos filtrados):</strong> {real(totalAmountCents)}
            </div>
          </div>
        </Panel>
      </div>

      <section className="b6-panel" style={{ marginTop: 18 }}>
        <h2>Detalhamento de vendas e reservas ({filtered.length})</h2>
        {filtered.length ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Canal</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/pedidos/${o.id}`}>{o.id.slice(0, 8)}…</Link>
                    </td>
                    <td>{o.event.name}</td>
                    <td>{o.customer.fullName}</td>
                    <td>{o.channel}</td>
                    <td>{o.quantity}</td>
                    <td>{real(o.totalCents)}</td>
                    <td>{o.status}</td>
                    <td>{dateBR(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty message="Nenhum registro encontrado para os filtros informados." />
        )}
      </section>
    </main>
  );
}
