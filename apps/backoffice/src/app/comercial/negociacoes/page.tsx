'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get, post } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function NegociacoesComerciaisPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [mode, setMode] = useState<'PERCENTUAL' | 'FIXO'>('PERCENTUAL');
  const [percentBps, setPercentBps] = useState(1200);
  const [fixedCents, setFixedCents] = useState(1500);
  const [contractReference, setContractReference] = useState('CTR-NEG-2026');
  const [notes, setNotes] = useState('Condição comercial negociada para o evento.');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    get<EventSummary[]>('eventos')
      .then((items) => {
        setEvents(items);
        if (items.length > 0 && !selectedEventId) {
          setSelectedEventId(items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNegotiation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${selectedEventId}/taxa-disk`, {
        mode,
        percentBps: mode === 'PERCENTUAL' ? Number(percentBps) : undefined,
        fixedCents: mode === 'FIXO' ? Number(fixedCents) : undefined,
        contractReference,
        notes,
        effectiveFrom: new Date().toISOString(),
      });
      setMessage('Negociação de Taxa Disk por evento versionada e persistida com sucesso.');
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
        title="COM-05 · Negociações e Planos Comerciais por Evento"
        description="Parametrização individual e versionada da Taxa Disk por evento (percentual em bps ou valor fixo em centavos). Nunca global por produtor."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/comercial/produtores">
            Produtores PJ
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Registrar nova versão de negociação por evento">
          <form onSubmit={saveNegotiation} className="b6-stack">
            <Field name="Evento">
              <select
                required
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Selecione o evento...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Modalidade da Taxa Disk">
              <select value={mode} onChange={(e) => setMode(e.target.value as 'PERCENTUAL' | 'FIXO')}>
                <option value="PERCENTUAL">PERCENTUAL (bps: 1000 = 10%)</option>
                <option value="FIXO">FIXO (centavos: 1500 = R$ 15,00)</option>
              </select>
            </Field>
            {mode === 'PERCENTUAL' ? (
              <Field name="Alíquota em basis points (bps)">
                <input
                  type="number"
                  required
                  min={0}
                  max={10000}
                  value={percentBps}
                  onChange={(e) => setPercentBps(Number(e.target.value))}
                />
              </Field>
            ) : (
              <Field name="Valor fixo em centavos">
                <input
                  type="number"
                  required
                  min={0}
                  value={fixedCents}
                  onChange={(e) => setFixedCents(Number(e.target.value))}
                />
              </Field>
            )}
            <Field name="Referência contratual">
              <input
                required
                value={contractReference}
                onChange={(e) => setContractReference(e.target.value)}
              />
            </Field>
            <Field name="Observações da negociação">
              <textarea
                required
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <button className="b6-btn" disabled={busy || !selectedEventId}>
              {busy ? 'Salvando...' : 'Versionar negociação no evento'}
            </button>
          </form>
        </Panel>

        <Panel title="Eventos e histórico de taxas">
          {loading ? (
            <p>Carregando eventos...</p>
          ) : events.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Local</th>
                    <th>Status</th>
                    <th>Histórico de Taxas</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.name}</td>
                      <td>
                        {ev.venueName} ({ev.venueCity})
                      </td>
                      <td>{ev.status}</td>
                      <td>
                        <Link href={`/comercial/eventos/${ev.id}/taxas`}>Abrir versões</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum evento disponível para negociação." />
          )}
        </Panel>
      </div>
    </main>
  );
}
