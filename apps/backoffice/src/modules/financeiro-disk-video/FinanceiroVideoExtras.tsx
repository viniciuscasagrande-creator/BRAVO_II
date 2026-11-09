'use client';
import React, {useMemo, useState} from 'react';
import type {ScreenConfig} from './catalogo';

const brl=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function FinanceiroVideoExtras({screen}:{screen:ScreenConfig}) {
  const [gross,setGross]=useState('');
  const [mdr,setMdr]=useState('');
  const [fee,setFee]=useState('');
  const [tab,setTab]=useState('Todas');
  const [showForm,setShowForm]=useState(false);
  const isSim=screen.kind==='simulator';
  const isWorkflow=screen.kind==='workflow';
  const isSettings=screen.kind==='settings'||screen.kind==='rules';
  const rates=useMemo(()=>{
    const parse=(s:string)=>Number(s.replace(/\./g,'').replace(',','.'));
    const a=parse(gross),b=parse(mdr),c=parse(fee);
    return Number.isFinite(a)&&Number.isFinite(b)&&Number.isFinite(c)&&a>=0&&b>=0&&c>=0&&b<=100&&c<=100 ? {gross:a,mdr:a*b/100,fee:a*c/100,spread:a*(c-b)/100}:null;
  },[gross,mdr,fee]);
  if(isSim)return <section className="bf-panel" aria-label="Simulador de spread">
    <div className="bf-panelhead"><strong>Simulador de Spread / Margem Transacional</strong><span>Prévia matemática · Não registra operações</span></div>
    <div className="bf-toolbar"><div className="bf-field"><label htmlFor="bf-sim-sale">Valor da venda (R$)</label><input id="bf-sim-sale" value={gross} onChange={e=>setGross(e.target.value)} inputMode="decimal" placeholder="0,00"/></div>
      <div className="bf-field"><label htmlFor="bf-sim-mdr">MDR da operadora (%)</label><input id="bf-sim-mdr" value={mdr} onChange={e=>setMdr(e.target.value)} inputMode="decimal" placeholder="0,00"/></div>
      <div className="bf-field"><label htmlFor="bf-sim-fee">Taxa comercial cobrada (%)</label><input id="bf-sim-fee" value={fee} onChange={e=>setFee(e.target.value)} inputMode="decimal" placeholder="0,00"/></div>
    </div>
    <div className="bf-kpis" style={{padding:16}}><div className="bf-kpi"><small>Valor bruto</small><strong>{rates?brl(rates.gross):'—'}</strong></div><div className="bf-kpi"><small>Custo MDR</small><strong>{rates?brl(rates.mdr):'—'}</strong></div><div className="bf-kpi"><small>Taxa comercial</small><strong>{rates?brl(rates.fee):'—'}</strong></div><div className="bf-kpi"><small>Diferença estimada</small><strong>{rates?brl(rates.spread):'—'}</strong></div></div>
    <div className="bf-note" style={{margin:16}}>Cálculo ilustrativo com taxas percentuais inseridas manualmente; não inclui custos fiscais, parcelamento, rebate, taxas fixas ou regras reais de contratos. Não é demonstrativo financeiro nem proposta vinculante.</div>
  </section>;
  if(isWorkflow)return <section className="bf-panel"><div className="bf-panelhead"><strong>Etapas do fluxo operacional</strong><span>Sem liberação bancária</span></div><div className="bf-toolbar">{['Todas','Solicitadas','Em análise','Aprovadas','Recusadas','Concluídas'].map(x=><button type="button" className={`bf-btn ${tab===x?'bf-btn-primary':''}`} key={x} onClick={()=>setTab(x)}>{x}</button>)}</div><div className="bf-note" style={{margin:16}}>Filtro selecionado: {tab}. Ações de aprovação e execução dependem de duplo controle de alçadas, registro em ledger e persistência. Nenhuma solicitação demonstrativa será fabricada.</div></section>;
  if(isSettings)return <section className="bf-panel"><div className="bf-panelhead"><strong>{screen.kind==='rules'?'Nova regra / política':'Configuração da integração'}</strong><button type="button" className="bf-btn" onClick={()=>setShowForm(x=>!x)}>{showForm?'Fechar formulário':'Visualizar campos'}</button></div>{showForm?<div className="bf-toolbar"><div className="bf-field"><label htmlFor="bf-reg-name">Nome / descrição</label><input id="bf-reg-name" placeholder="Identificação da regra"/></div><div className="bf-field"><label htmlFor="bf-reg-type">Escopo</label><select id="bf-reg-type"><option>Por evento</option><option>Por produtor</option><option>Interno Disk</option></select></div><div className="bf-note">Formulário de referência visual. Salvamento bloqueado até que o backend da operação exista e seja auditado.</div></div>:<div className="bf-empty">Abra o formulário para conferir a estrutura de configuração. Nenhuma alteração é enviada à API.</div>}</section>;
  return null;
}
