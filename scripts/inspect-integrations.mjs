/** Inspeção estática local sem conectar ao banco ou Gemini e SEM imprimir credenciais. */
import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
if(process.env.BRAVO_ENV==='HOMOLOGACAO'&&process.env.DATABASE_URL){
 let u;try{u=new URL(process.env.DATABASE_URL)}catch{throw Error('DATABASE_URL inválida')}
 if(!['postgresql:','postgres:'].includes(u.protocol))throw Error('DATABASE_URL deve ser PostgreSQL');
 if(!/(hml|homolog|preview)/i.test(decodeURIComponent(u.pathname)))throw Error('DATABASE_URL não indica banco de homologação');
 if(!u.hostname.includes('-pooler'))console.warn('ATENÇÃO: hostname da URL de aplicação não contém -pooler. Conferir conexão no Neon.');
 const ssl=u.searchParams.get('sslmode');
 if(!['require','verify-full'].includes(ssl||''))console.warn('ATENÇÃO: conferir configuração TLS sslmode=require.');
 console.log('Banco HML previsto: nome',decodeURIComponent(u.pathname), '| SSL:',ssl||'não definido');
}else console.log('DATABASE_URL ou BRAVO_ENV ainda não configurados. Sem conexão de banco.');
if(process.env.BRAVO_GEMINI_ENABLED==='true'){
 const apiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
 if(apiKey.length<20||!/^[a-zA-Z0-9._-]{3,100}$/.test(process.env.GEMINI_MODEL||''))throw Error('Gemini habilitado sem credenciais/modelo válidos');
 console.log('Gemini: habilitado por configuração; chamada real não realizada.');
}else console.log('Gemini: desabilitado — nenhuma chamada externa.');
console.log('Resultado: inspeção estática. Não comprova banco conectado, migrations nem chave Gemini válida.');
