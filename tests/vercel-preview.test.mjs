import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
const read=(p)=>readFileSync(p,'utf8');
test('projetos Vercel separados e configuração válida',()=>{
  for(const f of ['apps/api/vercel.json','apps/backoffice/vercel.json','apps/producer-portal/vercel.json']){
    const v=JSON.parse(read(f));assert.ok(v.installCommand);assert.ok(v.buildCommand);
  }
});
test('BFF apresenta proteção de origem, corpo, chave interna e cookies de sessão',()=>{
  for(const bffPath of ['apps/backoffice/src/app/v1/[...path]/route.ts','apps/producer-portal/src/app/v1/[...path]/route.ts']){
    const bff=read(bffPath);
    for(const term of ['browserOrigin!==ownOrigin','MAX_JSON_BYTES','BRAVO_PROXY_KEY','getSetCookie','no-store','redirect:\'manual\''])assert.ok(bff.includes(term),`${bffPath}: ${term}`);
  }
});
test('backend recusa chave ausente e verifica assinatura com tempo constante',()=>{
  const guard=read('apps/api/src/core/security/proxy-guard.ts');
  assert.ok(guard.includes('timingSafeEqual'));assert.ok(guard.includes('expected.length<32'));
  const boot=read('apps/api/src/main.ts');assert.ok(boot.includes('isValidProxyKey'));
});
test('ambiente Vercel Production bloqueado por projeto',()=>{
  assert.match(read('apps/backoffice/next.config.mjs'),/VERCEL_ENV!=='preview'/);
  assert.match(read('apps/api/src/core/security/proxy-guard.ts'),/VERCEL_ENV!=='preview'/);
});
test('migrations automáticas bloqueadas, sem migrations versionadas',()=>{
  const s=read('scripts/migrate-preview.mjs');
  assert.ok(s.includes('MIGRATION')===false||s.includes('migrations'));
  assert.ok(s.includes('!process.argv.includes(\'--apply\')'));
  assert.ok(s.includes('bravo_ii_hml')||s.includes('(hml|homolog|preview)'));
});
test('referência original financeira e RH preservada',()=>{
  const f=read('reference/catalogo-149-original.json');assert.ok(f.includes('Financeiro'));assert.ok(f.includes('RH'));
});
test('não expor secrets no frontend',()=>{
  for(const [bffPath,pagePath,clientPath] of [
    ['apps/backoffice/src/app/v1/[...path]/route.ts','apps/backoffice/src/app/v1/[...path]/page.tsx','apps/backoffice/src/lib/bravo-api.ts'],
    ['apps/producer-portal/src/app/v1/[...path]/route.ts','apps/producer-portal/src/app/v1/[...path]/page.tsx','apps/producer-portal/src/lib/bravo-api.ts'],
  ]){
    const bff=read(bffPath);
    assert.ok(bff.includes('process.env.BRAVO_PROXY_KEY'));
    assert.equal(existsSync(pagePath),false);
    const client=read(clientPath);assert.equal(client.includes('BRAVO_PROXY_KEY'),false);
  }
});
