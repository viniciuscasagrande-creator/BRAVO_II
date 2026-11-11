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
  assert(!login.includes('BravoLocal#'));
  assert(!login.includes('quickCredentials'));
  const rh = read('apps/backoffice/src/app/rh/page.tsx');
  assert(!rh.includes('BravoLocal#'));
});

test('Exige autenticação e origem nos endpoints', () => {
  const security = read('apps/api/src/common/auth/auth.guard.ts');
  assert(security.includes('originAllowed'));
  assert(security.includes('csrfForToken'));
  assert(security.includes('req.actor'));
});

test('Coerência visual: todas as classes CSS do bravo-shell e componentes P06 existem em bravo-p06.css', () => {
  const css = read('apps/backoffice/src/components/bravo-p06.css');
  const defined = new Set([...css.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]));
  const shell = read('apps/backoffice/src/components/bravo-shell.tsx');
  const requiredClasses = [
    'bravo-app-shell',
    'bravo-sidebar',
    'bravo-sidebar-brand',
    'bravo-brand-mark',
    'bravo-brand-copy',
    'bravo-brand-title',
    'bravo-brand-subtitle',
    'bravo-collapse-btn',
    'bravo-sidebar-search',
    'bravo-sidebar-nav',
    'bravo-sidebar-section-label',
    'bravo-nav-list',
    'bravo-nav-group',
    'bravo-nav-row',
    'bravo-nav-link',
    'bravo-nav-icon',
    'bravo-nav-text',
    'bravo-nav-title',
    'bravo-nav-caption',
    'bravo-nav-expand',
    'bravo-nav-sublist',
    'bravo-nav-sublink',
    'bravo-nav-subdot',
    'bravo-sidebar-footer',
    'bravo-session-card',
    'bravo-session-status-row',
    'bravo-status-dot',
    'bravo-session-status-text',
    'bravo-session-user',
    'bravo-session-role',
    'bravo-session-actions',
    'bravo-sidebar-btn',
    'bravo-collapsed-auth',
    'bravo-main-column',
    'bravo-topbar',
    'bravo-breadcrumbs',
    'bravo-breadcrumb-sep',
    'bravo-breadcrumb-item',
    'bravo-topbar-right',
    'bravo-env-pill',
    'bravo-popover-backdrop',
    'bravo-topbar-icon-svg',
    'bravo-notif-wrap',
    'bravo-notif-btn',
    'bravo-notif-badge',
    'bravo-notif-popover',
    'bravo-user-wrap',
    'bravo-user-btn',
    'bravo-user-status-badge',
    'bravo-user-popover',
    'bravo-user-pill',
    'bravo-user-avatar',
    'bravo-user-meta',
    'bravo-topbar-logout',
    'bravo-topbar-login-btn',
    'bravo-workspace',
    'bravo-tab-btn',
    'p06-card',
    'p06-badge',
    'p06-table',
    'ok',
    'warn',
    'info',
    'is-active',
    'is-collapsed',
    'is-current',
    'is-online',
    'is-preview',
    'is-primary',
    'is-secondary',
  ];
  for (const cls of requiredClasses) {
    assert(defined.has(cls), `Classe CSS .${cls} ausente em bravo-p06.css`);
  }
  assert(!shell.includes("'Brief'"), 'Ícones improvisados de texto removidos do menu');
});

test('Configuração de cache Next.js preserva imutabilidade de _next/static e documentação usa pnpm', () => {
  const nextConf = read('apps/backoffice/next.config.mjs');
  assert(nextConf.includes('_next/static'));
  assert(nextConf.includes('immutable'));
  const readmeVercel = read('README-VERCEL.md');
  assert(!/\bnpm\s+(install|run|ci)\b/.test(readmeVercel));
  assert(readmeVercel.includes('pnpm install --frozen-lockfile'));
});
