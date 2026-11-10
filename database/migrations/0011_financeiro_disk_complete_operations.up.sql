-- ============================================================================
-- BRAVO_II — Migration 0011: Instalação Completa das Tabelas Operacionais do Financeiro Disk
-- Cobre Repasses, Antecipações, Transferências entre Eventos, Contas Bancárias,
-- Fornecedores/Contas a Pagar, Fechamentos/Borderôs e Regras Paramétricas por Rotina.
-- Nenhuma movimentação financeira real externa é executada em homologação.
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_payout_requests (
  id UUID PRIMARY KEY,
  protocol VARCHAR(64) NOT NULL UNIQUE,
  request_type VARCHAR(32) NOT NULL DEFAULT 'REPASSE' CHECK (
    request_type IN ('REPASSE', 'ANTECIPACAO', 'TRANSFERENCIA_EVENTO')
  ),
  producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  target_event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  fee_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (fee_rate_bps >= 0),
  status VARCHAR(48) NOT NULL DEFAULT 'SOLICITADO' CHECK (
    status IN (
      'SOLICITADO',
      'EM_ANALISE',
      'APROVADO_FINANCEIRO',
      'ASSINADO_PRODUTOR',
      'ASSINADO_FINANCEIRO',
      'CONCLUIDO_HOMOLOGACAO',
      'REJEITADO'
    )
  ),
  requested_by VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_bank_accounts (
  id UUID PRIMARY KEY,
  owner_type VARCHAR(24) NOT NULL DEFAULT 'DISK_CORPORATE' CHECK (
    owner_type IN ('DISK_CORPORATE', 'PRODUCER')
  ),
  producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
  bank_name VARCHAR(120) NOT NULL,
  branch_code VARCHAR(32) NOT NULL,
  account_number VARCHAR(48) NOT NULL,
  pix_key VARCHAR(160),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ATIVA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_suppliers_and_payables (
  id UUID PRIMARY KEY,
  record_type VARCHAR(32) NOT NULL DEFAULT 'FORNECEDOR' CHECK (
    record_type IN ('FORNECEDOR', 'CONTA_PAGAR', 'PEDIDO_COMPRA')
  ),
  supplier_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(32) NOT NULL DEFAULT '—',
  category VARCHAR(120) NOT NULL DEFAULT 'Operacional',
  contract_ref VARCHAR(120) NOT NULL DEFAULT '—',
  due_date DATE,
  amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  status VARCHAR(48) NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_event_closings (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
  closing_code VARCHAR(64) NOT NULL UNIQUE,
  gross_revenue_cents BIGINT NOT NULL DEFAULT 0,
  expenses_cents BIGINT NOT NULL DEFAULT 0,
  net_payout_cents BIGINT NOT NULL DEFAULT 0,
  document_ref VARCHAR(180) NOT NULL DEFAULT 'BORDERO-OFICIAL',
  signatures_status VARCHAR(64) NOT NULL DEFAULT 'PENDENTE_DUPLA_ASSINATURA',
  status VARCHAR(48) NOT NULL DEFAULT 'EM_FECHAMENTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_operational_records (
  id UUID PRIMARY KEY,
  screen_id VARCHAR(120) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(48) NOT NULL DEFAULT 'ATIVO',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_payout_requests_type_status ON finance_payout_requests(request_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_bank_accounts_owner ON finance_bank_accounts(owner_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_suppliers_type ON finance_suppliers_and_payables(record_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_closings_created ON finance_event_closings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_op_records_screen ON finance_operational_records(screen_id, created_at DESC);
