# Implantação de homologação — executar no VS Code / Vercel

**Não colar chaves, senhas nem connection strings reais neste chat ou no GitHub.**

## 1. Preparar repositório
1. Abra `BRAVO_II` no VS Code, com Node 22 atualizado.
2. Execute `pnpm run test:offline`, `pnpm run test:ai`, `pnpm run test:vercel`, `pnpm run deploy:preflight` e `pnpm run build`. Anote logs, erros e versões.
3. **Não conecte dados reais**, não gere lançamentos fictícios e não habilite flags de dinheiro/publicação.
4. GitHub: repositório **privado**; enviar apenas código e migrations aprovadas.

## 2. Criar Neon PostgreSQL HML
1. No Vercel Marketplace, instale/conecte Neon à **API `bravo-ii-api` apenas para Preview** (ou crie direto no Neon com credenciais restritas).
2. Selecione a região mais próxima da Vercel Function (`aws-sa-east-1` São Paulo).
3. Crie o banco PostgreSQL `bravo_ii_hml`, numa branch de homologação isolada. Não reutilizar o banco da DiskIngressos atual.
4. Copie a URL **pooled** (hostname contendo `-pooler`) para `DATABASE_URL` **somente da API**. Guarde a URL **direta** (sem `-pooler`) em `DIRECT_URL` **somente na máquina de migrations/CI controlado**.
5. Configurar `sslmode=require` (ou `verify-full`). Faça verificação `node scripts/inspect-integrations.mjs` (sem expor a senha). Não editar `prisma/schema.prisma` duplicando `datasource`.
6. Execute `pnpm run db:migrate:preview` **na estação autorizada**, com `BRAVO_ENV=HOMOLOGACAO`, flags financeiras falsas, URLs HML e depois de backup/clone. **Nunca no build Vercel**.

## 3. Configuração dos dois projetos Vercel
- Ambos apontam ao mesmo repositório Git privado.
- API `bravo-ii-api`: **Root Directory `apps/api`**, incluir fontes externas ao Root, Framework NestJS, build `cd ../.. && pnpm run build:vercel:api`, install `cd ../.. && pnpm install --frozen-lockfile`.
- Backoffice `bravo-ii-web`: **Root Directory `apps/backoffice`**, incluir fontes externas ao Root, Framework Next.js, build `cd ../.. && pnpm run build:vercel:web`, install `cd ../.. && pnpm install --frozen-lockfile`.
- Conectar somente Preview nas variáveis; não vincular Neon/Gemini à produção. Implantar branch Git de homologação com Vercel Authentication.

## 4. Variáveis da API (Preview)
```
BRAVO_ENV=HOMOLOGACAO
DATABASE_URL=<URL_POOLED_NEON_BRAVO_II_HML>
APP_ORIGIN=https://<ENDERECO-ESTAVEL-WEB-PREVIEW>.vercel.app
BRAVO_PROXY_KEY=<SEGREDO_FORTE_IDENTICO_AO_WEB>
ENABLE_BRAVO_PROXY_GUARD=true
COOKIE_SECURE=true
CPF_HASH_PEPPER=<SEGREDO_FORTE_MINIMO_32_CHARS>
ENABLE_EXTERNAL_PUBLICATION=false
ENABLE_REAL_PAYMENTS=false
ENABLE_REAL_REFUNDS=false
ENABLE_PDV_OPERATIONS=false
ENABLE_TICKET_REPLACEMENT=false
ACCESS_GATE_INTEGRATED=false
BRAVO_GEMINI_ENABLED=false
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=<SEGREDO_PRIVADO_GOOGLE_AI_STUDIO>
```

## 5. Variáveis do Backoffice (Preview)
```
BRAVO_API_URL=https://<ENDERECO-ESTAVEL-API-PREVIEW>.vercel.app
BRAVO_PROXY_KEY=<MESMO_SEGREDO_FORTE_DA_API>
BRAVO_API_VERCEL_BYPASS_TOKEN=<SOMENTE_SE_API_TIVER_DEPLOYMENT_PROTECTION>
```

## 6. Ligação do Gemini
1. Adicione a chave só no **projeto API**, ambiente **Preview**.
2. Inicie o deploy com `BRAVO_GEMINI_ENABLED=false`. Após validar a tabela `BravoAiQuotaWindow` (`p12_ai_quota_windows`), auditoria, RBAC e dados sensíveis, altere para `true` e faça **novo deploy**.
3. Acesse `/ia` após login com perfil autorizado. Envie apenas pergunta **genérica** de negócio. Verifique o limite de **4 chamadas/minuto e 25/dia por usuário**, rejeição de dados pessoais e retorno do Google.
4. Verifique que SAC não acessa perguntas da área Financeiro, que Produtor não tem acesso e que nenhuma resposta aciona rotas de escrita.
