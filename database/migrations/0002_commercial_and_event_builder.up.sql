-- ============================================================================
-- BRAVO_II — Migration 0002: Comercial, Produtores PJ (Contatos, Documentos, Contratos),
-- Snapshots de Taxa Disk por Evento e Event Builder (Sessões, Setores, Lotes, Canais, Aprovações)
-- Reversibilidade documentada em: 0002_commercial_and_event_builder.down.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS producer_contacts (
  id UUID PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(48) NOT NULL,
  role_type VARCHAR(48) NOT NULL CHECK (
    role_type IN ('LEGAL_REPRESENTATIVE', 'FINANCIAL', 'OPERATIONAL', 'COMMERCIAL')
  ),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS producer_documents (
  id UUID PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL CHECK (
    document_type IN ('CONTRATO_SOCIAL', 'CARTAO_CNPJ', 'DOCUMENTO_REPRESENTANTE', 'COMPROVANTE_BANCARIO')
  ),
  document_reference VARCHAR(255) NOT NULL,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')
  ),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  contract_number VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED')
  ),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshot contratual congelado da Taxa Disk aplicada em vendas/emissões do evento.
-- Alterações futuras na Taxa Disk do evento criam nova versão prospectiva e NUNCA recalculam snapshots passados.
CREATE TABLE IF NOT EXISTS event_fee_snapshots (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  fee_agreement_id UUID NOT NULL REFERENCES event_fee_agreements(id) ON DELETE RESTRICT,
  agreement_version INTEGER NOT NULL,
  reference_type VARCHAR(48) NOT NULL CHECK (reference_type IN ('ORDER_ITEM', 'PRICE_SIMULATION')),
  reference_id VARCHAR(128) NOT NULL,
  ticket_nominal_price_cents BIGINT NOT NULL CHECK (ticket_nominal_price_cents >= 0),
  calculation_type VARCHAR(24) NOT NULL CHECK (calculation_type IN ('PERCENTAGE', 'FIXED')),
  percentage_rate NUMERIC(7, 4),
  fixed_amount_cents BIGINT,
  calculated_disk_fee_cents BIGINT NOT NULL CHECK (calculated_disk_fee_cents >= 0),
  payer VARCHAR(24) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reference_type, reference_id)
);

CREATE OR REPLACE FUNCTION forbid_event_fee_snapshots_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Snapshots contratuais de Taxa Disk (event_fee_snapshots) são imutáveis e não permitem UPDATE ou DELETE.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forbid_event_fee_snapshots_mutation ON event_fee_snapshots;
CREATE TRIGGER trg_forbid_event_fee_snapshots_mutation
BEFORE UPDATE OR DELETE ON event_fee_snapshots
FOR EACH ROW EXECUTE FUNCTION forbid_event_fee_snapshots_mutation();

-- Sessões do Evento (Event Builder Etapa 3)
CREATE TABLE IF NOT EXISTS event_sessions (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  doors_open_at TIMESTAMPTZ,
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED', 'ON_SALE', 'PAUSED', 'CLOSED', 'POSTPONED', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, code)
);

-- Mapa / Áreas / Setores por Sessão (Event Builder Etapa 4)
CREATE TABLE IF NOT EXISTS event_sectors (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  area_type VARCHAR(32) NOT NULL DEFAULT 'STANDING' CHECK (area_type IN ('SEATED', 'STANDING', 'BOX')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  blocked_quantity INTEGER NOT NULL DEFAULT 0 CHECK (blocked_quantity >= 0 AND blocked_quantity <= capacity),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, code)
);

-- Modalidades, Lotes e Preços em Centavos (Event Builder Etapa 5)
CREATE TABLE IF NOT EXISTS event_price_lots (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE CASCADE,
  modality_name VARCHAR(120) NOT NULL,
  category_type VARCHAR(32) NOT NULL DEFAULT 'INTEIRA' CHECK (
    category_type IN ('INTEIRA', 'MEIA_ENTRADA', 'SOLIDARIO', 'PROMOCIONAL', 'CORTESIA')
  ),
  lot_number INTEGER NOT NULL CHECK (lot_number >= 1),
  nominal_price_cents BIGINT NOT NULL CHECK (nominal_price_cents >= 0),
  max_quantity INTEGER NOT NULL CHECK (max_quantity > 0),
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sector_id, modality_name, lot_number)
);

-- Canais de Venda e PDVs Habilitados no Evento (Event Builder Etapa 6)
CREATE TABLE IF NOT EXISTS event_sales_channels (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  channel_type VARCHAR(32) NOT NULL CHECK (channel_type IN ('SITE', 'PDV', 'BILHETERIA')),
  channel_code VARCHAR(64) NOT NULL,
  channel_name VARCHAR(120) NOT NULL,
  allowed_payment_methods JSONB NOT NULL DEFAULT '["PIX", "CREDIT_CARD"]'::jsonb,
  channel_service_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (channel_service_fee_cents >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, channel_code)
);

-- Trilha de Aprovações por Etapa do Evento (Event Builder Etapa 9)
CREATE TABLE IF NOT EXISTS event_approvals (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage VARCHAR(32) NOT NULL CHECK (stage IN ('CADASTRAL', 'COMERCIAL', 'OPERACIONAL')),
  decision VARCHAR(24) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  decided_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producer_contacts_producer ON producer_contacts(producer_id);
CREATE INDEX IF NOT EXISTS idx_producer_documents_producer ON producer_documents(producer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_producer ON contracts(producer_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sectors_event ON event_sectors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_price_lots_event ON event_price_lots(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sales_channels_event ON event_sales_channels(event_id);
CREATE INDEX IF NOT EXISTS idx_event_approvals_event ON event_approvals(event_id);
