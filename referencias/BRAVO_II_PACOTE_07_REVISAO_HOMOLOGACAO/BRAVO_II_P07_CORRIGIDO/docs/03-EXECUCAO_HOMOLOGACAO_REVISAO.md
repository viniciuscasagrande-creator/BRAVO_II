# BRAVO_II — Execução de homologação | Revisão do Pacote 07

## Resultado apurado no ambiente de análise

- O ZIP do Pacote 07 foi extraído e inspecionado.
- Os pacotes puros `domain-p06` e `core-policy` foram compilados com TypeScript global, e os testes offline executados.
- Corrigido o erro de política no bloqueio temporário de login: após expirar o bloqueio, o contador pode recomeçar.
- Adicionadas verificações antes da inicialização: `BRAVO_ENV=HOMOLOGACAO`, banco PostgreSQL **explicitamente identificado como hml/homolog/preview**, origem permitida e flags financeiras desligadas.
- Docker Compose agora usa `bravo_ii_hml`, evitando sugerir um banco genérico.
- Adicionado `scripts/doctor.mjs` para revisar ambiente e evidências de build/migrations.
- O código-fonte Financeiro (104) e RH (45) permanece como catálogo de migração; esta revisão não os torna operacionais.

## O que permanece NÃO executado

- `npm install`: o ambiente não resolve `registry.npmjs.org`; pacotes NestJS, Prisma e Next.js não estão disponíveis localmente.
- Docker e PostgreSQL não estão instalados neste ambiente; nenhuma conexão real nem migration foi aplicada.
- Build de API/frontend, testes HTTP, autenticação contra banco real, Preview e deploy exigem o ambiente VS Code/servidores.
- Não foram realizadas operações reais, publicação externa nem transações.

## Execução no VS Code — PowerShell (Windows)

```powershell
# Na raiz extraída do projeto BRAVO_II
Copy-Item .env.example .env
Copy-Item apps/backoffice/.env.example apps/backoffice/.env.local
# Edite .env: POSTGRES_PASSWORD forte, DATABASE_URL usando a mesma senha
# Se houver caracteres especiais na senha, codifique-os na URL (percent encoding).
# Edite .env.local: BRAVO_API_URL=http://127.0.0.1:4100
node --version
docker compose up -d postgres
npm install
npm run build:packages
npm run doctor
npm run db:validate
npm run db:generate
npx prisma migrate dev --schema prisma/schema.prisma --name init_bravo_ii_p07
npm run build:api
npm run build:web
npm run doctor:ready
```

> Registre e revise a migration SQL gerada. NÃO use `db push` em produção e NÃO use `migrate dev` diretamente no Preview ou em bases compartilhadas. 

### Inicialização de admin (somente banco de homologação vazio)

Configure temporariamente `BRAVO_BOOTSTRAP_ADMIN=true`, `BRAVO_ADMIN_EMAIL` e `BRAVO_ADMIN_PASSWORD` em terminal/gerenciador de segredos, **nunca em código versionado**. Depois execute `npm run bootstrap:admin`. Desative o bootstrap e elimine as credenciais do ambiente.

### Subir duas aplicações e fazer prova real

```powershell
# Terminal 1
npm run dev:api
# Terminal 2
npm run dev:web
# Terminal 3
npm run test:smoke
```

Abra `http://localhost:3000`, teste logins de cada perfil e cadastros apenas com dados de homologação. `SMOKE_ADMIN_EMAIL` e `SMOKE_ADMIN_PASSWORD` podem ativar o segundo conjunto de smoke tests; nunca cole credenciais em chat/relatórios.

### Publicação Preview

- Use instância PostgreSQL separada, com banco cujo nome contenha `hml`, `homolog` ou `preview`. Configure `DATABASE_URL` exclusivamente nela.
- Configure `NODE_ENV=production`, `COOKIE_SECURE=true`, `APP_ORIGIN=https://<seu-preview>` e `BRAVO_API_URL=https://<seu-backend-preview>` em seus respectivos serviços.
- `BRAVO_ENV=HOMOLOGACAO` e as três flags `ENABLE_*` devem permanecer `false`.
- No Preview use apenas `npm run db:migrate:deploy`, com migrations revisadas no repositório.
- Registre endereço de Preview, logs, commit, resultados de build e testes antes de afirmar homologação.
- Não configure domínio de venda da DiskIngressos nem conexão com gateways.

## Critérios objetivos de aceite

1. Build das duas aplicações sem erros, migrations auditadas e PostgreSQL confirmado conectado por `/v1/saude/banco`.
2. Login e logout com cookies HttpOnly, CSRF, Origem, 401 e 403 verificados.
3. Ações reais de cadastro, consulta e alteração com dados **exclusivos de homologação** e auditoria.
4. Dois eventos do mesmo produtor mantêm taxas independentes.
5. Solicitação de publicação produz somente outbox pendente; nada chega ao site público.
6. Menus Financeiro e RH continuam identificados como `EM_IMPLANTACAO`, sem afirmar que estão conectados.
