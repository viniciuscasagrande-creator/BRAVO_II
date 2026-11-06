# FASE 12 — Registro de Execução: Arquitetura Vercel Preview + Neon PostgreSQL + Assistente Google Gemini

## 1. Objetivo da Fase
Integrar e homologar o pacote **BRAVO_II — Vercel + Neon + Google Gemini (`BRAVO_II_VERCEL_NEON_GEMINI`)** sobre a base unificada dos Pacotes 01 a 10 em `E:\BRAVO_II`, compreendendo:
- **Assistente Consultivo Google Gemini (`@bravo-ii/domain-ia`, `BravoIaModule`, `/v1/ia/*`, `/ia`)**:
  - Modo estritamente consultivo (`ASSISTENTE_SOMENTE_LEITURA`, `dadosReais: false`), sem ferramentas de mutação e sem leitura automática de registros operacionais;
  - Controle de acesso por departamento (`GERAL`, `COMERCIAL`, `EVENTOS`, `SAC`, `FINANCEIRO`, `RH`), bloqueando `PRODUTOR_PDT` e impedindo perfis de acessarem tópicos fora de sua alçada (ex.: `SAC` bloqueado em `FINANCEIRO` e `RH`);
  - Bloqueio conservador de PII/LGPD (CPF, CNPJ, RG, PIX, e-mail, telefone, cartão, conta bancária, senha, token e dados pessoais);
  - Contagem atômica de cotas no PostgreSQL (`BravoAiQuotaWindow` / `p12_ai_quota_windows`: máximo de **4 consultas/minuto** e **25 consultas/dia** por usuário);
  - Auditoria imutável (`IA_CONSULTA`, `IA_RESPOSTA`, `IA_FALHA` em `audit_logs`) registrando apenas metadados (`area`, `modelo`, `caracteres`, `status`) sem armazenar o texto das perguntas ou respostas;
  - Desabilitado por padrão (`BRAVO_GEMINI_ENABLED=false`).
- **Arquitetura de Hospedagem Vercel Preview (2 projetos) + BFF Seguro**:
  - `apps/backoffice/vercel.json` (`bravo-ii-web`) e `apps/api/vercel.json` (`bravo-ii-api`);
  - Route Handler BFF server-only em `apps/backoffice/src/app/v1/[...path]/route.ts` substituindo rewrites públicos de navegador, validando `Origin` (`browserOrigin!==ownOrigin`), tamanho máximo de payload (`MAX_JSON_BYTES`), cabeçalho interno `X-Bravo-Proxy-Key` (`BRAVO_PROXY_KEY`) e repasse opcional de `x-vercel-protection-bypass` (`BRAVO_API_VERCEL_BYPASS_TOKEN`);
  - Guardião de chave interna em tempo constante (`timingSafeEqual` SHA-256, mínimo 32 caracteres) em `apps/api/src/core/security/proxy-guard.ts` e `apps/api/src/main.ts`;
  - Bloqueio explícito contra deploy em `VERCEL_ENV !== 'preview'` tanto no Next.js quanto no NestJS.
- **Banco de Homologação Neon PostgreSQL (`bravo_ii_hml`)**:
  - Projeto Neon `bravo-ii-hml` (`floral-sunset-85900211`) provisionado na região `aws-sa-east-1` (São Paulo), branch `homologacao` (`br-red-boat-b6985yct`), PostgreSQL 18.6;
  - Conexão agrupada (`-pooler`) em `DATABASE_URL` e conexão direta em `DIRECT_URL`;
  - Aplicação das 10 migrations (`0001` a `0010_pacote12_vercel_neon_gemini_ia.up.sql`) e do seed técnico (`13` perfis canônicos + `149` funções catalogadas de Financeiro Disk e RH).

## 2. Arquivos Criados e Alterados
- **Domínio e Políticas**:
  - `packages/domain-ia/package.json`
  - `packages/domain-ia/tsconfig.json`
  - `packages/domain-ia/src/index.ts`
  - `packages/domain-ia/tests/ia-policy.test.mjs`
  - `packages/core-policy/src/index.ts` (inclusão do item de menu `ia` — `Assistente Gemini · Homologação` em `/ia`)
- **Banco de Dados e Schema**:
  - `prisma/schema.prisma` (`directUrl = env("DIRECT_URL")` e `model BravoAiQuotaWindow`)
  - `database/migrations/0010_pacote12_vercel_neon_gemini_ia.up.sql`
  - `database/migrations/0010_pacote12_vercel_neon_gemini_ia.down.sql`
  - `prisma/migrations/20261106140000_init_bravo_ii/migration.sql`
- **API NestJS (`apps/api`)**:
  - `apps/api/src/core/security/proxy-guard.ts`
  - `apps/api/src/modules/ia/ia.service.ts`
  - `apps/api/src/modules/ia/ia.controller.ts`
  - `apps/api/src/modules/ia/ia.module.ts`
  - `apps/api/src/bootstrap/app.module.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/main.ts`
  - `apps/api/vercel.json`
  - `apps/api/.env.vercel-preview.example`
  - `apps/api/src/bootstrap/pacote12-vercel-neon-gemini-ia.e2e.spec.ts`
- **Backoffice Next.js (`apps/backoffice`)**:
  - `apps/backoffice/src/app/(erp)/ia/page.tsx`
  - `apps/backoffice/src/app/v1/[...path]/route.ts`
  - `apps/backoffice/next.config.mjs`
  - `apps/backoffice/vercel.json`
  - `apps/backoffice/.env.vercel-preview.example`
- **Scripts, Testes Estruturais e Documentação**:
  - `.env.vercel-migration.example`
  - `scripts/inspect-integrations.mjs`
  - `scripts/migrate-preview.mjs`
  - `scripts/vercel-preflight.mjs`
  - `scripts/test-offline.sh`
  - `tests/neon-gemini-structure.test.mjs`
  - `tests/vercel-preview.test.mjs`
  - `GEMINI-DEPLOY.md`, `README-VERCEL.md`, `docs/11-SEGURANCA-E-HOMOLOGACAO.md`, `docs/12-ARQUITETURA-FINAL.md`, `docs/12-PASSO-A-PASSO-VERCEL-NEON.md`, `prompts/11-GEMINI-VERCEL-PREVIEW.md`, `prompts/12-GEMINI-EXECUTAR-VERCEL-NEON-IA.md`

## 3. Preservação Integral do Catálogo Financeiro Disk (104) e RH (45)
- `reference/matriz-149-original.csv` e `reference/catalogo-149-original.json` preservados byte a byte (104 funções do Financeiro Disk + 45 funções de RH e DP = 149 funções catalogadas como `EM_IMPLANTACAO`).

## 4. Confirmação Explícita de Segurança Operacional
- Nenhuma operação financeira real (pagamento, captura, repasse, antecipação ou estorno real) foi executada.
- Nenhuma publicação externa no portal público da DiskIngressos foi realizada.
- Nenhuma substituição física de ingresso sem integração de portaria foi habilitada.
- `BRAVO_GEMINI_ENABLED=false` mantido como padrão seguro em homologação.
