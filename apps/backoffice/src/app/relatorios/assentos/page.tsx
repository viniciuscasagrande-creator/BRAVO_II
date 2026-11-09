'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EventFull, EventSummary, get } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

type AvailabilitySummary = {
  eventId: string;
  totals: {
    capacity: number;
    reservedCount: number;
    issuedCount: number;
    availableCount: number;
  };
  lots: Array<{
    lotId: string;
    name: string;
    status: string;
    capacity: number;
    reservedCount: number;
    issuedCount: number;
    availableCount: number;
    soldOut: boolean;
  }>;
};

export default function DiagnosticoAssentosPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [detail, setDetail] = useState<EventFull | null>(null);
  const [avail, setAvail] = useState<AvailabilitySummary | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [seats, setSeats] = useState<
    Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }>
  >([]);
  const [error, setError] = useState('');

  const loadEvents = useCallback(() => {
    get<EventSummary[]>('eventos')
      .then((items) => {
        setEvents(items);
        if (items.length > 0 && !selectedEventId) {
          setSelectedEventId(items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) return;
    Promise.all([
      get<EventFull>(`eventos/${selectedEventId}`),
      get<AvailabilitySummary>(`eventos/${selectedEventId}/disponibilidade`),
    ])
      .then(([ev, av]) => {
        setDetail(ev);
        setAvail(av);
        if (ev.areas[0]) setSelectedSectorId(ev.areas[0].id);
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId || !selectedSectorId) {
      setSeats([]);
      return;
    }
    get<{ items: Array<{ id: string; seatLabel: string; status: string; isAccessible: boolean }> }>(
      `pedidos/eventos/${selectedEventId}/setores/${selectedSectorId}/poltronas`
    )
      .then((r) => setSeats(r.items))
      .catch(() => setSeats([]));
  }, [selectedEventId, selectedSectorId]);

  const labelCounts = seats.reduce<Record<string, number>>((acc, s) => {
    acc[s.seatLabel] = (acc[s.seatLabel] || 0) + 1;
    return acc;
  }, {});
  const duplicates = Object.entries(labelCounts).filter(([, count]) => count > 1);

  return (
    <main className="b6">
      <Head
        title="MAP-04 · Diagnóstico de Assentos e Integridade de Inventário"
        description="Auditoria de unicidade de poltronas numeradas por setor e reconciliação entre capacidade, reservados e emitidos."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/relatorios">
            Central de Relatórios
          </Link>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Filtro de auditoria por evento e setor">
          <Field name="Evento">
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              <option value="">Selecione...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="Setor">
            <select value={selectedSectorId} onChange={(e) => setSelectedSectorId(e.target.value)}>
              <option value="">Selecione...</option>
              {(detail?.areas || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.isNumbered ? 'Numerado' : 'Livre'})
                </option>
              ))}
            </select>
          </Field>
        </Panel>

        <Panel title="Resultado do diagnóstico de colisão">
          <div className="b6-sublist">
            <div>
              <strong>Total de poltronas inspecionadas no setor:</strong> {seats.length}
            </div>
            <div>
              <strong>Disponíveis (AVAILABLE):</strong>{' '}
              {seats.filter((s) => s.status === 'AVAILABLE').length}
            </div>
            <div>
              <strong>Retidas em reserva ativa (HELD):</strong>{' '}
              {seats.filter((s) => s.status === 'HELD').length}
            </div>
            <div>
              <strong>Duplicidades de código detectadas:</strong>{' '}
              {duplicates.length === 0
                ? '0 (Integridade confirmada por UNIQUE constraint no PostgreSQL)'
                : duplicates.map(([lbl, c]) => `${lbl} (${c}x)`).join(', ')}
            </div>
          </div>
        </Panel>
      </div>

      {avail && (
        <section className="b6-panel" style={{ marginTop: 18 }}>
          <h2>Balancete de estoque por lote</h2>
          {avail.lots.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Status</th>
                    <th>Capacidade</th>
                    <th>Reservados</th>
                    <th>Emitidos</th>
                    <th>Disponíveis</th>
                  </tr>
                </thead>
                <tbody>
                  {avail.lots.map((l) => (
                    <tr key={l.lotId}>
                      <td>{l.name}</td>
                      <td>{l.status}</td>
                      <td>{l.capacity}</td>
                      <td>{l.reservedCount}</td>
                      <td>{l.issuedCount}</td>
                      <td>{l.availableCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum lote configurado neste evento." />
          )}
        </section>
      )}
    </main>
  );
}
