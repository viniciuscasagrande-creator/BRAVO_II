'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BravoApiClient } from '@bravo-ii/sdk';
import type { EventSummaryViewDto } from '@bravo-ii/contracts';
import { ActionPanel, KpiCard, OperationalEmptyState, WorkspaceHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';

export default function RemarketingPage() {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canRead = hasPermission('remarketing:read');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!canRead || !isAuthenticated) return;
    void client
      .listAuthorizedEvents()
      .then((res) => setEvents(res.items ?? []))
      .catch(() => setEvents([]));
  }, [canRead, isAuthenticated, client]);

  if (!canRead) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito a Remarketing e Pós-Evento"
        description={`Sua credencial atual (${actor.roles.join(', ') || 'Não autenticada'}) não possui permissão para acessar esta área operacional.`}
      />
    );
  }

  const filteredEvents = events.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.city.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <WorkspaceHeader
        eyebrow="CRM, Pós-Evento e Privacidade LGPD"
        title="Remarketing, Segmentação e Governança de Consentimento"
        subtitle="O consentimento de marketing nunca é presumido automaticamente a partir da compra do ingresso. Disparos externos (e-mail/SMS/WhatsApp) permanecem bloqueados em homologação."
        statusBadge="Parcialmente Implementada · Disparos Externos Bloqueados"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <KpiCard
          label="Eventos Elegíveis p/ Pós-Evento"
          value={events.length}
          helperText="Eventos vinculados ao escopo"
          tone="accent"
        />
        <KpiCard
          label="Política de Opt-In LGPD"
          value="Obrigatória"
          helperText="Verificação explícita antes de qualquer exportação"
          tone="positive"
        />
        <KpiCard
          label="Disparador Externo (mensageria)"
          value="Bloqueado"
          helperText="Desativado em ambiente de homologação"
          tone="warning"
        />
      </div>

      <ActionPanel
        title="Consulta de Eventos para Segmentação Pós-Evento (Com Trava LGPD)"
        subtitle="Selecione ou filtre os eventos cadastrados para verificar elegibilidade de comunicação transacional vs promocional."
        rightSlot={
          <input
            type="search"
            placeholder="Filtrar evento ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
            }}
          />
        }
      >
        {filteredEvents.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Nenhum evento localizado para o filtro informado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Código</th>
                  <th style={{ padding: '8px' }}>Evento</th>
                  <th style={{ padding: '8px' }}>Cidade/UF</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Regra de Disparo</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{evt.code}</td>
                    <td style={{ padding: '8px' }}>{evt.title}</td>
                    <td style={{ padding: '8px' }}>
                      {evt.city}/{evt.stateUf}
                    </td>
                    <td style={{ padding: '8px' }}>{evt.status}</td>
                    <td style={{ padding: '8px', color: '#92400e', fontWeight: 600 }}>
                      Exige Opt-In Explícito (Conector Desativado em HML)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionPanel>
    </div>
  );
}
