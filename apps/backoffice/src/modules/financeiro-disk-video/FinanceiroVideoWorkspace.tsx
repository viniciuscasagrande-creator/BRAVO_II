'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useBravoSession } from '../../context/session-context';
import {
  FINANCEIRO_BASE,
  FINANCEIRO_GRUPOS,
  FINANCEIRO_TELAS,
  findFinanceView,
} from './catalogo';
import './financeiro-video.css';
import FinanceiroVideoExtras from './FinanceiroVideoExtras';

type Item = Record<string, unknown>;
type LoadState = 'parado' | 'carregando' | 'ok' | 'nao-conectado' | 'falha';

const CONNECTED_SCREEN_IDS = new Set<string>([
  'produtores/produtores',
  'produtores/eventos',
  'gateways/captura',
  'taxas/taxa-disk-evento',
  'taxas/regras',
  'tesouraria/pagamentos-lote',
  'estornos/central',
  'estornos/fila-aprovacao',
  'estornos/historico',
  'controladoria/centros-custo',
  'ledger/lancamentos',
  'ledger/trilha',
  'relatorios/extrato',
  'assinaturas/documentos',
  'assinaturas/logs',
  'governanca/usuarios',
  'governanca/perfis',
  'governanca/auditoria',
]);

const label = (v: unknown): string => (v === null || v === undefined ? '—' : String(v));

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function downloadCsv(rows: Item[], cols: string[], name: string) {
  const escape = (v: unknown) => `"${label(v).replaceAll('"', '""')}"`;
  const body = [
    cols.map(escape).join(';'),
    ...rows.map((row) => cols.map((c) => escape(row[c])).join(';')),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bravo-financeiro-${name.replaceAll('/', '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceiroVideoWorkspace({ screenId }: { screenId?: string }) {
  const { isAuthenticated, isLoadingSession, hasPermission } = useBravoSession();
  const canAccess = hasPermission('finance:read');
  const screen = screenId ? findFinanceView(screenId) : undefined;

  const [dashboardQuery, setDashboardQuery] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState<'todos' | 'conectadas' | 'interface'>('todos');
  const [search, setSearch] = useState('');
  const [producer, setProducer] = useState('');
  const [event, setEvent] = useState('');
  const [period, setPeriod] = useState('mes');
  const [state, setState] = useState<LoadState>('parado');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Item[]>([]);
  const [reload, setReload] = useState(0);

  const orderedGroups = useMemo(
    () =>
      FINANCEIRO_GRUPOS.map((group, idx) => {
        const orderNum = idx + 1;
        const connectedCount = group.items.filter((i) => CONNECTED_SCREEN_IDS.has(i.id)).length;
        return {
          ...group,
          orderNum,
          orderBadge: pad2(orderNum),
          connectedCount,
        };
      }),
    []
  );

  const activeGroup = useMemo(
    () => (screen ? orderedGroups.find((g) => g.id === screen.groupId) : undefined),
    [screen, orderedGroups]
  );

  const filteredDashboardGroups = useMemo(() => {
    const q = dashboardQuery.trim().toLocaleLowerCase('pt-BR');
    return orderedGroups
      .map((g) => {
        const matchingItems = g.items.filter((item) => {
          const isConnected = CONNECTED_SCREEN_IDS.has(item.id);
          if (dashboardFilter === 'conectadas' && !isConnected) return false;
          if (dashboardFilter === 'interface' && isConnected) return false;
          if (!q) return true;
          return (
            item.title.toLocaleLowerCase('pt-BR').includes(q) ||
            g.label.toLocaleLowerCase('pt-BR').includes(q) ||
            item.id.toLocaleLowerCase('pt-BR').includes(q)
          );
        });
        return { ...g, filteredItems: matchingItems };
      })
      .filter((g) => g.filteredItems.length > 0);
  }, [orderedGroups, dashboardQuery, dashboardFilter]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !search.trim() ||
          Object.values(row).some((v) =>
            label(v).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
          )
      ),
    [rows, search]
  );

  const load = useCallback(async () => {
    if (!screen || !canAccess || !isAuthenticated) return;
    setRows([]);
    setState('carregando');
    setError('');
    // Contrato explícito: o backend precisa implementar o endpoint. Jamais inventar saldos ou registros.
    const params = new URLSearchParams({ modulo: screen.id, periodo: period });
    if (producer) params.set('produtorId', producer);
    if (event) params.set('eventoId', event);
    try {
      const response = await fetch(`/v1/financeiro/operacoes?${params.toString()}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (response.status === 404 || response.status === 501) {
        setState('nao-conectado');
        return;
      }
      if (!response.ok) throw new Error(`A consulta retornou HTTP ${response.status}`);
      const data = (await response.json()) as { items?: Item[] };
      if (!Array.isArray(data.items)) throw new Error('A API não retornou uma lista válida.');
      setRows(data.items);
      setState('ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha de comunicação');
      setState('falha');
    }
  }, [screen?.id, canAccess, isAuthenticated, producer, event, period, reload]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoadingSession) return <div className="bf-note">Verificando sessão financeira...</div>;
  if (!isAuthenticated)
    return (
      <div className="bf-note">
        Entre com sua credencial do BRAVO_II para visualizar o Financeiro Disk.{' '}
        <Link href="/login">Acessar login</Link>.
      </div>
    );
  if (!canAccess)
    return (
      <div className="bf-error">
        Sua credencial não possui a permissão Financeiro Disk (`finance:read`). O acesso deve ser
        concedido pelo administrador.
      </div>
    );

  return (
    <div className="bf-shell">
      {/* Barra superior de módulos ordenados (01 a 15) */}
      <div className="bf-modulebar" role="navigation" aria-label="Módulos Financeiros Ordenados">
        <Link
          href={FINANCEIRO_BASE}
          className={`bf-modulepill ${!screen ? 'is-active' : ''}`}
        >
          <span className="bf-modulepill-num">00</span>
          <span>Painel de Cards (15 Módulos)</span>
        </Link>
        {orderedGroups.map((g) => {
          const isCurrentGroup = activeGroup?.id === g.id;
          return (
            <Link
              key={g.id}
              href={`${FINANCEIRO_BASE}/${g.items[0].id}`}
              className={`bf-modulepill ${isCurrentGroup ? 'is-active' : ''}`}
              title={`${g.orderBadge} · ${g.label} (${g.items.length} rotinas)`}
            >
              <span className="bf-modulepill-num">{g.orderBadge}</span>
              <span>{g.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Cabeçalho Executivo */}
      <div className="bf-head">
        <div>
          <div className="bf-eyebrow">
            BRAVO_II · Financeiro Disk ·{' '}
            {activeGroup
              ? `Módulo ${activeGroup.orderBadge} de 15 · ${activeGroup.label}`
              : 'Dashboard Central Ordenado (15 Módulos · 96 Rotinas)'}
          </div>
          <h1>
            {screen
              ? `${activeGroup?.orderBadge}.${(activeGroup?.items.findIndex((i) => i.id === screen.id) ?? 0) + 1} · ${screen.title}`
              : 'Dashboard Financeiro — Módulos e Menus Individuais Ordenados'}
          </h1>
          <p>
            {screen
              ? `Grupo: ${screen.group} · Rota: /financeiro/operacoes/${screen.id}`
              : 'Selecione diretamente qualquer um dos 15 módulos ou uma das 96 rotinas individuais ordenadas nos cards abaixo.'}
          </p>
        </div>
        <div className="bf-head-actions">
          {screen && (
            <Link href={FINANCEIRO_BASE} className="bf-btn">
              ← Painel de Cards (15 Módulos)
            </Link>
          )}
          <Link href="/financeiro" className="bf-btn">
            Tesouraria RH & Matriz (104)
          </Link>
          <span className="bf-tag">Homologação · Sem movimentação bancária</span>
        </div>
      </div>

      {!screen ? (
        <>
          {/* KPIs do Dashboard de Cards */}
          <div className="bf-kpis">
            <div className="bf-kpi">
              <small>Módulos Financeiros</small>
              <strong>15 Grupos Ordenados</strong>
              <span>Numerados de 01 a 15 no menu e no painel</span>
            </div>
            <div className="bf-kpi">
              <small>Menus e Telas Individuais</small>
              <strong>{FINANCEIRO_TELAS.length} Rotinas</strong>
              <span>Acesso direto em cada card sem agrupamento genérico</span>
            </div>
            <div className="bf-kpi">
              <small>Conectadas ao PostgreSQL</small>
              <strong>{CONNECTED_SCREEN_IDS.size} Consultas Reais</strong>
              <span>Leitura auditada em tempo real (HTTP 200)</span>
            </div>
            <div className="bf-kpi">
              <small>Em Implantação Controlada</small>
              <strong>{FINANCEIRO_TELAS.length - CONNECTED_SCREEN_IDS.size} Interfaces</strong>
              <span>Estado explícito de API pendente (sem dados fictícios)</span>
            </div>
          </div>

          {/* Barra de filtro rápido dos Cards */}
          <div className="bf-toolbar">
            <div className="bf-field" style={{ flex: 2 }}>
              <label htmlFor="bf-dash-search">Pesquisar módulo ou menu individual (96 rotinas)</label>
              <input
                id="bf-dash-search"
                type="search"
                value={dashboardQuery}
                onChange={(e) => setDashboardQuery(e.target.value)}
                placeholder="Ex.: Produtores, Repasses, MDR, Taxa Disk, PIX, CNAB, Conciliação, Borderôs, DRE, Ledger..."
              />
            </div>
            <div className="bf-filter-pills" role="group" aria-label="Filtrar por status de integração">
              <button
                type="button"
                className={`bf-btn ${dashboardFilter === 'todos' ? 'bf-btn-primary' : ''}`}
                onClick={() => setDashboardFilter('todos')}
              >
                Todos os Menus ({FINANCEIRO_TELAS.length})
              </button>
              <button
                type="button"
                className={`bf-btn ${dashboardFilter === 'conectadas' ? 'bf-btn-primary' : ''}`}
                onClick={() => setDashboardFilter('conectadas')}
              >
                Conectadas ao PostgreSQL ({CONNECTED_SCREEN_IDS.size})
              </button>
              <button
                type="button"
                className={`bf-btn ${dashboardFilter === 'interface' ? 'bf-btn-primary' : ''}`}
                onClick={() => setDashboardFilter('interface')}
              >
                API Pendente ({FINANCEIRO_TELAS.length - CONNECTED_SCREEN_IDS.size})
              </button>
            </div>
          </div>

          {/* Grid Ordenado de Cards (01 a 15) com Menus Individuais */}
          <div className="bf-groupgrid">
            {filteredDashboardGroups.map((g) => (
              <section
                key={g.id}
                className="bf-groupcard"
                aria-label={`Módulo ${g.orderBadge} — ${g.label}`}
              >
                <div className="bf-groupcard-head">
                  <div className="bf-groupcard-titlewrap">
                    <span className="bf-groupcard-badge">MÓDULO {g.orderBadge}</span>
                    <h2>{g.label}</h2>
                  </div>
                  <span className="bf-groupcard-count">
                    {g.items.length} menus · {g.connectedCount} SQL
                  </span>
                </div>

                <ul className="bf-groupcard-list">
                  {g.filteredItems.map((item) => {
                    const itemIndex = g.items.findIndex((x) => x.id === item.id) + 1;
                    const isConnected = CONNECTED_SCREEN_IDS.has(item.id);
                    return (
                      <li key={item.id}>
                        <Link
                          href={`${FINANCEIRO_BASE}/${item.id}`}
                          className="bf-groupcard-link"
                        >
                          <span className="bf-groupcard-code">
                            {g.orderBadge}.{itemIndex}
                          </span>
                          <span className="bf-groupcard-label">{item.title}</span>
                          <span
                            className={`bf-status-pill ${isConnected ? 'is-connected' : 'is-pending'}`}
                          >
                            {isConnected ? 'PostgreSQL' : 'Interface'}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="bf-groupcard-foot">
                  <Link
                    href={`${FINANCEIRO_BASE}/${g.items[0].id}`}
                    className="bf-groupcard-cta"
                  >
                    Abrir Módulo {g.orderBadge} ({g.label}) →
                  </Link>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Submenus individuais ordenados do grupo ativo */}
          {activeGroup && (
            <div className="bf-submenubar" role="navigation" aria-label={`Submenus de ${activeGroup.label}`}>
              <div className="bf-submenubar-title">
                Menus de {activeGroup.orderBadge} · {activeGroup.label} ({activeGroup.items.length}):
              </div>
              <div className="bf-submenubar-list">
                {activeGroup.items.map((item, idx) => {
                  const isActiveScreen = item.id === screen.id;
                  const isConnected = CONNECTED_SCREEN_IDS.has(item.id);
                  return (
                    <Link
                      key={item.id}
                      href={`${FINANCEIRO_BASE}/${item.id}`}
                      className={`bf-submenupill ${isActiveScreen ? 'is-active' : ''}`}
                    >
                      <span className="bf-submenupill-code">
                        {activeGroup.orderBadge}.{idx + 1}
                      </span>
                      <span>{item.title}</span>
                      <span
                        className={`bf-submenupill-dot ${isConnected ? 'is-connected' : 'is-pending'}`}
                        title={isConnected ? 'Conectada ao PostgreSQL' : 'API pendente'}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* KPIs da Rotina Selecionada */}
          <div className="bf-kpis">
            {['Registros consultados', 'Situação do módulo', 'Período', 'Fonte dos dados'].map(
              (metric, i) => (
                <div key={metric} className="bf-kpi">
                  <small>{metric}</small>
                  <strong>
                    {i === 0
                      ? state === 'ok'
                        ? filteredRows.length
                        : '—'
                      : i === 1
                        ? state === 'ok'
                          ? 'Consulta concluída'
                          : state === 'carregando'
                            ? 'Consultando'
                            : state === 'nao-conectado'
                              ? 'API pendente'
                              : state === 'falha'
                                ? 'Falha de comunicação'
                                : 'Aguardando'
                        : i === 2
                          ? period === 'mes'
                            ? 'Mês atual'
                            : period === 'semana'
                              ? 'Semana atual'
                              : 'Todo o período'
                          : 'BRAVO_II / PostgreSQL'}
                  </strong>
                  <span>
                    {i === 0
                      ? 'Sem valores simulados'
                      : i === 1
                        ? 'Ações reais exigem integração'
                        : i === 2
                          ? 'Filtro selecionado'
                          : 'Backend autorizado'}
                  </span>
                </div>
              )
            )}
          </div>

          {/* Barra de Filtros da Rotina */}
          <div className="bf-toolbar">
            <div className="bf-field">
              <label htmlFor="bf-produtor">Produtor</label>
              <input
                id="bf-produtor"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="Filtrar por produtor..."
              />
            </div>
            <div className="bf-field">
              <label htmlFor="bf-evento">Evento</label>
              <input
                id="bf-evento"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Filtrar por evento..."
              />
            </div>
            <div className="bf-field">
              <label htmlFor="bf-periodo">Período</label>
              <select
                id="bf-periodo"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="mes">Mês atual</option>
                <option value="semana">Semana atual</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <button
              type="button"
              className="bf-btn bf-btn-primary"
              onClick={() => setReload((x) => x + 1)}
            >
              Atualizar
            </button>
            <button
              type="button"
              disabled={state !== 'ok' || filteredRows.length === 0}
              className="bf-btn"
              onClick={() => downloadCsv(filteredRows, screen.columns, screen.id)}
            >
              Exportar CSV
            </button>
          </div>

          {state === 'nao-conectado' && (
            <div role="status" className="bf-note">
              A interface desta rotina foi instalada. A rota de consulta no backend ainda precisa
              ser vinculada ao serviço real correspondente. Não serão mostrados dados fictícios.
            </div>
          )}
          {state === 'falha' && (
            <div role="alert" className="bf-error">
              {error}
            </div>
          )}

          <FinanceiroVideoExtras screen={screen} />

          <div className="bf-panel">
            <div className="bf-panelhead">
              <div>
                <strong>{screen.title}</strong>
                <br />
                <span>
                  {screen.kind === 'workflow'
                    ? 'Fila operacional e aprovações'
                    : screen.kind === 'report'
                      ? 'Consulta e exportação'
                      : screen.kind === 'settings'
                        ? 'Regras, acessos e configurações'
                        : 'Movimentações e registros autorizados'}
                </span>
              </div>
              <div className="bf-field" style={{ minWidth: 220, maxWidth: 320 }}>
                <label htmlFor="bf-busca">Busca nesta rotina</label>
                <input
                  id="bf-busca"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar registros..."
                />
              </div>
            </div>
            <div className="bf-tablewrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    {screen.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={String(r.id ?? i)}>
                      {screen.columns.map((c) => (
                        <td key={c}>{label(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredRows.length && (
              <div className="bf-empty">
                {state === 'carregando'
                  ? 'Carregando registros...'
                  : state === 'ok'
                    ? 'Nenhum registro encontrado para os filtros selecionados.'
                    : 'Sem dados operacionais disponíveis. Conecte a API do módulo para habilitar esta rotina.'}
              </div>
            )}
          </div>

          <div className="bf-note">
            Ações de alteração, aprovação, pagamentos e estornos permanecem bloqueadas nesta
            entrega até a validação dos endpoints, permissões, ledger, idempotência e auditoria.
          </div>
        </>
      )}
    </div>
  );
}
