# Matriz de Permissões (RBAC + ABAC) — BRAVO_II (Pacotes 00 e 01)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Implementação no Servidor**: `apps/api/src/common/auth/auth.guard.ts`, `packages/contracts/src/index.ts`, `packages/core-policy/src/index.ts`

## 1. Perfis Canônicos (`CANONICAL_ROLES`)

| Código do Perfil | Nome (pt-BR) | Escopo | Permissões Atribuídas |
|---|---|---|---|
| `ADMIN_BRAVO` | Administrador Geral BRAVO_II | Interno Disk | Todas as 40 permissões canônicas (`PERMISSION_CODES`) |
| `COMERCIAL_DISK` | Comercial Disk | Interno Disk | `commercial:read/write/approve`, `producer:read/write`, `contract:read/write`, `event-fee:read-internal/write/approve`, `event:read` |
| `OPERACAO_EVENTOS` | Operação de Eventos | Interno Disk | `event:read/write/approve/publish`, `seatmap:read/write`, `lot:read/write`, `coupon:read/write`, `courtesy:read/write`, `checkin:read/operate`, `report:read` |
| `FINANCEIRO_DISK` | Financeiro Disk | Interno Disk | `finance:read/write/approve-payout/approve-advance/sign-payout/reconcile/bordero`, `event-fee:read-internal/approve`, `refund:read/approve`, `rh:bridge-approve`, `report:read/export`, `audit:read` |
| `RH_DP_DISK` | RH e Departamento Pessoal Disk | Interno Disk | `rh:read/write/self-read/timekeeping-read/timekeeping-punch/payroll-batch-create/payroll-batch-approve`, `report:read` |
| `SAC_ATENDIMENTO` | SAC e Pós-Venda Disk | Interno Disk | `sac:read/write`, `order:read`, `customer:read/write`, `ticket:read`, `refund:read/request` |
| `MARKETING_DISK` | Marketing e Remarketing Disk | Interno Disk | `marketing:read/write`, `remarketing:read/write`, `coupon:read`, `report:read` |
| `PDV_CAIXA` | Operador de Caixa PDV | Interno Disk | `pos:read/operate`, `order:read/write`, `ticket:read/issue` |
| `PORTARIA_CHECKIN` | Operador de Portaria e Check-in | Interno Disk | `checkin:read/operate`, `ticket:read` |
| `PRODUTOR_PDT` | Produtor / Organizador (PDT) | Externo Segregado (`user_producer_scopes` / `user_event_scopes`) | `pdt:access`, `event:read`, `report:read`, `finance:request-payout`, `finance:request-advance`, `finance:sign-producer` (**Sem `event-fee:read-internal` e sem `finance:read`**) |
| `AUDITOR_INTERNO` | Auditoria e Conformidade | Interno Disk | `audit:read`, `report:read/export`, `finance:read`, `event:read`, `order:read`, `refund:read` |

## 2. Invariantes de Segurança Verificados

1. **Isolamento de Taxa Disk Interna (SEC-001)**: `PRODUTOR_PDT` é bloqueado por guard e verificação explícita em `FinanceController`, `FinanceiroVideoController` e `Pacote06Service`.
2. **Isolamento de Escopo ABAC**: Consultas de `PRODUTOR_PDT` filtram obrigatoriamente por `actor.eventScopeIds` e `actor.producerScopeIds`.
3. **Proteção de Mutação**: Sessões por cookie `HttpOnly` (`bravo_session`) exigem cabeçalho `Origin` autorizado e `X-CSRF-Token` derivado por HMAC em todas as rotas `POST/PUT/PATCH/DELETE`.
