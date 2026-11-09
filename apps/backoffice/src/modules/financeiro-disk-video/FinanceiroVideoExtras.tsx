'use client';
import React, { useMemo, useState } from 'react';
import type { ScreenConfig } from './catalogo';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroVideoExtras({ screen }: { screen: ScreenConfig }) {
  const [gross, setGross] = useState('');
  const [mdr, setMdr] = useState('');
  const [fee, setFee] = useState('');
  const [tab, setTab] = useState('Todas');
  const [showForm, setShowForm] = useState(false);

  const isSim = screen.kind === 'simulator';
  const isWorkflow = screen.kind === 'workflow';
  const isSettings = screen.kind === 'settings' || screen.kind === 'rules';

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

  if (isSim) {
    return (
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
    );
  }

  if (isWorkflow) {
    return (
      <div className="bf-workflow-bar" role="group" aria-label="Etapas do fluxo operacional">
        <span className="bf-workflow-label">Etapa:</span>
        {['Todas', 'Solicitadas', 'Em análise', 'Aprovadas', 'Recusadas', 'Concluídas'].map((x) => (
          <button
            type="button"
            className={`bf-pill-btn ${tab === x ? 'is-active' : ''}`}
            key={x}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </div>
    );
  }

  if (isSettings) {
    return (
      <div className="bf-workflow-bar">
        <span className="bf-workflow-label">
          {screen.kind === 'rules' ? 'Política / Regra:' : 'Parâmetros da rotina:'}
        </span>
        <button type="button" className="bf-btn bf-btn-ghost" onClick={() => setShowForm((x) => !x)}>
          {showForm ? 'Ocultar campos de referência' : '+ Visualizar campos da regra'}
        </button>
        {showForm && (
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
    );
  }

  return null;
}
