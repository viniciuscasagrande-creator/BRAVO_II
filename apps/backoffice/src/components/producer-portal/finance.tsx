'use client';
import React,{useEffect,useState} from 'react';
import {get} from '../../lib/bravo-api';
interface Statement {
 eventId:string;recordedGrossCents:string|null;recordedObligationCents:string|null;recordedPayoutsCents:string|null;
 recordedRefundReservesCents:string|null;receivedCents:null;availableCents:null;
 items:{id:string;label:string;amountCents:string;occurredAt:string}[];nextOffset:number|null;
}
function money(value:string|null){
 if(value===null)return 'Não apurado';
 const cents=BigInt(value);return `R$ ${(cents/100n).toLocaleString('pt-BR')},${(cents%100n).toString().padStart(2,'0')}`;
}
export function ProducerFinance({eventId}:{eventId:string}){
 const [data,setData]=useState<Statement|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(true);
 const [offset,setOffset]=useState(0);const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');setData(null);
 get<Statement>(`producer-portal/events/${encodeURIComponent(eventId)}/finance?offset=${offset}`).then(result=>{if(active)setData(result);})
 .catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha na consulta financeira.');}).finally(()=>{if(active)setBusy(false);});
 return ()=>{active=false;};},[eventId,offset,refresh]);
 return <section className="panel"><div className="toolbar"><div><p className="eyebrow">FINANCEIRO DO EVENTO</p><h2>Registros financeiros</h2></div><button disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Atualizar financeiro</button></div>
 {busy&&<p role="status">Consultando registros financeiros…</p>}{error&&<p role="alert">{error}</p>}
 {data&&<><p>Consulta dos lançamentos atribuídos ao seu produtor neste evento. Os totais são registros acumulados e não representam saldo liberado.</p>
 <div className="metrics">{([
 ['Venda bruta registrada',data.recordedGrossCents],['Obrigações registradas',data.recordedObligationCents],
 ['Repasses registrados',data.recordedPayoutsCents],['Reservas para estorno registradas',data.recordedRefundReservesCents],
 ['Recebimentos conciliados',data.receivedCents],['Disponível para repasse',data.availableCents],
 ] as [string,string|null][]).map(([label,value])=><article key={label}><small>{label}</small><strong style={{fontSize:24}}>{money(value)}</strong></article>)}</div>
 <p className="notice">Saldo disponível ainda não apurado. Solicitações de repasse e antecipação serão liberadas após a integração da conciliação, das retenções e das aprovações financeiras.</p>
 <h2>Histórico de registros</h2>{!data.items.length?<p>Nenhum lançamento disponível nesta página.</p>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Registro</th><th>Valor</th></tr></thead><tbody>{data.items.map(item=><tr key={item.id}><td>{new Date(item.occurredAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</td><td>{item.label}</td><td>{money(item.amountCents)}</td></tr>)}</tbody></table></div>}
 <p className="muted">Repasses no razão não confirmam crédito bancário. Reservas registradas não representam todas as retenções. Registros sem atribuição a produtor aguardam conciliação.</p>
 <div style={{display:'flex',gap:12}}><button disabled={busy||offset===0} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Anterior</button><span>Página {offset/50+1}</span><button disabled={busy||data.nextOffset===null} onClick={()=>setOffset(data.nextOffset!)}>Próxima</button></div></>}
 </section>;
}
