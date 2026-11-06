'use client';
import {FormEvent,useEffect,useState} from 'react';
import {currentSession,get,post} from '../../../lib/bravo-api';
import {Head,Notice,Empty} from '../../../components/bravo-p06';
type Customer={id:string;fullName:string;cpfDisplay:string;email:string;phone:string;marketingOptIn:boolean};
export default function Clientes(){
  const [canCreate,setCanCreate]=useState(false);
  useEffect(()=>{currentSession().then(s=>setCanCreate(s.user.roles.some(r=>['ADMIN','OPERACOES','SAC'].includes(r)))).catch(()=>setCanCreate(false));},[]);
  const [busca,setBusca]=useState(''),[rows,setRows]=useState<Customer[]>([]),[msg,setMsg]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({fullName:'',cpf:'',email:'',phone:'',birthDate:'',marketingOptIn:false});
  async function search(e?:FormEvent){e?.preventDefault();setErr('');setMsg('');setBusy(true);try{const result=await get<{items:Customer[]}>(`clientes?busca=${encodeURIComponent(busca)}`);setRows(result.items);}catch(e){setErr((e as Error).message);}finally{setBusy(false);}}
  async function create(e:FormEvent){e.preventDefault();setErr('');setMsg('');setBusy(true);try{const customer=await post<Customer>('clientes',{...form,birthDate:form.birthDate||undefined});setMsg(`Cliente cadastrado: ${customer.fullName}.`);setRows([customer,...rows.filter(r=>r.id!==customer.id)]);setForm({fullName:'',cpf:'',email:'',phone:'',birthDate:'',marketingOptIn:false});}catch(e){setErr((e as Error).message);}finally{setBusy(false);}}
  return <main className="b6"><Head title="Central de Clientes" description="Cadastro de pessoa física. CPF armazenado como identificador protegido, nunca em texto aberto."/>
    <Notice text={err} error/>{msg&&<div className="b6-notice" role="status">{msg}</div>}
    <div className="b6-grid"><section className="b6-panel"><h2>Pesquisar cliente</h2><form onSubmit={search} className="b6-stack"><label className="b6-field">Nome ou e-mail<input required minLength={4} maxLength={120} value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar cliente cadastrado"/></label><button className="b6-btn" disabled={busy}>Pesquisar</button></form>{rows.length?<div className="b6-sublist" style={{marginTop:18}}>{rows.map(row=><div key={row.id}><strong>{row.fullName}</strong><p className="b6-muted">{row.email} · CPF {row.cpfDisplay}</p><small>Referência do cadastro: {row.id}</small></div>)}</div>:!err&&<Empty message="Nenhuma consulta carregada ou nenhum cliente encontrado."/>}</section>
    {canCreate&&<section className="b6-panel"><h2>Cadastrar pessoa física</h2><form className="b6-stack" onSubmit={create}>
      <label className="b6-field">Nome completo<input required minLength={5} maxLength={160} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
      <label className="b6-field">CPF<input required value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} placeholder="000.000.000-00" autoComplete="off"/></label>
      <label className="b6-field">E-mail<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label className="b6-field">Telefone com DDD<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label className="b6-field">Nascimento (se necessário)<input type="date" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label>
      <label style={{fontSize:13,display:'flex',gap:9,alignItems:'start'}}><input type="checkbox" checked={form.marketingOptIn} onChange={e=>setForm({...form,marketingOptIn:e.target.checked})}/>Autorizou comunicações promocionais? (opcional, independente da compra)</label>
      <button className="b6-btn" disabled={busy}>{busy?'Processando...':'Cadastrar cliente'}</button>
    </form><p className="b6-muted">Não utilizar dados pessoais reais em homologação sem controles e base legal adequados. A coleta e a política de privacidade devem ser homologadas antes da operação.</p></section>}</div>
  </main>;
}
