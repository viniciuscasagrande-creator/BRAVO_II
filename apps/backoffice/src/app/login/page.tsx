'use client';

import React, { useState } from 'react';
import { PageHeader } from '@bravo-ii/ui';
import { BravoApiClient } from '@bravo-ii/sdk';
import { useBravoSession } from '../../context/session-context';

export default function LoginPage() {
  const { actor, setAuthenticatedSession, switchLocalPreviewRole } = useBravoSession();
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const client = new BravoApiClient({ baseUrl: apiUrl });
      const res = await client.login({ email, password });
      setAuthenticatedSession(res.token, res.actor);
      setStatusMessage(
        `Sessão autenticada no PostgreSQL com sucesso para ${res.actor.fullName} (${res.actor.roles.join(', ')}).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar à API local. Verifique se pnpm dev:api e pnpm db:seed:technical foram executados.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Autenticação Única e Contexto de Escopo"
        subtitle="Provedor local de identidade e sessão do BRAVO_II. Uma vez autenticado, a navegação entre todos os submenus autorizados ocorre sem solicitar nova senha."
        moduleCode="IAM"
        packageBadge="Pacote 01 — Autenticação e Sessão"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        <form
          onSubmit={handleApiLogin}
          style={{
            padding: '24px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>
            Login na API NestJS + PostgreSQL
          </h2>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              E-mail Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
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
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Autenticando...' : 'Iniciar Sessão Segura'}
          </button>

          {statusMessage ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: '13px',
              }}
            >
              {statusMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '13px',
              }}
            >
              {errorMessage}
            </div>
          ) : null}
        </form>

        <section
          style={{
            padding: '24px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0f172a' }}>
            Credenciais Técnicas Locais (Seed Técnico)
          </h2>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
            Para inspecionar o comportamento de permissões e escopos entre os 3 perfis exigidos na Fase 01:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => {
                setEmail('comercial.local@diskingressos.com.br');
                setPassword('BravoLocal#Comercial2026');
                switchLocalPreviewRole('COMERCIAL_DISK');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>1. Comercial Disk:</strong> comercial.local@diskingressos.com.br (Cadastra PJ, contratos, eventos e aprova Taxa Disk por evento)
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('operacao.local@diskingressos.com.br');
                setPassword('BravoLocal#Operacao2026');
                switchLocalPreviewRole('OPERACAO_EVENTOS');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>2. Operação de Eventos:</strong> operacao.local@diskingressos.com.br (Event Builder, sessões, lotes, aprovação e publicação)
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('financeiro.local@diskingressos.com.br');
                setPassword('BravoLocal#Financeiro2026');
                switchLocalPreviewRole('FINANCEIRO_DISK');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>3. Financeiro Disk (104 Opções):</strong> financeiro.local@diskingressos.com.br (Aprova lotes RH com SoD, tesouraria, ledger e Taxa Disk)
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('rh.local@diskingressos.com.br');
                setPassword('BravoLocal#RhDisk2026');
                switchLocalPreviewRole('RH_DP_DISK');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>4. RH &amp; DP Disk (45 Opções):</strong> rh.local@diskingressos.com.br (Colaboradores LGPD, Disk Ponto Portaria 671 e submissão de lotes ao Financeiro)
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('sac.local@diskingressos.com.br');
                setPassword('BravoLocal#Sac2026');
                switchLocalPreviewRole('SAC_ATENDIMENTO');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>4. SAC / Atendimento:</strong> sac.local@diskingressos.com.br (Abre solicitações, sem ver Taxa Disk e sem aprovar estorno)
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('produtor.local@pdt.diskingressos.com.br');
                setPassword('BravoLocal#Produtor2026');
                switchLocalPreviewRole('PRODUTOR_PDT');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <strong>5. Produtor (PDT):</strong> produtor.local@pdt.diskingressos.com.br (Restrito ao próprio evento; bloqueado em eventos de terceiros)
            </button>
          </div>

          <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
            <strong>Perfil ativo na sessão atual:</strong> {actor.fullName} ({actor.roles.join(', ')})
          </div>
        </section>
      </div>
    </div>
  );
}
