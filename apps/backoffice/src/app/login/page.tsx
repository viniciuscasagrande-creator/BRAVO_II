'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionPanel, WorkspaceHeader } from '@bravo-ii/ui';
import { BravoApiClient } from '@bravo-ii/sdk';
import { useBravoSession } from '../../context/session-context';

export default function LoginPage() {
  const router = useRouter();
  const { actor, isAuthenticated, setAuthenticatedSession, refreshSession } = useBravoSession();
  const [email, setEmail] = useState('financeiro.local@diskingressos.com.br');
  const [password, setPassword] = useState('BravoLocal#Financeiro2026');
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
      const res = await client.login({ email, password });
      setAuthenticatedSession(res.token, res.actor);
      await refreshSession();
      setStatusMessage(
        `Sessão corporativa autenticada com sucesso para ${res.actor.fullName}. Redirecionando para o painel...`
      );
      setTimeout(() => {
        router.push('/');
      }, 450);
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

  const quickCredentials = [
    {
      title: 'Financeiro Disk',
      subtitle: 'Controladoria, Tesouraria, Livro Razão, Folha SoD e Alçada de Estornos',
      email: 'financeiro.local@diskingressos.com.br',
      pass: 'BravoLocal#Financeiro2026',
    },
    {
      title: 'Comercial Disk',
      subtitle: 'Produtores PJ, Contratos, Documentação e Taxa Disk por Evento',
      email: 'comercial.local@diskingressos.com.br',
      pass: 'BravoLocal#Comercial2026',
    },
    {
      title: 'Operação de Eventos',
      subtitle: 'Event Builder, Sessões, Setores, Lotes, Canais e Publicação',
      email: 'operacao.local@diskingressos.com.br',
      pass: 'BravoLocal#Operacao2026',
    },
    {
      title: 'RH e Departamento Pessoal',
      subtitle: 'Cadastro de Colaboradores, Disk Ponto e Lotes de Folha',
      email: 'rh.local@diskingressos.com.br',
      pass: 'BravoLocal#RhDisk2026',
    },
    {
      title: 'SAC e Pós-Venda',
      subtitle: 'Atendimento ao Cliente, Chamados, Trocas e Solicitação de Estorno',
      email: 'sac.local@diskingressos.com.br',
      pass: 'BravoLocal#Sac2026',
    },
    {
      title: 'Portal do Produtor (PDT)',
      subtitle: 'Acompanhamento exclusivo dos eventos vinculados ao produtor',
      email: 'produtor.local@pdt.diskingressos.com.br',
      pass: 'BravoLocal#Produtor2026',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Identidade e Segurança Corporativa"
        title="Acesso à Plataforma BRAVO_II"
        subtitle="Autenticação única com sessão criptografada HttpOnly. Uma vez autenticado, todos os departamentos autorizados para sua credencial ficam disponíveis sem nova solicitação de senha."
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
          subtitle="Informe seu e-mail corporativo e senha para iniciar a sessão no servidor."
        >
          <form onSubmit={(e) => void handleApiLogin(e)}>
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
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
          title="Perfis de Homologação Disponíveis"
          subtitle="Selecione um operador abaixo para preencher o formulário e autenticar com o escopo real do departamento."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quickCredentials.map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => {
                  setEmail(cred.email);
                  setPassword(cred.pass);
                }}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: email === cred.email ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: email === cred.email ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{cred.title}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{cred.subtitle}</div>
                <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '4px', fontFamily: 'monospace' }}>
                  {cred.email}
                </div>
              </button>
            ))}
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
