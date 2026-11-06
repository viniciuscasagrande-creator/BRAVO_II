#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo '[1/7] Regras de domínio Pacote 06'
tsc -p packages/domain-p06/tsconfig.json
node --test packages/domain-p06/tests/*.test.mjs
echo '[2/7] Regras de navegação e segurança Core'
tsc -p packages/core-policy/tsconfig.json
node --test packages/core-policy/dist/*.spec.js
echo '[3/7] Integridade e conectores do Pacote 07'
node --test tests/*.test.mjs
echo '[4/7] Domínio de clientes, pedidos e ingressos — Pacote 08'
tsc -p packages/domain-p08/tsconfig.json
node --test packages/domain-p08/tests/*.test.mjs
echo '[5/7] Checkout, PDV e integração de homologação — Pacote 09'
tsc -p packages/domain-p09/tsconfig.json
node --test packages/domain-p09/tests/*.test.mjs tests/p09-structure.test.mjs
echo '[6/7] Atendimento, pós-venda e estornos — Pacote 10'
tsc -p packages/domain-p10/tsconfig.json
node --test packages/domain-p10/tests/*.test.mjs tests/p10-structure.test.mjs
echo '[7/7] IA Gemini: política, segurança, estrutura'
tsc -p packages/domain-ia/tsconfig.json
node --test packages/domain-ia/tests/*.test.mjs tests/neon-gemini-structure.test.mjs
