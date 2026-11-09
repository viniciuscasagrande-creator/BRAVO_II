# Evidências de Execução — Pacote 00 e Diagnóstico do Pacote 01

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data da execução**: `2026-11-09T17:27:12.297Z`
- **Branch criada**: `feat/bravo-ii-expansao-operacional`

## 1. Comandos Executados e Resultados Reais

1. **Auditoria Prisma × Migrations SQL × Neon HML**:
   - Modelos Prisma: **55**
   - Migrations SQL aplicadas no Neon HML (`bravo_ii_hml`): **10/10** (`0001` a `0010`)
   - Tabelas base no Neon HML: **78** (77 tabelas de domínio + `schema_migrations`)
   - Divergência entre Migrations SQL e Neon HML: **0 tabelas ausentes** (`[]`)
2. **Testes Estruturais e de Segurança (`node --test tests/*.test.mjs`)**:
   - **53/53 testes aprovados** (`pass 53, fail 0`).
3. **Verificação do Módulo Financeiro Vídeo (`node scripts/test-financeiro-video.mjs`)**:
   - `OK: 96 telas, 15 grupos; rotas, permissão e preservação das travas verificadas.`
4. **Build Completo do Monorepo (`pnpm run build`)**:
   - Todos os 9 pacotes e 5 aplicações compilados com código de saída `0`.
5. **Confirmação de Segurança Financeira**:
   - Nenhuma operação bancária, captura real, estorno externo ou repasse real foi executado (`ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`).
