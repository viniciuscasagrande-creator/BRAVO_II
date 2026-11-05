'use client';

import React, { useEffect, useState } from 'react';
import { HonestEmptyState, PageHeader, formatDateTimePtBr } from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { AuditRecordDto } from '@bravo-ii/contracts';

export default function AdministracaoGovernancaPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const [auditRecords, setAuditRecords] = useState<AuditRecordDto[]>([]);

  useEffect(() => {
    if (!sessionToken || !hasPermission('audit:read')) {
      setAuditRecords([]);
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const client = new BravoApiClient({ baseUrl: apiUrl, sessionToken });
    client
      .listAuditRecords()
      .then((res) => setAuditRecords(res.items))
      .catch(() => setAuditRecords([]));
  }, [sessionToken, actor.permissions]);

  if (!hasPermission('audit:read')) {
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
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Acesso Restrito à Trilha de Auditoria</h1>
        <p style={{ margin: 0, fontSize: '14px' }}>
          O perfil atual (<strong>{actor.roles.join(', ')}</strong>) não possui a permissão <code>audit:read</code>.
        </p>
      </section>
    );
  }

  return (
    <div>
      <PageHeader
        title="Administração, Governança e Trilha de Auditoria Imutável"
        subtitle="Registro estruturado e imutável (protegido por trigger PostgreSQL contra UPDATE/DELETE) de acessos, aprovações e bloqueios de permissão."
        moduleCode="IAM / AUD"
        packageBadge="Pacote 01 — Auditoria Imutável Ativa"
      />

      {auditRecords.length === 0 ? (
        <HonestEmptyState
          title="Nenhum registro de auditoria carregado na sessão local"
          description="Autentique-se na API em /login com o perfil Financeiro Disk para listar em tempo real os registros gravados na tabela audit_records do PostgreSQL."
          governanceNote="A tabela audit_records possui trigger forbid_audit_records_mutation que impede qualquer tentativa de alteração ou exclusão de histórico."
        />
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px' }}>Data/Hora</th>
                <th style={{ padding: '12px' }}>Papel</th>
                <th style={{ padding: '12px' }}>Ação Canônica</th>
                <th style={{ padding: '12px' }}>Recurso</th>
                <th style={{ padding: '12px' }}>Resultado</th>
                <th style={{ padding: '12px' }}>Correlação</th>
              </tr>
            </thead>
            <tbody>
              {auditRecords.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>{formatDateTimePtBr(rec.occurredAt)}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{rec.actorRole}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <code>{rec.canonicalAction}</code>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {rec.resourceType} {rec.resourceId ? `(${rec.resourceId})` : ''}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11px',
                        backgroundColor: rec.outcome === 'SUCCESS' ? '#dcfce7' : '#fee2e2',
                        color: rec.outcome === 'SUCCESS' ? '#166534' : '#991b1b',
                      }}
                    >
                      {rec.outcome}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{rec.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
