# BRAVO_II — Pacote 09 | Checkout, PDV e Pagamentos (Homologação)

**06/11/2026 — código de integração evolutiva derivado do Pacote 08.** Sistema próprio, sem dependência do código-fonte do antigo SIGE.

## Entrega técnica

- Preserva os módulos anteriores Comercial, Produtores, Eventos, Clientes, Pedidos, Reservas, Ingressos, autenticação e auditoria.
- Preserva, sem alteração, os inventários de **104 opções Financeiro Disk e 45 opções RH/DP**, localizados em `reference/`. Esses 149 itens **não estão declarados operacionais**; a fonte de referência completa está no pacote mestre Financeiro/RH, anexado somente na edição *com fontes*.
- Implementa **Checkout administrativo** com tentativa única por pedido, chave idempotente e pagamento pendente de homologação. Registro de tentativa NÃO movimenta dinheiro.
- Implementa conector **PagBank API Checkout em sandbox, exclusivo para PIX e pedidos ONLINE**, opcional e desabilitado por padrão. Faz POST e consulta GET somente no host de sandbox oficial. Não processa webhook, captura nem emite ingresso.
- Implementa **PDV — administração de terminais**, com cadastro e visualização; turnos/vendas ficam explicitamente bloqueados enquanto não forem homologados dispositivos físicos, operação e adquirente.
- Inclui modelos Prisma `BravoCheckoutAttempt`, `BravoPdvTerminal`, `BravoPdvShift` e relações opcionais ao pedido; **um único schema PostgreSQL**.
- Inclui contratos puros testados em `packages/domain-p09`, telas Next.js `/checkout` e `/pdv`, controllers NestJS e scripts de testes.

## Restrições obrigatórias

1. A origem e o banco devem pertencer exclusivamente à homologação: `BRAVO_ENV=HOMOLOGACAO`, banco `bravo_ii_hml` ou equivalente.
2. `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`, `ENABLE_EXTERNAL_PUBLICATION=false` são condições obrigatórias de inicialização.
3. `ENABLE_PDV_OPERATIONS=false` até uma futura liberação formal; não existem terminais ativos após cadastrá-los.
4. `ENABLE_PAGBANK_SANDBOX=false` por padrão. Para experimentar a API de **sandbox**, configurar token exclusivamente sandbox, sem o incluir em arquivos versionados. A URL da adquirente é fixa no código.
5. Status `AUTHORIZED`, `PAID` ou similares consultados externamente **não alteram pedidos**. O serviço `confirmVerifiedSettlement` do Pacote 08 continua bloqueado no ambiente de homologação.
6. Não implementar automaticamente webhook antes de identificar o produto PagBank em uso e validar assinatura usando **corpo bruto** e método documentado para aquela API (existem diferenças entre produtos/versões).
7. Não habilitar cartão diretamente neste ERP: não coletar número, CVV ou dados sensíveis de cartão. Usar fluxo hospedado pelo provedor com requisitos aplicáveis de segurança/compliance.
8. Sem pagamentos reais, reversões, emissão de QR, disparos ou alteração do site público.

## VS Code / Gemini — Ordem obrigatória

Leia `GEMINI.md`, `AGENTS.md` e `prompts/09-EXECUTAR-E-HOMOLOGAR.md`. Este pacote é um **monorepo completo P06–P09**, não uma pasta para sobrepor arquivos indiscriminadamente em produção.

Execute em banco **novo e vazio de homologação** (ou gere o delta da migration previamente aplicada e revise o SQL antes de prosseguir):

```bash
cp .env.example .env
cp apps/backoffice/.env.example apps/backoffice/.env.local
# edite ambos com segredos de homologação; não use tokens reais

docker compose up -d postgres
npm install
npm run build:packages
npm run test:offline
npm run doctor
npm run db:validate
npm run db:generate
npx prisma migrate dev --schema prisma/schema.prisma --name p09_checkout_pdv
npm run build:api
npm run build:web
npm run doctor:ready
npm run test:homologacao
```

Em Windows/PowerShell, substitua `cp` por `Copy-Item`. **Antes de aplicar migrations, conferira a origem da base, backup, revisão SQL e plano de reversão.** Nunca execute `migrate dev` contra um banco produtivo.

Execute `npm run dev:api` e `npm run dev:web` em dois terminais distintos. Valide manualmente `/login`, `/checkout`, `/pdv`, `/clientes`, `/pedidos`, `/ingressos`, `/comercial` e `/eventos` no navegador autenticado. Para testes públicos negativos sem login, use `npm run test:smoke:p09` após iniciar as duas aplicações.

Leia `docs/09-HOMOLOGACAO-E-CRITERIOS-DE-ACEITE.md` para critérios por módulo, regras de negócio, testes de banco e condições de rollback.

## Estado real nesta entrega

- **Aprovado localmente:** compilação de pacotes de regras puros e testes offline, estrutura de componentes/rotas e integridade do ZIP.
- **Não comprovado aqui:** conexão PostgreSQL real, `prisma validate`, migrations, `npm install`, build completo NestJS/Next.js, testes E2E, sandbox PagBank com token próprio, entrega em Preview ou PDV físico.
- **Produção:** inalterada. Nenhum pagamento, ingresso ou publicação externa foi executado.

A entrega é um pacote de **código e processo de homologação** — não um ERP já publicado e operacional.
