#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateHomologationEnv} from '../packages/core-policy/dist/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const has=(p)=>fs.existsSync(path.join(root,p));
if(has('.env'))process.loadEnvFile(path.join(root,'.env'));
const stage=(process.argv.find(v=>v.startsWith('--stage='))||'--stage=config').split('=')[1];
const errors=validateHomologationEnv(process.env);
const warnings=[];
const required=['prisma/schema.prisma','apps/api/src/main.ts','apps/backoffice/src/app/login/page.tsx','reference/matriz-149-original.csv'];
for(const file of required)if(!has(file))errors.push('Arquivo não localizado: '+file);
let database;try{database=new URL(process.env.DATABASE_URL||'')}catch{}
if(database&&process.env.POSTGRES_PASSWORD && process.env.POSTGRES_PASSWORD!=='SUBSTITUA_SENHA' && decodeURIComponent(database.password)!==process.env.POSTGRES_PASSWORD){
 warnings.push('POSTGRES_PASSWORD e DATABASE_URL têm senhas diferentes (podem ser serviços distintos; verifique o alvo)');
}
if(process.env.POSTGRES_PASSWORD==='SUBSTITUA_SENHA'||(database?.password==='SUBSTITUA_SENHA'))errors.push('Substitua a senha de exemplo por uma senha real antes de subir o banco');
let api;try{api=new URL(process.env.BRAVO_API_URL||'');if(!['http:','https:'].includes(api.protocol))throw Error()}catch{errors.push('BRAVO_API_URL deve apontar ao backend NestJS e conter http(s)');}
let origin;try{origin=new URL(process.env.APP_ORIGIN||'')}catch{}
if(api&&origin&&api.origin===origin.origin)errors.push('BRAVO_API_URL não pode apontar ao próprio frontend (loop em /v1)');
if(stage==='ready'||stage==='all'){
 if(!has('node_modules/@nestjs/core'))errors.push('Dependências não instaladas: execute npm install');
 if(!has('node_modules/@prisma/client'))errors.push('Cliente Prisma ausente: execute npm run db:generate');
 if(!has('apps/api/dist/main.js'))errors.push('API não compilada: execute npm run build:api');
 if(!has('apps/backoffice/.next/BUILD_ID'))errors.push('Frontend não compilado: execute npm run build:web');
 const migrations=path.join(root,'prisma/migrations');
 if(!fs.existsSync(migrations)||!fs.readdirSync(migrations,{withFileTypes:true}).some(e=>e.isDirectory()))errors.push('Migrations não geradas: execute prisma migrate dev APENAS em banco local vazio');
}
if(!has('apps/backoffice/.env.local'))warnings.push('Arquivo apps/backoffice/.env.local não encontrado: crie a partir do .env.example');
console.log('BRAVO_II | Pré-verificação '+stage+' | '+(errors.length?'REPROVADA':'APROVADA'));
for(const msg of errors)console.error('ERRO:',msg);
for(const msg of warnings)console.warn('ATENÇÃO:',msg);
console.log('Ambiente:',process.env.BRAVO_ENV||'(não definido)','| Banco:',database?decodeURIComponent(database.pathname):'(não configurado)','| Origem:',origin?.origin||'(não configurada)');
process.exitCode=errors.length?1:0;
