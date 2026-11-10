'use client';
import React,{useState} from 'react';
import {request} from '../../lib/bravo-api';
import '../../components/producer-portal/portal.css';
export default function Login(){
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function login(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);
 try{await request('auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});window.location.assign('/');}
 catch(e){setError(e instanceof Error?e.message:'Falha ao entrar.');}finally{setBusy(false);}}
 return <div className="producer-portal"><header><strong>BRAVO_II · Portal do Produtor</strong></header><main style={{maxWidth:500}}><h1>Acesse seus eventos</h1><section className="panel"><form onSubmit={login}><label>E-mail<input name="email" type="email" autoComplete="username" required/></label><label style={{margin:'20px 0'}}>Senha<input name="password" type="password" autoComplete="current-password" required/></label><button className="primary" disabled={busy}>{busy?'Entrando…':'Entrar'}</button>{error&&<p role="alert">{error}</p>}</form></section></main></div>;
}
