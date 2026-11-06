'use client';
import React,{useState} from 'react';
import {useRouter} from 'next/navigation';
import {post} from '../../../../../lib/bravo-api';
import {Field,Head,Notice,Panel} from '../../../../../components/bravo-p06';
const initial={legalName:'',tradeName:'',cnpj:'',email:'',phone:'',address:{street:'',number:'',district:'',city:'',state:'',postalCode:''},legalRepresentative:{name:'',email:'',role:''}};
export default function NewProducer(){
 const [form,setForm]=useState(initial),[error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 const main=(k:keyof typeof initial,v:string)=>setForm(s=>({...s,[k]:v}));
 const address=(k:keyof typeof initial.address,v:string)=>setForm(s=>({...s,address:{...s.address,[k]:v}}));
 const rep=(k:keyof typeof initial.legalRepresentative,v:string)=>setForm(s=>({...s,legalRepresentative:{...s.legalRepresentative,[k]:v}}));
 async function save(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);try{await post('comercial/produtores',form);router.push('/comercial/produtores');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className="b6"><Head title="Cadastrar produtor" description="Dados completos da empresa e representante legal. A validação documental será feita por usuário autorizado."/><Notice text={error} error/><form onSubmit={save} className="b6-stack"><Panel title="Dados da produtora"><div className="b6-grid">{([['legalName','Razão social'],['tradeName','Nome fantasia'],['cnpj','CNPJ'],['email','E-mail'],['phone','Telefone']] as const).map(([key,title])=><Field key={key} name={title}><input required={key!=='tradeName'} value={form[key]} onChange={e=>main(key,e.target.value)}/></Field>)}</div></Panel><Panel title="Endereço"><div className="b6-grid">{([['street','Logradouro'],['number','Número'],['district','Bairro'],['city','Cidade'],['state','UF'],['postalCode','CEP']] as const).map(([key,title])=><Field key={key} name={title}><input required value={form.address[key]} onChange={e=>address(key,e.target.value)}/></Field>)}</div></Panel><Panel title="Representante legal"><div className="b6-grid">{([['name','Nome completo'],['email','E-mail'],['role','Cargo']] as const).map(([key,title])=><Field key={key} name={title}><input required value={form.legalRepresentative[key]} onChange={e=>rep(key,e.target.value)}/></Field>)}</div></Panel><button className="b6-btn" disabled={busy} type="submit">{busy?'Salvando...':'Cadastrar produtora'}</button></form></main>;
}
