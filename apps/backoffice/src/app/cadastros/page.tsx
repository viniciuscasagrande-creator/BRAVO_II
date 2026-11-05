'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  HonestEmptyState,
  PageHeader,
  formatDateTimePtBr,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CustomerDto, PosTerminalDto } from '@bravo-ii/contracts';

export default function CadastrosPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [terminals, setTerminals] = useState<PosTerminalDto[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulário Cliente PF
  const [cpf, setCpf] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Formulário Terminal PDV
  const [terminalCode, setTerminalCode] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [locationDescription, setLocationDescription] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const loadData = useCallback(async () => {
    if (!sessionToken || !hasPermission('catalog:read')) {
      setCustomers([]);
      setTerminals([]);
      return;
    }
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    try {
      const [custRes, termRes] = await Promise.all([
        client.listCustomers(),
        client.listPosTerminals(),
      ]);
      setCustomers(custRes.items);
      setTerminals(termRes.items);
    } catch {
      setCustomers([]);
      setTerminals([]);
    }
  }, [sessionToken, apiUrl, hasPermission]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!hasPermission('catalog:read')) {
    return (
      <section
        role="alert"
        style={{
          padding: '28px',
          borderRadius: '10px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          HTTP 403 — Barreira de Autorização RBAC/ABAC
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Negado a Cadastros e Operações</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>
          O perfil ativo (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão{' '}
          <code>catalog:read</code>.
        </p>
      </section>
    );
  }

  const canCreateTerminal = hasPermission('order:write');

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      setFeedback({ type: 'error', message: 'Autentique-se em /login para gravar registros no PostgreSQL.' });
      return;
    }
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createCustomer({
        cpf,
        fullName,
        email,
        phone,
        marketingConsent,
      });
      setCpf('');
      setFullName('');
      setEmail('');
      setPhone('');
      setMarketingConsent(false);
      setFeedback({
        type: 'success',
        message: `Cliente PF ${created.fullName} (${created.cpfMasked}) cadastrado com sucesso.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao cadastrar cliente PF.',
      });
    }
  };

  const handleCreateTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createPosTerminal({
        terminalCode,
        name: terminalName,
        locationDescription,
      });
      setTerminalCode('');
      setTerminalName('');
      setLocationDescription('');
      setFeedback({
        type: 'success',
        message: `Terminal PDV ${created.terminalCode} (${created.name}) registrado com sucesso.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao cadastrar terminal PDV.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Cadastros e Operações (Clientes PF e Terminais PDV)"
        subtitle="Central unificada de Clientes Pessoa Física (com hash e mascaramento de CPF e consentimento LGPD separado) e cadastro de Terminais PDV físicos."
        moduleCode="CRM-B2C / POS"
        packageBadge="Pacotes 04 e 05 — Ativo e Persistido no PostgreSQL"
      />

      {feedback ? (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '13px',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <form
          onSubmit={handleCreateCustomer}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            1. Cadastrar Cliente Pessoa Física (CRM-B2C)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="CPF (ex.: 123.456.789-01)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Nome Completo do Cliente"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="email"
                placeholder="E-mail para recebimento de ingressos"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Telefone Celular"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              Consentimento LGPD explícito para comunicações promocionais / remarketing (separado do e-mail transacional)
            </label>
            <button
              type="submit"
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cadastrar Cliente PF com Mascaramento PII
            </button>
          </div>
        </form>

        <form
          onSubmit={handleCreateTerminal}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            2. Cadastrar Terminal Físico de PDV / Bilheteria
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Código do Terminal (ex.: PDV-MUELLER-01)"
              value={terminalCode}
              onChange={(e) => setTerminalCode(e.target.value)}
              disabled={!canCreateTerminal}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Nome de Identificação do PDV"
              value={terminalName}
              onChange={(e) => setTerminalName(e.target.value)}
              disabled={!canCreateTerminal}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Localização Física / Shopping / Bilheteria"
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              disabled={!canCreateTerminal}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!canCreateTerminal}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: canCreateTerminal ? '#0f766e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canCreateTerminal ? 'pointer' : 'not-allowed',
              }}
            >
              Cadastrar Terminal PDV
            </button>
          </div>
        </form>
      </div>

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Clientes Pessoa Física Cadastrados ({customers.length})
      </h2>
      {customers.length === 0 ? (
        <HonestEmptyState
          title="Nenhum cliente PF cadastrado no momento"
          description="Utilize o formulário acima para registrar clientes pessoa física reais. O CPF é armazenado com hash SHA-256 e exibido apenas com máscara parcial."
          governanceNote="E-mails transacionais de entrega de ingresso independem do opt-in de marketing, que é armazenado separadamente conforme a LGPD."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {customers.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{c.fullName}</strong> · CPF: <code>{c.cpfMasked}</code>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  E-mail: {c.email} · Tel: {c.phone} · Criado em: {formatDateTimePtBr(c.createdAt)}
                </div>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: c.marketingConsent ? '#dcfce7' : '#f1f5f9',
                  color: c.marketingConsent ? '#166534' : '#475569',
                }}
              >
                {c.marketingConsent ? 'Opt-in Marketing Ativo' : 'Apenas Transacional'}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Terminais Físicos de PDV Cadastrados ({terminals.length})
      </h2>
      {terminals.length === 0 ? (
        <HonestEmptyState
          title="Nenhum terminal PDV cadastrado"
          description="Cadastre terminais PDV acima para habilitar abertura e fechamento de sessões de caixa no módulo Pedidos e Vendas."
          governanceNote="Todas as vendas de PDV exigem sessão de caixa aberta vinculada ao operador e consomem o mesmo inventário do site."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {terminals.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>
                  {t.terminalCode} — {t.name}
                </strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{t.locationDescription}</div>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                }}
              >
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
