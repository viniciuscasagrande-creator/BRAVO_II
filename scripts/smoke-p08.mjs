import assert from 'node:assert/strict';

const base = (process.env.SMOKE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

for (const route of ['/v1/clientes?busca=maria', '/v1/pedidos', '/v1/ingressos?numero=00000001']) {
  const response = await fetch(base + route, { redirect: 'manual' });
  assert.equal(response.status, 401, `Endpoint ${route} não protegido: recebeu HTTP ${response.status}`);
  console.log(`PASS: ${route} exige sessão`);
}

for (const route of ['/v1/clientes', '/v1/pedidos/reservas']) {
  const response = await fetch(base + route, {
    method: 'POST',
    headers: { Origin: 'https://origem-nao-confiavel.invalid', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 403, `Endpoint ${route} não exige origem confiável`);
  console.log(`PASS: ${route} bloqueia origem inválida`);
}

console.log('P08 smoke passou. NÃO equivale a testes de reservas com PostgreSQL e concorrência real.');
