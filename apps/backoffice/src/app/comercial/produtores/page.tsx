'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { get, ProducerSummary } from '../../../lib/bravo-api';
import { Empty, Head, Notice } from '../../../components/bravo-p06';

export default function ProducersPage() {
  const [rows, setRows] = useState<ProducerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    get<ProducerSummary[]>('comercial/produtores')
      .then(setRows)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (statusFilter !== 'TODOS' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.legalName.toLowerCase().includes(q) ||
        (p.tradeName || '').toLowerCase().includes(q) ||
        p.cnpj.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  return (
    <main className="b6">
      <Head
        title="COM-01 · Central de Produtores PJ"
        description="Cadastro empresarial completo (CNPJ numérico e alfanumérico 2026), validação cadastral com segregação maker-checker e eventos vinculados."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/comercial/aprovacoes">
              Fila de Aprovações
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/comercial/contratos">
              Contratos
            </Link>
            <Link className="b6-btn" href="/comercial/produtores/novo">
              Novo produtor
            </Link>
          </div>
        }
      />
      <Notice text={error} error />
      <section className="b6-panel" style={{ marginBottom: 16 }}>
        <div className="b6-grid">
          <label className="b6-field">
            Buscar por Razão Social, Nome Fantasia ou CNPJ
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite nome ou CNPJ..."
            />
          </label>
          <label className="b6-field">
            Filtrar por situação cadastral
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="TODOS">Todos os status ({rows.length})</option>
              <option value="ATIVO">ATIVO</option>
              <option value="CADASTRO_EM_REVISAO">CADASTRO_EM_REVISAO</option>
              <option value="PENDENTE_AJUSTE">PENDENTE_AJUSTE</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
            </select>
          </label>
        </div>
        <div className="b6-actions" style={{ marginTop: 10 }}>
          <button type="button" className="b6-btn b6-btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : 'Recarregar lista'}
          </button>
        </div>
      </section>
      {loading ? (
        <p>Carregando registros...</p>
      ) : filtered.length ? (
        <div className="b6-panel b6-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Razão social</th>
                <th>CNPJ</th>
                <th>Situação</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/comercial/produtores/${p.id}`}>{p.legalName}</Link>
                  </td>
                  <td>{p.cnpj}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <Link className="b6-btn b6-btn-secondary" href={`/comercial/produtores/${p.id}`}>
                      Abrir ficha
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && <Empty message="Nenhuma produtora encontrada para os filtros selecionados." />
      )}
    </main>
  );
}
