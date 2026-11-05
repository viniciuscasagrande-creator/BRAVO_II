# Relatório de Execução e Homologação — Pacote 07 + Revisão Técnica (PostgreSQL, Autenticação Central, CSRF/Origin, Lockout Temporário e Navegação por Perfil)

## 1. Objetivo da Fase
Integrar e homologar o **Pacote 07 (`BRAVO_II_PACOTE_07.zip`)** e sua **Revisão Técnica (`BRAVO_II_PACOTE_07_REVISAO_HOMOLOGACAO.zip` / `BRAVO_II_P07_CORRIGIDO`)** no núcleo real do **BRAVO_II**, garantindo:
- **PostgreSQL + Migrations Auditáveis + Schema Prisma Unificado**: Único núcleo de banco de dados (`6/6` migrations SQL reversíveis aplicadas em [`database/migrations`](file:///E:/BRAVO_II/database/migrations) e schema [`prisma/schema.prisma`](file:///E:/BRAVO_II/prisma/schema.prisma) unificado), com proteção contra uso acidental de banco operacional em homologação (`bravo_ii_hml`).
- **Autenticação Central (`Cookie HttpOnly` + `X-CSRF-Token` + `Origin`)**: Login, consulta de sessão (`/v1/auth/me`), revogação de sessão no PostgreSQL (`/v1/auth/logout`), cookie `bravo_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`), token CSRF determinístico por sessão (`HMAC-SHA256`) e validação estrita de `Origin` em requisições mutantes (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Correção do Bloqueio Temporário de Login (`isLoginLocked` + `nextFailedLogin`)**: Após 5 tentativas inválidas, a conta é bloqueada por 30 minutos (`locked_until`); expirado o prazo de 30 minutos, o bloqueio expira automaticamente e a contagem recomeça ou é zerada após login válido.
- **Navegação Centralizada por Perfil (`/v1/navegacao/menu`)**: Filtragem canônica por papel (`ADMIN`, `COMERCIAL`, `CADASTRO`, `OPERACOES`, `PUBLICACAO`, `FINANCEIRO_DISK`, `AUDITOR`, `RH`, `PRODUTOR`), mantendo Financeiro Disk (`104` funções) e RH (`45` funções) sinalizados como `EM_IMPLANTACAO` no menu de homologação P07 e negando menu interno do ERP ao `PRODUTOR`.
- **Script de Pré-Verificação (`doctor` e `doctor:ready`)**: Validação automatizada de `BRAVO_ENV=HOMOLOGACAO`, banco `bravo_ii_hml`, travas `ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, compilação de pacotes, API NestJS, frontend Next.js e migrations.

---

## 2. Inventário Prévio e Arquivos Criados/Alterados

### 2.1. Pacotes de Referência Extraídos e Verificados
- [`referencias/BRAVO_II_PACOTE_07/BRAVO_II_PACOTE_07`](file:///E:/BRAVO_II/referencias/BRAVO_II_PACOTE_07/BRAVO_II_PACOTE_07) (`75` arquivos)
- [`referencias/BRAVO_II_PACOTE_07_REVISAO_HOMOLOGACAO/BRAVO_II_P07_CORRIGIDO`](file:///E:/BRAVO_II/referencias/BRAVO_II_PACOTE_07_REVISAO_HOMOLOGACAO/BRAVO_II_P07_CORRIGIDO) (`78` arquivos)
- [`reference/matriz-149-original.csv`](file:///E:/BRAVO_II/reference/matriz-149-original.csv) (Matriz original das `149` funções — `104` Financeiro + `45` RH)

### 2.2. Pacote de Política e Segurança Core (`@bravo-ii/core-policy`)
- [`packages/core-policy/package.json`](file:///E:/BRAVO_II/packages/core-policy/package.json)
- [`packages/core-policy/tsconfig.json`](file:///E:/BRAVO_II/packages/core-policy/tsconfig.json)
- [`packages/core-policy/src/index.ts`](file:///E:/BRAVO_II/packages/core-policy/src/index.ts) — `MENU`, `menuForRoles`, `isPermittedNav`, `originAllowed`, `isMutating`, `assertCookieToken`, `isLoginLocked`, `nextFailedLogin`, `validateHomologationEnv`.
- [`packages/core-policy/src/policy.spec.ts`](file:///E:/BRAVO_II/packages/core-policy/src/policy.spec.ts) — `9` testes unitários cobrindo RBAC de menu, `Origin`, `CSRF`, `bravo_session`, expiração de bloqueio temporário de 30 minutos e validação de ambiente de homologação.

### 2.3. Banco de Dados, Migrations e Prisma
- [`database/migrations/0006_pacote07_auth_lockout_csrf_and_prisma_sync.up.sql`](file:///E:/BRAVO_II/database/migrations/0006_pacote07_auth_lockout_csrf_and_prisma_sync.up.sql) e [`.down.sql`](file:///E:/BRAVO_II/database/migrations/0006_pacote07_auth_lockout_csrf_and_prisma_sync.down.sql) — adiciona `failed_logins`, `locked_until` e `force_password_change` em `users` e índice `idx_auth_sessions_active_lookup` em `auth_sessions`.
- [`prisma/schema.prisma`](file:///E:/BRAVO_II/prisma/schema.prisma) — schema unificado do núcleo BRAVO_II.
- [`docker-compose.yml`](file:///E:/BRAVO_II/docker-compose.yml) — serviço PostgreSQL 16 isolado com banco `bravo_ii_hml`.

### 2.4. Backend NestJS (`@bravo-ii/api`)
- [`apps/api/src/main.ts`](file:///E:/BRAVO_II/apps/api/src/main.ts) — executa `validateHomologationEnv` quando `BRAVO_ENV=HOMOLOGACAO` antes de abrir porta HTTP.
- [`apps/api/src/common/auth/crypto.util.ts`](file:///E:/BRAVO_II/apps/api/src/common/auth/crypto.util.ts) — `generateCookieSessionToken` (43 chars `base64url`), `csrfForToken` (`HMAC-SHA256`), `compareSecret` (`timingSafeEqual`).
- [`apps/api/src/common/auth/auth.guard.ts`](file:///E:/BRAVO_II/apps/api/src/common/auth/auth.guard.ts) — suporte dual (`Cookie: bravo_session` + `Authorization: Bearer`), exigindo `originAllowed` + `X-CSRF-Token` em mutações autenticadas por cookie.
- [`apps/api/src/modules/identity/identity.service.ts`](file:///E:/BRAVO_II/apps/api/src/modules/identity/identity.service.ts) — login com `isLoginLocked` e `nextFailedLogin` (bloqueio temporário de 30 minutos com retomada após expiração), revogação de sessão em `auth_sessions` e menu por perfil (`getP07MenuForActor`).
- [`apps/api/src/modules/identity/identity.controller.ts`](file:///E:/BRAVO_II/apps/api/src/modules/identity/identity.controller.ts) — rotas `/v1/auth/login`, `/v1/auth/me`, `/v1/auth/logout` e `/v1/navegacao/menu`.
- [`apps/api/src/modules/health/health.controller.ts`](file:///E:/BRAVO_II/apps/api/src/modules/health/health.controller.ts) — rotas `/v1/saude` e `/v1/saude/banco`.
- [`apps/api/src/bootstrap/pacote07-homologacao-auth-csrf-nav.e2e.spec.ts`](file:///E:/BRAVO_II/apps/api/src/bootstrap/pacote07-homologacao-auth-csrf-nav.e2e.spec.ts) — suíte E2E completa do Pacote 07 + Revisão.

### 2.5. Frontend Next.js (`@bravo-ii/backoffice`) e Scripts Operacionais
- [`apps/backoffice/next.config.mjs`](file:///E:/BRAVO_II/apps/backoffice/next.config.mjs) — proxy same-origin `/v1/:path*` para `BRAVO_API_URL`.
- [`apps/backoffice/src/lib/bravo-api.ts`](file:///E:/BRAVO_II/apps/backoffice/src/lib/bravo-api.ts) — cliente HTTP same-origin (`credentials: 'same-origin'`) com injeção automática de `X-CSRF-Token` em mutações.
- [`scripts/doctor.mjs`](file:///E:/BRAVO_II/scripts/doctor.mjs), [`scripts/bootstrap-admin.mjs`](file:///E:/BRAVO_II/scripts/bootstrap-admin.mjs), [`scripts/smoke.mjs`](file:///E:/BRAVO_II/scripts/smoke.mjs) e [`tests/integrity.test.mjs`](file:///E:/BRAVO_II/tests/integrity.test.mjs).

---

## 3. Evidências de Testes, Doctor e Build

### 3.1. Comandos Executados e Resultados Reais

| Etapa | Comando Executado | Resultado |
|---|---|---|
| Pré-verificação de configuração (`doctor`) | `npm run doctor` | **APROVADA** (`Ambiente: HOMOLOGACAO \| Banco: /bravo_ii_hml \| Origem: http://localhost:3000`) |
| Pré-verificação de prontidão (`doctor:ready`) | `npm run doctor:ready` | **APROVADA** (Dependências, builds API/Next.js e migrations verificados) |
| Migrations PostgreSQL | `pnpm db:migrate` | **6/6 migrations aplicadas** (`0001` a `0006`) |
| Testes Offline Pacote 07 Revisado | `pnpm --filter @bravo-ii/core-policy test`, `pnpm --filter @bravo-ii/domain-p06 test`, `node --test tests/*.test.mjs` | **33/33 aprovados** (`9` core-policy + `15` domain-p06 + `9` integridade) |
| Total de Testes Unitários/Integridade do Repositório | `pnpm test` | **39/39 aprovados** (`33` Pacote 07 + `4` contracts + `2` api crypto) |
| Testes de Integração E2E (PostgreSQL + API NestJS) | `pnpm test:e2e` | **27/27 aprovados em 6 suítes E2E** (Fase 01, Fases 02-03, Fases 04-05, Pacote Mestre 149 funções, Pacote 06, Pacote 07) |
| Typecheck Monorepo | `pnpm typecheck` | **10/10 pacotes e aplicações sem erros** |
| Build Produção Monorepo (NestJS + Next.js) | `pnpm build` | **10/10 compilados com sucesso** (`23/23` rotas Next.js geradas) |

---

## 4. Status Separado por Categoria (Conforme Prompt Mestre Pacote 07)

### ✅ Comprovado por Testes Automatizados (Unitários, Integridade e E2E HTTP + PostgreSQL)
- **33/33 testes do Pacote 07 Revisado** (`15` regras de domínio P06, `9` segurança/navegação/lockout/homologação em `@bravo-ii/core-policy`, `9` integridade estrutural).
- **27/27 testes E2E HTTP reais** contra o motor PostgreSQL, cobrindo:
  - `/v1/saude` e `/v1/saude/banco` conectados e reportando `publicacaoExterna: false` e `pagamentosReais: false`.
  - `/v1/auth/login`, `/v1/auth/me`, `/v1/auth/logout` com cookie `bravo_session` (`HttpOnly`, `SameSite=Lax`), bloqueio `403` para `Origin` inválida, bloqueio `403` para `POST` sem `X-CSRF-Token` e revogação imediata da sessão no logout.
  - Bloqueio temporário após 5 tentativas de senha incorreta (`403 ACCOUNT_LOCKED`) e **retomada automática após expiração do prazo de 30 minutos**, zerando `failed_logins`.
  - Filtragem de `/v1/navegacao/menu` para os perfis `ADMIN`, `COMERCIAL`, `OPERACOES`, `FINANCEIRO_DISK`, `RH` e `PRODUTOR` (que recebe `[]` no menu interno do ERP).
  - Isolamento da **Taxa Disk por evento** (dois eventos do mesmo produtor com taxas distintas: `625 bps` vs `R$ 4,50` fixa) e ocultação total da Taxa Disk para `OPERACAO_EVENTOS` e `PRODUTOR_PDT`.
  - Preservação das **149 funções** (`104` Financeiro Disk + `45` RH & DP).
- **Build completo** de todos os pacotes, backend NestJS (`apps/api/dist/main.js`) e frontend Next.js (`apps/backoffice/.next/BUILD_ID`) validado por `npm run doctor:ready`.

### ⚠️ Pendente de Ambiente Externo (Deploy Preview Cloud)
- **Publicação em URL de Preview Cloud HTTPS externa**: O código, o `Dockerfile`/`docker-compose.yml`, os scripts `doctor`, `doctor:ready`, `bootstrap:admin` e `smoke.mjs` estão prontos e validados localmente. A publicação em infraestrutura cloud externa (URL HTTPS pública de Preview) aguarda definição do provedor/host de Preview e credenciais do banco gerenciado de homologação pelo usuário.

### ❌ Operações Bloqueadas por Segurança (Confirmadas Desativadas)
- **Nenhuma operação financeira real, pagamento, estorno, repasse, antecipação ou publicação no site oficial `diskingressos.com.br` foi ou pode ser executada** (`ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ALLOW_REAL_PAYMENT_GATEWAY=false`, `ALLOW_REAL_REFUND_EXECUTION=false`, `ALLOW_REAL_PAYOUT_EXECUTION=false`).
