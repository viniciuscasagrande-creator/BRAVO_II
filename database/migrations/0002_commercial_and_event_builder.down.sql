-- ============================================================================
-- BRAVO_II — Rollback Migration 0002: Comercial e Event Builder
-- ============================================================================

DROP TRIGGER IF EXISTS trg_forbid_event_fee_snapshots_mutation ON event_fee_snapshots;
DROP FUNCTION IF EXISTS forbid_event_fee_snapshots_mutation();

DROP TABLE IF EXISTS event_approvals;
DROP TABLE IF EXISTS event_sales_channels;
DROP TABLE IF EXISTS event_price_lots;
DROP TABLE IF EXISTS event_sectors;
DROP TABLE IF EXISTS event_sessions;
DROP TABLE IF EXISTS event_fee_snapshots;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS producer_documents;
DROP TABLE IF EXISTS producer_contacts;
