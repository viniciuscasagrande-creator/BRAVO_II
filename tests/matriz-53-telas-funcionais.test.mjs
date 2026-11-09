import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appDir = path.join(root, 'apps/backoffice/src/app');

const MATRIX_53_SCREENS = [
  // A. Comercial e Produtores (7)
  ['COM-01', 'comercial/produtores/page.tsx'],
  ['COM-02', 'comercial/produtores/novo/page.tsx'],
  ['COM-03', 'comercial/produtores/[id]/page.tsx'],
  ['COM-04', 'comercial/aprovacoes/page.tsx'],
  ['COM-05', 'comercial/negociacoes/page.tsx'],
  ['COM-06', 'comercial/contratos/page.tsx'],
  ['COM-07', 'comercial/beneficiarios/page.tsx'],
  // B. Eventos, Sessões, Lotes e Ingressos (10)
  ['EVT-01', 'eventos/page.tsx'],
  ['EVT-02', 'eventos/novo/page.tsx'],
  ['EVT-03', 'eventos/[id]/page.tsx'],
  ['EVT-04', 'eventos/[id]/sessoes/page.tsx'],
  ['EVT-05', 'eventos/[id]/lotes/page.tsx'],
  ['EVT-06', 'eventos/[id]/ingressos/page.tsx'],
  ['EVT-07', 'eventos/[id]/cupons/page.tsx'],
  ['EVT-08', 'eventos/[id]/cortesias/page.tsx'],
  ['EVT-09', 'eventos/[id]/aprovacoes/page.tsx'],
  ['EVT-10', 'eventos/locais/page.tsx'],
  // C. Mapas, Assentos e Reservas (4)
  ['MAP-01', 'mapas/page.tsx'],
  ['MAP-02', 'eventos/[id]/mapa/page.tsx'],
  ['MAP-03', 'eventos/[id]/reservas/page.tsx'],
  ['MAP-04', 'relatorios/assentos/page.tsx'],
  // D. Pedidos, Vendas, Checkout e Pagamentos (8)
  ['PED-01', '(erp)/pedidos/page.tsx'],
  ['PED-02', '(erp)/pedidos/[id]/page.tsx'],
  ['PED-03', '(erp)/pedidos/novo/page.tsx'],
  ['PED-04', '(erp)/pedidos/reservas/page.tsx'],
  ['PED-05', 'vendas/descontos/page.tsx'],
  ['PED-06', 'pagamentos/page.tsx'],
  ['PED-07', 'pagamentos/configuracoes/page.tsx'],
  ['PED-08', '(erp)/pedidos/transferencias/page.tsx'],
  // E. PDV, Bilheteria e Portaria (8)
  ['PDV-01', '(erp)/pdv/pontos/page.tsx'],
  ['PDV-02', '(erp)/pdv/operadores/page.tsx'],
  ['PDV-03', '(erp)/pdv/caixa/page.tsx'],
  ['PDV-04', '(erp)/pdv/vendas/page.tsx'],
  ['PRT-01', 'portaria/validacoes/page.tsx'],
  ['PRT-02', 'portaria/validadores/page.tsx'],
  ['PRT-03', 'portaria/regras/page.tsx'],
  ['PRT-04', 'portaria/facial/page.tsx'],
  // F. Financeiro, Atendimento, Relatórios e Administração (16)
  ['FIN-01', 'financeiro/page.tsx'],
  ['FIN-02', 'financeiro/ledger/page.tsx'],
  ['FIN-03', 'financeiro/repasses/page.tsx'],
  ['FIN-04', 'financeiro/despesas/page.tsx'],
  ['FIN-05', 'financeiro/borderos/page.tsx'],
  ['FIN-06', 'financeiro/conciliacao/page.tsx'],
  ['SAC-01', '(erp)/sac/clientes/page.tsx'],
  ['SAC-02', '(erp)/sac/ocorrencias/page.tsx'],
  ['SAC-03', '(erp)/sac/reenvios/page.tsx'],
  ['REL-01', 'relatorios/page.tsx'],
  ['REL-02', 'relatorios/vendas/page.tsx'],
  ['REL-03', 'relatorios/acessos/page.tsx'],
  ['ADM-01', 'administracao/usuarios/page.tsx'],
  ['ADM-02', 'administracao/tarefas/page.tsx'],
  ['AUD-01', 'auditoria/logs/page.tsx'],
  ['AUD-02', 'auditoria/integracoes/page.tsx'],
];

test('Matriz Obrigatória possui exatamente 53 telas funcionais existentes no Next.js e sem placeholders proibidos', () => {
  assert.equal(MATRIX_53_SCREENS.length, 53);

  const matrizDoc = fs.readFileSync(path.join(root, 'docs/implantacao/MATRIZ_TELAS_BRAVO_II.md'), 'utf8');
  const evidDoc = fs.readFileSync(path.join(root, 'docs/implantacao/EVIDENCIAS_TELAS.md'), 'utf8');

  for (const [id, relPage] of MATRIX_53_SCREENS) {
    assert.match(matrizDoc, new RegExp(id), `MATRIZ_TELAS_BRAVO_II.md deve documentar ${id}`);
    const fullPath = path.join(appDir, relPage);
    assert.equal(fs.existsSync(fullPath), true, `Arquivo de página ausente para ${id}: ${relPage}`);

    const src = fs.readFileSync(fullPath, 'utf8');
    assert.equal(src.includes('onClick={() => {}}'), false, `Proibido onClick vazio em ${relPage}`);
    assert.equal(src.includes('href="#"'), false, `Proibido href="#" em ${relPage}`);
    assert.equal(src.includes('mockData'), false, `Proibido mockData em ${relPage}`);
  }

  assert.match(evidDoc, /53\/53 Telas Funcionais/);
});

test('Todos os itens e subitens de CANONICAL_NAVIGATION_MENU resolvem para páginas reais no app', async () => {
  const contracts = await import('../packages/contracts/dist/index.js');
  for (const menu of contracts.CANONICAL_NAVIGATION_MENU) {
    for (const sub of menu.subItems || []) {
      const cleanPath = sub.href.split('?')[0].replace(/^\//, '');
      if (!cleanPath) {
        assert.equal(fs.existsSync(path.join(appDir, 'page.tsx')), true);
        continue;
      }
      if (cleanPath.startsWith('financeiro/operacoes/')) {
        assert.equal(
          fs.existsSync(path.join(appDir, 'financeiro/operacoes/[...slug]/page.tsx')),
          true
        );
        continue;
      }
      const directCandidate = path.join(appDir, cleanPath, 'page.tsx');
      const erpCandidate = path.join(appDir, '(erp)', cleanPath, 'page.tsx');
      assert.equal(
        fs.existsSync(directCandidate) || fs.existsSync(erpCandidate),
        true,
        `Submenu '${sub.id}' (${sub.href}) não possui página Next.js correspondente`
      );
    }
  }
});
