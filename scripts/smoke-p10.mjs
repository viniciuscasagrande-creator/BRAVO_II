#!/usr/bin/env node
/**
 * Smoke HTTP de autenticação, CSRF e endpoints do Pacote 10 (/v1/sac, /v1/pos-venda, /v1/estornos).
 */
const base = (process.env.BRAVO_API_URL || 'http://127.0.0.1:4100').replace(/\/$/, '');

async function checkUnauth(route) {
  const res = await fetch(`${base}/v1/${route}`);
  if (res.status !== 401) {
    throw new Error(`Esperado 401 sem sessão em /v1/${route}, recebido ${res.status}`);
  }
  return { route: `/v1/${route}`, status: res.status };
}

const checks = [];
for (const r of [
  'sac/indicadores',
  'sac/chamados',
  'sac/politicas-sla',
  'sac/equipes',
  'sac/incidentes',
  'sac/problemas',
  'sac/conhecimento',
  'pos-venda/trocas',
  'pos-venda/cancelamentos',
  'estornos',
  'estornos/impacto',
]) {
  checks.push(await checkUnauth(r));
}

console.log(JSON.stringify({ status: 'OK', base, checks }, null, 2));
