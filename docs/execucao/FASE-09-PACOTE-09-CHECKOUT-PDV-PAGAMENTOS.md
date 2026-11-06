# FASE 09 — Execução e Homologação do Pacote 09 (Checkout, PDV, Pagamentos e Homologação)

## 1. Objetivo da Fase
Integrar e homologar o **Pacote 09** do ERP **BRAVO_II** sobre a base consolidada dos Pacotes `01` a `08`, entregando:
- Domínio puro `@bravo-ii/domain-p09` com regras de validação de tentativas de checkout (`PAGBANK` / `REDE`), bloqueio de PIX na Rede sem integração específica, validação de terminais de PDV, regras de abertura de turno, payload seguro para sandbox PagBank e mapeamento somente-leitura de status externo (`issuedTickets: 0`);
- Evolução da política central `@bravo-ii/core-policy` adicionando `/checkout` (`ADMIN`, `OPERACOES`, `FINANCEIRO_DISK`, `AUDITOR`) e habilitando `/pdv` (`PDV · Configuração`) exclusivamente para cadastro administrativo de terminais bloqueados;
- Migration reversível `0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql` (`.down.sql`) e conciliação do `prisma/schema.prisma`;
- Módulo NestJS `BravoPacote09Module` (`BravoCheckoutController`, `BravoPdvController`, `BravoCheckoutService`, `BravoPdvService`) integrado ao `DatabaseService` transacional e `AuditService`;
- Telas Next.js em `pt-BR` para `/checkout` e `/pdv`;
- Suíte E2E completa (`pacote09-checkout-pdv-pagbank-sandbox.e2e.spec.ts`) e scripts de verificação (`check-homologacao-p09.mjs`, `smoke-p09.mjs`, `doctor.mjs`).

---

## 2. Arquivos Criados e Alterados

### Pacotes de Domínio e Política
- [packages/domain-p09/package.json](file:///E:/BRAVO_II/packages/domain-p09/package.json) *(novo)*
- [packages/domain-p09/tsconfig.json](file:///E:/BRAVO_II/packages/domain-p09/tsconfig.json) *(novo)*
- [packages/domain-p09/src/index.ts](file:///E:/BRAVO_II/packages/domain-p09/src/index.ts) *(novo)*
- [packages/domain-p09/src/checkout.spec.ts](file:///E:/BRAVO_II/packages/domain-p09/src/checkout.spec.ts) *(novo — 25 testes)*
- [packages/core-policy/src/index.ts](file:///E:/BRAVO_II/packages/core-policy/src/index.ts) *(atualizado — rotas `/checkout` e `/pdv`)*
- [packages/core-policy/src/policy.spec.ts](file:///E:/BRAVO_II/packages/core-policy/src/policy.spec.ts) *(atualizado — 11 testes)*

### Banco de Dados e Schema
- [prisma/schema.prisma](file:///E:/BRAVO_II/prisma/schema.prisma) *(atualizado — `BravoCheckoutAttempt`, `BravoPdvTerminal`, `BravoPdvShift`)*
- [database/migrations/0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql](file:///E:/BRAVO_II/database/migrations/0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql) *(novo)*
- [database/migrations/0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.down.sql](file:///E:/BRAVO_II/database/migrations/0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.down.sql) *(novo)*

### Backend NestJS (`apps/api`)
- [apps/api/src/modules/pacote09/checkout.service.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote09/checkout.service.ts) *(novo)*
- [apps/api/src/modules/pacote09/pdv.service.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote09/pdv.service.ts) *(novo)*
- [apps/api/src/modules/pacote09/controllers.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote09/controllers.ts) *(novo)*
- [apps/api/src/modules/pacote09/module.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote09/module.ts) *(novo)*
- [apps/api/src/modules/pacote08/order.service.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/order.service.ts) *(atualizado — suporte a `trustedPdv` autenticado)*
- [apps/api/src/modules/pacote08/controllers.ts](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/controllers.ts) *(atualizado)*
- [apps/api/src/bootstrap/app.module.ts](file:///E:/BRAVO_II/apps/api/src/bootstrap/app.module.ts) *(atualizado — registro de `BravoPacote09Module`)*
- [apps/api/src/bootstrap/pacote07-homologacao-auth-csrf-nav.e2e.spec.ts](file:///E:/BRAVO_II/apps/api/src/bootstrap/pacote07-homologacao-auth-csrf-nav.e2e.spec.ts) *(atualizado)*
- [apps/api/src/bootstrap/pacote09-checkout-pdv-pagbank-sandbox.e2e.spec.ts](file:///E:/BRAVO_II/apps/api/src/bootstrap/pacote09-checkout-pdv-pagbank-sandbox.e2e.spec.ts) *(novo)*

### Frontend Next.js (`apps/backoffice`)
- [apps/backoffice/src/app/(erp)/checkout/page.tsx](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/checkout/page.tsx) *(novo)*
- [apps/backoffice/src/app/(erp)/pdv/page.tsx](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/pdv/page.tsx) *(atualizado)*

### Testes Estruturais, Scripts e Documentação
- [tests/p08-integration-structure.test.mjs](file:///E:/BRAVO_II/tests/p08-integration-structure.test.mjs) *(atualizado)*
- [tests/p09-structure.test.mjs](file:///E:/BRAVO_II/tests/p09-structure.test.mjs) *(novo)*
- [scripts/doctor.mjs](file:///E:/BRAVO_II/scripts/doctor.mjs) *(atualizado)*
- [scripts/check-homologacao-p09.mjs](file:///E:/BRAVO_II/scripts/check-homologacao-p09.mjs) *(novo)*
- [scripts/smoke-p09.mjs](file:///E:/BRAVO_II/scripts/smoke-p09.mjs) *(novo)*
- [docs/RELATORIO_HOMOLOGACAO_REAL.md](file:///E:/BRAVO_II/docs/RELATORIO_HOMOLOGACAO_REAL.md) *(novo)*

---

## 3. Confirmação Explícita de Segurança Operacional
- Nenhuma operação financeira real (cobrança, captura, estorno, repasse ou antecipação) foi executada;
- Nenhum webhook público de liquidação foi exposto;
- Nenhuma Taxa Disk contratual interna foi exposta em endpoints de checkout ou do PDT.
