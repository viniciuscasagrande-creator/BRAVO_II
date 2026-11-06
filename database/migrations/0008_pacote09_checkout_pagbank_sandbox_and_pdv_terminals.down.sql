-- ============================================================================
-- BRAVO_II — Rollback Migration 0008: Pacote 09
-- ============================================================================

DROP TABLE IF EXISTS p09_checkout_attempts;

ALTER TABLE p08_sale_orders
  DROP COLUMN IF EXISTS pdv_shift_id,
  DROP COLUMN IF EXISTS pdv_terminal_id;

DROP TABLE IF EXISTS p09_pdv_shifts;
DROP TABLE IF EXISTS p09_pdv_terminals;
