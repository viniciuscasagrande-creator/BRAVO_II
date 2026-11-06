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
      <HonestEmptyState
        title={`Acesso Restrito a ${title}`}
        description={`Sua credencial atual (${actor.roles.join(', ')}) não possui permissão para acessar esta área operacional.`}
      />
    );
  }

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} moduleCode={moduleCode} packageBadge={packageBadge} />

      <HonestEmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
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
