#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateHomologationEnv } = require('../packages/core-policy/dist/index.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = (p) => fs.existsSync(path.join(root, p));
if (has('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(path.join(root, '.env'));
}

const stage = (process.argv.find((v) => v.startsWith('--stage=')) || '--stage=config').split('=')[1];
const errors = validateHomologationEnv(process.env);
const warnings = [];

const required = [
  'prisma/schema.prisma',
  'apps/api/src/main.ts',
  'apps/backoffice/src/app/login/page.tsx',
  'reference/matriz-149-original.csv',
];
for (const file of required) {
  if (!has(file)) errors.push('Arquivo não localizado: ' + file);
}

let database;
try {
  database = new URL(process.env.DATABASE_URL || '');
} catch {}

if (
  database &&
  process.env.POSTGRES_PASSWORD &&
  process.env.POSTGRES_PASSWORD !== 'SUBSTITUA_SENHA' &&
  decodeURIComponent(database.password) !== process.env.POSTGRES_PASSWORD
) {
  warnings.push('POSTGRES_PASSWORD e DATABASE_URL têm senhas diferentes (podem ser serviços distintos; verifique o alvo)');
}

if (process.env.POSTGRES_PASSWORD === 'SUBSTITUA_SENHA' || database?.password === 'SUBSTITUA_SENHA') {
  errors.push('Substitua a senha de exemplo por uma senha real antes de subir o banco');
}

let api;
try {
  api = new URL(process.env.BRAVO_API_URL || '');
  if (!['http:', 'https:'].includes(api.protocol)) throw Error();
} catch {
  errors.push('BRAVO_API_URL deve apontar ao backend NestJS e conter http(s)');
}

let origin;
try {
  origin = new URL(process.env.APP_ORIGIN || '');
} catch {}

if (api && origin && api.origin === origin.origin) {
  errors.push('BRAVO_API_URL não pode apontar ao próprio frontend (loop em /v1)');
}

if (process.env.ENABLE_PDV_OPERATIONS === 'true') {
  errors.push('Ativação PDV exige homologação formal e não é permitida neste pacote');
}
if (process.env.ENABLE_PAGBANK_SANDBOX === 'true' && !process.env.PAGBANK_SANDBOX_TOKEN) {
  errors.push('Sandbox PagBank ativado sem token');
}

if (stage === 'ready' || stage === 'all') {
  if (!has('node_modules/@nestjs/core') && !has('apps/api/node_modules/@nestjs/core')) {
    errors.push('Dependências não instaladas: execute pnpm install / npm install');
  }
  if (!has('apps/api/dist/main.js')) {
    errors.push('API não compilada: execute pnpm build / npm run build:api');
  }
  if (!has('apps/backoffice/.next/BUILD_ID')) {
    errors.push('Frontend não compilado: execute pnpm build / npm run build:web');
  }
  const sqlMigrations = path.join(root, 'database/migrations');
  const prismaMigrations = path.join(root, 'prisma/migrations');
  const hasSqlMigrations =
    fs.existsSync(sqlMigrations) && fs.readdirSync(sqlMigrations).some((f) => f.endsWith('.up.sql'));
  const hasPrismaMigrations =
    fs.existsSync(prismaMigrations) &&
    fs.readdirSync(prismaMigrations, { withFileTypes: true }).some((e) => e.isDirectory());
  if (!hasSqlMigrations && !hasPrismaMigrations) {
    errors.push('Migrations não geradas/localizadas');
  }
}

if (!has('apps/backoffice/.env.local')) {
  warnings.push('Arquivo apps/backoffice/.env.local não encontrado: crie a partir do .env.example');
}

console.log('BRAVO_II | Pré-verificação ' + stage + ' | ' + (errors.length ? 'REPROVADA' : 'APROVADA'));
for (const msg of errors) console.error('ERRO:', msg);
for (const msg of warnings) console.warn('ATENÇÃO:', msg);
console.log(
  'Ambiente:',
  process.env.BRAVO_ENV || '(não definido)',
  '| Banco:',
  database ? decodeURIComponent(database.pathname) : '(não configurado)',
  '| Origem:',
  origin?.origin || '(não configurada)'
);
process.exitCode = errors.length ? 1 : 0;
