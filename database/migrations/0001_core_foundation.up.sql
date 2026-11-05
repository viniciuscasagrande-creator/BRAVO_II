-- ============================================================================
-- BRAVO_II — Migration 0001: Fundação Greenfield do Core, IAM, Escopos, Auditoria e Taxa Disk por Evento
-- Construção 100% independente do código-fonte do SIGE (docs/11-CONSTRUCAO-SEM-FONTE-SIGE.md)
-- Reversibilidade documentada em: 0001_core_foundation.down.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  code VARCHAR(64) PRIMARY KEY,
  name_pt_br VARCHAR(120) NOT NULL,
  description_pt_br TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  code VARCHAR(96) PRIMARY KEY,
  module_code VARCHAR(32) NOT NULL,
  description_pt_br TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code VARCHAR(64) NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code VARCHAR(96) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE IF NOT EXISTS user_role_grants (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code VARCHAR(64) NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_code)
);

CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255) NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')
  ),
  source_system VARCHAR(64) NOT NULL DEFAULT 'BRAVO_II',
  source_record_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state_uf CHAR(2) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  status VARCHAR(48) NOT NULL DEFAULT 'RASCUNHO' CHECK (
    status IN (
      'RASCUNHO',
      'ENVIADO_PARA_ANALISE',
      'VALIDACAO_CADASTRAL',
      'ANALISE_COMERCIAL',
      'ANALISE_OPERACIONAL',
      'APROVADO',
      'AGENDADO_PARA_PUBLICACAO',
      'PUBLICADO',
      'EM_VENDA',
      'ENCERRADO',
      'CONCLUIDO',
      'REPROVADO',
      'SUSPENSO',
      'ADIADO',
      'CANCELADO'
    )
  ),
  starts_at TIMESTAMPTZ NOT NULL,
  source_system VARCHAR(64) NOT NULL DEFAULT 'BRAVO_II',
  source_record_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_producers (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  relationship_role VARCHAR(32) NOT NULL DEFAULT 'PRIMARY' CHECK (
    relationship_role IN ('PRIMARY', 'SECONDARY', 'CO_PRODUCER')
  ),
  revenue_share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (
    revenue_share_percentage >= 0 AND revenue_share_percentage <= 100
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, producer_id)
);

-- Regra irrenunciável: Taxa Disk é negociada e configurada POR EVENTO, com versionamento e escopo INTERNAL_DISK
CREATE TABLE IF NOT EXISTS event_fee_agreements (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agreement_version INTEGER NOT NULL CHECK (agreement_version >= 1),
  calculation_type VARCHAR(24) NOT NULL CHECK (calculation_type IN ('PERCENTAGE', 'FIXED')),
  percentage_rate NUMERIC(7, 4) CHECK (percentage_rate IS NULL OR (percentage_rate >= 0 AND percentage_rate <= 100)),
  fixed_amount_cents BIGINT CHECK (fixed_amount_cents IS NULL OR fixed_amount_cents >= 0),
  payer VARCHAR(24) NOT NULL DEFAULT 'CUSTOMER' CHECK (payer IN ('CUSTOMER', 'PRODUCER', 'SPLIT')),
  visibility VARCHAR(24) NOT NULL DEFAULT 'INTERNAL_DISK' CHECK (visibility IN ('INTERNAL_DISK')),
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'SUPERSEDED', 'REJECTED')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  approval_reference VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, agreement_version),
  CHECK (
    (calculation_type = 'PERCENTAGE' AND percentage_rate IS NOT NULL AND fixed_amount_cents IS NULL)
    OR
    (calculation_type = 'FIXED' AND fixed_amount_cents IS NOT NULL AND percentage_rate IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS user_producer_scopes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, producer_id)
);

CREATE TABLE IF NOT EXISTS user_event_scopes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  ip_address VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  order_reference VARCHAR(64) NOT NULL,
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  reason_pt_br TEXT NOT NULL,
  status VARCHAR(48) NOT NULL DEFAULT 'SOLICITADO' CHECK (
    status IN (
      'SOLICITADO',
      'EM_TRIAGEM',
      'AGUARDANDO_APROVACAO_FINANCEIRA',
      'APROVADO',
      'ENVIADO_AO_PROVEDOR',
      'PROCESSANDO',
      'CONFIRMADO_PELO_PROVEDOR',
      'CONCILIADO',
      'CONCLUIDO',
      'REPROVADO',
      'CANCELADO_COM_JUSTIFICATIVA'
    )
  ),
  provider_confirmation_ref VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trilha de auditoria imutável desde a fundação
CREATE TABLE IF NOT EXISTS audit_records (
  id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id UUID REFERENCES users(id),
  actor_role VARCHAR(64) NOT NULL,
  session_id UUID,
  ip_address VARCHAR(64),
  canonical_action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  producer_id UUID,
  event_id UUID,
  outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILURE')),
  justification TEXT,
  origin VARCHAR(32) NOT NULL DEFAULT 'API',
  correlation_id VARCHAR(128) NOT NULL,
  before_state JSONB,
  after_state JSONB,
  integrity_hash VARCHAR(128) NOT NULL
);

CREATE OR REPLACE FUNCTION forbid_audit_records_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Registros de auditoria (audit_records) são imutáveis e não permitem UPDATE ou DELETE.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forbid_audit_records_mutation ON audit_records;
CREATE TRIGGER trg_forbid_audit_records_mutation
BEFORE UPDATE OR DELETE ON audit_records
FOR EACH ROW EXECUTE FUNCTION forbid_audit_records_mutation();

-- Outbox transacional para eventos de domínio
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY,
  event_name VARCHAR(120) NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(128) NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  causation_id VARCHAR(128),
  producer_id UUID,
  event_id UUID,
  payload JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_records_occurred_at ON audit_records(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_records_event_id ON audit_records(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_records_actor ON audit_records(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_event_producers_producer ON event_producers(producer_id);
CREATE INDEX IF NOT EXISTS idx_user_event_scopes_user ON user_event_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_producer_scopes_user ON user_producer_scopes(user_id);
