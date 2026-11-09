'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get, post } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function LocaisEventosPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [notes, setNotes] = useState('Alvará e capacidade técnica do local verificados.');

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

  async function authorizeVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${selectedEventId}/aprovacoes`, {
        area: 'LOCAL',
        decision: 'APROVADO',
        notes,
      });
      setMessage('Autorização técnica e operacional do local registrada com trilha de auditoria.');
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
        title="EVT-10 · Locais de Eventos, Capacidades e Autorizações"
        description="Catálogo operacional de locais/arenas vinculados aos eventos e registro de autorização de uso do local (alçada LOCAL)."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/eventos">
            Voltar para Eventos
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Homologar autorização de uso do local (Alçada LOCAL)">
          <form onSubmit={authorizeVenue} className="b6-stack">
            <Field name="Evento / Local">
              <select
                required
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.venueName} ({ev.venueCity}/{ev.venueState}) — {ev.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Parecer de vistoria / alvará do local">
              <textarea
                required
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <button className="b6-btn" disabled={busy || !selectedEventId}>
              {busy ? 'Salvando...' : 'Autorizar uso do local no evento'}
            </button>
          </form>
        </Panel>

        <Panel title={`Locais registrados nos eventos (${events.length})`}>
          {loading ? (
            <p>Carregando locais...</p>
          ) : events.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Local / Arena</th>
                    <th>Cidade / UF</th>
                    <th>Evento Vinculado</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.venueName}</td>
                      <td>
                        {ev.venueCity}/{ev.venueState}
                      </td>
                      <td>
                        <Link href={`/eventos/${ev.id}`}>{ev.name}</Link>
                      </td>
                      <td>{ev.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum local vinculado a evento neste ambiente." />
          )}
        </Panel>
      </div>
    </main>
  );
}
