'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {get} from '../../../lib/bravo-api';
import {P10Head,P10Links,P10Panel,P10Alert,P10Empty,when} from '../../../components/bravo-p10';
type Metrics={open:number;overdue:number;closed:number;major:number;source:string;clock:string};
type Case={id:string;protocol:string;subject:string;status:string;priority:string;createdAt:string;resolutionDueAt:string};
export default function SACDashboard(){const [metrics,setMetrics]=useState<Metrics|null>(null),[items,setItems]=useState<Case[]>([]),[err,setErr]=useState('');
 useEffect(()=>{Promise.all([get<Metrics>('sac/indicadores'),get<{items:Case[]}>('sac/chamados')]).then(([m,c])=>{setMetrics(m);setItems(c.items)}).catch(e=>setErr(e.message));},[]);
 return <main className="p10"><P10Head title="Atendimento SAC" description="Chamados, SLA, incidentes e operações em uma única central." notice="A gravação de telefonia, chat, e-mail e WhatsApp depende de conectores externos; este pacote registra o atendimento interno."/><P10Links/><P10Alert error={err}/><div className="p10-grid">{[['Chamados em aberto',metrics?.open],['SLA de resolução vencido',metrics?.overdue],['Chamados fechados',metrics?.closed],['Incidentes críticos abertos',metrics?.major]].map(([name,value])=><div className="p10-stat" key={String(name)}><span>{name}</span><strong>{value??'—'}</strong></div>)}</div>
 <P10Panel title="Chamados recentes"><div className="p10-table-wrap"><table><thead><tr><th>Protocolo</th><th>Assunto</th><th>Prioridade</th><th>Situação</th><th>Prazo</th></tr></thead><tbody>{items.map(c=><tr key={c.id}><td><Link href={'/sac/chamados/'+c.id}>{c.protocol}</Link></td><td>{c.subject}</td><td>{c.priority}</td><td>{c.status}</td><td>{when(c.resolutionDueAt)}</td></tr>)}</tbody></table></div>{!items.length&&<P10Empty/>}</P10Panel></main>}
