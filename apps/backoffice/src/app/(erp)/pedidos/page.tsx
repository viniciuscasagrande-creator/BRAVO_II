'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { EventFull, EventSummary, currentSession, get, post } from '../../../lib/bravo-api';
import { Head, Notice, Empty, dateBR } from '../../../components/bravo-p06';

type Order = {
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

export default function Pedidos() {
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState<Order[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [detail, setDetail] = useState<EventFull | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [availableSeats, setAvailableSeats] = useState<
    Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }>
  >([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState<{
    code: string;
    discountCents: number;
    finalTotalCents: number;
  } | null>(null);
  const [form, setForm] = useState({
    eventId: '',
    sessionId: '',
    lotId: '',
    customerId: '',
    quantity: 1,
  });

  async function load() {
    const [o, e] = await Promise.all([
      get<{ items: Order[] }>('pedidos'),
      get<EventSummary[]>('eventos'),
    ]);
    setRows(o.items);
    setEvents(e);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
    currentSession()
      .then((s) =>
        setCanManage(
          s.user.roles.some((r) =>
            ['ADMIN', 'OPERACOES', 'ADMIN_BRAVO', 'OPERACAO_EVENTOS'].includes(r)
          )
        )
      )
      .catch(() => setCanManage(false));
  }, []);

  async function changeEvent(id: string) {
    setForm({ ...form, eventId: id, sessionId: '', lotId: '' });
    setDetail(null);
    if (!id) return;
    try {
      const e = await get<EventFull>(`eventos/${id}`);
      setDetail(e);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function lookupCustomer(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const data = await get<{ items: { id: string; fullName: string; email: string }[] }>(
        `clientes?busca=${encodeURIComponent(customerSearch)}`
      );
      setCustomers(data.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function reserve(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      const result = await post<{
        id: string;
        status: string;
        totalCents: number;
        expiresAt: string;
      }>('pedidos/reservas', {
        ...form,
        quantity: Number(form.quantity),
        seatIds: selectedSeatIds.length > 0 ? selectedSeatIds : undefined,
        couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
        channel: 'ONLINE',
        idempotencyKey: crypto.randomUUID(),
      });
      setMsg(
        `Reserva ${result.id} criada até ${dateBR(result.expiresAt)}. NÃO é pagamento realizado nem ingresso emitido.`
      );
      setSelectedSeatIds([]);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelReservation(orderId: string) {
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      await post(`pedidos/${orderId}/cancelar-reserva`);
      setMsg(`Reserva ${orderId.slice(0, 8)}… cancelada e estoque/poltronas liberados.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function validateCoupon() {
    if (!form.eventId || !form.lotId || !couponCode.trim()) return;
    setErr('');
    const selectedLot = (detail?.lots || []).find((l) => l.id === form.lotId);
    const subtotalCents = (selectedLot?.faceValueCents || 0) * Number(form.quantity || 1);
    try {
      const res = await get<{
        code: string;
        discountCents: number;
        finalTotalCents: number;
      }>(
        `pedidos/cupons/validar?eventId=${encodeURIComponent(form.eventId)}&code=${encodeURIComponent(
          couponCode.trim()
        )}&subtotalCents=${subtotalCents}`
      );
      setCouponPreview(res);
    } catch (e) {
      setCouponPreview(null);
      setErr((e as Error).message);
    }
  }

  async function handleLotChange(lotId: string) {
    setForm({ ...form, lotId });
    setSelectedSeatIds([]);
    setAvailableSeats([]);
    setCouponPreview(null);
    if (!lotId || !detail) return;
    const lot = detail.lots.find((l) => l.id === lotId);
    const area = detail.areas.find((a) => a.id === lot?.areaId);
    if (area?.isNumbered && lot?.areaId) {
      try {
        const res = await get<{
          items: Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }>;
        }>(`pedidos/eventos/${detail.id}/setores/${lot.areaId}/poltronas`);
        setAvailableSeats(res.items);
      } catch (e) {
        setErr((e as Error).message);
      }
    }
  }

  async function expire() {
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      const result = await post<{ expired: number }>('pedidos/reservas/expiradas/processar');
      setMsg(`${result.expired} reservas vencidas liberadas.`);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const sessions = detail?.sessions || [];
  const lots = (detail?.lots || []).filter((l) => l.sessionId === form.sessionId);

  return (
    <main className="b6">
      <Head
        title="PED-01 · Pedidos e Reservas"
        description="Fluxo interno de homologação, sem pagamento ou emissão real. Inventário atômico por lote."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/pedidos/reservas">
              Fila de Reservas / TTL
            </Link>
            <Link className="b6-btn" href="/pedidos/novo">
              Novo Pedido Administrativo
            </Link>
          </div>
        }
      />
      <Notice text={err} error />
      {msg && (
        <div className="b6-notice" role="status">
          {msg}
        </div>
      )}
      <div className="bravo-warning">
        Vendas públicas e PDVs NÃO estão conectados. Reservar não confirma recebimento. Eventos só podem receber
        reserva depois de publicação confirmada e lotes ativados.
      </div>
      {canManage && (
        <div className="b6-grid" style={{ marginTop: 18 }}>
          <section className="b6-panel">
            <h2>Nova reserva interna</h2>
            <form onSubmit={lookupCustomer} className="b6-stack">
              <label className="b6-field">
                Buscar cliente pelo nome ou e-mail
                <input
                  value={customerSearch}
                  minLength={4}
                  required
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="4 caracteres ou mais"
                />
              </label>
              <button className="b6-btn b6-btn-secondary">Pesquisar clientes</button>
            </form>
            <form className="b6-stack" onSubmit={reserve} style={{ marginTop: 18 }}>
              <label className="b6-field">
                Cliente
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                >
                  <option value="">Selecione após pesquisar</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} — {c.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="b6-field">
                Evento
                <select required value={form.eventId} onChange={(e) => changeEvent(e.target.value)}>
                  <option value="">Selecione o evento</option>
                  {events
                    .filter((e) => e.status === 'PUBLICADO')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="b6-field">
                Sessão
                <select
                  required
                  value={form.sessionId}
                  onChange={(e) => setForm({ ...form, sessionId: e.target.value, lotId: '' })}
                >
                  <option value="">Selecione a sessão</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="b6-field">
                Lote
                <select
                  required
                  value={form.lotId}
                  onChange={(e) => handleLotChange(e.target.value)}
                >
                  <option value="">Selecione o lote</option>
                  {lots
                    .filter((l) => l.status === 'ATIVO' || l.status === 'ACTIVE')
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {real(l.faceValueCents)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="b6-field">
                Quantidade (1–10)
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </label>
              {availableSeats.length > 0 && (
                <div className="b6-field">
                  <span>
                    Poltronas numeradas ({selectedSeatIds.length}/{form.quantity} selecionadas)
                  </span>
                  <div className="b6-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {availableSeats.map((st) => {
                      const checked = selectedSeatIds.includes(st.id);
                      const disabled = st.status !== 'AVAILABLE' && !checked;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          disabled={disabled}
                          className={`b6-btn ${checked ? '' : 'b6-btn-secondary'}`}
                          onClick={() => {
                            if (checked) {
                              setSelectedSeatIds(selectedSeatIds.filter((id) => id !== st.id));
                            } else if (selectedSeatIds.length < form.quantity) {
                              setSelectedSeatIds([...selectedSeatIds, st.id]);
                            }
                          }}
                        >
                          {st.seatLabel} {st.isAccessible ? '(PCD)' : ''}{' '}
                          {st.status !== 'AVAILABLE' ? `[${st.status}]` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="b6-field">
                <span>Cupom promocional (opcional)</span>
                <div className="b6-actions">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Ex.: PROMO10"
                  />
                  <button
                    type="button"
                    className="b6-btn b6-btn-secondary"
                    onClick={validateCoupon}
                    disabled={!form.eventId || !form.lotId || !couponCode.trim()}
                  >
                    Validar cupom
                  </button>
                </div>
                {couponPreview && (
                  <small className="b6-muted">
                    Cupom {couponPreview.code}: desconto {real(couponPreview.discountCents)} · Total final{' '}
                    {real(couponPreview.finalTotalCents)}
                  </small>
                )}
              </div>
              <button className="b6-btn" disabled={busy || !form.customerId || !form.lotId}>
                {busy ? 'Processando...' : 'Reservar (sem cobrar)'}
              </button>
            </form>
            <p className="b6-muted">
              O cliente pode ser cadastrado em <Link href="/clientes">Central de Clientes</Link>. Para PDV e áreas
              numeradas ainda é necessária uma etapa própria de implantação.
            </p>
          </section>

          <section className="b6-panel">
            <h2>Critérios de segurança</h2>
            <div className="b6-sublist">
              <div>Preço congelado no pedido, em centavos inteiros.</div>
              <div>Estoque reservado por operação atômica no PostgreSQL.</div>
              <div>Prazo de 15 minutos; liberação de vencidas por processo interno.</div>
              <div>Pagamento real desabilitado por configuração de homologação.</div>
              <div>Ingresso de oito dígitos criado somente após liquidação validada.</div>
            </div>
            <button className="b6-btn b6-btn-secondary" onClick={expire} disabled={busy}>
              Liberar reservas vencidas
            </button>
          </section>
        </div>
      )}

      <section className="b6-panel" style={{ marginTop: 20 }}>
        <h2>Pedidos recentes</h2>
        {rows.length ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Quantidade</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td title={o.id}>
                      <Link href={`/pedidos/${o.id}`}>{o.id.slice(0, 8)}…</Link>
                    </td>
                    <td>{o.event.name}</td>
                    <td>{o.customer.fullName}</td>
                    <td>{o.quantity}</td>
                    <td>{real(o.totalCents)}</td>
                    <td>{o.status}</td>
                    <td>{dateBR(o.createdAt)}</td>
                    <td>
                      <div className="b6-actions">
                        <Link className="b6-btn b6-btn-secondary" href={`/pedidos/${o.id}`}>
                          Abrir
                        </Link>
                        {canManage && o.status === 'RESERVADO' ? (
                          <button
                            type="button"
                            className="b6-btn b6-btn-secondary"
                            disabled={busy}
                            onClick={() => cancelReservation(o.id)}
                          >
                            Cancelar reserva
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty message="Nenhum pedido cadastrado neste ambiente." />
        )}
      </section>
    </main>
  );
}
