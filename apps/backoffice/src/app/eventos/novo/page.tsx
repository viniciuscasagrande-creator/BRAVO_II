'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { get, post, ProducerSummary } from '../../../lib/bravo-api';
import { Head, Panel, Field, Notice } from '../../../components/bravo-p06';

const initial = {
  name: '',
  description: '',
  venueName: '',
  venueCity: '',
  venueState: '',
  startAt: '',
  endAt: '',
  salesStartAt: '',
  ageRating: '',
  policyUrl: '',
  primaryProducerId: '',
};

const instant = (v: string) => (v ? new Date(v).toISOString() : '');

export default function NewEvent() {
  const [v, setV] = useState(initial);
  const [producers, setProducers] = useState<ProducerSummary[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    get<ProducerSummary[]>('comercial/produtores')
      .then(setProducers)
      .catch((e) => setError(e.message));
  }, []);

  const change = (k: keyof typeof initial, txt: string) => setV((s) => ({ ...s, [k]: txt }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = {
        ...v,
        startAt: instant(v.startAt),
        endAt: instant(v.endAt),
        salesStartAt: instant(v.salesStartAt),
      };
      const created = await post<{ id: string }>('eventos', data);
      router.push(`/eventos/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="Novo evento (Event Builder)"
        description="Etapa 1: informações gerais. Sessões, setores, lotes, preços, canais e Taxa Disk serão adicionados no Event Builder."
      />
      <Notice text={error} error />
      <form onSubmit={save} className="b6-stack">
        <Panel title="Informações gerais">
          <div className="b6-grid">
            <Field name="Nome do evento">
              <input required value={v.name} onChange={(e) => change('name', e.target.value)} />
            </Field>
            <Field name="Produtor principal">
              <select
                required
                value={v.primaryProducerId}
                onChange={(e) => change('primaryProducerId', e.target.value)}
              >
                <option value="">Selecione...</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName} · {p.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Local">
              <input
                required
                value={v.venueName}
                onChange={(e) => change('venueName', e.target.value)}
              />
            </Field>
            <Field name="Cidade">
              <input
                required
                value={v.venueCity}
                onChange={(e) => change('venueCity', e.target.value)}
              />
            </Field>
            <Field name="UF">
              <input
                required
                maxLength={2}
                value={v.venueState}
                onChange={(e) => change('venueState', e.target.value.toUpperCase())}
              />
            </Field>
            <Field name="Classificação indicativa">
              <input
                required
                value={v.ageRating}
                onChange={(e) => change('ageRating', e.target.value)}
              />
            </Field>
            <Field name="Início do evento">
              <input
                required
                type="datetime-local"
                value={v.startAt}
                onChange={(e) => change('startAt', e.target.value)}
              />
            </Field>
            <Field name="Fim do evento">
              <input
                required
                type="datetime-local"
                value={v.endAt}
                onChange={(e) => change('endAt', e.target.value)}
              />
            </Field>
            <Field name="Abertura prevista das vendas">
              <input
                required
                type="datetime-local"
                value={v.salesStartAt}
                onChange={(e) => change('salesStartAt', e.target.value)}
              />
            </Field>
            <Field name="URL da política do evento">
              <input
                required
                type="url"
                value={v.policyUrl}
                onChange={(e) => change('policyUrl', e.target.value)}
              />
            </Field>
          </div>
          <Field name="Descrição pública (mínimo 20 caracteres)">
            <textarea
              required
              rows={5}
              value={v.description}
              onChange={(e) => change('description', e.target.value)}
            />
          </Field>
        </Panel>
        <button className="b6-btn" disabled={busy}>
          {busy ? 'Salvando...' : 'Criar rascunho do evento'}
        </button>
      </form>
    </main>
  );
}
