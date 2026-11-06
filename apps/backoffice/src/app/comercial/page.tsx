'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ActionPanel,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
  formatCurrencyPtBrFromCents,
  formatDateTimePtBr,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { EventSummaryViewDto, ProducerDetailDto } from '@bravo-ii/contracts';

type ComercialTabKey = 'produtores' | 'novo-pj' | 'documentos' | 'taxas';

export default function ComercialPage() {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const [activeTab, setActiveTab] = useState<ComercialTabKey>('produtores');
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
  const [docType, setDocType] = useState<
    'CONTRATO_SOCIAL' | 'CARTAO_CNPJ' | 'DOCUMENTO_REPRESENTANTE' | 'COMPROVANTE_BANCARIO'
  >('CONTRATO_SOCIAL');
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba');
    if (aba === 'taxas') setActiveTab('taxas');
    else if (aba === 'documentos') setActiveTab('documentos');
    else if (aba === 'novo-pj') setActiveTab('novo-pj');
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !hasPermission('commercial:read')) {
      setProducers([]);
      setEvents([]);
      return;
    }
    const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
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
  }, [isAuthenticated, sessionToken, hasPermission, selectedProducerId, selectedEventId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!hasPermission('commercial:read')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <WorkspaceHeader
          eyebrow="Gestão Comercial B2B"
          title="Central Comercial e Contratos"
          subtitle="Cadastro de produtores PJ, verificação documental e negociação de Taxa Disk por evento."
        />
        <OperationalEmptyState
          title="Acesso Restrito ao Departamento Comercial"
          description={`Sua credencial atual (${actor.roles.join(', ')}) não inclui permissão para consultar contratos B2B e parâmetros comerciais internos.`}
        />
      </div>
    );
  }

  const canWriteCommercial = hasPermission('commercial:write');
  const canProposeFee = hasPermission('event-fee:propose');
  const canApproveFee = hasPermission('event-fee:approve');

  const handleCreateProducer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setFeedback({ type: 'error', message: 'Inicie sua sessão em /login para gravar registros.' });
      return;
    }
    try {
      const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
      const created = await client.createProducer({ cnpj, legalName, tradeName });
      setCnpj('');
      setLegalName('');
      setTradeName('');
      setSelectedProducerId(created.id);
      setFeedback({
        type: 'success',
        message: `Produtor PJ ${created.tradeName} (${created.cnpj}) cadastrado com sucesso.`,
      });
      await loadData();
      setActiveTab('produtores');
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao cadastrar produtor.',
      });
    }
  };

  const handleAddContactAndVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !selectedProducerId) return;
    try {
      const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
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
        message: 'Responsável, documentação e contrato registrados; Produtor PJ homologado.',
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao atualizar documentação do produtor.',
      });
    }
  };

  const handleProposeAndApproveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
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
          message: `Taxa Disk por Evento (v${proposed.agreementVersion}) proposta e aprovada (${approvalRef}).`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Taxa Disk por Evento (v${proposed.agreementVersion}) proposta para aprovação.`,
        });
      }
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao registrar Taxa Disk.',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Relacionamento B2B e Contratos"
        title="Central Comercial"
        subtitle="Gestão de empresas produtoras, validação de representantes e contratos, e parametrização individual da Taxa Disk por evento."
        statusBadge={`${producers.length} Produtor(es) · ${events.length} Evento(s)`}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/comercial/produtores"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Diretório Completo de Produtores
            </Link>
            <Link
              href="/comercial/produtores/novo"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              + Cadastrar Produtor PJ
            </Link>
          </div>
        }
      />

      {feedback && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          label="Produtores Cadastrados"
          value={producers.length}
          helperText="Empresas produtoras na base"
          tone="accent"
        />
        <KpiCard
          label="Produtores Verificados"
          value={producers.filter((p) => p.verificationStatus === 'VERIFIED').length}
          helperText="Aptos para publicação de eventos"
          tone="positive"
        />
        <KpiCard
          label="Eventos no Escopo"
          value={events.length}
          helperText="Vinculados à carteira comercial"
          tone="neutral"
        />
        <KpiCard
          label="Eventos com Taxa Aprovada"
          value={events.filter((e) => Boolean(e.internalDiskFeeAgreement)).length}
          helperText="Taxa negociada individualmente por evento"
          tone="positive"
        />
      </div>

      {/* Navegação Interna em Abas */}
      <div className="bravo-tabs" role="tablist">
        <button
          type="button"
          className={`bravo-tab-btn${activeTab === 'produtores' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('produtores')}
        >
          Carteira de Produtores ({producers.length})
        </button>
        <button
          type="button"
          className={`bravo-tab-btn${activeTab === 'novo-pj' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('novo-pj')}
        >
          Cadastro Rápido PJ
        </button>
        <button
          type="button"
          className={`bravo-tab-btn${activeTab === 'documentos' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('documentos')}
        >
          Representantes, Documentos e Contratos
        </button>
        <button
          type="button"
          className={`bravo-tab-btn${activeTab === 'taxas' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('taxas')}
        >
          Taxa Disk por Evento ({events.length})
        </button>
      </div>

      {activeTab === 'produtores' && (
        <ActionPanel
          title="Produtores PJ Cadastrados"
          subtitle="Relação de empresas produtoras, status de homologação documental e vínculos contratuais."
        >
          {producers.length === 0 ? (
            <OperationalEmptyState
              title="Nenhum Produtor PJ Cadastrado"
              description="Utilize a aba 'Cadastro Rápido PJ' ou o botão '+ Cadastrar Produtor PJ' para registrar empresas produtoras."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {producers.map((prod) => (
                <article
                  key={prod.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                        {prod.tradeName} — {prod.legalName}
                      </strong>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        CNPJ: <code>{prod.cnpj}</code> · Cadastrado em: {formatDateTimePtBr(prod.createdAt)}
                      </div>
                    </div>
                    <span className={`p06-badge ${prod.verificationStatus === 'VERIFIED' ? 'ok' : 'warn'}`}>
                      {prod.verificationStatus}
                    </span>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#334155' }}>
                    <strong>Representantes ({prod.contacts.length}):</strong>{' '}
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
        </ActionPanel>
      )}

      {activeTab === 'novo-pj' && (
        <ActionPanel
          title="Cadastrar Novo Produtor (Pessoa Jurídica)"
          subtitle="O cadastro identifica a empresa produtora sem fixar taxa única global — cada evento terá sua própria regra comercial."
        >
          <form
            onSubmit={(e) => void handleCreateProducer(e)}
            style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <input
              type="text"
              placeholder="CNPJ (ex.: 12.345.678/0001-90)"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Razão Social Completa"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Nome Fantasia"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              disabled={!canWriteCommercial}
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!canWriteCommercial}
              style={{
                padding: '11px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: canWriteCommercial ? '#1d4ed8' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: canWriteCommercial ? 'pointer' : 'not-allowed',
              }}
            >
              Salvar Produtor PJ
            </button>
          </form>
        </ActionPanel>
      )}

      {activeTab === 'documentos' && (
        <ActionPanel
          title="Representante Legal, Documentação e Contrato"
          subtitle="Registre o representante, anexe a referência documental e formalize o contrato ativo para liberar o produtor."
        >
          <form
            onSubmit={(e) => void handleAddContactAndVerify(e)}
            style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <select
              value={selectedProducerId}
              onChange={(e) => setSelectedProducerId(e.target.value)}
              disabled={!canWriteCommercial || producers.length === 0}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
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
              placeholder="Nome Completo do Representante Legal"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={!canWriteCommercial}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="email"
                placeholder="E-mail do Representante"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Telefone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as typeof docType)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="CONTRATO_SOCIAL">Contrato Social</option>
                <option value="CARTAO_CNPJ">Cartão CNPJ</option>
                <option value="DOCUMENTO_REPRESENTANTE">Documento do Representante</option>
                <option value="COMPROVANTE_BANCARIO">Comprovante Bancário</option>
              </select>
              <input
                type="text"
                placeholder="Referência do Documento (ex.: DOC-2026-01)"
                value={docReference}
                onChange={(e) => setDocReference(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="Número do Contrato (ex.: CTR-2026-01)"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="Objeto do Contrato"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                disabled={!canWriteCommercial}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!canWriteCommercial || !selectedProducerId}
              style={{
                padding: '11px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: canWriteCommercial && selectedProducerId ? '#0f766e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: canWriteCommercial && selectedProducerId ? 'pointer' : 'not-allowed',
              }}
            >
              Registrar Vínculos e Homologar Produtor PJ
            </button>
          </form>
        </ActionPanel>
      )}

      {activeTab === 'taxas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <ActionPanel
            title="Parametrizar Taxa Disk por Evento"
            subtitle="Negociação exclusiva por evento (percentual ou valor fixo em centavos) com versionamento prospectivo."
          >
            <form
              onSubmit={(e) => void handleProposeAndApproveFee(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                disabled={!canProposeFee || events.length === 0}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="">Selecione um Evento...</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.code} — {evt.title}
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={calculationType}
                  onChange={(e) => setCalculationType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                  disabled={!canProposeFee}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
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
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
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
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={payer}
                  onChange={(e) => setPayer(e.target.value as typeof payer)}
                  disabled={!canProposeFee}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="CUSTOMER">Suportada pelo Comprador</option>
                  <option value="PRODUCER">Retida do Produtor</option>
                  <option value="SPLIT">Compartilhada (Split)</option>
                </select>
                <input
                  type="text"
                  placeholder="Referência de Aprovação (ex.: COM-2026-01)"
                  value={approvalRef}
                  onChange={(e) => setApprovalRef(e.target.value)}
                  disabled={!canProposeFee}
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={!canProposeFee || !selectedEventId}
                style={{
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: canProposeFee && selectedEventId ? '#1d4ed8' : '#94a3b8',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: canProposeFee && selectedEventId ? 'pointer' : 'not-allowed',
                }}
              >
                Registrar e Aprovar Taxa no Evento
              </button>
            </form>
          </ActionPanel>

          <ActionPanel
            title="Regras Vigentes por Evento"
            subtitle="Histórico de regras contratuais ativas nos eventos cadastrados."
          >
            {events.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Nenhum evento cadastrado para exibir regras de Taxa Disk.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
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
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                      {evt.internalDiskFeeAgreement ? (
                        <span className="p06-badge ok">
                          v{evt.internalDiskFeeAgreement.agreementVersion} ·{' '}
                          {evt.internalDiskFeeAgreement.calculationType === 'PERCENTAGE'
                            ? `${evt.internalDiskFeeAgreement.percentageRate}%`
                            : formatCurrencyPtBrFromCents(evt.internalDiskFeeAgreement.fixedAmountCents ?? 0)}
                        </span>
                      ) : (
                        <span className="p06-badge warn">Pendente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ActionPanel>
        </div>
      )}
    </div>
  );
}
