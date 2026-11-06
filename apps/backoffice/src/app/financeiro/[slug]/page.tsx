'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CatalogFunctionItemDto } from '@bravo-ii/contracts';
import { ActionPanel, ErrorState, OperationalEmptyState, WorkspaceHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../../context/session-context';

export default function FinanceiroCatalogFunctionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadFinance = hasPermission('finance:read');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [item, setItem] = useState<CatalogFunctionItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadFinance || !isAuthenticated || !slug) return;
    void client
      .getCatalogFunction(slug)
      .then((res) => setItem(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao consultar função catalogada.'));
  }, [canReadFinance, isAuthenticated, slug, client]);

  if (!canReadFinance) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito ao Financeiro Disk"
        description={`Sua credencial atual (${actor.roles.join(', ')}) não possui permissão para acessar esta subárea financeira.`}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <WorkspaceHeader
        eyebrow={item ? `Financeiro Disk · ${item.grupoTitulo}` : 'Financeiro Disk'}
        title={item ? `#${String(item.numero).padStart(3, '0')} — ${item.itemTitulo}` : `Subárea Financeira: ${slug}`}
        subtitle="Ficha de escopo e direcionamento para a rotina operacional correspondente."
        statusBadge={item?.integracaoFinanceiroRh ? 'Integrada ao Fluxo Operacional' : 'Mapeada no Escopo'}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/financeiro"
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
              ← Voltar à Central Financeira
            </Link>
            <Link
              href="/financeiro?aba=catalogo"
              style={{
                display: 'inline-block',
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Ver Matriz de Implantação
            </Link>
          </div>
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
            <dt style={{ fontWeight: 700, color: '#475569' }}>Grupo Funcional:</dt>
            <dd style={{ margin: 0 }}>{item.grupoTitulo}</dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Rota Canônica:</dt>
            <dd style={{ margin: 0 }}>
              <code>{item.rota}</code>
            </dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Integração Financeiro ↔ RH:</dt>
            <dd style={{ margin: 0 }}>
              {item.integracaoFinanceiroRh
                ? 'Ativa — Operada na aba Tesouraria e Folha SoD da Central Financeira'
                : 'Escopo dedicado do Financeiro Disk'}
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
              Para executar lançamentos no Livro Razão, gerenciar Centros de Custo ou aprovar lotes na Tesouraria, acesse as abas operacionais da Central Financeira.
            </div>
            <Link
              href={item.integracaoFinanceiroRh ? '/financeiro?aba=tesouraria' : '/financeiro?aba=razao'}
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
              Abrir Área de Trabalho →
            </Link>
          </div>
        </ActionPanel>
      ) : (
        <OperationalEmptyState
          title={`Subárea /financeiro/${slug}`}
          description="Autentique-se na plataforma para consultar a especificação completa desta rotina financeira."
        />
      )}
    </div>
  );
}
