'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { EventFull, EventSummary, get, post } from '../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../components/bravo-p06';

export default function ConstrutorMapasPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [detail, setDetail] = useState<EventFull | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [areaForm, setAreaForm] = useState({
    label: '',
    capacity: 200,
    isNumbered: true,
  });
  const [rowForm, setRowForm] = useState({
    rowLabel: 'A',
    startNumber: 1,
    endNumber: 20,
    isAccessible: false,
  });

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

  const loadDetail = useCallback((id: string) => {
    if (!id) return;
    get<EventFull>(`eventos/${id}`)
      .then((ev) => {
        setDetail(ev);
        if (ev.areas.length > 0 && !selectedAreaId) {
          setSelectedAreaId(ev.areas[0].id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedAreaId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) loadDetail(selectedEventId);
  }, [selectedEventId, loadDetail]);

  async function createSector(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${selectedEventId}/areas`, {
        label: areaForm.label,
        capacity: Number(areaForm.capacity),
        isNumbered: areaForm.isNumbered,
      });
      setMessage(`Setor '${areaForm.label}' criado no mapa do evento.`);
      setAreaForm({ label: '', capacity: 200, isNumbered: true });
      loadDetail(selectedEventId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generateRow(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEventId || !selectedAreaId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res = await post<{ createdSeatsCount: number }>(
        `eventos/${selectedEventId}/areas/${selectedAreaId}/filas`,
        {
          rowLabel: rowForm.rowLabel,
          startNumber: Number(rowForm.startNumber),
          endNumber: Number(rowForm.endNumber),
          isAccessible: rowForm.isAccessible,
        }
      );
      setMessage(`${res.createdSeatsCount} poltrona(s) numerada(s) gerada(s) na fila ${rowForm.rowLabel}.`);
      loadDetail(selectedEventId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicateArea(areaId: string, label: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${selectedEventId}/areas/${areaId}/duplicar`, {
        newLabel: `${label} (Cópia)`,
      });
      setMessage(`Setor '${label}' duplicado com poltronas.`);
      loadDetail(selectedEventId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteArea(areaId: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`eventos/${selectedEventId}/areas/${areaId}/excluir`);
      setMessage('Setor excluído com sucesso.');
      loadDetail(selectedEventId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="MAP-01 · Construtor de Mapas, Setores, Filas e Poltronas"
        description="Editor estruturado de setores numerados ou pista livre, geração de filas em lote, duplicação de layout e exclusão protegida."
        action={
          selectedEventId ? (
            <Link className="b6-btn b6-btn-secondary" href={`/eventos/${selectedEventId}/mapa`}>
              Ver Mapa de Ocupação (MAP-02)
            </Link>
          ) : null
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <Panel title="Evento alvo do construtor">
        <Field name="Selecionar evento">
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

      <div className="b6-grid" style={{ marginTop: 18 }}>
        <Panel title="1. Criar setor / área no mapa">
          <form onSubmit={createSector} className="b6-stack">
            <Field name="Nome do setor">
              <input
                required
                value={areaForm.label}
                onChange={(e) => setAreaForm({ ...areaForm, label: e.target.value })}
                placeholder="Ex.: Plateia Ouro"
              />
            </Field>
            <Field name="Capacidade total">
              <input
                required
                type="number"
                min={1}
                value={areaForm.capacity}
                onChange={(e) => setAreaForm({ ...areaForm, capacity: Number(e.target.value) })}
              />
            </Field>
            <label className="b6-field">
              <input
                type="checkbox"
                checked={areaForm.isNumbered}
                onChange={(e) => setAreaForm({ ...areaForm, isNumbered: e.target.checked })}
              />{' '}
              Setor numerado (alocação por poltrona individual)
            </label>
            <button className="b6-btn" disabled={busy || !selectedEventId}>
              Criar setor
            </button>
          </form>
        </Panel>

        <Panel title="2. Gerar fila de poltronas numeradas em lote">
          <form onSubmit={generateRow} className="b6-stack">
            <Field name="Setor numerado">
              <select
                required
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {(detail?.areas || [])
                  .filter((a) => a.isNumbered)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} (Cap. {a.capacity})
                    </option>
                  ))}
              </select>
            </Field>
            <Field name="Identificador da fila (A–Z)">
              <input
                required
                value={rowForm.rowLabel}
                onChange={(e) => setRowForm({ ...rowForm, rowLabel: e.target.value.toUpperCase() })}
              />
            </Field>
            <div className="b6-grid">
              <Field name="Poltrona inicial">
                <input
                  required
                  type="number"
                  min={1}
                  value={rowForm.startNumber}
                  onChange={(e) =>
                    setRowForm({ ...rowForm, startNumber: Number(e.target.value) })
                  }
                />
              </Field>
              <Field name="Poltrona final">
                <input
                  required
                  type="number"
                  min={1}
                  value={rowForm.endNumber}
                  onChange={(e) => setRowForm({ ...rowForm, endNumber: Number(e.target.value) })}
                />
              </Field>
            </div>
            <label className="b6-field">
              <input
                type="checkbox"
                checked={rowForm.isAccessible}
                onChange={(e) => setRowForm({ ...rowForm, isAccessible: e.target.checked })}
              />{' '}
              Fila / assentos acessíveis (PCD / PMR)
            </label>
            <button className="b6-btn" disabled={busy || !selectedAreaId}>
              Gerar fila numerada
            </button>
          </form>
        </Panel>
      </div>

      <section className="b6-panel" style={{ marginTop: 18 }}>
        <h2>Setores e poltronas do mapa ({detail?.areas.length || 0})</h2>
        {detail?.areas && detail.areas.length > 0 ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Setor</th>
                  <th>Tipo</th>
                  <th>Capacidade</th>
                  <th>Poltronas Geradas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {detail.areas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.label}</td>
                    <td>{a.isNumbered ? 'Numerado' : 'Pista / Livre'}</td>
                    <td>{a.capacity}</td>
                    <td>{a.seatsCount ?? a.seats?.length ?? 0}</td>
                    <td>
                      <div className="b6-actions">
                        <button
                          type="button"
                          className="b6-btn b6-btn-secondary"
                          disabled={busy}
                          onClick={() => duplicateArea(a.id, a.label)}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="b6-btn b6-btn-secondary"
                          disabled={busy}
                          onClick={() => deleteArea(a.id)}
                        >
                          Excluir se vazio
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty message="Nenhum setor configurado para o evento selecionado." />
        )}
      </section>
    </main>
  );
}
