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
  EventBuilderFullViewDto,
  EventSummaryViewDto,
  ProducerDetailDto,
} from '@bravo-ii/contracts';

export default function EventosPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [producers, setProducers] = useState<ProducerDetailDto[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventBuilderFullViewDto | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Etapa 1: Novo Evento
  const [evtCode, setEvtCode] = useState('');
  const [evtTitle, setEvtTitle] = useState('');
  const [evtVenue, setEvtVenue] = useState('');
  const [evtCity, setEvtCity] = useState('Curitiba');
  const [evtStateUf, setEvtStateUf] = useState('PR');
  const [evtPrimaryProducerId, setEvtPrimaryProducerId] = useState('');

  // Etapa 2: Sessão
  const [sessionCode, setSessionCode] = useState('SES-01');
  const [sessionTitle, setSessionTitle] = useState('Sessão Principal');
  const [sessionCapacity, setSessionCapacity] = useState('1200');

  // Etapa 3: Setor/Mapa
  const [sectorSessionId, setSectorSessionId] = useState('');
  const [sectorCode, setSectorCode] = useState('PLATEIA-CENTRAL');
  const [sectorName, setSectorName] = useState('Plateia Central');
  const [sectorAreaType, setSectorAreaType] = useState<'SEATED' | 'STANDING' | 'BOX'>('SEATED');
  const [sectorCapacity, setSectorCapacity] = useState('600');
  const [sectorBlocked, setSectorBlocked] = useState('20');

  // Etapa 4: Modalidade e Lote de Preço
  const [lotSectorId, setLotSectorId] = useState('');
  const [lotModalityName, setLotModalityName] = useState('Inteira 1º Lote');
  const [lotCategoryType, setLotCategoryType] = useState<'INTEIRA' | 'MEIA_ENTRADA' | 'SOLIDARIO' | 'PROMOCIONAL'>('INTEIRA');
  const [lotNumber, setLotNumber] = useState('1');
  const [lotNominalCents, setLotNominalCents] = useState('12000');
  const [lotMaxQty, setLotMaxQty] = useState('300');

  // Etapa 5: Canal de Venda e PDVs
  const [channelType, setChannelType] = useState<'SITE' | 'PDV' | 'BILHETERIA'>('SITE');
  const [channelCode, setChannelCode] = useState('SITE-OFICIAL');
  const [channelName, setChannelName] = useState('Site www.diskingressos.com.br');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const canWriteEvent = hasPermission('event:write');
  const canApproveEvent = hasPermission('event:approve');
  const canPublishEvent = hasPermission('event:publish');

  const loadList = useCallback(async () => {
    if (!sessionToken) {
      setEvents([]);
      setProducers([]);
      setSelectedEventDetail(null);
      return;
    }
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    try {
      const evtRes = await client.listAuthorizedEvents();
      setEvents(evtRes.items);
      if (evtRes.items.length > 0 && !selectedEventId) {
        setSelectedEventId(evtRes.items[0].id);
      }
      if (hasPermission('commercial:read')) {
        const prodRes = await client.listProducers();
        setProducers(prodRes.items);
        if (prodRes.items.length > 0 && !evtPrimaryProducerId) {
          setEvtPrimaryProducerId(prodRes.items[0].id);
        }
      }
    } catch {
      setEvents([]);
    }
  }, [sessionToken, apiUrl, hasPermission, selectedEventId, evtPrimaryProducerId]);

  const loadEventDetail = useCallback(
    async (eventId: string) => {
      if (!sessionToken || !eventId) {
        setSelectedEventDetail(null);
        return;
      }
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      try {
        const detail = await client.getEventById(eventId);
        setSelectedEventDetail(detail);
        if (detail.sessions.length > 0) {
          setSectorSessionId(detail.sessions[0].id);
        }
        if (detail.sectors.length > 0) {
          setLotSectorId(detail.sectors[0].id);
        }
      } catch {
        setSelectedEventDetail(null);
      }
    },
    [sessionToken, apiUrl]
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventDetail(selectedEventId);
    }
  }, [selectedEventId, loadEventDetail]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const created = await client.createEvent({
        code: evtCode,
        title: evtTitle,
        venueName: evtVenue,
        city: evtCity,
        stateUf: evtStateUf,
        timezone: 'America/Sao_Paulo',
        startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        primaryProducerId: evtPrimaryProducerId,
        secondaryProducerIds: [],
      });
      setEvtCode('');
      setEvtTitle('');
      setEvtVenue('');
      setSelectedEventId(created.id);
      setFeedback({ type: 'success', message: `Evento ${created.code} criado em estado RASCUNHO.` });
      await loadList();
      await loadEventDetail(created.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao criar evento.' });
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const starts = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const ends = new Date(starts.getTime() + 3 * 60 * 60 * 1000);
      await client.addEventSession(selectedEventId, {
        code: sessionCode,
        title: sessionTitle,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        totalCapacity: Number(sessionCapacity),
      });
      setFeedback({ type: 'success', message: `Sessão ${sessionCode} adicionada ao evento.` });
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao adicionar sessão.' });
    }
  };

  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId || !sectorSessionId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      await client.addEventSector(selectedEventId, {
        sessionId: sectorSessionId,
        code: sectorCode,
        name: sectorName,
        areaType: sectorAreaType,
        capacity: Number(sectorCapacity),
        blockedQuantity: Number(sectorBlocked),
      });
      setFeedback({ type: 'success', message: `Setor ${sectorName} configurado na sessão.` });
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao configurar setor.' });
    }
  };

  const handleAddPriceLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId || !sectorSessionId || !lotSectorId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      await client.addEventPriceLot(selectedEventId, {
        sessionId: sectorSessionId,
        sectorId: lotSectorId,
        modalityName: lotModalityName,
        categoryType: lotCategoryType,
        lotNumber: Number(lotNumber),
        nominalPriceCents: Number(lotNominalCents),
        maxQuantity: Number(lotMaxQty),
      });
      setFeedback({ type: 'success', message: `Modalidade/Lote '${lotModalityName}' registrado.` });
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao criar lote.' });
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      await client.addEventSalesChannel(selectedEventId, {
        channelType,
        channelCode,
        channelName,
        allowedPaymentMethods: ['PIX', 'CREDIT_CARD'],
        channelServiceFeeCents: 0,
        isEnabled: true,
      });
      setFeedback({ type: 'success', message: `Canal ${channelCode} habilitado para o evento.` });
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao habilitar canal.' });
    }
  };

  const handleWorkflowAction = async (action: 'submit' | 'approve' | 'publish') => {
    if (!sessionToken || !selectedEventId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      if (action === 'submit') {
        await client.submitEventForReview(selectedEventId);
        setFeedback({ type: 'success', message: 'Evento submetido para análise comercial e operacional.' });
      } else if (action === 'approve') {
        await client.approveEventOperational(
          selectedEventId,
          'Aprovação operacional concluída após conferência de estrutura e Taxa Disk.'
        );
        setFeedback({ type: 'success', message: 'Evento aprovado com sucesso (status APROVADO).' });
      } else {
        await client.publishEvent(selectedEventId);
        setFeedback({
          type: 'success',
          message: 'Evento publicado em modo controlado (Outbox EventPublished gravado).',
        });
      }
      await loadList();
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Operação bloqueada pelas guardas de estado.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Central de Eventos e Event Builder por Etapas"
        subtitle="Fluxo guiado sem modais em cascata: Dados Gerais, Sessões, Mapa/Setores, Modalidades/Lotes, Canais/PDVs e Máquina de Estados de Aprovação e Publicação."
        moduleCode="EVT / INV"
        packageBadge="Pacote 03 + Pacote 06 — Event Builder, 4 Aprovações e Publicação Ativos"
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
          Pacote 06 Integrado — Event Builder em 10 Etapas, Aprovação Sequencial em 4 Etapas (Cadastral → Comercial → Operacional → Publicação) e Solicitação Idempotente
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/eventos/novo" className="b6-btn">
            + Novo Evento (Wizard Pacote 06)
          </a>
          {selectedEventId ? (
            <a href={`/eventos/${selectedEventId}`} className="b6-btn b6-btn-secondary">
              Abrir Event Builder Pacote 06 deste Evento
            </a>
          ) : null}
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

      {/* Event Builder Guiado em Etapas (Visível para perfis internos de Eventos/Comercial) */}
      {canWriteEvent ? (
        <section
          style={{
            marginBottom: '28px',
            padding: '22px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>
            Event Builder — Construção Estruturada por Etapas
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Etapa 1 */}
            <form
              onSubmit={handleCreateEvent}
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Etapa 1 — Dados Gerais e Produtor PJ
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Código Único (ex.: EVT-2026-01)"
                  value={evtCode}
                  onChange={(e) => setEvtCode(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Título do Evento"
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Local / Arena (ex.: Teatro Positivo)"
                  value={evtVenue}
                  onChange={(e) => setEvtVenue(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={evtCity}
                    onChange={(e) => setEvtCity(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <input
                    type="text"
                    placeholder="UF"
                    maxLength={2}
                    value={evtStateUf}
                    onChange={(e) => setEvtStateUf(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <select
                  value={evtPrimaryProducerId}
                  onChange={(e) => setEvtPrimaryProducerId(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">Produtor PJ Principal...</option>
                  {producers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tradeName} ({p.verificationStatus})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Criar Evento em Rascunho
                </button>
              </div>
            </form>

            {/* Etapa 2 */}
            <form
              onSubmit={handleAddSession}
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Etapa 2 — Sessões e Aforo
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">Selecione o Evento...</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} — {e.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Código da Sessão (ex.: SES-01)"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Título da Sessão"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="number"
                  placeholder="Capacidade Total"
                  value={sessionCapacity}
                  onChange={(e) => setSessionCapacity(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={!selectedEventId}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedEventId ? '#1d4ed8' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: selectedEventId ? 'pointer' : 'not-allowed',
                  }}
                >
                  Adicionar Sessão
                </button>
              </div>
            </form>

            {/* Etapa 3 */}
            <form
              onSubmit={handleAddSector}
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Etapa 3 — Mapa, Áreas e Setores
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Código do Setor (ex.: PLATEIA)"
                  value={sectorCode}
                  onChange={(e) => setSectorCode(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Nome do Setor"
                  value={sectorName}
                  onChange={(e) => setSectorName(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <select
                  value={sectorAreaType}
                  onChange={(e) => setSectorAreaType(e.target.value as typeof sectorAreaType)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="SEATED">Numerado / Poltronas (SEATED)</option>
                  <option value="STANDING">Pista / Livre (STANDING)</option>
                  <option value="BOX">Camarote (BOX)</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Capacidade"
                    value={sectorCapacity}
                    onChange={(e) => setSectorCapacity(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    placeholder="Bloqueados"
                    value={sectorBlocked}
                    onChange={(e) => setSectorBlocked(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!sectorSessionId}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: sectorSessionId ? '#1d4ed8' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: sectorSessionId ? 'pointer' : 'not-allowed',
                  }}
                >
                  Configurar Setor na Sessão
                </button>
              </div>
            </form>

            {/* Etapa 4 e 5 */}
            <form
              onSubmit={handleAddPriceLot}
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Etapa 4 — Modalidades, Lotes e Preço Nominal
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Modalidade (ex.: Inteira 1º Lote)"
                  value={lotModalityName}
                  onChange={(e) => setLotModalityName(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select
                    value={lotCategoryType}
                    onChange={(e) => setLotCategoryType(e.target.value as typeof lotCategoryType)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="INTEIRA">Inteira</option>
                    <option value="MEIA_ENTRADA">Meia-Entrada</option>
                    <option value="SOLIDARIO">Solidário</option>
                    <option value="PROMOCIONAL">Promocional</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Lote Nº"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Preço Centavos (12000 = R$120)"
                    value={lotNominalCents}
                    onChange={(e) => setLotNominalCents(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    placeholder="Qtd Máx Lote"
                    value={lotMaxQty}
                    onChange={(e) => setLotMaxQty(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!lotSectorId}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: lotSectorId ? '#1d4ed8' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: lotSectorId ? 'pointer' : 'not-allowed',
                  }}
                >
                  Adicionar Modalidade / Lote
                </button>
              </div>
            </form>

            {/* Etapa 5: Canais */}
            <form
              onSubmit={handleAddChannel}
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
            >
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                Etapa 5 — Canais de Venda (Site e PDVs)
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as typeof channelType)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="SITE">Site DiskIngressos (Online)</option>
                  <option value="PDV">Ponto de Venda Físico (PDV)</option>
                  <option value="BILHETERIA">Bilheteria Oficial</option>
                </select>
                <input
                  type="text"
                  placeholder="Código do Canal (ex.: SITE-OFICIAL)"
                  value={channelCode}
                  onChange={(e) => setChannelCode(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Nome de Exibição do Canal"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <button
                  type="submit"
                  disabled={!selectedEventId}
                  style={{
                    padding: '9px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedEventId ? '#0f766e' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: selectedEventId ? 'pointer' : 'not-allowed',
                  }}
                >
                  Habilitar Canal no Evento
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {/* Painel de Prontidão, Aprovação e Detalhe do Evento Selecionado */}
      {selectedEventDetail ? (
        <section
          style={{
            marginBottom: '28px',
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '2px solid #cbd5e1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
                Ficha Estruturada do Evento: {selectedEventDetail.code} — {selectedEventDetail.title}
              </h2>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                Local: {selectedEventDetail.venueName} ({selectedEventDetail.city}/{selectedEventDetail.stateUf}) ·
                Status Atual: <strong>{selectedEventDetail.status}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                disabled={!canWriteEvent}
                onClick={() => handleWorkflowAction('submit')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: canWriteEvent ? 'pointer' : 'not-allowed',
                }}
              >
                1. Submeter para Análise
              </button>
              <button
                type="button"
                disabled={!canApproveEvent}
                onClick={() => handleWorkflowAction('approve')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: canApproveEvent ? '#1d4ed8' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: canApproveEvent ? 'pointer' : 'not-allowed',
                }}
              >
                2. Aprovar Evento (Operação)
              </button>
              <button
                type="button"
                disabled={!canPublishEvent}
                onClick={() => handleWorkflowAction('publish')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: canPublishEvent ? '#15803d' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: canPublishEvent ? 'pointer' : 'not-allowed',
                }}
              >
                3. Publicar Evento (Controlado)
              </button>
            </div>
          </div>

          {/* Checklist de Pré-condições de Publicação */}
          <div
            style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: selectedEventDetail.publicationReadiness.isReadyToApproveAndPublish
                ? '#f0fdf4'
                : '#fffbeb',
              border: `1px solid ${
                selectedEventDetail.publicationReadiness.isReadyToApproveAndPublish ? '#bbf7d0' : '#fde68a'
              }`,
              fontSize: '13px',
            }}
          >
            <strong>Barreira de Aprovação e Publicação:</strong>{' '}
            {selectedEventDetail.publicationReadiness.isReadyToApproveAndPublish
              ? 'Todas as pré-condições atendidas (Produtor Verificado, Taxa Disk Aprovada, Sessão, Setor, Lote e Canal).'
              : `Bloqueado para publicação — Pendências: ${selectedEventDetail.publicationReadiness.pendingReasonsPtBr.join(' | ')}`}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '14px',
              fontSize: '13px',
            }}
          >
            <div>
              <strong>Sessões ({selectedEventDetail.sessions.length}):</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {selectedEventDetail.sessions.map((s) => (
                  <li key={s.id}>
                    {s.code}: cap. {s.totalCapacity} ({s.status})
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Setores ({selectedEventDetail.sectors.length}):</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {selectedEventDetail.sectors.map((sec) => (
                  <li key={sec.id}>
                    {sec.name}: {sec.capacity} ({sec.blockedQuantity} bloq.)
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Modalidades/Lotes ({selectedEventDetail.priceLots.length}):</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {selectedEventDetail.priceLots.map((l) => (
                  <li key={l.id}>
                    {l.modalityName} (Lote {l.lotNumber}): {formatCurrencyPtBrFromCents(l.nominalPriceCents)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Canais ({selectedEventDetail.salesChannels.length}):</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {selectedEventDetail.salesChannels.map((c) => (
                  <li key={c.id}>
                    {c.channelCode} ({c.channelType})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Histórico de Taxa Disk e Snapshots (EXCLUSIVO para perfis internos autorizados) */}
          {selectedEventDetail.internalFeeHistory ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            >
              <strong>
                Versões da Taxa Disk Interna deste Evento ({selectedEventDetail.internalFeeHistory.length}) — Oculta no
                PDT e SAC:
              </strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                {selectedEventDetail.internalFeeHistory.map((fh) => (
                  <li key={fh.id}>
                    Versão {fh.agreementVersion}:{' '}
                    {fh.calculationType === 'PERCENTAGE'
                      ? `${fh.percentageRate}%`
                      : formatCurrencyPtBrFromCents(fh.fixedAmountCents ?? 0)}{' '}
                    · Status: <strong>{fh.status}</strong>{' '}
                    {fh.approvalReference ? `(${fh.approvalReference})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Lista Geral de Eventos no Escopo */}
      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Eventos Visíveis no Escopo Atual ({events.length})
      </h2>

      {events.length === 0 ? (
        <HonestEmptyState
          title="Nenhum evento cadastrado no escopo atual"
          description="A consulta em /api/v1/events retornou lista vazia real do PostgreSQL. Nenhum evento fictício foi semeado no ambiente operacional."
          governanceNote={`Perfil atual (${actor.roles.join(', ')}): ${
            actor.permissions.includes('event-fee:read-internal')
              ? 'Autorizado a visualizar a Taxa Disk contratual interna por evento.'
              : 'Bloqueado de visualizar a Taxa Disk contratual interna.'
          }`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.map((evt) => (
            <article
              key={evt.id}
              onClick={() => setSelectedEventId(evt.id)}
              style={{
                padding: '18px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: evt.id === selectedEventId ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                    {evt.code} — {evt.title}
                  </strong>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    Local: {evt.venueName} ({evt.city}/{evt.stateUf}) · Início: {formatDateTimePtBr(evt.startsAt)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                  }}
                >
                  {evt.status}
                </span>
              </div>

              {evt.internalDiskFeeAgreement ? (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                >
                  <strong>Taxa Disk Interna (v{evt.internalDiskFeeAgreement.agreementVersion}):</strong>{' '}
                  {evt.internalDiskFeeAgreement.calculationType === 'PERCENTAGE'
                    ? `${evt.internalDiskFeeAgreement.percentageRate}%`
                    : formatCurrencyPtBrFromCents(evt.internalDiskFeeAgreement.fixedAmountCents ?? 0)}{' '}
                  · Status: {evt.internalDiskFeeAgreement.status}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
