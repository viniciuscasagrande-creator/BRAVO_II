'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {ReactNode,useEffect,useState} from 'react';
import {currentSession,MenuItem,request,SignedInUser} from '../../lib/bravo-api';
export default function ErpLayout({children}:{children:ReactNode}){
 const router=useRouter(),pathname=usePathname();const [user,setUser]=useState<SignedInUser|null>(null),[menu,setMenu]=useState<MenuItem[]>([]),[error,setError]=useState('');
 useEffect(()=>{let canceled=false;Promise.all([currentSession(),request<{items:MenuItem[]}>('navegacao/menu')]).then(([session,data])=>{
  if(!canceled){setUser(session.user);setMenu(data.items);}
 }).catch(e=>{if(!canceled){setError(e.message);router.replace('/login');}});return()=>{canceled=true};},[router]);
 async function logout(){try{await request('auth/logout',{method:'POST'});router.replace('/login');router.refresh();}catch(e){setError((e as Error).message);}}
 if(!user)return <main className="bravo-login"><strong>Verificando sessão...</strong>{error&&<p role="alert">{error}</p>}</main>;
 const groups=[...new Set(menu.map(i=>i.group))];
 return <div className="bravo-app"><aside className="bravo-sidebar"><div className="bravo-logo">BRAVO_II<small>DISKINGRESSOS · ERP</small></div><nav aria-label="Menu principal">{groups.map(group=><div key={group}><div className="bravo-group">{group}</div>{menu.filter(item=>item.group===group).map(item=>item.status==='ATIVO'?<Link key={item.id} className={'bravo-link'+(pathname===item.href?' active':'')} href={item.href}>{item.label}</Link>:<span className="bravo-link disabled" key={item.id} aria-disabled="true">{item.label}<small>Em implantação — não operacional</small></span>)}</div>)}</nav><div style={{marginTop:'auto',padding:'12px',fontSize:11,color:'#a6b9d2'}}>Pacote 09 · Ambiente de homologação</div></aside><div className="bravo-content"><header className="bravo-topbar"><strong>BRAVO_II · Central de Operações</strong><div style={{display:'flex',gap:16,alignItems:'center'}}><span className="bravo-user">{user.email}</span><button className="bravo-btn" onClick={logout}>Sair</button></div></header><div className="bravo-main">{children}</div></div></div>;
}
