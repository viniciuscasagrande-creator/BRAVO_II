'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { currentSession, get, post } from '../../../../lib/bravo-api';
import { dateBR, Empty, Head, Notice, Panel } from '../../../../components/bravo-p06';

type OrderItem = {
  id: string;
  eventId: string;
  status: string;
  quantity: number;
  totalCents: number;
  channel: string;
  createdAt: string;
  expiresAt: string;
  event: { name: string };
  customer: { fullName: string };
};

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ReservasDesistenciasPage() {
  const [rows, setRows] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'RESERVADO' | 'EXPIRADO' | 'CANCELADO' | 'TODOS'>('RESERVADO');
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    get<{ items: OrderItem[] }>('pedidos')
      .then((res) => setRows(res.items))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    currentSession()
      .then((s) =>
        setCanManage(
          s.user.roles.some((r) =>
            ['ADMIN', 'OPERACOES', 'ADMIN_BRAVO', 'OPERACAO_EVENTOS'].includes(r)
          )
        )
      )
      .catch(() => setCanManage(false));
  }, [load]);

  async function processExpired() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await post<{ expired: number }>('pedidos/reservas/expiradas/processar');
      setMessage(`${res.expired} reserva(s) expirada(s) processada(s) e liberada(s) no estoque.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(id: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`pedidos/${id}/cancelar-reserva`);
      setMessage(`Reserva ${id.slice(0, 8)}… cancelada e poltronas/estoque devolvidos.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = rows.filter((r) => (statusFilter === 'TODOS' ? true : r.status === statusFilter));

  return (
    <main className="b6">
      <Head
        title="PED-04 · Reservas Ativas, Expiração e Desistências"
        description="Monitoramento de reservas temporárias (TTL de 15 minutos), liberação de carrinhos expirados e cancelamento de reservas não pagas."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pedidos">
              Todos os Pedidos
            </Link>
            {canManage && (
              <button className="b6-btn" onClick={processExpired} disabled={busy}>
                {busy ? 'Processando...' : 'Processar e liberar reservas vencidas'}
              </button>
            )}
          </div>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <Panel title="Filtro de reservas e desistências">
        <div className="b6-actions">
          {(['RESERVADO', 'EXPIRADO', 'CANCELADO', 'TODOS'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`b6-btn ${statusFilter === st ? '' : 'b6-btn-secondary'}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </Panel>

      <section className="b6-panel" style={{ marginTop: 18 }}>
        <h2>Lista de reservas ({filtered.length})</h2>
        {loading ? (
          <p>Carregando reservas...</p>
        ) : filtered.length ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Qtd.</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Expira em</th>
                  <th>Ações</th>
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
                    <td>{o.quantity}</td>
                    <td>{real(o.totalCents)}</td>
                    <td>{o.status}</td>
                    <td>{dateBR(o.expiresAt)}</td>
                    <td>
                      <div className="b6-actions">
                        <Link className="b6-btn b6-btn-secondary" href={`/pedidos/${o.id}`}>
                          Detalhe
                        </Link>
                        {canManage && o.status === 'RESERVADO' && (
                          <button
                            type="button"
                            className="b6-btn b6-btn-secondary"
                            disabled={busy}
                            onClick={() => cancelOrder(o.id)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty message="Nenhuma reserva encontrada para o filtro selecionado." />
        )}
      </section>
    </main>
  );
}
