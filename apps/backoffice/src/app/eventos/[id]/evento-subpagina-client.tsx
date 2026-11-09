'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { EventFull, get, post } from '../../../lib/bravo-api';
import { dateBR, Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export type EventoSubModo =
  | 'sessoes'
  | 'lotes'
  | 'ingressos'
  | 'cupons'
  | 'cortesias'
  | 'aprovacoes'
  | 'mapa'
  | 'reservas';

const real = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function EventoSubpaginaClient({ modo, codigoMatriz, titulo }: {
  modo: EventoSubModo;
  codigoMatriz: string;
  titulo: string;
}) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() || '';
  const rawId = params?.id;
  const eventId =
    rawId && rawId !== '__dynamic__'
      ? rawId
      : pathname.split('/').filter(Boolean)[1] || rawId || '';
  const [ev, setEv] = useState<EventFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Estados específicos por modo
  const [sessForm, setSessForm] = useState({ name: '', startAt: '', endAt: '', capacity: 500 });
  const [lotForm, setLotForm] = useState({
    sessionId: '',
    areaId: '',
    name: '',
    faceValueCents: 10000,
    capacity: 200,
    startAt: '',
    endAt: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [couponSubtotal, setCouponSubtotal] = useState(10000);
  const [couponResult, setCouponResult] = useState<{
    code: string;
    discountCents: number;
    finalTotalCents: number;
  } | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    area: 'COMERCIAL',
    decision: 'APROVADO',
    notes: 'Requisitos conferidos e validados pela área.',
  });
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [seats, setSeats] = useState<
    Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }>
  >([]);
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      eventId: string;
      status: string;
      quantity: number;
      totalCents: number;
      expiresAt: string;
      customer: { fullName: string };
    }>
  >([]);

  const load = useCallback(() => {
    if (!eventId || eventId === '__dynamic__') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    get<EventFull>(`eventos/${eventId}`)
      .then((data) => {
        setEv(data);
        if (data.sessions[0] && !lotForm.sessionId) {
          setLotForm((s) => ({ ...s, sessionId: data.sessions[0].id }));
        }
        if (data.areas[0]) {
          if (!lotForm.areaId) setLotForm((s) => ({ ...s, areaId: data.areas[0].id }));
          if (!selectedSectorId) setSelectedSectorId(data.areas[0].id);
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));

    if (modo === 'reservas') {
      get<{
        items: Array<{
          id: string;
          eventId: string;
          status: string;
          quantity: number;
          totalCents: number;
          expiresAt: string;
          customer: { fullName: string };
        }>;
      }>('pedidos')
        .then((res) => setOrders(res.items.filter((o) => o.eventId === eventId)))
        .catch(() => {});
    }
  }, [eventId, modo, lotForm.sessionId, lotForm.areaId, selectedSectorId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (modo === 'mapa' && eventId && eventId !== '__dynamic__' && selectedSectorId) {
      get<{ items: Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }> }>(
        `pedidos/eventos/${eventId}/setores/${selectedSectorId}/poltronas`
      )
        .then((r) => setSeats(r.items))
        .catch(() => setSeats([]));
    }
  }, [modo, eventId, selectedSectorId]);

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${eventId}/sessoes`, {
        name: sessForm.name,
        startAt: new Date(sessForm.startAt).toISOString(),
        endAt: new Date(sessForm.endAt).toISOString(),
        capacity: Number(sessForm.capacity),
      });
      setMessage('Sessão adicionada com sucesso.');
      setSessForm({ name: '', startAt: '', endAt: '', capacity: 500 });
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addLot(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${eventId}/lotes`, {
        ...lotForm,
        faceValueCents: Number(lotForm.faceValueCents),
        capacity: Number(lotForm.capacity),
        startAt: new Date(lotForm.startAt).toISOString(),
        endAt: new Date(lotForm.endAt).toISOString(),
      });
      setMessage('Lote / categoria de preço registrado com sucesso.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function progressLots() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const r = await post<{ progressedCount: number }>(`eventos/${eventId}/lotes/processar-virada`);
      setMessage(`Progressão automática executada: ${r.progressedCount} virada(s).`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function testCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await get<{ code: string; discountCents: number; finalTotalCents: number }>(
        `pedidos/cupons/validar?eventId=${encodeURIComponent(eventId)}&code=${encodeURIComponent(
          couponCode
        )}&subtotalCents=${couponSubtotal}`
      );
      setCouponResult(res);
    } catch (err) {
      setCouponResult(null);
      setError((err as Error).message);
    }
  }

  async function submitApproval(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${eventId}/aprovacoes`, approvalForm);
      setMessage(`Parecer da área ${approvalForm.area} registrado e auditado.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelReservation(orderId: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`pedidos/${orderId}/cancelar-reserva`);
      setMessage('Reserva liberada com sucesso.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title={`${codigoMatriz} · ${titulo}`}
        description={ev ? `Evento: ${ev.name} (${ev.status}) · Local: ${ev.venueName}` : 'Carregando evento...'}
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}`}>
              Ficha Completa do Evento
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/eventos">
              Todos os Eventos
            </Link>
          </div>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/sessoes`}>
          EVT-04 Sessões
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/lotes`}>
          EVT-05 Lotes
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/ingressos`}>
          EVT-06 Categorias/Preços
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/cupons`}>
          EVT-07 Cupons
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/cortesias`}>
          EVT-08 Cortesias
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/aprovacoes`}>
          EVT-09 Aprovações
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/mapa`}>
          MAP-02 Mapa
        </Link>
        <Link className="b6-btn b6-btn-secondary" href={`/eventos/${eventId}/reservas`}>
          MAP-03 Reservas
        </Link>
      </div>

      {loading ? (
        <p>Carregando dados do evento...</p>
      ) : !ev ? (
        <Empty message="Selecione um evento válido em /eventos para gerenciar este submódulo." />
      ) : (
        <>
          {modo === 'sessoes' && (
            <div className="b6-grid">
              <Panel title="Criar nova sessão">
                <form onSubmit={addSession} className="b6-stack">
                  <Field name="Nome da sessão">
                    <input
                      required
                      value={sessForm.name}
                      onChange={(e) => setSessForm({ ...sessForm, name: e.target.value })}
                    />
                  </Field>
                  <Field name="Início">
                    <input
                      required
                      type="datetime-local"
                      value={sessForm.startAt}
                      onChange={(e) => setSessForm({ ...sessForm, startAt: e.target.value })}
                    />
                  </Field>
                  <Field name="Término">
                    <input
                      required
                      type="datetime-local"
                      value={sessForm.endAt}
                      onChange={(e) => setSessForm({ ...sessForm, endAt: e.target.value })}
                    />
                  </Field>
                  <Field name="Capacidade máxima">
                    <input
                      required
                      type="number"
                      min={1}
                      value={sessForm.capacity}
                      onChange={(e) => setSessForm({ ...sessForm, capacity: Number(e.target.value) })}
                    />
                  </Field>
                  <button className="b6-btn" disabled={busy}>
                    Adicionar sessão
                  </button>
                </form>
              </Panel>
              <Panel title={`Sessões cadastradas (${ev.sessions.length})`}>
                {ev.sessions.length ? (
                  <div className="b6-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Sessão</th>
                          <th>Início</th>
                          <th>Capacidade</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ev.sessions.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>{dateBR(s.startsAt)}</td>
                            <td>{s.capacity}</td>
                            <td>{s.status ?? 'ATIVA'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty message="Nenhuma sessão cadastrada." />
                )}
              </Panel>
            </div>
          )}

          {(modo === 'lotes' || modo === 'ingressos') && (
            <div className="b6-grid">
              <Panel title="Configurar lote / categoria e preço nominal">
                <form onSubmit={addLot} className="b6-stack">
                  <Field name="Sessão">
                    <select
                      required
                      value={lotForm.sessionId}
                      onChange={(e) => setLotForm({ ...lotForm, sessionId: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {ev.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Setor / Área">
                    <select
                      required
                      value={lotForm.areaId}
                      onChange={(e) => setLotForm({ ...lotForm, areaId: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {ev.areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Modalidade / Categoria (ex.: Inteira 1º Lote, Meia-Entrada)">
                    <input
                      required
                      value={lotForm.name}
                      onChange={(e) => setLotForm({ ...lotForm, name: e.target.value })}
                    />
                  </Field>
                  <Field name="Preço nominal em centavos (sem float)">
                    <input
                      required
                      type="number"
                      min={0}
                      value={lotForm.faceValueCents}
                      onChange={(e) =>
                        setLotForm({ ...lotForm, faceValueCents: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field name="Quantidade máxima do lote">
                    <input
                      required
                      type="number"
                      min={1}
                      value={lotForm.capacity}
                      onChange={(e) => setLotForm({ ...lotForm, capacity: Number(e.target.value) })}
                    />
                  </Field>
                  <Field name="Início da vigência">
                    <input
                      required
                      type="datetime-local"
                      value={lotForm.startAt}
                      onChange={(e) => setLotForm({ ...lotForm, startAt: e.target.value })}
                    />
                  </Field>
                  <Field name="Fim da vigência">
                    <input
                      required
                      type="datetime-local"
                      value={lotForm.endAt}
                      onChange={(e) => setLotForm({ ...lotForm, endAt: e.target.value })}
                    />
                  </Field>
                  <div className="b6-actions">
                    <button className="b6-btn" disabled={busy}>
                      Salvar lote / categoria
                    </button>
                    <button
                      type="button"
                      className="b6-btn b6-btn-secondary"
                      onClick={progressLots}
                      disabled={busy}
                    >
                      Processar virada automática
                    </button>
                  </div>
                </form>
              </Panel>
              <Panel title={`Lotes e categorias do evento (${ev.lots.length})`}>
                {ev.lots.length ? (
                  <div className="b6-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Lote / Categoria</th>
                          <th>Preço</th>
                          <th>Capacidade</th>
                          <th>Reservados</th>
                          <th>Emitidos</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ev.lots.map((l) => (
                          <tr key={l.id}>
                            <td>{l.name}</td>
                            <td>{real(l.faceValueCents)}</td>
                            <td>{l.capacity}</td>
                            <td>{l.reservedCount ?? 0}</td>
                            <td>{l.issuedCount ?? 0}</td>
                            <td>{l.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty message="Nenhum lote cadastrado." />
                )}
              </Panel>
            </div>
          )}

          {modo === 'cupons' && (
            <div className="b6-grid">
              <Panel title="Simular e validar elegibilidade de cupom no servidor">
                <form onSubmit={testCoupon} className="b6-stack">
                  <Field name="Código promocional">
                    <input
                      required
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Ex.: DISK15"
                    />
                  </Field>
                  <Field name="Subtotal de teste em centavos">
                    <input
                      required
                      type="number"
                      min={100}
                      value={couponSubtotal}
                      onChange={(e) => setCouponSubtotal(Number(e.target.value))}
                    />
                  </Field>
                  <button className="b6-btn">Validar elegibilidade no servidor</button>
                </form>
                {couponResult && (
                  <div className="b6-notice" style={{ marginTop: 12 }}>
                    Cupom <strong>{couponResult.code}</strong> válido: desconto de{' '}
                    {real(couponResult.discountCents)} · Total final {real(couponResult.finalTotalCents)}.
                  </div>
                )}
              </Panel>
              <Panel title="Gestão completa de campanhas de cupom">
                <p className="b6-muted">
                  Para criar novas campanhas de cupom com limite global, vigência e vínculo de sessão,
                  acesse a central dedicada ou a tela de descontos.
                </p>
                <div className="b6-actions">
                  <Link className="b6-btn" href="/cupons-cortesias">
                    Abrir Central de Cupons e Cortesias
                  </Link>
                  <Link className="b6-btn b6-btn-secondary" href="/vendas/descontos">
                    Abrir Vendas / Descontos
                  </Link>
                </div>
              </Panel>
            </div>
          )}

          {modo === 'cortesias' && (
            <Panel title="Quotas e emissão auditada de cortesias por setor">
              <p className="b6-muted">
                As emissões de cortesia respeitam o teto contratual por setor e geram ingresso de 8
                dígitos com valor nominal R$ 0,00 e bloqueio de revenda.
              </p>
              <div className="b6-actions" style={{ marginTop: 12 }}>
                <Link className="b6-btn" href="/cupons-cortesias">
                  Gerenciar e Emitir Cortesias do Evento
                </Link>
              </div>
            </Panel>
          )}

          {modo === 'aprovacoes' && (
            <div className="b6-grid">
              <Panel title="Registrar aprovação por alçada independente">
                <form onSubmit={submitApproval} className="b6-stack">
                  <Field name="Alçada / Área">
                    <select
                      value={approvalForm.area}
                      onChange={(e) => setApprovalForm({ ...approvalForm, area: e.target.value })}
                    >
                      <option value="CADASTRAL">CADASTRAL</option>
                      <option value="COMERCIAL">COMERCIAL</option>
                      <option value="CONTRATO">CONTRATO</option>
                      <option value="OPERACIONAL">OPERACIONAL</option>
                      <option value="TECNICA">TECNICA</option>
                      <option value="LOCAL">LOCAL</option>
                      <option value="PUBLICACAO">PUBLICACAO</option>
                    </select>
                  </Field>
                  <Field name="Decisão">
                    <select
                      value={approvalForm.decision}
                      onChange={(e) =>
                        setApprovalForm({ ...approvalForm, decision: e.target.value })
                      }
                    >
                      <option value="APROVADO">APROVADO</option>
                      <option value="REPROVADO">REPROVADO</option>
                    </select>
                  </Field>
                  <Field name="Parecer / Motivo">
                    <textarea
                      required
                      rows={3}
                      value={approvalForm.notes}
                      onChange={(e) => setApprovalForm({ ...approvalForm, notes: e.target.value })}
                    />
                  </Field>
                  <button className="b6-btn" disabled={busy}>
                    Registrar parecer auditado
                  </button>
                </form>
              </Panel>
              <Panel title={`Histórico de aprovações (${ev.approvals.length})`}>
                {ev.approvals.length ? (
                  <div className="b6-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Etapa</th>
                          <th>Decisão</th>
                          <th>Motivo / Parecer</th>
                          <th>Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ev.approvals.map((a, idx) => (
                          <tr key={`${a.step}-${idx}`}>
                            <td>{a.step}</td>
                            <td>{a.decision}</td>
                            <td>{a.reason || '—'}</td>
                            <td>{a.actorId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty message="Nenhuma aprovação registrada ainda." />
                )}
              </Panel>
            </div>
          )}

          {modo === 'mapa' && (
            <div className="b6-grid">
              <Panel title="Setores e ocupação do mapa">
                <Field name="Selecionar setor numerado">
                  <select
                    value={selectedSectorId}
                    onChange={(e) => setSelectedSectorId(e.target.value)}
                  >
                    {ev.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.isNumbered ? 'Numerado' : 'Livre'}) — Cap. {a.capacity}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="b6-actions" style={{ marginTop: 12 }}>
                  <Link className="b6-btn b6-btn-secondary" href="/mapas">
                    Abrir Construtor de Mapas (MAP-01)
                  </Link>
                </div>
              </Panel>
              <Panel title={`Poltronas do setor (${seats.length})`}>
                {seats.length ? (
                  <div className="b6-actions" style={{ flexWrap: 'wrap' }}>
                    {seats.map((st) => (
                      <span
                        key={st.id}
                        className={`p06-badge ${st.status === 'AVAILABLE' ? 'ok' : 'warn'}`}
                      >
                        {st.seatLabel}: {st.status}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Empty message="Nenhuma poltrona numerada gerada neste setor." />
                )}
              </Panel>
            </div>
          )}

          {modo === 'reservas' && (
            <Panel title={`Reservas e pedidos vinculados ao evento (${orders.length})`}>
              {orders.length ? (
                <div className="b6-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Qtd.</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Expira em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <Link href={`/pedidos/${o.id}`}>{o.id.slice(0, 8)}…</Link>
                          </td>
                          <td>{o.customer.fullName}</td>
                          <td>{o.quantity}</td>
                          <td>{real(o.totalCents)}</td>
                          <td>{o.status}</td>
                          <td>{dateBR(o.expiresAt)}</td>
                          <td>
                            {o.status === 'RESERVADO' ? (
                              <button
                                type="button"
                                className="b6-btn b6-btn-secondary"
                                onClick={() => cancelReservation(o.id)}
                                disabled={busy}
                              >
                                Liberar reserva
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty message="Nenhuma reserva registrada para este evento." />
              )}
            </Panel>
          )}
        </>
      )}
    </main>
  );
}
