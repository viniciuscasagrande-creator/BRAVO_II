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
  CustomerDto,
  EventBuilderFullViewDto,
  EventSummaryViewDto,
  InventoryHoldDto,
  OrderDetailDto,
  PosCashSessionDto,
  PosTerminalDto,
  SessionAvailabilityDto,
} from '@bravo-ii/contracts';

export default function PedidosVendasPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventDetail, setEventDetail] = useState<EventBuilderFullViewDto | null>(null);
  const [availability, setAvailability] = useState<SessionAvailabilityDto | null>(null);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [terminals, setTerminals] = useState<PosTerminalDto[]>([]);
  const [cashSessions, setCashSessions] = useState<PosCashSessionDto[]>([]);
  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [activeHold, setActiveHold] = useState<InventoryHoldDto | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Seleções de Reserva e Pedido
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [selectedPriceLotId, setSelectedPriceLotId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [channelType, setChannelType] = useState<'SITE' | 'PDV'>('SITE');
  const [selectedCashSessionId, setSelectedCashSessionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH'>('PIX');
  const [simulateEmailFailure, setSimulateEmailFailure] = useState(false);

  // Abertura de Caixa PDV
  const [selectedTerminalId, setSelectedTerminalId] = useState('');
  const [openingBalanceCents, setOpeningBalanceCents] = useState('10000');

  // Criação de Assentos Numerados no Setor
  const [seatCodesCsv, setSeatCodesCsv] = useState('A-01, A-02, A-03');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const loadData = useCallback(async () => {
    if (!sessionToken || !hasPermission('order:read')) {
      setOrders([]);
      return;
    }
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    try {
      const [evtRes, custRes, termRes, cashRes, ordRes] = await Promise.all([
        client.listAuthorizedEvents(),
        client.listCustomers(),
        client.listPosTerminals(),
        client.listPosCashSessions(),
        client.listOrders(),
      ]);
      setEvents(evtRes.items);
      setCustomers(custRes.items);
      setTerminals(termRes.items);
      setCashSessions(cashRes.items);
      setOrders(ordRes.items);

      if (custRes.items[0] && !selectedCustomerId) {
        setSelectedCustomerId(custRes.items[0].id);
      }
      if (termRes.items[0] && !selectedTerminalId) {
        setSelectedTerminalId(termRes.items[0].id);
      }
      const openCash = cashRes.items.find((c) => c.status === 'OPEN');
      if (openCash && !selectedCashSessionId) {
        setSelectedCashSessionId(openCash.id);
      }

      const targetEventId = selectedEventId || evtRes.items[0]?.id || '';
      if (targetEventId) {
        setSelectedEventId(targetEventId);
        const detail = await client.getEventById(targetEventId);
        setEventDetail(detail);
        const targetSessId = selectedSessionId || detail.sessions[0]?.id || '';
        if (targetSessId) {
          setSelectedSessionId(targetSessId);
          const avail = await client.getSessionAvailability(targetSessId);
          setAvailability(avail);
        }
        if (detail.sectors[0] && !selectedSectorId) {
          setSelectedSectorId(detail.sectors[0].id);
        }
        if (detail.priceLots[0] && !selectedPriceLotId) {
          setSelectedPriceLotId(detail.priceLots[0].id);
        }
      }
    } catch {
      setOrders([]);
    }
  }, [
    sessionToken,
    apiUrl,
    hasPermission,
    selectedEventId,
    selectedSessionId,
    selectedSectorId,
    selectedPriceLotId,
    selectedCustomerId,
    selectedTerminalId,
    selectedCashSessionId,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!hasPermission('order:read')) {
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
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Negado a Pedidos e Vendas</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>
          O perfil ativo (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão{' '}
          <code>order:read</code>.
        </p>
      </section>
    );
  }

  const canWriteOrder = hasPermission('order:write');

  const handleOpenCashSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedTerminalId) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const opened = await client.openPosCashSession({
        terminalId: selectedTerminalId,
        openingBalanceCents: Number(openingBalanceCents),
      });
      setSelectedCashSessionId(opened.id);
      setFeedback({
        type: 'success',
        message: `Sessão de caixa PDV #${opened.id.slice(0, 8)} aberta com fundo inicial de ${formatCurrencyPtBrFromCents(opened.openingBalanceCents)}.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao abrir sessão de caixa PDV.',
      });
    }
  };

  const handleCloseCashSession = async (cashId: string) => {
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const closed = await client.closePosCashSession(cashId);
      setFeedback({
        type: 'success',
        message: `Sessão de caixa PDV encerrada. Total vendido no caixa: ${formatCurrencyPtBrFromCents(closed.totalSalesCents)}.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao fechar sessão de caixa PDV.',
      });
    }
  };

  const handleCreateSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId || !selectedSectorId) return;
    try {
      const codes = seatCodesCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const res = await client.createSeatsBatch(selectedEventId, selectedSectorId, {
        seatCodes: codes,
      });
      setFeedback({
        type: 'success',
        message: `${res.items.length} assento(s) numerado(s) criados no setor selecionado.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao gerar assentos numerados.',
      });
    }
  };

  const handleReserveAndCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !selectedEventId || !selectedSessionId || !selectedSectorId || !selectedCustomerId || !selectedPriceLotId) {
      return;
    }
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      // 1. Cria Hold transacional
      const hold = await client.createInventoryHold(selectedSessionId, {
        sectorId: selectedSectorId,
        seatId: selectedSeatId || null,
        channelType,
        quantity: 1,
        idempotencyKey: `hold-${Date.now()}`,
        ttlSeconds: 900,
      });
      setActiveHold(hold);

      // 2. Cria Pedido consumindo o Hold
      const order = await client.createOrder({
        eventId: selectedEventId,
        sessionId: selectedSessionId,
        customerId: selectedCustomerId,
        holdId: hold.id,
        priceLotId: selectedPriceLotId,
        channelType,
        posCashSessionId: channelType === 'PDV' ? selectedCashSessionId : null,
        couponCode: couponCode.trim() ? couponCode.trim() : null,
        idempotencyKey: `ord-${Date.now()}`,
      });

      // 3. Executa Checkout Sandbox
      const checkout = await client.checkoutOrder(order.id, {
        paymentMethod,
        idempotencyKey: `chk-${Date.now()}`,
        simulateEmailFailure,
      });

      // 4. Se não foi dinheiro imediato no PDV, dispara o Webhook Sandbox assinado
      let finalOrder = checkout.order;
      if (finalOrder.status !== 'CONFIRMADO') {
        const webhookRes = await client.sendPaymentWebhook('sandbox_gateway', {
          providerEventId: `evt_sbx_${Date.now()}`,
          paymentIntentId: checkout.paymentIntent.id,
          eventType: 'PAYMENT_CAPTURED',
          signature: 'sbx_sig_valid_2026',
          simulateEmailFailure,
        });
        finalOrder = webhookRes.order;
      }

      const issuedTicket = finalOrder.tickets[0];
      setFeedback({
        type: 'success',
        message: `Pedido ${finalOrder.orderNumber} CONFIRMADO (${channelType})! Valor total: ${formatCurrencyPtBrFromCents(finalOrder.totalChargedCents)} (Taxa Disk congelada em snapshot: ${formatCurrencyPtBrFromCents(finalOrder.diskFeeCents)}). Ingresso de 8 dígitos emitido: ${issuedTicket?.publicCode ?? ''} [Entrega: ${issuedTicket?.deliveryStatus ?? ''}].`,
      });
      setCouponCode('');
      setSelectedSeatId('');
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro no fluxo de reserva/pedido/pagamento.',
      });
    }
  };

  const currentSectorAvail = availability?.sectors.find((s) => s.sectorId === selectedSectorId);

  return (
    <div>
      <PageHeader
        title="Pedidos, Vendas, Inventário Transacional e Caixa PDV"
        subtitle="Reserva de inventário (InventoryHold), vendas concorrentes Site e PDV sobre o mesmo estoque, captura de snapshot imutável da Taxa Disk por evento e emissão de ingressos no Sandbox."
        moduleCode="INV / ORD / PAY / POS"
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
        {/* 1. Mapa de Assentos e Disponibilidade Transacional */}
        <form
          onSubmit={handleCreateSeats}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            1. Disponibilidade e Assentos por Sessão/Setor
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Evento...</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.code} — {ev.title} ({ev.status})
                </option>
              ))}
            </select>
            <select
              value={selectedSectorId}
              onChange={(e) => setSelectedSectorId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Setor...</option>
              {availability?.sectors.map((sec) => (
                <option key={sec.sectorId} value={sec.sectorId}>
                  {sec.code} — Disp: {sec.availableQuantity}/{sec.capacity} (Vendidos: {sec.soldQuantity} · Retidos: {sec.heldQuantity})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Códigos de Assento separados por vírgula (ex.: A-01, A-02)"
              value={seatCodesCsv}
              onChange={(e) => setSeatCodesCsv(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!selectedEventId || !selectedSectorId}
              style={{
                padding: '9px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Adicionar Assentos Numerados ao Setor
            </button>

            {currentSectorAvail && currentSectorAvail.seats.length > 0 ? (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155' }}>
                <strong>Mapa de Assentos ({currentSectorAvail.seats.length}):</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {currentSectorAvail.seats.map((seat) => (
                    <span
                      key={seat.id}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor:
                          seat.status === 'AVAILABLE'
                            ? '#dcfce7'
                            : seat.status === 'SOLD'
                            ? '#fee2e2'
                            : '#fef9c3',
                        color:
                          seat.status === 'AVAILABLE'
                            ? '#166534'
                            : seat.status === 'SOLD'
                            ? '#991b1b'
                            : '#854d0e',
                      }}
                    >
                      {seat.seatCode}: {seat.status}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </form>

        {/* 2. Controle de Sessão de Caixa PDV */}
        <form
          onSubmit={handleOpenCashSession}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            2. Abertura e Fechamento de Caixa PDV
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select
              value={selectedTerminalId}
              onChange={(e) => setSelectedTerminalId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Terminal PDV...</option>
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.terminalCode} — {t.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Fundo de Troco Inicial em Centavos (ex.: 10000 = R$ 100,00)"
              value={openingBalanceCents}
              onChange={(e) => setOpeningBalanceCents(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!selectedTerminalId}
              style={{
                padding: '9px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedTerminalId ? '#1d4ed8' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: selectedTerminalId ? 'pointer' : 'not-allowed',
              }}
            >
              Abrir Sessão de Caixa PDV
            </button>

            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cashSessions.slice(0, 3).map((cs) => (
                <div
                  key={cs.id}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>Caixa #{cs.id.slice(0, 8)}</strong> ({cs.status}) · Vendas:{' '}
                    {formatCurrencyPtBrFromCents(cs.totalSalesCents)}
                  </div>
                  {cs.status === 'OPEN' ? (
                    <button
                      type="button"
                      onClick={() => handleCloseCashSession(cs.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: '#b91c1c',
                        color: '#ffffff',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Fechar Caixa
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* 3. Fluxo Guiado de Pedido + Pagamento Sandbox */}
        <form
          onSubmit={handleReserveAndCheckout}
          style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
            3. Emitir Pedido e Pagamento (Sandbox)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value as 'SITE' | 'PDV')}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="SITE">Canal: Site Online</option>
                <option value="PDV">Canal: PDV Físico</option>
              </select>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="PIX">PIX (Sandbox)</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="CASH">Dinheiro (PDV)</option>
              </select>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Cliente PF...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.cpfMasked})
                </option>
              ))}
            </select>

            <select
              value={selectedPriceLotId}
              onChange={(e) => setSelectedPriceLotId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Selecione o Lote / Modalidade...</option>
              {eventDetail?.priceLots.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.modalityName} — {formatCurrencyPtBrFromCents(pl.nominalPriceCents)}
                </option>
              ))}
            </select>

            <select
              value={selectedSeatId}
              onChange={(e) => setSelectedSeatId(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">Sem assento nominal (Pista/Geral) ou selecione assento...</option>
              {currentSectorAvail?.seats
                .filter((s) => s.status === 'AVAILABLE')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    Assento {s.seatCode} (Disponível)
                  </option>
                ))}
            </select>

            <input
              type="text"
              placeholder="Cupom Promocional Opcional (ex.: DISK15)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <input
                type="checkbox"
                checked={simulateEmailFailure}
                onChange={(e) => setSimulateEmailFailure(e.target.checked)}
              />
              Simular falha temporária no envio de e-mail para testar reenvio na Central de Ingressos
            </label>

            <button
              type="submit"
              disabled={!canWriteOrder || !selectedEventId || !selectedCustomerId || !selectedPriceLotId}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  canWriteOrder && selectedEventId && selectedCustomerId && selectedPriceLotId
                    ? '#16a34a'
                    : '#94a3b8',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor:
                  canWriteOrder && selectedEventId && selectedCustomerId && selectedPriceLotId
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              Reservar Estoque + Confirmar Pedido Sandbox + Emitir Ingresso
            </button>
          </div>
        </form>
      </div>

      {activeHold ? (
        <div
          style={{
            marginBottom: '18px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
          }}
        >
          Última reserva transacional (InventoryHold): <code>{activeHold.id}</code> · Canal:{' '}
          <strong>{activeHold.channelType}</strong> · Expira em: {formatDateTimePtBr(activeHold.expiresAt)}
        </div>
      ) : null}

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Pedidos Registrados no Banco PostgreSQL ({orders.length})
      </h2>
      {orders.length === 0 ? (
        <HonestEmptyState
          title="Nenhum pedido ou transação de venda registrado"
          description="Utilize o fluxo guiado acima para reservar inventário, criar pedidos e confirmar pagamentos no provedor Sandbox."
          governanceNote="Site DiskIngressos e terminais PDV consomem exatamente o mesmo estoque transacional por sessão/setor/assento, e cada venda confirmada congela o snapshot contratual imutável da Taxa Disk vigente no evento."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map((ord) => (
            <article
              key={ord.id}
              style={{
                padding: '16px 20px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                    {ord.orderNumber} ({ord.channelType})
                  </strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Criado em: {formatDateTimePtBr(ord.createdAt)} · Nominal:{' '}
                    {formatCurrencyPtBrFromCents(ord.subtotalNominalCents)} · Desconto:{' '}
                    {formatCurrencyPtBrFromCents(ord.discountCents)} · Taxa Disk Snapshot:{' '}
                    {formatCurrencyPtBrFromCents(ord.diskFeeCents)} ·{' '}
                    <strong>Total Cobrado: {formatCurrencyPtBrFromCents(ord.totalChargedCents)}</strong>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: ord.status === 'CONFIRMADO' ? '#dcfce7' : '#fef9c3',
                    color: ord.status === 'CONFIRMADO' ? '#166534' : '#854d0e',
                  }}
                >
                  {ord.status}
                </span>
              </div>
              {ord.tickets.length > 0 ? (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#334155' }}>
                  <strong>Ingressos de 8 dígitos emitidos ({ord.tickets.length}):</strong>{' '}
                  {ord.tickets
                    .map(
                      (t) =>
                        `#${t.publicCode} [Validade: ${t.validityStatus} | Entrega: ${t.deliveryStatus} | Portaria: ${t.checkinStatus}]`
                    )
                    .join(' · ')}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
