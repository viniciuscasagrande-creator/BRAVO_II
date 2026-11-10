# Portal do Produtor — BRAVO_II
Aplicação Next.js independente do backoffice, no mesmo monorepo. Não contém outro banco nem outro cadastro de produtores. Link próprio, API central compartilhada.

## Dois endereços
- Frontend do produtor: projeto de hospedagem separado, raiz `apps/producer-portal`.
- Backend: aplicação `apps/api`, em outro endereço. Banco e regras permanecem no backend.
- Backoffice: aplicação existente, preservada em seu próprio endereço.

Os domínios da `.env.example` são exemplos, não endereços publicados.

## Autenticação entre os serviços
O navegador usa `/v1` no próprio domínio do portal. Um proxy no servidor Next.js envia somente as rotas autorizadas para o backend. Isso permite domínios diferentes sem depender de cookies de terceiros. O backend devolve cookie HttpOnly host-only; o proxy o entrega no domínio do portal. A chave de serviço nunca é enviada ao navegador. O token Bearer retornado pelo login da API é removido da resposta de login ao navegador; a sessão usa cookie.
Não configurar domínio compartilhado no cookie nem guardar sessão no localStorage.

## Variáveis
Frontend (servidor): `BRAVO_API_URL` = origem do backend, `PORTAL_PUBLIC_ORIGIN` = origem exata do portal, `BRAVO_PROXY_KEY` = segredo aleatório compartilhado com a API, com no mínimo 32 caracteres. Sem caminho final, usuário ou senha nas URLs. Usar HTTPS na hospedagem.
Backend: preservar `APP_ORIGIN` do backoffice, adicionar `PRODUCER_PORTAL_ORIGIN` com a origem exata do novo portal e configurar a mesma `BRAVO_PROXY_KEY`. `COOKIE_SECURE=true` no ambiente HTTPS. Configurar as demais variáveis já exigidas pela API. As validações de origem aceitam os dois frontends explicitamente, sem curingas.
Cada Preview precisa ter sua URL exata cadastrada nas duas configurações do portal; não autorizar todos os subdomínios indiscriminadamente.
A proteção existente da API restringe implantação Vercel a Preview. Este pacote não remove esse bloqueio nem declara produção homologada.

## Executar
Na raiz BRAVO_II:
```
pnpm install --frozen-lockfile --ignore-scripts
pnpm -r --filter './packages/*' build
pnpm --filter @bravo-ii/api build
pnpm --filter @bravo-ii/producer-portal build
node --test tests/producer-finance.integration.test.mjs
pnpm --filter @bravo-ii/producer-portal dev
```
Para desenvolvimento, ajustar BRAVO_API_URL à API local e PORTAL_PUBLIC_ORIGIN/PRODUCER_PORTAL_ORIGIN a `http://localhost:3001`. Iniciar a API separadamente segundo o processo atual; este app não executa migrations.

## Escopo entregue
`/login`: autenticação real, sem credenciais preenchidas.
`/`: seleção de eventos autorizados, programação, lotes, marketing UTM e financeiro.
`/v1/*`: proxy restrito a autenticação, consultas de eventos e consulta financeira; rotas financeiras internas não são transportadas.
A seleção de perfil de inspeção não existe neste app.

## Financeiro
Consulta `finance_ledger_entries` do núcleo, sem novas tabelas ou migrations. O produtor precisa de papel PRODUTOR_PDT, permissão pdt:portal-read e vínculo de produtor com o evento. Escopo apenas de evento não concede leitura financeira de coprodutores.
Valores monetários saem como strings de centavos, preservando BIGINT. Consultas são auditadas. O histórico é paginado, 50 itens por página, com totais do conjunto completo em snapshot transacional.
Não são retornados taxa Disk, contas internas, descrição livre, dados de outro coprodutor ou registros sem producer_id atribuído.
Bruto, obrigações, repasses e reservas são totais históricos por categoria, não saldo contábil líquido nem valores bancários confirmados. Categorias sem registros retornam null (não apurado), sem zeros fabricados.
Recebido e disponível permanecem null: faltam conciliação de liquidações, regras de retenção, compensações e liberação. Nenhum endpoint de solicitação de repasse foi criado neste incremento.

## Próximo marco
Provar a fonte canônica de recebimentos e retenções, reconciliar compensações e validar Neon HML antes de habilitar saldo disponível e solicitações de repasse, aprovação e assinaturas. Não derivar saldo disponível de vendas menos repasses.
