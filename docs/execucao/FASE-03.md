# FASE 03 — Eventos, Event Builder em Etapas, Aprovação e Publicação Controlada

**Data de execução:** 05/11/2026  
**Projeto:** BRAVO_II — Novo ERP modular da DiskIngressos (Construção 100% Greenfield)  
**Status:** Concluída e Verificada

---

## 1. Objetivo da Fase 03

Implementar o domínio de **Eventos (`EVT` / `INV`)** e o **Event Builder por etapas** (`docs/10-UX-E-TELAS.md`), garantindo:
- Cadastro de evento em estado inicial `RASCUNHO` vinculado a produtor(es) PJ (`PRIMARY` e `SECONDARY` em `event_producers`);
- Configuração estruturada de:
  - Sessões e horários (`event_sessions`);
  - Mapa, áreas e setores com capacidade e bloqueios (`event_sectors`);
  - Modalidades, categorias (`INTEIRA`, `MEIA_ENTRADA`, `SOLIDARIO`, `PROMOCIONAL`) e lotes de preço em centavos inteiros (`event_price_lots`);
  - Canais de venda (`SITE`, `PDV`, `BILHETERIA`) e meios de pagamento permitidos (`event_sales_channels`);
- Máquina de estados e barreiras de integridade (`RASCUNHO → ENVIADO_PARA_ANALISE → APROVADO → PUBLICADO`):
  - Rejeição automática (`400 EVENT_FEE_APPROVAL_REQUIRED`) caso se tente aprovar ou publicar um evento sem **Taxa Disk por evento aprovada pelo Comercial**, mesmo que toda a estrutura cadastral esteja preenchida;
  - Publicação controlada gravando evento `EventPublished` no `outbox_events` e registro `before_state`/`after_state` em `audit_records`, sem disparar publicação externa não autorizada em produção.

---

## 2. Arquivos Criados e Alterados na Fase 03

- `database/migrations/0002_commercial_and_event_builder.up.sql` e `.down.sql` — Tabelas `event_sessions`, `event_sectors`, `event_price_lots`, `event_sales_channels` e `event_approvals`.
- `packages/contracts/src/index.ts` — Schemas e DTOs do Event Builder (`CreateEventRequestSchema`, `CreateEventSessionRequestSchema`, `CreateEventSectorRequestSchema`, `CreateEventPriceLotRequestSchema`, `CreateEventSalesChannelRequestSchema`, `EventBuilderFullViewDto`).
- `packages/sdk/src/index.ts` — Métodos do Event Builder no `BravoApiClient`.
- `apps/api/src/modules/events/events.service.ts` e `events.controller.ts` — Implementação completa do Event Builder, checklist `publicationReadiness` e guardas de aprovação/publicação.
- `apps/backoffice/src/app/eventos/page.tsx` — Interface pt-BR do Event Builder em etapas com painel de prontidão de publicação e ficha completa do evento.
- `apps/api/src/bootstrap/commercial-and-events.e2e.spec.ts` — Suíte E2E validando o fluxo completo do Event Builder e os bloqueios de aprovação/publicação.

---

## 3. Rotas de API e Componentes Prontos

| Método / Rota | Permissão RBAC | Tabelas Persistidas |
|---|---|---|
| `GET /api/v1/events` | `event:read` (+ escopo PDT) | `events`, `event_producers` |
| `GET /api/v1/events/:eventId` | `event:read` (+ escopo PDT) | `events`, `event_sessions`, `event_sectors`, `event_price_lots`, `event_sales_channels`, `event_approvals` |
| `POST /api/v1/events` | `event:write` | `events`, `event_producers`, `audit_records` |
| `POST /api/v1/events/:eventId/sessions` | `event:write` | `event_sessions`, `audit_records` |
| `POST /api/v1/events/:eventId/sectors` | `event:write` | `event_sectors`, `audit_records` |
| `POST /api/v1/events/:eventId/price-lots` | `event:write` | `event_price_lots`, `audit_records` |
| `POST /api/v1/events/:eventId/channels` | `event:write` | `event_sales_channels`, `audit_records` |
| `POST /api/v1/events/:eventId/submit` | `event:write` | `events`, `outbox_events`, `audit_records` |
| `POST /api/v1/events/:eventId/approve` | `event:approve` | `events`, `event_approvals`, `outbox_events`, `audit_records` |
| `POST /api/v1/events/:eventId/publish` | `event:publish` | `events`, `event_sessions`, `outbox_events`, `audit_records` |
| Tela `/eventos` (Next.js) | `event:read` / `event:write` | Event Builder guiado em etapas e checklist de publicação |

---

## 4. Testes e Evidências

- **`pnpm test:e2e` (`commercial-and-events.e2e.spec.ts`)**:
  - Tentativa de aprovar ou publicar evento com cadastro completo (sessão, setor, lote e canal), porém sem Taxa Disk aprovada pelo Comercial, é bloqueada com `HTTP 400` (`EVENT_FEE_APPROVAL_REQUIRED`) e registrada em `audit_records` com `outcome = 'DENIED'`.
  - Após aprovação comercial da Taxa Disk por evento, o fluxo `RASCUNHO → ENVIADO_PARA_ANALISE → APROVADO → PUBLICADO` conclui com sucesso, ativando as sessões para `ON_SALE` e gravando `EventPublished` no `outbox_events`.

---

## 5. Confirmação de Segurança e Próximo Passo

- Nenhuma publicação externa real em `www.diskingressos.com.br` nem cobrança bancária real foi executada.
- **Próximo Pacote Sugerido (Pacote 04 — Pedidos / Pagamentos / Ingressos)**: implementar reserva concorrente de inventário (`InventoryHold`), checkout com gateway em sandbox idempotente, emissão de ingresso com código numérico público de 8 dígitos (`^[0-9]{8}$`), credencial QR independente e fila de envio de e-mail transacional.
