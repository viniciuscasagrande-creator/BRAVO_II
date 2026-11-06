import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('AI novo módulo em um único NestJS sem sobrescrever P06 a P10',()=>{
 const module=read('apps/api/src/app.module.ts');for(const m of ['BravoPacote06Module','BravoPacote08Module','BravoPacote09Module','BravoPacote10Module','BravoIaModule'])assert.ok(module.includes(m));
});
test('PostgreSQL central + cotas, sem duplicar entidades operacionais',()=>{
 const schema=read('prisma/schema.prisma');for(const model of ['BravoProducer','BravoEvent','BravoIdentityUser','BravoAudit','BravoAiQuotaWindow'])assert.ok(schema.includes('model '+model+' {'));
 assert.equal((schema.match(/datasource db/g)||[]).length,1);
});
test('Gemini somente no backend e sem segredos embutidos',()=>{
 const service=read('apps/api/src/modules/ia/ia.service.ts');const page=read('apps/backoffice/src/app/(erp)/ia/page.tsx');
 assert.match(service,/generativelanguage\.googleapis\.com/);assert.match(service,/GEMINI_API_KEY/);assert.doesNotMatch(page,/GEMINI_API_KEY/);
 assert.match(service,/validateAiQuestion/);assert.match(service,/bravoAiQuotaWindow/);
 assert.doesNotMatch(service,/realRefund|executeRefund|capturePayment|db\.bravoCustomer\.findMany/);
});
test('BFF repassa o bypass Vercel apenas no servidor e protege chave BRAVO',()=>{
 const bff=read('apps/backoffice/src/app/v1/[...path]/route.ts');
 assert.match(bff,/BRAVO_API_VERCEL_BYPASS_TOKEN/);assert.match(bff,/x-vercel-protection-bypass/);
 assert.match(bff,/BRAVO_PROXY_KEY/);assert.match(bff,/no-store/);
});
test('Neon sem conexão direta no navegador e segurança financeira mantida',()=>{
 const e=read('apps/api/.env.vercel-preview.example');assert.match(e,/BRAVO_GEMINI_ENABLED=false/);for(const f of ['ENABLE_REAL_REFUNDS=false','ENABLE_REAL_PAYMENTS=false','ENABLE_EXTERNAL_PUBLICATION=false'])assert.ok(e.includes(f));
 const menu=read('packages/core-policy/src/index.ts');assert.match(menu,/Assistente Gemini/);
 const webEnv=read('apps/backoffice/.env.vercel-preview.example');assert.doesNotMatch(webEnv,/DATABASE_URL=/);assert.doesNotMatch(webEnv,/GEMINI_API_KEY=/);
});
