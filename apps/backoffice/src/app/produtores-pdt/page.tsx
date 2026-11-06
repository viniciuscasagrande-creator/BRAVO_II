'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionPanel,
  ErrorState,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
  formatDateTimePtBr,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { EventSummaryViewDto } from '@bravo-ii/contracts';

export default function ProdutoresPdtPage() {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadPortal = hasPermission('pdt:portal-read') || hasPermission('event:read');

  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducerEvents = useCallback(async () => {
    if (!isAuthenticated || !canReadPortal) return;
    setErrorMessage(null);
    const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
    try {
      const res = await client.listAuthorizedEvents();
      setEvents(res.items);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao consultar eventos vinculados ao produtor.'
      );
    }
  }, [isAuthenticated, canReadPortal, sessionToken]);

  useEffect(() => {
    void loadProducerEvents();
  }, [loadProducerEvents]);

  if (!canReadPortal) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito ao Portal do Produtor (PDT)"
        description={`Sua credencial atual (${actor.roles.join(', ')}) não inclui acesso ao Portal do Produtor.`}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Ambiente Exclusivo do Produtor"
        title="Portal do Produtor (PDT)"
        subtitle="Acompanhamento de borderô, ocupação de sessões e status operacional exclusivamente para os eventos vinculados à sua produtora."
        statusBadge={`${events.length} Evento(s) Vinculado(s)`}
        actions={
          <button
            type="button"
            onClick={() => void loadProducerEvents()}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Atualizar Borderô
          </button>
        }
      />

      {errorMessage && (
        <ErrorState
          title="Falha ao Consultar Eventos do Produtor"
          description={errorMessage}
          onRetry={() => void loadProducerEvents()}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <KpiCard
          label="Eventos Vinculados"
          value={events.length}
          helperText="Filtrados pelo escopo do produtor"
          tone="accent"
        />
        <KpiCard
          label="Eventos Publicados"
          value={events.filter((e) => e.status === 'PUBLICADO').length}
          helperText="Com vendas ativas"
          tone="positive"
        />
      </div>

      <ActionPanel
        title="Meus Eventos e Borderô Operacional"
        subtitle="Visão restrita aos eventos vinculados ao produtor autenticado."
      >
        {events.length === 0 ? (
          <OperationalEmptyState
            title="Nenhum Evento Vinculado com Movimentação no Momento"
            description="Somente eventos expressamente associados ao seu escopo de produtor são listados neste portal."
          />
        ) : (
          <table className="p06-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título do Evento</th>
                <th>Local</th>
                <th>Início</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.code}</strong>
                  </td>
                  <td>{ev.title}</td>
                  <td>
                    {ev.venueName} ({ev.city}/{ev.stateUf})
                  </td>
                  <td>{formatDateTimePtBr(ev.startsAt)}</td>
                  <td>
                    <span className="p06-badge info">{ev.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ActionPanel>
    </div>
  );
}
