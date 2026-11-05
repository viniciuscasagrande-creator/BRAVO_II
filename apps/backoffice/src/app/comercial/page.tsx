'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  HonestEmptyState,
  PageHeader,
  formatCurrencyPtBrFromCents,
  formatDateTimePtBr,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { EventSummaryViewDto, ProducerDetailDto } from '@bravo-ii/contracts';

export default function ComercialPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [producers, setProducers] = useState<ProducerDetailDto[]>([]);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado de cadastro de Produtor PJ
  const [cnpj, setCnpj] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');

  // Estado de Responsável / Documento / Contrato do produtor selecionado
  const [selectedProducerId, setSelectedProducerId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [docType, setDocType] = useState<'CONTRATO_SOCIAL' | 'CARTAO_CNPJ' | 'DOCUMENTO_REPRESENTANTE' | 'COMPROVANTE_BANCARIO'>('CONTRATO_SOCIAL');
  const [docReference, setDocReference] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractTitle, setContractTitle] = useState('');

  // Estado de negociação e aprovação de Taxa Disk por Evento
  const [selectedEventId, setSelectedEventId] = useState('');
  const [calculationType, setCalculationType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [percentageRate, setPercentageRate] = useState('12');
  const [fixedAmountCents, setFixedAmountCents] = useState('1500');
  const [payer, setPayer] = useState<'CUSTOMER' | 'PRODUCER' | 'SPLIT'>('CUSTOMER');
  const [approvalRef, setApprovalRef] = useState('COM-2026-APROVADO');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const loadData = useCallback(async () => {
    if (!sessionToken || !hasPermission('commercial:read')) {
      setProducers([]);
      setEvents([]);
      return;
    }
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    try {
      const [prodRes, evtRes] = await Promise.all([
        client.listProducers(),
        client.listAuthorizedEvents(),
      ]);
      setProducers(prodRes.items);
      setEvents(evtRes.items);
      if (prodRes.items.length > 0 && !selectedProducerId) {
        setSelectedProducerId(prodRes.items[0].id);
      }
      if (evtRes.items.length > 0 && !selectedEventId) {
        setSelectedEventId(evtRes.items[0].id);
      }
    } catch {
      setProducers([]);
      setEvents([]);
    }
  }, [sessionToken, apiUrl, hasPermission, selectedProducerId, selectedEventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!hasPermission('commercial:read')) {
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
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Negado ao Módulo Comercial</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>
          O perfil ativo (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão{' '}
          <code>commercial:read</code>. A Taxa Disk contratual interna e os contratos B2B são restritos.
        </p>
      </section>
    );
  }

  const canWriteCommercial = hasPermission('commercial:write');
  const canProposeFee = hasPermission('event-fee:propose');
  const canApproveFee = hasPermission('event-fee:approve');

  const handleCreateProducer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) {
      setFeedback({ type: 'error', message: 'Autentique-se na API em /login para gravar registros no PostgreSQL.' });
      return;
    }
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createProducer({ cnpj, legalName, tradeName });
      setCnpj('');
      setLegalName('');
      setTradeName('');
      setSelectedProducerId(created.id);
      setFeedback({ type: 'success', message: `Produtor PJ ${created.tradeName} (${created.cnpj}) criado com sucesso.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Falha ao cadastrar produtor.' });
    }
  };

  const handleAddContactAndVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedProducerId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      if (contactName && contactEmail && contactPhone) {
        await client.addProducerContact(selectedProducerId, {
          fullName: contactName,
          email: contactEmail,
          phone: contactPhone,
          roleType: 'LEGAL_REPRESENTATIVE',
          isPrimary: true,
        });
      }
      if (docReference) {
        await client.addProducerDocument(selectedProducerId, {
          documentType: docType,
          documentReference: docReference,
        });
      }
      if (contractNumber && contractTitle) {
        await client.createContract(selectedProducerId, {
          contractNumber,
          title: contractTitle,
          status: 'ACTIVE',
        });
      }
      await client.verifyProducer(selectedProducerId);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setDocReference('');
      setContractNumber('');
      setContractTitle('');
      setFeedback({
        type: 'success',
        message: 'Responsável, documentação e contrato registrados; Produtor PJ marcado como VERIFIED.',
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao atualizar produtor.' });
    }
  };

  const handleProposeAndApproveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const proposed = await client.proposeEventFeeAgreement(selectedEventId, {
        calculationType,
        percentageRate: calculationType === 'PERCENTAGE' ? Number(percentageRate) : null,
        fixedAmountCents: calculationType === 'FIXED' ? Number(fixedAmountCents) : null,
        payer,
        approvalReference: approvalRef,
      });

      if (canApproveFee) {
        await client.approveEventFeeAgreement(selectedEventId, proposed.agreementVersion, {
          approvalReference: approvalRef,
        });
        setFeedback({
          type: 'success',
          message: `Taxa Disk por Evento (v${proposed.agreementVersion}) proposta e aprovada com sucesso (${approvalRef}). Versões anteriores deste evento foram marcadas como SUPERSEDED prospectivamente.`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Taxa Disk por Evento (v${proposed.agreementVersion}) proposta em rascunho (DRAFT). Aguardando aprovação.`,
        });
      }
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao registrar Taxa Disk.' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Comercial, Produtores PJ e Taxa Disk por Evento"
        subtitle="Cadastro completo de produtor PJ (responsáveis, documentação e contratos) e motor de negociação, versionamento prospectivo e aprovação de Taxa Disk por evento."
        moduleCode="CRM-B2B / ORG / FEE"
        packageBadge="Pacote 02 + Pacote 06 — Ativo e Persistido no PostgreSQL"
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '20px',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 600 }}>
          Pacote 06 Integrado — Central de Produtores PJ (CNPJ Numérico e Alfanumérico 2026) &amp; Taxa Disk por Evento (Basis Points / Centavos)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/comercial/produtores" className="b6-btn b6-btn-secondary">
            Central de Produtores (Pacote 06)
          </a>
          <a href="/comercial/produtores/novo" className="b6-btn">
            + Novo Produtor PJ
          </a>
        </div>
      </div>

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

      {/* Painel de Formulários Guiados (Habilitado conforme permissão RBAC) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* 1. Cadastro de Produtor PJ */}
        <form
          onSubmit={handleCreateProducer}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            1. Cadastrar Novo Produtor (PJ)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="CNPJ (ex.: 12.345.678/0001-90)"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Razão Social Completa"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Nome Fantasia"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!canWriteCommercial}
              title={
                canWriteCommercial
                  ? 'Gravar Produtor PJ no PostgreSQL'
                  : 'Requer permissão commercial:write (Perfil Comercial Disk)'
              }
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: canWriteCommercial ? '#1d4ed8' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canWriteCommercial ? 'pointer' : 'not-allowed',
              }}
            >
              Cadastrar Produtor PJ
            </button>
          </div>
        </form>

        {/* 2. Responsáveis, Documentação, Contrato e Homologação PJ */}
        <form
          onSubmit={handleAddContactAndVerify}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            2. Responsável, Documento, Contrato e Verificação
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
              disabled={!canWriteCommercial || producers.length === 0}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione um Produtor PJ...</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tradeName} ({p.cnpj}) — {p.verificationStatus}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nome do Representante Legal"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={!canWriteCommercial}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="email"
                placeholder="E-mail do Representante"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Telefone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as typeof docType)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="CONTRATO_SOCIAL">Contrato Social</option>
                <option value="CARTAO_CNPJ">Cartão CNPJ</option>
                <option value="DOCUMENTO_REPRESENTANTE">Doc. Representante</option>
                <option value="COMPROVANTE_BANCARIO">Comprovante Bancário</option>
              </select>
              <input
                type="text"
                placeholder="Ref. Documento (ex.: DOC-2026-01)"
                value={docReference}
                onChange={(e) => setDocReference(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                placeholder="Nº Contrato (ex.: CTR-2026-01)"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Objeto do Contrato"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!canWriteCommercial || !selectedProducerId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: canWriteCommercial && selectedProducerId ? '#0f766e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canWriteCommercial && selectedProducerId ? 'pointer' : 'not-allowed',
              }}
            >
              Salvar Vínculos e Verificar Produtor PJ
            </button>
          </div>
        </form>

        {/* 3. Negociação e Versionamento da Taxa Disk por Evento */}
        <form
          onSubmit={handleProposeAndApproveFee}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            3. Taxa Disk por Evento (INTERNAL_DISK)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={!canProposeFee || events.length === 0}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione um Evento...</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.code} — {evt.title}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                disabled={!canProposeFee}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="PERCENTAGE">Percentual (%)</option>
                <option value="FIXED">Valor Fixo (Centavos)</option>
              </select>

              {calculationType === 'PERCENTAGE' ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Taxa % (ex.: 12.5)"
                  value={percentageRate}
                  onChange={(e) => setPercentageRate(e.target.value)}
                  disabled={!canProposeFee}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              ) : (
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Centavos (ex.: 1500 = R$ 15,00)"
                  value={fixedAmountCents}
                  onChange={(e) => setFixedAmountCents(e.target.value)}
                  disabled={!canProposeFee}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={payer}
                onChange={(e) => setPayer(e.target.value as typeof payer)}
                disabled={!canProposeFee}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="CUSTOMER">Suportada pelo Comprador</option>
                <option value="PRODUCER">Retida do Produtor</option>
                <option value="SPLIT">Compartilhada (Split)</option>
              </select>
              <input
                type="text"
                placeholder="Ref. Aprovação (ex.: COM-2026-01)"
                value={approvalRef}
                onChange={(e) => setApprovalRef(e.target.value)}
                disabled={!canProposeFee}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <button
              type="submit"
              disabled={!canProposeFee || !selectedEventId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: canProposeFee && selectedEventId ? '#1d4ed8' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canProposeFee && selectedEventId ? 'pointer' : 'not-allowed',
              }}
            >
              Propor e Aprovar Nova Versão da Taxa Disk no Evento
            </button>
          </div>
        </form>
      </div>

      {/* Listagem Real de Produtores PJ */}
      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Produtores PJ Cadastrados no Banco PostgreSQL ({producers.length})
      </h2>

      {producers.length === 0 ? (
        <HonestEmptyState
          title="Nenhum produtor PJ cadastrado no momento"
          description="Utilize o formulário acima (autenticado em /login com o perfil Comercial Disk) para cadastrar empresas produtoras, responsáveis legais, documentos e contratos."
          governanceNote="O cadastro do produtor PJ identifica a empresa e suas relações contratuais, mas nunca define uma taxa única global para todos os seus eventos."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {producers.map((prod) => (
            <article
              key={prod.id}
              style={{
                padding: '18px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                    {prod.tradeName} — {prod.legalName}
                  </strong>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    CNPJ: <code>{prod.cnpj}</code> · Origem: {prod.sourceSystem} · Criado em:{' '}
                    {formatDateTimePtBr(prod.createdAt)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: prod.verificationStatus === 'VERIFIED' ? '#dcfce7' : '#fef9c3',
                    color: prod.verificationStatus === 'VERIFIED' ? '#166534' : '#854d0e',
                  }}
                >
                  {prod.verificationStatus}
                </span>
              </div>

              <div style={{ marginTop: '10px', fontSize: '13px', color: '#334155' }}>
                <strong>Contatos ({prod.contacts.length}):</strong>{' '}
                {prod.contacts.map((c) => `${c.fullName} (${c.roleType})`).join(', ') || 'Nenhum'} ·{' '}
                <strong>Documentos ({prod.documents.length}):</strong>{' '}
                {prod.documents.map((d) => `${d.documentType} [${d.verificationStatus}]`).join(', ') || 'Nenhum'} ·{' '}
                <strong>Contratos ({prod.contracts.length}):</strong>{' '}
                {prod.contracts.map((ct) => `${ct.contractNumber} (${ct.status})`).join(', ') || 'Nenhum'}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Resumo de Condições Comerciais por Evento */}
      {events.length > 0 ? (
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
            Condições Comerciais (Taxa Disk) por Evento ({events.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.map((evt) => (
              <div
                key={evt.id}
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
                    {evt.code} — {evt.title}
                  </strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Produtor(es): {evt.producers.map((p) => p.tradeName).join(', ')}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {evt.internalDiskFeeAgreement ? (
                    <span>
                      v{evt.internalDiskFeeAgreement.agreementVersion} ·{' '}
                      {evt.internalDiskFeeAgreement.calculationType === 'PERCENTAGE'
                        ? `${evt.internalDiskFeeAgreement.percentageRate}%`
                        : formatCurrencyPtBrFromCents(evt.internalDiskFeeAgreement.fixedAmountCents ?? 0)}{' '}
                      ({evt.internalDiskFeeAgreement.status})
                    </span>
                  ) : (
                    <span style={{ color: '#b45309' }}>Sem Taxa Disk configurada</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
