'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { get, post, EventFull } from '../../../lib/bravo-api';
import { Head, Panel, Field, Notice, Empty, brl, dateBR } from '../../../components/bravo-p06';

const iso = (v: string) => new Date(v).toISOString();

export function EventoDetalheClient() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() || '';
  const rawId = params?.id;
  const id =
    rawId && rawId !== '__dynamic__'
      ? rawId
      : pathname.split('/').filter(Boolean)[1] || rawId || '';

  const [event, setEvent] = useState<EventFull | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [session, setSession] = useState({ name: '', startsAt: '', endsAt: '', capacity: '' });
  const [area, setArea] = useState({ label: '', capacity: '', isNumbered: false });
  const [category, setCategory] = useState({ name: '', requiresProof: false });
  const [lot, setLot] = useState({
    name: '',
    sessionId: '',
    categoryId: '',
    areaId: '',
    faceValueCents: '',
    capacity: '',
    startsAt: '',
    endsAt: '',
  });
  const [approval, setApproval] = useState({ step: 'CADASTRAL', decision: 'APROVADO', reason: '' });
  const [seatRow, setSeatRow] = useState({
    areaId: '',
    rowLabel: 'A',
    startNumber: '1',
    endNumber: '10',
  });
  const [changeCase, setChangeCase] = useState({
    changeType: 'ADIAMENTO',
    reason: '',
  });

  const reload = useCallback(async () => {
    if (!id || id === '__dynamic__') return;
    const e = await get<EventFull>(`eventos/${id}`);
    setEvent(e);
    if (e.status === 'APROVADO') {
      setIssues(await get<string[]>(`eventos/${id}/pendencias`));
    }
  }, [id]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  const act = async (path: string, body?: unknown, ok = 'Operação registrada') => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await post(`eventos/${id}/${path}`, body);
      await reload();
      setSuccess(ok);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!event)
    return (
      <main className="b6">
        <Head title="Event Builder" />
        <Notice text={error} error />
        {!error && <p>Carregando evento...</p>}
      </main>
    );

  const editable = ['RASCUNHO', 'REPROVADO'].includes(event.status);
  const channel = (kind: 'ONLINE' | 'PDV' | 'BILHETERIA', enabled: boolean) =>
    act('canais', { channel: kind, enabled }, 'Canal atualizado');

  return (
    <main className="b6">
      <Head
        title={event.name}
        description={`Revisão ${event.revision} · Início ${dateBR(event.startsAt)} · ${event.status}`}
        action={
          <Link className="b6-btn b6-btn-secondary" href={`/comercial/eventos/${id}/taxas`}>
            Taxa Disk (interno)
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={success} />

      <div className="b6-statrow">
        <div>
          <small>Status</small>
          <strong>{event.status}</strong>
        </div>
        <div>
          <small>Sessões</small>
          <strong>{event.sessions.length}</strong>
        </div>
        <div>
          <small>Lotes</small>
          <strong>{event.lots.length}</strong>
        </div>
        <div>
          <small>Produtor principal</small>
          <strong>
            {event.producers.find((p) => p.role === 'PRINCIPAL')?.producer.legalName || 'Pendente'}
          </strong>
        </div>
      </div>

      <div className="b6-grid">
        <Panel title="1. Sessões">
          <div className="b6-sublist">
            {event.sessions.map((s) => (
              <div key={s.id}>
                {s.name} · {dateBR(s.startsAt)} · {s.capacity} lugares
              </div>
            ))}
            {!event.sessions.length && <Empty message="Nenhuma sessão cadastrada" />}
          </div>
          {editable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  'sessoes',
                  {
                    ...session,
                    capacity: Number(session.capacity),
                    startsAt: iso(session.startsAt),
                    endsAt: iso(session.endsAt),
                  },
                  'Sessão adicionada'
                );
              }}
              className="b6-stack"
            >
              <Field name="Identificação da sessão">
                <input
                  required
                  value={session.name}
                  onChange={(e) => setSession((s) => ({ ...s, name: e.target.value }))}
                />
              </Field>
              <Field name="Início">
                <input
                  required
                  type="datetime-local"
                  value={session.startsAt}
                  onChange={(e) => setSession((s) => ({ ...s, startsAt: e.target.value }))}
                />
              </Field>
              <Field name="Fim">
                <input
                  required
                  type="datetime-local"
                  value={session.endsAt}
                  onChange={(e) => setSession((s) => ({ ...s, endsAt: e.target.value }))}
                />
              </Field>
              <Field name="Capacidade">
                <input
                  required
                  type="number"
                  min="1"
                  value={session.capacity}
                  onChange={(e) => setSession((s) => ({ ...s, capacity: e.target.value }))}
                />
              </Field>
              <button disabled={busy} className="b6-btn">
                Adicionar sessão
              </button>
            </form>
          )}
        </Panel>

        <Panel title="2. Áreas, construtor de mapas e assentos (MAP-001 / MAP-002)">
          <div className="b6-sublist">
            {event.areas.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  <strong>{a.label}</strong> · {a.capacity} lugares · {a.isNumbered ? 'Numerada' : 'Livre'}
                  {a.isNumbered && ` (${a.seatsCount ?? a.seats?.length ?? 0} poltronas geradas)`}
                </span>
                {editable && (
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <button
                      type="button"
                      disabled={busy}
                      className="b6-btn b6-btn-secondary"
                      onClick={() => void act(`areas/${a.id}/duplicar`, { newName: `${a.label} (Cópia)` }, 'Setor e mapa duplicados')}
                    >
                      Duplicar setor
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="b6-btn b6-btn-secondary"
                      onClick={() => void act(`areas/${a.id}/excluir`, {}, 'Setor excluído')}
                    >
                      Excluir
                    </button>
                  </span>
                )}
              </div>
            ))}
            {!event.areas.length && <Empty message="Nenhuma área configurada" />}
          </div>
          {editable && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act('areas', { ...area, capacity: Number(area.capacity) }, 'Área adicionada');
                }}
                className="b6-stack"
              >
                <Field name="Área ou setor">
                  <input
                    required
                    value={area.label}
                    onChange={(e) => setArea((s) => ({ ...s, label: e.target.value }))}
                  />
                </Field>
                <Field name="Lotação">
                  <input
                    required
                    type="number"
                    min="1"
                    value={area.capacity}
                    onChange={(e) => setArea((s) => ({ ...s, capacity: e.target.value }))}
                  />
                </Field>
                <Field name="Tipo de ocupação">
                  <select
                    value={area.isNumbered ? 'numbered' : 'free'}
                    onChange={(e) =>
                      setArea((s) => ({ ...s, isNumbered: e.target.value === 'numbered' }))
                    }
                  >
                    <option value="free">Lugar livre</option>
                    <option value="numbered">Assentos numerados</option>
                  </select>
                </Field>
                <button disabled={busy} className="b6-btn">
                  Adicionar área
                </button>
              </form>

              {event.areas.length > 0 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const targetArea = seatRow.areaId || event.areas[0]?.id;
                    if (!targetArea) return;
                    void act(
                      `areas/${targetArea}/filas`,
                      {
                        rowLabel: seatRow.rowLabel,
                        startNumber: Number(seatRow.startNumber),
                        endNumber: Number(seatRow.endNumber),
                      },
                      'Fila de poltronas numeradas gerada'
                    );
                  }}
                  className="b6-stack"
                  style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}
                >
                  <strong>Construtor de filas e poltronas numeradas (MAP-001)</strong>
                  <Field name="Setor do mapa">
                    <select
                      value={seatRow.areaId || event.areas[0]?.id || ''}
                      onChange={(e) => setSeatRow((s) => ({ ...s, areaId: e.target.value }))}
                    >
                      {event.areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field name="Identificador da fila (Ex.: A, B, F01)">
                    <input
                      required
                      value={seatRow.rowLabel}
                      onChange={(e) => setSeatRow((s) => ({ ...s, rowLabel: e.target.value }))}
                    />
                  </Field>
                  <Field name="Poltrona inicial">
                    <input
                      required
                      type="number"
                      min="1"
                      value={seatRow.startNumber}
                      onChange={(e) => setSeatRow((s) => ({ ...s, startNumber: e.target.value }))}
                    />
                  </Field>
                  <Field name="Poltrona final">
                    <input
                      required
                      type="number"
                      min="1"
                      value={seatRow.endNumber}
                      onChange={(e) => setSeatRow((s) => ({ ...s, endNumber: e.target.value }))}
                    />
                  </Field>
                  <button disabled={busy} className="b6-btn b6-btn-secondary">
                    Gerar fila numerada
                  </button>
                </form>
              )}
            </>
          )}
        </Panel>

        <Panel title="3. Modalidades de ingresso">
          <div className="b6-sublist">
            {event.ticketCategories.map((c) => (
              <div key={c.id}>{c.name}</div>
            ))}
            {!event.ticketCategories.length && <Empty message="Nenhuma modalidade cadastrada" />}
          </div>
          {editable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act('categorias', category, 'Modalidade adicionada');
              }}
              className="b6-stack"
            >
              <Field name="Nome da modalidade">
                <input
                  required
                  value={category.name}
                  onChange={(e) => setCategory((s) => ({ ...s, name: e.target.value }))}
                />
              </Field>
              <label>
                <input
                  type="checkbox"
                  checked={category.requiresProof}
                  onChange={(e) =>
                    setCategory((s) => ({ ...s, requiresProof: e.target.checked }))
                  }
                />{' '}
                Exige comprovação
              </label>
              <button disabled={busy} className="b6-btn">
                Adicionar modalidade
              </button>
            </form>
          )}
        </Panel>

        <Panel title="4. Lotes, preços e virada automática (LOT-001)">
          <div className="b6-sublist">
            {event.lots.map((l) => (
              <div key={l.id}>
                <strong>{l.name}</strong> · {brl(l.faceValueCents)} · Cap.: {l.capacity} · Reservados:{' '}
                {l.reservedCount ?? 0} · Emitidos: {l.issuedCount ?? 0} · Disponíveis:{' '}
                <strong>{l.availableCount ?? Math.max(0, l.capacity - (l.reservedCount ?? 0) - (l.issuedCount ?? 0))}</strong>{' '}
                · Status: <strong>{l.status}</strong>
              </div>
            ))}
            {!event.lots.length && <Empty message="Nenhum lote definido" />}
          </div>
          {event.lots.length > 0 && (
            <button
              type="button"
              disabled={busy}
              className="b6-btn b6-btn-secondary"
              style={{ marginBottom: 12 }}
              onClick={() => void act('lotes/processar-virada', {}, 'Virada e disponibilidade de lotes processadas')}
            >
              Processar virada automática de lote (LOT-001)
            </button>
          )}
          {editable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(
                  'lotes',
                  {
                    ...lot,
                    faceValueCents: Math.round(Number(lot.faceValueCents.replace(',', '.')) * 100),
                    capacity: Number(lot.capacity),
                    areaId: lot.areaId || undefined,
                    startsAt: iso(lot.startsAt),
                    endsAt: iso(lot.endsAt),
                  },
                  'Lote adicionado'
                );
              }}
              className="b6-stack"
            >
              <Field name="Lote">
                <input
                  required
                  value={lot.name}
                  onChange={(e) => setLot((s) => ({ ...s, name: e.target.value }))}
                />
              </Field>
              <Field name="Sessão">
                <select
                  required
                  value={lot.sessionId}
                  onChange={(e) => setLot((s) => ({ ...s, sessionId: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {event.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Modalidade">
                <select
                  required
                  value={lot.categoryId}
                  onChange={(e) => setLot((s) => ({ ...s, categoryId: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {event.ticketCategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Área (opcional)">
                <select
                  value={lot.areaId}
                  onChange={(e) => setLot((s) => ({ ...s, areaId: e.target.value }))}
                >
                  <option value="">Sem área específica</option>
                  {event.areas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field name="Valor nominal (R$)">
                <input
                  required
                  inputMode="decimal"
                  placeholder="0,00"
                  value={lot.faceValueCents}
                  onChange={(e) => setLot((s) => ({ ...s, faceValueCents: e.target.value }))}
                />
              </Field>
              <Field name="Quantidade">
                <input
                  required
                  type="number"
                  min="1"
                  value={lot.capacity}
                  onChange={(e) => setLot((s) => ({ ...s, capacity: e.target.value }))}
                />
              </Field>
              <Field name="Início da venda">
                <input
                  required
                  type="datetime-local"
                  value={lot.startsAt}
                  onChange={(e) => setLot((s) => ({ ...s, startsAt: e.target.value }))}
                />
              </Field>
              <Field name="Fim da venda">
                <input
                  required
                  type="datetime-local"
                  value={lot.endsAt}
                  onChange={(e) => setLot((s) => ({ ...s, endsAt: e.target.value }))}
                />
              </Field>
              <button disabled={busy} className="b6-btn">
                Adicionar lote
              </button>
            </form>
          )}
        </Panel>

        <Panel title="5. Canais de venda">
          <div className="b6-sublist">
            {(['ONLINE', 'PDV', 'BILHETERIA'] as const).map((kind) => (
              <div key={kind} className="b6-channel">
                <span>{kind}</span>
                <strong>
                  {event.channels.find((c) => c.channel === kind)?.enabled
                    ? 'Habilitado'
                    : 'Desabilitado'}
                </strong>
                {editable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void channel(kind, !event.channels.find((c) => c.channel === kind)?.enabled)
                    }
                  >
                    Alternar
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="6. Aprovações multi-área e publicação (EVT-001)">
          <div className="b6-sublist">
            {(['CADASTRAL', 'COMERCIAL', 'OPERACIONAL', 'PUBLICACAO'] as const).map((step) => {
              const ap = event.approvals.find((a) => a.step === step);
              return (
                <div key={step}>
                  {step}: <strong>{ap?.decision || 'Pendente'}</strong>
                  {ap?.reason ? ` — ${ap.reason}` : ''}
                </div>
              );
            })}
          </div>
          {event.status === 'RASCUNHO' || event.status === 'REPROVADO' ? (
            <button
              disabled={busy}
              className="b6-btn"
              type="button"
              onClick={() => void act('enviar-analise', {}, 'Evento enviado para análise')}
            >
              Enviar para análise
            </button>
          ) : null}
          {event.status === 'EM_ANALISE' && (
            <form
              className="b6-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void act('aprovacoes', approval, 'Avaliação registrada');
              }}
            >
              <Field name="Etapa / Área de liberação (EVT-001)">
                <select
                  value={approval.step}
                  onChange={(e) => setApproval((s) => ({ ...s, step: e.target.value }))}
                >
                  {(
                    [
                      'CADASTRAL',
                      'COMERCIAL',
                      'CONTRATO',
                      'OPERACIONAL',
                      'TECNICA',
                      'LOCAL',
                      'PUBLICACAO',
                    ] as const
                  ).map((step) => (
                    <option key={step}>{step}</option>
                  ))}
                </select>
              </Field>
              <Field name="Decisão">
                <select
                  value={approval.decision}
                  onChange={(e) => setApproval((s) => ({ ...s, decision: e.target.value }))}
                >
                  <option>APROVADO</option>
                  <option>REPROVADO</option>
                </select>
              </Field>
              <Field name="Justificativa">
                <textarea
                  value={approval.reason}
                  onChange={(e) => setApproval((s) => ({ ...s, reason: e.target.value }))}
                />
              </Field>
              <button disabled={busy} className="b6-btn">
                Registrar decisão
              </button>
            </form>
          )}
          {event.status === 'APROVADO' && (
            <>
              <h3>Pendências para publicação</h3>
              {issues.length ? (
                <ul>
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              ) : (
                <p className="b6-notice">Nenhuma pendência nas regras verificadas.</p>
              )}
              <button
                disabled={busy || issues.length > 0}
                className="b6-btn"
                onClick={() =>
                  void act(
                    'publicacoes/solicitar',
                    {},
                    'Solicitação criada; aguarde confirmação da integração com o site'
                  )
                }
              >
                Solicitar publicação
              </button>
            </>
          )}
          {event.status === 'PUBLICACAO_SOLICITADA' && (
            <p className="b6-notice">
              Solicitação aguardando comprovante de publicação do site. Nenhum anúncio foi
              confirmado ainda.
            </p>
          )}
        </Panel>

        <Panel title="7. Ocorrências, adiamento e visibilidade pública (EVT-002)">
          <p>
            <strong>Visibilidade no site público:</strong>{' '}
            {event.publiclyVisible ? 'Visível para venda' : 'Oculto do público (EVT-002)'}
          </p>
          <div className="b6-sublist">
            {(event.changeCases || []).map((c) => (
              <div key={c.id}>
                <strong>{c.changeType}</strong> ({c.status}): {c.reason}
              </div>
            ))}
            {!(event.changeCases || []).length && (
              <Empty message="Nenhuma ocorrência de adiamento/suspensão aberta" />
            )}
          </div>
          <form
            className="b6-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void act('ocorrencias', changeCase, 'Ocorrência registrada e visibilidade atualizada');
              setChangeCase({ changeType: 'ADIAMENTO', reason: '' });
            }}
          >
            <Field name="Tipo de ocorrência">
              <select
                value={changeCase.changeType}
                onChange={(e) => setChangeCase((s) => ({ ...s, changeType: e.target.value }))}
              >
                <option value="ADIAMENTO">ADIAMENTO (Oculta evento publicamente — EVT-002)</option>
                <option value="SUSPENSAO">SUSPENSAO (Suspende vendas)</option>
                <option value="ALTERACAO">ALTERACAO (Revisão operacional)</option>
                <option value="CANCELAMENTO">CANCELAMENTO (Cancela evento)</option>
              </select>
            </Field>
            <Field name="Justificativa auditável (mínimo 10 caracteres)">
              <textarea
                required
                minLength={10}
                value={changeCase.reason}
                onChange={(e) => setChangeCase((s) => ({ ...s, reason: e.target.value }))}
              />
            </Field>
            <button disabled={busy} className="b6-btn b6-btn-secondary">
              Registrar ocorrência
            </button>
          </form>
        </Panel>
      </div>
      <p className="b6-muted">
        Publicação externa real segue bloqueada até homologação do worker com o site. Nenhuma
        operação financeira é executada por esta tela.
      </p>
    </main>
  );
}
