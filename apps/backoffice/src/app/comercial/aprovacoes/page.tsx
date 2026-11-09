'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, ProducerSummary } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function AprovacoesProdutoresPage() {
  const [rows, setRows] = useState<ProducerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [decision, setDecision] = useState<'APROVAR' | 'SOLICITAR_AJUSTE' | 'BLOQUEAR'>('APROVAR');
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    get<ProducerSummary[]>('comercial/produtores')
      .then((items) => {
        setRows(items);
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`comercial/produtores/${selectedId}/revisao-cadastral`, {
        decision,
        reason,
      });
      setMessage(`Decisão '${decision}' registrada e auditada com sucesso.`);
      setReason('');
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
        title="COM-04 · Aprovação Cadastral de Produtores"
        description="Fila de homologação cadastral e documental de produtores PJ com segregação maker-checker e justificativa auditada."
        action={
          <Link className="b6-btn b6-btn-secondary" href="/comercial/produtores">
            Voltar para Produtores
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Registrar decisão de aprovação / bloqueio">
          <form onSubmit={submitReview} className="b6-stack">
            <Field name="Produtora PJ">
              <select
                required
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {rows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName} ({p.cnpj}) — {p.status}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="Decisão">
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as typeof decision)}
              >
                <option value="APROVAR">APROVAR (liberar cadastro)</option>
                <option value="SOLICITAR_AJUSTE">SOLICITAR_AJUSTE (pendência documental)</option>
                <option value="BLOQUEAR">BLOQUEAR (impedimento cadastral)</option>
              </select>
            </Field>
            <Field name="Justificativa / parecer técnico (mínimo 8 caracteres)">
              <textarea
                required
                minLength={8}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o parecer de conferência..."
              />
            </Field>
            <button className="b6-btn" disabled={busy || !selectedId}>
              {busy ? 'Processando...' : 'Confirmar decisão auditada'}
            </button>
          </form>
        </Panel>

        <Panel title="Situação das produtoras cadastradas">
          {loading ? (
            <p>Carregando fila...</p>
          ) : rows.length ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Razão Social</th>
                    <th>CNPJ</th>
                    <th>Situação</th>
                    <th>Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>{p.legalName}</td>
                      <td>{p.cnpj}</td>
                      <td>{p.status}</td>
                      <td>
                        <Link href={`/comercial/produtores/${p.id}`}>Ver ficha</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhuma produtora na fila de aprovação." />
          )}
        </Panel>
      </div>
    </main>
  );
}
