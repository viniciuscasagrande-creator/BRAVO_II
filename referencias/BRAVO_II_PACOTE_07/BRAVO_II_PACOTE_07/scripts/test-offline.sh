#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo '[1/3] Regras de domínio Pacote 06'
tsc -p packages/domain-p06/tsconfig.json
node --test packages/domain-p06/tests/*.test.mjs
echo '[2/3] Regras de navegação e segurança Core'
tsc -p packages/core-policy/tsconfig.json
node --test packages/core-policy/tests/*.test.mjs
echo '[3/3] Integridade e conectores do Pacote 07'
node --test tests/*.test.mjs
echo 'Testes offline concluídos. Não equivalem à homologação PostgreSQL/Nest/Next.'
