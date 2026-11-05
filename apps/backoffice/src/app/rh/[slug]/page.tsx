'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { CatalogFunctionItemDto } from '@bravo-ii/contracts';
import { HonestEmptyState, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../../context/session-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

export default function RhCatalogFunctionPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const canReadRh = hasPermission('rh:read') || hasPermission('rh:self-read');

  const client = useMemo(
    () => new BravoApiClient({ baseUrl: API_BASE_URL, sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [item, setItem] = useState<CatalogFunctionItemDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canReadRh || !sessionToken || !slug) return;
    void client
      .getCatalogFunction(slug)
      .then((res) => setItem(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao consultar função catalogada.'));
  }, [canReadRh, sessionToken, slug, client]);

  if (!canReadRh) {
    return (
      <HonestEmptyState
        title="Acesso Negado à Rota Interna do RH Disk"
        description={`O perfil ${actor.roles.join(', ')} não possui permissão para acessar /rh/${slug}.`}
        governanceNote="Proteção RBAC e LGPD ativa em todas as 45 rotas do RH & DP Disk."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title={item ? `#${String(item.numero).padStart(3, '0')} — ${item.itemTitulo}` : `Função RH: ${slug}`}
        moduleCode={item ? `${item.dominio} / ${item.modulo}` : 'RH_DP'}
        packageBadge={item ? `Status: ${item.statusMigracao}` : 'Catálogo 149 Funções'}
        subtitle={
          item
            ? `Subgrupo: ${item.subgrupoTitulo ?? item.grupoTitulo} · Rota Canônica: ${item.rota} · RBAC Mínimo: ${item.rbacMinimo}`
            : `Rota catalogada do RH Disk (/rh/${slug}).`
        }
      />

      <div>
        <Link
          href="/rh"
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
          ← Voltar à Central Operacional de Recursos Humanos (45 Opções)
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
            <dt style={{ fontWeight: 700, color: '#475569' }}>Grupo / Subgrupo:</dt>
            <dd style={{ margin: 0 }}>{item.subgrupoTitulo ?? item.grupoTitulo}</dd>
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
            <dt style={{ fontWeight: 700, color: '#475569' }}>Ponte RH → Financeiro:</dt>
            <dd style={{ margin: 0 }}>
              {item.integracaoFinanceiroRh
                ? 'Sim (Integrada ao contrato rh.pagamento_aprovado.v1)'
                : 'Escopo interno RH & DP Disk'}
            </dd>
          </dl>
        </section>
      ) : (
        <HonestEmptyState
          title={`Rota Canônica /rh/${slug} Preservada`}
          description="Autentique-se na API para carregar os metadados persistidos desta opção na tabela catalog_149_functions."
          governanceNote="Nenhuma das 45 opções de RH & DP foi suprimida."
        />
      )}
    </div>
  );
}
