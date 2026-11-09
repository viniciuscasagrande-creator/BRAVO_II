# ARCHITECTURE.md — Arquitetura Técnica, Integrações e Padrões do BRAVO_II (v1.0)

## 1. Visão Geral do Monorepo (`pnpm` Workspaces)

```text
BRAVO_II/
├── apps/
│   ├── backoffice/       # Interface ERP Corporativa (Next.js 15 / React 19 + BFF /v1/*)
│   ├── api/              # Core Transacional (NestJS 10 / TypeScript / PostgreSQL)
│   ├── pdv/              # Núcleo de Bilheteria e Terminal PDV
│   ├── pdt-adapter/      # Adaptador isolado de leitura para Portal do Produtor (sem Taxa Disk)
│   └── workers/          # Processamento assíncrono e fila Outbox
├── packages/
│   ├── config/           # Carregamento seguro de variáveis de servidor
│   ├── contracts/        # DTOs, matriz RBAC, menu canônico e contratos HTTP
│   ├── core-policy/      # Políticas de segurança, origem, cookies, CSRF e travas de homologação
│   ├── domain-p06/       # Regras de domínio Comercial, Produtores, Eventos e Taxas
│   ├── domain-p08/       # Regras de domínio Clientes, Inventário, Pedidos e Ingressos 8 dígitos
│   ├── domain-p09/       # Regras de domínio Pagamentos (PagBank Sandbox) e Turnos PDV
│   ├── domain-p10/       # Regras de domínio SAC, SLA, ITIL, Pós-Venda e Estornos
│   ├── domain-ia/        # Regras de governança, sanitização PII e cotas do Assistente Gemini
│   ├── sdk/              # Cliente HTTP tipado (@bravo-ii/sdk)
│   ├── telemetry/        # Logs estruturados sem PII e correlação (x-correlation-id)
│   ├── testing/          # Utilitários de teste
│   └── ui/               # Componentes visuais compartilhados do Design System BankOS
├── prisma/               # Schema canônico unificado (55 modelos / 55 tabelas mapeadas)
├── database/migrations/  # 10 pares de migrations SQL auditáveis (.up.sql / .down.sql)
└── reference/            # Catálogo imutável das 149 funções (104 Financeiro + 45 RH)
```

---

## 2. Fluxo de Comunicação e Segurança (BFF -> API -> Neon)

```mermaid
flowchart LR
  Browser["Navegador Operador (HTTPS)"] -->|Cookie HttpOnly + X-CSRF-Token| BFF["Backoffice BFF (/v1/*)"]
  BFF -->|X-Bravo-Proxy-Key + X-Correlation-Id| API["API NestJS (@bravo-ii/api)"]
  API -->|Pool TLS (sslmode=require)| Neon["Neon PostgreSQL (bravo_ii_hml)"]
```

### Camadas de Proteção
1. **Navegador -> BFF (`/v1/*`):**
   - Sessão em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS.
   - Validação de `Origin` idêntica à própria origem da aplicação em métodos mutáveis (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Limite de payload JSON (`MAX_JSON_BYTES = 1 MB`).
   - Cabeçalhos `X-Correlation-Id` e `X-Response-Time-Ms` em todas as respostas.
2. **BFF -> API NestJS:**
   - Autenticação servidor-servidor via cabeçalho `X-Bravo-Proxy-Key` validado com `crypto.timingSafeEqual` e comprimento mínimo de 32 bytes (`apps/api/src/core/security/proxy-guard.ts`).
   - Suporte opcional a `x-vercel-protection-bypass` (`BRAVO_API_VERCEL_BYPASS_TOKEN`) quando o projeto da API estiver sob Vercel Deployment Protection.
3. **API NestJS -> PostgreSQL (Neon):**
   - `DatabaseService` (`apps/api/src/common/database/database.service.ts`) exige `DATABASE_URL` PostgreSQL fora de `NODE_ENV=test`.
   - O uso de `PGlite` em memória é restrito exclusivamente à execução de suítes de teste (`NODE_ENV=test` fora da Vercel e fora de `BRAVO_ENV=HOMOLOGACAO/PRODUCAO`). Fallback silencioso é proibido.

---

## 3. Padrão de Design System Unificado (BankOS / Fintech Premium)
- Folhas globais carregadas em [`apps/backoffice/src/app/layout.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/layout.tsx):
  - [`apps/backoffice/src/components/bravo-p06.css`](file:///E:/BRAVO_II/apps/backoffice/src/components/bravo-p06.css): variáveis `:root`, layout `BravoShell` (`.bravo-app-shell`, `.bravo-sidebar`, `.bravo-topbar`, `.bravo-main-column`, `.bravo-workspace`), navegação hierárquica, badges, tabelas e componentes P06.
  - [`apps/backoffice/src/components/bravo-p10.css`](file:///E:/BRAVO_II/apps/backoffice/src/components/bravo-p10.css): estilos de atendimento SAC, SLA, ITIL, Pós-Venda e Estornos.
- Regra de integridade automatizada em [`tests/integrity.test.mjs`](file:///E:/BRAVO_II/tests/integrity.test.mjs): todas as classes CSS utilizadas pelo `BravoShell` e componentes estruturais devem possuir definição correspondente em `bravo-p06.css`.

---

## 4. Implantação na Vercel
- **Arquitetura Recomendada (Dois Projetos):**
  1. `bravo-ii-web`: Root Directory `apps/backoffice` (Framework Next.js, [`apps/backoffice/vercel.json`](file:///E:/BRAVO_II/apps/backoffice/vercel.json)).
  2. `bravo-ii-api`: Root Directory `apps/api` (Framework NestJS, [`apps/api/vercel.json`](file:///E:/BRAVO_II/apps/api/vercel.json)).
- **Compatibilidade para Projeto Conectado na Raiz (`bravoii-g2ac`):**
  - [`vercel.json`](file:///E:/BRAVO_II/vercel.json) e [`api/v1.js`](file:///E:/BRAVO_II/api/v1.js) garantem que projetos configurados na raiz do monorepo sirvam as 218 páginas compiladas do Next.js (incluindo rotas dinâmicas `[slug]` e `[id]`), apliquem cabeçalhos de segurança (`nosniff`, `DENY`, `no-store` em páginas e `immutable` em `/_next/static/*`) e exponham `/v1/*` via Serverless Function.
