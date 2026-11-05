-- ============================================================================
-- BRAVO_II — Rollback Migration 0003: Vendas, Ingressos, PDV, Portaria e Cupons
-- ============================================================================

DROP TABLE IF EXISTS ticket_checkins;
DROP TABLE IF EXISTS ticket_deliveries;
DROP TABLE IF EXISTS ticket_credentials;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS payment_provider_events;
DROP TABLE IF EXISTS payment_intents;
DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS pos_cash_sessions;
DROP TABLE IF EXISTS pos_terminals;
DROP TABLE IF EXISTS courtesy_quotas;
DROP TABLE IF EXISTS coupon_campaigns;
DROP TABLE IF EXISTS inventory_holds;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS customers;
