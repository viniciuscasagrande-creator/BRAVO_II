# FASE 05 — Operação PDV (Caixa), Validação de Portaria (QR Independente) e Motor de Cupons e Cortesias

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída e Verificada

---

## 1. Objetivo da Fase 05

Implementar os módulos de **Ponto de Venda / Caixa (`POS`)**, **Controle de Acesso e Portaria (`GATE`)** e **Cupons Comerciais e Quotas de Cortesias (`CPN`)**, garantindo:
- Cadastro de terminais físicos de PDV (`pos_terminals`) e controle de abertura, totalização e fechamento de sessões de caixa (`pos_cash_sessions`) vinculadas ao operador;
- Consumo do **mesmo inventário transacional** entre o Site DiskIngressos e os terminais de PDV, impedindo venda duplicada do mesmo assento ou capacidade;
- Motor de campanhas de cupons promocionais (`coupon_campaigns`, `coupon_redemptions`) por evento/sessão com desconto percentual ou fixo em centavos e bloqueio atômico quando o limite `max_uses` é atingido (`409 Conflict`);
- Controle de quotas de cortesias autorizadas por evento, sessão e setor (`courtesy_quotas`), emitindo ingressos gratuitos de 8 dígitos dentro do limite aprovado e registrando auditoria nominal;
- Validação de portaria/catraca (`ticket_checkins` via `POST /api/v1/checkins/validate`) que:
  1. **Rejeita tentativas informando apenas o código numérico público de 8 dígitos** (`DENIED_PUBLIC_CODE_ONLY`);
  2. Verifica a assinatura criptográfica HMAC-SHA256 da credencial QR independente (`ticket_credentials`);
  3. Rejeita ingressos cancelados/revogados (`DENIED_INVALID_STATUS`);
  4. Rejeita segunda tentativa de entrada com o mesmo ingresso (`DENIED_ALREADY_USED`).

---

## 2. Arquivos Criados e Alterados na Fase 05

- `database/migrations/0003_sales_tickets_pos_gate_coupons.up.sql` e `.down.sql` — Tabelas `pos_terminals`, `pos_cash_sessions`, `coupon_campaigns`, `coupon_redemptions`, `courtesy_quotas` e `ticket_checkins`.
- `apps/api/src/modules/point-of-sale/point-of-sale.service.ts`, `point-of-sale.controller.ts`, `point-of-sale.module.ts` — Gestão de terminais PDV e abertura/fechamento de caixa com trilha de auditoria.
- `apps/api/src/modules/coupons/coupons.service.ts`, `coupons.controller.ts`, `coupons.module.ts` — Campanhas de cupons comerciais e quotas/emissão de cortesias.
- `apps/api/src/modules/gate-control/gate-control.service.ts`, `gate-control.controller.ts`, `gate-control.module.ts` — Validador criptográfico de portaria e registro de tentativas em `ticket_checkins` e `audit_records`.
- `apps/api/src/scripts/run-technical-seed.ts` — Inclusão dos operadores técnicos locais `pdv.local@diskingressos.com.br` (`PDV_CAIXA`) e `portaria.local@diskingressos.com.br` (`PORTARIA_CHECKIN`).
- `apps/backoffice/src/app/ingressos-portaria/page.tsx` e `apps/backoffice/src/app/cupons-cortesias/page.tsx` — Interfaces em pt-BR para Central de Ingressos (8 dígitos), Simulador/Validador de Catraca QR e Gestão de Cupons e Cortesias.
- `apps/api/src/bootstrap/sales-tickets-pos-gate.e2e.spec.ts` — Testes E2E cobrindo PDV, Cupons, Cortesias e Portaria.

---

## 3. Rotas de API e Componentes Prontos

| Método / Rota | Permissão RBAC | Tabelas Persistidas |
|---|---|---|
| `GET /api/v1/pos/terminals` / `POST /api/v1/pos/terminals` | `order:write` | `pos_terminals`, `audit_records` |
| `GET /api/v1/pos/cash-sessions` | Autenticado | `pos_cash_sessions` |
| `POST /api/v1/pos/cash-sessions/open` | `order:write` | `pos_cash_sessions`, `audit_records` |
| `POST /api/v1/pos/cash-sessions/:id/close` | `order:write` | `pos_cash_sessions`, `audit_records` |
| `GET /api/v1/coupon-campaigns` / `POST /api/v1/coupon-campaigns` | `coupon:read` / `coupon:write` | `coupon_campaigns`, `audit_records` |
| `GET /api/v1/courtesy-quotas` / `POST /api/v1/courtesy-quotas` | `coupon:read` / `coupon:write` | `courtesy_quotas`, `audit_records` |
| `POST /api/v1/courtesy-quotas/:quotaId/issue` | `coupon:write` | `courtesy_quotas`, `inventory_holds`, `orders`, `order_items`, `tickets`, `ticket_credentials`, `audit_records` |
| `POST /api/v1/checkins/validate` | `checkin:validate` | `ticket_checkins`, `tickets`, `audit_records` |
| Telas `/ingressos-portaria` e `/cupons-cortesias` | `ticket:read`, `checkin:validate`, `coupon:read` | Central de Ingressos + Validador QR + Motor de Cupons/Cortesias |

---

## 4. Checklist de Critérios de Aceite (`prompts/03-VENDAS-INGRESSOS-PDV.md`)

- [x] **Concorrência pelo último lugar do setor (Site vs PDV)**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 2) — duas requisições concorrentes para o assento `A-01` resultam em exatamente `201 Created` para um canal e `409 Conflict` para o outro.
- [x] **Webhook de pagamento repetido (idempotência)**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 2) — segundo envio com mesmo `providerEventId` retorna `idempotentReplay: true` sem duplicar ingresso nem pagamento.
- [x] **Falha de envio de e-mail seguida de retry**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 3) — ingresso nasce com `validityStatus = 'EMITIDO'` e `deliveryStatus = 'FALHA_ENVIO'`, e após `retry-delivery` transita para `ENVIADO` (`SENT`).
- [x] **Tentativa de check-in duplicado**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 4) — primeiro check-in retorna `ALLOWED` (`VALIDADO`) e segundo retorna `DENIED_ALREADY_USED`.
- [x] **Tentativa de check-in em ingresso cancelado**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 5) — após cancelamento do ingresso, o QR Code retorna `DENIED_INVALID_STATUS` e o assento volta para `AVAILABLE`.
- [x] **Tentativa de check-in usando apenas o número público de 8 dígitos**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (item 4) — bloqueado com `DENIED_PUBLIC_CODE_ONLY` e auditado.
- [x] **Cupom esgotado e quota de cortesia**: Testado em `sales-tickets-pos-gate.e2e.spec.ts` (itens 5 e 6) — bloqueados com `409 Conflict` ao atingir `maxUses` / `authorizedQuantity`.

---

## 5. Próximos Passos Seguros

- **Próximo Pacote Sugerido (Pacotes 06 e 07 — SAC, SLA, Estornos e Financeiro Disk)**: implementar `prompts/04-SAC-ESTORNOS.md` e `prompts/05-FINANCEIRO-REPASSES-ANTECIPACOES.md`, cobrindo chamados SAC com SLA, solicitações de estorno segregadas (SAC solicita → Financeiro aprova → Provedor Sandbox confirma → Conclusão e invalidação do ingresso) e o Ledger Financeiro de partidas dobradas (separando caixa recebido pela Disk, obrigação por evento/produtor, receita de Taxa Disk, MDR, repasses e antecipações).
