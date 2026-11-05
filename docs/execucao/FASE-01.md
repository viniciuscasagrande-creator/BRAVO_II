# FASE 01 — Fundação do Core, Autenticação, RBAC/Escopos, Navegação pt-BR, Migrations e Auditoria

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída e Verificada

---

## 1. Objetivo da Fase 01

Construir a fundação funcional e compilável do **BRAVO_II** inteiramente do zero (sem depender de código-fonte, banco de dados ou APIs do SIGE legado), entregando:
- Monorepo TypeScript (`pnpm workspaces`) com packages compartilhados e apps de domínio;
- Banco de dados PostgreSQL próprio com migrations versionadas e reversíveis (`0001_core_foundation.up.sql` / `.down.sql`);
- Provedor local de autenticação e sessão única (`scrypt` + `sha256` token hash);
- Autorização RBAC + ABAC contextual por escopo de produtor (`user_producer_scopes`) e evento (`user_event_scopes`);
- Segregação da **Taxa Disk por evento** (`PERCENTAGE` ou `FIXED`, escopo `INTERNAL_DISK`, jamais global por produtor e nunca exposta ao PDT ou SAC);
- Segregação de alçada entre SAC e Financeiro no estorno (`SAC solicita → Financeiro aprova → conclusão só após callback do provedor`);
- Menu lateral dinâmico 100% em pt-BR no Backoffice Next.js com todas as 15 áreas operacionais apontando para rotas reais e estados vazios honestos (zero dados fictícios);
- Trilha de auditoria imutável (`audit_records` protegida por trigger PostgreSQL contra `UPDATE` e `DELETE`);
- Testes unitários e E2E automatizados validando os 3 perfis exigidos (`FINANCEIRO_DISK`, `PRODUTOR_PDT`, `SAC_ATENDIMENTO`).

---

## 2. Inventário de Arquivos Criados / Alterados

### Raiz e Infraestrutura
- `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.base.json`, `.env.example`, `.gitignore`
- `infrastructure/docker-compose.dev.yml`
- `database/migrations/0001_core_foundation.up.sql`
- `database/migrations/0001_core_foundation.down.sql`
- `database/seeds/README.md`

### Packages Compartilhados (`packages/*`)
- `packages/config/src/index.ts` (`@bravo-ii/config`) — Carregamento de variáveis e bloqueio de segurança que impede ativar gateways bancários reais fora de produção homologada.
- `packages/contracts/src/index.ts` e `src/index.spec.ts` (`@bravo-ii/contracts`) — Papéis canônicos RBAC, permissões, catálogo das 15 seções do menu, cálculo em centavos da Taxa Disk por evento, validação do código público de 8 dígitos (`^[0-9]{8}$`) e DTOs.
- `packages/telemetry/src/index.ts` (`@bravo-ii/telemetry`) — Logger estruturado com mascaramento automático de PII (CPF, tokens, senhas), `correlationId` e hash SHA-256 de integridade de auditoria.
- `packages/sdk/src/index.ts` (`@bravo-ii/sdk`) — Cliente HTTP tipado para consumo da API `/api/v1`.
- `packages/ui/src/index.tsx` (`@bravo-ii/ui`) — Componentes base do Design System em pt-BR (`PageHeader`, `HonestEmptyState`, `MetricSummaryCard`, formatadores de moeda BRL e data/hora).
- `packages/testing/src/index.ts` (`@bravo-ii/testing`) — Fixtures estritamente isoladas para suítes de teste (`NODE_ENV=test`).

### Aplicações (`apps/*`)
- `apps/api/` (`@bravo-ii/api` — Monólito Modular NestJS):
  - `src/common/database/database.service.ts` e `database.module.ts`
  - `src/common/auth/crypto.util.ts`, `crypto.unit.spec.ts`, `auth.guard.ts`
  - `src/common/errors/api-exception.filter.ts`
  - `src/common/health/health.controller.ts` (`GET /health` e `GET /api/v1/health`)
  - `src/modules/governance/audit.service.ts`, `governance.controller.ts`, `governance.module.ts`
  - `src/modules/identity/identity.service.ts`, `identity.controller.ts`, `identity.module.ts`
  - `src/modules/events/events.service.ts`, `events.controller.ts`, `events.module.ts`
  - `src/modules/refunds/refunds.service.ts`, `refunds.controller.ts`, `refunds.module.ts`
  - Módulos de domínio isolados: `producers`, `customers`, `commercial`, `inventory`, `orders`, `tickets`, `payments`, `point-of-sale`, `service-desk`, `coupons`, `pricing-fees`, `finance`, `marketing`, `messaging`, `gate-control`, `reporting`
  - `src/bootstrap/app.module.ts` e `src/bootstrap/foundation.e2e.spec.ts`
  - `src/scripts/run-migrations.ts` e `src/scripts/run-technical-seed.ts`
- `apps/backoffice/` (`@bravo-ii/backoffice` — Next.js App Router pt-BR):
  - `src/context/session-context.tsx`, `src/components/bravo-shell.tsx`, `src/components/module-foundation-view.tsx`
  - 16 rotas implementadas: `/`, `/login`, `/comercial`, `/eventos`, `/pedidos-vendas`, `/ingressos-portaria`, `/sac`, `/cupons-cortesias`, `/financeiro`, `/estornos`, `/marketing`, `/remarketing`, `/produtores-pdt`, `/relatorios`, `/cadastros`, `/administracao`.
- `apps/pdt-adapter/src/index.ts` (`@bravo-ii/pdt-adapter` — BFF com sanitização dupla contra vazamento de Taxa Disk interna).
- `apps/pdv/src/index.ts` (`@bravo-ii/pdv`).
- `apps/workers/src/index.ts` (`@bravo-ii/workers`).

---

## 3. Tabelas Persistidas no PostgreSQL (`0001_core_foundation.up.sql`)

| Tabela | Finalidade |
|---|---|
| `schema_migrations` | Controle de versões de migrations aplicadas |
| `users`, `roles`, `permissions`, `role_permissions`, `user_role_grants` | Identidade e RBAC |
| `user_producer_scopes`, `user_event_scopes` | Escopo contextual ABAC por produtor e por evento |
| `auth_sessions` | Sessões autenticadas com hash SHA-256 de token e expiração/revogação |
| `producers`, `events`, `event_producers` | Cadastro base de produtores PJ, eventos e vínculo N:N com `source_system = 'BRAVO_II'` |
| `event_fee_agreements` | **Taxa Disk por evento** (`PERCENTAGE` ou `FIXED`), versionada e restrita a `INTERNAL_DISK` |
| `refund_requests` | Solicitações de estorno com máquina de estados segregada |
| `audit_records` | Trilha de auditoria imutável (com trigger `trg_forbid_audit_records_mutation`) |
| `outbox_events` | Outbox transacional para publicação confiável de eventos de domínio |

---

## 4. Comandos Executados e Resultados Reais

1. **Migrations PostgreSQL (`pnpm db:migrate`)**:
   - Resultado: `status: "ok"`, migration `0001_core_foundation.up.sql` aplicada com sucesso em `.data/postgres`.
2. **Seed Técnico (`pnpm db:seed:technical`)**:
   - Resultado: `status: "ok"`, 10 papéis RBAC e permissões sincronizados, 3 contas técnicas de operador local criadas (`FINANCEIRO_DISK`, `SAC_ATENDIMENTO`, `PRODUTOR_PDT`), `businessTablesEmpty: true`.
3. **Testes Unitários (`pnpm test`)**:
   - `@bravo-ii/contracts`: 4/4 testes aprovados (cálculo exato em centavos da Taxa Disk fixa e percentual, validação do schema `INTERNAL_DISK`, regex `^[0-9]{8}$` do ticket e filtro de menu por perfil).
   - `@bravo-ii/api`: 2/2 testes aprovados (hash `scrypt` e tokens SHA-256).
4. **Testes E2E de Rotas, Escopos e Auditoria (`pnpm test:e2e`)**:
   - `@bravo-ii/api`: 4/4 cenários E2E aprovados sobre banco PostgreSQL:
     - `GET /health` retorna `200 OK` com `database: "connected"` e `realFinancialGatewaysBlocked: true`.
     - Estado inicial sem dados de negócio retorna contadores zerados reais (`0` eventos, `0` estornos).
     - Validação dos 3 perfis (`Financeiro Disk`, `SAC`, `Produtor PDT`) com 2 produtores e 2 eventos com Taxas Disk distintas (`12.5%` no Evento Alpha e `R$ 18,00` fixo no Evento Beta):
       - `Financeiro Disk` lê ambos os eventos e visualiza `internalDiskFeeAgreement`.
       - `SAC` lê eventos para atendimento, mas `internalDiskFeeAgreement` vem `undefined`.
       - `Produtor Alpha (PDT)` lista apenas o Evento Alpha (`internalDiskFeeAgreement === undefined`) e recebe **`403 FORBIDDEN` (`CROSS_EVENT_SCOPE_FORBIDDEN`)** ao tentar acessar o Evento Beta de outro produtor.
       - `SAC` recebe **`403 FORBIDDEN`** ao tentar aprovar estorno em `POST /api/v1/refunds/:id/approve`.
       - `Financeiro Disk` aprova estorno, transicionando para `APROVADO` com `providerConfirmed: false` (nunca direto para `CONCLUIDO`).
       - Todas as ações aprovadas e negadas ficam gravadas em `audit_records` e o trigger PostgreSQL bloqueia `UPDATE` e `DELETE`.
5. **Typecheck e Build Completo (`pnpm typecheck` e `pnpm build`)**:
   - Todos os 12 projetos do workspace (`packages/*` e `apps/*`, incluindo `next build` do Backoffice) compilados sem erros.

---

## 5. Instruções de Boot Local e Preview

```powershell
# 1. Aplicar migrations no banco PostgreSQL local (.data/postgres ou DATABASE_URL)
pnpm db:migrate

# 2. Sincronizar catálogo técnico RBAC e operadores locais de teste (sem dados falsos de negócio)
pnpm db:seed:technical

# 3. Iniciar a API NestJS (porta 4000)
pnpm dev:api

# 4. Em outro terminal, iniciar o Backoffice Next.js (porta 3000)
pnpm dev:backoffice
```

---

## 6. Confirmação Explícita de Governança e Próximo Passo

- **Confirmação de Segurança**: Nenhuma operação financeira real (pagamento, estorno ou repasse) foi executada; todas as travas `ALLOW_REAL_*` estão em `false`. Nenhuma dependência do código-fonte do SIGE foi criada.
- **Próxima Fase Sugerida (Pacote 02)**: Implementar o fluxo vertical persistido de **Comercial e Produtores** (cadastro completo de Produtor PJ, representantes, contratos e criação/versionamento/aprovação da **Taxa Disk por evento**).
