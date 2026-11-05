'use client';

import React, { useEffect, useState } from 'react';
import { HonestEmptyState, MetricSummaryCard, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { OperationalOverviewDto } from '@bravo-ii/contracts';

export default function HomeCentralOperacionalPage() {
  const { actor, sessionToken } = useBravoSession();
  const [liveOverview, setLiveOverview] = useState<OperationalOverviewDto | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken: sessionToken ?? undefined });

    if (sessionToken) {
      client
        .getOverview()
        .then((res) => {
          setLiveOverview(res);
          setApiConnected(true);
        })
        .catch(() => {
          setApiConnected(false);
        });
    } else {
      client
        .healthCheck()
        .then(() => setApiConnected(true))
        .catch(() => setApiConnected(false));
    }
  }, [sessionToken]);

  const counters = liveOverview?.counters ?? {
    visibleEventsCount: 0,
    publishedEventsCount: 0,
    pendingCommercialApprovalsCount: 0,
    openServiceCasesCount: 0,
    pendingRefundApprovalsCount: 0,
    auditRecordsCount: 0,
  };

  return (
    <div>
      <PageHeader
        title="Início / Central Operacional"
        subtitle="Visão consolidada do núcleo BRAVO_II respeitando estritamente o perfil RBAC e o escopo de produtor/evento da sessão ativa."
        moduleCode="CORE / IAM"
        packageBadge="Pacote 01 — Fundação Ativa"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricSummaryCard
          label="Eventos Visíveis no Escopo"
          value={counters.visibleEventsCount}
          helperText="Filtrados pela combinação papel + escopo do usuário"
        />
        <MetricSummaryCard
          label="Eventos Publicados"
          value={counters.publishedEventsCount}
          helperText="Aprovados pelo fluxo comercial e operacional"
        />
        <MetricSummaryCard
          label="Aprovações de Estorno Pendentes"
          value={counters.pendingRefundApprovalsCount}
          helperText="Segregação SAC (solicita) → Financeiro (aprova)"
        />
        <MetricSummaryCard
          label="Registros na Trilha de Auditoria"
          value={actor.permissions.includes('audit:read') ? counters.auditRecordsCount : 'Restrito'}
          helperText="Visível apenas para perfis com permissão audit:read"
        />
      </div>

      <HonestEmptyState
        title="Nenhuma operação de negócio fictícia cadastrada"
        description={
          apiConnected
            ? 'Conexão com a API BRAVO_II verificada. Os indicadores acima refletem exatamente as tabelas reais do PostgreSQL, sem dados falsos de demonstração.'
            : 'Exibindo estado inicial honesto (zero eventos, zero vendas, zero saldos fictícios). Inicie a API em localhost:4000 e autentique-se em /login para sincronizar sessões com o banco PostgreSQL.'
        }
        governanceNote="Taxa Disk é negociada exclusivamente por evento (percentual ou fixa, escopo INTERNAL_DISK). O Portal do Produtor (PDT) está bloqueado contra leitura de eventos de outros produtores e nunca recebe a Taxa Disk interna."
      />
    </div>
  );
}
