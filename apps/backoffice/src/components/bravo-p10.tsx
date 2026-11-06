'use client';
import Link from 'next/link';
import {ReactNode} from 'react';
import './bravo-p10.css';
export function P10Head({title,description,notice}:{title:string;description:string;notice?:string}){return <div className="p10-head"><div><span className="p10-eyebrow">BRAVO_II / Operação integrada</span><h1>{title}</h1><p>{description}</p></div><div className="p10-label">HOMOLOGAÇÃO</div>{notice&&<div className="p10-banner">{notice}</div>}</div>}
export function P10Panel({title,children}:{title:string;children:ReactNode}){return <section className="p10-panel"><h2>{title}</h2>{children}</section>}
export function P10Alert({error,success}:{error?:string;success?:string}){return <>{error&&<div className="p10-alert error" role="alert">{error}</div>}{success&&<div className="p10-alert success" role="status">{success}</div>}</>}
export function P10Empty({message='Nenhum registro neste banco de homologação.'}:{message?:string}){return <p className="p10-empty">{message}</p>}
export function P10Links(){return <div className="p10-links"><Link href="/sac">Indicadores</Link><Link href="/sac/chamados">Chamados</Link><Link href="/pos-venda/trocas">Trocas</Link><Link href="/pos-venda/cancelamentos">Cancelamentos</Link><Link href="/estornos">Estornos</Link></div>}
export const money=(v:number)=>Number.isFinite(v)?(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
export const when=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR'):'—';
export const short=(v:string)=>v.slice(0,8)+'…';
