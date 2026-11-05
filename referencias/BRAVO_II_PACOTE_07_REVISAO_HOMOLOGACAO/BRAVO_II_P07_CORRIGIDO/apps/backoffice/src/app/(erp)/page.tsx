'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {get} from '../../lib/bravo-api';
export default function Home(){
 const [status,setStatus]=useState<'VERIFICANDO'|'CONECTADO'|'INDISPONIVEL'>('VERIFICANDO');
 useEffect(()=>{get<{banco:string}>('saude/banco').then(x=>setStatus(x.banco==='CONECTADO'?'CONECTADO':'INDISPONIVEL')).catch(()=>setStatus('INDISPONIVEL'));},[]);
 return <main><div className="bravo-panel"><h1>Bem-vindo ao BRAVO_II</h1><p>Ambiente de homologação da DiskIngressos, integrado ao Pacote 06: Comercial, Produtores e Gestão de Eventos.</p><div className="bravo-cards"><div className="bravo-card"><small>Conexão PostgreSQL</small><strong>{status}</strong></div><div className="bravo-card"><small>Publicação externa</small><strong>Desativada</strong></div><div className="bravo-card"><small>Pagamentos e estornos reais</small><strong>Desativados</strong></div><div className="bravo-card"><small>Financeiro / RH</small><strong>Catálogo preservado — migração pendente</strong></div></div><p><Link href="/comercial/produtores" style={{textDecoration:'underline'}}>Central de Produtores</Link> · <Link href="/eventos" style={{textDecoration:'underline'}}>Gestão de Eventos</Link></p><p className="bravo-warning">Não representa homologação concluída: validar migrations, APIs, permissões, telas e evidências no Preview antes de qualquer publicação operacional.</p></div></main>;
}
