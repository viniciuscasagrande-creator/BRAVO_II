'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post, ProducerFull, ProducerSummary } from '../../../lib/bravo-api';
import { Empty, Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function BeneficiariosContasPage() {
  const [producers, setProducers] = useState<ProducerSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ProducerFull | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleType: 'FINANCE',
    isPrimary: false,
  });

  const loadProducers = useCallback(() => {
    get<ProducerSummary[]>('comercial/produtores')
      .then((items) => {
        setProducers(items);
        if (items.length > 0 && !selectedId) {
          setSelectedId(items[0].id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [selectedId]);

  const loadDetail = useCallback((id: string) => {
    if (!id) return;
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

  async function addBeneficiaryContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await post(`comercial/produtores/${selectedId}/contatos`, form);
      setMessage('Responsável / beneficiário financeiro vinculado ao produtor e auditado.');
      setForm({ fullName: '', email: '', phone: '', roleType: 'FINANCE', isPrimary: false });
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
        title="COM-07 · Contas, Representantes e Beneficiários"
        description="Gestão de titulares, responsáveis financeiros e vínculo com contas bancárias homologadas para repasse."
        action={
          <Link
            className="b6-btn b6-btn-secondary"
            href="/financeiro/operacoes/produtores/contas-bancarias"
          >
            Contas Bancárias no Financeiro
          </Link>
        }
      />
      <Notice text={error} error />
      <Notice text={message} />

      <div className="b6-grid">
        <Panel title="Vincular representante financeiro / titular autorizado">
          <form onSubmit={addBeneficiaryContact} className="b6-stack">
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
            <Field name="Nome completo do titular/responsável">
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field name="E-mail corporativo">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field name="Telefone">
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field name="Função">
              <select
                value={form.roleType}
                onChange={(e) => setForm({ ...form, roleType: e.target.value })}
              >
                <option value="FINANCE">FINANCE (Responsável Financeiro / Repasses)</option>
                <option value="LEGAL_REPRESENTATIVE">LEGAL_REPRESENTATIVE (Representante Legal)</option>
                <option value="OPERATIONS">OPERATIONS (Operações)</option>
              </select>
            </Field>
            <button className="b6-btn" disabled={busy || !selectedId}>
              {busy ? 'Salvando...' : 'Registrar responsável autorizado'}
            </button>
          </form>
        </Panel>

        <Panel title="Titulares e responsáveis vinculados">
          {detail?.contacts && detail.contacts.length > 0 ? (
            <div className="b6-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.contacts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fullName}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.roleType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Nenhum responsável adicional cadastrado para este produtor." />
          )}
        </Panel>
      </div>
    </main>
  );
}
