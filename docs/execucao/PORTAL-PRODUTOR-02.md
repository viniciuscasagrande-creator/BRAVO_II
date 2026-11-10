# BRAVO_II — Portal do Produtor, incremento 02
Data: 10/11/2026. Base: `E:\BRAVO_II` (`0.12.0-neon-gemini-hml`), preservando os pacotes do Financeiro Disk e o incremento 01 do Portal do Produtor.

## Resultado
Criado `apps/producer-portal` (`@bravo-ii/producer-portal`), frontend Next.js independente com URL e hospedagem próprias (`apps/producer-portal/vercel.json`), conectado à API central do BRAVO_II por proxy BFF no servidor do frontend (`apps/producer-portal/src/app/v1/[...path]/route.ts`). Backoffice existente (`apps/backoffice`) preservado. Nenhum banco paralelo.
Consulta financeira real implementada no backend existente (`ProducerFinanceController` e `ProducerFinanceService`) e consumida pela tela (`ProducerFinance`). Login próprio sem credenciais preenchidas (`/login`); sessão HttpOnly, sem localStorage. Integração de origens (`allowedAppOrigin`) permite o portal (`PRODUCER_PORTAL_ORIGIN`) e o backoffice (`APP_ORIGIN`) explicitamente.

## Rotas
- Frontend `apps/producer-portal`: `/login`, `/`, `/v1/*` com lista positiva de rotas (`auth/login`, `auth/logout`, `auth/me`, `events`, `events/:eventId`, `producer-portal/events/:eventId/finance`).
- API GET `/v1/producer-portal/events` e `/api/v1/producer-portal/events`.
- API GET `/v1/producer-portal/events/:eventId` e equivalente `/api/v1` (projeção positiva sem `readiness`, contas internas, aprovações ou histórico de taxas).
- API GET `/v1/producer-portal/events/:eventId/finance?offset=0` e equivalente `/api/v1`.
- Autenticação reutiliza as rotas existentes `auth/login`, `auth/me`, `auth/logout` com validação multi-origem via `allowedAppOrigin`.

## Dados e limites
Leitura em `events`, `event_producers`, `finance_ledger_entries`. Escrita somente de auditoria de consulta em `audit_records` (`canonical_action = 'producer.finance.read'`, `outcome = 'SUCCESS' | 'DENIED'`), além da sessão pelo módulo de identidade existente. Não há nova migration.
Consulta financeira exige produtor vinculado ao evento (`PRODUTOR_PDT` + `pdt:portal-read` + `event_producers`); filtros também restringem cada lançamento ao seu `producer_id`. Não inferir titularidade para linhas com `producer_id IS NULL`.
São apresentados totais acumulados registrados de vendas (`VENDA_INGRESSO_BRUTA`), obrigações (`OBRIGACAO_PRODUTOR`), repasses (`REPASSE_PRODUTOR`) e reservas (`RESERVA_ESTORNO`) em snapshot `REPEATABLE READ` com preservação de precisão `BIGINT` (`string` de centavos). Não são saldos líquidos: compensações e liquidações não foram reconciliadas. `receivedCents` e `availableCents` permanecem explicitamente `null` (`Não apurado`), e nenhuma taxa Disk interna (`RECEITA_TAXA_DISK`), código de conta (`debit_account`/`credit_account`) ou descrição livre (`description_pt_br`) é exposta.

## Evidências executadas
- `pnpm install --ignore-scripts`: concluído nos 19 projetos do workspace.
- `pnpm -r --filter "./packages/*" build`: concluído (`exit 0`).
- `pnpm --filter @bravo-ii/api build`: concluído (`exit 0`).
- `pnpm --filter @bravo-ii/producer-portal build`: concluído (`exit 0`), gerando rotas `/`, `/login` e `/v1/[...path]`.
- `pnpm run typecheck`: concluído (`exit 0`) em todos os pacotes e aplicações.
- `node --test tests/producer-finance.integration.test.mjs`: **9/9 testes passaram** (`PGlite` em memória + API NestJS real + servidor Next.js compilado de `apps/producer-portal` em segunda porta testando login HttpOnly, listagem de eventos, extrato financeiro `BIGINT`, bloqueio `404` de `/v1/finance/ledger`, isolamento de coprodutor, ausência de taxa Disk/contas/descrição livre, auditoria `SUCCESS`/`DENIED` e logout com CSRF).
- **Validação no Neon Homologação (`floral-sunset-85900211`)**:
  - Verificados vínculos em `event_producers` e `user_producer_scopes` para `produtor.local@pdt.diskingressos.com.br` (`user_id = 00000000-0000-4000-8000-000000000103`, `producer_id = 11111111-2222-4333-8444-555555555555`) nos eventos autorizados `22222222-3333-4444-8555-666666666666` (`Festival Sinfônico de Curitiba 2026`) e `22222222-3333-4444-8555-666666666667` (`Noite de Gala Ópera de Arame 2026`), mantendo `22222222-3333-4444-8555-666666666699` (`Show Acústico Fora do Escopo`) isolado em outro produtor (`11111111-2222-4333-8444-555555555599`).
  - Conferida a query exata do `ProducerFinanceService` sobre `finance_ledger_entries` no Neon HML: retorna apenas `VENDA_INGRESSO_BRUTA`, `OBRIGACAO_PRODUTOR`, `REPASSE_PRODUTOR` e `RESERVA_ESTORNO` do produtor vinculado, excluindo `RECEITA_TAXA_DISK` e `TAXA_GATEWAY_MDR`.
- **Confirmação de segurança**: nenhuma operação financeira real (estorno, repasse ou antecipação bancária) foi executada em produção.

## Próximo marco fixo
Validar a fonte canônica de liquidações, retenções e compensações no Neon HML. Só então habilitar saldo disponível e solicitação persistida de repasse → aprovação Disk → assinatura produtor → assinatura final Disk → confirmação e conciliação. Não usar bruto menos repasse como saldo disponível.
