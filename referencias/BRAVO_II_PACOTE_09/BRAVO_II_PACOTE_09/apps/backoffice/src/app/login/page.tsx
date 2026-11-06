'use client';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function LoginPage(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 async function submit(ev:FormEvent){ev.preventDefault();setError('');setBusy(true);
  try{const res=await fetch('/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({email,password})});
   if(!res.ok)throw new Error('Não foi possível autenticar. Confira credenciais e configuração da API.');
   setPassword('');router.replace('/');router.refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <main className="bravo-login"><h1>BRAVO_II</h1><p>ERP corporativo · DiskIngressos</p><p className="bravo-warning">Ambiente de homologação. Acesso exclusivo para usuários cadastrados pelo administrador.</p><form onSubmit={submit}><label htmlFor="email">E-mail corporativo</label><input id="email" required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor="password">Senha</label><input id="password" required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy}>{busy?'Validando...':'Entrar no BRAVO_II'}</button></form>{error&&<p role="alert" className="bravo-error">{error}</p>}</main>;
}
