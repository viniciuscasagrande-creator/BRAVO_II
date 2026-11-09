'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CANONICAL_ROLES } from '@bravo-ii/contracts';
import { currentSession } from '../../../lib/bravo-api';
import { Field, Head, Notice, Panel } from '../../../components/bravo-p06';

export default function AdministracaoUsuariosPerfisPage() {
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    email: string;
    roles: string[];
  } | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    currentSession()
      .then((s) => setSessionUser(s.user))
      .catch((e) => setError((e as Error).message));
  }, []);

  const rolesList = Object.values(CANONICAL_ROLES).filter((r) =>
    !roleFilter
      ? true
      : r.code.toLowerCase().includes(roleFilter.toLowerCase()) ||
        r.namePtBr.toLowerCase().includes(roleFilter.toLowerCase())
  );

  return (
    <main className="b6">
      <Head
        title="ADM-01 · Usuários, Perfis RBAC/ABAC e Escopos de Acesso"
        description="Governança de identidade, sessão autenticada no servidor e matriz canônica de permissões por perfil."
        action={
          <div className="b6-actions">
            <Link className="b6-btn b6-btn-secondary" href="/administracao/tarefas">
              Tarefas e Alertas (ADM-02)
            </Link>
            <Link className="b6-btn b6-btn-secondary" href="/auditoria/logs">
              Trilha de Auditoria (AUD-01)
            </Link>
          </div>
        }
      />
      <Notice text={error} error />

      <div className="b6-grid">
        <Panel title="Operador autenticado na sessão atual">
          {sessionUser ? (
            <div className="b6-sublist">
              <div>
                <strong>ID do Usuário:</strong> <code>{sessionUser.id}</code>
              </div>
              <div>
                <strong>E-mail:</strong> {sessionUser.email}
              </div>
              <div>
                <strong>Perfis atribuídos:</strong> {sessionUser.roles.join(', ')}
              </div>
            </div>
          ) : (
            <p>Carregando sessão ativa...</p>
          )}
        </Panel>

        <Panel title="Filtrar perfis canônicos do BRAVO_II">
          <Field name="Buscar perfil por código ou nome">
            <input
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              placeholder="Ex.: ADMIN, FINANCEIRO, PRODUTOR..."
            />
          </Field>
        </Panel>
      </div>

      <section className="b6-panel" style={{ marginTop: 18 }}>
        <h2>Matriz de Perfis Canônicos ({rolesList.length})</h2>
        <div className="b6-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Perfil (pt-BR)</th>
                <th>Escopo</th>
                <th>Qtd. Permissões</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {rolesList.map((r) => (
                <tr key={r.code}>
                  <td>
                    <code>{r.code}</code>
                  </td>
                  <td>{r.namePtBr}</td>
                  <td>{r.isInternal ? 'Interno Disk' : 'Externo Segregado (PDT)'}</td>
                  <td>{r.permissions.length}</td>
                  <td>{r.descriptionPtBr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
