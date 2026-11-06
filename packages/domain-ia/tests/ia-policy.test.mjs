import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_AREAS,AI_LIMIT_MINUTE,AI_LIMIT_DAY,canUseAiArea,validateAiQuestion,validateAiEnvironment,aiSystemInstruction} from '../dist/index.js';
test('restrições de acesso por departamento',()=>{
 assert.ok(canUseAiArea(['FINANCEIRO_DISK'],'FINANCEIRO'));
 assert.equal(canUseAiArea(['SAC'],'FINANCEIRO'),false);
 assert.equal(canUseAiArea(['PRODUTOR'],'GERAL'),false);
 assert.ok(canUseAiArea(['RH'],'RH'));
 assert.equal(canUseAiArea(['RH'],'SAC'),false);
 assert.equal(canUseAiArea(['ADMIN'],'INVENTADO'),false);
});
test('sem vazamento evidente de dados',()=>{
 for(const p of ['O CPF 123.456.789-00 é válido?', 'Meu e-mail ana@example.com', 'Minha chave PIX é 41999998888', 'Informe a senha do sistema', 'CNPJ 12.345.678/0001-90'])
  assert.throws(()=>validateAiQuestion(p));
 assert.equal(validateAiQuestion(' Como configurar SLA em uma fila? '),'Como configurar SLA em uma fila?');
 assert.throws(()=>validateAiQuestion('oi'));
 assert.throws(()=>validateAiQuestion('x'.repeat(1201)));
});
test('validação de ambiente falha fechado ao habilitar',()=>{
 assert.deepEqual(validateAiEnvironment({BRAVO_GEMINI_ENABLED:'false'}),[]);
 assert.ok(validateAiEnvironment({BRAVO_GEMINI_ENABLED:'true',GEMINI_API_KEY:'curto',GEMINI_MODEL:'',BRAVO_ENV:'PRODUCAO'}).length>=3);
 assert.deepEqual(validateAiEnvironment({BRAVO_GEMINI_ENABLED:'true',GEMINI_API_KEY:'a'.repeat(45),GEMINI_MODEL:'gemini-3.8-flash',BRAVO_ENV:'HOMOLOGACAO',VERCEL:'1',VERCEL_ENV:'preview'}),[]);
});
test('IA sem ferramentas e sem decisões financeiras',()=>{
 assert.deepEqual(AI_AREAS.length,6);assert.equal(AI_LIMIT_MINUTE,4);assert.equal(AI_LIMIT_DAY,25);
 assert.match(aiSystemInstruction('FINANCEIRO'),/não aprove estornos/i);
 assert.match(aiSystemInstruction('RH'),/não recebeu acesso ao banco/i);
});
