-- ============================================================================
-- BRAVO_II — Migration 0006: Pacote 07 (Homologação de Autenticação Central,
-- Proteção contra Força Bruta / Lockout de Conta, Troca Forçada de Senha e CSRF)
-- Reversibilidade documentada em: 0006_pacote07_auth_lockout_csrf_and_prisma_sync.down.sql
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_logins INTEGER NOT NULL DEFAULT 0 CHECK (failed_logins >= 0),
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;
