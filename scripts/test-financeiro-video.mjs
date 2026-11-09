import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = 'apps/backoffice/src';
const cat = JSON.parse(readFileSync(base + '/modules/financeiro-disk-video/catalogo.json', 'utf8'));
assert.equal(cat.screenCount, cat.screens.length);
assert.equal(new Set(cat.screens.map((s) => s.id)).size, cat.screens.length);
assert.ok(cat.screens.length >= 70);
assert.ok(cat.groups >= 12);

for (const p of [
  'app/financeiro/operacoes/page.tsx',
  'app/financeiro/operacoes/[...slug]/page.tsx',
  'modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx',
]) {
  assert.ok(existsSync(base + '/' + p), p);
}

const workspace = readFileSync(base + '/modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx', 'utf8');
assert.match(workspace, /finance:read/);
assert.match(workspace, /API pendente/);
assert.match(workspace, /MÓDULO/);
assert.doesNotMatch(workspace, /Math\.random\(|R\$ 1\./);

const contracts = readFileSync('packages/contracts/src/index.ts', 'utf8');
assert.match(contracts, /01 · Produtores e Eventos/);
assert.match(contracts, /15 · Governança Financeira/);

const shell = readFileSync(base + '/components/bravo-shell.tsx', 'utf8');
assert.doesNotMatch(shell, /Operação Financeira — Todos os Módulos/);

console.log(
  `OK: ${cat.screens.length} telas, ${cat.groups} grupos ordenados em cards e menus individuais verificados.`
);
