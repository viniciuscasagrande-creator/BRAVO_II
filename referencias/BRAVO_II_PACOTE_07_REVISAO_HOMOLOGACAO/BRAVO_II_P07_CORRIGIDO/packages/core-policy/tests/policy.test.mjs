import test from 'node:test';
import assert from 'node:assert/strict';
import {menuForRoles,isPermittedNav,originAllowed,isMutating,assertCookieToken,isLoginLocked,nextFailedLogin,validateHomologationEnv} from '../dist/index.js';
test('Produtor não recebe menu interno do ERP',()=>assert.deepEqual(menuForRoles(['PRODUTOR']),[]));
test('RH não recebe menu do Financeiro nem Taxa Disk',()=>{let ids=menuForRoles(['RH']).map(x=>x.id);assert(ids.includes('rh'));assert(!ids.includes('financeiro'));assert(!ids.includes('taxas'));});
test('Financeiro vê referência própria mas não habilita 104 rotas incompletas',()=>{const menu=menuForRoles(['FINANCEIRO_DISK']);assert.equal(menu.find(x=>x.id==='financeiro').status,'EM_IMPLANTACAO');assert(!isPermittedNav(['FINANCEIRO_DISK'],'/financeiro'));});
test('Comercial pode abrir produtores e não pode acessar RH',()=>{assert(isPermittedNav(['COMERCIAL'],'/comercial/produtores'));assert(!isPermittedNav(['COMERCIAL'],'/rh'));});
test('Bloqueia origem parecida e ausente',()=>{assert(originAllowed('https://preview.diskingressos.com.br','https://preview.diskingressos.com.br'));assert(!originAllowed('https://preview.diskingressos.com.br.atacante.net','https://preview.diskingressos.com.br'));assert(!originAllowed(undefined,'https://preview.diskingressos.com.br'));});
test('GET e HEAD são seguros e POST/PATCH exigem CSRF',()=>{assert(!isMutating('GET'));assert(!isMutating('HEAD'));assert(isMutating('POST'));assert(isMutating('DELETE'));});
test('Cookie de sessão rejeita tokens malformados e duplicados',()=>{const good='A'.repeat(43);assert.equal(assertCookieToken('x=1; bravo_session='+good),good);assert.equal(assertCookieToken('bravo_session='+good+'; bravo_session='+good),undefined);assert.equal(assertCookieToken('bravo_session=bad; x=1'),undefined);});

test('Bloqueio expira e permite retomar a autenticação depois de 30 minutos',()=>{
 const now=new Date('2026-11-05T20:00:00Z');
 const fourth=nextFailedLogin(4,null,now);
 assert.equal(fourth.failedLogins,5);
 assert(isLoginLocked(fourth.lockedUntil,now));
 assert(!isLoginLocked(fourth.lockedUntil,new Date(now.getTime()+30*60*1000)));
 const again=nextFailedLogin(fourth.failedLogins,fourth.lockedUntil,new Date(now.getTime()+30*60*1000));
 assert.equal(again.failedLogins,1);
 assert.equal(again.lockedUntil,null);
});
test('Configuração de homologação recusa banco operacional e flags financeiras',()=>{
 const ok={BRAVO_ENV:'HOMOLOGACAO',DATABASE_URL:'postgresql://bravo:senha@localhost:5432/bravo_ii_hml',APP_ORIGIN:'http://localhost:3000',NODE_ENV:'development',COOKIE_SECURE:'false',ENABLE_EXTERNAL_PUBLICATION:'false',ENABLE_REAL_PAYMENTS:'false',ENABLE_REAL_REFUNDS:'false'};
 assert.deepEqual(validateHomologationEnv(ok),[]);
 assert(validateHomologationEnv({...ok,DATABASE_URL:'postgresql://bravo:senha@localhost:5432/bravo_producao'}).some(x=>x.includes('identificador')));
 assert(validateHomologationEnv({...ok,ENABLE_REAL_REFUNDS:'true'}).some(x=>x.includes('ENABLE_REAL_REFUNDS')));
 assert(validateHomologationEnv({...ok,APP_ORIGIN:'https://www.diskingressos.com.br'}).some(x=>x.includes('domínio público')));
 assert(validateHomologationEnv({...ok,APP_ORIGIN:'http://preview.exemplo.com',NODE_ENV:'production'}).some(x=>x.includes('https')));
 assert.deepEqual(validateHomologationEnv({...ok,APP_ORIGIN:'https://preview.exemplo.com',COOKIE_SECURE:'true',NODE_ENV:'production'}),[]);
});
