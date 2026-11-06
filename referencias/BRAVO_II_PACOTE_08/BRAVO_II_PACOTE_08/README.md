# BRAVO_II — Pacote 08 | Clientes, Pedidos, Reservas e Ingressos

**Data de referência:** 05/11/2026. **Origem:** cópia integral do Pacote 07 revisado, com adições dos módulos do Pacote 08 no mesmo monorepo. Não depende de código-fonte do SIGE.

## Objetivo

Dar continuidade ao fluxo Comercial → Produtor → Evento → Cliente → Pedido → Reserva de estoque → Pagamento confirmado pela operadora → Emissão de ingresso numérico de oito dígitos → consulta pelo SAC. **Nenhuma transação real é habilitada nesta fase.**

### Conteúdo real do Pacote 08

- `packages/domain-p08`: regras puras TypeScript para CPF, cadastro de pessoa física, pedidos, reservas, cálculo em centavos, numeração de ingressos e validação de liquidação.
- `prisma/schema.prisma`: cinco modelos para clientes, reservas/pedidos, ingressos, sequência global e confirmação de pagamento; contadores de estoque por lote.
- `apps/api/src/modules/pacote08`: controllers NestJS com autenticação central + CSRF, serviços Prisma de clientes, reservas, expiração, cancelamento de reserva não paga e consulta por número.
- `apps/backoffice/src/app/(erp)/clientes`, `/pedidos`, `/ingressos`: telas React/Next.js em português, ligadas aos endpoints reais.
- `packages/core-policy`: menu atualizado com permissões. PDV não habilitado até autenticação de terminal e conciliação.
- `reference/`: inventário **inalterado das 104 funções Financeiro Disk e 45 funções RH**, sem fingir que já estão operacionalizadas.
- `docs/`: passo a passo de instalação, contratos, matriz de testes e limites funcionais.

### Segurança e estados

| Ação | Regra no Pacote 08 |
|---|---|
| Cadastro de cliente | CPF validado; fingerprint HMAC em vez de CPF puro no banco; consentimento de marketing separado |
| Reserva de ingressos | Somente evento `PUBLICADO`, sessão `ATIVA`, lote `ATIVO` e canal habilitado; reserva por 15 minutos |
| Quantidade | Até 10 ingressos por pedido; valor em centavos congelado no pedido |
| Estoque | Atualização PostgreSQL atômica e transação `SERIALIZABLE`; sem supervenda em um mesmo lote se banco funcionar conforme projetado |
| Idempotência | Chave UUID obrigatória para criar reserva; repetição com payload diferente retorna conflito |
| Número do ingresso | Exatamente oito dígitos; sequência global com unicidade no PostgreSQL |
| Emissão | Requer confirmação real e verificável de pagamento. **Em homologação está bloqueada** |
| Taxa Disk | Permanece por evento em Comercial; não é exposta em pedidos/cliente/PDT |
| PDV/Bilheteria | Catalogados, sem ativação enquanto faltar identidade de dispositivo e integrações |
| Mapa de assentos | Reservas numeradas explicitamente bloqueadas até módulo específico de inventário |
| Estorno | Não executado; casos pagos seguem para futuros fluxos SAC/Financeiro |

## Começar no VS Code + Gemini

1. Abra esta pasta como workspace (não crie um segundo `prisma/schema.prisma`).
2. Leia `GEMINI.md`, `AGENTS.md` e `prompts/08-EXECUTAR.md`.
3. Copie `.env.example` para `.env` e `apps/backoffice/.env.example` para `apps/backoffice/.env.local`.
4. Configure segredos *somente no seu computador*, incluindo `CPF_HASH_PEPPER` aleatório com 32+ caracteres, sem salvar em Git.
5. Instale dependências e suba o PostgreSQL **isolado de homologação**; não use produção.
6. Valide o schema, gere/aplique migration revisada, compile e faça os testes indicados em `docs/03-ROTEIRO-HOMOLOGACAO.md`.

```bash
npm install
npm run build:packages
npm run test:offline
npm run doctor
npm run db:validate
npm run db:generate
npx prisma migrate dev --schema prisma/schema.prisma --name p08_clientes_pedidos_ingressos
npm run build:api
npm run build:web
npm run doctor:ready
```

**Se migrations do P07 já estiverem aplicadas, `migrate dev` deve gerar apenas o delta.** Revisar SQL antes de aplicar. **Não** usar `prisma db push` sobre produção. Não copiar banco real do SIGE para esse ambiente.

Para testar no navegador: `npm run dev:api` e `npm run dev:web` em terminais separados; abrir `http://localhost:3000` após configurar as credenciais de homologação.

### Status da entrega

A **construção do código-fonte e os testes offline** foram realizados aqui. O ambiente de criação não teve PostgreSQL e dependências NestJS/Next.js disponíveis para homologação completa; as migrations, o build completo e os testes reais de concorrência, login, pedidos e emissão permanecem **pendentes no seu VS Code**. Veja `docs/03-ROTEIRO-HOMOLOGACAO.md`.

**É incorreto declarar que ingressos, pagamentos ou PDVs estão operacionais neste momento.**
