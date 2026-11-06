import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Prisma mantém os 149 itens catalogados do Financeiro e RH',()=>{
 const list=JSON.parse(read('reference/catalogo-149-original.json'));
 assert(Array.isArray(list)||typeof list==='object');
 const rows=read('reference/matriz-149-original.csv').trim().split(/\r?\n/);
 assert(rows.length>=150);
});
test('Novo schema possui cliente, pedido, ingresso de oito dígitos e assinatura financeira',()=>{
 const s=read('prisma/schema.prisma');for(const model of ['BravoCustomer','BravoSaleOrder','BravoIssuedTicket','BravoPaymentConfirmation','BravoTicketSequence'])assert(s.includes('model '+model+' {'));
 for(const col of ['reservedCount','issuedCount','cpfFingerprint'])assert(s.includes(col));
 assert.equal((s.match(/datasource db/g)||[]).length,1);
});
test('Reservas usam atualização atômica de inventário',()=>{
 const s=read('apps/api/src/modules/pacote08/order.service.ts');
 assert(s.includes('UPDATE "BravoPriceLot"'));
 assert(s.includes('"capacity"-"reservedCount"-"issuedCount">='));
 assert(s.includes('TransactionIsolationLevel.Serializable'));
});
test('Pagamento não tem endpoint HTTP para simular aprovação',()=>{
 const controller=read('apps/api/src/modules/pacote08/controllers.ts');
 assert(!/confirmVerifiedSettlement|pagamento-confirmado|confirmar-pagamento/.test(controller));
 assert(read('apps/api/src/modules/pacote08/order.service.ts').includes("process.env.ENABLE_REAL_PAYMENTS!=='true'"));
});
test('Backend exige origem, sessão e CSRF no Core compartilhado',()=>{
 const middleware=read('apps/api/src/core/auth/auth-context.middleware.ts');
 for(const part of ['originAllowed','csrfForToken','assertCookieToken'])assert(middleware.includes(part));
 const app=read('apps/api/src/app.module.ts');assert(app.includes('BravoPacote06Module')&&app.includes('BravoPacote08Module'));
});
test('Menus e telas estão conectados ao Core; PDV ainda não autorizado',()=>{
 const policy=read('packages/core-policy/src/index.ts');
 assert(policy.includes("href:'/clientes'"));assert(policy.includes("href:'/pedidos'"));assert(policy.includes("href:'/ingressos'"));
 assert(policy.includes("href:'/pdv'")&&policy.includes("status:'EM_IMPLANTACAO'"));
 for(const route of ['clientes','pedidos','ingressos'])assert(fs.existsSync(path.join(root,'apps/backoffice/src/app/(erp)',route,'page.tsx')));
});
