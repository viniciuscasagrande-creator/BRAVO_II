-- ============================================================================
-- BRAVO_II — Reversão da Migration 0011: Tabelas Operacionais do Financeiro Disk
-- ============================================================================

DROP TABLE IF EXISTS finance_operational_records;
DROP TABLE IF EXISTS finance_event_closings;
DROP TABLE IF EXISTS finance_suppliers_and_payables;
DROP TABLE IF EXISTS finance_bank_accounts;
DROP TABLE IF EXISTS finance_payout_requests;
