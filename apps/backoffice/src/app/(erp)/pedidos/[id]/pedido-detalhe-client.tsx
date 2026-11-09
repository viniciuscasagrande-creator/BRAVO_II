'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { currentSession, get, post } from '../../../../lib/bravo-api';
import { dateBR, Empty, Head, Notice, Panel } from '../../../../components/bravo-p06';

type OrderDetail = {
  id: string;
  customerId: string;
  eventId: string;
  sessionId: string;
  lotId: string;
  channel: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  status: string;
  idempotencyKey: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  confirmedAt: string | null;
  customer: { fullName: string };
  event: { name: string };
  session: { name: string };
  lot: { name: string };
  tickets: Array<{ number: string; status: string; issuedAt: string }>;
};

type CheckoutAttempt = {
  id: string;
  provider: string;
  method: string;
  status: string;
  externalReference: string | null;
  createdAt: string;
};

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function PedidoDetalheClient() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() || '';
  const rawId = params?.id;
  const orderId =
    rawId && rawId !== '__dynamic__'
      ? rawId
      : pathname.split('/').filter(Boolean)[1] || rawId || '';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [attempts, setAttempts] = useState<CheckoutAttempt[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!orderId || orderId === '__dynamic__') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      get<OrderDetail>(`pedidos/${orderId}`),
      get<{ items: CheckoutAttempt[] }>(`checkout/pedidos/${orderId}/tentativas`).catch(() => ({
        items: [],
      })),
    ])
      .then(([ord, chk]) => {
        setOrder(ord);
        setAttempts(chk.items);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [orderId]);

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

  async function cancelReservation() {
    if (!orderId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`pedidos/${orderId}/cancelar-reserva`);
      setMessage('Reserva cancelada e inventário/poltronas liberados com auditoria.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title={`PED-02 · Detalhe do Pedido ${orderId.slice(0, 8)}`}
        description="Consulta completa de titular, evento, sessão, lote, ingressos de 8 dígitos e tentativas de checkout."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pedidos">
              Voltar para Pedidos
            </Link>
            {canManage && order?.status === 'RESERVADO' && (
              <button className="b6-btn" onClick={cancelReservation} disabled={busy}>
                {busy ? 'Cancelando...' : 'Cancelar Reserva'}
              </button>
            )}
          </div>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      {loading ? (
        <p>Carregando detalhes do pedido...</p>
      ) : order ? (
        <div className="b6-grid">
          <Panel title="Resumo do pedido">
            <div className="b6-sublist">
              <div>
                <strong>ID:</strong> <code>{order.id}</code>
              </div>
              <div>
                <strong>Situação:</strong> {order.status}
              </div>
              <div>
                <strong>Titular:</strong> {order.customer.fullName}
              </div>
              <div>
                <strong>Evento:</strong> {order.event.name}
              </div>
              <div>
                <strong>Sessão / Lote:</strong> {order.session.name} · {order.lot.name}
              </div>
              <div>
                <strong>Canal:</strong> {order.channel}
              </div>
              <div>
                <strong>Quantidade / Valor Unitário:</strong> {order.quantity} ×{' '}
                {real(order.unitCents)}
              </div>
              <div>
                <strong>Total Congelado:</strong> {real(order.totalCents)}
              </div>
              <div>
                <strong>Criado em:</strong> {dateBR(order.createdAt)} ·{' '}
                <strong>Expira em:</strong> {dateBR(order.expiresAt)}
              </div>
            </div>
          </Panel>

          <Panel title="Ingressos emitidos (8 dígitos)">
            {order.tickets.length > 0 ? (
              <div className="b6-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Situação</th>
                      <th>Emissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.tickets.map((t) => (
                      <tr key={t.number}>
                        <td>
                          <code>{t.number}</code>
                        </td>
                        <td>{t.status}</td>
                        <td>{dateBR(t.issuedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty message="Nenhum ingresso emitido (pedido ainda não liquidado)." />
            )}
          </Panel>

          <Panel title="Tentativas de pagamento / checkout">
            {attempts.length > 0 ? (
              <div className="b6-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Adquirente</th>
                      <th>Método</th>
                      <th>Status</th>
                      <th>Ref. Externa</th>
                      <th>Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td>{a.provider}</td>
                        <td>{a.method}</td>
                        <td>{a.status}</td>
                        <td>{a.externalReference || '—'}</td>
                        <td>{dateBR(a.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty message="Nenhuma tentativa de pagamento registrada para este pedido." />
            )}
          </Panel>
        </div>
      ) : (
        <Empty message="Pedido não encontrado." />
      )}
    </main>
  );
}
