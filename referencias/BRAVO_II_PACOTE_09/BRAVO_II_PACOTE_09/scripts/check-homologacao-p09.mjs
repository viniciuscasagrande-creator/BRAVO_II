/** Verificação somente leitura de um PostgreSQL REAL. Não substitui E2E de checkout. */
import path from 'node:path';import process from 'node:process';import {fileURLToPath} from 'node:url';
import {validateHomologationEnv} from '../packages/core-policy/dist/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env'));}catch{}
const errors=validateHomologationEnv(process.env);
if(errors.length){console.error('Ambiente de homologação inválido:',errors.join(' | '));process.exit(1);}
let PrismaClient;
try{({PrismaClient}=await import('@prisma/client'));}catch{console.error('Prisma ausente. Instale dependências e execute npm run db:generate.');process.exit(1);}
const prisma=new PrismaClient();
try{
 const [version]=await prisma.$queryRaw`SELECT current_database() AS database, current_user AS username, version() AS version`;
 const dbName=String(version.database||'');
 if(!/(hml|homolog|preview)/i.test(dbName))throw Error('Banco incorreto. Não é homologação.');
 const tables=await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
 const names=new Set(tables.map(t=>t.table_name));
 const required=['BravoProducer','BravoEvent','BravoCustomer','BravoSaleOrder','BravoCheckoutAttempt','BravoPdvTerminal','BravoPdvShift','BravoIdentityUser'];
 const missing=required.filter(t=>!names.has(t));
 if(missing.length)throw Error('Migrations pendentes: '+missing.join(', '));
 const pg=String(version.version||'').match(/PostgreSQL\s+([\d.]+)/i)?.[1]||'versão não identificada';
 console.log(JSON.stringify({status:'APROVADA_SOMENTE_LEITURA',database:dbName,postgres:pg,requiredTables:required.length,missingTables:[]},null,2));
 console.log('Atenção: NÃO comprova login E2E, concorrência, webhook, captura, PDV ou execução de pagamentos.');
}catch(e){console.error('REPROVADA:',e.message);process.exitCode=1;}
finally{await prisma.$disconnect();}
