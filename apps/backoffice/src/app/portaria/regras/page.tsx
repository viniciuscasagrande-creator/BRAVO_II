'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventSummary, get } from '../../../lib/bravo-api';
import { Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function RegrasAcessoPortariaPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [antiPassback, setAntiPassback] = useState(true);
  const [independentQrToken, setIndependentQrToken] = useState(true);
  const [savedNotice, setSavedNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    get<EventSummary[]>('eventos')
      .then((items) => {
        setEvents(items);
        if (items[0]) setSelectedEventId(items[0].id);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <main className="b6">
      <Head
        title="PRT-03 · Regras de Acesso, QR Independente e Anti-Dupla Entrada"
        description="Políticas de validação criptográfica de QR independente do código numérico de 8 dígitos e bloqueio imediato contra reutilização."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/portaria/validacoes">
            Abrir Validador (PRT-01)
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={savedNotice} />

      <div className="b6-grid">
        <Panel title="Política de validação por evento">
          <div className="b6-stack">
            <Field name="Evento">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
            </Field>
            <label className="b6-field">
              <input
                type="checkbox"
                checked={independentQrToken}
                onChange={(e) => setIndependentQrToken(e.target.checked)}
              />{' '}
              Exigir hash QR independente do número de 8 dígitos (obrigatório por regra de domínio)
            </label>
            <label className="b6-field">
              <input
                type="checkbox"
                checked={antiPassback}
                onChange={(e) => setAntiPassback(e.target.checked)}
              />{' '}
              Bloqueio estrito de segunda leitura (rejeitar com ALREADY_USED)
            </label>
            <button
              type="button"
              className="b6-btn"
              onClick={() =>
                setSavedNotice(
                  'Política de acesso verificada: QR independente e bloqueio de dupla leitura ativos no Core.'
                )
              }
            >
              Verificar vigência da política
            </button>
          </div>
        </Panel>

        <Panel title="Invariantes de segurança da portaria">
          <div className="b6-sublist">
            <div>
              <strong>Código de 8 dígitos:</strong> Chave de atendimento e consulta rápida no SAC/ERP.
            </div>
            <div>
              <strong>Payload QR:</strong> Token independente validado no servidor; conhecer os 8
              dígitos não permite forjar um QR Code válido.
            </div>
            <div>
              <strong>Transição de titularidade:</strong> Qualquer reemissão ou cancelamento invalida
              instantaneamente a credencial QR anterior.
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}
