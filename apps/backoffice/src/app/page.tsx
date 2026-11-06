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
import { BravoApiClient } from '@bravo-ii/sdk';
import { CANONICAL_ROLES, type OperationalOverviewDto } from '@bravo-ii/contracts';

type DashboardConnectionState = 'LOADING' | 'UNAUTHENTICATED_READY' | 'AUTHENTICATED_LIVE' | 'API_ERROR';

export default function HomeCentralOperacionalPage() {
  const { actor, sessionToken, isAuthenticated, isLoadingSession, navigationItems } = useBravoSession();
  const [connState, setConnState] = useState<DashboardConnectionState>('LOADING');
  const [liveOverview, setLiveOverview] = useState<OperationalOverviewDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiServiceStatus, setApiServiceStatus] = useState<string>('Verificando...');

  const activeRoleCode = actor.roles[0] ?? 'FINANCEIRO_DISK';
  const roleInfo = CANONICAL_ROLES[activeRoleCode];

  const loadExecutiveDashboard = useCallback(async () => {
    if (isLoadingSession) return;
    setConnState('LOADING');
    setErrorMessage(null);

    const client = new BravoApiClient({ sessionToken: sessionToken ?? undefined });

    try {
      const health = await client.healthCheck();
      setApiServiceStatus(health.status === 'ok' ? 'Operacional · BFF Conectado' : health.status);

      if (isAuthenticated) {
        const overview = await client.getOverview();
        setLiveOverview(overview);
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
  }, [isLoadingSession, isAuthenticated, sessionToken]);

  useEffect(() => {
    void loadExecutiveDashboard();
  }, [loadExecutiveDashboard]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WorkspaceHeader
        eyebrow="Núcleo Corporativo DiskIngressos"
        title="Visão Geral Executiva"
        subtitle="Acompanhamento em tempo real de eventos, aprovações comerciais, tesouraria, pós-venda e governança operacional de acordo com a credencial autenticada."
        statusBadge={
          connState === 'AUTHENTICATED_LIVE'
            ? `Sessão Ativa · ${roleInfo?.namePtBr ?? activeRoleCode}`
            : connState === 'UNAUTHENTICATED_READY'
              ? 'API Conectada · Aguardando Login'
              : connState === 'LOADING'
                ? 'Sincronizando...'
                : 'Falha de Comunicação'
        }
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
              Atualizar Painel
            </button>
            {!isAuthenticated && (
              <Link
                href="/login"
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Autenticar Operador →
              </Link>
            )}
          </div>
        }
      />

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

      {/* Estado 3: API Online, mas usuário ainda não autenticado (sem exibir cards com 0 enganosos) */}
      {connState === 'UNAUTHENTICATED_READY' && (
        <ActionPanel
          title="Autenticação Corporativa Necessária para Indicadores do Departamento"
          subtitle={`Status do Núcleo: ${apiServiceStatus}. Para visualizar saldos, eventos do escopo, aprovações pendentes e fila de atendimento, inicie sua sessão corporativa.`}
          rightSlot={
            <Link
              href="/login"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Entrar com Credencial Corporativa
            </Link>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '14px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                Comercial e Eventos
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Contratos, Taxa por Evento e Lotes
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Cadastro de produtores PJ, configuração de sessões, setores, canais de venda e alçadas de publicação.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                Financeiro Disk e Tesouraria
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Recebíveis, Repasses, Ledger e Folha
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Controle contábil em partidas dobradas, centros de custo, liquidação de lotes do RH (SoD) e dupla aprovação de estornos.
              </p>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                Vendas, PDV e Pós-Venda
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                Bilheteria, Ingressos QR e SAC
              </div>
              <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Inventário transacional compartilhado entre site e PDV, ingressos de 8 dígitos e atendimento estruturado.
              </p>
            </div>
          </div>
        </ActionPanel>
      )}

      {/* Estado 4: Autenticado com dados reais da API */}
      {connState === 'AUTHENTICATED_LIVE' && liveOverview && (
        <>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
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
              </div>
            </ActionPanel>

            <ActionPanel
              title="Acesso Rápido por Departamento"
              subtitle="Módulos habilitados para sua credencial com navegação direta."
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '10px',
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
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        textDecoration: 'none',
                        color: '#0f172a',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{item.labelPtBr}</span>
                      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        {(item.subItems ?? []).length > 0
                          ? `${(item.subItems ?? []).length} subáreas operacionais`
                          : item.moduleCode}
                      </span>
                    </Link>
                  ))}
              </div>
            </ActionPanel>
          </div>

          {liveOverview.counters.visibleEventsCount === 0 && (
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
        </>
      )}
    </div>
  );
}
