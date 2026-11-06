'use client';
import {FormEvent,useEffect,useState} from 'react';
import {get,post} from '../../../lib/bravo-api';
type Status={habilitada:boolean;areas:string[];modo:string;dadosReais:boolean};
type Reply={resposta:string;modelo:string;aviso:string};
const labels:Record<string,string>={GERAL:'Orientação geral',COMERCIAL:'Comercial',EVENTOS:'Eventos',SAC:'SAC',FINANCEIRO:'Financeiro Disk',RH:'RH e DP'};
export default function AssistantGemini(){
 const [status,setStatus]=useState<Status|null>(null),[area,setArea]=useState('GERAL');
 const [pergunta,setPergunta]=useState(''),[resposta,setResposta]=useState<Reply|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{get<Status>('ia/status').then(s=>{setStatus(s);if(!s.areas.includes('GERAL'))setArea(s.areas[0]||'')}).catch(e=>setError(e.message));},[]);
 async function ask(e:FormEvent){e.preventDefault();setBusy(true);setError('');setResposta(null);
 try{const r=await post<Reply>('ia/consultar',{area,pergunta});setResposta(r);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <main className="p10" style={{maxWidth:1050}}><h1>Assistente Gemini — BRAVO_II</h1><p>Orientação interna para processos do ERP. Responde em português e não altera dados nem executa ações.</p>
 <div className="bravo-panel"><strong>Ambiente: homologação</strong><p>Integração: {status===null?'Verificando...':status.habilitada?'Gemini habilitado no servidor':'Gemini ainda desativado ou sem credenciais'}</p>
 <p className="bravo-warning">Não digite CPF, CNPJ, nomes de clientes, dados de colaboradores, senhas, informações bancárias ou identificadores privados. A pergunta será enviada ao serviço Google Gemini. Nenhuma consulta automática ao banco de dados será realizada.</p>
 {error&&<p role="alert" style={{color:'#a52727'}}>{error}</p>}
 <form className="p10-form" onSubmit={ask}><label>Área autorizada<select value={area} onChange={e=>setArea(e.target.value)}>{(status?.areas||[]).map(x=><option key={x} value={x}>{labels[x]||x}</option>)}</select></label>
 <label>Pergunta sem informações pessoais<textarea rows={5} maxLength={1200} minLength={8} required value={pergunta} onChange={e=>setPergunta(e.target.value)} placeholder="Exemplo: quais verificações devem ocorrer antes de aprovar a publicação de um evento?"/></label>
 <button disabled={!status?.habilitada||!area||busy}>{busy?'Consultando...':'Consultar Gemini'}</button></form>
 {resposta&&<section aria-live="polite" className="bravo-panel" style={{marginTop:20,whiteSpace:'pre-wrap'}}><h2>Orientação recebida</h2><p>{resposta.resposta}</p><small>{resposta.aviso} Modelo: {resposta.modelo}.</small></section>}
 </div></main>;
}
