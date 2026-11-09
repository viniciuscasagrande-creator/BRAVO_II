import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const base = 'apps/backoffice/src';
const cat = JSON.parse(readFileSync(base + '/modules/financeiro-disk-video/catalogo.json', 'utf8'));
const workspace = readFileSync(base + '/modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx', 'utf8');
const shell = readFileSync(base + '/components/bravo-shell.tsx', 'utf8');
const controller = readFileSync('apps/api/src/modules/finance/financeiro-video.controller.ts', 'utf8');

test('Catálogo do vídeo possui 96 telas únicas distribuídas em 15 grupos', () => {
  assert.equal(cat.screenCount, 96);
  assert.equal(cat.screens.length, 96);
  assert.equal(new Set(cat.screens.map((s) => s.id)).size, 96);
  assert.equal(cat.groups, 15);
});

test('Rotas Next.js /financeiro/operacoes e componentes do módulo existem', () => {
  for (const p of [
    'app/financeiro/operacoes/page.tsx',
    'app/financeiro/operacoes/[...slug]/page.tsx',
    'modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx',
    'modules/financeiro-disk-video/FinanceiroVideoExtras.tsx',
    'modules/financeiro-disk-video/catalogo.ts',
    'modules/financeiro-disk-video/financeiro-video.css',
  ]) {
    assert.ok(existsSync(base + '/' + p), p);
  }
});

test('Workspace exige finance:read, exibe estado API pendente e não inventa valores', () => {
  assert.match(workspace, /finance:read/);
  assert.match(workspace, /API pendente/);
  assert.doesNotMatch(workspace, /Math\.random\(|R\$ 1\./);
  assert.match(shell, /Operação Financeira — Todos os Módulos/);
});

test('FinanceiroVideoController protege rota com AuthGuard, finance:read, bloqueio PDT e trilha de auditoria', () => {
  assert.match(controller, /@UseGuards\(AuthGuard\)/);
  assert.match(controller, /@RequirePermission\('finance:read'\)/);
  assert.match(controller, /PRODUTOR_PDT/);
  assert.match(controller, /ROTINA_EM_IMPLANTACAO/);
  assert.match(controller, /financeiro\.operacoes\.read/);
});
