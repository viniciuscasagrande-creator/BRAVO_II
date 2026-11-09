'use client';
import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventFull, EventSummary, get, post } from '../../../../lib/bravo-api';
import { dateBR, Head, Notice, Panel } from '../../../../components/bravo-p06';

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function NovoPedidoAdministrativoPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [detail, setDetail] = useState<EventFull | null>(null);
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
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    eventId: '',
    sessionId: '',
    lotId: '',
    customerId: '',
    quantity: 1,
  });

  useEffect(() => {
    get<EventSummary[]>('eventos')
      .then(setEvents)
      .catch((e) => setErr((e as Error).message));
  }, []);

  async function changeEvent(id: string) {
    setForm({ ...form, eventId: id, sessionId: '', lotId: '' });
    setDetail(null);
    setAvailableSeats([]);
    setSelectedSeatIds([]);
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
      setMsg(`Reserva administrativa ${result.id} criada até ${dateBR(result.expiresAt)}.`);
      router.push(`/pedidos/${result.id}`);
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
        title="PED-03 · Criar Pedido / Reserva Administrativa"
        description="Seleção de cliente, evento publicado, sessão, lote, poltronas numeradas e cupom com trava transacional de estoque."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/pedidos">
            Voltar para Pedidos
          </Link>
        }
      />
      <Notice text={err} error />
      <Notice text={msg} />

      <div className="b6-grid">
        <Panel title="1. Localizar cliente titular">
          <form onSubmit={lookupCustomer} className="b6-stack">
            <label className="b6-field">
              Buscar cliente por nome ou e-mail (mín. 4 caracteres)
              <input
                required
                minLength={4}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </label>
            <button className="b6-btn b6-btn-secondary">Pesquisar cliente</button>
          </form>
        </Panel>

        <Panel title="2. Configurar itens e reservar estoque">
          <form onSubmit={reserve} className="b6-stack">
            <label className="b6-field">
              Cliente titular
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">Selecione após pesquisar...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="b6-field">
              Evento publicado
              <select required value={form.eventId} onChange={(e) => changeEvent(e.target.value)}>
                <option value="">Selecione...</option>
                {events
                  .filter((ev) => ev.status === 'PUBLICADO')
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
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
                <option value="">Selecione...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="b6-field">
              Lote ativo
              <select required value={form.lotId} onChange={(e) => handleLotChange(e.target.value)}>
                <option value="">Selecione...</option>
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
                  Poltronas numeradas ({selectedSeatIds.length}/{form.quantity})
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
                        {st.seatLabel} {st.status !== 'AVAILABLE' ? `[${st.status}]` : ''}
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
                  placeholder="Código do cupom"
                />
                <button
                  type="button"
                  className="b6-btn b6-btn-secondary"
                  onClick={validateCoupon}
                  disabled={!form.eventId || !form.lotId || !couponCode.trim()}
                >
                  Validar
                </button>
              </div>
              {couponPreview && (
                <small className="b6-muted">
                  Desconto: {real(couponPreview.discountCents)} · Total final:{' '}
                  {real(couponPreview.finalTotalCents)}
                </small>
              )}
            </div>
            <button className="b6-btn" disabled={busy || !form.customerId || !form.lotId}>
              {busy ? 'Reservando...' : 'Confirmar reserva transacional'}
            </button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
