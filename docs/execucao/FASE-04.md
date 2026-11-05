# FASE 04 — Inventário Transacional, Clientes PF, Pedidos, Pagamentos Sandbox e Ingressos de 8 Dígitos + QR Independente

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída e Verificada

---

## 1. Objetivo da Fase 04

Implementar os módulos de **Clientes PF (`CRM-B2C`)**, **Inventário e Reservas (`INV`)**, **Pedidos (`ORD`)**, **Pagamentos Sandbox (`PAY`)** e **Ingressos (`TKT`)**, atendendo integralmente às regras de `docs/01-JORNADA-OPERACIONAL.md`, `docs/04-DADOS-E-REGRAS.md`, `docs/06-ESTADOS-EXCECOES.md` e `prompts/03-VENDAS-INGRESSOS-PDV.md`:
- Cadastro de Clientes Pessoa Física (`customers`) com CPF protegido por hash SHA-256 (`cpf_hash`), exibição mascarada (`cpf_masked`: `***.456.789-**`) e consentimento LGPD de marketing separado do envio transacional de ingressos;
- Disponibilidade transacional por sessão, setor e assento (`seats`) com reservas temporárias (`inventory_holds`), expiração automática de reservas vencidas e exclusão mútua contra *double booking* entre canais concorrentes (`SITE` vs `PDV`);
- Criação de pedido (`orders`, `order_items`) com chave de idempotência, cálculo exato em centavos inteiros e captura de `event_fee_snapshots` congelando a versão aprovada vigente da **Taxa Disk por evento**;
- Integração de pagamento em **Sandbox** (`payment_intents`) e receptor de webhook assinado e idempotente (`POST /api/v1/webhooks/payments/:provider` apoiado em `payment_provider_events` com `provider_event_id` único);
- Emissão de ingresso (`tickets`) com **código numérico público de 8 dígitos** (`^[0-9]{8}$`, preservando zeros à esquerda), **credencial QR independente assinada por HMAC-SHA256** (`ticket_credentials`) e 3 eixos ortogonais de status (`validity_status`, `delivery_status`, `checkin_status`);
- Fila de entrega de e-mail transacional (`ticket_deliveries` + `outbox_events`) na qual falha de envio (`FALHA_ENVIO` / `FAILED_RETRYABLE`) não invalida o ingresso emitido e permite reenvio auditado (`POST /api/v1/tickets/:ticketId/retry-delivery`).

---

## 2. Inventário Prévio e Arquivos Criados/Alterados

### Situação Prévia
- As Fases 00 a 03 entregaram fundação, RBAC+ABAC, Produtores PJ, motor prospectivo de Taxa Disk por evento e Event Builder com publicação controlada.
- Os módulos `customers`, `inventory`, `orders`, `payments` e `tickets` possuíam estrutura modular inicial aguardando implementação de domínio.

### Arquivos Criados e Alterados
- `database/migrations/0003_sales_tickets_pos_gate_coupons.up.sql` e `.down.sql` — Criação das tabelas `customers`, `seats`, `inventory_holds`, `orders`, `order_items`, `payment_intents`, `payment_provider_events`, `tickets`, `ticket_credentials` e `ticket_deliveries`.
- `packages/config/src/index.ts` — Inclusão de `qrSigningSecret` para assinatura criptográfica HMAC-SHA256 das credenciais QR independentes.
- `packages/contracts/src/index.ts` — Schemas Zod e DTOs para Clientes PF, Assentos, Holds, Pedidos, Checkout Sandbox, Webhooks e Ingressos de 8 dígitos.
- `packages/sdk/src/index.ts` — Novos métodos tipados no `BravoApiClient`.
- `apps/api/src/modules/customers/customers.service.ts`, `customers.controller.ts`, `customers.module.ts` — Cadastro e listagem de Clientes PF com mascaramento de PII.
- `apps/api/src/modules/inventory/inventory.service.ts`, `inventory.controller.ts`, `inventory.module.ts` — Criação de assentos, consulta de disponibilidade e `InventoryHold` transacional concorrente com expiração automática.
- `apps/api/src/modules/orders/orders.service.ts`, `orders.controller.ts`, `orders.module.ts` — Criação de pedidos, captura de `event_fee_snapshots`, checkout Sandbox e webhook idempotente.
- `apps/api/src/modules/tickets/tickets.service.ts`, `tickets.controller.ts`, `tickets.module.ts` — Alocação de código público de 8 dígitos (`^[0-9]{8}$`), geração de credencial QR independente, fila de entrega de e-mail, retry e cancelamento com retorno ao estoque.
- `apps/backoffice/src/app/cadastros/page.tsx` e `apps/backoffice/src/app/pedidos-vendas/page.tsx` — Interfaces operacionais completas em pt-BR.
- `apps/api/src/bootstrap/sales-tickets-pos-gate.e2e.spec.ts` — Suíte de testes E2E automatizada.

---

## 3. Rotas de API e Tabelas Persistidas

| Método / Rota | Tabelas Persistidas |
|---|---|
| `GET /api/v1/customers` / `POST /api/v1/customers` | `customers`, `audit_records` |
| `POST /api/v1/events/:eventId/sectors/:sectorId/seats` | `seats`, `audit_records` |
| `GET /api/v1/sessions/:sessionId/availability` | `event_sectors`, `seats`, `inventory_holds`, `tickets` |
| `POST /api/v1/sessions/:sessionId/holds` | `inventory_holds`, `seats`, `audit_records` |
| `GET /api/v1/orders` / `POST /api/v1/orders` | `orders`, `order_items`, `inventory_holds`, `coupon_redemptions`, `audit_records` |
| `POST /api/v1/orders/:orderId/checkout` | `payment_intents`, `orders`, `event_fee_snapshots`, `tickets` |
| `POST /api/v1/webhooks/payments/:provider` | `payment_provider_events`, `payment_intents`, `orders`, `event_fee_snapshots`, `tickets`, `ticket_credentials`, `ticket_deliveries`, `outbox_events` |
| `GET /api/v1/tickets` | `tickets`, `ticket_credentials`, `ticket_deliveries` |
| `POST /api/v1/tickets/:ticketId/retry-delivery` | `ticket_deliveries`, `tickets`, `outbox_events`, `audit_records` |
| `POST /api/v1/tickets/:ticketId/cancel` | `tickets`, `ticket_credentials`, `seats`, `audit_records` |

---

## 4. Testes Executados e Evidências Reais

- `pnpm db:migrate` → **Exit code 0** (`0003_sales_tickets_pos_gate_coupons.up.sql` aplicada com sucesso).
- `pnpm test` → **Exit code 0** (6/6 testes unitários aprovados).
- `pnpm test:e2e` → **Exit code 0** (15/15 testes E2E aprovados, incluindo corrida concorrente pelo último assento entre Site e PDV, webhook duplicado idempotente sem duplicar ingressos, e falha de e-mail seguida de retry sem invalidar o ingresso).
- `pnpm typecheck` e `pnpm build` → **Exit code 0** em todos os pacotes e aplicações.

---

## 5. Confirmação Explícita de Governança e Segurança

- **Nenhuma cobrança financeira real foi executada**: `ALLOW_REAL_PAYMENT_GATEWAY=false`, `ALLOW_REAL_REFUND_EXECUTION=false` e `ALLOW_REAL_PAYOUT_EXECUTION=false`. Todas as transações ocorrem exclusivamente no provedor `SANDBOX_GATEWAY`.
