import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../apps/api/package.json',import.meta.url));
require('reflect-metadata');
const {Module}=require('@nestjs/common');const {NestFactory}=require('@nestjs/core');
const {DatabaseModule}=require('./dist/common/database/database.module');
const {DatabaseService}=require('./dist/common/database/database.service');
const {GovernanceModule}=require('./dist/modules/governance/governance.module');
const {IdentityModule}=require('./dist/modules/identity/identity.module');
const {IdentityService}=require('./dist/modules/identity/identity.service');
const {EventsModule}=require('./dist/modules/events/events.module');
const {ProducerFinanceController}=require('./dist/modules/producer-finance/producer-finance.controller');
const {ProducerFinanceService}=require('./dist/modules/producer-finance/producer-finance.service');
const {ApiExceptionFilter}=require('./dist/common/errors/api-exception.filter');
const {randomUUID}=require('node:crypto');
class TestModule{};Module({imports:[DatabaseModule,GovernanceModule,IdentityModule,EventsModule],controllers:[ProducerFinanceController],providers:[ProducerFinanceService]})(TestModule);
let app,db,url,token,tokenB;const p=randomUUID(),pB=randomUUID(),event=randomUUID(),other=randomUUID(),user=randomUUID(),userB=randomUUID();
async function read(path,auth=token){return fetch(url+'/v1/producer-portal/'+path,{headers:auth?{Authorization:'Bearer '+auth}:{}});}
before(async()=>{
 process.env.NODE_ENV='test';process.env.PGLITE_DATA_DIR='memory://';process.env.PRODUCER_PORTAL_ORIGIN='https://produtor.example.test';
 app=await NestFactory.create(TestModule,{logger:false});app.useGlobalFilters(new ApiExceptionFilter());await app.listen(0);url='http://127.0.0.1:'+app.getHttpServer().address().port;db=app.get(DatabaseService);
 const iam=app.get(IdentityService);await iam.syncCanonicalRolesAndPermissions();
 await db.query(`INSERT INTO producers(id,cnpj,legal_name,trade_name) VALUES ($1,'11111111111111','Teste A','Teste A'),($2,'22222222222222','Teste B','Teste B')`,[p,pB]);
 await db.query(`INSERT INTO events(id,code,title,venue_name,city,state_uf,starts_at) VALUES ($1,'PTEST-A','Evento A','Local','Curitiba','PR',NOW()),($2,'PTEST-B','Evento B','Local','Curitiba','PR',NOW())`,[event,other]);
 await db.query(`INSERT INTO event_producers(event_id,producer_id,relationship_role,revenue_share_percentage) VALUES($1,$2,'PRIMARY',50),($1,$3,'CO_PRODUCER',50),($4,$3,'PRIMARY',100)`,[event,p,pB,other]);
 for(const [id,email,scope] of [[user,'a@portal.test',p],[userB,'b@portal.test',pB]]){
  await iam.ensureOperatorAccount({id,email,fullName:'Teste isolado',plainPassword:'Test#Portal123456',role:'PRODUTOR_PDT'});
  await db.query('INSERT INTO user_producer_scopes(user_id,producer_id) VALUES($1,$2)',[id,scope]);
  const response=await fetch(url+'/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://produtor.example.test'},body:JSON.stringify({email,password:'Test#Portal123456'})});assert.equal(response.status,200);const body=await response.json();if(id===user)token=body.token;else tokenB=body.token;
 }
 for(const [producer,type,amount] of [[p,'VENDA_INGRESSO_BRUTA','9007199254740993'],[p,'OBRIGACAO_PRODUTOR','5000'],[p,'REPASSE_PRODUTOR','1000'],[p,'RECEITA_TAXA_DISK','999'],[pB,'OBRIGACAO_PRODUTOR','888888'],[null,'VENDA_INGRESSO_BRUTA','777777']]){
 await db.query(`INSERT INTO finance_ledger_entries(id,entry_number,event_id,producer_id,entry_type,debit_account,credit_account,amount_cents,description_pt_br,idempotency_key) VALUES($1::uuid,$1::text,$2,$3,$4,'CONTA_PRIVADA','CONTA_PRIVADA',$5,'DESCRICAO_PRIVADA',$1::text)`,[randomUUID(),event,producer,type,amount]);}
});
after(async()=>{await app?.close();});
test('exige autenticação',async()=>{assert.equal((await read('events/'+event+'/finance',null)).status,401);});
test('nega acesso ao evento de outro produtor',async()=>{assert.equal((await read('events/'+other+'/finance')).status,403);});
test('financeiro preserva bigint e não calcula saldo a partir de vendas',async()=>{const res=await read('events/'+event+'/finance');assert.equal(res.status,200);const body=await res.json();assert.equal(body.recordedGrossCents,'9007199254740993');assert.equal(body.recordedObligationCents,'5000');assert.equal(body.availableCents,null);assert.equal(body.receivedCents,null);assert.equal(body.recordedRefundReservesCents,null);assert.equal(body.items.length,3);});
test('exclui taxas, descrições, contas, coprodutor e registros sem atribuição',async()=>{const body=JSON.stringify(await (await read('events/'+event+'/finance')).json());for(const value of ['RECEITA_TAXA_DISK','999','888888','777777','CONTA_PRIVADA','DESCRICAO_PRIVADA'])assert.equal(body.includes(value),false);});
test('coprodutor consulta somente sua parcela registrada',async()=>{const body=await (await read('events/'+event+'/finance',tokenB)).json();assert.equal(body.recordedObligationCents,'888888');assert.equal(body.recordedGrossCents,null);});
test('valida UUID e paginação',async()=>{for(const path of ['events/invalido/finance','events/'+event+'/finance?offset=-1','events/'+event+'/finance?offset=NaN'])assert.equal((await read(path)).status,400);});
test('registra auditoria de consulta e negação',async()=>{const result=await db.query("SELECT DISTINCT outcome FROM audit_records WHERE canonical_action='producer.finance.read'");assert.deepEqual(new Set(result.rows.map(r=>r.outcome)),new Set(['SUCCESS','DENIED']));});
test('login aceita apenas origens configuradas',async()=>{const res=await fetch(url+'/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://intruso.test'},body:JSON.stringify({email:'a@portal.test',password:'Test#Portal123456'})});assert.equal(res.status,403);});
test('dois endereços: login HttpOnly, eventos, financeiro e logout pelo frontend separado',async()=>{
 const {spawn}=await import('node:child_process');const {createServer}=await import('node:net');const {setTimeout:pause}=await import('node:timers/promises');
 const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const frontend='http://127.0.0.1:'+port;process.env.PRODUCER_PORTAL_ORIGIN=frontend;
 const frontRequire=createRequire(new URL('../apps/producer-portal/package.json',import.meta.url));
 const child=spawn(process.execPath,[frontRequire.resolve('next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{cwd:new URL('../apps/producer-portal',import.meta.url),env:{...process.env,NODE_ENV:'production',PORTAL_PUBLIC_ORIGIN:frontend,BRAVO_API_URL:url,BRAVO_PROXY_KEY:'test-only-proxy-key-with-32-characters'},stdio:'pipe'});
 let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);
 try{
  let ready=false;for(let attempt=0;attempt<50;attempt++){try{ready=(await fetch(frontend+'/login')).ok;if(ready)break;}catch{}await pause(200);}assert.equal(ready,true,output);
  const login=await fetch(frontend+'/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:frontend},body:JSON.stringify({email:'a@portal.test',password:'Test#Portal123456'})});assert.equal(login.status,200,await login.clone().text());assert.deepEqual(await login.json(),{ok:true});assert.match(login.headers.get('set-cookie'),/HttpOnly/i);
  const cookie=login.headers.get('set-cookie').split(';')[0];const headers={Cookie:cookie};
  const events=await (await fetch(frontend+'/v1/events',{headers})).json();assert.equal(events.items.length,1);assert.equal(events.items[0].id,event);
  const finance=await fetch(frontend+'/v1/producer-portal/events/'+event+'/finance',{headers});assert.equal(finance.status,200);assert.equal((await finance.json()).recordedObligationCents,'5000');
  assert.equal((await fetch(frontend+'/v1/finance/ledger',{headers})).status,404);
  const me=await (await fetch(frontend+'/v1/auth/me',{headers})).json();
  const logout=await fetch(frontend+'/v1/auth/logout',{method:'POST',headers:{...headers,Origin:frontend,'Content-Type':'application/json','X-CSRF-Token':me.csrfToken},body:'{}'});assert.equal(logout.status,200);
  assert.equal((await fetch(frontend+'/v1/auth/me',{headers})).status,401);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));}
});
