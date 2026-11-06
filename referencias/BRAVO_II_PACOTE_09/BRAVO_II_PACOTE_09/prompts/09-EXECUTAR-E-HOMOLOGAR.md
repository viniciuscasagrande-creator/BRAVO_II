# PROMPT PARA O GEMINI — EXECUTAR P09 EM HOMOLOGAÇÃO

Você está implementando BRAVO_II, ERP modular da DiskIngressos, dentro do monorepo P06–P09. Nunca dependa do SIGE original. Trabalhe sem apagar módulos, código de referência ou catálogos.

## FASE A — DIAGNÓSTICO
1. Compare o repositório atual com o ZIP do Pacote 09. Mantenha commits e backup antes de qualquer mudança.
2. Confira versões Node, npm, PostgreSQL e Docker. Confirme que `DATABASE_URL` aponta para base exclusiva `bravo_ii_hml`. Não usar conta ou URL produtiva.
3. Gere secrets fortes em ambiente local e configure `.env` fora do Git; não copie dados reais para o exemplo.
4. Identifique divergências existentes de migrations, modelos, dependências, scripts e bases; **não sobrescreva migrações existentes nem use `db push` para contorná-las**.

## FASE B — BUILD E BANCO REAL
1. `npm install`, `npm run build:packages`, `npm run test:offline`.
2. `npm run db:validate`, `npm run db:generate`.
3. Crie migration incremental P09 ou inicial em banco descartável. Mostre SQL, revise contra destruição de dados e só depois aplique.
4. `npm run build:api` e `npm run build:web`. Corrija erros de tipos, imports, rotas e Prisma sem eliminar validações.
5. `npm run doctor:ready` e `npm run test:homologacao`; registrar nome do banco e tabelas verificadas.

## FASE C — APIs E NAVEGAÇÃO
1. Login, cookie HttpOnly, CSRF, logout, menu por perfis e privilégios testados no servidor.
2. Comercial e eventos P06; clientes, pedidos e ingressos P08; checkout e terminais P09. Verificar que páginas ficam acessíveis conforme perfil e que ações negadas retornam 401/403.
3. Checkout: criar pedido de **teste em banco de homologação**, preparar uma tentativa idempotente e demonstrar que não altera pedido para `PAGO` nem gera ingresso.
4. Repetir mesmo UUID e dados = mesma tentativa. Repetir com dados divergentes = erro. Duas tentativas para um mesmo pedido = recusa.
5. Consulta de tentativa não permite ler Taxa Disk por evento nem dados sensíveis de cartão.
6. Criar terminal **bloqueado**, verificar trilha de auditoria e confirmar que abertura de turno e reserva PDV permanecem negadas.
7. Não ativar webhook, venda real, captura, cancelamento/estorno, emissão QR ou publicação externa.

## FASE D — SANDBOX PAGBANK OPCIONAL
Executar **somente se houver credencial sandbox oficial e autorização expressa de testes**. Configure `ENABLE_PAGBANK_SANDBOX=true`, mantenha `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false` e `ENABLE_PDV_OPERATIONS=false`. Teste a criação de checkout PIX e consulta ao endpoint sandbox. Verifique o payload e o modelo de assinatura de webhook aplicável ao produto específico; **não implemente o webhook nesta fase**. Documente códigos HTTP retornados sem gravar tokens, CPF ou dados sensíveis. Se houver divergência de contrato, corrija apenas após conferência da documentação oficial.

## FASE E — ACEITE
Só declare homologação P08+P09 aprovada após banco, migrations, builds, sessão, rotas, permissões, navegação, estoque concorrente e casos negativos comprovados. Produza `docs/RELATORIO_HOMOLOGACAO_REAL.md` com resultados reais e falhas. Nenhuma publicação de ingressos, operação financeira real ou alteração ao PDT pode ser liberada automaticamente.
