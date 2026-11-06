'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionPanel,
  ErrorState,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
  formatCurrencyPtBrFromCents,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { EventSummaryViewDto, OperationalOverviewDto, OrderDetailDto } from '@bravo-ii/contracts';

export default function RelatoriosPage() {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadReports = hasPermission('reports:read') || hasPermission('overview:read');

  const [overview, setOverview] = useState<OperationalOverviewDto | null>(null);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [orders, setOrders] = useState<OrderDetailDto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!isAuthenticated || !canReadReports) return;
    setErrorMessage(null);
    const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });
    try {
      const [ovRes, evRes] = await Promise.all([
        client.getOverview(),
        client.listAuthorizedEvents(),
      ]);
      setOverview(ovRes);
      setEvents(evRes.items);

      if (hasPermission('order:read')) {
        const ordRes = await client.listOrders();
        setOrders(ordRes.items);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar indicadores analíticos.'
      );
    }
  }, [isAuthenticated, canReadReports, sessionToken, hasPermission]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (!canReadReports) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito à Central de Relatórios"
        description={`Sua credencial atual (${actor.roles.join(', ')}) não inclui permissão de consulta a relatórios analíticos.`}
      />
    );
  }

  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMADO');
  const totalNominalSalesCents = confirmedOrders.reduce((acc, o) => acc + o.subtotalNominalCents, 0);
  const totalChargedCents = confirmedOrders.reduce((acc, o) => acc + o.totalChargedCents, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Inteligência Operacional e Borderô"
        title="Central de Relatórios"
        subtitle="Consolidação analítica de eventos, vendas confirmadas, atendimento e auditoria respeitando o escopo da credencial ativa."
        statusBadge={isAuthenticated ? 'Projeção Analítica Conectada' : 'Aguardando Login'}
        actions={
          <button
            type="button"
            onClick={() => void loadAnalytics()}
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
            Atualizar Relatórios
          </button>
        }
      />

      {errorMessage && (
        <ErrorState
          title="Erro ao Consultar Projeção Analítica"
          description={errorMessage}
          onRetry={() => void loadAnalytics()}
        />
      )}

      {!isAuthenticated ? (
        <OperationalEmptyState
          title="Inicie sua Sessão para Consultar os Relatórios"
          description="Autentique-se em /login para carregar os demonstrativos de eventos, vendas e atendimento do seu departamento."
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
            }}
          >
            <KpiCard
              label="Eventos no Escopo"
              value={overview?.counters.visibleEventsCount ?? events.length}
              helperText={`${overview?.counters.publishedEventsCount ?? 0} publicado(s)`}
              tone="accent"
            />
            <KpiCard
              label="Pedidos Confirmados"
              value={confirmedOrders.length}
              helperText={`${orders.length} pedido(s) total(is) registrado(s)`}
              tone="positive"
            />
            <KpiCard
              label="Valor Nominal de Ingressos"
              value={formatCurrencyPtBrFromCents(totalNominalSalesCents)}
              helperText="Base de borderô de eventos"
              tone="neutral"
            />
            <KpiCard
              label="Volume Bruto Transacionado"
              value={formatCurrencyPtBrFromCents(totalChargedCents)}
              helperText="Pedidos liquidados no período"
              tone="positive"
            />
          </div>

          <ActionPanel
            title="Demonstrativo por Evento no Escopo"
            subtitle="Relação de eventos visíveis para sua credencial e status operacional."
          >
            {events.length === 0 ? (
              <OperationalEmptyState
                title="Sem Eventos Registrados para Emissão de Borderô"
                description="Quando eventos forem cadastrados e movimentarem pedidos, o consolidado analítico por evento será apresentado nesta tabela."
              />
            ) : (
              <table className="p06-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Evento</th>
                    <th>Local / Cidade</th>
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
                      <td>
                        <span className="p06-badge info">{ev.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ActionPanel>
        </>
      )}
    </div>
  );
}
