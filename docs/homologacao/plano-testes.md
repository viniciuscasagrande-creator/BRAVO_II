# Plano de Testes e Homologação — BRAVO_II (Pacotes 00 e 01)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`

| Suíte / Comando | Escopo Verificado | Critério de Aceite |
|---|---|---|
| `node --test tests/*.test.mjs` | 53 testes de integridade arquitetural, segurança BFF/Proxy, preservação das 149 funções Financeiro/RH, 96 telas do Financeiro Vídeo, bloqueio de gateways externos e coerência CSS | 53/53 aprovados (`fail 0`) |
| `node scripts/test-financeiro-video.mjs` | Verificação estrutural das 96 telas, 15 grupos, exigência de `finance:read` e ausência de valores simulados | `OK: 96 telas, 15 grupos` |
| `pnpm --filter @bravo-ii/contracts test` | Testes unitários de contratos, RBAC, filtro de menus por permissão e validação de schemas | 4/4 aprovados |
| `pnpm run build` | Compilação TypeScript de todos os pacotes (`packages/*`), apps (`apps/api`, `apps/backoffice`, `apps/pdv`, `apps/pdt-adapter`, `apps/workers`) e geração de `dist/` | Exit code 0 sem erros |
