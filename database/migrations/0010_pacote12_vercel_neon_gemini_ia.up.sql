-- =============================================================================
-- BRAVO_II — Migration 0010: Pacote 12 (Vercel Preview + Neon + Gemini IA)
-- Contagem persistente de cotas do Assistente Gemini por usuário/minuto/dia.
-- =============================================================================

CREATE TABLE IF NOT EXISTS p12_ai_quota_windows (
  actor_id VARCHAR(120) NOT NULL,
  bucket VARCHAR(10) NOT NULL CHECK (bucket IN ('MINUTO', 'DIA')),
  window_start TIMESTAMPTZ NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (actor_id, bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_p12_ai_quota_windows_start
  ON p12_ai_quota_windows (window_start);
