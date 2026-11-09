/** Operação manual exclusiva do VS Code/CI autorizado, nunca no build Vercel. */
import {existsSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if(existsSync('.env'))process.loadEnvFile('.env');
const flags=['ENABLE_EXTERNAL_PUBLICATION','ENABLE_REAL_PAYMENTS','ENABLE_REAL_REFUNDS'];
if(process.env.BRAVO_ENV!=='HOMOLOGACAO'||flags.some(f=>process.env[f]!=='false'))throw Error('Migração recusada: ambiente inseguro');
const p=(raw)=>{try{return new URL(raw)}catch{throw Error('URL do banco inválida')}};
const direct=p(process.env.DIRECT_URL),pooled=p(process.env.DATABASE_URL);
for(const u of [direct,pooled]){
  if(!['postgresql:','postgres:'].includes(u.protocol))throw Error('Driver não PostgreSQL');
  if(decodeURIComponent(u.pathname)!=='/bravo_ii_hml')throw Error('Permitido somente banco bravo_ii_hml');
}
if(decodeURIComponent(direct.pathname)!==decodeURIComponent(pooled.pathname))throw Error('Banco do pooler difere do banco direto');
// Fonte executável canônica: SQL versionado em database/migrations. Prisma é representação de schema.
const migrations='database/migrations';
if(!existsSync(migrations)||!readdirSync(migrations).some(x=>x.endsWith('.up.sql')))throw Error('Não existem migrations SQL versionadas em database/migrations.');
if(!process.argv.includes('--apply'))throw Error('Execução cancelada. Para aplicar conscientemente, use --apply');
if(process.env.VERCEL==='1')throw Error('Migração recusada dentro da Vercel');
console.log('Executando migrations no banco exclusivo de homologação:',decodeURIComponent(direct.pathname));
const r=spawnSync(process.execPath,['apps/api/dist/scripts/run-migrations.js'],{stdio:'inherit',env:{...process.env,DATABASE_URL:direct.toString()}});
if(r.error)throw r.error;
process.exit(r.status??1);
