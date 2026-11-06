import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const required = [
  'apps/backoffice/vercel.json',
  'apps/api/vercel.json',
  'apps/backoffice/src/app/v1/[...path]/route.ts',
  'apps/api/src/core/security/proxy-guard.ts',
  'apps/api/src/main.ts',
  'apps/backoffice/next.config.mjs',
  'prisma/schema.prisma',
  'pnpm-lock.yaml',
  'reference/matriz-149-original.csv',
  'reference/catalogo-149-original.json',
];

const errors = [];
for (const f of required) {
  if (!existsSync(f)) errors.push('Ausente: ' + f);
}

for (const f of ['apps/backoffice/vercel.json', 'apps/api/vercel.json']) {
  try {
    const conf = JSON.parse(readFileSync(f, 'utf8'));
    if (!conf.buildCommand || !conf.installCommand) {
      errors.push('Configuração incompleta: ' + f);
    } else if (!conf.installCommand.includes('pnpm') || !conf.buildCommand.includes('pnpm')) {
      errors.push('Gerenciador divergente em ' + f + ': esperado pnpm em installCommand e buildCommand');
    }
  } catch (e) {
    errors.push('JSON inválido em ' + f + ': ' + e.message);
  }
}

if (existsSync('pnpm-lock.yaml')) {
  const lockRaw = readFileSync('pnpm-lock.yaml', 'utf8');
  if (lockRaw.startsWith('---') || lockRaw.includes('\n---\n') || (lockRaw.match(/^lockfileVersion:/gm) || []).length !== 1) {
    errors.push('pnpm-lock.yaml inválido: deve ser documento YAML único sem múltiplos streams (---)');
  }
}

const canonicalHashes = {
  'reference/matriz-149-original.csv': '5f17423ad54b33ee368c0cf42a16e3522ad006433eef0f70d71d33dca985cd7c',
  'reference/catalogo-149-original.json': 'ef759c31447956ea0aa672a87b97549b6aff0aa4cb09d1a984eef244d574c2e7',
};
for (const [file, expectedHash] of Object.entries(canonicalHashes)) {
  if (existsSync(file)) {
    const actualHash = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (actualHash !== expectedHash) {
      errors.push(`Hash divergente em ${file}: esperado ${expectedHash}, obtido ${actualHash}`);
    }
  }
}

const web = readFileSync('apps/backoffice/next.config.mjs', 'utf8');
if (web.includes('rewrites()')) errors.push('Rewrite externo legado deve ser removido em favor do BFF');

const bff = readFileSync('apps/backoffice/src/app/v1/[...path]/route.ts', 'utf8');
for (const check of ['BRAVO_PROXY_KEY', 'no-store', 'content-length', 'origin']) {
  if (!bff.includes(check)) errors.push('Proteção ausente no BFF: ' + check);
}

const migrations =
  existsSync('prisma/migrations') &&
  readdirSync('prisma/migrations', { withFileTypes: true }).some((d) => d.isDirectory());

console.log('Estrutura para Vercel:', errors.length ? 'REPROVADA' : 'VALIDADA');
console.log('Migrations versionadas:', migrations ? 'PRESENTES' : 'PENDENTES — NÃO EXECUTAR DEPLOY OPERACIONAL');
if (errors.length) {
  for (const e of errors) console.error('ERRO', e);
  process.exitCode = 1;
}
