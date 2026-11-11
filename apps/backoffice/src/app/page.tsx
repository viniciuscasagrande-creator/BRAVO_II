'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ActionPanel,
  ErrorState,
  KpiCard,
  OperationalEmptyState,
  WorkspaceHeader,
} from '@bravo-ii/ui';
import { useBravoSession } from '../context/session-context';
import '../modules/financeiro-disk-video/financeiro-video.css';
import FinanceiroVideoExtras from '../modules/financeiro-disk-video/FinanceiroVideoExtras';
import { BravoApiClient } from '@bravo-ii/sdk';
import {
  CANONICAL_ROLES,
  type CostCenterDto,
  type EventSummaryViewDto,
  type FinanceLedgerEntryDto,
  type OperationalOverviewDto,
  type RhPaymentBatchDto,
} from '@bravo-ii/contracts';

type DashboardConnectionState = 'LOADING' | 'UNAUTHENTICATED_READY' | 'AUTHENTICATED_LIVE' | 'API_ERROR';

function formatBrlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function HomeCentralOperacionalPage() {
  const { actor, sessionToken, isAuthenticated, isLoadingSession, navigationItems, hasPermission } =
    useBravoSession();
  const [connState, setConnState] = useState<DashboardConnectionState>('LOADING');
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    database: string;
    migrationsApplied: number;
  } | null>(null);
  const [liveOverview, setLiveOverview] = useState<OperationalOverviewDto | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventSummaryViewDto[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<FinanceLedgerEntryDto[]>([]);
  const [rhBatches, setRhBatches] = useState<RhPaymentBatchDto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoleCode = actor.roles[0] ?? 'FINANCEIRO_DISK';
  const roleInfo = CANONICAL_ROLES[activeRoleCode];

  const loadExecutiveDashboard = useCallback(async () => {
    if (isLoadingSession) return;
    setConnState('LOADING');
    setErrorMessage(null);

    const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });

    try {
      const health = await client.healthCheck();
      setHealthInfo(health);

      if (isAuthenticated) {
        const overview = await client.getOverview();
        setLiveOverview(overview);

        if (hasPermission('event:read')) {
          const evtsRes = await client.listAuthorizedEvents().catch(() => ({ items: [] }));
          setRecentEvents((evtsRes.items ?? []).slice(0, 6));
        }
        if (hasPermission('finance:read')) {
          const [ccRes, leRes, batchesRes] = await Promise.all([
            client.listCostCenters().catch(() => ({ items: [] })),
            client.listFinanceLedger().catch(() => ({ items: [] })),
            client.listFinanceRhPaymentBatches().catch(() => ({ items: [] })),
          ]);
          setCostCenters(ccRes.items ?? []);
          setLedgerEntries(leRes.items ?? []);
          setRhBatches(batchesRes.items ?? []);
        }

        setConnState('AUTHENTICATED_LIVE');
      } else {
        setLiveOverview(null);
        setConnState('UNAUTHENTICATED_READY');
      }
    } catch (err) {
      setLiveOverview(null);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível comunicar com o núcleo transacional do BRAVO_II.'
      );
      setConnState('API_ERROR');
    }
  }, [isLoadingSession, isAuthenticated, sessionToken, hasPermission]);

  useEffect(() => {
    void loadExecutiveDashboard();
  }, [loadExecutiveDashboard]);

  const ledgerVolumeCents = ledgerEntries.reduce((acc, item) => acc + item.amountCents, 0);
  const diskFeeRevenueCents = ledgerEntries
    .filter(
      (item) =>
        item.creditAccount.includes('RECEITA') ||
        item.creditAccount.includes('TAXA_DISK') ||
        item.descriptionPtBr.toLowerCase().includes('taxa disk')
    )
    .reduce((acc, item) => acc + item.amountCents, 0);
  const producerLiabilityCents = ledgerEntries
    .filter(
      (item) =>
        item.creditAccount.includes('PRODUTOR') ||
        item.creditAccount.includes('OBRIGACAO') ||
        Boolean(item.producerId)
    )
    .reduce((acc, item) => acc + item.amountCents, 0);
  const grossCustodyCents = ledgerEntries
    .filter(
      (item) =>
        item.debitAccount.includes('CUSTODIA') ||
        item.debitAccount.includes('CAIXA') ||
        item.debitAccount.includes('GATEWAY') ||
        Boolean(item.eventId)
    )
    .reduce((acc, item) => acc + item.amountCents, 0);

  const chartMaxCents = Math.max(
    ledgerVolumeCents,
    grossCustodyCents,
    producerLiabilityCents,
    diskFeeRevenueCents,
    100
  );

  const mobileModuleCards = [
    {
      code: '01 · DASHBOARD',
      title: 'Dashboard Executivo',
      desc: 'Indicadores financeiros, gráficos em tempo real e central de notificações.',
      href: '/',
      accent: '#1d4ed8',
    },
    {
      code: '02 · MENU MOBILE & DRAWER',
      title: 'Navegação Adaptativa',
      desc: 'Menu lateral recolhível no desktop, drawer deslizante e barra inferior mobile.',
      href: '/governanca',
      accent: '#0f172a',
    },
    {
      code: '03 · FINANCEIRO',
      title: 'Contas a Pagar, Receber & Bancos',
      desc: 'Tesouraria, caixa, contas bancárias, centros de custo e liquidações.',
      href: '/financeiro/operacoes',
      accent: '#047857',
    },
    {
      code: '04 · CONTABILIDADE',
      title: 'Lançamentos, Razão & Conciliação',
      desc: 'Partidas dobradas, balancete por evento e conciliação de extrato gateway.',
      href: '/financeiro',
      accent: '#0369a1',
    },
    {
      code: '05 · RECURSOS HUMANOS (RH)',
      title: 'Funcionários, Folha & Ponto',
      desc: 'Quadro de pessoal, ponto eletrônico REP-P e lotes enviados ao Financeiro.',
      href: '/rh',
      accent: '#6d28d9',
    },
    {
      code: '06 · PRODUTORES',
      title: 'Saldos, Eventos, Repasses & Antecipações',
      desc: 'Contratos PJ, Taxa Disk por evento, solicitações e Portal do Produtor.',
      href: '/comercial',
      accent: '#b45309',
    },
    {
      code: '07 · RELATÓRIOS',
      title: 'Tabelas Adaptáveis & Exportações',
      desc: 'Relatórios gerenciais convertidos em cards no celular e exportação CSV.',
      href: '/relatorios',
      accent: '#0f766e',
    },
    {
      code: '08 · CADASTROS',
      title: 'Formulários Mobile Touch',
      desc: 'Cadastros de eventos, lotes, produtores e colaboradores adaptados ao toque.',
      href: '/eventos/novo',
      accent: '#be123c',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Núcleo Corporativo DiskIngressos · BankOS"
        title="Central Executiva e Operacional BRAVO_II"
        subtitle="Comando integrado de contratos comerciais, Event Builder, inventário omnicanal (Site e PDV), portaria QR, controladoria financeira, RH Disk Ponto e alçadas de pós-venda."
        statusBadge={
          connState === 'AUTHENTICATED_LIVE'
            ? `Sessão Ativa · ${roleInfo?.namePtBr ?? activeRoleCode}`
            : connState === 'UNAUTHENTICATED_READY'
              ? 'Núcleo Conectado · Aguardando Login'
              : connState === 'LOADING'
                ? 'Sincronizando...'
                : 'Verificação de Serviço'
        }
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void loadExecutiveDashboard()}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sincronizar Agora
            </button>
            {!isAuthenticated ? (
              <Link
                href="/login"
                style={{
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
            ) : (
              <Link
                href="/eventos/novo"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                + Novo Evento
              </Link>
            )}
          </div>
        }
      />

      {/* Faixa de Telemetria do Núcleo Transacional */}
      {healthInfo && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              Status do Core BFF / API
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
              {healthInfo.status === 'ok' ? 'Operacional (HTTP 200)' : healthInfo.status}
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              Banco Transacional
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', marginTop: '4px' }}>
              {healthInfo.database || 'Conectado'} · {healthInfo.migrationsApplied ?? 10} migrations ativas
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Trava de Segurança Financeira
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
              Homologação Segura (Fail-Closed)
            </div>
          </div>
        </div>
      )}

      {/* Estado 1: Carregando */}
      {connState === 'LOADING' && (
        <ActionPanel
          title="Sincronizando indicadores operacionais..."
          subtitle="Consultando serviço de sessão e núcleo transacional PostgreSQL."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                style={{
                  height: '96px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                }}
              />
            ))}
          </div>
        </ActionPanel>
      )}

      {/* Estado 2: Erro real de comunicação com a API (sem exibir zeros falsos) */}
      {connState === 'API_ERROR' && (
        <ErrorState
          title="Serviço Transacional Indisponível no Momento"
          description={
            errorMessage ??
            'Não foi possível obter os indicadores da API BRAVO_II. Nenhum indicador numérico é exibido enquanto a comunicação não for restabelecida.'
          }
          onRetry={() => void loadExecutiveDashboard()}
        />
      )}

      {/* Estado 3: API Online, aguardando autenticação para dados confidenciais */}
      {connState === 'UNAUTHENTICATED_READY' && (
        <ActionPanel
          title="Sessão Corporativa Necessária para Indicadores Confidenciais"
          subtitle="O núcleo transacional está online. Inicie sua sessão corporativa para carregar saldos do Livro Razão, eventos do seu escopo, fila de chamados SAC e alçadas de estorno."
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
                fontWeight: 700,
              }}
            >
              Iniciar Sessão Corporativa →
            </Link>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            <Link
              href="/comercial"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                Comercial e Contratos
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Produtores PJ e Taxa Disk por Evento
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Cadastro de produtores, validação documental e pactuação de Taxa Disk individual por evento.
              </p>
            </Link>

            <Link
              href="/eventos"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
                Operação de Eventos
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Event Builder, Sessões, Setores e Lotes
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Configuração em etapas de sessões, lotes de preço, canais habilitados e dupla aprovação.
              </p>
            </Link>

            <Link
              href="/financeiro"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                Financeiro Disk e Tesouraria
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Saldos, Recebíveis, Repasses e Livro Razão
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Contabilidade em partidas dobradas, centros de custo, lotes de folha (SoD) e alçadas de estorno.
              </p>
            </Link>

            <Link
              href="/pedidos-vendas"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                Vendas, PDV e Portaria
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Pedidos, Caixa PDV e Ingressos 8 Dígitos
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Inventário transacional compartilhado entre site e PDV, emissão QR e check-in de portaria.
              </p>
            </Link>

            <Link
              href="/rh"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                RH, DP e Disk Ponto
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Colaboradores, Jornada e Lotes de Folha
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Admissão digital, registro de ponto com cerca virtual (Portaria 671) e envio de lotes à Tesouraria.
              </p>
            </Link>

            <Link
              href="/sac"
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#be123c', textTransform: 'uppercase' }}>
                SAC, Pós-Venda e Estornos
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Chamados, SLA, Trocas e Dupla Alçada
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Atendimento estruturado, trocas de titularidade/sessão e solicitação segregada de estornos.
              </p>
            </Link>
          </div>
        </ActionPanel>
      )}

      {/* Estado 4: Autenticado com dados reais da API */}
      {connState === 'AUTHENTICATED_LIVE' && liveOverview && (
        <>
          {hasPermission('finance:read') && <FinanceiroVideoExtras />}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
            }}
          >
            <KpiCard
              label="Eventos no Escopo"
              value={liveOverview.counters.visibleEventsCount}
              helperText="Eventos vinculados à sua credencial"
              tone="accent"
            />
            <KpiCard
              label="Eventos Publicados"
              value={liveOverview.counters.publishedEventsCount}
              helperText="Comercial e operação aprovados"
              tone="positive"
            />
            <KpiCard
              label="Aprovações Comerciais"
              value={liveOverview.counters.pendingCommercialApprovalsCount}
              helperText="Eventos aguardando liberação"
              tone={liveOverview.counters.pendingCommercialApprovalsCount > 0 ? 'warning' : 'neutral'}
            />
            <KpiCard
              label="Estornos Pendentes"
              value={liveOverview.counters.pendingRefundApprovalsCount}
              helperText="Aguardando alçada do Financeiro Disk"
              tone={liveOverview.counters.pendingRefundApprovalsCount > 0 ? 'warning' : 'neutral'}
            />
            <KpiCard
              label="Chamados SAC Abertos"
              value={liveOverview.counters.openServiceCasesCount}
              helperText="Fila ativa de atendimento ao cliente"
              tone="neutral"
            />
            {hasPermission('finance:read') && (
              <KpiCard
                label="Movimentação no Razão"
                value={formatBrlCents(ledgerVolumeCents)}
                helperText={`${ledgerEntries.length} partida(s) · ${costCenters.length} centro(s)`}
                tone="positive"
              />
            )}
            {actor.permissions.includes('audit:read') && (
              <KpiCard
                label="Eventos de Auditoria"
                value={liveOverview.counters.auditRecordsCount}
                helperText="Registros imutáveis na trilha oficial"
                tone="neutral"
              />
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            <ActionPanel
              title="Fila de Pendências Prioritárias"
              subtitle="Atalhos diretos para decisões operacionais e aprovações do seu turno."
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
                      Liberação e Publicação de Eventos
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {liveOverview.counters.pendingCommercialApprovalsCount} aprovação(ões) pendente(s)
                    </div>
                  </div>
                  <Link
                    href="/eventos"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      textDecoration: 'none',
                    }}
                  >
                    Abrir Eventos →
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
                      Alçada de Estornos e Contestação
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {liveOverview.counters.pendingRefundApprovalsCount} solicitação(ões) aguardando decisão
                    </div>
                  </div>
                  <Link
                    href="/estornos"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      textDecoration: 'none',
                    }}
                  >
                    Revisar Fila →
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
                      Atendimento SAC e Pós-Venda
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {liveOverview.counters.openServiceCasesCount} chamado(s) em acompanhamento
                    </div>
                  </div>
                  <Link
                    href="/sac/chamados"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      textDecoration: 'none',
                    }}
                  >
                    Acessar SAC →
                  </Link>
                </div>

                {hasPermission('finance:read') && (
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
                        Tesouraria e Lotes de Folha (RH ↔ Financeiro)
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {rhBatches.length} lote(s) recebido(s) · {ledgerEntries.length} lançamento(s) no razão
                      </div>
                    </div>
                    <Link
                      href="/financeiro?aba=tesouraria"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        textDecoration: 'none',
                      }}
                    >
                      Abrir Tesouraria →
                    </Link>
                  </div>
                )}
              </div>
            </ActionPanel>

            <ActionPanel
              title="Eventos Recentes no Escopo"
              subtitle="Eventos cadastrados e status de aprovação comercial/operacional."
              rightSlot={
                <Link
                  href="/eventos"
                  style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}
                >
                  Ver Todos →
                </Link>
              }
            >
              {recentEvents.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748b', padding: '12px 0' }}>
                  Nenhum evento registrado no escopo atual. Utilize a Central Comercial e o Event Builder para iniciar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {evt.code} — {evt.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {evt.venueName} · {evt.city}/{evt.stateUf}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: evt.status === 'PUBLICADO' ? '#dcfce7' : '#fef3c7',
                          color: evt.status === 'PUBLICADO' ? '#166534' : '#92400e',
                        }}
                      >
                        {evt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ActionPanel>
          </div>
        </>
      )}

      {/* Gráficos Visuais, KPIs e Central de Notificações Mobile-First */}
      <div className="bravo-mobile-dashboard-grid">
        <ActionPanel
          title="Gráfico de Composição Financeira (Livro Razão)"
          subtitle="Proporção contábil segregada entre Custódia Bruta, Obrigação do Produtor e Receita Taxa Disk."
          rightSlot={
            <Link
              href="/financeiro/operacoes"
              style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}
            >
              Abrir Financeiro →
            </Link>
          }
        >
          <div className="bravo-chart-stack">
            {[
              {
                label: 'Movimentação Total no Razão',
                cents: ledgerVolumeCents,
                pct: ledgerVolumeCents > 0 ? 100 : 12,
                color: '#1d4ed8',
                caption: `${ledgerEntries.length} lançamento(s) auditado(s)`,
              },
              {
                label: 'Custódia Bruta Gateway / Vendas',
                cents: grossCustodyCents,
                pct:
                  ledgerVolumeCents > 0
                    ? Math.max(8, Math.round((grossCustodyCents / chartMaxCents) * 100))
                    : 24,
                color: '#0284c7',
                caption: 'Ingressos liquidados no cofre transacional',
              },
              {
                label: 'Obrigação Líquida de Produtores',
                cents: producerLiabilityCents,
                pct:
                  ledgerVolumeCents > 0
                    ? Math.max(8, Math.round((producerLiabilityCents / chartMaxCents) * 100))
                    : 18,
                color: '#059669',
                caption: 'Passivo segregado por evento e produtor',
              },
              {
                label: 'Receita Reconhecida Taxa Disk',
                cents: diskFeeRevenueCents,
                pct:
                  ledgerVolumeCents > 0
                    ? Math.max(8, Math.round((diskFeeRevenueCents / chartMaxCents) * 100))
                    : 14,
                color: '#7c3aed',
                caption: 'Receita operacional exclusiva DiskIngressos',
              },
            ].map((bar) => (
              <div key={bar.label} className="bravo-chart-row">
                <div className="bravo-chart-row-head">
                  <span className="bravo-chart-row-title">{bar.label}</span>
                  <strong className="bravo-chart-row-val">
                    {isAuthenticated ? formatBrlCents(bar.cents) : 'Autenticar para ver saldo'}
                  </strong>
                </div>
                <div className="bravo-chart-track" role="progressbar" aria-valuenow={bar.pct} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="bravo-chart-fill"
                    style={{ width: `${Math.min(100, bar.pct)}%`, backgroundColor: bar.color }}
                  />
                </div>
                <div className="bravo-chart-caption">{bar.caption}</div>
              </div>
            ))}
          </div>
        </ActionPanel>

        <ActionPanel
          title="Notificações & Alertas Operacionais"
          subtitle="Avisos prioritários de Contas a Pagar/Receber, Conciliação, RH, Produtores e SAC."
          rightSlot={
            <Link
              href="/relatorios"
              style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}
            >
              Exportar Relatórios →
            </Link>
          }
        >
          <div className="bravo-mobile-notif-feed">
            <Link href="/financeiro/operacoes" className="bravo-mobile-notif-card">
              <span className="bravo-notif-pill is-warn">Contabilidade & Gateway</span>
              <strong>Conciliação de Extrato e Partidas Dobradas</strong>
              <p>
                Compare vendas lançadas no razão com o extrato do gateway e lance ajustes automáticos de taxa.
              </p>
            </Link>
            <Link href="/comercial" className="bravo-mobile-notif-card">
              <span className="bravo-notif-pill is-info">Produtores & Repasses</span>
              <strong>Saldos por Evento, Repasses e Antecipações</strong>
              <p>
                Gerencie contratos PJ, Taxa Disk por evento e acompanhe o Portal do Produtor dedicado.
              </p>
            </Link>
            <Link href="/rh" className="bravo-mobile-notif-card">
              <span className="bravo-notif-pill is-ok">RH, Folha & Ponto</span>
              <strong>Colaboradores, Ponto REP-P e Lotes de Folha</strong>
              <p>
                {rhBatches.length > 0
                  ? `${rhBatches.length} lote(s) de folha sincronizado(s) com o Financeiro Disk.`
                  : 'Registre admissões, batidas de ponto e envie lotes de pagamento para aprovação.'}
              </p>
            </Link>
          </div>
        </ActionPanel>
      </div>

      {/* 8 Módulos Adaptados — Padrão Mobile First */}
      <ActionPanel
        title="Arquitetura Mobile First — 8 Módulos Adaptados"
        subtitle="Interface responsiva única para celulares (Android e iPhone), tablets e computadores, com toque otimizado e conversão automática de tabelas em cards."
      >
        <div className="bravo-mobile-modules-grid">
          {mobileModuleCards.map((mod) => (
            <Link key={mod.code} href={mod.href} className="bravo-mobile-module-card">
              <div className="bravo-mobile-module-code" style={{ color: mod.accent }}>
                {mod.code}
              </div>
              <div className="bravo-mobile-module-title">{mod.title}</div>
              <p className="bravo-mobile-module-desc">{mod.desc}</p>
              <span className="bravo-mobile-module-cta">Acessar módulo →</span>
            </Link>
          ))}
        </div>
      </ActionPanel>

      {/* Grade de Navegação Direta por Departamento (sempre visível) */}
      <ActionPanel
        title="Departamentos e Estações de Trabalho"
        subtitle="Acesso direto aos módulos e subáreas operacionais do ERP BRAVO_II."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {navigationItems
            .filter((item) => item.href !== '/')
            .map((item) => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  textDecoration: 'none',
                  color: '#0f172a',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{item.labelPtBr}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                    {item.descriptionPtBr}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#1d4ed8',
                    marginTop: '10px',
                  }}
                >
                  {(item.subItems ?? []).length > 0
                    ? `Acessar (${(item.subItems ?? []).length} subáreas) →`
                    : 'Abrir Módulo →'}
                </div>
              </Link>
            ))}
        </div>
      </ActionPanel>

      {connState === 'AUTHENTICATED_LIVE' &&
        liveOverview &&
        liveOverview.counters.visibleEventsCount === 0 && (
          <OperationalEmptyState
            title="Base Operacional Pronta para Novos Eventos"
            description="Sua sessão está autenticada no PostgreSQL e não há eventos cadastrados no seu escopo atual. Utilize a Central Comercial e o Event Builder para registrar produtores, taxas contratuais e eventos."
            action={
              <Link
                href="/comercial"
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
                Iniciar Cadastro Comercial →
              </Link>
            }
          />
        )}
    </div>
  );
}
