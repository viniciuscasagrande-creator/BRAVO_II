-- ============================================================================
-- BRAVO_II — Reversão Migration 0005: Pacote 06 Hardening
-- ============================================================================

DROP TABLE IF EXISTS event_change_cases;
DROP TABLE IF EXISTS event_publications;
DROP TABLE IF EXISTS event_media;
DROP TABLE IF EXISTS event_ticket_categories;
DROP TABLE IF EXISTS event_seats;

DROP INDEX IF EXISTS idx_event_approval_step_unique;
DROP INDEX IF EXISTS idx_event_one_primary_producer;

ALTER TABLE event_price_lots
  DROP COLUMN IF EXISTS starts_at,
  DROP COLUMN IF EXISTS ends_at;

ALTER TABLE event_fee_agreements
  DROP CONSTRAINT IF EXISTS chk_fee_maker_checker,
  DROP COLUMN IF EXISTS percent_basis_points,
  DROP COLUMN IF EXISTS proposed_by,
  DROP COLUMN IF EXISTS negotiation_reference;

ALTER TABLE events
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS ends_at,
  DROP COLUMN IF EXISTS sales_starts_at,
  DROP COLUMN IF EXISTS age_rating,
  DROP COLUMN IF EXISTS policy_url,
  DROP COLUMN IF EXISTS revision,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS approved_at;

ALTER TABLE producer_documents
  DROP COLUMN IF EXISTS storage_key,
  DROP COLUMN IF EXISTS checksum,
  DROP COLUMN IF EXISTS p06_status;

ALTER TABLE producers
  DROP CONSTRAINT IF EXISTS chk_producer_maker_checker,
  DROP COLUMN IF EXISTS state_registration,
  DROP COLUMN IF EXISTS municipal_registration,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS address_json,
  DROP COLUMN IF EXISTS legal_representative_json,
  DROP COLUMN IF EXISTS p06_status,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS verified_at;
