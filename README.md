# BRAVO_II — Novo ERP Modular da DiskIngressos (`v0.12.0-neon-gemini-hml`)

O **BRAVO_II** é o núcleo interno e modular da operação **DiskIngressos** (sucessor independente do legado SIGE, construído do zero em TypeScript).

---

## 1. Arquitetura do Monorepo

| Camada | Diretório | Tecnologia | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Backoffice + BFF** | `apps/backoffice` | Next.js 15 (React 19, App Router) | Login, 36 rotas RBAC em pt-BR, Route Handler BFF (`/v1/[...path]/route.ts`) com `X-Bravo-Proxy-Key` |
| **API Operacional** | `apps/api` | NestJS 10 + PostgreSQL (`pg`) | Identidade, RBAC/ABAC, Comercial, Produtores PJ, Event Builder, Vendas, Ingressos (8 dígitos + QR), Checkout, PDV, SAC, Pós-Venda, Dupla Aprovação de Estornos, Catálogo Financeiro/RH (149) e Assistente Gemini (`/v1/ia/*`) |
| **Pacotes de Domínio** | `packages/*` | TypeScript (`NodeNext`) | `core-policy`, `contracts`, `config`, `telemetry`, `ui`, `sdk`, `testing`, `domain-p06`, `domain-p08`, `domain-p09`, `domain-p10`, `domain-ia` |
| **Banco de Dados** | `database/migrations` + `prisma/schema.prisma` | PostgreSQL 18 (Neon `bravo_ii_hml`) | 10 migrations SQL versionadas (`0001`..`0010`) e 55 modelos Prisma mapeados (`@@map`) para o mesmo schema físico |
| **Catálogo Preservado** | `reference/` | CSV + JSON imutáveis | 104 funções do Financeiro Disk + 45 funções de RH e DP (`149` funções catalogadas como `EM_IMPLANTACAO`) |

---

## 2. Invariantes e Travas de Segurança Operacional

- **Taxa Disk por Evento:** sempre negociada por **evento** (percentual em *basis points* ou valor fixo em centavos), com aprovação *maker-checker* e jamais exposta em endpoints ou telas do Produtor (`PRODUTOR_PDT`).
- **Segurança BFF + Sessão:** autenticação via Cookie `HttpOnly` (`bravo_session`), validação estrita de `Origin`, token `X-CSRF-Token` em mutações e chave interna `X-Bravo-Proxy-Key` (`timingSafeEqual` SHA-256).
- **Banco e CORS Fail-Closed:** fora de testes (`NODE_ENV=test`), a API exige conexão PostgreSQL válida em `DATABASE_URL` (sem fallback silencioso para PGlite) e não reflete origens CORS arbitrárias.
- **Travas de Homologação (`BRAVO_ENV=HOMOLOGACAO`):**
  - `ENABLE_REAL_PAYMENTS=false`
  - `ENABLE_REAL_REFUNDS=false`
  - `ENABLE_EXTERNAL_PUBLICATION=false`
  - `ENABLE_PDV_OPERATIONS=false`
  - `ENABLE_TICKET_REPLACEMENT=false`
  - `ACCESS_GATE_INTEGRATED=false`
  - `BRAVO_GEMINI_ENABLED=false` (assistente consultivo somente-leitura, com filtro LGPD/PII e cota no PostgreSQL de `4/min` e `25/dia`).

---

## 3. Comandos Principais

```bash
# Compilação e verificação de tipos em todos os 18 projetos do workspace
pnpm run build
pnpm run typecheck

# Testes offline de domínio e integridade estrutural (137 testes)
pnpm run test:offline
pnpm run test:ai
pnpm run test:vercel
pnpm run deploy:preflight

# Testes unitários + estruturais completos (143 testes)
pnpm run test

# Suíte E2E HTTP completa (10 suítes / 43 cenários ponta a ponta)
pnpm run test:e2e

# Validação de schema e aplicação de migrations no banco Neon HML (requer DIRECT_URL)
pnpm run db:validate
pnpm run db:migrate:preview
pnpm run db:seed:technical
```

---

## 4. Documentação de Referência

- Regras e Governança: `GEMINI.md`, `AGENTS.md`, `docs/01-JORNADA-OPERACIONAL.md` a `docs/11-SEGURANCA-E-HOMOLOGACAO.md`
- Arquitetura e Deploy Vercel Preview + Neon + Gemini: `README-VERCEL.md`, `docs/12-ARQUITETURA-FINAL.md`, `docs/12-PASSO-A-PASSO-VERCEL-NEON.md`
- Relatórios de Homologação: `RELATORIO_HOMOLOGACAO_P10.md`, `RELATORIO_HOMOLOGACAO_P12_VERCEL_NEON_GEMINI.md` e `docs/execucao/`
