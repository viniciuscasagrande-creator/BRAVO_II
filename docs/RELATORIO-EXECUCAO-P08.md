# Relatório de Execução e Homologação — Pacote 08 (`BRAVO_II_PACOTE_08.zip`)

**Data de Execução:** 06/11/2026  
**Escopo:** Central de Clientes PF (CPF validado e protegido por HMAC-SHA256), Pedidos, Reservas Atômicas por Lote com Idempotência e Concorrência, Cancelamento de Reserva Não Paga, Liberação de Reservas Expiradas e Sequência Global de Ingressos de 8 Dígitos (`00000001` a `99999999`) com Consulta SAC.

---

## 1. Situação Existente, Proposta, Arquivos Afetados, Riscos e Dependências

- **Situação Existente:** O monorepo `BRAVO_II` já integrava os Pacotes `01` a `07` (incluindo as `149` funções catalogadas — `104` Financeiro Disk e `45` RH & DP —, Comercial Disk, Central de Produtores PJ com CNPJ alfanumérico 2026, Taxa Disk por evento, Event Builder de 10 etapas, autenticação central por cookie `HttpOnly` + `X-CSRF-Token` + `Origin`, lockout temporário de 30 minutos e `6/6` migrations SQL reversíveis).
- **Proposta:** Incorporar integralmente o **Pacote 08 (`BRAVO_II_PACOTE_08.zip`)** no mesmo monorepo e banco de homologação (`bravo_ii_hml`), preservando 100% dos módulos anteriores e adicionando `@bravo-ii/domain-p08`, evolução de `@bravo-ii/core-policy`, migration `0007`, módulo NestJS `BravoPacote08Module` (`/v1/clientes`, `/v1/pedidos`, `/v1/ingressos`) e telas Next.js (`/clientes`, `/pedidos`, `/ingressos`, `/pdv`).
- **Arquivos Criados/Alterados:**
  - Domínio P08: [`packages/domain-p08/src/index.ts`](file:///E:/BRAVO_II/packages/domain-p08/src/index.ts) e [`packages/domain-p08/src/sales.spec.ts`](file:///E:/BRAVO_II/packages/domain-p08/src/sales.spec.ts) (`23` testes unitários).
  - Políticas e Menu Core: [`packages/core-policy/src/index.ts`](file:///E:/BRAVO_II/packages/core-policy/src/index.ts) e [`packages/core-policy/src/policy.spec.ts`](file:///E:/BRAVO_II/packages/core-policy/src/policy.spec.ts) (`11` testes unitários, validação de `CPF_HASH_PEPPER`, papéis `SAC` e `PDV` e rotas `/clientes`, `/pedidos`, `/ingressos`, `/pdv`).
  - Banco de Dados e Schema: [`prisma/schema.prisma`](file:///E:/BRAVO_II/prisma/schema.prisma), [`database/migrations/0007_pacote08_customers_orders_reservations_tickets.up.sql`](file:///E:/BRAVO_II/database/migrations/0007_pacote08_customers_orders_reservations_tickets.up.sql), [`.down.sql`](file:///E:/BRAVO_II/database/migrations/0007_pacote08_customers_orders_reservations_tickets.down.sql) e suporte transacional serializável em [`apps/api/src/common/database/database.service.ts`](file:///E:/BRAVO_II/apps/api/src/common/database/database.service.ts).
  - Backend NestJS: [`apps/api/src/modules/pacote08/customer.service.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/customer.service.ts), [`apps/api/src/modules/pacote08/order.service.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/order.service.ts), [`apps/api/src/modules/pacote08/controllers.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/controllers.ts) e [`apps/api/src/modules/pacote08/module.ts`](file:///E:/BRAVO_II/apps/api/src/modules/pacote08/module.ts).
  - Frontend Next.js: [`apps/backoffice/src/app/(erp)/clientes/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/clientes/page.tsx), [`apps/backoffice/src/app/(erp)/pedidos/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/pedidos/page.tsx), [`apps/backoffice/src/app/(erp)/ingressos/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/ingressos/page.tsx) e [`apps/backoffice/src/app/(erp)/pdv/page.tsx`](file:///E:/BRAVO_II/apps/backoffice/src/app/(erp)/pdv/page.tsx).
  - Testes de Integridade, Smoke e E2E: [`tests/p08-integration-structure.test.mjs`](file:///E:/BRAVO_II/tests/p08-integration-structure.test.mjs), [`scripts/smoke-p08.mjs`](file:///E:/BRAVO_II/scripts/smoke-p08.mjs) e [`apps/api/src/bootstrap/pacote08-clientes-pedidos-reservas-ingressos.e2e.spec.ts`](file:///E:/BRAVO_II/apps/api/src/bootstrap/pacote08-clientes-pedidos-reservas-ingressos.e2e.spec.ts).

---

## 2. Comandos Executados e Resultados Reais

| Etapa | Comando Executado | Resultado |
|---|---|---|
| Testes Offline Pacote 08 (`64` testes) | `npm run test:offline` | **64/64 aprovados** (`15` domain-p06 + `11` core-policy + `23` domain-p08 + `15` integridade P06/P07/P08) |
| Total de Testes Unitários/Offline do Monorepo | `pnpm test` | **70/70 aprovados** (`64` Pacote 08 + `4` contracts + `2` api crypto) |
| Pré-verificação de Configuração (`doctor`) | `npm run doctor` | **APROVADA** (`Ambiente: HOMOLOGACAO \| Banco: /bravo_ii_hml \| Origem: http://localhost:3000`) |
| Migrations SQL Reversíveis | `pnpm db:migrate` | **7/7 migrations aplicadas** (`0001` a `0007`) |
| Suítes E2E HTTP + PostgreSQL | `pnpm test:e2e` | **30/30 testes E2E aprovados em 7 suítes** (Fase 01, Fases 02-03, Fases 04-05, Pacote Mestre 149 funções, Pacote 06, Pacote 07 e Pacote 08) |
| Typecheck Monorepo | `pnpm typecheck` | **11/11 pacotes e aplicações sem erros** |
| Build Integrado (NestJS + Next.js) | `pnpm build` | **11/11 compilados com sucesso** (`27/27` rotas Next.js geradas, incluindo `/clientes`, `/pedidos`, `/ingressos`, `/pdv`) |
| Pré-verificação de Prontidão (`doctor:ready`) | `npm run doctor:ready` | **APROVADA** |

---

## 3. Verificações de Segurança, Estoque e LGPD Comprovadas em Testes E2E

1. **Proteção de CPF (LGPD) e Deduplicação HMAC-SHA256**:
   - CPF validado matematicamente (`normalizeCpf`); valores inválidos ou com dígitos repetidos retornam `400 Bad Request`.
   - No banco (`customers`), o CPF nunca é gravado em claro: persiste-se apenas `cpf_fingerprint` (`HMAC-SHA256` com `CPF_HASH_PEPPER` de 32+ caracteres) e `cpf_masked` (`***.***.***-25`).
   - Nos registros de auditoria (`audit_records`), nem CPF, nem e-mail, nem telefone, nem endereço aparecem em `after_state`.
   - Tentativa de cadastrar o mesmo CPF retorna `409 Conflict`.
2. **Reserva Atômica, Idempotência e Concorrência Real sobre Últimos Ingressos**:
   - Eventos em `PUBLICACAO_SOLICITADA` (sem confirmação do worker externo) são bloqueados (`400`).
   - Canal `PDV` retorna `503 Service Unavailable` (`PDV e bilheteria pendentes de autenticação de terminal`).
   - Lotes vinculados a setores com assentos numerados (`isNumbered = true`) retornam `400 Bad Request` (`Lugares numerados aguardam módulo de alocação por assento`).
   - Chave idempotente (`idempotencyKey`) repetida com o mesmo payload retorna o mesmo pedido (`reused: true`) sem consumir estoque adicional; reutilizada com payload diferente retorna `409 Conflict`.
   - Dois operadores concorrendo simultaneamente pelos últimos `2` ingressos de um lote de capacidade `5` (já com `3` reservados): apenas **uma** requisição obtém `201 Created` (`reserved_count = 5`) e a segunda obtém `409 Conflict`, sem jamais exceder a capacidade do lote.
3. **Cancelamento Não Pago, Expiração de Reserva e Emissão de 8 Dígitos**:
   - `POST /v1/pedidos/:id/cancelar-reserva` cancela pedido `RESERVADO` e devolve a quantidade ao lote atomicamente.
   - `POST /v1/pedidos/reservas/expiradas/processar` expira reservas com `expires_at <= NOW()` e devolve o estoque sem permitir saldo negativo.
   - Não existe endpoint HTTP público para confirmar pagamento; `confirmVerifiedSettlement` exige `ENABLE_REAL_PAYMENTS=true` e recibo interno assinado (`HMAC-SHA256`), gerando ingressos sequenciais de 8 dígitos (`00000001`, `00000002`), evento `BRAVO_ORDER_PAID` no outbox e permitindo consulta pelo SAC em `GET /v1/ingressos?numero=00000001`.

---

## 4. Pendências Declaradas para Próximos Pacotes (Pacote 09+) e Preview Cloud

- **Pacote 09 (Checkout, PDV e Integração de Pagamentos)**: conexão autenticada de terminais PDV/bilheteria, adaptador de adquirente com webhook assinado, alocação concorrente de assentos numerados, geração de QR Code independente e disparo de e-mail transacional.
- **Confirmação Explícita de Segurança:** Nenhuma operação bancária real, pagamento, estorno, repasse, antecipação ou publicação no domínio `www.diskingressos.com.br` foi executada (`ENABLE_EXTERNAL_PUBLICATION=false`, `ENABLE_REAL_PAYMENTS=false`, `ENABLE_REAL_REFUNDS=false`).
