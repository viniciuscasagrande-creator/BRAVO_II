'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

type AvailabilitySummary = {
  eventId: string;
  totals: {
    capacity: number;
    reservedCount: number;
    issuedCount: number;
    availableCount: number;
  };
};

export default function RelatorioAcessosPortariaPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [avail, setAvail] = useState<AvailabilitySummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get<EventSummary[]>('eventos')
      .then((items) => {
        setEvents(items);
        if (items[0]) setSelectedEventId(items[0].id);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    get<AvailabilitySummary>(`eventos/${selectedEventId}/disponibilidade`)
      .then(setAvail)
      .catch(() => setAvail(null));
  }, [selectedEventId]);

  return (
    <main className="b6">
      <Head
        title="REL-03 · Relatório de Acessos, Portaria e Ocupação"
        description="Acompanhamento de ingressos emitidos, capacidade ocupada e validações de portaria por evento."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/relatorios">
              Central de Relatórios (REL-01)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/portaria/validacoes">
              Validações de Portaria (PRT-01)
            </Link>
          </div>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Selecionar evento">
          <Field name="Evento">
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              <option value="">Selecione...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.status})
                </option>
              ))}
            </select>
          </Field>
        </Panel>

        <Panel title="Indicadores reais de emissão e ocupação">
          {avail ? (
            <div className="b6-sublist">
              <div>
                <strong>Capacidade total configurada:</strong> {avail.totals.capacity}
              </div>
              <div>
                <strong>Ingressos emitidos (aptos a check-in):</strong> {avail.totals.issuedCount}
              </div>
              <div>
                <strong>Reservas ativas (aguardando liquidação):</strong>{' '}
                {avail.totals.reservedCount}
              </div>
              <div>
                <strong>Saldo disponível:</strong> {avail.totals.availableCount}
              </div>
            </div>
          ) : (
            <Empty message="Selecione um evento para consultar a ocupação." />
          )}
        </Panel>
      </div>
    </main>
  );
}
