import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const base = 'apps/backoffice/src';
const cat = JSON.parse(readFileSync(base + '/modules/financeiro-disk-video/catalogo.json', 'utf8'));
const workspace = readFileSync(base + '/modules/financeiro-disk-video/FinanceiroVideoWorkspace.tsx', 'utf8');
const css = readFileSync(base + '/modules/financeiro-disk-video/financeiro-video.css', 'utf8');
const shell = readFileSync(base + '/components/bravo-shell.tsx', 'utf8');
const contracts = readFileSync('packages/contracts/src/index.ts', 'utf8');
const controller = readFileSync('apps/api/src/modules/finance/financeiro-video.controller.ts', 'utf8');

test('Catálogo do vídeo possui 96 telas únicas distribuídas em 15 grupos', () => {
  assert.equal(cat.screenCount, 96);
  assert.equal(cat.screens.length, 96);
  assert.equal(new Set(cat.screens.map((s) => s.id)).size, 96);
  assert.equal(cat.groups, 15);
});

test('Rotas Next.js /financeiro/operacoes e componentes do módulo existem e exportam generateStaticParams para as 96 telas', () => {
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
  const slugPage = readFileSync(base + '/app/financeiro/operacoes/[...slug]/page.tsx', 'utf8');
  assert.match(slugPage, /export function generateStaticParams\(\)/);
  assert.match(slugPage, /FINANCEIRO_TELAS\.map/);
});

test('Menu Financeiro possui os 15 módulos individuais ordenados (01 a 15) e Dashboard de Cards sem menu único genérico', () => {
  assert.match(workspace, /finance:read/);
  assert.match(workspace, /API pendente/);
  assert.match(workspace, /MÓDULO/);
  assert.doesNotMatch(workspace, /Math\.random\(|R\$ 1\./);
  assert.doesNotMatch(shell, /Operação Financeira — Todos os Módulos/);
  assert.match(css, /\.bf-modulebar\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
  assert.doesNotMatch(css, /\.bf-modulebar\s*\{[^}]*overflow-x:\s*auto/);
  for (const label of [
    '00 · Painel de Cards (15 Módulos)',
    '01 · Produtores e Eventos',
    '02 · Solicitações e Aprovações',
    '03 · Recebíveis e Liquidações',
    '04 · Gateways e Adquirentes',
    '05 · Taxas e Regras Comerciais',
    '06 · Tesouraria e Contas Bancárias',
    '07 · Conciliação',
    '08 · Estornos e Cancelamentos',
    '09 · Fechamentos e Borderôs',
    '10 · Controladoria e Planejamento',
    '11 · Fornecedores e Contratos',
    '12 · Ledger Financeiro',
    '13 · Relatórios Financeiros',
    '14 · Central de Assinaturas',
    '15 · Governança Financeira',
  ]) {
    assert.ok(contracts.includes(label), `Menu individual ausente: ${label}`);
  }
});

test('FinanceiroVideoController protege rota com AuthGuard, finance:read, bloqueio PDT e trilha de auditoria', () => {
  assert.match(controller, /@UseGuards\(AuthGuard\)/);
  assert.match(controller, /@RequirePermission\('finance:read'\)/);
  assert.match(controller, /PRODUTOR_PDT/);
  assert.match(controller, /ROTINA_EM_IMPLANTACAO/);
  assert.match(controller, /financeiro\.operacoes\.read/);
});
