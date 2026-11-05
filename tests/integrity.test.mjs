import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('A matriz original Financeiro e RH permanece legível', () => {
  const rows = read('reference/matriz-149-original.csv').trim().split(/\r?\n/);
  assert(rows.length >= 150, 'Matriz não preserva 149 funções');
});

test('O Prisma mescla P06 com o único núcleo', () => {
  const schema = read('prisma/schema.prisma');
  for (const model of [
    'BravoIdentityUser',
    'BravoIdentitySession',
    'BravoProducer',
    'BravoEvent',
    'BravoEventFee',
    'BravoEventApproval',
    'BravoPublication',
    'BravoAudit',
    'BravoOutbox',
  ]) {
    assert(schema.includes(`model ${model} {`));
  }
  assert.equal((schema.match(/datasource db/g) || []).length, 1);
});

test('Não criar tabela paralela de RH ou Financeiro', () => {
  const schema = read('prisma/schema.prisma');
  assert(!schema.includes('model DemoRh'));
  assert(!schema.includes('model MockFinance'));
});

test('Aplicação impede operações externas em ambiente de homologação', () => {
  const main = read('apps/api/src/main.ts');
  const policy = read('packages/core-policy/src/index.ts');
  assert(main.includes('validateHomologationEnv'));
  for (const flag of ['ENABLE_EXTERNAL_PUBLICATION', 'ENABLE_REAL_PAYMENTS', 'ENABLE_REAL_REFUNDS']) {
    assert(policy.includes(flag));
  }
});

test('Rotas de produtor, evento e taxa permanecem no pacote', () => {
  const controller = read('apps/api/src/modules/pacote06/pacote06.controller.ts');
  for (const phrase of ['comercial/produtores', "'eventos'", 'comercial/eventos/:eventId/taxas']) {
    assert(controller.includes(phrase));
  }
});

test('Pacote 06 usa injeção do banco central Core', () => {
  const service = read('apps/api/src/modules/pacote06/pacote06.service.ts');
  assert(service.includes('DatabaseService'));
  const module = read('apps/api/src/modules/pacote06/pacote06.module.ts');
  assert(!module.includes('P06PrismaService'));
});

test('Frontend usa sessão same-origin e CSRF', () => {
  const api = read('apps/backoffice/src/lib/bravo-api.ts');
  assert(api.includes("credentials: 'same-origin'"));
  assert(api.includes('X-CSRF-Token'));
});

test('Não há senha/usuário simulado no login', () => {
  const login = read('apps/backoffice/src/app/login/page.tsx');
  assert(!login.includes('123456'));
});

test('Exige autenticação e origem nos endpoints', () => {
  const security = read('apps/api/src/common/auth/auth.guard.ts');
  assert(security.includes('originAllowed'));
  assert(security.includes('csrfForToken'));
  assert(security.includes('req.actor'));
});
