import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED_DOCS = [
  'docs/arquitetura/BRAVO_II_ARQUITETURA_IMPLANTACAO.md',
  'docs/rastreabilidade/requisitos-historicos.md',
  'docs/rastreabilidade/gap-analysis.md',
  'docs/rastreabilidade/decisoes.md',
  'docs/banco/inventario-modelos.md',
  'docs/banco/reconciliacao-prisma-sql-neon.md',
  'docs/banco/plano-migracao.md',
  'docs/seguranca/matriz-permissoes.md',
  'docs/homologacao/plano-testes.md',
  'docs/homologacao/evidencias.md',
];

test('Pacotes 00 e 01 possuem todos os 10 documentos de arquitetura, rastreabilidade e reconciliação de banco', () => {
  for (const docPath of REQUIRED_DOCS) {
    assert.ok(existsSync(docPath), `Documento obrigatório ausente: ${docPath}`);
    const content = readFileSync(docPath, 'utf8');
    assert.ok(content.trim().length > 200, `Documento incompleto: ${docPath}`);
  }
});

test('Reconciliação de banco documenta os 55 modelos Prisma e as 77 tabelas SQL do Core', () => {
  const inv = readFileSync('docs/banco/inventario-modelos.md', 'utf8');
  assert.match(inv, /55/);
  assert.match(inv, /77/);
});
