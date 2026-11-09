'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { get } from '../../../../lib/bravo-api';
import { dateBR, Empty, Head, Notice, Panel } from '../../../../components/bravo-p06';

type OrderItem = {
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

export default function VendasPdvPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get<{ items: OrderItem[] }>('pedidos')
      .then((res) => setOrders(res.items.filter((o) => o.channel === 'PDV' || o.channel === 'BILHETERIA')))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="b6">
      <Head
        title="PDV-04 · Histórico de Vendas Presenciais no PDV e Bilheteria"
        description="Consulta de pedidos originados em terminais presenciais autenticados sobre o mesmo estoque transacional do site."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pdv/caixa">
              Caixa PDV (PDV-03)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/pedidos">
              Todos os Pedidos
            </Link>
          </div>
        }
      />
      <Notice text={error} error />
      <div className="bravo-warning">
        Integração não configurada para impressora térmica / pinpad físico neste ambiente
        (`ENABLE_PDV_OPERATIONS=false`). Apenas vendas reais gravadas em turnos homologados são listadas.
      </div>

      <Panel title={`Vendas presenciais registradas (${orders.length})`}>
        {loading ? (
          <p>Carregando vendas PDV...</p>
        ) : orders.length ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Canal</th>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/pedidos/${o.id}`}>{o.id.slice(0, 8)}…</Link>
                    </td>
                    <td>{o.channel}</td>
                    <td>{o.event.name}</td>
                    <td>{o.customer.fullName}</td>
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
          <Empty message="Nenhuma venda presencial registrada no canal PDV neste ambiente." />
        )}
      </Panel>
    </main>
  );
}
