'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBravoSession } from '../../context/session-context';
import { post } from '../../lib/bravo-api';
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

const CONNECTED_SCREEN_IDS = new Set<string>(FINANCEIRO_TELAS.map((s) => s.id));

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
  const router = useRouter();
  const { isAuthenticated, isLoadingSession, hasPermission } = useBravoSession();
  const canAccess = hasPermission('finance:read');
  const canWrite = hasPermission('finance:approve-payout');
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

  // Estado do formulário operacional inline (+ Novo Registro)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    setIsFormOpen(false);
    setFormValues({});
    setActionMsg('');
  }, [screen?.id]);

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

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screen || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError('');
      setActionMsg('');
      await post('financeiro/operacoes', {
        modulo: screen.id,
        fields: formValues,
      });
      setFormValues({});
      setIsFormOpen(false);
      setActionMsg('Registro salvo no PostgreSQL e auditado com sucesso.');
      setReload((x) => x + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransition = async (recordId: string, novoStatus: string) => {
    if (!screen || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError('');
      setActionMsg('');
      await post('financeiro/operacoes/transicao', {
        id: recordId,
        modulo: screen.id,
        novoStatus,
      });
      setActionMsg(`Status atualizado para ${novoStatus} (registrado na auditoria).`);
      setReload((x) => x + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const activeSubIndex =
    screen && activeGroup ? activeGroup.items.findIndex((i) => i.id === screen.id) + 1 : 0;

  return (
    <div className="bf-shell">
      {/* Cabeçalho compacto unificado com seletor rápido de módulo e abas horizontais da rotina */}
      <header className="bf-header-card">
        <div className="bf-header-top">
          <div className="bf-header-titles">
            <div className="bf-eyebrow">
              <span>FINANCEIRO DISK</span>
              <span className="bf-eyebrow-sep">·</span>
              <span>
                {activeGroup
                  ? `MÓDULO ${activeGroup.orderBadge} · ${activeGroup.label}`
                  : `PAINEL DE MÓDULOS (15 GRUPOS · ${FINANCEIRO_TELAS.length} ROTINAS)`}
              </span>
            </div>
            <h1>
              {screen
                ? `${activeGroup?.orderBadge}.${activeSubIndex} · ${screen.title}`
                : 'Central Financeira — Módulos Operacionais'}
            </h1>
          </div>

          <div className="bf-header-controls">
            {screen && (
              <Link href={FINANCEIRO_BASE} className="bf-btn bf-btn-ghost">
                ← Todos os Módulos
              </Link>
            )}

            <div className="bf-module-select-wrap">
              <label htmlFor="bf-module-switcher" className="bf-sr-only">
                Selecionar módulo financeiro
              </label>
              <select
                id="bf-module-switcher"
                className="bf-module-select"
                value={activeGroup ? `${FINANCEIRO_BASE}/${activeGroup.items[0].id}` : FINANCEIRO_BASE}
                onChange={(e) => router.push(e.target.value)}
              >
                <option value={FINANCEIRO_BASE}>00 · Painel Geral (15 Módulos)</option>
                {orderedGroups.map((g) => (
                  <option key={g.id} value={`${FINANCEIRO_BASE}/${g.items[0].id}`}>
                    {g.orderBadge} · {g.label} ({g.items.length})
                  </option>
                ))}
              </select>
            </div>

            <Link href="/financeiro" className="bf-btn bf-btn-ghost">
              Tesouraria &amp; RH
            </Link>
          </div>
        </div>

        {/* Abas horizontais limpas apenas para as sub-telas do módulo atual */}
        {screen && activeGroup && (
          <nav className="bf-tabs" aria-label={`Sub-rotinas de ${activeGroup.label}`}>
            {activeGroup.items.map((item, idx) => {
              const isActiveScreen = item.id === screen.id;
              const isConnected = CONNECTED_SCREEN_IDS.has(item.id);
              return (
                <Link
                  key={item.id}
                  href={`${FINANCEIRO_BASE}/${item.id}`}
                  className={`bf-tab ${isActiveScreen ? 'is-active' : ''}`}
                >
                  <span className="bf-tab-code">
                    {activeGroup.orderBadge}.{idx + 1}
                  </span>
                  <span className="bf-tab-label">{item.title}</span>
                  <span
                    className={`bf-tab-dot ${isConnected ? 'is-connected' : 'is-pending'}`}
                    title={isConnected ? 'Conectada ao PostgreSQL' : 'API pendente'}
                  />
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {!screen ? (
        <>
          {/* Barra compacta de busca e filtro no Dashboard */}
          <div className="bf-dash-bar">
            <div className="bf-dash-search">
              <input
                id="bf-dash-search"
                type="search"
                value={dashboardQuery}
                onChange={(e) => setDashboardQuery(e.target.value)}
                placeholder="Buscar módulo ou rotina (ex.: Produtores, Repasses, MDR, Taxa Disk, PIX, Conciliação, Borderôs, Ledger)..."
                aria-label="Pesquisar módulo ou rotina financeira"
              />
            </div>
            <div className="bf-filter-pills" role="group" aria-label="Filtrar por status">
              <button
                type="button"
                className={`bf-pill-btn ${dashboardFilter === 'todos' ? 'is-active' : ''}`}
                onClick={() => setDashboardFilter('todos')}
              >
                Todos ({FINANCEIRO_TELAS.length})
              </button>
              <button
                type="button"
                className={`bf-pill-btn ${dashboardFilter === 'conectadas' ? 'is-active' : ''}`}
                onClick={() => setDashboardFilter('conectadas')}
              >
                Conectadas ({CONNECTED_SCREEN_IDS.size})
              </button>
              <button
                type="button"
                className={`bf-pill-btn ${dashboardFilter === 'interface' ? 'is-active' : ''}`}
                onClick={() => setDashboardFilter('interface')}
              >
                Pendentes ({FINANCEIRO_TELAS.length - CONNECTED_SCREEN_IDS.size})
              </button>
            </div>
          </div>

          {/* Grid limpo de Cards (01 a 15) com visual claro */}
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
                  <span className="bf-groupcard-count">{g.items.length} rotinas</span>
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
                            className={`bf-dot-indicator ${isConnected ? 'is-connected' : 'is-pending'}`}
                            title={isConnected ? 'Consulta PostgreSQL ativa' : 'API pendente'}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : (
        <>
          {error && (
            <div role="alert" className="bf-error">
              {error}
            </div>
          )}

          {actionMsg && (
            <div role="status" className="bf-success">
              {actionMsg}
            </div>
          )}

          <FinanceiroVideoExtras screen={screen} />

          {/* Painel único acima da dobra combinando filtros objetivos, criação e tabela */}
          <section className="bf-panel" aria-label={screen.title}>
            <div className="bf-panel-toolbar">
              <div className="bf-panel-status">
                <strong>{screen.title}</strong>
                <span
                  className={`bf-state-badge ${
                    state === 'ok'
                      ? 'is-ok'
                      : state === 'carregando'
                        ? 'is-loading'
                        : state === 'falha'
                          ? 'is-err'
                          : 'is-pending'
                  }`}
                >
                  {state === 'ok'
                    ? `${filteredRows.length} registro(s) · PostgreSQL`
                    : state === 'carregando'
                      ? 'Consultando...'
                      : state === 'nao-conectado'
                        ? 'API pendente'
                        : state === 'falha'
                          ? 'Falha na consulta'
                          : 'Pronto'}
                </span>
              </div>

              <div className="bf-inline-filters">
                <input
                  id="bf-busca"
                  type="search"
                  className="bf-input-compact"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nos resultados..."
                  aria-label="Buscar nos resultados"
                />
                <input
                  id="bf-produtor"
                  className="bf-input-compact"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  placeholder="Produtor..."
                  aria-label="Filtrar por produtor"
                />
                <input
                  id="bf-evento"
                  className="bf-input-compact"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  placeholder="Evento..."
                  aria-label="Filtrar por evento"
                />
                <select
                  id="bf-periodo"
                  className="bf-input-compact"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  aria-label="Período"
                >
                  <option value="mes">Mês atual</option>
                  <option value="semana">Semana atual</option>
                  <option value="todos">Todo o período</option>
                </select>
                {canWrite && (
                  <button
                    type="button"
                    className="bf-btn bf-btn-primary"
                    onClick={() => setIsFormOpen((prev) => !prev)}
                  >
                    {isFormOpen ? 'Cancelar' : '+ Novo Registro'}
                  </button>
                )}
                <button
                  type="button"
                  className="bf-btn"
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
                  CSV
                </button>
              </div>
            </div>

            {isFormOpen && canWrite && (
              <form className="bf-create-form" onSubmit={(e) => void handleCreateRecord(e)}>
                <div className="bf-create-grid">
                  {screen.columns.map((col) => (
                    <div key={col} className="bf-field">
                      <label htmlFor={`bf-col-${col}`}>{col}</label>
                      <input
                        id={`bf-col-${col}`}
                        value={formValues[col] ?? ''}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [col]: e.target.value }))
                        }
                        placeholder={`Informar ${col.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                </div>
                <div className="bf-create-actions">
                  <button
                    type="submit"
                    className="bf-btn bf-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar no PostgreSQL'}
                  </button>
                </div>
              </form>
            )}

            <div className="bf-tablewrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    {screen.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    {canWrite && screen.kind === 'workflow' && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => {
                    const rowId = typeof r._id === 'string' ? r._id : '';
                    return (
                      <tr key={String(r._id ?? r.id ?? i)}>
                        {screen.columns.map((c) => (
                          <td key={c}>{label(r[c])}</td>
                        ))}
                        {canWrite && screen.kind === 'workflow' && (
                          <td>
                            {rowId ? (
                              <div className="bf-row-actions">
                                <button
                                  type="button"
                                  className="bf-btn-xs is-approve"
                                  disabled={isSubmitting}
                                  onClick={() =>
                                    void handleTransition(rowId, 'APROVADO_FINANCEIRO')
                                  }
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className="bf-btn-xs is-complete"
                                  disabled={isSubmitting}
                                  onClick={() =>
                                    void handleTransition(rowId, 'CONCLUIDO_HOMOLOGACAO')
                                  }
                                >
                                  Concluir (HML)
                                </button>
                              </div>
                            ) : (
                              <span className="bf-muted">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!filteredRows.length && (
              <div className="bf-empty">
                {state === 'carregando'
                  ? 'Carregando registros do PostgreSQL...'
                  : state === 'ok'
                    ? 'Nenhum registro encontrado para os filtros selecionados. Use "+ Novo Registro" para cadastrar.'
                    : 'Rotina estruturada com integração de API pendente — nenhum dado fictício é exibido.'}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
