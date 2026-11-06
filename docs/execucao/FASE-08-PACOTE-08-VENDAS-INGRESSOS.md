# FASE 08 / PACOTE 08 — Central de Clientes PF, Pedidos, Reservas Atômicas e Ingressos de 8 Dígitos

## 1. Objetivo da Fase
Integrar e homologar o **Pacote 08 (`BRAVO_II_PACOTE_08.zip`)** no monorepo **BRAVO_II**, adicionando a Central de Clientes PF (com CPF validado e protegido por `HMAC-SHA256`), Pedidos e Reservas com atualização atômica de estoque no PostgreSQL, idempotência, controle de concorrência, cancelamento de reserva não paga, expiração de reservas vencidas e emissão interna de ingressos com numeração sequencial única de 8 dígitos (`00000001` a `99999999`) e consulta pelo SAC, preservando integralmente os Pacotes `01` a `07` e as `149` funções catalogadas (`104` Financeiro Disk + `45` RH & DP).

## 2. Inventário de Arquivos Criados e Alterados
- [`packages/domain-p08/package.json`](file:///E:/BRAVO_II/packages/domain-p08/package.json), [`tsconfig.json`](file:///E:/BRAVO_II/packages/domain-p08/tsconfig.json), [`src/index.ts`](file:///E:/BRAVO_II/packages/domain-p08/src/index.ts), [`src/sales.spec.ts`](file:///E:/BRAVO_II/packages/domain-p08/src/sales.spec.ts)
- [`packages/core-policy/src/index.ts`](file:///E:/BRAVO_II/packages/core-policy/src/index.ts), [`src/policy.spec.ts`](file:///E:/BRAVO_II/packages/core-policy/src/policy.spec.ts)
- [`prisma/schema.prisma`](file:///E:/BRAVO_II/prisma/schema.prisma)
- [`database/migrations/0007_pacote08_customers_orders_reservations_tickets.up.sql`](file:///E:/BRAVO_II/database/migrations/0007_pacote08_customers_orders_reservations_tickets.up.sql) e [`.down.sql`](file:///E:/BRAVO_II/database/migrations/0007_pacote08_customers_orders_reservations_tickets.down.sql)
- [`apps/api/src/common/database/database.service.ts`](file:///E:/BRAVO_II/apps/api/src/common/database/database.service.ts)
- [`apps/api/src/modules/pacote08/customer.service.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/customer.service.ts), [`order.service.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/order.service.ts), [`controllers.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/controllers.ts), [`module.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/module.ts)
- [`apps/backoffice/src/app/(erp)/clientes/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/clientes/page.tsx), [`pedidos/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/pedidos/page.tsx), [`ingressos/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/ingressos/page.tsx), [`pdv/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/pdv/page.tsx)
- [`tests/p08-integration-structure.test.mjs`](file:///E:/BRAVO_II/tests/p08-integration-structure.test.mjs), [`scripts/smoke-p08.mjs`](file:///E:/BRAVO_II/scripts/smoke-p08.mjs)
- [`apps/api/src/bootstrap/pacote08-clientes-pedidos-reservas-ingressos.e2e.spec.ts`](file:///E:/BRAVO_II/apps/api/src/bootstrap/pacote08-clientes-pedidos-reservas-ingressos.e2e.spec.ts)

## 3. Evidências de Testes e Build
- **`npm run test:offline`**: `64/64` testes aprovados (`0` falhas).
- **`pnpm test`**: `70/70` testes unitários e de integridade aprovados (`0` falhas).
- **`pnpm db:migrate`**: `7/7` migrations aplicadas (`0001` a `0007`).
- **`pnpm test:e2e`**: `30/30` testes E2E aprovados em `7` suítes completas.
- **`pnpm typecheck` & `pnpm build`**: `11/11` pacotes e apps compilados sem erros.
- **`npm run doctor` & `npm run doctor:ready`**: **APROVADA**.

## 4. Confirmação de Segurança Operacional
Nenhuma operação financeira real, liquidação de pagamento, estorno, repasse, antecipação ou publicação externa foi executada (`ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`).
