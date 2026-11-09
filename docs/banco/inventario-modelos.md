# Inventário Real de Modelos Prisma e Tabelas SQL — BRAVO_II (Pacotes 00 e 01)

- **Commit-base**: `405f41158b0b231ec2420ca62280a5fdb952edec`
- **Data da verificação**: `2026-11-09T17:27:12.297Z`
- **Total de modelos em `prisma/schema.prisma`**: **55**
- **Total de tabelas nas migrations SQL (`database/migrations/0001..0010`)**: **77**
- **Total de tabelas base no Neon HML (`bravo_ii_hml`)**: **78** (77 tabelas de domínio + `schema_migrations`)

## 1. Os 55 Modelos Declarados em `prisma/schema.prisma`

| # | Modelo Prisma | Tabela Mapeada (`@@map`) | Presente nas Migrations SQL? | Presente no Neon HML? |
|---|---|---|---|---|
| 1 | `BravoProducer` | `producers` | Sim (0001_core_foundation.up.sql) | Sim |
| 2 | `BravoProducerDocument` | `producer_documents` | Sim (0002_commercial_and_event_builder.up.sql) | Sim |
| 3 | `BravoEvent` | `events` | Sim (0001_core_foundation.up.sql) | Sim |
| 4 | `BravoEventProducer` | `event_producers` | Sim (0001_core_foundation.up.sql) | Sim |
| 5 | `BravoEventSession` | `event_sessions` | Sim (0002_commercial_and_event_builder.up.sql) | Sim |
| 6 | `BravoEventArea` | `event_sectors` | Sim (0002_commercial_and_event_builder.up.sql) | Sim |
| 7 | `BravoEventSeat` | `event_seats` | Sim (0005_pacote06_commercial_producers_events_hardening.up.sql) | Sim |
| 8 | `BravoTicketCategory` | `event_ticket_categories` | Sim (0005_pacote06_commercial_producers_events_hardening.up.sql) | Sim |
| 9 | `BravoPriceLot` | `event_price_lots` | Sim (0002_commercial_and_event_builder.up.sql) | Sim |
| 10 | `BravoEventChannel` | `event_channels` | Divergente (ver reconciliação) | Não |
| 11 | `BravoEventMedia` | `event_media_assets` | Divergente (ver reconciliação) | Não |
| 12 | `BravoEventFee` | `event_fee_configs` | Divergente (ver reconciliação) | Não |
| 13 | `BravoEventApproval` | `event_approvals` | Sim (0002_commercial_and_event_builder.up.sql) | Sim |
| 14 | `BravoPublication` | `p06_event_publications` | Divergente (ver reconciliação) | Não |
| 15 | `BravoOutbox` | `outbox_events` | Sim (0001_core_foundation.up.sql) | Sim |
| 16 | `BravoAudit` | `audit_records` | Sim (0001_core_foundation.up.sql) | Sim |
| 17 | `BravoCommercialProposal` | `commercial_proposals` | Divergente (ver reconciliação) | Não |
| 18 | `BravoCommercialContract` | `commercial_contracts` | Divergente (ver reconciliação) | Não |
| 19 | `BravoEventDocument` | `p06_event_documents` | Divergente (ver reconciliação) | Não |
| 20 | `BravoEventChangeCase` | `p06_event_change_cases` | Divergente (ver reconciliação) | Não |
| 21 | `BravoIdentityUser` | `users` | Sim (0001_core_foundation.up.sql) | Sim |
| 22 | `BravoIdentitySession` | `auth_sessions` | Sim (0001_core_foundation.up.sql) | Sim |
| 23 | `BravoCustomer` | `customers` | Sim (0003_sales_tickets_pos_gate_coupons.up.sql) | Sim |
| 24 | `BravoSaleOrder` | `p08_sale_orders` | Sim (0007_pacote08_customers_orders_reservations_tickets.up.sql) | Sim |
| 25 | `BravoIssuedTicket` | `p08_issued_tickets` | Sim (0007_pacote08_customers_orders_reservations_tickets.up.sql) | Sim |
| 26 | `BravoTicketSequence` | `p08_ticket_sequence` | Divergente (ver reconciliação) | Não |
| 27 | `BravoPaymentConfirmation` | `p08_payment_confirmations` | Sim (0007_pacote08_customers_orders_reservations_tickets.up.sql) | Sim |
| 28 | `BravoCheckoutAttempt` | `p09_checkout_attempts` | Sim (0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql) | Sim |
| 29 | `BravoPdvTerminal` | `p09_pdv_terminals` | Sim (0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql) | Sim |
| 30 | `BravoPdvShift` | `p09_pdv_shifts` | Sim (0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql) | Sim |
| 31 | `BravoSupportTeam` | `p10_support_teams` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 32 | `BravoSupportTeamMember` | `p10_support_team_members` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 33 | `BravoSupportQueue` | `p10_support_queues` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 34 | `BravoSlaPolicy` | `p10_sla_policies` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 35 | `BravoSupportCase` | `p10_support_cases` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 36 | `BravoSupportInteraction` | `p10_support_interactions` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 37 | `BravoSupportIncident` | `p10_support_incidents` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 38 | `BravoSupportProblem` | `p10_support_problems` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 39 | `BravoKnowledgeArticle` | `p10_knowledge_articles` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 40 | `BravoSupportSatisfaction` | `p10_support_satisfaction` | Divergente (ver reconciliação) | Não |
| 41 | `BravoOrderChangeRequest` | `p10_order_change_requests` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 42 | `BravoTicketReplacement` | `p10_ticket_replacements` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 43 | `BravoCancellationRequest` | `p10_cancellation_requests` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 44 | `BravoRefundRequest` | `p10_refund_requests` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 45 | `BravoRefundApproval` | `p10_refund_approvals` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 46 | `BravoRefundAttempt` | `p10_refund_attempts` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 47 | `BravoEventRefundBatch` | `p10_event_refund_batches` | Sim (0009_pacote10_sac_pos_venda_estornos.up.sql) | Sim |
| 48 | `BravoAiQuotaWindow` | `p12_ai_quota_windows` | Sim (0010_pacote12_vercel_neon_gemini_ia.up.sql) | Sim |
| 49 | `BravoFunctionCatalog` | `catalog_149_functions` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 50 | `BravoFinanceCostCenter` | `finance_cost_centers` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 51 | `BravoRhEmployee` | `rh_employees` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 52 | `BravoRhGeofence` | `rh_geofences` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 53 | `BravoRhTimePunch` | `rh_time_punches` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 54 | `BravoRhPaymentBatch` | `rh_payment_batches` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |
| 55 | `BravoFinanceLedgerEntry` | `finance_ledger_entries` | Sim (0004_finance_rh_catalog_and_bridge.up.sql) | Sim |

## 2. As 77 Tabelas Criadas nas Migrations SQL (`0001` a `0010`)

| # | Tabela SQL | Migration de Origem | Mapeada no Prisma? | Presente no Neon HML? |
|---|---|---|---|---|
| 1 | `users` | `0001_core_foundation.up.sql` | Sim | Sim |
| 2 | `roles` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 3 | `permissions` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 4 | `role_permissions` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 5 | `user_role_grants` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 6 | `producers` | `0001_core_foundation.up.sql` | Sim | Sim |
| 7 | `events` | `0001_core_foundation.up.sql` | Sim | Sim |
| 8 | `event_producers` | `0001_core_foundation.up.sql` | Sim | Sim |
| 9 | `event_fee_agreements` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 10 | `user_producer_scopes` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 11 | `user_event_scopes` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 12 | `auth_sessions` | `0001_core_foundation.up.sql` | Sim | Sim |
| 13 | `refund_requests` | `0001_core_foundation.up.sql` | Apenas SQL/Core | Sim |
| 14 | `audit_records` | `0001_core_foundation.up.sql` | Sim | Sim |
| 15 | `outbox_events` | `0001_core_foundation.up.sql` | Sim | Sim |
| 16 | `producer_contacts` | `0002_commercial_and_event_builder.up.sql` | Apenas SQL/Core | Sim |
| 17 | `producer_documents` | `0002_commercial_and_event_builder.up.sql` | Sim | Sim |
| 18 | `contracts` | `0002_commercial_and_event_builder.up.sql` | Apenas SQL/Core | Sim |
| 19 | `event_fee_snapshots` | `0002_commercial_and_event_builder.up.sql` | Apenas SQL/Core | Sim |
| 20 | `event_sessions` | `0002_commercial_and_event_builder.up.sql` | Sim | Sim |
| 21 | `event_sectors` | `0002_commercial_and_event_builder.up.sql` | Sim | Sim |
| 22 | `event_price_lots` | `0002_commercial_and_event_builder.up.sql` | Sim | Sim |
| 23 | `event_sales_channels` | `0002_commercial_and_event_builder.up.sql` | Apenas SQL/Core | Sim |
| 24 | `event_approvals` | `0002_commercial_and_event_builder.up.sql` | Sim | Sim |
| 25 | `customers` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Sim | Sim |
| 26 | `seats` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 27 | `inventory_holds` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 28 | `coupon_campaigns` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 29 | `courtesy_quotas` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 30 | `pos_terminals` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 31 | `pos_cash_sessions` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 32 | `orders` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 33 | `order_items` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 34 | `coupon_redemptions` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 35 | `payment_intents` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 36 | `payment_provider_events` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 37 | `tickets` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 38 | `ticket_credentials` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 39 | `ticket_deliveries` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 40 | `ticket_checkins` | `0003_sales_tickets_pos_gate_coupons.up.sql` | Apenas SQL/Core | Sim |
| 41 | `catalog_149_functions` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 42 | `finance_cost_centers` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 43 | `rh_employees` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 44 | `rh_geofences` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 45 | `rh_time_punches` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 46 | `rh_payment_batches` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 47 | `finance_ledger_entries` | `0004_finance_rh_catalog_and_bridge.up.sql` | Sim | Sim |
| 48 | `event_seats` | `0005_pacote06_commercial_producers_events_hardening.up.sql` | Sim | Sim |
| 49 | `event_ticket_categories` | `0005_pacote06_commercial_producers_events_hardening.up.sql` | Sim | Sim |
| 50 | `event_media` | `0005_pacote06_commercial_producers_events_hardening.up.sql` | Apenas SQL/Core | Sim |
| 51 | `event_publications` | `0005_pacote06_commercial_producers_events_hardening.up.sql` | Apenas SQL/Core | Sim |
| 52 | `event_change_cases` | `0005_pacote06_commercial_producers_events_hardening.up.sql` | Apenas SQL/Core | Sim |
| 53 | `p08_sale_orders` | `0007_pacote08_customers_orders_reservations_tickets.up.sql` | Sim | Sim |
| 54 | `p08_ticket_sequences` | `0007_pacote08_customers_orders_reservations_tickets.up.sql` | Apenas SQL/Core | Sim |
| 55 | `p08_issued_tickets` | `0007_pacote08_customers_orders_reservations_tickets.up.sql` | Sim | Sim |
| 56 | `p08_payment_confirmations` | `0007_pacote08_customers_orders_reservations_tickets.up.sql` | Sim | Sim |
| 57 | `p09_pdv_terminals` | `0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql` | Sim | Sim |
| 58 | `p09_pdv_shifts` | `0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql` | Sim | Sim |
| 59 | `p09_checkout_attempts` | `0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.up.sql` | Sim | Sim |
| 60 | `p10_support_teams` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 61 | `p10_support_team_members` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 62 | `p10_support_queues` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 63 | `p10_sla_policies` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 64 | `p10_support_cases` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 65 | `p10_support_interactions` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 66 | `p10_support_problems` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 67 | `p10_support_incidents` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 68 | `p10_knowledge_articles` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 69 | `p10_support_satisfactions` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Apenas SQL/Core | Sim |
| 70 | `p10_order_change_requests` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 71 | `p10_ticket_replacements` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 72 | `p10_cancellation_requests` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 73 | `p10_refund_requests` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 74 | `p10_refund_approvals` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 75 | `p10_refund_attempts` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 76 | `p10_event_refund_batches` | `0009_pacote10_sac_pos_venda_estornos.up.sql` | Sim | Sim |
| 77 | `p12_ai_quota_windows` | `0010_pacote12_vercel_neon_gemini_ia.up.sql` | Sim | Sim |
