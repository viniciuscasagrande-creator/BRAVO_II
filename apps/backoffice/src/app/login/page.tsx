'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionPanel, WorkspaceHeader } from '@bravo-ii/ui';
import { BravoApiClient } from '@bravo-ii/sdk';
import { useBravoSession } from '../../context/session-context';

export default function LoginPage() {
  const router = useRouter();
  const { actor, isAuthenticated, setAuthenticatedSession, refreshSession, logoutSession } =
    useBravoSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApiLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const client = new BravoApiClient();
      const res = await client.login({ email: email.trim(), password });
      setAuthenticatedSession(res.token, res.actor, res.csrfToken);
      if (!res.csrfToken) {
        await refreshSession();
      }
      setPassword('');
      const operatorName = res?.actor?.fullName || email.trim();
      setStatusMessage(
        `Sessão corporativa autenticada com sucesso para ${operatorName}. Redirecionando para o painel...`
      );
      setTimeout(() => {
        router.push('/');
      }, 350);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível validar as credenciais no serviço de identidade.'
      );
    } finally {
      setLoading(false);
    }
  };

  const securityPolicies = [
    {
      title: 'Sessão Criptografada HttpOnly + Proteção CSRF',
      description:
        'O token de sessão é mantido exclusivamente em cookie HttpOnly com validação de token CSRF em todas as operações de escrita.',
    },
    {
      title: 'Bloqueio Automático contra Força Bruta',
      description:
        'Contas corporativas são bloqueadas temporariamente por 30 minutos após 5 tentativas consecutivas de autenticação malsucedidas.',
    },
    {
      title: 'Segregação de Funções (RBAC + ABAC)',
      description:
        'Cada operador visualiza e opera exclusivamente os módulos, eventos e alçadas autorizados para seu perfil corporativo.',
    },
    {
      title: 'Isolamento Estrito do Portal do Produtor (PDT)',
      description:
        'Credenciais de produtores acessam apenas eventos vinculados ao seu escopo contratual, sem exposição da Taxa Disk interna.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Identidade e Segurança Corporativa"
        title="Acesso à Plataforma BRAVO_II"
        subtitle="Autenticação única com sessão criptografada no servidor. Uma vez autenticado, todos os departamentos autorizados para sua credencial ficam disponíveis sem nova solicitação de senha."
        statusBadge={isAuthenticated ? `Autenticado: ${actor.fullName}` : 'Sessão Desconectada'}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        <ActionPanel
          title="Credenciais de Operador"
          subtitle="Informe seu e-mail corporativo e senha cadastrados no diretório de identidade do BRAVO_II."
        >
          <form onSubmit={(e) => void handleApiLogin(e)} autoComplete="on">
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                E-mail Corporativo
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="nome.sobrenome@diskingressos.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
              >
                Senha de Acesso
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Informe sua senha corporativa"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Validando Credencial...' : 'Entrar na Plataforma'}
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => void logoutSession()}
                  style={{
                    padding: '11px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Encerrar Sessão Atual
                </button>
              )}
            </div>

            {statusMessage && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {statusMessage}
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}
          </form>
        </ActionPanel>

        <ActionPanel
          title="Governança de Identidade e Acesso"
          subtitle="Diretrizes de segurança ativas na autenticação do ERP BRAVO_II."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {securityPolicies.map((policy) => (
              <div
                key={policy.title}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{policy.title}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.5 }}>
                  {policy.description}
                </div>
              </div>
            ))}
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
