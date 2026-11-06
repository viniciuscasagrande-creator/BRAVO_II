'use client';
import {FormEvent,useState} from 'react';
import {get} from '../../../lib/bravo-api';
import {Head,Notice} from '../../../components/bravo-p06';
type Ticket={number:string;status:string;issuedAt:string;orderId:string;event:{name:string};session:{name:string};customerName:string};
export default function Ingressos(){const [numero,setNumero]=useState(''),[ticket,setTicket]=useState<Ticket|null>(null),[err,setErr]=useState(''),[loading,setLoading]=useState(false);
  async function search(e:FormEvent){e.preventDefault();setErr('');setTicket(null);setLoading(true);try{setTicket(await get<Ticket>(`ingressos?numero=${encodeURIComponent(numero)}`));}catch(e){setErr((e as Error).message);}finally{setLoading(false);}}
  return <main className="b6"><Head title="Consulta de Ingressos" description="Consulta por número numérico de oito dígitos. Não substitui a validação de QR na portaria."/><Notice text={err} error/>
    <section className="b6-panel" style={{maxWidth:670}}><h2>Localizar ingresso</h2><form className="b6-stack" onSubmit={search}><label className="b6-field">Número de 8 dígitos<input required pattern="[0-9]{8}" inputMode="numeric" maxLength={8} value={numero} onChange={e=>setNumero(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="00000001"/></label><button className="b6-btn" disabled={loading}>{loading?'Consultando...':'Consultar'}</button></form>
    {ticket&&<div className="b6-sublist" style={{marginTop:22}}><div><strong>Ingresso nº {ticket.number}</strong></div><div>Evento: {ticket.event.name}</div><div>Sessão: {ticket.session.name}</div><div>Cliente: {ticket.customerName}</div><div>Situação: {ticket.status}</div><div>Pedido: {ticket.orderId}</div></div>}
    <p className="b6-muted">Sem integração de gateway e emissão de ingressos, esta consulta ficará vazia. Nenhum QR ou ingresso de demonstração é fabricado.</p></section>
  </main>;
}
