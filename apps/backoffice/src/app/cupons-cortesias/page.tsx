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
import type {
  CouponCampaignDto,
  CourtesyQuotaDto,
  CustomerDto,
  EventBuilderFullViewDto,
  EventSummaryViewDto,
} from '@bravo-ii/contracts';

export default function CuponsCortesiasPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventDetail, setEventDetail] = useState<EventBuilderFullViewDto | null>(null);
  const [campaigns, setCampaigns] = useState<CouponCampaignDto[]>([]);
  const [quotas, setQuotas] = useState<CourtesyQuotaDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Cupom
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [percentageRate, setPercentageRate] = useState('15');
  const [fixedAmountCents, setFixedAmountCents] = useState('1000');
  const [maxUses, setMaxUses] = useState('50');

  // Form Quota de Cortesia
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [authorizedQuantity, setAuthorizedQuantity] = useState('10');

  // Form Emissão de Cortesia
  const [selectedQuotaId, setSelectedQuotaId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedPriceLotId, setSelectedPriceLotId] = useState('');

  const apiUrl = '';

  const loadData = useCallback(async () => {
    if (!sessionToken || !hasPermission('coupon:read')) {
      setCampaigns([]);
      setQuotas([]);
      return;
    }
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    try {
      const [evtRes, cpnRes, qtaRes, custRes] = await Promise.all([
        client.listAuthorizedEvents(),
        client.listCouponCampaigns(),
        client.listCourtesyQuotas(),
        client.listCustomers(),
      ]);
      setEvents(evtRes.items);
      setCampaigns(cpnRes.items);
      setQuotas(qtaRes.items);
      setCustomers(custRes.items);

      const targetEventId = selectedEventId || evtRes.items[0]?.id || '';
      if (targetEventId) {
        setSelectedEventId(targetEventId);
        const detail = await client.getEventById(targetEventId);
        setEventDetail(detail);
        if (detail.sessions[0] && !selectedSessionId) {
          setSelectedSessionId(detail.sessions[0].id);
        }
        if (detail.sectors[0] && !selectedSectorId) {
          setSelectedSectorId(detail.sectors[0].id);
        }
        if (detail.priceLots[0] && !selectedPriceLotId) {
          setSelectedPriceLotId(detail.priceLots[0].id);
        }
      }
      if (qtaRes.items[0] && !selectedQuotaId) {
        setSelectedQuotaId(qtaRes.items[0].id);
      }
      if (custRes.items[0] && !selectedCustomerId) {
        setSelectedCustomerId(custRes.items[0].id);
      }
    } catch {
      setCampaigns([]);
      setQuotas([]);
    }
  }, [
    sessionToken,
    apiUrl,
    hasPermission,
    selectedEventId,
    selectedSessionId,
    selectedSectorId,
    selectedPriceLotId,
    selectedQuotaId,
    selectedCustomerId,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!hasPermission('coupon:read')) {
    return (
      <HonestEmptyState
        title="Acesso Restrito a Cupons e Cortesias"
        description={`Sua credencial atual (${actor.roles.join(', ')}) não inclui permissão para gerenciar campanhas promocionais e quotas de cortesia.`}
      />
    );
  }

  const canWriteCoupon = hasPermission('coupon:write');

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createCouponCampaign({
        eventId: selectedEventId,
        code,
        title,
        discountType,
        percentageRate: discountType === 'PERCENTAGE' ? Number(percentageRate) : null,
        fixedAmountCents: discountType === 'FIXED' ? Number(fixedAmountCents) : null,
        maxUses: Number(maxUses),
      });
      setCode('');
      setTitle('');
      setFeedback({
        type: 'success',
        message: `Campanha de cupom '${created.code}' criada com limite de ${created.maxUses} utilizações.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao criar campanha de cupom.',
      });
    }
  };

  const handleCreateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId || !selectedSessionId || !selectedSectorId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createCourtesyQuota({
        eventId: selectedEventId,
        sessionId: selectedSessionId,
        sectorId: selectedSectorId,
        authorizedQuantity: Number(authorizedQuantity),
      });
      setSelectedQuotaId(created.id);
      setFeedback({
        type: 'success',
        message: `Quota autorizada para emissão de até ${created.authorizedQuantity} cortesias no setor selecionado.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao autorizar quota de cortesia.',
      });
    }
  };

  const handleIssueCourtesy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedQuotaId || !selectedCustomerId || !selectedPriceLotId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const order = await client.issueCourtesyTicket(selectedQuotaId, {
        customerId: selectedCustomerId,
        priceLotId: selectedPriceLotId,
        idempotencyKey: `crt-${Date.now()}`,
      });
      const tkt = order.tickets[0];
      setFeedback({
        type: 'success',
        message: `Cortesia emitida com sucesso! Pedido ${order.orderNumber} · Ingresso de 8 dígitos: ${tkt?.publicCode ?? ''}.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao emitir ingresso de cortesia.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Cupons de Desconto e Quotas de Cortesias"
        subtitle="Motor de campanhas promocionais com limite de uso atômico e emissão controlada de cortesias por evento, sessão e setor."
        moduleCode="CPN"
        packageBadge="Pacote 05 — Ativo e Persistido no PostgreSQL"
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* 1. Criar Campanha de Cupom */}
        <form
          onSubmit={handleCreateCampaign}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            1. Nova Campanha de Cupom Comercial
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={!canWriteCoupon || events.length === 0}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Evento...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.code} — {ev.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Código do Cupom (ex.: DISK15)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!canWriteCoupon}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <input
              type="text"
              placeholder="Título da Campanha"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canWriteCoupon}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                disabled={!canWriteCoupon}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="PERCENTAGE">Desconto %</option>
                <option value="FIXED">Valor Fixo (Centavos)</option>
              </select>
              {discountType === 'PERCENTAGE' ? (
                <input
                  type="number"
                  step="0.1"
                  placeholder="% Desconto"
                  value={percentageRate}
                  onChange={(e) => setPercentageRate(e.target.value)}
                  disabled={!canWriteCoupon}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              ) : (
                <input
                  type="number"
                  step="1"
                  placeholder="Centavos"
                  value={fixedAmountCents}
                  onChange={(e) => setFixedAmountCents(e.target.value)}
                  disabled={!canWriteCoupon}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              )}
            </div>
            <input
              type="number"
              min="1"
              placeholder="Limite Máximo de Usos"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={!canWriteCoupon}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!canWriteCoupon || !selectedEventId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: canWriteCoupon && selectedEventId ? '#1d4ed8' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: canWriteCoupon && selectedEventId ? 'pointer' : 'not-allowed',
              }}
            >
              Criar Campanha de Cupom
            </button>
          </div>
        </form>

        {/* 2. Autorizar Quota de Cortesias */}
        <form
          onSubmit={handleCreateQuota}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            2. Autorizar Quota de Cortesias por Setor
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={!canWriteCoupon || !eventDetail}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione a Sessão...</option>
              {eventDetail?.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.title}
                </option>
              ))}
            </select>
            <select
              value={selectedSectorId}
              onChange={(e) => setSelectedSectorId(e.target.value)}
              disabled={!canWriteCoupon || !eventDetail}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Setor...</option>
              {eventDetail?.sectors.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.code} — {sec.name} (Cap: {sec.capacity})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder="Quantidade Autorizada de Cortesias"
              value={authorizedQuantity}
              onChange={(e) => setAuthorizedQuantity(e.target.value)}
              disabled={!canWriteCoupon}
              required
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!canWriteCoupon || !selectedSessionId || !selectedSectorId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  canWriteCoupon && selectedSessionId && selectedSectorId ? '#0f766e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor:
                  canWriteCoupon && selectedSessionId && selectedSectorId ? 'pointer' : 'not-allowed',
              }}
            >
              Autorizar Quota de Cortesias
            </button>
          </div>
        </form>

        {/* 3. Emitir Cortesia Nominal */}
        <form
          onSubmit={handleIssueCourtesy}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            3. Emitir Ingresso de Cortesia Auditado
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedQuotaId}
              onChange={(e) => setSelectedQuotaId(e.target.value)}
              disabled={!canWriteCoupon || quotas.length === 0}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione a Quota Autorizada...</option>
              {quotas.map((q) => (
                <option key={q.id} value={q.id}>
                  Quota {q.id.slice(0, 8)} — Emitidas: {q.issuedQuantity}/{q.authorizedQuantity}
                </option>
              ))}
            </select>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={!canWriteCoupon || customers.length === 0}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Beneficiário PF...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.cpfMasked})
                </option>
              ))}
            </select>
            <select
              value={selectedPriceLotId}
              onChange={(e) => setSelectedPriceLotId(e.target.value)}
              disabled={!canWriteCoupon || !eventDetail}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione a Modalidade/Lote...</option>
              {eventDetail?.priceLots.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.modalityName} (Lote {pl.lotNumber})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!canWriteCoupon || !selectedQuotaId || !selectedCustomerId || !selectedPriceLotId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  canWriteCoupon && selectedQuotaId && selectedCustomerId && selectedPriceLotId
                    ? '#7c3aed'
                    : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor:
                  canWriteCoupon && selectedQuotaId && selectedCustomerId && selectedPriceLotId
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              Emitir Cortesia (Consome Quota + Gera Ingresso 8 Dígitos)
            </button>
          </div>
        </form>
      </div>

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Campanhas de Cupons Ativas ({campaigns.length})
      </h2>
      {campaigns.length === 0 ? (
        <HonestEmptyState
          title="Nenhuma campanha de cupom cadastrada"
          description="Crie campanhas de cupons promocionais por evento acima. O limite de uso é controlado de forma atômica na criação de pedidos."
          governanceNote="Cupons esgotados ou expirados são bloqueados automaticamente na validação do pedido."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {campaigns.map((cpn) => (
            <div
              key={cpn.id}
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
                  <code>{cpn.code}</code> — {cpn.title}
                </strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Desconto:{' '}
                  {cpn.discountType === 'PERCENTAGE'
                    ? `${cpn.percentageRate}%`
                    : formatCurrencyPtBrFromCents(cpn.fixedAmountCents ?? 0)}{' '}
                  · Criado em: {formatDateTimePtBr(cpn.createdAt)}
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                Usos: {cpn.usedCount} / {cpn.maxUses} ({cpn.status})
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Quotas de Cortesias Autorizadas ({quotas.length})
      </h2>
      {quotas.length === 0 ? (
        <HonestEmptyState
          title="Nenhuma quota de cortesia autorizada"
          description="Autorize quotas de cortesias por evento, sessão e setor acima."
          governanceNote="Toda cortesia emitida consome inventário real da sessão/setor e registra o operador emissor na trilha de auditoria."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {quotas.map((q) => (
            <div
              key={q.id}
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
                <strong>Quota #{q.id.slice(0, 8)}</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Setor: <code>{q.sectorId.slice(0, 8)}</code> · Criada em:{' '}
                  {formatDateTimePtBr(q.createdAt)}
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                Emitidas: {q.issuedQuantity} / {q.authorizedQuantity} ({q.status})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
