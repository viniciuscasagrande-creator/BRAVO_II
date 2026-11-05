'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CatalogFunctionItemDto } from '@bravo-ii/contracts';
import { HonestEmptyState, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../../context/session-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

export default function FinanceiroCatalogFunctionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const canReadFinance = hasPermission('finance:read');

  const client = useMemo(
    () => new BravoApiClient({ baseUrl: API_BASE_URL, sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [item, setItem] = useState<CatalogFunctionItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadFinance || !sessionToken || !slug) return;
    void client
      .getCatalogFunction(slug)
      .then((res) => setItem(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao consultar função catalogada.'));
  }, [canReadFinance, sessionToken, slug, client]);

  if (!canReadFinance) {
    return (
      <HonestEmptyState
        title="Acesso Negado à Rota Interna do Financeiro Disk"
        description={`O perfil ${actor.roles.join(', ')} não possui permissão para acessar /financeiro/${slug}.`}
        governanceNote="Proteção RBAC ativa em todas as 104 rotas do Financeiro Disk."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title={item ? `#${String(item.numero).padStart(3, '0')} — ${item.itemTitulo}` : `Função Financeira: ${slug}`}
        moduleCode={item ? `${item.dominio} / ${item.modulo}` : 'FINANCEIRO'}
        packageBadge={item ? `Status: ${item.statusMigracao}` : 'Catálogo 149 Funções'}
        subtitle={
          item
            ? `Grupo: ${item.grupoTitulo} · Rota Canônica: ${item.rota} · RBAC Mínimo: ${item.rbacMinimo}`
            : `Rota catalogada do Financeiro Disk (/financeiro/${slug}).`
        }
      />

      <div>
        <Link
          href="/financeiro"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            borderRadius: '6px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Voltar à Central Operacional do Financeiro Disk (104 Opções)
        </Link>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {item ? (
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700 }}>
            Ficha de Rastreabilidade Oficial — Opção #{String(item.numero).padStart(3, '0')}
          </h2>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              rowGap: '10px',
              columnGap: '16px',
              fontSize: '13px',
              margin: 0,
            }}
          >
            <dt style={{ fontWeight: 700, color: '#475569' }}>Domínio:</dt>
            <dd style={{ margin: 0 }}>{item.dominio}</dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Grupo Principal:</dt>
            <dd style={{ margin: 0 }}>{item.grupoTitulo}</dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Módulo de Origem:</dt>
            <dd style={{ margin: 0 }}>
              <code>{item.modulo}</code>
            </dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Rota Canônica BRAVO_II:</dt>
            <dd style={{ margin: 0 }}>
              <code>{item.rota}</code>
            </dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Status de Migração Real:</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{item.statusMigracao}</dd>
            <dt style={{ fontWeight: 700, color: '#475569' }}>Ponte Financeiro ↔ RH:</dt>
            <dd style={{ margin: 0 }}>
              {item.integracaoFinanceiroRh ? 'Sim (Integrada ao contrato rh.pagamento_aprovado.v1)' : 'Escopo interno Financeiro Disk'}
            </dd>
          </dl>
        </section>
      ) : (
        <HonestEmptyState
          title={`Rota Canônica /financeiro/${slug} Preservada`}
          description="Autentique-se na API para carregar os metadados persistidos desta opção na tabela catalog_149_functions."
          governanceNote="Nenhuma das 104 opções do Financeiro Disk foi suprimida."
        />
      )}
    </div>
  );
}
