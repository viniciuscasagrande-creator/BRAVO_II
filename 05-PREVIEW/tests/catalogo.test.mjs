import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const cat=JSON.parse(await readFile(fileURLToPath(new URL('../public/catalogo.json',import.meta.url)),'utf8'));
test('Todas as 149 funções originais aparecem no BRAVO_II',()=>{
 assert.equal(cat.opcoes.length,149);assert.equal(cat.opcoes.filter(x=>x.area==='FINANCEIRO').length,104);assert.equal(cat.opcoes.filter(x=>x.area==='RH').length,45);
});
test('16 grupos Financeiro, 1 RH e 149 rotas distintas',()=>{
 assert.equal(cat.grupos.length,17);assert.equal(cat.grupos.filter(x=>x.area==='FINANCEIRO').length,16);
 assert.equal(new Set(cat.opcoes.map(x=>x.rota)).size,149);
});
test('nenhuma função foi marcada como concluída sem validação',()=>{assert.ok(cat.opcoes.every(x=>x.estadoMigracao==='PENDENTE'&&x.preservar===true))});
test('cada opção tem referência de ID e filtro/origem rastreável',()=>{assert.ok(cat.opcoes.every(x=>x.idOrigem&&x.fonteMenu&&x.temCaseExplicito))});
