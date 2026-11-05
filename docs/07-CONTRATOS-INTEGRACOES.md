# 07 — Contratos, APIs, eventos e integrações

## Padrão de integração
O sistema novo expõe **API versionada** (REST/OpenAPI para operações de comando/consulta, webhooks para entrada e eventos de domínio para comunicação interna). Todos os clientes, inclusive PDT e PDV, passam por autenticação e escopo. Não dar acesso direto a banco a frontends de terceiros. Cada integração requer owner, segredo, ambiente, limites, monitoramento, regras de retry e idempotência.

## Interfaces externas por prioridade
1. **Site `www.diskingressos.com.br`**: catálogo de evento/publicação, sessões, disponibilidade, reserva, checkout, pedido, entrega de ingresso, QR e cancelamentos.
2. **PDT**: consultas autorizadas por produtor/evento, borderô, mapa/estoque, cortesias, bloqueios, repasses/antecipações e assinatura de documentos.
3. **PDVs**: venda no caixa, busca de evento/sessão, disponibilidade, emissão, fechamento, devoluções autorizadas e auditoria do operador/terminal.
4. **Gateways/adquirentes**: PagBank/PagSeguro, Rede e outros que forem efetivamente contratados; tokenização, captura, eventos, liquidação, taxas e estorno.
5. **Mensageria**: e-mail transacional, WhatsApp Business e SMS conforme provedor e política de opt-in.
6. **Marketing/analytics**: UTMs, Meta Ads/CAPI, Google Ads/Analytics, TikTok Ads, Spotify Ads, respeitando disponibilidade e consentimentos aplicáveis.
7. **Portaria**: validadores QR, dispositivos, filas offline autorizadas e sincronização.
8. **Fiscal/Contabilidade/Banco**: exportações/API sob contratos e regras aprovados, sem assumir suporte existente.

## Endpoints ilustrativos (contratos a codificar; não rotas já existentes)
| Módulo | Método / rota | Escopo de permissão |
|---|---|---|
| Produtores | `POST /api/v1/producers` | `producer:create` |
| Produtores | `GET /api/v1/producers/:id` | `producer:read` + contexto |
| Eventos | `POST /api/v1/events` | `event:create` |
| Eventos | `POST /api/v1/events/:id/submit` | `event:submit` |
| Comercial | `POST /api/v1/events/:id/fee-agreements` | `event-fee:propose` |
| Comercial | `POST /api/v1/events/:id/fee-agreements/:version/approve` | `event-fee:approve` |
| Eventos | `POST /api/v1/events/:id/approve` | `event:approve` |
| Eventos | `POST /api/v1/events/:id/publish` | `event:publish` |
| Estoque | `POST /api/v1/sessions/:id/holds` | `inventory:hold` |
| Pedidos | `POST /api/v1/orders` | `order:create` |
| Pedidos | `POST /api/v1/orders/:id/checkout` | `order:checkout` |
| Pagamentos | `POST /api/v1/webhooks/payments/:provider` | assinatura do provedor |
| Ingressos | `GET /api/v1/tickets/:id` | `ticket:read` + contexto |
| Ingressos | `POST /api/v1/tickets/:id/session-change` | `ticket:change-session` |
| Portaria | `POST /api/v1/checkins/validate` | `checkin:validate` |
| SAC | `POST /api/v1/service-cases` | `case:create` |
| SAC | `POST /api/v1/service-cases/:id/actions` | `case:act` |
| Estorno | `POST /api/v1/refunds` | `refund:request` |
| Estorno | `POST /api/v1/refunds/:id/approve` | `refund:approve` |
| Estorno | `POST /api/v1/refunds/:id/execute` | `refund:execute` e guardas de estado |
| Financeiro | `GET /api/v1/finance/events/:eventId/balance` | `finance:event-read` |
| Financeiro | `POST /api/v1/payouts` | `payout:request` |
| Financeiro | `POST /api/v1/payouts/:id/approve` | `payout:approve` |
| PDT | `GET /api/v1/producer-portal/events` | `pdt:event-read` com escopo obrigatório |
| Cupons | `POST /api/v1/coupon-campaigns` | `coupon:create` |
| Marketing | `GET /api/v1/reports/campaign-sales` | `marketing:report` |
| Auditoria | `GET /api/v1/audit-records` | `audit:read` |

**Todas as operações de escrita financeira/pedido relevantes:** header `Idempotency-Key`, `correlation-id`, controle de concorrência/versionamento e retorno de status estável. Webhook exige verificação criptográfica/assinatura conforme provedor e registro imutável do payload seguro.

## Eventos de domínio exemplificativos
`ProducerVerified`, `EventSubmitted`, `EventFeeApproved`, `EventApproved`, `EventPublished`, `InventoryReserved`, `InventoryHoldExpired`, `PaymentCaptured`, `PaymentSettled`, `OrderConfirmed`, `TicketIssued`, `TicketDelivered`, `TicketCheckedIn`, `CouponRedeemed`, `ServiceCaseOpened`, `RefundApproved`, `RefundProviderConfirmed`, `PayoutApproved`, `PayoutSettled`, `EventPostponed`, `EventCancelled`, `ConsentRevoked`.

Cada evento: `event_id` único, nome e versão, data UTC, `aggregate_id` e versão, `correlation_id`, `causation_id`, contexto de produtor/evento, origem, dados minimizados e controle de duplicatas. **Evento de integração não é o mesmo que evento de espetáculo**: nomear objetos inequivocamente nos códigos.

## Webhooks de gateways
Receber → validar assinatura/origem → armazenar referência e idempotência → reconciliar com `PaymentIntent`/`RefundAttempt` → aplicar transição de estado permitida → gerar outbox → projetar saldos e envio. Evitar confiar no redirect do navegador como prova de pagamento.

## Marketing e dados de vendas
Um mesmo pedido pode receber várias interações de campanha. Guardar `first-touch`, `last-touch`, janela de atribuição e `UTM snapshot` como parâmetros do modelo, sem confundir com a fonte financeira. Exportar dados agregados ou pseudonimizados quando possível. Disparo comercial usa canal e finalidade permitidos.

## PDT e site protegido
Primeira versão do BRAVO_II pode integrar o site/PDT atuais por adaptadores. Não recriar o front público antes de confirmar contrato, auth, mapeamentos de eventos, pagamento e emissão. Integração deve provar paridade funcional de consulta, alteração e segurança.
