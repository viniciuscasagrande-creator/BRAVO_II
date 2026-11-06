'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Head, Notice, Empty, dateBR, Panel } from '../../../components/bravo-p06';
import { currentSession, get, post } from '../../../lib/bravo-api';

type Terminal = {
  id: string;
  code: string;
  label: string;
  venue: string;
  status: string;
  createdAt: string;
};

export default function Pdv() {
  const [rows, setRows] = useState<Terminal[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', venue: '' });

  async function load() {
    const result = await get<{ items: Terminal[] }>('pdv/terminais');
    setRows(result.items);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    currentSession()
      .then((s) => setIsAdmin(s.user.roles.some((r) => ['ADMIN', 'ADMIN_BRAVO'].includes(r))))
      .catch(() => {});
  }, []);

  async function register(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await post<{ code: string; status: string }>('pdv/terminais', {
        ...form,
        code: form.code.toUpperCase(),
      });
      setMessage(
        `Terminal ${result.code} registrado como ${result.status}. Nenhuma venda foi habilitada.`
      );
      setForm({ code: '', label: '', venue: '' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="b6">
      <Head
        title="PDV e Bilheteria"
        description="Cadastro administrativo dos terminais físicos e preparação dos turnos de operadores."
      />
      <div className="bravo-warning">
        Equipamentos e operações de PDV permanecem BLOQUEADOS. Cadastro do terminal não autoriza
        venda, captura em cartão, emissão de ingressos ou abertura de caixa.
      </div>
      <Notice text={error} error />
      {message && <Notice text={message} />}
      {isAdmin && (
        <div style={{ marginTop: 18, maxWidth: 720 }}>
          <Panel title="Registrar terminal">
            <form className="b6-stack" onSubmit={register}>
              <label className="b6-field">
                Código exclusivo do terminal
                <input
                  required
                  value={form.code}
                  minLength={3}
                  maxLength={32}
                  placeholder="Ex.: PDV_CWB_001"
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="b6-field">
                Identificação
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </label>
              <label className="b6-field">
                Local de operação
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </label>
              <button className="b6-btn" disabled={busy}>
                Registrar terminal bloqueado
              </button>
            </form>
          </Panel>
        </div>
      )}
      <section className="b6-panel" style={{ marginTop: 18 }}>
        <h2>Terminais cadastrados</h2>
        {rows.length ? (
          <div className="b6-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Local</th>
                  <th>Situação</th>
                  <th>Cadastrado em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.code}</td>
                    <td>{t.label}</td>
                    <td>{t.venue}</td>
                    <td>{t.status}</td>
                    <td>{dateBR(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty message="Nenhum terminal cadastrado neste ambiente." />
        )}
      </section>
    </main>
  );
}
