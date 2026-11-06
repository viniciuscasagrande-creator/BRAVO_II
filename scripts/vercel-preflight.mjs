import {existsSync,readFileSync,readdirSync} from 'node:fs';
const required=[
 'apps/backoffice/vercel.json','apps/api/vercel.json',
 'apps/backoffice/src/app/v1/[...path]/route.ts',
 'apps/api/src/core/security/proxy-guard.ts',
 'apps/api/src/main.ts','apps/backoffice/next.config.mjs',
 'prisma/schema.prisma','reference/catalogo-149-original.json'
];
const errors=[];for(const f of required)if(!existsSync(f))errors.push('Ausente: '+f);
for(const f of ['apps/backoffice/vercel.json','apps/api/vercel.json'])try{
 const conf=JSON.parse(readFileSync(f,'utf8'));
 if(!conf.buildCommand||!conf.installCommand)errors.push('Configuração incompleta: '+f);
}catch(e){errors.push('JSON inválido em '+f+': '+e.message)}
const web=readFileSync('apps/backoffice/next.config.mjs','utf8');
if(web.includes('rewrites()'))errors.push('Rewrite externo legado deve ser removido em favor do BFF');
const bff=readFileSync('apps/backoffice/src/app/v1/[...path]/route.ts','utf8');
for(const check of ['BRAVO_PROXY_KEY','no-store','content-length','origin'])if(!bff.includes(check))errors.push('Proteção ausente no BFF: '+check);
const migrations=existsSync('prisma/migrations')&&readdirSync('prisma/migrations',{withFileTypes:true}).some(d=>d.isDirectory());
console.log('Estrutura para Vercel:',errors.length?'REPROVADA':'VALIDADA');
console.log('Migrations versionadas:',migrations?'PRESENTES':'PENDENTES — NÃO EXECUTAR DEPLOY OPERACIONAL');
if(errors.length){for(const e of errors)console.error('ERRO',e);process.exitCode=1;}
