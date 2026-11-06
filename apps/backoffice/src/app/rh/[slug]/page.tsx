'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CatalogFunctionItemDto } from '@bravo-ii/contracts';
import { ActionPanel, ErrorState, OperationalEmptyState, WorkspaceHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../../context/session-context';

export default function RhCatalogFunctionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadRh = hasPermission('rh:read') || hasPermission('rh:self-read');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [item, setItem] = useState<CatalogFunctionItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadRh || !isAuthenticated || !slug) return;
    void client
      .getCatalogFunction(slug)
      .then((res) => setItem(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao consultar função catalogada.'));
  }, [canReadRh, isAuthenticated, slug, client]);

  if (!canReadRh) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito ao Departamento de Recursos Humanos"
        description={`Sua credencial atual (${actor.roles.join(', ')}) não possui permissão para acessar esta subárea de RH.`}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <WorkspaceHeader
        eyebrow={item ? `RH e Departamento Pessoal · ${item.subgrupoTitulo ?? item.grupoTitulo}` : 'RH e Departamento Pessoal'}
        title={item ? `#${String(item.numero).padStart(3, '0')} — ${item.itemTitulo}` : `Subárea de RH: ${slug}`}
        subtitle="Ficha de escopo e direcionamento para a rotina operacional de Recursos Humanos."
        statusBadge={item?.integracaoFinanceiroRh ? 'Integrada ao Financeiro Disk' : 'Mapeada no Escopo'}
        actions={
          <Link
            href="/rh"
            style={{
              display: 'inline-block',
              padding: '9px 14px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ← Voltar à Central de RH e DP
          </Link>
        }
      />

      {error && <ErrorState title="Falha ao Carregar Subárea" description={error} />}

      {item ? (
        <ActionPanel
          title={`Especificação da Rotina #${String(item.numero).padStart(3, '0')} — ${item.itemTitulo}`}
          subtitle="Transparência sobre o escopo de implantação e atalho para a área de trabalho ativa."
        >
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              rowGap: '12px',
              columnGap: '16px',
              fontSize: '13px',
              margin: 0,
            }}
          >
            <dt style={{ fontWeight: 700, color: '#475569' }}>Subárea Funcional:</dt>
            <dd style={{ margin: 0 }}>{item.subgrupoTitulo ?? item.grupoTitulo}</dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Rota Canônica:</dt>
            <dd style={{ margin: 0 }}>
              <code>{item.rota}</code>
            </dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Ponte RH → Financeiro:</dt>
            <dd style={{ margin: 0 }}>
              {item.integracaoFinanceiroRh
                ? 'Ativa — Lotes submetidos pelo RH seguem para aprovação e liquidação na Central Financeira'
                : 'Escopo interno de RH e Departamento Pessoal'}
            </dd>
          </dl>

          <div
            style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#334155' }}>
              Para cadastrar colaboradores, lançar lotes de folha corporativa ou equipes de evento, utilize a Central de Recursos Humanos.
            </div>
            <Link
              href="/rh"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Abrir Central de RH →
            </Link>
          </div>
        </ActionPanel>
      ) : (
        <OperationalEmptyState
          title={`Subárea /rh/${slug}`}
          description="Autentique-se na plataforma para consultar a especificação completa desta rotina de Recursos Humanos."
        />
      )}
    </div>
  );
}
