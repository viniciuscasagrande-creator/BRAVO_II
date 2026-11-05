'use client';
import React,{useEffect,useState} from 'react';import Link from 'next/link';
import {get,EventSummary} from '../../../lib/bravo-api';
import {Head,Notice,Empty,dateBR} from '../../../components/bravo-p06';
export default function EventList(){const [rows,setRows]=useState<EventSummary[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{get<EventSummary[]>('eventos').then(setRows).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 return <main className="b6"><Head title="Gestão de Eventos" description="Eventos em preparação, análise, aprovação e publicação." action={<Link href="/eventos/novo" className="b6-btn">Cadastrar evento</Link>}/><Notice text={error} error/>{loading?<p>Consultando eventos...</p>:rows.length?<div className="b6-panel b6-table-wrapper"><table><thead><tr><th>Evento</th><th>Produtor principal</th><th>Data</th><th>Situação</th></tr></thead><tbody>{rows.map(e=><tr key={e.id}><td><Link href={`/eventos/${e.id}`}>{e.name}</Link></td><td>{e.producers.find(p=>p.role==='PRINCIPAL')?.producer.legalName||'Pendente'}</td><td>{dateBR(e.startsAt)}</td><td>{e.status}</td></tr>)}</tbody></table></div>:!error&&<Empty message="Nenhum evento cadastrado. Crie o primeiro evento para iniciar o fluxo de aprovação."/>}</main>;
}
