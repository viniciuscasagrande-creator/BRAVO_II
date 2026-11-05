-- ============================================================================
-- BRAVO_II — Migration 0005: Pacote 06 (Comercial Disk, Central de Produtores PJ + CNPJ Alfanumérico 2026,
-- Taxa Disk por Evento em Basis Points/Centavos com Maker-Checker, Event Builder 10 Etapas,
-- Aprovação em 4 Etapas, Solicitação Idempotente de Publicação e Ocorrências)
-- Reversibilidade documentada em: 0005_pacote06_commercial_producers_events_hardening.down.sql
-- ============================================================================

-- 1. Evolução da tabela canônica producers (compartilhada entre Comercial, Eventos, Financeiro e RH)
ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS state_registration VARCHAR(64),
  ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(64),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(48),
  ADD COLUMN IF NOT EXISTS address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_representative_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS p06_status VARCHAR(32) NOT NULL DEFAULT 'EM_CADASTRO' CHECK (
    p06_status IN ('EM_CADASTRO', 'EM_VALIDACAO', 'APROVADO', 'SUSPENSO', 'INATIVO')
  ),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE producers DROP CONSTRAINT IF EXISTS chk_producer_maker_checker;
ALTER TABLE producers ADD CONSTRAINT chk_producer_maker_checker CHECK (
  verified_by IS NULL OR created_by IS NULL OR created_by <> verified_by
);

-- 2. Evolução de producer_documents com storage_key privado (secure://) e checksum SHA-256
ALTER TABLE producer_documents
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS checksum VARCHAR(128),
  ADD COLUMN IF NOT EXISTS p06_status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE' CHECK (
    p06_status IN ('PENDENTE', 'VALIDADO', 'REJEITADO')
  );

-- 3. Evolução da tabela canônica events para cobrir todas as 10 abas do Event Builder Pacote 06
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sales_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS age_rating VARCHAR(64) NOT NULL DEFAULT 'Livre',
  ADD COLUMN IF NOT EXISTS policy_url VARCHAR(512) NOT NULL DEFAULT 'https://www.diskingressos.com.br/politica',
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (
  status IN (
    'RASCUNHO',
    'EM_ANALISE',
    'ENVIADO_PARA_ANALISE',
    'VALIDACAO_CADASTRAL',
    'ANALISE_COMERCIAL',
    'ANALISE_OPERACIONAL',
    'APROVADO',
    'PUBLICACAO_SOLICITADA',
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
);

-- Garantia de apenas um produtor principal por evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_one_primary_producer
  ON event_producers (event_id)
  WHERE relationship_role = 'PRIMARY';

-- 4. Evolução de event_fee_agreements com basis points (0..10000), referência negocial e maker-checker
ALTER TABLE event_fee_agreements
  ADD COLUMN IF NOT EXISTS percent_basis_points INTEGER CHECK (
    percent_basis_points IS NULL OR (percent_basis_points >= 0 AND percent_basis_points <= 10000)
  ),
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS negotiation_reference VARCHAR(255);

ALTER TABLE event_fee_agreements DROP CONSTRAINT IF EXISTS chk_fee_maker_checker;
ALTER TABLE event_fee_agreements ADD CONSTRAINT chk_fee_maker_checker CHECK (
  approved_by IS NULL OR proposed_by IS NULL OR proposed_by <> approved_by
);

-- 5. Evolução de event_approvals para cobrir as 4 etapas (CADASTRAL, COMERCIAL, OPERACIONAL, PUBLICACAO)
ALTER TABLE event_approvals DROP CONSTRAINT IF EXISTS event_approvals_stage_check;
ALTER TABLE event_approvals ADD CONSTRAINT event_approvals_stage_check CHECK (
  stage IN ('CADASTRAL', 'COMERCIAL', 'OPERACIONAL', 'PUBLICACAO')
);

ALTER TABLE event_approvals DROP CONSTRAINT IF EXISTS event_approvals_decision_check;
ALTER TABLE event_approvals ADD CONSTRAINT event_approvals_decision_check CHECK (
  decision IN ('APPROVED', 'REJECTED', 'APROVADO', 'REPROVADO')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_approval_step_unique
  ON event_approvals (event_id, stage);

-- 6. Evolução de event_price_lots com janela de vendas (starts_at / ends_at)
ALTER TABLE event_price_lots
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 7. Tabelas complementares do Pacote 06 (Assentos Numerados, Categorias, Mídia, Publicação e Ocorrências)
CREATE TABLE IF NOT EXISTS event_seats (
  id UUID PRIMARY KEY,
  area_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE CASCADE,
  row_label VARCHAR(32) NOT NULL,
  seat_number VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (area_id, row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS event_ticket_categories (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  requires_proof BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, name)
);

CREATE TABLE IF NOT EXISTS event_media (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind VARCHAR(64) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_publications (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  destination VARCHAR(64) NOT NULL DEFAULT 'DISKINGRESSOS',
  status VARCHAR(48) NOT NULL DEFAULT 'PENDENTE_INTEGRACAO' CHECK (
    status IN ('PENDENTE_INTEGRACAO', 'PUBLICADO', 'FALHA_INTEGRACAO', 'DESPUBLICADO')
  ),
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  external_publication_id VARCHAR(128),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS event_change_cases (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  change_type VARCHAR(48) NOT NULL CHECK (
    change_type IN ('ADIAMENTO', 'CANCELAMENTO', 'SUSPENSAO', 'ALTERACAO')
  ),
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ABERTO' CHECK (
    status IN ('ABERTO', 'EM_ANALISE', 'CONCLUIDO', 'CANCELADO')
  ),
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_seats_area ON event_seats(area_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_categories_event ON event_ticket_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_event ON event_media(event_id);
CREATE INDEX IF NOT EXISTS idx_event_publications_event ON event_publications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_change_cases_event ON event_change_cases(event_id);
