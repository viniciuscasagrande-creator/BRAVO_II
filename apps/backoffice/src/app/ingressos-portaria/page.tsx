'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  HonestEmptyState,
  PageHeader,
  formatDateTimePtBr,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CheckinValidationResultDto, TicketDetailDto } from '@bravo-ii/contracts';

export default function IngressosPortariaPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [tickets, setTickets] = useState<TicketDetailDto[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinValidationResultDto | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const loadTickets = useCallback(
    async (publicCodeFilter?: string) => {
      if (!sessionToken || (!hasPermission('ticket:read') && !hasPermission('checkin:validate'))) {
        setTickets([]);
        return;
      }
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      try {
        const res = await client.listTickets(
          publicCodeFilter && publicCodeFilter.trim()
            ? { publicCode: publicCodeFilter.trim() }
            : undefined
        );
        setTickets(res.items);
      } catch {
        setTickets([]);
      }
    },
    [sessionToken, apiUrl, hasPermission]
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  if (!hasPermission('ticket:read') && !hasPermission('checkin:validate')) {
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
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Negado a Ingressos e Portaria</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>
          O perfil ativo (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão{' '}
          <code>ticket:read</code> ou <code>checkin:validate</code>.
        </p>
      </section>
    );
  }

  const canValidateGate = hasPermission('checkin:validate');

  const handleRetryDelivery = async (ticketId: string) => {
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const updated = await client.retryTicketDelivery(ticketId);
      setFeedback({
        type: 'success',
        message: `Entrega de e-mail reprocessada com sucesso para o ingresso #${updated.publicCode} (status: ${updated.deliveryStatus}).`,
      });
      await loadTickets(searchCode);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao reprocessar entrega de e-mail.',
      });
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const cancelled = await client.cancelTicket(
        ticketId,
        'Cancelamento operacional via Central de Ingressos'
      );
      setFeedback({
        type: 'success',
        message: `Ingresso #${cancelled.publicCode} CANCELADO, credencial QR invalidada e assento devolvido ao estoque disponível.`,
      });
      await loadTickets(searchCode);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao cancelar ingresso.',
      });
    }
  };

  const handleValidateQr = async (t: TicketDetailDto) => {
    if (!sessionToken || !t.qrCredential) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const res = await client.validateCheckin({
        eventId: t.eventId,
        sessionId: t.sessionId,
        gateDeviceCode: 'CATRACA-PORTARIA-01',
        qrToken: t.qrCredential.qrToken,
        signatureHmac: t.qrCredential.signatureHmac,
      });
      setCheckinResult(res);
      await loadTickets(searchCode);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao validar check-in QR.',
      });
    }
  };

  const handleAttemptPublicCodeOnly = async (t: TicketDetailDto) => {
    if (!sessionToken) return;
    try {
      const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
      const res = await client.validateCheckin({
        eventId: t.eventId,
        sessionId: t.sessionId,
        gateDeviceCode: 'CATRACA-PORTARIA-01',
        publicCodeOnly: t.publicCode,
      });
      setCheckinResult(res);
      await loadTickets(searchCode);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro na validação.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Central de Ingressos (8 Dígitos) e Validador de Portaria (QR Independente)"
        subtitle="Pesquisa por número público de 8 dígitos (^[0-9]{8}$), gestão separada de validade/entrega/check-in, reenvio de e-mail transacional e validação criptográfica de catraca."
        moduleCode="TKT / GATE"
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

      {checkinResult ? (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: checkinResult.allowed ? '#dcfce7' : '#fef2f2',
            border: `2px solid ${checkinResult.allowed ? '#16a34a' : '#dc2626'}`,
            color: checkinResult.allowed ? '#166534' : '#991b1b',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            Resultado da Catraca / Coletor: {checkinResult.outcome}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
            {checkinResult.messagePtBr}
          </div>
        </div>
      ) : null}

      {/* Barra de Pesquisa por Código de 8 Dígitos */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadTickets(searchCode);
        }}
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        <input
          type="text"
          maxLength={8}
          placeholder="Pesquisar por número público de 8 dígitos (ex.: 00481920)"
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 18px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Buscar Ingresso
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchCode('');
            loadTickets('');
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Limpar
        </button>
      </form>

      <h2 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '12px' }}>
        Ingressos Emitidos ({tickets.length})
      </h2>

      {tickets.length === 0 ? (
        <HonestEmptyState
          title="Nenhum ingresso encontrado para o filtro atual"
          description="Emita pedidos no módulo Pedidos e Vendas ou cortesias em Cupons e Cortesias. Todo ingresso possui 8 dígitos numéricos visíveis e credencial QR independente."
          governanceNote="O código numérico público de 8 dígitos identifica o ingresso para atendimento ao cliente, mas nunca libera acesso na portaria sem a assinatura criptográfica QR."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tickets.map((t) => (
            <article
              key={t.id}
              style={{
                padding: '16px 20px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontFamily: 'monospace',
                      backgroundColor: '#f1f5f9',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      marginRight: '10px',
                    }}
                  >
                    #{t.publicCode}
                  </span>
                  <span style={{ fontSize: '13px', color: '#475569' }}>
                    Emitido em {formatDateTimePtBr(t.issuedAt)}
                  </span>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Validade: <strong>{t.validityStatus}</strong> · Entrega E-mail:{' '}
                    <strong style={{ color: t.deliveryStatus === 'FALHA_ENVIO' ? '#dc2626' : '#166534' }}>
                      {t.deliveryStatus}
                    </strong>{' '}
                    ({t.delivery?.recipientEmail ?? '—'} · Tentativas: {t.delivery?.attemptCount ?? 1}) · Portaria:{' '}
                    <strong>{t.checkinStatus}</strong>
                  </div>
                  {t.qrCredential ? (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Credencial QR Independente (v{t.qrCredential.tokenVersion}):{' '}
                      <code>{t.qrCredential.qrToken}</code>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {t.deliveryStatus === 'FALHA_ENVIO' && t.validityStatus === 'EMITIDO' ? (
                    <button
                      type="button"
                      onClick={() => handleRetryDelivery(t.id)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Reenviar E-mail (Retry)
                    </button>
                  ) : null}

                  {canValidateGate && t.qrCredential ? (
                    <button
                      type="button"
                      onClick={() => handleValidateQr(t)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Validar QR na Catraca
                    </button>
                  ) : null}

                  {canValidateGate ? (
                    <button
                      type="button"
                      onClick={() => handleAttemptPublicCodeOnly(t)}
                      title="Testar regra de segurança: tentar validar informando apenas os 8 dígitos sem QR"
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Testar Apenas 8 Dígitos (Bloqueado)
                    </button>
                  ) : null}

                  {t.validityStatus === 'EMITIDO' && t.checkinStatus === 'NAO_UTILIZADO' ? (
                    <button
                      type="button"
                      onClick={() => handleCancelTicket(t.id)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar Ingresso e Invalidar QR
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
