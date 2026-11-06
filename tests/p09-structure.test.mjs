import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('149 opções originais Financeiro/RH não são modificadas', () => {
  const matrix = fs.readFileSync(path.join(root, 'reference/matriz-149-original.csv'));
  assert.equal(
    createHash('sha256').update(matrix).digest('hex'),
    '5f17423ad54b33ee368c0cf42a16e3522ad006433eef0f70d71d33dca985cd7c'
  );
  const catalog = fs.readFileSync(path.join(root, 'reference/catalogo-149-original.json'));
  assert.equal(
    createHash('sha256').update(catalog).digest('hex'),
    'ef759c31447956ea0aa672a87b97549b6aff0aa4cb09d1a984eef244d574c2e7'
  );
  const rows = matrix.toString('utf8').trim().split(/\r?\n/);
  assert(rows.length >= 150);
});

test('Bancos do RH e Financeiro não foram duplicados', () => {
  const s = read('prisma/schema.prisma');
  assert.equal((s.match(/datasource db/g) || []).length, 1);
  for (const model of [
    'BravoSaleOrder',
    'BravoCheckoutAttempt',
    'BravoPdvTerminal',
    'BravoPdvShift',
  ]) {
    assert(s.includes(`model ${model} {`));
  }
  assert(!s.includes('model MockRh'));
});

test('Nenhuma rota de webhook, captura, liquidação ou estorno é exposta no P09', () => {
  const controller = read('apps/api/src/modules/pacote09/controllers.ts');
  assert(!/['"]v1\/pagamentos\/confirmar/.test(controller));
  assert(!/\@(?:Get|Post|Patch)\(['"](?:webhook|captura|liquidar|estorno)/i.test(controller));
  assert(controller.includes("Controller('v1/checkout')"));
});

test('Sandbox fixo no domínio homologado PagBank; sem domínio configurável pelo operador', () => {
  const s = read('apps/api/src/modules/pacote09/checkout.service.ts');
  assert(s.includes('https://sandbox.api.pagseguro.com'));
  assert(!s.includes('https://api.pagseguro.com'));
  assert(s.includes('assertPagbankSandbox'));
});

test('PDV só aceita turno autenticado e flag autorizada', () => {
  const s = read('apps/api/src/modules/pacote09/pdv.service.ts');
  assert(s.includes("process.env.ENABLE_PDV_OPERATIONS!=='true'"));
  assert(s.includes('shift.operatorId!==actor.id'));
  assert(s.includes("shift.terminal.status!=='ATIVO'"));
});

test('Pacote 08 não libera PDV por solicitação simples do cliente', () => {
  const s = read('apps/api/src/modules/pacote08/order.service.ts');
  assert(s.includes("body.channel==='PDV'&&!trustedPdv"));
  assert(s.includes('trustedPdv?.terminalId'));
});

test('Menus Financeiro e RH continuam com marcador de implantação', () => {
  const s = read('packages/core-policy/src/index.ts');
  assert(s.includes("id:'financeiro'"));
  assert(s.includes("id:'rh'"));
  assert(s.includes("status:'EM_IMPLANTACAO'"));
});

test('Screens de checkout e terminal usam sessão real', () => {
  for (const p of [
    'apps/backoffice/src/app/(erp)/checkout/page.tsx',
    'apps/backoffice/src/app/(erp)/pdv/page.tsx',
  ]) {
    const s = read(p);
    assert(s.includes('currentSession'));
    assert(!s.includes('123456'));
  }
});
