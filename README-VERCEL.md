# BRAVO_II — Preparação de hospedagem na Vercel (Preview)

> Base: Pacote 10 completo + Neon + Gemini IA. Não substitui Financeiro Disk / RH, que continuam catalogados como **em implantação**.

## Arquitetura

```text
Usuário autorizado / navegador
    │ HTTPS + Vercel Authentication no Preview
    ▼
Vercel — bravo-ii-web (Next.js, Root: apps/backoffice)
    │ /v1/*  via Route Handler BFF [chave interna APENAS no servidor]
    ▼
Vercel — bravo-ii-api (NestJS Function, Root: apps/api)
    │ Guardião de chave interna + Origin/CSRF + sessão HttpOnly + RBAC
    ▼
PostgreSQL gerenciado EXCLUSIVO bravo_ii_hml (URL pooler)
```

**NÃO usar** localhost nem Docker como banco do Vercel. O PostgreSQL deve ser gerenciado fora do sistema de arquivos efêmero das Functions. Para a API, configurar URLs do pooler. Para migrations, usar conexão direta **somente** na máquina autorizada.

## Dois projetos Vercel no MESMO repositório Git

### Projeto 1: `bravo-ii-api`
- Framework: NestJS (detecção automática). Root Directory: `apps/api`.
- **Include source files outside Root Directory = ON** (necessário para os workspaces `packages/*` e schema da raiz).
- Build Command: `cd ../.. && pnpm run build:vercel:api`.
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`.
- Env: copiar as CHAVES do arquivo `apps/api/.env.vercel-preview.example` para **Preview**, gerando valores reais nos Settings. Não colar placeholders.
- A Vercel detecta `apps/api/src/main.ts` e o executa como uma Vercel Function NestJS. A chave `BRAVO_PROXY_KEY` impede acesso HTTP direto não autenticado pelo BFF.
- Desabilitar deployment de produção no fluxo de Git; além disso, o código bloqueia VERCEL_ENV=production.

### Projeto 2: `bravo-ii-web`
- Framework: Next.js. Root Directory: `apps/backoffice`.
- **Include source files outside Root Directory = ON**.
- Build Command: `cd ../.. && pnpm run build:vercel:web`.
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`.
- Env: copiar CHAVES de `apps/backoffice/.env.vercel-preview.example` para Preview, configurando o endereço HTTPS exato do projeto API e **a mesma** `BRAVO_PROXY_KEY`.
- Habilitar **Deployment Protection / Vercel Authentication** para o Preview (atentar à proteção dos links individuais).
- Escolher um **URL Preview estável de branch** para `APP_ORIGIN` da API. Se acessar por URL Preview diferente, o backend recusará POST devido à verificação de origem. Configurar o URL exato e fazer novo deploy da API.
- O frontend **não** precisa de `DATABASE_URL`, apenas o backend. Não configurar segredos com prefixo `NEXT_PUBLIC_`.

> Ordem prática: criar banco e migrations, configurar e subir API em Preview (deve responder 403 sem chave), configurar o Backoffice com URL da API, atualizar APP_ORIGIN da API com URL estável do Backoffice e republicar **somente Preview**.

## Extensão Neon + Gemini
Leia `docs/12-ARQUITETURA-FINAL.md` e `docs/12-PASSO-A-PASSO-VERCEL-NEON.md`. O pacote adiciona assistente Gemini somente no backend, menu `/ia`, proteção opcional de comunicação Vercel, cotas no banco e integração Neon.
