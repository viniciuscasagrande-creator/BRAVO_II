'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, ProducerFull, ProducerSummary } from '../../../lib/bravo-api';
import { dateBR, Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function ContratosComerciaisPage() {
  const [producers, setProducers] = useState<ProducerSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ProducerFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    contractNumber: '',
    title: '',
    status: 'ACTIVE',
    documentHash: '',
  });

  const loadProducers = useCallback(() => {
    setLoading(true);
    get<ProducerSummary[]>('comercial/produtores')
      .then((items) => {
        setProducers(items);
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const loadDetail = useCallback((id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    get<ProducerFull>(`comercial/produtores/${id}`)
      .then(setDetail)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    loadProducers();
  }, [loadProducers]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function createContract(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`comercial/produtores/${selectedId}/contratos`, form);
      setMessage(`Contrato ${form.contractNumber} registrado com sucesso.`);
      setForm({ contractNumber: '', title: '', status: 'ACTIVE', documentHash: '' });
      loadDetail(selectedId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="COM-06 · Contratos Comerciais de Produtores"
        description="Gestão de minutas, contratos vigentes e hash de integridade documental por produtor PJ."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/comercial/produtores">
            Ver Produtores
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Registrar contrato comercial">
          <form onSubmit={createContract} className="b6-stack">
            <Field name="Produtora PJ">
              <select
                required
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName} ({p.cnpj})
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Número do contrato">
              <input
                required
                value={form.contractNumber}
                onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                placeholder="Ex.: CTR-2026-001"
              />
            </Field>
            <Field name="Objeto / Título">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contrato de Prestação de Serviços de Bilheteria"
              />
            </Field>
            <Field name="Situação">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE (Vigente)</option>
                <option value="DRAFT">DRAFT (Minuta)</option>
              </select>
            </Field>
            <Field name="Hash SHA-256 / Referência de arquivo (opcional)">
              <input
                value={form.documentHash}
                onChange={(e) => setForm({ ...form, documentHash: e.target.value })}
                placeholder="Ex.: sha256:9f86d08..."
              />
            </Field>
            <button className="b6-btn" disabled={busy || !selectedId}>
              {busy ? 'Salvando...' : 'Registrar contrato'}
            </button>
          </form>
        </Panel>

        <Panel title="Contratos vinculados ao produtor selecionado">
          {loading ? (
            <p>Carregando...</p>
          ) : detail?.contracts && detail.contracts.length > 0 ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.contracts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contractNumber}</td>
                      <td>{c.title}</td>
                      <td>{c.status}</td>
                      <td>{c.signedAt ? dateBR(c.signedAt) : 'Pendente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum contrato registrado para o produtor selecionado." />
          )}
        </Panel>
      </div>
    </main>
  );
}
