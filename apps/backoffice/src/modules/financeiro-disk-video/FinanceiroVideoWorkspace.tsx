'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useBravoSession } from '../../context/session-context';
import { FINANCEIRO_BASE, FINANCEIRO_GRUPOS, FINANCEIRO_TELAS, findFinanceView, type ScreenConfig } from './catalogo';
import './financeiro-video.css';
import FinanceiroVideoExtras from './FinanceiroVideoExtras';

type Item=Record<string,unknown>;
type LoadState='parado'|'carregando'|'ok'|'nao-conectado'|'falha';
const label=(v:unknown):string=>v===null||v===undefined?'—':String(v);
function downloadCsv(rows:Item[],cols:string[],name:string){
  const escape=(v:unknown)=>`"${label(v).replaceAll('"','""')}"`;
  const body=[cols.map(escape).join(';'),...rows.map(row=>cols.map(c=>escape(row[c])).join(';'))].join('\r\n');
  const blob=new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`bravo-financeiro-${name.replaceAll('/','-')}.csv`;a.click();URL.revokeObjectURL(url);
}
export default function FinanceiroVideoWorkspace({screenId}:{screenId?:string}){
  const {isAuthenticated,isLoadingSession,hasPermission}=useBravoSession();
  const canAccess=hasPermission('finance:read');
  const screen=screenId?findFinanceView(screenId):undefined;
  const [search,setSearch]=useState('');
  const [producer,setProducer]=useState('');
  const [event,setEvent]=useState('');
  const [period,setPeriod]=useState('mes');
  const [state,setState]=useState<LoadState>('parado');
  const [error,setError]=useState('');
  const [rows,setRows]=useState<Item[]>([]);
  const [reload,setReload]=useState(0);
  const filteredRows=useMemo(()=>rows.filter(row=>!search.trim()||Object.values(row).some(v=>label(v).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))),[rows,search]);
  const load=useCallback(async()=>{
    if(!screen||!canAccess||!isAuthenticated)return;
    setRows([]);setState('carregando');setError('');
    // Contrato explícito: o backend precisa implementar o endpoint. Jamais inventar saldos ou registros.
    const params=new URLSearchParams({modulo:screen.id,periodo:period});
    if(producer)params.set('produtorId',producer);
    if(event)params.set('eventoId',event);
    try{
      const response=await fetch(`/v1/financeiro/operacoes?${params.toString()}`,{credentials:'same-origin',cache:'no-store'});
      if(response.status===404||response.status===501){setState('nao-conectado');return;}
      if(!response.ok)throw new Error(`A consulta retornou HTTP ${response.status}`);
      const data=await response.json() as {items?:Item[]};
      if(!Array.isArray(data.items))throw new Error('A API não retornou uma lista válida.');
      setRows(data.items);setState('ok');
    }catch(err){setError(err instanceof Error?err.message:'Falha de comunicação');setState('falha');}
  },[screen?.id,canAccess,isAuthenticated,producer,event,period,reload]);
  useEffect(()=>{void load();},[load]);
  if(isLoadingSession)return <div className="bf-note">Verificando sessão financeira...</div>;
  if(!isAuthenticated)return <div className="bf-note">Entre com sua credencial do BRAVO_II para visualizar o Financeiro Disk. <Link href="/login">Acessar login</Link>.</div>;
  if(!canAccess)return <div className="bf-error">Sua credencial não possui a permissão Financeiro Disk. O acesso deve ser concedido pelo administrador.</div>;
  return <div className="bf-root">
    <aside className="bf-nav" aria-label="Todas as rotinas do Financeiro Disk">
      <div className="bf-nav-title">FINANCEIRO DISK · OPERAÇÃO</div>
      <Link href={FINANCEIRO_BASE} data-active={!screen}>Painel de módulos</Link>
      {FINANCEIRO_GRUPOS.map(g=><details key={g.id} open={!screen||screen.groupId===g.id}>
        <summary>{g.label}</summary>
        {g.items.map(item=><Link key={item.id} href={`${FINANCEIRO_BASE}/${item.id}`} data-active={screen?.id===item.id}>{item.title}</Link>)}
      </details>)}
    </aside>
    <div className="bf-main">
      <div className="bf-head"><div><div className="bf-eyebrow">BRAVO_II · Financeiro Disk · Gestão Corporativa</div>
        <h1>{screen?.title??'Central Financeira — Todos os Módulos'}</h1>
        <p>{screen?screen.group:'Navegação completa baseada no Financeiro apresentado na gravação de 09/11/2026'}</p></div>
        <div><span className="bf-tag">Homologação · Sem movimentação bancária</span></div></div>
      {!screen?<>
        <div className="bf-note">Todas as telas identificadas foram organizadas abaixo, com navegação própria. Os dados e operações só serão liberados quando os serviços reais da API e o Neon forem integrados e testados.</div>
        <div className="bf-groupgrid">{FINANCEIRO_GRUPOS.map(g=><Link className="bf-groupcard" href={`${FINANCEIRO_BASE}/${g.items[0].id}`} key={g.id}><strong>{g.label}</strong><small>{g.items.length} telas · abrir primeira rotina</small></Link>)}</div>
      </>:<>
        <div className="bf-kpis">{['Registros consultados','Situação do módulo','Período','Fonte dos dados'].map((metric,i)=><div key={metric} className="bf-kpi"><small>{metric}</small><strong>{i===0?(state==='ok'?filteredRows.length:'—'):i===1?(state==='ok'?'Consulta concluída':state==='carregando'?'Consultando':state==='nao-conectado'?'API pendente':state==='falha'?'Falha de comunicação':'Aguardando'):i===2?(period==='mes'?'Mês atual':period==='semana'?'Semana atual':'Todo o período'):'BRAVO_II / PostgreSQL'}</strong><span>{i===0?'Sem valores simulados':i===1?'Ações reais exigem integração':i===2?'Filtro selecionado':'Backend autorizado'}</span></div>)}</div>
        <div className="bf-toolbar">
          <div className="bf-field"><label htmlFor="bf-produtor">Produtor</label><input id="bf-produtor" value={producer} onChange={e=>setProducer(e.target.value)} placeholder="Identificador do produtor"/></div>
          <div className="bf-field"><label htmlFor="bf-evento">Evento</label><input id="bf-evento" value={event} onChange={e=>setEvent(e.target.value)} placeholder="Identificador do evento"/></div>
          <div className="bf-field"><label htmlFor="bf-periodo">Período</label><select id="bf-periodo" value={period} onChange={e=>setPeriod(e.target.value)}><option value="mes">Mês atual</option><option value="semana">Semana atual</option><option value="todos">Todos</option></select></div>
          <button type="button" className="bf-btn bf-btn-primary" onClick={()=>setReload(x=>x+1)}>Atualizar</button>
          <button type="button" disabled={state!=='ok'||filteredRows.length===0} className="bf-btn" onClick={()=>downloadCsv(filteredRows,screen.columns,screen.id)}>Exportar CSV</button>
        </div>
        {state==='nao-conectado'&&<div role="status" className="bf-note">A interface desta rotina foi instalada. A rota de consulta no backend ainda precisa ser vinculada ao serviço real correspondente. Não serão mostrados dados fictícios.</div>}
        {state==='falha'&&<div role="alert" className="bf-error">{error}</div>}
        <FinanceiroVideoExtras screen={screen}/>
        <div className="bf-panel"><div className="bf-panelhead"><div><strong>{screen.title}</strong><br/><span>{screen.kind==='workflow'?'Fila operacional e aprovações':screen.kind==='report'?'Consulta e exportação':screen.kind==='settings'?'Regras, acessos e configurações':'Movimentações e registros autorizados'}</span></div><div className="bf-field" style={{minWidth:220}}><label htmlFor="bf-busca">Busca nesta rotina</label><input id="bf-busca" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar registros..."/></div></div>
          <div className="bf-tablewrap"><table className="bf-table"><thead><tr>{screen.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{filteredRows.map((r,i)=><tr key={String(r.id??i)}>{screen.columns.map(c=><td key={c}>{label(r[c])}</td>)}</tr>)}</tbody></table></div>
          {!filteredRows.length&&<div className="bf-empty">{state==='carregando'?'Carregando registros...':state==='ok'?'Nenhum registro encontrado para os filtros selecionados.':'Sem dados operacionais disponíveis. Conecte a API do módulo para habilitar esta rotina.'}</div>}
        </div>
        <div className="bf-note">Ações de alteração, aprovação, pagamentos e estornos permanecem bloqueadas nesta entrega até a validação dos endpoints, permissões, ledger, idempotência e auditoria. O backup original do Financeiro acompanha o pacote como referência de regras, formulários e fluxos.</div>
      </>}
    </div>
  </div>;
}
