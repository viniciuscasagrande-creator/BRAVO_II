'use client';

import React from 'react';
import { HonestEmptyState, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../context/session-context';
import type { PermissionCode } from '@bravo-ii/contracts';

export interface ModuleFoundationViewProps {
  title: string;
  subtitle: string;
  moduleCode: string;
  packageBadge: string;
  requiredPermission: PermissionCode;
  emptyStateTitle: string;
  emptyStateDescription: string;
  governanceRules: string[];
}

export function ModuleFoundationView({
  title,
  subtitle,
  moduleCode,
  packageBadge,
  requiredPermission,
  emptyStateTitle,
  emptyStateDescription,
  governanceRules,
}: ModuleFoundationViewProps) {
  const { actor, hasPermission } = useBravoSession();

  if (!hasPermission(requiredPermission)) {
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
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Negado para o Perfil Atual</h1>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
          O perfil ativo (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão canônica{' '}
          <code>{requiredPermission}</code> exigida pelo módulo <strong>{title}</strong>. Tentativas de acesso não
          autorizadas em rotas da API são bloqueadas e gravadas na trilha de auditoria imutável.
        </p>
      </section>
    );
  }

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} moduleCode={moduleCode} packageBadge={packageBadge} />

      <HonestEmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
        governanceNote="Nenhum botão fictício ou indicador simulado é exibido. Os fluxos transacionais deste domínio serão ativados conforme o cronograma de pacotes do docs/09-ROADMAP-ACEITE.md."
      />

      <section
        style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>
          Regras de Negócio e Contratos Protegidos neste Módulo
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '14px', lineHeight: 1.7 }}>
          {governanceRules.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
