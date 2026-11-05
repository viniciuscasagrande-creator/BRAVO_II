-- ============================================================================
-- BRAVO_II — Rollback Migration 0004
-- ============================================================================

DROP TRIGGER IF EXISTS trg_forbid_finance_ledger_mutation ON finance_ledger_entries;
DROP FUNCTION IF EXISTS forbid_finance_ledger_mutation();

DROP TABLE IF EXISTS finance_ledger_entries;
DROP TABLE IF EXISTS rh_payment_batches;
DROP TABLE IF EXISTS rh_time_punches;
DROP TABLE IF EXISTS rh_geofences;
DROP TABLE IF EXISTS rh_employees;
DROP TABLE IF EXISTS finance_cost_centers;
DROP TABLE IF EXISTS catalog_149_functions;
