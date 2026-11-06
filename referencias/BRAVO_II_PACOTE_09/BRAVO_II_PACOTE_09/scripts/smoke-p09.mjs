/** Executar com a API/Next em execução, sem credenciais. Testes NEGATIVOS de acesso público. */
import assert from 'node:assert/strict';
const base=(process.env.SMOKE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
for(const route of ['/v1/checkout/pedidos/123e4567-e89b-42d3-a456-426614174000/tentativas','/v1/pdv/terminais']){
 const response=await fetch(base+route,{redirect:'manual'});
 assert.equal(response.status,401,`Rota ${route} retornou ${response.status} em vez de 401`);
 console.log('PASS: acesso sem sessão recusado em '+route);
}
for(const route of ['/v1/checkout/pedidos/123e4567-e89b-42d3-a456-426614174000/tentativas','/v1/pdv/terminais']){
 const response=await fetch(base+route,{method:'POST',headers:{Origin:'https://site-falso.invalid','Content-Type':'application/json'},body:'{}'});
 assert.equal(response.status,403,`Origem não autorizada não bloqueada: ${route}, HTTP ${response.status}`);
 console.log('PASS: origem inválida bloqueada em '+route);
}
console.log('P09 smoke negativo aprovado; exige complemento com login real e PostgreSQL.');
