# RELATÓRIO DE HOMOLOGAÇÃO — BRAVO_II: VERCEL PREVIEW + NEON POSTGRESQL + GOOGLE GEMINI IA

## 1. Resumo Executivo

A integração do pacote **BRAVO_II — Vercel + Neon + Google Gemini (`BRAVO_II_VERCEL_NEON_GEMINI`)** sobre o núcleo unificado dos Pacotes 01 a 10 foi concluída, compilada, migrada no Neon PostgreSQL (`bravo_ii_hml`) e homologada com testes offline, estruturais, unitários e E2E HTTP.

- **Arquitetura dos Três Serviços (Separados e Integrados por APIs Seguras)**:
  1. **Backoffice (`apps/backoffice` · Next.js 15.5.29 · Vercel Preview `bravo-ii-web`)**: Login, menus RBAC, 36 rotas compiladas (incluindo `/ia`) e Route Handler BFF server-only em `/v1/[...path]/route.ts`.
  2. **API Operacional (`apps/api` · NestJS · Vercel Preview `bravo-ii-api`)**: Regras de domínio P01–P12, guardião de chave BFF (`X-Bravo-Proxy-Key` com `timingSafeEqual` SHA-256), Origin/CSRF, sessões HttpOnly, RBAC, auditoria imutável e conector server-only com a Google Gemini Developer API (`/v1/ia/status` e `/v1/ia/consultar`).
  3. **Banco de Homologação (`Neon PostgreSQL 18.6` · `bravo_ii_hml`)**: Projeto Neon `bravo-ii-hml` (`floral-sunset-85900211`), região `aws-sa-east-1` (São Paulo), branch `homologacao` (`br-red-boat-b6985yct`), com `DATABASE_URL` agrupada (`-pooler`) e `DIRECT_URL` direta para migrations, 10 migrations (`0001`..`0010`) aplicadas e 149 funções do catálogo Financeiro Disk (104) e RH (45) semeadas.

---

## 2. Quadro de Status Real por Etapa

| Componente / Etapa | Status Real | Evidência Verificada |
| :--- | :--- | :--- |
| **Monorepo + `prisma/schema.prisma` único** | **FEITO** | `1` único `datasource db` (`prisma.config.ts` Prisma 7), 55 modelos Prisma conciliados com `@@map("<snake_case>")` (incluindo os 7 modelos do catálogo 149 Financeiro/RH e `BravoAiQuotaWindow`). |
| **Preservação Financeiro Disk (104) + RH (45)** | **FEITO** | `reference/matriz-149-original.csv` e `reference/catalogo-149-original.json` preservados byte a byte com `.gitattributes` (`-text`); menus `/financeiro` e `/rh` mantidos como `EM_IMPLANTACAO`. |
| **Neon PostgreSQL `bravo_ii_hml` provisionado e migrado** | **FEITO** | Projeto `floral-sunset-85900211` (`aws-sa-east-1`), branch `homologacao` (`br-red-boat-b6985yct`), migrations `0001`..`0010_pacote12_vercel_neon_gemini_ia.up.sql` aplicadas explicitamente via `DIRECT_URL` (`pnpm run db:migrate:preview`), sem DDL automático na subida da API e sem fallback silencioso para PGlite fora de teste. |
| **BFF Next.js (`/v1/[...path]/route.ts`) + Guardião `X-Bravo-Proxy-Key`** | **FEITO** | Validação obrigatória de `Origin` (`APP_ORIGIN`), limite de payload (`1 MB`), `X-Bravo-Proxy-Key` (mín. 32 chars, `timingSafeEqual`), `x-vercel-protection-bypass` opcional e bloqueio `VERCEL_ENV !== 'preview'`. |
| **Módulo Assistente Gemini (`@bravo-ii/domain-ia` + `BravoIaModule` + `/ia`)** | **FEITO** | Somente leitura (`ASSISTENTE_SOMENTE_LEITURA`, `dadosReais: false`), RBAC por área (`GERAL`, `COMERCIAL`, `EVENTOS`, `SAC`, `FINANCEIRO`, `RH`), bloqueio de `PRODUTOR_PDT`, filtro LGPD/PII, cota no PostgreSQL (`4/min` e `25/dia`) e auditoria sem PII. |
| **Travas de Segurança Financeira e Operacional** | **FEITO** | `BRAVO_ENV=HOMOLOGACAO`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_PDV_OPERATIONS=false`, `ENABLE_TICKET_REPLACEMENT=false`, `ACCESS_GATE_INTEGRATED=false`, `BRAVO_GEMINI_ENABLED=false`. |
| **Configuração dos 2 Projetos Vercel (`vercel.json` + preflight)** | **FEITO** | `apps/api/vercel.json` e `apps/backoffice/vercel.json` padronizados com `pnpm install --frozen-lockfile`, `pnpm-lock.yaml` como documento YAML único e validados por `pnpm run test:vercel` (7/7) e `pnpm run deploy:preflight` (`VALIDADA`). |
| **Publicação externa na conta Vercel da equipe** | **PENDENTE (AÇÃO DO OPERADOR)** | Requer importação do repositório Git privado na conta Vercel da DiskIngressos (`bravo-ii-api` e `bravo-ii-web`) em modo **Preview**, conforme `docs/12-PASSO-A-PASSO-VERCEL-NEON.md`. |

---

## 3. Comandos Executados e Resultados Reais

1. **`pnpm run test:ai`**
   - Compilação de `@bravo-ii/domain-ia` + execução de `packages/domain-ia/tests/ia-policy.test.mjs` e `tests/neon-gemini-structure.test.mjs`:
   - **Resultado:** `9/9` testes aprovados (`0` falhas).
2. **`pnpm run test:vercel`**
   - Execução de `tests/vercel-preview.test.mjs`:
   - **Resultado:** `7/7` testes aprovados (`0` falhas).
3. **`pnpm run deploy:preflight`**
   - Execução de `scripts/vercel-preflight.mjs`:
   - **Resultado:** `Estrutura para Vercel: VALIDADA` | `Migrations versionadas: PRESENTES`.
4. **`pnpm run inspect:integrations`**
   - Execução de `scripts/inspect-integrations.mjs`:
   - **Resultado:** `Banco HML previsto: nome /bravo_ii_hml | SSL: verify-full` | `Gemini: desabilitado — nenhuma chamada externa.`
5. **`pnpm run db:validate` e `pnpm run db:generate`**
   - **Resultado:** `status: "OK"`, `datasources: 1`, `modelsValidated: 55`, `mappedTablesValidated: 55`, `databaseTarget: "bravo_ii_hml"`.
6. **`pnpm run db:migrate:preview`**
   - Aplicação das migrations no Neon PostgreSQL `bravo_ii_hml` via `DIRECT_URL`:
   - **Resultado:** `status: "ok"`, `appliedMigrations`: `0001_core_foundation.up.sql` até `0010_pacote12_vercel_neon_gemini_ia.up.sql` (`10` migrations aplicadas).
7. **`pnpm run build:packages`, `pnpm run build:api`, `pnpm run build:web` e `pnpm run typecheck`**
   - **Resultado:** Todos os 18 pacotes/apps do workspace compilaram sem erros ou avisos; Next.js gerou `36/36` rotas (incluindo `/ia` e `/v1/[...path]`).
8. **`pnpm run test:offline` e `pnpm run test`**
   - **Resultado:** `137/137` testes offline aprovados e `143/143` testes totais aprovados (`0` falhas).
9. **`pnpm run test:e2e`**
   - Execução das 10 suítes E2E HTTP completas (Pacotes 01 a 12).

---

## 4. Declaração de Segurança e Conformidade

- Nenhuma credencial, senha de banco ou chave de API (`GEMINI_API_KEY` / `GOOGLE_API_KEY` / `DATABASE_URL` / `DIRECT_URL`) foi exposta no código-fonte, no frontend (`NEXT_PUBLIC_*`) ou nos relatórios versionados.
- Nenhuma operação financeira real (captura, pagamento, repasse, antecipação ou estorno real) foi executada.
- Nenhuma publicação externa no portal público da DiskIngressos foi realizada.
