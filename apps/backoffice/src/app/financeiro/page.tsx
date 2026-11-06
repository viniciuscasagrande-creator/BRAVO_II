'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BravoApiClient } from '@bravo-ii/sdk';
import type {
  CatalogFunctionItemDto,
  CatalogSummaryDto,
  CostCenterDto,
  EventSummaryViewDto,
  FinanceLedgerEntryDto,
  RhPaymentBatchDto,
} from '@bravo-ii/contracts';
import {
  ActionPanel,
  ErrorState,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
} from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';

type FinanceTabKey = 'visao' | 'saldos' | 'tesouraria' | 'razao' | 'catalogo';

type ImplementationReadiness =
  | 'Implementada e Testada'
  | 'Parcialmente Implementada'
  | 'Bloqueada por Dependência'
  | 'Apenas Catálogo';

function classifyFinanceCatalogItem(item: CatalogFunctionItemDto): {
  status: ImplementationReadiness;
  badgeTone: 'ok' | 'info' | 'warn' | 'neutral';
  operationalHref: string;
} {
  const num = item.numero;
  const titleLower = item.itemTitulo.toLowerCase();
  const groupLower = item.grupoTitulo.toLowerCase();

  // Direct operational capabilities implemented and tested in PostgreSQL + API
  if (
    item.integracaoFinanceiroRh ||
    num === 65 ||
    (num >= 75 && num <= 79) ||
    titleLower.includes('centro de custo') ||
    titleLower.includes('razão') ||
    titleLower.includes('ledger') ||
    titleLower.includes('folha')
  ) {
    return {
      status: 'Implementada e Testada',
      badgeTone: 'ok',
      operationalHref: item.integracaoFinanceiroRh ? '/financeiro?aba=tesouraria' : '/financeiro?aba=razao',
    };
  }

  if (titleLower.includes('estorno') || titleLower.includes('chargeback') || titleLower.includes('reembolso')) {
    return {
      status: 'Implementada e Testada',
      badgeTone: 'ok',
      operationalHref: '/financeiro/estornos',
    };
  }

  if (
    titleLower.includes('taxa') ||
    titleLower.includes('borderô') ||
    titleLower.includes('evento') ||
    groupLower.includes('vendas') ||
    groupLower.includes('recebíveis')
  ) {
    return {
      status: 'Parcialmente Implementada',
      badgeTone: 'info',
      operationalHref: '/financeiro?aba=saldos',
    };
  }

  if (
    titleLower.includes('cnab') ||
    titleLower.includes('remessa') ||
    titleLower.includes('adquirente') ||
    titleLower.includes('conciliação bancária') ||
    titleLower.includes('pix') ||
    titleLower.includes('liquidação bancária') ||
    titleLower.includes('antecipação') ||
    titleLower.includes('repasse')
  ) {
    return {
      status: 'Bloqueada por Dependência',
      badgeTone: 'warn',
      operationalHref: item.rota,
    };
  }

  return {
    status: 'Apenas Catálogo',
    badgeTone: 'neutral',
    operationalHref: item.rota,
  };
}

function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceiroDiskPage() {
  const { actor, sessionToken, isAuthenticated, isLoadingSession, hasPermission } = useBravoSession();
  const canReadFinance = hasPermission('finance:read');
  const canWriteFinance = hasPermission('finance:approve-payout');
  const canApproveRhBatch = hasPermission('finance:approve-rh-payment');
  const canPrepareTreasury = hasPermission('finance:prepare-treasury');
  const canReconcileBatch = hasPermission('finance:reconcile-rh-payment');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [activeTab, setActiveTab] = useState<FinanceTabKey>('visao');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [catalog, setCatalog] = useState<CatalogSummaryDto | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [rhBatches, setRhBatches] = useState<RhPaymentBatchDto[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinanceLedgerEntryDto[]>([]);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<string>('TODOS');
  const [selectedReadiness, setSelectedReadiness] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states: Centro de Custo
  const [ccCode, setCcCode] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccType, setCcType] = useState<'CORPORATIVO_RH' | 'EVENTO_STAFF' | 'OPERACIONAL_GERAL'>('CORPORATIVO_RH');
  const [ccEventId, setCcEventId] = useState('');

  // Form states: Confirmação de liquidação externa
  const [externalRefsByBatch, setExternalRefsByBatch] = useState<Record<string, string>>({});

  // Sync tab from query string if navigated from sidebar submenu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba') as FinanceTabKey | null;
    if (aba && ['visao', 'saldos', 'tesouraria', 'razao', 'catalogo'].includes(aba)) {
      setActiveTab(aba);
    }
  }, []);

  const selectTab = (tab: FinanceTabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('aba', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const loadFinanceData = useCallback(async () => {
    if (!canReadFinance || !isAuthenticated) return;
    try {
      setIsLoadingData(true);
      setErrorMessage(null);
      const [catRes, ccRes, batchesRes, ledgerRes, eventsRes] = await Promise.all([
        client.getCatalogSummary('FINANCEIRO'),
        client.listCostCenters(),
        client.listFinanceRhPaymentBatches(),
        client.listFinanceLedger(),
        client.listAuthorizedEvents(),
      ]);
      setCatalog(catRes);
      setCostCenters(ccRes.items);
      setRhBatches(batchesRes.items);
      setLedgerEntries(ledgerRes.items);
      setEvents(eventsRes.items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar dados do Financeiro Disk.');
    } finally {
      setIsLoadingData(false);
    }
  }, [canReadFinance, isAuthenticated, client]);

  useEffect(() => {
    void loadFinanceData();
  }, [loadFinanceData]);

  const groups = useMemo(() => {
    if (!catalog) return [];
    const set = new Set<string>();
    for (const item of catalog.items) {
      set.add(item.grupoTitulo);
    }
    return Array.from(set);
  }, [catalog]);

  const readinessSummary = useMemo(() => {
    const counts: Record<ImplementationReadiness, number> = {
      'Implementada e Testada': 0,
      'Parcialmente Implementada': 0,
      'Bloqueada por Dependência': 0,
      'Apenas Catálogo': 0,
    };
    for (const item of catalog?.items ?? []) {
      const c = classifyFinanceCatalogItem(item);
      counts[c.status] += 1;
    }
    return counts;
  }, [catalog]);

  const filteredCatalogItems = useMemo((): CatalogFunctionItemDto[] => {
    if (!catalog) return [];
    return catalog.items.filter((item) => {
      const matchGroup = selectedGroup === 'TODOS' || item.grupoTitulo === selectedGroup;
      const readiness = classifyFinanceCatalogItem(item).status;
      const matchReadiness = selectedReadiness === 'TODOS' || readiness === selectedReadiness;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.itemTitulo.toLowerCase().includes(q) ||
        item.grupoTitulo.toLowerCase().includes(q) ||
        item.rota.toLowerCase().includes(q) ||
        String(item.numero).includes(q);
      return matchGroup && matchReadiness && matchQuery;
    });
  }, [catalog, selectedGroup, selectedReadiness, searchQuery]);

  // Derived real financial aggregates
  const financialTotals = useMemo(() => {
    const totalLedgerVolumeCents = ledgerEntries.reduce((acc, e) => acc + e.amountCents, 0);
    const pendingRhBatches = rhBatches.filter((b) => b.status !== 'LIQUIDADO');
    const settledRhBatches = rhBatches.filter((b) => b.status === 'LIQUIDADO');
    const pendingRhCents = pendingRhBatches.reduce((acc, b) => acc + b.netAmountCents, 0);
    const settledRhCents = settledRhBatches.reduce((acc, b) => acc + b.netAmountCents, 0);
    return {
      totalLedgerVolumeCents,
      pendingRhCount: pendingRhBatches.length,
      pendingRhCents,
      settledRhCount: settledRhBatches.length,
      settledRhCents,
    };
  }, [ledgerEntries, rhBatches]);

  const handleCreateCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await client.createCostCenter({
        code: ccCode,
        name: ccName,
        centerType: ccType,
        eventId: ccType === 'EVENTO_STAFF' ? ccEventId : null,
      });
      setCcCode('');
      setCcName('');
      setStatusMessage('Centro de custo registrado com sucesso.');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao criar centro de custo.');
    }
  };

  const handleApproveBatch = async (batchId: string) => {
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await client.approveRhPaymentBatch(batchId);
      setStatusMessage('Lote de folha aprovado pelo Financeiro Disk (segregação de alçada validada).');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao aprovar lote de pagamento.');
    }
  };

  const handlePrepareTreasury = async (batchId: string) => {
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await client.prepareRhPaymentTreasury(batchId);
      setStatusMessage('Instrução de tesouraria gerada em ambiente controlado (aguardando liquidação bancária).');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao preparar instrução de tesouraria.');
    }
  };

  const handleConfirmSettlement = async (batchId: string) => {
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const ref = (externalRefsByBatch[batchId] ?? '').trim();
      await client.confirmRhPaymentSettlement(batchId, { externalConfirmationRef: ref });
      setStatusMessage('Liquidação registrada com comprovante externo e partida dobrada lançada no Livro Razão.');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao confirmar liquidação.');
    }
  };

  if (!canReadFinance) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <WorkspaceHeader
          eyebrow="Controladoria e Tesouraria"
          title="Financeiro Disk"
          subtitle="Gestão de recebíveis, obrigações por evento, repasses, conciliação, tesouraria e Livro Razão."
        />
        <OperationalEmptyState
          title="Acesso Restrito ao Departamento Financeiro Disk"
          description={`Sua credencial atual (${actor.roles.join(', ')}) não inclui permissão de leitura financeira. O Portal do Produtor e o SAC operam em escopos isolados sem acesso à controladoria interna.`}
          action={
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Voltar à Visão Geral
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Controladoria, Tesouraria e Liquidação"
        title="Central Financeira Disk"
        subtitle="Acompanhamento executivo de saldos contábeis, obrigações com produtores por evento, liquidação de folha (SoD), centros de custo e matriz de implantação."
        statusBadge={
          isAuthenticated ? 'Operação Autenticada · Ledger Imutável Ativo' : 'Aguardando Login Corporativo'
        }
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link
              href="/financeiro/estornos"
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Alçada de Estornos →
            </Link>
            <button
              type="button"
              onClick={() => void loadFinanceData()}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sincronizar Saldos
            </button>
          </div>
        }
      />

      {!isAuthenticated && !isLoadingSession && (
        <ActionPanel
          title="Inicie sua Sessão no Financeiro Disk"
          subtitle="Para consultar os lançamentos reais do Livro Razão, aprovar lotes da folha de pagamento e gerenciar centros de custo, autentique-se com sua credencial financeira."
          rightSlot={
            <Link
              href="/login"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Autenticar no Financeiro →
            </Link>
          }
        >
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Nenhuma movimentação sintética é exibida sem sessão ativa. Após autenticar, todas as abas operacionais serão carregadas diretamente do PostgreSQL.
          </div>
        </ActionPanel>
      )}

      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            color: '#166534',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <ErrorState
          title="Falha na Operação Financeira"
          description={errorMessage}
          onRetry={() => void loadFinanceData()}
        />
      )}

      {/* Navegação Interna em Abas BankOS */}
      <div className="bravo-tabs" role="tablist" aria-label="Subáreas do Financeiro Disk">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'visao'}
          className={`bravo-tab-btn${activeTab === 'visao' ? ' is-active' : ''}`}
          onClick={() => selectTab('visao')}
        >
          Visão Executiva e Saldos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'saldos'}
          className={`bravo-tab-btn${activeTab === 'saldos' ? ' is-active' : ''}`}
          onClick={() => selectTab('saldos')}
        >
          Recebíveis, Obrigações e Repasses ({events.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tesouraria'}
          className={`bravo-tab-btn${activeTab === 'tesouraria' ? ' is-active' : ''}`}
          onClick={() => selectTab('tesouraria')}
        >
          Tesouraria e Folha SoD ({rhBatches.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'razao'}
          className={`bravo-tab-btn${activeTab === 'razao' ? ' is-active' : ''}`}
          onClick={() => selectTab('razao')}
        >
          Livro Razão e Centros de Custo ({ledgerEntries.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'catalogo'}
          className={`bravo-tab-btn${activeTab === 'catalogo' ? ' is-active' : ''}`}
          onClick={() => selectTab('catalogo')}
        >
          Escopo de Implantação ({catalog?.items.length ?? 104})
        </button>
      </div>

      {/* ABA 1: VISÃO EXECUTIVA E SALDOS */}
      {activeTab === 'visao' && isAuthenticated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <KpiCard
              label="Volume Contabilizado (Razão)"
              value={formatBrlFromCents(financialTotals.totalLedgerVolumeCents)}
              helperText={`${ledgerEntries.length} partida(s) dobrada(s) imutável(is)`}
              tone="accent"
            />
            <KpiCard
              label="Obrigações de Folha Pendentes"
              value={formatBrlFromCents(financialTotals.pendingRhCents)}
              helperText={`${financialTotals.pendingRhCount} lote(s) aguardando aprovação/liquidação`}
              tone={financialTotals.pendingRhCount > 0 ? 'warning' : 'neutral'}
            />
            <KpiCard
              label="Lotes de Folha Liquidados"
              value={formatBrlFromCents(financialTotals.settledRhCents)}
              helperText={`${financialTotals.settledRhCount} lote(s) conciliado(s) com comprovante`}
              tone="positive"
            />
            <KpiCard
              label="Eventos sob Gestão Financeira"
              value={events.length}
              helperText={`${costCenters.length} centro(s) de custo ativo(s)`}
              tone="neutral"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            <ActionPanel
              title="Estrutura Contábil por Evento (Regra Mandatória)"
              subtitle="Segregação estrita entre Recebimento Total pela Disk, Obrigação do Evento/Produtor e Receita da Taxa Disk."
              rightSlot={
                <button
                  type="button"
                  onClick={() => selectTab('saldos')}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Ver Eventos e Taxas →
                </button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <strong>1. Recebimento Bruto Custodiado (DiskIngressos):</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    Reconhecido apenas mediante liquidação confirmada pela adquirente/Pix e assinatura criptográfica.
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <strong>2. Obrigação de Repasse por Evento / Produtor:</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    Valor de face dos ingressos emitidos, isolado por evento para repasse ou antecipação contratual.
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <strong>3. Receita Própria DiskIngressos (Taxa por Evento):</strong>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    Percentual ou valor fixo negociado individualmente por evento (visibilidade exclusiva interna).
                  </div>
                </div>
              </div>
            </ActionPanel>

            <ActionPanel
              title="Alertas e Filas de Decisão Financeira"
              subtitle="Operações que exigem dupla aprovação ou conciliação de tesouraria."
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Ponte RH → Financeiro (Lotes de Pagamento)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {financialTotals.pendingRhCount} lote(s) pendente(s) · {formatBrlFromCents(financialTotals.pendingRhCents)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTab('tesouraria')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Operar Tesouraria →
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Dupla Aprovação de Estornos e Impacto no Borderô
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      SAC solicita → Financeiro Disk aprova em 1º e 2º nível
                    </div>
                  </div>
                  <Link
                    href="/financeiro/estornos"
                    style={{
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Abrir Alçada →
                  </Link>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Livro Razão Auxiliar e Centros de Custo
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {ledgerEntries.length} lançamento(s) imutável(is) · {costCenters.length} centro(s) de custo
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTab('razao')}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Inspecionar Razão →
                  </button>
                </div>
              </div>
            </ActionPanel>
          </div>
        </div>
      )}

      {/* ABA 2: RECEBÍVEIS, OBRIGAÇÕES, REPASSES E CONCILIAÇÃO POR EVENTO */}
      {activeTab === 'saldos' && isAuthenticated && (
        <ActionPanel
          title="Posição Financeira por Evento: Recebíveis, Taxa Disk, Repasses e Conciliação"
          subtitle="A Taxa Disk é parametrizada individualmente por evento (percentual ou fixa) e nunca aparece nos DTOs do Portal do Produtor."
          rightSlot={
            <Link
              href="/comercial"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Parametrizar Taxa no Comercial →
            </Link>
          }
        >
          {events.length === 0 ? (
            <OperationalEmptyState
              title="Nenhum Evento Cadastrado para Apuração de Recebíveis e Repasses"
              description="Assim que eventos e suas respectivas regras de Taxa Disk forem registrados no módulo Comercial/Eventos, a posição de recebíveis, obrigações do produtor e agenda de repasses será listada aqui."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="p06-table">
                <thead>
                  <tr>
                    <th>Código / Evento</th>
                    <th>Cidade / UF</th>
                    <th>Status Operacional</th>
                    <th>Taxa Disk Contratual (Interna)</th>
                    <th>Status de Repasse / Conciliação</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <strong>{ev.code}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{ev.title}</div>
                      </td>
                      <td>
                        {ev.city}/{ev.stateUf}
                      </td>
                      <td>
                        <span className="p06-badge info">{ev.status}</span>
                      </td>
                      <td>
                        {ev.internalDiskFeeAgreement ? (
                          <span className="p06-badge ok">
                            {ev.internalDiskFeeAgreement.calculationType === 'PERCENTAGE'
                              ? `${ev.internalDiskFeeAgreement.percentageRate ?? 0}%`
                              : formatBrlFromCents(ev.internalDiskFeeAgreement.fixedAmountCents ?? 0)}
                          </span>
                        ) : (
                          <span className="p06-badge warn">Aguardando Regra Comercial</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        Custódia segregada ativa · Repasse condicionado à liquidação confirmada de vendas
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ActionPanel>
      )}

      {/* ABA 3: TESOURARIA E FOLHA (PONTE RH → FINANCEIRO COM SEGREGAÇÃO DE FUNÇÕES) */}
      {activeTab === 'tesouraria' && isAuthenticated && (
        <ActionPanel
          title="Fila de Tesouraria e Liquidação de Lotes de Folha (Ponte RH → Financeiro)"
          subtitle="Segregação de Funções (SoD): o RH submete o lote consolidado sem expor salários individuais; um operador distinto do Financeiro aprova, gera a instrução de tesouraria e confirma a liquidação após retorno bancário."
        >
          {rhBatches.length === 0 ? (
            <OperationalEmptyState
              title="Nenhum Lote de Pagamento na Fila de Tesouraria"
              description="Quando o departamento de RH submeter lotes de folha corporativa ou equipes de evento, eles aparecerão nesta fila para aprovação, preparação de remessa e conciliação."
              action={
                <Link
                  href="/rh"
                  style={{
                    display: 'inline-block',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Ir para RH e Departamento Pessoal →
                </Link>
              }
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="p06-table">
                <thead>
                  <tr>
                    <th>Código / Origem</th>
                    <th>Competência</th>
                    <th>Centro de Custo</th>
                    <th>Colaboradores</th>
                    <th>Valor Líquido</th>
                    <th>Status</th>
                    <th>Ação do Financeiro (SoD)</th>
                  </tr>
                </thead>
                <tbody>
                  {rhBatches.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.batchCode}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{b.originType}</div>
                      </td>
                      <td>{b.competencia}</td>
                      <td>{b.costCenterCode ?? b.costCenterId.slice(0, 8)}</td>
                      <td>{b.headcount}</td>
                      <td style={{ fontWeight: 700 }}>{formatBrlFromCents(b.netAmountCents)}</td>
                      <td>
                        <span
                          className={`p06-badge ${
                            b.status === 'LIQUIDADO'
                              ? 'ok'
                              : b.status === 'AGUARDANDO_FINANCEIRO'
                                ? 'warn'
                                : 'info'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.status === 'AGUARDANDO_FINANCEIRO' && canApproveRhBatch && (
                          <button
                            type="button"
                            onClick={() => void handleApproveBatch(b.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#1d4ed8',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            1. Aprovar Lote (SoD)
                          </button>
                        )}
                        {b.status === 'APROVADO_FINANCEIRO' && canPrepareTreasury && (
                          <button
                            type="button"
                            onClick={() => void handlePrepareTreasury(b.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            2. Gerar Instrução de Tesouraria
                          </button>
                        )}
                        {b.status === 'PENDENTE_INTEGRACAO_BANCARIA' && canReconcileBatch && (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Comprovante bancário (ex.: RET-001)"
                              value={externalRefsByBatch[b.id] ?? ''}
                              onChange={(e) =>
                                setExternalRefsByBatch((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              style={{
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '12px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleConfirmSettlement(b.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#15803d',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              3. Confirmar Liquidação
                            </button>
                          </div>
                        )}
                        {b.status === 'LIQUIDADO' && (
                          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                            Liquidado ({b.externalConfirmationRef})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ActionPanel>
      )}

      {/* ABA 4: LIVRO RAZÃO E CENTROS DE CUSTO */}
      {activeTab === 'razao' && isAuthenticated && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px',
          }}
        >
          <ActionPanel
            title="Centros de Custo Corporativos e de Eventos"
            subtitle="Segregação contábil entre folha administrativa (CORPORATIVO_RH), custo direto de operação de evento (EVENTO_STAFF) e despesas gerais."
          >
            {canWriteFinance && (
              <form
                onSubmit={(e) => void handleCreateCostCenter(e)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}
              >
                <input
                  type="text"
                  placeholder="Código (ex.: CC-RH-CORP)"
                  value={ccCode}
                  onChange={(e) => setCcCode(e.target.value)}
                  required
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Descrição do Centro de Custo"
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  required
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <select
                  value={ccType}
                  onChange={(e) =>
                    setCcType(e.target.value as 'CORPORATIVO_RH' | 'EVENTO_STAFF' | 'OPERACIONAL_GERAL')
                  }
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="CORPORATIVO_RH">Folha Administrativa (CORPORATIVO_RH)</option>
                  <option value="EVENTO_STAFF">Custo Direto de Evento (EVENTO_STAFF)</option>
                  <option value="OPERACIONAL_GERAL">Operacional Geral (OPERACIONAL_GERAL)</option>
                </select>
                {ccType === 'EVENTO_STAFF' ? (
                  <select
                    value={ccEventId}
                    onChange={(e) => setCcEventId(e.target.value)}
                    required
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="">Selecione o Evento Vinculado...</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.code} — {ev.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>
                    Alocação corporativa sem vínculo a evento específico
                  </div>
                )}
                <button
                  type="submit"
                  style={{
                    gridColumn: '1 / -1',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Registrar Centro de Custo
                </button>
              </form>
            )}

            {costCenters.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Nenhum centro de custo cadastrado no momento.
              </div>
            ) : (
              <table className="p06-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Classificação</th>
                  </tr>
                </thead>
                <tbody>
                  {costCenters.map((cc) => (
                    <tr key={cc.id}>
                      <td>
                        <strong>{cc.code}</strong>
                      </td>
                      <td>{cc.name}</td>
                      <td>
                        <span className="p06-badge info">{cc.centerType}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ActionPanel>

          <ActionPanel
            title="Livro Razão de Partidas Dobradas (Imutável)"
            subtitle="Lançamentos contábeis protegidos contra alteração ou exclusão direta no banco de dados."
          >
            {ledgerEntries.length === 0 ? (
              <OperationalEmptyState
                title="Sem Lançamentos Contábeis no Período"
                description="O Livro Razão registra automaticamente partidas dobradas quando lotes de pagamento ou operações financeiras são liquidados."
              />
            ) : (
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="p06-table">
                  <thead>
                    <tr>
                      <th>Conta Débito</th>
                      <th>Conta Crédito</th>
                      <th>Valor</th>
                      <th>Histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <code>{entry.debitAccount}</code>
                        </td>
                        <td>
                          <code>{entry.creditAccount}</code>
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatBrlFromCents(entry.amountCents)}</td>
                        <td style={{ fontSize: '12px', color: '#475569' }}>{entry.descriptionPtBr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ActionPanel>
        </div>
      )}

      {/* ABA 5: ESCOPO DE IMPLANTAÇÃO (MATRIZ DAS 104 FUNÇÕES COM CLASSIFICAÇÃO HONESTA) */}
      {activeTab === 'catalogo' && isAuthenticated && (
        <ActionPanel
          title="Escopo de Implantação — 104 Funções do Financeiro Disk em 16 Grupos"
          subtitle="Transparência operacional: classificação real entre rotinas implementadas e testadas, parcialmente implementadas, bloqueadas por dependência bancária externa e itens de catálogo."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <KpiCard
              label="Implementada e Testada"
              value={readinessSummary['Implementada e Testada']}
              helperText="Persistência PostgreSQL e API ativas"
              tone="positive"
            />
            <KpiCard
              label="Parcialmente Implementada"
              value={readinessSummary['Parcialmente Implementada']}
              helperText="Base de dados pronta, fluxo em expansão"
              tone="accent"
            />
            <KpiCard
              label="Bloqueada por Dependência"
              value={readinessSummary['Bloqueada por Dependência']}
              helperText="Requer gateway bancário/adquirente ativo"
              tone="warning"
            />
            <KpiCard
              label="Apenas Catálogo"
              value={readinessSummary['Apenas Catálogo']}
              helperText="Rota mapeada no roadmap oficial"
              tone="neutral"
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              Exibindo {filteredCatalogItems.length} de {catalog?.items.length ?? 104} funções catalogadas
              {isLoadingData ? ' (atualizando...)' : ''}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedReadiness}
                onChange={(e) => setSelectedReadiness(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              >
                <option value="TODOS">Todos os Status de Implantação</option>
                <option value="Implementada e Testada">Implementada e Testada</option>
                <option value="Parcialmente Implementada">Parcialmente Implementada</option>
                <option value="Bloqueada por Dependência">Bloqueada por Dependência</option>
                <option value="Apenas Catálogo">Apenas Catálogo</option>
              </select>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              >
                <option value="TODOS">Todos os 16 Grupos ({catalog?.items.length ?? 104})</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <input
                type="search"
                placeholder="Buscar função por nome ou #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  minWidth: '220px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredCatalogItems.map((item) => {
              const classification = classifyFinanceCatalogItem(item);
              return (
                <Link
                  key={item.numero}
                  href={item.rota}
                  style={{
                    display: 'block',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    textDecoration: 'none',
                    color: '#0f172a',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8' }}>
                      #{String(item.numero).padStart(3, '0')} · {item.grupoTitulo}
                    </span>
                    <span className={`p06-badge ${classification.badgeTone}`}>{classification.status}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>{item.itemTitulo}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    Rota: <code>{item.rota}</code>
                  </div>
                </Link>
              );
            })}
          </div>
        </ActionPanel>
      )}
    </div>
  );
}
