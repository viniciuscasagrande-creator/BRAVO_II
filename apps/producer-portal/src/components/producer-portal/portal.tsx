'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EventSummaryViewDto, EventBuilderFullViewDto } from '@bravo-ii/contracts';
import { currentSession, get } from '../../lib/bravo-api';
import { campaignLink } from './marketing.mjs';
import './portal.css';
import {ProducerFinance} from './finance';

type Area = 'Evento' | 'Financeiro' | 'Marketing';
const statuses: Record<string,string> = {RASCUNHO:'Rascunho', PUBLICADO:'Publicado', EM_VENDA:'Em venda', APROVADO:'Aprovado', CANCELADO:'Cancelado', ENVIADO_PARA_ANALISE:'Em análise', ANALISE_COMERCIAL:'Em análise comercial', ANALISE_OPERACIONAL:'Em análise operacional', VALIDACAO_CADASTRAL:'Validação cadastral', ADIADO:'Adiado', ENCERRADO:'Encerrado', DRAFT:'Rascunho', PUBLISHED:'Publicado', APPROVED:'Aprovado', CANCELLED:'Cancelado', IN_REVIEW:'Em análise', ACTIVE:'Ativo', CLOSED:'Encerrado'};
const date = (value:string) => new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'medium',timeStyle:'short'});
export function ProducerPortal() {
  const [events,setEvents] = useState<EventSummaryViewDto[]>([]);
  const [selected,setSelected] = useState('');
  const [detail,setDetail] = useState<EventBuilderFullViewDto|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [authorized,setAuthorized] = useState(false);
  const [retry,setRetry] = useState(0);
  const [area,setArea] = useState<Area>('Evento');
  const [link,setLink] = useState('');
  const [message,setMessage] = useState('');
  useEffect(()=>{
    let active=true;
    setLoading(true);setError('');setAuthorized(false);setEvents([]);setDetail(null);
    (async()=>{
      const session = await currentSession();
      if (!session.user.roles.includes('PRODUTOR_PDT')) throw new Error('Entre com seu acesso de produtor para consultar o portal.');
      const result = await get<{items:EventSummaryViewDto[]}>('events');
      if(active){setAuthorized(true);setEvents(result.items);setSelected(result.items[0]?.id ?? '');}
    })().catch(e=>{if(active)setError(e instanceof Error?e.message:'Não foi possível carregar seus eventos.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[retry]);
  useEffect(()=>{
    setDetail(null);setLink('');setMessage('');
    if(!authorized || !selected)return;
    let active=true;setLoading(true);setError('');
    get<EventBuilderFullViewDto>(`events/${encodeURIComponent(selected)}`).then(value=>{if(active)setDetail(value);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Não foi possível carregar o evento.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[selected,authorized]);
  function generate(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setLink('');setMessage('');
    const data=new FormData(e.currentTarget);
    try{setLink(campaignLink(String(data.get('destination')),String(data.get('source')),String(data.get('medium')),String(data.get('campaign')),selected));}catch(e){setMessage(e instanceof Error?e.message:'Confira os dados do link.');}
  }
  return <div className="producer-portal">
    <header><Link href="/" className="brand">BRAVO_II <small>Portal do Produtor</small></Link><div style={{display:'flex',gap:16,alignItems:'center'}}><Link href="/login">Meu acesso</Link><button onClick={async()=>{try{const session=await get<{csrfToken:string}>('auth/me');const response=await fetch('/v1/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},body:'{}'});if(!response.ok)throw new Error('Não foi possível sair.');window.location.assign('/login');}catch{setError('Não foi possível encerrar a sessão. Tente novamente.');}}}>Sair</button></div></header>
    <main><p className="eyebrow">DISKINGRESSOS · SEUS EVENTOS</p><h1>Seu evento, mais perto.</h1><p className="intro">Informações e ferramentas para acompanhar cada etapa da sua produção.</p>
    <div className="toolbar"><label>Evento<select value={selected} disabled={!events.length || loading} onChange={e=>setSelected(e.target.value)}><option value="">Selecione um evento</option>{events.map(event=><option key={event.id} value={event.id}>{event.title}</option>)}</select></label><button onClick={()=>setRetry(v=>v+1)} disabled={loading}>Atualizar</button></div>
    {error && <section role="alert" className="notice"><h2>Não foi possível consultar</h2><p>{error}</p><Link href="/login">Acessar minha conta</Link></section>}
    {loading && <p role="status">Carregando informações…</p>}
    {!loading && !error && authorized && !events.length && <section className="notice"><h2>Nenhum evento vinculado</h2><p>Solicite à equipe DiskIngressos o vínculo dos seus eventos ao seu acesso.</p></section>}
    {authorized && !!selected && <><nav aria-label="Áreas do evento">{(['Evento','Financeiro','Marketing'] as Area[]).map(item=><button key={item} aria-current={area===item?'page':undefined} onClick={()=>setArea(item)}>{item}</button>)}</nav>
    {detail && !loading && !error && <><section className="event-banner"><div><small>EVENTO SELECIONADO</small><h2>{detail.title}</h2><p>{detail.venueName} · {detail.city}/{detail.stateUf}</p><p>{date(detail.startsAt)} · Horário de Brasília</p></div><span className="badge">{statuses[detail.status] ?? 'Situação a confirmar'}</span></section>
    {area==='Evento' && <><div className="metrics"><article><small>Sessões cadastradas</small><strong>{detail.sessions.length}</strong></article><article><small>Setores cadastrados</small><strong>{detail.sectors.length}</strong></article><article><small>Lotes cadastrados</small><strong>{detail.priceLots.length}</strong></article></div><section className="panel"><h2>Programação</h2>{!detail.sessions.length?<p>Nenhuma sessão cadastrada.</p>:<ul>{detail.sessions.map(s=><li key={s.id}><strong>{s.title}</strong><span>{date(s.startsAt)}</span></li>)}</ul>}</section><section className="panel"><h2>Setores e lotes</h2>{!detail.priceLots.length?<p>Nenhum lote cadastrado.</p>:<div className="table-wrap"><table><thead><tr><th>Modalidade</th><th>Lote</th><th>Valor do ingresso</th><th>Capacidade cadastrada</th></tr></thead><tbody>{detail.priceLots.map(l=><tr key={l.id}><td>{l.modalityName}</td><td>{l.lotNumber}</td><td>{(l.nominalPriceCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{l.maxQuantity}</td></tr>)}</tbody></table></div>}<p className="muted">Capacidade cadastrada não representa disponibilidade atual nem quantidade vendida.</p></section></>}
    {area==='Financeiro' && <ProducerFinance key={selected} eventId={selected}/>}
    {area==='Marketing' && <section className="panel"><h2>Links de divulgação</h2><p>Crie um link com identificação de campanha para divulgar este evento. A medição de vendas depende da integração do site de compra.</p><form key={selected} onSubmit={generate}><label>Endereço público de compra<input name="destination" type="url" placeholder="https://…" required /></label><div className="form-grid"><label>Origem<input name="source" placeholder="instagram" maxLength={120} required /></label><label>Meio<input name="medium" placeholder="social" maxLength={120} required /></label><label>Nome da campanha<input name="campaign" placeholder="divulgacao-evento" maxLength={120} required /></label></div><button className="primary" type="submit">Gerar link de campanha</button></form>{link && <div className="result"><label>Link gerado<textarea readOnly value={link}/></label><button onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('Link copiado.');}catch{setMessage('Selecione e copie o link acima.');}}}>Copiar link</button><p>O link não é salvo no sistema neste incremento.</p></div>}{message && <p role="status">{message}</p>}</section>}
    </>}</>}
    <footer>BRAVO_II · Portal do Produtor · DiskIngressos</footer></main></div>;
}
