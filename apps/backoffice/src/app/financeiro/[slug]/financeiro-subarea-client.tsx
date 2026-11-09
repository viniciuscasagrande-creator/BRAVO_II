'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BravoApiClient } from '@bravo-ii/sdk';
import type {
  CatalogFunctionItemDto,
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
import { useBravoSession } from '../../../context/session-context';

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface SubareaMeta {
  title: string;
  subtitle: string;
  rangeMin: number;
  rangeMax: number;
  mode: 'CAP_CAR' | 'TESOURARIA' | 'REPASSES' | 'CONTABILIDADE' | 'FOLHA_FECHAMENTO';
}

function resolveSubareaMeta(slug: string, singleItem: CatalogFunctionItemDto | null): SubareaMeta {
  const normalized = slug.toLowerCase();
  if (normalized === 'f01-f28') {
    return {
      title: 'Contas a Pagar, Contas a Receber e Títulos (F01–F28)',
      subtitle:
        'Gestão de títulos, baixas, conciliação de recebíveis de vendas e programação de obrigações financeiras.',
      rangeMin: 1,
      rangeMax: 28,
      mode: 'CAP_CAR',
    };
  }
  if (normalized === 'f29-f50') {
    return {
      title: 'Tesouraria, Contas Bancárias e Conciliação (F29–F50)',
      subtitle:
        'Movimentação de caixa, conciliação bancária, fluxo de liquidação e alçadas de pagamento.',
      rangeMin: 29,
      rangeMax: 50,
      mode: 'TESOURARIA',
    };
  }
  if (normalized === 'f51-f70') {
    return {
      title: 'Repasses, Antecipações e Borderôs de Eventos (F51–F70)',
      subtitle:
        'Apuração separada entre Recebimento Total, Receita Taxa Disk por Evento e Obrigação Líquida ao Produtor.',
      rangeMin: 51,
      rangeMax: 70,
      mode: 'REPASSES',
    };
  }
  if (normalized === 'f71-f88') {
    return {
      title: 'Contabilidade, Livro Razão, DRE e Centros de Custo (F71–F88)',
      subtitle:
        'Escrituração em partidas dobradas, centros de custo operacionais e demonstrativos contábeis.',
      rangeMin: 71,
      rangeMax: 88,
      mode: 'CONTABILIDADE',
    };
  }
  if (normalized === 'f89-f104') {
    return {
      title: 'Integração Folha RH (SoD), Auditoria e Fechamento (F89–F104)',
      subtitle:
        'Liquidação segregada de lotes de pagamento enviados pelo RH (sem exposição de PII salarial) e fechamento contábil.',
      rangeMin: 89,
      rangeMax: 104,
      mode: 'FOLHA_FECHAMENTO',
    };
  }

  const num = singleItem?.numero ?? (Number(normalized.replace(/^f0*/, '')) || 1);
  const mode: SubareaMeta['mode'] =
    num <= 28
      ? 'CAP_CAR'
      : num <= 50
        ? 'TESOURARIA'
        : num <= 70
          ? 'REPASSES'
          : num <= 88
            ? 'CONTABILIDADE'
            : 'FOLHA_FECHAMENTO';

  return {
    title: singleItem
      ? `#${String(singleItem.numero).padStart(3, '0')} — ${singleItem.itemTitulo}`
      : `Estação Operacional Financeira (${slug.toUpperCase()})`,
    subtitle: singleItem
      ? `Operação vinculada ao grupo ${singleItem.grupoTitulo} com consultas, lançamentos no razão e trilha de auditoria.`
      : 'Operação de controladoria, livro razão, tesouraria e centros de custo.',
    rangeMin: num,
    rangeMax: num,
    mode,
  };
}

export function FinanceiroSubareaClient({ slug }: { slug: string }) {
  const { actor, sessionToken, isAuthenticated, hasPermission } = useBravoSession();
  const canReadFinance = hasPermission('finance:read');
  const canWriteFinance =
    hasPermission('finance:approve-payout') || hasPermission('finance:prepare-treasury');

  const client = useMemo(
    () => new BravoApiClient({ sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [singleItem, setSingleItem] = useState<CatalogFunctionItemDto | null>(null);
  const [groupItems, setGroupItems] = useState<CatalogFunctionItemDto[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinanceLedgerEntryDto[]>([]);
  const [rhBatches, setRhBatches] = useState<RhPaymentBatchDto[]>([]);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulário de lançamento contábil em partida dobrada
  const [debitAccount, setDebitAccount] = useState('2.1.01.001-OBRIGACOES');
  const [creditAccount, setCreditAccount] = useState('1.1.01.001-CAIXA-GERAL');
  const [amountReais, setAmountReais] = useState('1500.00');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('');
  const [descriptionPtBr, setDescriptionPtBr] = useState('');

  // Formulário de centro de custo
  const [ccCode, setCcCode] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccType, setCcType] = useState<'CORPORATIVO_RH' | 'OPERACIONAL_GERAL'>('OPERACIONAL_GERAL');

  const meta = resolveSubareaMeta(slug, singleItem);

  const loadWorkspaceData = useCallback(async () => {
    if (!canReadFinance || !isAuthenticated) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [catalogRes, ccsRes, entriesRes, batchesRes, evtsRes] = await Promise.all([
        client.getCatalogSummary('FINANCEIRO').catch(() => null),
        client.listCostCenters().catch(() => ({ items: [] })),
        client.listFinanceLedger().catch(() => ({ items: [] })),
        client.listFinanceRhPaymentBatches().catch(() => ({ items: [] })),
        client.listAuthorizedEvents().catch(() => ({ items: [] })),
      ]);

      const allCatalog = catalogRes?.items ?? [];
      const exactMatch = allCatalog.find(
        (c) =>
          c.rota.toLowerCase().endsWith(`/${slug.toLowerCase()}`) ||
          `f${String(c.numero).padStart(2, '0')}` === slug.toLowerCase() ||
          `f${c.numero}` === slug.toLowerCase()
      );
      setSingleItem(exactMatch ?? null);

      const m = resolveSubareaMeta(slug, exactMatch ?? null);
      setGroupItems(allCatalog.filter((c) => c.numero >= m.rangeMin && c.numero <= m.rangeMax));
      const ccs = ccsRes.items ?? [];
      setCostCenters(ccs);
      if (ccs.length > 0 && !selectedCostCenterId) {
        setSelectedCostCenterId(ccs[0].id);
      }
      setLedgerEntries(entriesRes.items ?? []);
      setRhBatches(batchesRes.items ?? []);
      setEvents(evtsRes.items ?? []);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar dados operacionais da subárea financeira.'
      );
    } finally {
      setLoading(false);
    }
  }, [canReadFinance, isAuthenticated, client, slug, selectedCostCenterId]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleCreateLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const amountCents = Math.round(Number(amountReais.replace(',', '.')) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error('Informe um valor monetário válido maior que zero.');
      }
      await client.createFinanceLedgerEntry({
        entryGroupId: crypto.randomUUID(),
        costCenterId: selectedCostCenterId || undefined,
        debitAccount: debitAccount.trim(),
        creditAccount: creditAccount.trim(),
        amountCents,
        descriptionPtBr:
          descriptionPtBr.trim() || `Lançamento operacional registrado via ${meta.title}`,
      });
      setDescriptionPtBr('');
      setStatusMessage('Partida dobrada registrada e auditada com sucesso no Livro Razão PostgreSQL.');
      await loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao registrar lançamento contábil.');
    }
  };

  const handleCreateCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await client.createCostCenter({
        code: ccCode.trim().toUpperCase(),
        name: ccName.trim(),
        centerType: ccType,
      });
      setCcCode('');
      setCcName('');
      setStatusMessage('Centro de custo cadastrado com sucesso.');
      await loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao cadastrar centro de custo.');
    }
  };

  const handleApproveBatch = async (batchId: string) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await client.approveRhPaymentBatch(batchId);
      setStatusMessage('Lote aprovado pela controladoria financeira (SoD).');
      await loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao aprovar lote na Tesouraria.');
    }
  };

  if (!canReadFinance) {
    return (
      <OperationalEmptyState
        title="Acesso Restrito ao Financeiro Disk"
        description={`Sua credencial atual (${actor.roles.join(', ') || 'Não autenticada'}) não possui permissão para acessar esta estação financeira.`}
        action={
          !isAuthenticated ? (
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              Autenticar Operador →
            </Link>
          ) : undefined
        }
      />
    );
  }

  const filteredLedger = ledgerEntries.filter((entry) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      entry.debitAccount.toLowerCase().includes(q) ||
      entry.creditAccount.toLowerCase().includes(q) ||
      entry.descriptionPtBr.toLowerCase().includes(q)
    );
  });

  const totalLedgerVolumeCents = ledgerEntries.reduce((acc, e) => acc + e.amountCents, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <WorkspaceHeader
        eyebrow="Financeiro Disk · Estação Operacional"
        title={meta.title}
        subtitle={meta.subtitle}
        statusBadge={loading ? 'Sincronizando...' : `${groupItems.length || 1} rotina(s) no escopo`}
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void loadWorkspaceData()}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Atualizar Dados
            </button>
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
              ← Painel Principal Financeiro
            </Link>
          </div>
        }
      />

      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
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
          title="Alerta na Operação Financeira"
          description={errorMessage}
          onRetry={() => void loadWorkspaceData()}
        />
      )}

      {/* Indicadores Operacionais da Subárea */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <KpiCard
          label="Volume Escriturado (Razão)"
          value={formatBrlCents(totalLedgerVolumeCents)}
          helperText={`${ledgerEntries.length} partida(s) dobrada(s)`}
          tone="positive"
        />
        <KpiCard
          label="Centros de Custo Ativos"
          value={costCenters.length}
          helperText="Estruturas de rateio contábil"
          tone="accent"
        />
        <KpiCard
          label="Lotes Folha RH (SoD)"
          value={rhBatches.length}
          helperText="Recebidos na Tesouraria Disk"
          tone="neutral"
        />
        <KpiCard
          label="Eventos no Escopo"
          value={events.length}
          helperText="Apuração de Taxa Disk por evento"
          tone="neutral"
        />
      </div>

      {/* Ferramentas Operacionais: Cadastro / Ação + Consulta com Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {canWriteFinance && (
          <ActionPanel
            title="Registrar Partida Dobrada no Livro Razão"
            subtitle="Persiste lançamento contábil auditado no PostgreSQL vinculado ao Centro de Custo."
          >
            <form onSubmit={(e) => void handleCreateLedgerEntry(e)}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Conta Débito
                  </label>
                  <input
                    type="text"
                    value={debitAccount}
                    onChange={(e) => setDebitAccount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Conta Crédito
                  </label>
                  <input
                    type="text"
                    value={creditAccount}
                    onChange={(e) => setCreditAccount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    value={amountReais}
                    onChange={(e) => setAmountReais(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Centro de Custo
                  </label>
                  <select
                    value={selectedCostCenterId}
                    onChange={(e) => setSelectedCostCenterId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Sem centro de custo específico</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Histórico / Justificativa Operacional
                </label>
                <input
                  type="text"
                  placeholder="Descreva o documento, borderô ou título..."
                  value={descriptionPtBr}
                  onChange={(e) => setDescriptionPtBr(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Contabilizar Lançamento
              </button>
            </form>
          </ActionPanel>
        )}

        {canWriteFinance && (
          <ActionPanel
            title="Cadastrar Novo Centro de Custo"
            subtitle="Estrutura departamental para classificação contábil e rateio operacional."
          >
            <form onSubmit={(e) => void handleCreateCostCenter(e)}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Código
                  </label>
                  <input
                    type="text"
                    placeholder="CC-FIN-01"
                    value={ccCode}
                    onChange={(e) => setCcCode(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Nome do Centro de Custo
                  </label>
                  <input
                    type="text"
                    placeholder="Operação Bilheteria / Tesouraria"
                    value={ccName}
                    onChange={(e) => setCcName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Classificação do Centro
                </label>
                <select
                  value={ccType}
                  onChange={(e) =>
                    setCcType(e.target.value as 'CORPORATIVO_RH' | 'OPERACIONAL_GERAL')
                  }
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="OPERACIONAL_GERAL">Operacional Geral</option>
                  <option value="CORPORATIVO_RH">Corporativo / RH</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar Centro de Custo
              </button>
            </form>
          </ActionPanel>
        )}
      </div>

      {/* Lotes de Folha RH na Tesouraria (Segregação de Funções SoD) */}
      {(meta.mode === 'TESOURARIA' || meta.mode === 'FOLHA_FECHAMENTO' || rhBatches.length > 0) && (
        <ActionPanel
          title="Fila de Lotes de Pagamento RH ↔ Tesouraria (Segregação SoD)"
          subtitle="O Financeiro Disk visualiza e aprova apenas o montante agregado por lote, sem acesso a salários individuais."
        >
          {rhBatches.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Nenhum lote de folha aguardando aprovação no momento.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px' }}>Lote</th>
                    <th style={{ padding: '8px' }}>Competência</th>
                    <th style={{ padding: '8px' }}>Colaboradores</th>
                    <th style={{ padding: '8px' }}>Líquido Total</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Ação da Tesouraria</th>
                  </tr>
                </thead>
                <tbody>
                  {rhBatches.map((batch) => (
                    <tr key={batch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{batch.batchCode}</td>
                      <td style={{ padding: '8px' }}>{batch.competencia}</td>
                      <td style={{ padding: '8px' }}>{batch.headcount}</td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        {formatBrlCents(batch.netAmountCents)}
                      </td>
                      <td style={{ padding: '8px' }}>{batch.status}</td>
                      <td style={{ padding: '8px' }}>
                        {canWriteFinance && batch.status === 'AGUARDANDO_FINANCEIRO' ? (
                          <button
                            type="button"
                            onClick={() => void handleApproveBatch(batch.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Aprovar Lote (SoD)
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {batch.externalConfirmationRef ?? batch.status}
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

      {/* Histórico e Consulta Filtrada do Livro Razão */}
      <ActionPanel
        title="Consulta e Histórico de Lançamentos no Livro Razão"
        subtitle="Filtre por conta contábil de débito, crédito ou histórico."
        rightSlot={
          <input
            type="search"
            placeholder="Filtrar por conta ou histórico..."
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
        {filteredLedger.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>
            Nenhum lançamento encontrado para os filtros informados. Utilize o formulário acima para registrar.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Conta Débito</th>
                  <th style={{ padding: '8px' }}>Conta Crédito</th>
                  <th style={{ padding: '8px' }}>Valor</th>
                  <th style={{ padding: '8px' }}>Histórico</th>
                  <th style={{ padding: '8px' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.debitAccount}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{entry.creditAccount}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>
                      {formatBrlCents(entry.amountCents)}
                    </td>
                    <td style={{ padding: '8px' }}>{entry.descriptionPtBr}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>
                      {new Date(entry.occurredAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ActionPanel>

      {/* Eventos e Obrigações Contratuais no Escopo */}
      {events.length > 0 && (
        <ActionPanel
          title="Eventos Vinculados e Apuração de Taxa Disk por Evento"
          subtitle="Cada evento possui regra contratual própria de Taxa Disk (percentual ou fixa), separando Receita Disk de Obrigação ao Produtor."
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>Código</th>
                  <th style={{ padding: '8px' }}>Evento</th>
                  <th style={{ padding: '8px' }}>Local</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Taxa Disk Pactuada</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{evt.code}</td>
                    <td style={{ padding: '8px' }}>{evt.title}</td>
                    <td style={{ padding: '8px' }}>
                      {evt.venueName} ({evt.city}/{evt.stateUf})
                    </td>
                    <td style={{ padding: '8px' }}>{evt.status}</td>
                    <td style={{ padding: '8px' }}>
                      <Link
                        href={`/comercial/eventos/${evt.id}/taxas`}
                        style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Consultar Regra Contratual →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionPanel>
      )}

      {/* Matriz Honesta das Rotinas Catalogadas no Grupo */}
      {groupItems.length > 0 && (
        <ActionPanel
          title={`Classificação Honesta de Prontidão (${groupItems.length} rotina(s) neste agrupamento)`}
          subtitle="Nenhuma função apenas catalogada é marcada como concluída sem implementação e teste verificados."
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px' }}>#</th>
                  <th style={{ padding: '8px' }}>Rotina</th>
                  <th style={{ padding: '8px' }}>Grupo</th>
                  <th style={{ padding: '8px' }}>Classificação Real</th>
                </tr>
              </thead>
              <tbody>
                {groupItems.map((fn) => {
                  const statusLabel =
                    fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                      ? 'Implementada e Testada'
                      : fn.integracaoFinanceiroRh
                        ? 'Parcialmente Implementada (Ponte SoD)'
                        : 'Apenas Catálogo (Mapeada)';
                  return (
                    <tr key={fn.numero} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        #{String(fn.numero).padStart(3, '0')}
                      </td>
                      <td style={{ padding: '8px' }}>{fn.itemTitulo}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{fn.grupoTitulo}</td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            backgroundColor:
                              fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                                ? '#dcfce7'
                                : fn.integracaoFinanceiroRh
                                  ? '#fef3c7'
                                  : '#f1f5f9',
                            color:
                              fn.statusMigracao === 'TESTADO_HOMOLOGACAO'
                                ? '#166534'
                                : fn.integracaoFinanceiroRh
                                  ? '#92400e'
                                  : '#475569',
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionPanel>
      )}
    </div>
  );
}
