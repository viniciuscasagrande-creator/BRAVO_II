'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, ProducerSummary } from '../../../lib/bravo-api';
import { Empty, Head, Notice } from '../../../components/bravo-p06';

export default function ProducersPage() {
  const [rows, setRows] = useState<ProducerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get<ProducerSummary[]>('comercial/produtores')
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="b6">
      <Head
        title="Central de Produtores PJ"
        description="Cadastro empresarial completo (CNPJ numérico e alfanumérico 2026), validação cadastral com segregação maker-checker e eventos vinculados."
        action={
          <Link className="b6-btn" href="/comercial/produtores/novo">
            Novo produtor
          </Link>
        }
      />
      <Notice text={error} error />
      {loading ? (
        <p>Carregando registros...</p>
      ) : rows.length ? (
        <div className="b6-panel b6-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Razão social</th>
                <th>CNPJ</th>
                <th>Situação</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/comercial/produtores/${p.id}`}>{p.legalName}</Link>
                  </td>
                  <td>{p.cnpj}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && <Empty message="Nenhuma produtora cadastrada. Use ‘Novo produtor’ para iniciar." />
      )}
    </main>
  );
}
