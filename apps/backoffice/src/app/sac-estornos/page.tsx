'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ActionPanel, ErrorState, KpiCard, WorkspaceHeader } from '@bravo-ii/ui';
import { get } from '../../lib/bravo-api';
import { useBravoSession } from '../../context/session-context';

interface RefundRow {
  id: string;
  orderId: string;
  amountCents: number;
  status: string;
  provider: string;
  createdAt: string;
}

interface SacCaseRow {
  id: string;
  protocolNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SacEstornosUnifiedPage() {
  const { isAuthenticated, hasPermission } = useBravoSession();
  const canReadSac = hasPermission('sac:read');
  const canRequestRefund = hasPermission('refund:request');
  const canApproveRefund = hasPermission('refund:approve');

  const [sacCases, setSacCases] = useState<SacCaseRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setErrorMessage(null);
    try {
      const [casesRes, refundsRes] = await Promise.all([
        canReadSac
          ? get<{ items: SacCaseRow[] }>('sac/chamados').catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        canRequestRefund || canApproveRefund
          ? get<{ items: RefundRow[] }>('estornos').catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);
      setSacCases(casesRes.items ?? []);
      setRefunds(refundsRes.items ?? []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao consultar fila de SAC e Estornos.');
    }
  }, [isAuthenticated, canReadSac, canRequestRefund, canApproveRefund]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRefunds = refunds.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.orderId.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.provider.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <WorkspaceHeader
        eyebrow="Atendimento, Pós-Venda e Alçadas"
        title="Central Integrada de SAC e Estornos"
        subtitle="Operação segregada: o SAC registra chamados e solicitações de estorno; o Financeiro Disk decide em dupla alçada; nenhuma devolução bancária real ocorre sem liquidação homologada."
        statusBadge={isAuthenticated ? 'Fluxo Segregado Ativo' : 'Aguardando Login'}
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/sac/chamados"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Fila de Chamados SAC →
            </Link>
            <Link
              href="/estornos"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Solicitações de Estorno →
            </Link>
            {canApproveRefund && (
              <Link
                href="/financeiro/estornos"
                style={{
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
                Alçadas do Financeiro →
              </Link>
            )}
          </div>
        }
      />

      {errorMessage && (
        <ErrorState
          title="Erro ao carregar fila de SAC e Estornos"
          description={errorMessage}
          onRetry={() => void loadData()}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <KpiCard
          label="Chamados SAC Registrados"
          value={sacCases.length}
          helperText="Protocolos de atendimento no banco"
          tone="accent"
        />
        <KpiCard
          label="Solicitações de Estorno"
          value={refunds.length}
          helperText="Rastreadas no fluxo de alçada"
          tone="warning"
        />
        <KpiCard
          label="Aguardando Aprovação"
          value={refunds.filter((r) => r.status === 'SOLICITADO' || r.status === 'EM_ANALISE').length}
          helperText="Pendentes de decisão do Financeiro"
          tone="neutral"
        />
      </div>

      <ActionPanel
        title="Fila de Solicitações de Estorno e Chamados Vinculados"
        subtitle="Consulte o status de cada solicitação e acesse a estação específica de atendimento ou alçada financeira."
        rightSlot={
          <input
            type="search"
            placeholder="Filtrar pedido ou status..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
            }}
          />
        }
      >
        {filteredRefunds.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>
            Nenhuma solicitação de estorno localizada para o filtro atual. Utilize a tela de Solicitações de Estorno para abrir novo protocolo.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Pedido</th>
                  <th style={{ padding: '8px' }}>Valor</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Operadora</th>
                  <th style={{ padding: '8px' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{item.orderId}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>
                      {formatBrlCents(item.amountCents)}
                    </td>
                    <td style={{ padding: '8px' }}>{item.status}</td>
                    <td style={{ padding: '8px' }}>{item.provider}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>
                      {new Date(item.createdAt).toLocaleString('pt-BR')}
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
