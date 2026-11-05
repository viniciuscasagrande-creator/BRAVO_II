-- ============================================================================
-- BRAVO_II — Reversão Migration 0006: Pacote 07 Auth Lockout & CSRF
-- ============================================================================

ALTER TABLE users
  DROP COLUMN IF EXISTS failed_logins,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS force_password_change;
