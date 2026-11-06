# Relatório de Homologação Real — BRAVO_II (Pacotes 08 e 09)

**Data:** 06/11/2026  
**Ambiente:** `HOMOLOGACAO` (`bravo_ii_hml` · PostgreSQL 16.4)  
**Escopo:** Homologação integrada de Clientes PF, Pedidos, Reservas Atômicas, Sequência de Ingressos de 8 Dígitos (`Pacote 08`), Checkout com Idempotência, Adaptador Sandbox PagBank Somente-Leitura e Administração de Terminais de PDV Bloqueados (`Pacote 09`).

---

## 1. Diagnóstico Inicial e Ambiente (Fase A)

- **Runtime:** Node.js `v24.18.0`, npm `11.16.0`, pnpm `12.6.0`, TypeScript `5.7.2`.
- **Banco de Dados:** PostgreSQL `16.4` (`bravo_ii_hml`), isolado de qualquer base operacional ou de produção.
- **Variáveis de Segurança e Travas Ativas (`.env` fora do Git):**
  - `BRAVO_ENV=HOMOLOGACAO`
  - `ENABLE_EXTERNAL_PUBLICATION=false`
  - `ENABLE_REAL_PAYMENTS=false`
  - `ENABLE_REAL_REFUNDS=false`
  - `ENABLE_PAGBANK_SANDBOX=false`
  - `ENABLE_PDV_OPERATIONS=false`
  - `CPF_HASH_PEPPER`: segredo criptográfico local de 64 caracteres hexadecimais (validado por `validateHomologationEnv`).
- **Preservação Integral de Módulos Anteriores:**
  - `reference/matriz-149-original.csv` (`SHA-256: 5f17423ad54b33ee368c0cf42a16e3522ad006433eef0f70d71d33dca985cd7c`) — 104 funções do Financeiro Disk e 45 funções de RH & DP intactas.
  - `reference/catalogo-149-original.json` (`SHA-256: ef759c31447956ea0aa672a87b97549b6aff0aa4cb09d1a984eef244d574c2e7`) — intacto.

---

## 2. Migrations, Build e Verificação de Banco (Fase B)

### 2.1 Migrations Aplicadas (`0001` a `0008`)
1. `0001_core_foundation.up.sql`
2. `0002_commercial_and_event_builder.up.sql`
3. `0003_sales_tickets_pos_gate_coupons.up.sql`
4. `0004_finance_rh_catalog_and_bridge.up.sql`
5. `0005_pacote06_commercial_producers_events_hardening.up.sql`
6. `0006_pacote07_auth_lockout_csrf_and_prisma_sync.up.sql`
7. `0007_pacote08_customers_orders_reservations_tickets.up.sql`
8. `0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql` (reversível via `0008_...down.sql`)

### 2.2 Tabelas Verificadas em `npm run test:homologacao`
- `producers`, `events`, `customers`, `users`
- `p08_sale_orders` (incluindo colunas `pdv_terminal_id` e `pdv_shift_id`)
- `p08_issued_tickets`, `p08_ticket_sequences`, `p08_payment_confirmations`
- `p09_checkout_attempts` (com `UNIQUE (order_id)` e `UNIQUE (idempotency_key)`)
- `p09_pdv_terminals` (default `BLOQUEADO_HOMOLOGACAO`)
- `p09_pdv_shifts`

---

## 3. Resultados Reais dos Testes Executados (Fases B e C)

| Suíte / Comando | Escopo | Resultado |
|---|---|---|
| `@bravo-ii/core-policy` | RBAC de menu (`/checkout`, `/pdv`), CSRF, Cookie HttpOnly, Lockout 30 min e invariantes de ambiente | **11/11 aprovados** |
| `@bravo-ii/domain-p06` | CNPJ Alfanumérico 2026, Taxa Disk por evento, Event Builder e 4 aprovações | **15/15 aprovados** |
| `@bravo-ii/domain-p08` | CPF dígito verificador, reserva <= 10, centavos inteiros, ingresso 8 dígitos, expiração 15 min | **23/23 aprovados** |
| `@bravo-ii/domain-p09` | Validação de checkout, bloqueio PIX Rede, terminal PDV, bloqueio de turno, payload sandbox PagBank | **25/25 aprovados** |
| `tests/*.test.mjs` | Integridade estrutural P07 + P08 + P09 e SHA-256 do catálogo 149 funções | **23/23 aprovados** |
| `@bravo-ii/contracts` + `@bravo-ii/api` (unit) | Contratos compartilhados e utilitários criptográficos `scrypt`/`SHA-256` | **6/6 aprovados** |
| `pnpm test:e2e` (8 suítes E2E HTTP + PostgreSQL) | Fases 01–05 + Pacote Mestre 149 + Pacote 06 + Pacote 07 + Pacote 08 + Pacote 09 | **34/34 aprovados** |
| `pnpm typecheck` | Typecheck estrito em todos os 15 pacotes/apps do monorepo | **15/15 aprovados** |
| `pnpm build` | Build completo dos pacotes, API NestJS e Backoffice Next.js (incluindo `/checkout` e `/pdv`) | **Aprovado (0 erros)** |
| `npm run doctor:ready` | Verificação de prontidão de homologação, segredos, artefatos e travas financeiras | **APROVADA** |
| `npm run test:homologacao` | Inspeção somente-leitura do PostgreSQL 16.4 (`bravo_ii_hml`) e presença das tabelas P06–P09 | **APROVADA_SOMENTE_LEITURA** |

---

## 4. Comprovação dos Casos de Uso e Casos Negativos (Fase C)

1. **Sessão Central, Cookie HttpOnly, CSRF, Origin e Logout:**
   - Requisições anônimas para `/v1/checkout/pedidos/:orderId/tentativas` e `/v1/pdv/terminais` retornam `401 Unauthorized`.
   - Requisições mutáveis (`POST`) com `Origin` falso (`https://site-falso.invalid`) ou sem `X-CSRF-Token` retornam `403 Forbidden`.
2. **Segregação de Perfis (RBAC) no Servidor e Menu:**
   - `ADMIN_BRAVO` e `OPERACAO_EVENTOS`: preparam e consultam tentativas de checkout.
   - `FINANCEIRO_DISK`: consulta tentativas de checkout (`200`), mas recebe `403` ao tentar preparar tentativa.
   - `SAC_ATENDIMENTO`, `PDV_CAIXA` e `PRODUTOR_PDT`: recebem `403` em todos os endpoints de `/v1/checkout/*`.
   - `PDV_CAIXA`: visualiza `/pdv` e lista terminais (`GET /v1/pdv/terminais` -> `200`), mas recebe `403` ao tentar registrar terminal (`POST /v1/pdv/terminais`, exclusivo de `ADMIN`).
3. **Idempotência e Unicidade de Checkout por Pedido:**
   - Primeira chamada `POST /v1/checkout/pedidos/:orderId/tentativas` com `UUID_1` cria tentativa `PENDENTE_HOMOLOGACAO` (`alreadyCreated: false`).
   - Repetição com mesmo `UUID_1` e mesmos dados retorna a mesma tentativa (`alreadyCreated: true`).
   - Repetição com mesmo `UUID_1` e dados diferentes (`CARTAO_CREDITO` em vez de `PIX`) retorna `409 Conflict`.
   - Segunda tentativa para o mesmo pedido com `UUID_2` diferente é recusada com `409 Conflict`.
4. **Proibição de Liquidação Automática e Ocultação da Taxa Disk:**
   - Preparar tentativa de checkout ou consultar o sandbox PagBank (`issuedTickets: 0`, `informationalOnly: true`) **nunca** altera o pedido para `PAGO` e **nunca** emite ingressos em `p08_issued_tickets`.
   - A resposta de `/v1/checkout/pedidos/:orderId/tentativas` não contém `percentBasisPoints`, `fixedCents`, `diskFee`, referência de negociação nem dados de cartão.
5. **Terminais de PDV Bloqueados e Auditoria:**
   - Registro de terminal (`PDV_CWB_001`) persiste com `status = 'BLOQUEADO_HOMOLOGACAO'` e grava evento `PDV_TERMINAL_REGISTRADO` na tabela imutável `audit_records`.
   - Abertura de turno (`POST /v1/pdv/terminais/:id/turnos`) e reserva via PDV (`POST /v1/pdv/terminais/:id/turnos/:shiftId/reservas`) permanecem bloqueadas com `503 Service Unavailable` (`ENABLE_PDV_OPERATIONS=false`).

---

## 5. Situação do Sandbox PagBank Externo (Fase D) e Pendências para Produção

- O adaptador PagBank (`BravoCheckoutService.startPagbankSandbox` e `consultPagbankSandbox`) utiliza exclusivamente o host estático `https://sandbox.api.pagseguro.com` e permanece desligado por padrão (`ENABLE_PAGBANK_SANDBOX=false`).
- Em teste controlado de homologação, foram validados o contrato de envio (`POST /checkouts`), a consulta informativa (`GET /checkouts/{id}`) e a transição segura para `RESULTADO_INDETERMINADO` em caso de falha de rede (bloqueando reenvio automático com `409 Conflict`).
- **Pendências antes de liberar vendas reais (Pacote 10+):**
  1. Homologação com credencial oficial de sandbox PagBank fornecida pela operação financeira e definição formal do modelo de assinatura de webhook (ECDSA sobre payload bruto vs SHA-256 legado por produto).
  2. Implementação do receptor de webhook autenticado + conciliação financeira no Ledger do Financeiro Disk.
  3. Certificação de hardware de PDV físico e habilitação controlada de turnos.

**Declaração de Segurança:** Nenhuma venda real, cobrança bancária, captura, estorno, emissão externa de QR Code ou publicação no site público foi executada.
