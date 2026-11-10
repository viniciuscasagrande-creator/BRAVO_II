'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScreenConfig } from './catalogo';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centsToBrl = (c: number) => brl((c || 0) / 100);

function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('bravo_csrf='));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : '';
}

interface DashboardData {
  kpis: {
    saldoBancoCents: number;
    aRepassarProdutoresCents: number;
    receitaComissaoCents: number;
    taxasEstornosCents: number;
    chamadosAbertos: number;
    chamadosAtrasados: number;
    riscosCriticosAltos: number;
  };
  balancete: Array<{
    code: string;
    name: string;
    nature: string;
    debitosCents: number;
    creditosCents: number;
    saldoCents: number;
  }>;
  lancamentos: Array<{
    id: string;
    entryNumber: string;
    entryType: string;
    debitAccount: string;
    creditAccount: string;
    amountCents: number;
    description: string;
    reversesEntryId: string | null;
    occurredAt: string;
  }>;
  eventosSaldos: Array<{
    id: string;
    title: string;
    startsAt: string;
    producerId: string | null;
    producerName: string;
    feeLabel: string;
    advanceReleaseLimitBps: number;
    grossSalesCents: number;
    accumulated2101Cents: number;
    paid2101Cents: number;
    availableCents: number;
  }>;
  repasses: Array<{
    id: string;
    protocol: string;
    requestType: string;
    amountCents: number;
    status: string;
    requestedBy: string;
    createdAt: string;
  }>;
  conciliacoes: Array<{
    id: string;
    provider: string;
    externalTxId: string;
    grossCents: number;
    gatewayFeeCents: number;
    expectedGrossCents: number;
    expectedFeeCents: number;
    diffGrossCents: number;
    diffFeeCents: number;
    status: string;
  }>;
  riscos: Array<{
    id: string;
    title: string;
    category: string;
    probability: number;
    impact: number;
    level: number;
    control_description: string;
    owner_name: string;
    status: string;
    reviewed_at: string;
  }>;
  chamados: Array<{
    id: string;
    kind: string;
    protocol: string;
    subject: string;
    amountCents: number;
    status: string;
    overdue: boolean;
    createdAt: string;
  }>;
  plano5w2h: Array<{
    id: string;
    planCode: string;
    priority: string;
    whatText: string;
    whyText: string;
    whoName: string;
    areaName: string;
    howText: string;
    howMuchCents: number;
    status: string;
  }>;
  parametros: Array<{
    param_key: string;
    param_value: string;
    description_pt_br: string;
  }>;
}

type HubTab =
  | 'PAINEL'
  | 'RAZAO'
  | 'REPASSES'
  | 'CONCILIACAO'
  | 'RISCOS'
  | 'ATENDIMENTO'
  | 'PLANO_5W2H';

function defaultTabForScreen(screenId: string): HubTab {
  if (screenId.startsWith('ledger/') || screenId.startsWith('taxas/') || screenId.startsWith('gateways/'))
    return 'RAZAO';
  if (
    screenId.startsWith('produtores/') ||
    screenId.startsWith('solicitacoes/') ||
    screenId.startsWith('relatorios/')
  )
    return 'REPASSES';
  if (screenId.startsWith('conciliacao/')) return 'CONCILIACAO';
  if (screenId.startsWith('governanca/')) return 'RISCOS';
  if (screenId.startsWith('estornos/')) return 'ATENDIMENTO';
  if (screenId.startsWith('controladoria/')) return 'PLANO_5W2H';
  return 'PAINEL';
}

export default function FinanceiroVideoExtras({ screen }: { screen: ScreenConfig }) {
  const [activeTab, setActiveTab] = useState<HubTab>(() => defaultTabForScreen(screen.id));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Simulador de spread (preservado para compatibilidade)
  const [gross, setGross] = useState('');
  const [mdr, setMdr] = useState('');
  const [fee, setFee] = useState('');
  const [workflowStep, setWorkflowStep] = useState('Todas');
  const [showRuleFields, setShowRuleFields] = useState(false);

  // Estados de formulário das Fases 1 a 5
  const [saleGrossReais, setSaleGrossReais] = useState('200,00');
  const [saleDiskFeePct, setSaleDiskFeePct] = useState('15');
  const [saleMdrPct, setSaleMdrPct] = useState('2,99');
  const [saleDesc, setSaleDesc] = useState('Venda lote ingresso online');

  const [rawStatement, setRawStatement] = useState('');

  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState('Financeiro');
  const [riskProb, setRiskProb] = useState('4');
  const [riskImp, setRiskImp] = useState('4');
  const [riskCtrl, setRiskCtrl] = useState('');

  const [what5w, setWhat5w] = useState('');
  const [why5w, setWhy5w] = useState('');
  const [who5w, setWho5w] = useState('');
  const [area5w, setArea5w] = useState('FINANCEIRO');
  const [how5w, setHow5w] = useState('');
  const [filterArea5w, setFilterArea5w] = useState('TODAS');

  useEffect(() => {
    setActiveTab(defaultTabForScreen(screen.id));
  }, [screen.id]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/v1/financeiro/painel-executivo', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const body = (await res.json()) as DashboardData;
        setData(body);
      }
    } catch {
      // Silencioso em caso de carregamento inicial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const rates = useMemo(() => {
    const parse = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
    const a = parse(gross),
      b = parse(mdr),
      c = parse(fee);
    return Number.isFinite(a) &&
      Number.isFinite(b) &&
      Number.isFinite(c) &&
      a >= 0 &&
      b >= 0 &&
      c >= 0 &&
      b <= 100 &&
      c <= 100
      ? { gross: a, mdr: (a * b) / 100, fee: (a * c) / 100, spread: (a * (c - b)) / 100 }
      : null;
  }, [gross, mdr, fee]);

  const postJson = async (url: string, payload: Record<string, unknown>, okText: string) => {
    setFeedback(null);
    try {
      const csrf = readCsrfCookie();
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setFeedback({ type: 'err', text: body.message || `Falha HTTP ${res.status}` });
        return;
      }
      setFeedback({ type: 'ok', text: okText });
      await loadDashboard();
    } catch (e) {
      setFeedback({ type: 'err', text: e instanceof Error ? e.message : 'Erro de comunicação' });
    }
  };

  const handlePostSale = async () => {
    const parseNum = (s: string) => Number(s.replace(/\./g, '').replace(',', '.')) || 0;
    const grossCents = Math.round(parseNum(saleGrossReais) * 100);
    const diskFeeBps = Math.round(parseNum(saleDiskFeePct) * 100);
    const gatewayMdrBps = Math.round(parseNum(saleMdrPct) * 100);
    await postJson(
      '/v1/financeiro/razao/lancar-venda',
      {
        grossCents,
        diskFeeBps,
        gatewayMdrBps,
        description: saleDesc,
      },
      'Venda contabilizada no Razão Único (partidas 1.1.02, 2.1.01, 3.1.01 e 4.1.01 geradas).'
    );
  };

  const handleReverseEntry = async (entryId: string) => {
    await postJson(
      '/v1/financeiro/razao/estornar',
      { entryId, reason: 'Estorno compensatório solicitado pelo operador' },
      'Lançamento compensatório registrado no Razão Imutável.'
    );
  };

  const handleGenerateSampleStatement = () => {
    const sample = [
      'GW-1001;200.00;5.98;200.00;5.98',
      'GW-1002;150.00;5.00;150.00;4.50',
      'GW-1003;300.00;8.97;280.00;8.97',
      'GW-9999;90.00;2.69;0;0',
    ].join('\n');
    setRawStatement(sample);
    setFeedback({
      type: 'ok',
      text: 'Extrato de exemplo gerado: GW-1001 conciliada, GW-1002 divergência só na taxa (R$ 0,50), GW-1003 divergência no bruto (exige revisão humana) e GW-9999 gateway sem lançamento.',
    });
  };

  const handleImportStatement = async () => {
    const parseNum = (s: string) => Number((s || '0').replace(',', '.')) || 0;
    const lines = rawStatement
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [
          externalTxId = 'GW-?',
          grossStr = '0',
          feeStr = '0',
          expGrossStr = '0',
          expFeeStr = '0',
        ] = line.split(';');
        return {
          externalTxId: externalTxId.trim(),
          grossCents: Math.round(parseNum(grossStr) * 100),
          gatewayFeeCents: Math.round(parseNum(feeStr) * 100),
          expectedGrossCents: Math.round(parseNum(expGrossStr) * 100),
          expectedFeeCents: Math.round(parseNum(expFeeStr) * 100),
        };
      });
    if (lines.length === 0) {
      setFeedback({
        type: 'err',
        text: 'Cole as linhas do extrato ou clique em "Gerar extrato de exemplo" antes de comparar.',
      });
      return;
    }
    await postJson(
      '/v1/financeiro/conciliacao/importar',
      { provider: 'PAGBANK_SANDBOX', lines },
      `Extrato importado e comparado (${lines.length} linhas gravadas em finance_gateway_reconciliations).`
    );
  };

  const handleAdjustFee = async (reconciliationId: string) => {
    await postJson(
      '/v1/financeiro/conciliacao/ajustar-taxa',
      { reconciliationId },
      'Ajuste de diferença de taxa lançado no Razão (4.1.01 × 1.1.02) e conciliação marcada como AJUSTADA.'
    );
  };

  const handleCreateRisk = async () => {
    if (!riskTitle.trim()) {
      setFeedback({ type: 'err', text: 'Informe o nome/título do risco.' });
      return;
    }
    await postJson(
      '/v1/financeiro/riscos/criar',
      {
        title: riskTitle,
        category: riskCat,
        probability: Number(riskProb),
        impact: Number(riskImp),
        controlDescription: riskCtrl,
      },
      'Risco registrado na matriz de governança (nível calculado no banco).'
    );
    setRiskTitle('');
    setRiskCtrl('');
  };

  const handleMitigateRisk = async (id: string) => {
    await postJson(
      '/v1/financeiro/riscos/mitigar',
      { id },
      'Risco marcado como Mitigado e data de revisão atualizada.'
    );
  };

  const handleCreate5w2h = async () => {
    if (!what5w.trim()) {
      setFeedback({ type: 'err', text: 'Informe a ação (What / O quê) do plano 5W2H.' });
      return;
    }
    await postJson(
      '/v1/financeiro/plano-5w2h/criar',
      {
        whatText: what5w,
        whyText: why5w,
        whoName: who5w,
        areaName: area5w,
        howText: how5w,
      },
      'Ação 5W2H registrada no banco PostgreSQL.'
    );
    setWhat5w('');
    setWhy5w('');
    setHow5w('');
  };

  const handleUpdate5w2hStatus = async (id: string, status: string) => {
    await postJson(
      '/v1/financeiro/plano-5w2h/status',
      { id, status },
      `Status da ação 5W2H atualizado para ${status}.`
    );
  };

  const kpis = data?.kpis ?? {
    saldoBancoCents: 0,
    aRepassarProdutoresCents: 0,
    receitaComissaoCents: 0,
    taxasEstornosCents: 0,
    chamadosAbertos: 0,
    chamadosAtrasados: 0,
    riscosCriticosAltos: 0,
  };

  const isSim = screen.kind === 'simulator';
  const isWorkflow = screen.kind === 'workflow';
  const isSettings = screen.kind === 'settings' || screen.kind === 'rules';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
      {/* Barra de Modos Integrados Fases 1 a 5 */}
      <section className="bf-panel" aria-label="Central Integrada Financeiro Disk Fases 1 a 5">
        <div
          className="bf-panel-toolbar"
          style={{ flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}
        >
          <div className="bf-panel-status">
            <strong>Central Integrada BRAVO_II (Fases 1 a 5 Reconciliadas no Neon)</strong>
            <span className="bf-state-badge is-ready">
              {loading ? 'Sincronizando...' : 'PostgreSQL Ativo'}
            </span>
          </div>
          <div className="bf-inline-filters" style={{ flexWrap: 'wrap', gap: 6 }}>
            {(
              [
                ['PAINEL', '📊 Painel Executivo'],
                ['RAZAO', '📒 Razão & Balancete (F2)'],
                ['REPASSES', '💸 Produtores & Repasses (F3)'],
                ['CONCILIACAO', '🔄 Conciliação Gateway (F4)'],
                ['RISCOS', '🛡️ Matriz de Riscos (F5)'],
                ['ATENDIMENTO', '🎧 Atendimento & SLA (F5)'],
                ['PLANO_5W2H', '📋 Plano 5W2H (F1)'],
              ] as Array<[HubTab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`bf-pill-btn ${activeTab === key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
            <button type="button" className="bf-btn bf-btn-ghost" onClick={() => void loadDashboard()}>
              ↻ Atualizar Indicadores
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={feedback.type === 'err' ? 'bf-alert-error' : 'bf-panel'}
            style={{
              margin: '10px 0',
              padding: '8px 12px',
              background: feedback.type === 'err' ? '#fef2f2' : '#f0fdf4',
              borderColor: feedback.type === 'err' ? '#fecaca' : '#bbf7d0',
              color: feedback.type === 'err' ? '#991b1b' : '#166534',
            }}
          >
            {feedback.text}
          </div>
        )}

        {/* ABA 1: PAINEL EXECUTIVO (6 Indicadores + 3 Gráficos de Barras) */}
        {activeTab === 'PAINEL' && (
          <div style={{ marginTop: 12 }}>
            <div
              className="bf-sim-metrics"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div className="bf-sim-metric">
                <small>1. Saldo Banco + Recebíveis (1.1)</small>
                <strong>{centsToBrl(kpis.saldoBancoCents)}</strong>
              </div>
              <div className="bf-sim-metric">
                <small>2. A Repassar a Produtores (2.1.01)</small>
                <strong>{centsToBrl(kpis.aRepassarProdutoresCents)}</strong>
              </div>
              <div className="bf-sim-metric">
                <small>3. Receita Comissão Disk (3.1)</small>
                <strong>{centsToBrl(kpis.receitaComissaoCents)}</strong>
              </div>
              <div className="bf-sim-metric">
                <small>4. Taxas Gateway e Estornos (4.1)</small>
                <strong>{centsToBrl(kpis.taxasEstornosCents)}</strong>
              </div>
              <div className="bf-sim-metric">
                <small>5. Chamados Abertos / Atrasados</small>
                <strong>
                  {kpis.chamadosAbertos} abertos ·{' '}
                  <span style={{ color: kpis.chamadosAtrasados > 0 ? '#dc2626' : 'inherit' }}>
                    {kpis.chamadosAtrasados} atrasados
                  </span>
                </strong>
              </div>
              <div className="bf-sim-metric">
                <small>6. Riscos Críticos e Altos (Nível ≥ 8)</small>
                <strong style={{ color: kpis.riscosCriticosAltos > 0 ? '#d97706' : 'inherit' }}>
                  {kpis.riscosCriticosAltos} ativo(s)
                </strong>
              </div>
            </div>

            {/* 3 Gráficos de Barras */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              <div className="bf-panel" style={{ padding: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>
                  Gráfico 1 · Vendas Brutas por Evento
                </strong>
                {(data?.eventosSaldos ?? []).length === 0 ? (
                  <p className="bf-muted">
                    Nenhuma venda contabilizada ainda. Use a aba &ldquo;Razão &amp; Balancete&rdquo; para
                    lançar uma venda.
                  </p>
                ) : (
                  (data?.eventosSaldos ?? []).slice(0, 5).map((ev) => {
                    const max = Math.max(
                      1,
                      ...(data?.eventosSaldos ?? []).map((x) => x.grossSalesCents || 1)
                    );
                    const pct = Math.min(100, Math.round((ev.grossSalesCents / max) * 100));
                    return (
                      <div key={ev.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span>{ev.title}</span>
                          <strong>{centsToBrl(ev.grossSalesCents)}</strong>
                        </div>
                        <div
                          style={{
                            height: 8,
                            background: '#e2e8f0',
                            borderRadius: 4,
                            overflow: 'hidden',
                            marginTop: 3,
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: '#2563eb',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bf-panel" style={{ padding: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>
                  Gráfico 2 · Chamados por Tipo (SAC, Suporte, Estorno)
                </strong>
                {(['SAC', 'Suporte', 'Estorno'] as const).map((tipo) => {
                  const count = (data?.chamados ?? []).filter((c) => c.kind === tipo).length;
                  const total = Math.max(1, (data?.chamados ?? []).length);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={tipo} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{tipo}</span>
                        <strong>{count} chamado(s)</strong>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: '#e2e8f0',
                          borderRadius: 4,
                          overflow: 'hidden',
                          marginTop: 3,
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: tipo === 'Estorno' ? '#dc2626' : '#0891b2',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bf-panel" style={{ padding: 12 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>
                  Gráfico 3 · Riscos por Nível (P × I)
                </strong>
                {[
                  { label: 'Crítico (15–25)', min: 15, max: 25, color: '#dc2626' },
                  { label: 'Alto (8–14)', min: 8, max: 14, color: '#ea580c' },
                  { label: 'Médio (4–7)', min: 4, max: 7, color: '#ca8a04' },
                  { label: 'Baixo (1–3)', min: 1, max: 3, color: '#16a34a' },
                ].map((band) => {
                  const count = (data?.riscos ?? []).filter(
                    (r) => r.level >= band.min && r.level <= band.max
                  ).length;
                  const total = Math.max(1, (data?.riscos ?? []).length);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={band.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>{band.label}</span>
                        <strong>{count} risco(s)</strong>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: '#e2e8f0',
                          borderRadius: 4,
                          overflow: 'hidden',
                          marginTop: 3,
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: band.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: RAZÃO CONTÁBIL, BALANCETE & REGISTRO DE VENDAS (Fase 2) */}
        {activeTab === 'RAZAO' && (
          <div style={{ marginTop: 12 }}>
            <div className="bf-panel-toolbar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong>Lançar Venda Contábil (Partidas Balanceadas 1.1.02 / 2.1.01 / 3.1.01 / 4.1.01):</strong>
              <div className="bf-inline-filters" style={{ flexWrap: 'wrap' }}>
                <input
                  className="bf-input-compact"
                  value={saleDesc}
                  onChange={(e) => setSaleDesc(e.target.value)}
                  placeholder="Descrição da venda"
                />
                <input
                  className="bf-input-compact"
                  value={saleGrossReais}
                  onChange={(e) => setSaleGrossReais(e.target.value)}
                  placeholder="Bruto R$ (ex: 200,00)"
                  style={{ width: 120 }}
                />
                <input
                  className="bf-input-compact"
                  value={saleDiskFeePct}
                  onChange={(e) => setSaleDiskFeePct(e.target.value)}
                  placeholder="Taxa Disk %"
                  style={{ width: 95 }}
                />
                <input
                  className="bf-input-compact"
                  value={saleMdrPct}
                  onChange={(e) => setSaleMdrPct(e.target.value)}
                  placeholder="MDR %"
                  style={{ width: 90 }}
                />
                <button type="button" className="bf-btn bf-btn-primary" onClick={handlePostSale}>
                  + Contabilizar Venda no Razão
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: 12,
              }}
            >
              <div className="bf-table-wrap">
                <table className="bf-table">
                  <thead>
                    <tr>
                      <th>Conta (Plano Oficial)</th>
                      <th>Natureza</th>
                      <th>Débitos</th>
                      <th>Créditos</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.balancete ?? []).map((b) => (
                      <tr key={b.code}>
                        <td>
                          <strong>{b.code}</strong> — {b.name}
                        </td>
                        <td>{b.nature}</td>
                        <td>{centsToBrl(b.debitosCents)}</td>
                        <td>{centsToBrl(b.creditosCents)}</td>
                        <td>
                          <strong>{centsToBrl(b.saldoCents)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bf-table-wrap">
                <table className="bf-table">
                  <thead>
                    <tr>
                      <th>Lançamento</th>
                      <th>Débito → Crédito</th>
                      <th>Valor</th>
                      <th>Ação (Imutável)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.lancamentos ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="bf-muted">
                          Nenhum lançamento no razão. Clique em &ldquo;+ Contabilizar Venda no Razão&rdquo;
                          acima para testar.
                        </td>
                      </tr>
                    ) : (
                      (data?.lancamentos ?? []).slice(0, 12).map((l) => (
                        <tr key={l.id}>
                          <td>
                            <strong>{l.entryNumber}</strong>
                            <div className="bf-muted" style={{ fontSize: 11 }}>
                              {l.description}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            D: {l.debitAccount}
                            <br />
                            C: {l.creditAccount}
                          </td>
                          <td>
                            <strong>{centsToBrl(l.amountCents)}</strong>
                          </td>
                          <td>
                            {l.reversesEntryId ? (
                              <span className="bf-cell-badge">Estorno</span>
                            ) : (
                              <button
                                type="button"
                                className="bf-btn bf-btn-ghost"
                                onClick={() => void handleReverseEntry(l.id)}
                              >
                                Estornar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: PRODUTORES, EVENTOS & REPASSES (Fase 3) */}
        {activeTab === 'REPASSES' && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>
              Saldos por Evento / Produtor (Conta Passivo 2.1.01 e Regra de Liberação)
            </strong>
            <div className="bf-table-wrap" style={{ marginBottom: 12 }}>
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Produtor</th>
                    <th>Taxa Disk (Evento)</th>
                    <th>Limite Antecipação</th>
                    <th>Acumulado (2.1.01)</th>
                    <th>Já Pago</th>
                    <th>Disponível p/ Repasse</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.eventosSaldos ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="bf-muted">
                        Nenhum evento com movimentação registrada ainda.
                      </td>
                    </tr>
                  ) : (
                    (data?.eventosSaldos ?? []).map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <strong>{ev.title}</strong> ({ev.startsAt})
                        </td>
                        <td>{ev.producerName}</td>
                        <td>{ev.feeLabel}</td>
                        <td>{(ev.advanceReleaseLimitBps / 100).toFixed(1)}%</td>
                        <td>{centsToBrl(ev.accumulated2101Cents)}</td>
                        <td>{centsToBrl(ev.paid2101Cents)}</td>
                        <td>
                          <strong>{centsToBrl(ev.availableCents)}</strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <strong style={{ display: 'block', marginBottom: 8 }}>
              Fila de Solicitações de Repasse / Antecipação (Segregação Solicitante ≠ Aprovador)
            </strong>
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Tipo</th>
                    <th>Solicitante</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ação (Lança D 2.1.01 / C 1.1.01)</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.repasses ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="bf-muted">
                        Nenhuma solicitação de repasse registrada. Use o botão &ldquo;+ Novo Registro&rdquo;
                        abaixo para solicitar.
                      </td>
                    </tr>
                  ) : (
                    (data?.repasses ?? []).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.protocol}</strong>
                        </td>
                        <td>{p.requestType}</td>
                        <td>{p.requestedBy}</td>
                        <td>
                          <strong>{centsToBrl(p.amountCents)}</strong>
                        </td>
                        <td>
                          <span className="bf-cell-badge">{p.status}</span>
                        </td>
                        <td>
                          {p.status !== 'CONCLUIDO_HOMOLOGACAO' ? (
                            <button
                              type="button"
                              className="bf-btn bf-btn-primary"
                              onClick={() =>
                                void postJson(
                                  '/v1/financeiro/operacoes/transicao',
                                  {
                                    id: p.id,
                                    modulo: 'solicitacoes/repasses',
                                    novoStatus: 'CONCLUIDO_HOMOLOGACAO',
                                  },
                                  `Repasse ${p.protocol} liquidado em homologação e lançado no Razão (D 2.1.01 / C 1.1.01).`
                                )
                              }
                            >
                              Liquidar (D 2.1.01 / C 1.1.01)
                            </button>
                          ) : (
                            <span className="bf-muted">Lançado no Razão</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 4: CONCILIAÇÃO DE EXTRATO DO GATEWAY (Fase 4) */}
        {activeTab === 'CONCILIACAO' && (
          <div style={{ marginTop: 12 }}>
            <div className="bf-panel-toolbar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div>
                <strong>Importar e Conciliar Extrato do Gateway vs. Razão Contábil</strong>
                <div className="bf-muted" style={{ fontSize: 12 }}>
                  Formato por linha: <code>id_externo;bruto_gw;taxa_gw;bruto_razao;taxa_razao</code>
                </div>
              </div>
              <div className="bf-inline-filters">
                <button
                  type="button"
                  className="bf-btn bf-btn-ghost"
                  onClick={handleGenerateSampleStatement}
                >
                  Gerar extrato de exemplo
                </button>
                <button
                  type="button"
                  className="bf-btn bf-btn-primary"
                  onClick={() => void handleImportStatement()}
                >
                  Comparar com o Razão e Gravar
                </button>
              </div>
            </div>

            <textarea
              className="bf-input-compact"
              style={{ width: '100%', minHeight: 74, fontFamily: 'monospace', marginBottom: 10 }}
              value={rawStatement}
              onChange={(e) => setRawStatement(e.target.value)}
              placeholder="Clique em 'Gerar extrato de exemplo' ou cole linhas no formato id_gateway;bruto_gw;taxa_gw;bruto_esperado;taxa_esperada"
            />

            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Transação Gateway</th>
                    <th>Bruto (GW / Razão)</th>
                    <th>Taxa (GW / Razão)</th>
                    <th>Dif. Taxa</th>
                    <th>Situação</th>
                    <th>Ação de Conciliação</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.conciliacoes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="bf-muted">
                        Nenhuma linha conciliada ainda. Clique em &ldquo;Gerar extrato de exemplo&rdquo; e
                        depois em &ldquo;Comparar com o Razão e Gravar&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    (data?.conciliacoes ?? []).map((c) => {
                      const onlyFeeDiverges =
                        c.status === 'DIVERGENTE' && c.diffGrossCents === 0 && c.diffFeeCents !== 0;
                      return (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.externalTxId}</strong> ({c.provider})
                          </td>
                          <td>
                            {centsToBrl(c.grossCents)} / {centsToBrl(c.expectedGrossCents)}
                          </td>
                          <td>
                            {centsToBrl(c.gatewayFeeCents)} / {centsToBrl(c.expectedFeeCents)}
                          </td>
                          <td>{centsToBrl(c.diffFeeCents)}</td>
                          <td>
                            <span className="bf-cell-badge">{c.status}</span>
                          </td>
                          <td>
                            {onlyFeeDiverges ? (
                              <button
                                type="button"
                                className="bf-btn bf-btn-primary"
                                onClick={() => void handleAdjustFee(c.id)}
                              >
                                Lançar ajuste de taxa (4.1.01 × 1.1.02)
                              </button>
                            ) : c.status === 'DIVERGENTE' && c.diffGrossCents !== 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>
                                Divergência no bruto ({centsToBrl(c.diffGrossCents)}) — Revisão humana
                              </span>
                            ) : (
                              <span className="bf-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 5: MATRIZ DE RISCOS 5x5 & COMPLIANCE (Fase 5) */}
        {activeTab === 'RISCOS' && (
          <div style={{ marginTop: 12 }}>
            <div className="bf-panel-toolbar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong>Novo Risco (Matriz Probabilidade × Impacto):</strong>
              <div className="bf-inline-filters" style={{ flexWrap: 'wrap' }}>
                <input
                  className="bf-input-compact"
                  value={riskTitle}
                  onChange={(e) => setRiskTitle(e.target.value)}
                  placeholder="Título do risco (ex: Divergência gateway)"
                />
                <select
                  className="bf-input-compact"
                  value={riskCat}
                  onChange={(e) => setRiskCat(e.target.value)}
                >
                  <option value="Financeiro">Financeiro</option>
                  <option value="Fraude">Fraude</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Compliance">Compliance</option>
                </select>
                <select
                  className="bf-input-compact"
                  value={riskProb}
                  onChange={(e) => setRiskProb(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Probabilidade {n}
                    </option>
                  ))}
                </select>
                <select
                  className="bf-input-compact"
                  value={riskImp}
                  onChange={(e) => setRiskImp(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      Impacto {n}
                    </option>
                  ))}
                </select>
                <input
                  className="bf-input-compact"
                  value={riskCtrl}
                  onChange={(e) => setRiskCtrl(e.target.value)}
                  placeholder="Controle mitigador"
                />
                <button
                  type="button"
                  className="bf-btn bf-btn-primary"
                  onClick={() => void handleCreateRisk()}
                >
                  + Cadastrar Risco
                </button>
              </div>
            </div>

            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Risco</th>
                    <th>Categoria</th>
                    <th>P × I = Nível</th>
                    <th>Controle</th>
                    <th>Responsável</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.riscos ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="bf-muted">
                        Nenhum risco cadastrado na matriz. Cadastre acima para calcular o nível (P × I).
                      </td>
                    </tr>
                  ) : (
                    (data?.riscos ?? []).map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.title}</strong>
                        </td>
                        <td>{r.category}</td>
                        <td>
                          <strong>
                            {r.probability} × {r.impact} = {r.level}
                          </strong>{' '}
                          ({r.level >= 15 ? 'Crítico' : r.level >= 8 ? 'Alto' : 'Médio'})
                        </td>
                        <td>{r.control_description}</td>
                        <td>{r.owner_name}</td>
                        <td>
                          <span className="bf-cell-badge">{r.status}</span>
                        </td>
                        <td>
                          {r.status !== 'Mitigado' ? (
                            <button
                              type="button"
                              className="bf-btn bf-btn-ghost"
                              onClick={() => void handleMitigateRisk(r.id)}
                            >
                              Marcar como mitigado
                            </button>
                          ) : (
                            <span className="bf-muted">Mitigado ({r.reviewed_at})</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 6: ATENDIMENTO, SLA & ESTORNOS (Fase 5) */}
        {activeTab === 'ATENDIMENTO' && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>
              Fila Unificada de Chamados (SAC, Suporte e Estornos) com Alerta de Atraso de SLA
            </strong>
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Tipo</th>
                    <th>Assunto / Motivo</th>
                    <th>Valor Estorno</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Ação Financeira</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.chamados ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="bf-muted">
                        Nenhum chamado ou solicitação de estorno aberta no momento.
                      </td>
                    </tr>
                  ) : (
                    (data?.chamados ?? []).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.protocol}</strong>
                        </td>
                        <td>{c.kind}</td>
                        <td>{c.subject}</td>
                        <td>{c.amountCents > 0 ? centsToBrl(c.amountCents) : '—'}</td>
                        <td>
                          <span className="bf-cell-badge">{c.status}</span>
                        </td>
                        <td>
                          {c.overdue ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ ATRASADO</span>
                          ) : (
                            <span style={{ color: '#16a34a' }}>No prazo</span>
                          )}
                        </td>
                        <td>
                          {c.kind === 'Estorno' && c.status !== 'APROVADO_2' ? (
                            <button
                              type="button"
                              className="bf-btn bf-btn-primary"
                              onClick={() =>
                                void postJson(
                                  '/v1/financeiro/operacoes/transicao',
                                  {
                                    id: c.id,
                                    modulo: 'estornos/fila-aprovacao',
                                    novoStatus: 'CONCLUIDO_HOMOLOGACAO',
                                  },
                                  `Estorno ${c.protocol} aprovado e lançado no Razão (D 4.1.03 / C 1.1.01).`
                                )
                              }
                            >
                              Aprovar Estorno (4.1.03 × 1.1.01)
                            </button>
                          ) : (
                            <span className="bf-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 7: PLANO DE AÇÃO 5W2H (Fase 1) */}
        {activeTab === 'PLANO_5W2H' && (
          <div style={{ marginTop: 12 }}>
            <div className="bf-panel-toolbar" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <strong>Nova Ação 5W2H:</strong>
              <div className="bf-inline-filters" style={{ flexWrap: 'wrap' }}>
                <input
                  className="bf-input-compact"
                  value={what5w}
                  onChange={(e) => setWhat5w(e.target.value)}
                  placeholder="O Quê (What)"
                />
                <input
                  className="bf-input-compact"
                  value={why5w}
                  onChange={(e) => setWhy5w(e.target.value)}
                  placeholder="Por Quê (Why)"
                />
                <input
                  className="bf-input-compact"
                  value={who5w}
                  onChange={(e) => setWho5w(e.target.value)}
                  placeholder="Quem (Who)"
                />
                <select
                  className="bf-input-compact"
                  value={area5w}
                  onChange={(e) => setArea5w(e.target.value)}
                >
                  {['FINANCEIRO', 'SUPORTE', 'SAC', 'ESTORNO', 'COMERCIAL', 'DIRETORIA', 'MKT'].map(
                    (a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    )
                  )}
                </select>
                <input
                  className="bf-input-compact"
                  value={how5w}
                  onChange={(e) => setHow5w(e.target.value)}
                  placeholder="Como (How)"
                />
                <button
                  type="button"
                  className="bf-btn bf-btn-primary"
                  onClick={() => void handleCreate5w2h()}
                >
                  + Adicionar 5W2H
                </button>
                <select
                  className="bf-input-compact"
                  value={filterArea5w}
                  onChange={(e) => setFilterArea5w(e.target.value)}
                  aria-label="Filtrar 5W2H por área"
                >
                  <option value="TODAS">Todas as áreas</option>
                  {['FINANCEIRO', 'SUPORTE', 'SAC', 'ESTORNO', 'COMERCIAL', 'DIRETORIA', 'MKT'].map(
                    (a) => (
                      <option key={a} value={a}>
                        Área: {a}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Área</th>
                    <th>O Quê (What)</th>
                    <th>Por Quê (Why)</th>
                    <th>Quem (Who)</th>
                    <th>Como (How)</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.plano5w2h ?? []).filter(
                    (p) => filterArea5w === 'TODAS' || p.areaName === filterArea5w
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="bf-muted">
                        Nenhuma ação 5W2H registrada para o filtro atual. Adicione uma ação acima.
                      </td>
                    </tr>
                  ) : (
                    (data?.plano5w2h ?? [])
                      .filter((p) => filterArea5w === 'TODAS' || p.areaName === filterArea5w)
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.planCode}</strong>
                          </td>
                          <td>{p.areaName}</td>
                          <td>{p.whatText}</td>
                          <td>{p.whyText}</td>
                          <td>{p.whoName}</td>
                          <td>{p.howText}</td>
                          <td>
                            <span className="bf-cell-badge">{p.status}</span>
                          </td>
                          <td>
                            {p.status !== 'Concluído' ? (
                              <button
                                type="button"
                                className="bf-btn bf-btn-ghost"
                                onClick={() => void handleUpdate5w2hStatus(p.id, 'Concluído')}
                              >
                                Concluir
                              </button>
                            ) : (
                              <span className="bf-muted">Concluído</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Simulador de Spread e barras contextuais por tipo de tela */}
      {isSim && (
        <section className="bf-panel" aria-label="Simulador de spread">
          <div className="bf-panel-toolbar">
            <div className="bf-panel-status">
              <strong>Simulador de Spread / Margem Transacional</strong>
              <span className="bf-state-badge is-pending">Cálculo rápido</span>
            </div>
            <div className="bf-inline-filters">
              <input
                id="bf-sim-sale"
                className="bf-input-compact"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                inputMode="decimal"
                placeholder="Venda R$ (0,00)"
                aria-label="Valor da venda (R$)"
              />
              <input
                id="bf-sim-mdr"
                className="bf-input-compact"
                value={mdr}
                onChange={(e) => setMdr(e.target.value)}
                inputMode="decimal"
                placeholder="MDR operadora (%)"
                aria-label="MDR da operadora (%)"
              />
              <input
                id="bf-sim-fee"
                className="bf-input-compact"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                inputMode="decimal"
                placeholder="Taxa comercial (%)"
                aria-label="Taxa comercial cobrada (%)"
              />
            </div>
          </div>
          <div className="bf-sim-metrics">
            <div className="bf-sim-metric">
              <small>Valor bruto</small>
              <strong>{rates ? brl(rates.gross) : '—'}</strong>
            </div>
            <div className="bf-sim-metric">
              <small>Custo MDR</small>
              <strong>{rates ? brl(rates.mdr) : '—'}</strong>
            </div>
            <div className="bf-sim-metric">
              <small>Taxa comercial</small>
              <strong>{rates ? brl(rates.fee) : '—'}</strong>
            </div>
            <div className="bf-sim-metric">
              <small>Spread estimado</small>
              <strong>{rates ? brl(rates.spread) : '—'}</strong>
            </div>
          </div>
        </section>
      )}

      {isWorkflow && (
        <div className="bf-workflow-bar" role="group" aria-label="Etapas do fluxo operacional">
          <span className="bf-workflow-label">Etapa:</span>
          {['Todas', 'Solicitadas', 'Em análise', 'Aprovadas', 'Recusadas', 'Concluídas'].map((x) => (
            <button
              type="button"
              className={`bf-pill-btn ${workflowStep === x ? 'is-active' : ''}`}
              key={x}
              onClick={() => setWorkflowStep(x)}
            >
              {x}
            </button>
          ))}
        </div>
      )}

      {isSettings && (
        <div className="bf-workflow-bar">
          <span className="bf-workflow-label">
            {screen.kind === 'rules' ? 'Política / Regra:' : 'Parâmetros da rotina:'}
          </span>
          <button
            type="button"
            className="bf-btn bf-btn-ghost"
            onClick={() => setShowRuleFields((x) => !x)}
          >
            {showRuleFields ? 'Ocultar campos de referência' : '+ Visualizar campos da regra'}
          </button>
          {showRuleFields && (
            <>
              <input
                id="bf-reg-name"
                className="bf-input-compact"
                placeholder="Identificação da regra..."
                aria-label="Nome ou descrição da regra"
              />
              <select id="bf-reg-type" className="bf-input-compact" aria-label="Escopo da regra">
                <option>Escopo: Por evento</option>
                <option>Escopo: Por produtor</option>
                <option>Escopo: Interno Disk</option>
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}
