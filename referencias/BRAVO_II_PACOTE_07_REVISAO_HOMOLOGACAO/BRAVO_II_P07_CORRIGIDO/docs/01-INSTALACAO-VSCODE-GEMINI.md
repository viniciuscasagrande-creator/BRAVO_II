# Guia — VS Code + Gemini (Windows / Linux / macOS)

## Pré-requisitos

- Node.js 22 LTS, npm, Docker Desktop com Compose, VS Code + Gemini.
- Um ambiente isolado de desenvolvimento; jamais conectar ao PostgreSQL de produção.
- Uma URL de Preview HTTPS própria e credenciais de teste criadas pelo usuário (sem envio de senhas pelo chat).

## Execução local

```bash
# 1. Extraia BRAVO_II_PACOTE_07_REVISAO_HOMOLOGACAO.zip e abra esta pasta no VS Code.
cp .env.example .env
cp apps/backoffice/.env.example apps/backoffice/.env.local
# Edite .env: senha forte PostgreSQL, DATABASE_URL correspondente e APP_ORIGIN=http://localhost:3000
# 2. Suba PostgreSQL local (não acesse o servidor da Disk).
docker compose up -d postgres
# 3. Instale (esta etapa requer acesso à internet ao executar no seu computador).
npm install
# 4. Gere Prisma, valide e CRIE migrations no banco local de desenvolvimento.
npm run build:packages
npm run doctor
npm run db:validate
npm run db:generate
npx prisma migrate dev --schema prisma/schema.prisma --name init_bravo_ii_p07
# 5. Compile pacotes e aplicações.
npm run build:api
npm run build:web
npm run doctor:ready
# 6. Crie usuário inicial somente após revisar a senha e a base vazia.
# BRAVO_BOOTSTRAP_ADMIN=true BRAVO_ADMIN_EMAIL=... BRAVO_ADMIN_PASSWORD=... npm run bootstrap:admin
# Use gerenciador de segredos ou terminal privado; nunca crie senha no código ou prompt do Gemini.
# 7. Em terminais separados:
npm run dev:api
npm run dev:web
# Abra http://localhost:3000
# 8. Teste a API real (com o navegador aberto e DB ativo):
SMOKE_URL=http://localhost:3000 APP_ORIGIN=http://localhost:3000 npm run test:smoke
```

**Atenção:** o script `bootstrap:admin` lê variáveis de ambiente, não interage com formulário; configure no terminal com segurança, sem salvar senhas em scripts versionados. Para Windows PowerShell, defina com `$env:VARIAVEL="..."` apenas na sessão.

## Preview

1. Após os builds locais, versionar somente código e migration revisada; NÃO commitar `.env`.
2. Criar PostgreSQL separado do banco operacional. Configurar `DATABASE_URL` e `APP_ORIGIN` com **URL exata do Preview**.
3. Configurar `COOKIE_SECURE=true`, `NODE_ENV=production` e as 3 flags `ENABLE_*=false` e `BRAVO_ENV=HOMOLOGACAO`.
4. Publicar o backend em serviço Node persistente compatível com Nest. Publicar o Next.js como frontend Preview; configurar `BRAVO_API_URL` apontando para o backend. Não usar Prisma + servidor persistente como se fossem uma única função serverless sem adaptação.
5. Executar `npm run db:migrate:deploy` usando migrations geradas e auditadas. Inicializar usuário por processo seguro.
6. Testar login real, quatro perfis no mínimo, CNPJ, eventos e taxas com dados de HOMOLOGAÇÃO identificados, cancelamento de sessão, CSRF, 401/403, 404, status de publicação e acesso externo.
7. Coletar evidências e só então aprovar o Preview. Não apontar o domínio público DiskIngressos.

## Problemas conhecidos antes da homologação

- O ambiente de geração aqui não dispõe do registro npm nem de PostgreSQL; não há migrations automáticas aplicadas.
- Faltam testes E2E de navegador, política de gerenciamento de contas e recuperação de senha, centralização de logs, rate limiting distribuído, backup/restauração e hardening de infraestrutura.
- Os serviços P06 precisam de revisão concorrencial das capacidades e eventos, validação de DTOs e testes de banco antes de alta escala.
- RH e Financeiro ficam inalterados e aguardam módulos executáveis posteriores.
