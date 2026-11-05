'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BravoApiClient,
} from '@bravo-ii/sdk';
import type {
  CatalogFunctionItemDto,
  CatalogSummaryDto,
  CostCenterDto,
  EventSummaryViewDto,
  FinanceLedgerEntryDto,
  RhPaymentBatchDto,
} from '@bravo-ii/contracts';
import { HonestEmptyState, PageHeader } from '@bravo-ii/ui';
import { useBravoSession } from '../../context/session-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:4000';

export default function FinanceiroDiskPage() {
  const { actor, sessionToken, hasPermission } = useBravoSession();
  const canReadFinance = hasPermission('finance:read');
  const canWriteFinance = hasPermission('finance:approve-payout');
  const canApproveRhBatch = hasPermission('finance:approve-rh-payment');
  const canPrepareTreasury = hasPermission('finance:prepare-treasury');
  const canReconcileBatch = hasPermission('finance:reconcile-rh-payment');

  const client = useMemo(
    () => new BravoApiClient({ baseUrl: API_BASE_URL, sessionToken: sessionToken ?? undefined }),
    [sessionToken]
  );

  const [catalog, setCatalog] = useState<CatalogSummaryDto | null>(null);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [rhBatches, setRhBatches] = useState<RhPaymentBatchDto[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinanceLedgerEntryDto[]>([]);
  const [events, setEvents] = useState<EventSummaryViewDto[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<string>('TODOS');
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

  const loadFinanceData = useCallback(async () => {
    if (!canReadFinance || !sessionToken) return;
    try {
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
    }
  }, [canReadFinance, sessionToken, client]);

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

  const filteredCatalogItems = useMemo((): CatalogFunctionItemDto[] => {
    if (!catalog) return [];
    return catalog.items.filter((item) => {
      const matchGroup = selectedGroup === 'TODOS' || item.grupoTitulo === selectedGroup;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.itemTitulo.toLowerCase().includes(q) ||
        item.grupoTitulo.toLowerCase().includes(q) ||
        item.rota.toLowerCase().includes(q) ||
        String(item.numero).includes(q);
      return matchGroup && matchQuery;
    });
  }, [catalog, selectedGroup, searchQuery]);

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
      setStatusMessage('Centro de custo registrado com sucesso no PostgreSQL.');
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
      setStatusMessage('Lote RH aprovado pelo Financeiro Disk (SoD validada: solicitante <> aprovador).');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao aprovar lote RH.');
    }
  };

  const handlePrepareTreasury = async (batchId: string) => {
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      await client.prepareRhPaymentTreasury(batchId);
      setStatusMessage('Instrução de Tesouraria gerada em modo Sandbox (PENDENTE_INTEGRACAO_BANCARIA).');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao preparar tesouraria.');
    }
  };

  const handleConfirmSettlement = async (batchId: string) => {
    try {
      setErrorMessage(null);
      setStatusMessage(null);
      const ref = (externalRefsByBatch[batchId] ?? '').trim();
      await client.confirmRhPaymentSettlement(batchId, { externalConfirmationRef: ref });
      setStatusMessage('Liquidação confirmada com comprovante externo e partida dobrada lançada no Ledger!');
      await loadFinanceData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao confirmar liquidação.');
    }
  };

  if (!canReadFinance) {
    return (
      <div>
        <PageHeader
          title="Financeiro Disk (104 Opções / 16 Grupos)"
          moduleCode="FIN / FEE / TREASURY / LEDGER"
          packageBadge="Pacote Mestre Financeiro (Ativo)"
          subtitle="Gestão de vendas, recebíveis, taxas por evento, tesouraria, conciliação, controladoria, ledger imutável e ponte de liquidação RH→Financeiro."
        />
        <HonestEmptyState
          title="Acesso Restrito ao Perfil Financeiro Disk"
          description={`O perfil ativo (${actor.roles.join(', ')}) não possui a permissão 'finance:read'. O Portal do Produtor (PDT) e o SAC nunca acessam a Taxa Disk interna nem a controladoria financeira.`}
          governanceNote="Segregação estrita RBAC+ABAC conforme docs/05-SEGURANCA-GOVERNANCA.md e 01-FUNDACAO/DECISOES-OBRIGATORIAS.md."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Financeiro Disk — 104 Opções Catalogadas em 16 Grupos + Ponte RH→Financeiro"
        moduleCode="FIN / FEE / TREASURY / LEDGER"
        packageBadge="Pacote Mestre Financeiro (Ativo)"
        subtitle="Catálogo integral preservado (opções #001 a #104), Centros de Custos segregados, Aprovação/Tesouraria/Liquidação de Lotes do RH (SoD) e Razão Auxiliar Imutável de Partidas Dobradas."
      />

      {!sessionToken && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: '13px',
          }}
        >
          <strong>Autenticação de API necessária para persistência:</strong> Você está em visualização de sessão.{' '}
          <Link href="/login" style={{ color: '#b45309', fontWeight: 700 }}>
            Clique aqui para autenticar com financeiro.local@diskingressos.com.br
          </Link>{' '}
          e operar Centros de Custos, Lotes RH e Ledger no PostgreSQL.
        </div>
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
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Seção 1: Ponte Transacional RH → Financeiro (SoD + Tesouraria + Liquidação) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          1. Ponte RH → Financeiro: Fila de Aprovação, Tesouraria e Liquidação (Contrato rh.pagamento_aprovado.v1)
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569' }}>
          Regra P0 de Segregação de Funções (SoD): o RH calcula e solicita o lote sem expor salários individuais nem
          dados médicos; um operador distinto do Financeiro aprova, prepara a instrução de tesouraria e confirma a
          liquidação somente após comprovante externo.
        </p>

        {rhBatches.length === 0 ? (
          <HonestEmptyState
            title="Nenhum Lote de Pagamento RH na Fila Financeira"
            description="Quando o módulo Recursos Humanos (RH Disk) submeter lotes de Folha Corporativa ou Equipes de Evento, eles aparecerão aqui com status AGUARDANDO_FINANCEIRO."
            governanceNote="Zero dados fictícios em execução: todos os lotes vêm da tabela rh_payment_batches."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Código / Origem</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Competência</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Centro de Custo</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Colaboradores</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Líquido (R$)</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Status</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Ação Segregada (SoD)</th>
                </tr>
              </thead>
              <tbody>
                {rhBatches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>
                      {b.batchCode}
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{b.originType}</div>
                    </td>
                    <td style={{ padding: '10px' }}>{b.competencia}</td>
                    <td style={{ padding: '10px' }}>{b.costCenterCode ?? b.costCenterId.slice(0, 8)}</td>
                    <td style={{ padding: '10px' }}>{b.headcount}</td>
                    <td style={{ padding: '10px', fontWeight: 700 }}>
                      R$ {(b.netAmountCents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor:
                            b.status === 'LIQUIDADO'
                              ? '#dcfce7'
                              : b.status === 'AGUARDANDO_FINANCEIRO'
                                ? '#fef3c7'
                                : '#dbeafe',
                          color:
                            b.status === 'LIQUIDADO'
                              ? '#166534'
                              : b.status === 'AGUARDANDO_FINANCEIRO'
                                ? '#92400e'
                                : '#1e40af',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
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
                          1. Aprovar no Financeiro (SoD)
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
                          2. Gerar Instrução Tesouraria (Sandbox)
                        </button>
                      )}
                      {b.status === 'PENDENTE_INTEGRACAO_BANCARIA' && canReconcileBatch && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Ref. Retorno Bancário (ex.: RET-001)"
                            value={externalRefsByBatch[b.id] ?? ''}
                            onChange={(e) =>
                              setExternalRefsByBatch((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            style={{
                              padding: '5px 8px',
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
      </section>

      {/* Seção 2: Centros de Custos Segregados & Razão Auxiliar Imutável (Ledger) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            2. Centros de Custos (#065 — CORPORATIVO_RH vs EVENTO_STAFF)
          </h2>
          {canWriteFinance && (
            <form
              onSubmit={(e) => void handleCreateCostCenter(e)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}
            >
              <input
                type="text"
                placeholder="Código (ex.: CC-RH-CORP)"
                value={ccCode}
                onChange={(e) => setCcCode(e.target.value)}
                required
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <input
                type="text"
                placeholder="Nome do Centro de Custo"
                value={ccName}
                onChange={(e) => setCcName(e.target.value)}
                required
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <select
                value={ccType}
                onChange={(e) =>
                  setCcType(e.target.value as 'CORPORATIVO_RH' | 'EVENTO_STAFF' | 'OPERACIONAL_GERAL')
                }
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="CORPORATIVO_RH">CORPORATIVO_RH (Folha Administrativa)</option>
                <option value="EVENTO_STAFF">EVENTO_STAFF (Custo Direto de Evento)</option>
                <option value="OPERACIONAL_GERAL">OPERACIONAL_GERAL</option>
              </select>
              {ccType === 'EVENTO_STAFF' ? (
                <select
                  value={ccEventId}
                  onChange={(e) => setCcEventId(e.target.value)}
                  required
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                >
                  <option value="">Selecione o Evento Vinculado...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.code} — {ev.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
                  Sem vínculo de evento (Corporativo)
                </div>
              )}
              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cadastrar Centro de Custo
              </button>
            </form>
          )}
          <div style={{ fontSize: '12px', color: '#334155' }}>
            <strong>Centros cadastrados ({costCenters.length}):</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '18px' }}>
              {costCenters.map((cc) => (
                <li key={cc.id}>
                  <strong>{cc.code}</strong> — {cc.name} ({cc.centerType})
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            3. Razão Auxiliar Imutável — Ledger (#075 a #079)
          </h2>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569' }}>
            Protegido pelo trigger PostgreSQL <code>trg_forbid_finance_ledger_mutation</code> (bloqueia UPDATE e
            DELETE).
          </p>
          {ledgerEntries.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Nenhum lançamento contábil registrado ainda. Liquide um lote RH ou venda para gerar partidas dobradas.
            </div>
          ) : (
            <div style={{ maxHeight: '220px', overflowY: 'auto', fontSize: '12px' }}>
              {ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    D: {entry.debitAccount} | C: {entry.creditAccount} — R${' '}
                    {(entry.amountCents / 100).toFixed(2)}
                  </div>
                  <div style={{ color: '#475569', marginTop: '2px' }}>{entry.descriptionPtBr}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Seção 3: Catálogo Navegável das 104 Funções do Financeiro Disk (16 Grupos) */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              4. Matriz Oficial das 104 Opções do Financeiro Disk (16 Grupos Principais)
            </h2>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Exibindo {filteredCatalogItems.length} de {catalog?.items.length ?? 104} funções catalogadas · 0 funções
              perdidas na consolidação.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                padding: '7px 10px',
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
              placeholder="Buscar entre as 104 opções..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 10px',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {filteredCatalogItems.map((item) => (
            <Link
              key={item.numero}
              href={item.rota}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8' }}>
                  #{String(item.numero).padStart(3, '0')} · {item.grupoTitulo}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    backgroundColor:
                      item.statusMigracao === 'TESTADO_HOMOLOGACAO' ? '#dcfce7' : '#f1f5f9',
                    color: item.statusMigracao === 'TESTADO_HOMOLOGACAO' ? '#166534' : '#475569',
                  }}
                >
                  {item.statusMigracao}
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{item.itemTitulo}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Rota: <code>{item.rota}</code>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
