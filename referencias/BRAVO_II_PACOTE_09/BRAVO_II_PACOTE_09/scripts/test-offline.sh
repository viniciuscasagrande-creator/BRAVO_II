#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo '[1/5] Regras de domínio Pacote 06'
tsc -p packages/domain-p06/tsconfig.json
node --test packages/domain-p06/tests/*.test.mjs
echo '[2/5] Regras de navegação e segurança Core'
tsc -p packages/core-policy/tsconfig.json
node --test packages/core-policy/tests/*.test.mjs
echo '[3/5] Integridade e conectores do Pacote 07'
node --test tests/*.test.mjs
echo '[4/5] Domínio de clientes, pedidos e ingressos — Pacote 08'
tsc -p packages/domain-p08/tsconfig.json
node --test packages/domain-p08/tests/*.test.mjs
echo 'Testes offline concluídos. Não equivalem à homologação PostgreSQL/Nest/Next.'

echo '[5/5] Checkout, PDV e integração de homologação — Pacote 09'
tsc -p packages/domain-p09/tsconfig.json
node --test packages/domain-p09/tests/*.test.mjs tests/p09-structure.test.mjs
