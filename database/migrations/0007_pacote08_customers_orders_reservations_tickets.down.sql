-- ============================================================================
-- BRAVO_II — Reversão Migration 0007: Pacote 08
-- ============================================================================

DROP TABLE IF EXISTS p08_payment_confirmations;
DROP TABLE IF EXISTS p08_issued_tickets;
DROP TABLE IF EXISTS p08_ticket_sequences;
DROP TABLE IF EXISTS p08_sale_orders;

ALTER TABLE event_price_lots
  DROP CONSTRAINT IF EXISTS chk_event_price_lots_inventory_bounds,
  DROP COLUMN IF EXISTS reserved_count,
  DROP COLUMN IF EXISTS issued_count;

ALTER TABLE customers
  DROP COLUMN IF EXISTS cpf_fingerprint,
  DROP COLUMN IF EXISTS cpf_last4,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS address_json,
  DROP COLUMN IF EXISTS created_by;
