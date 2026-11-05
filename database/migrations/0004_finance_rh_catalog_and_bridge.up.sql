-- ============================================================================
-- BRAVO_II — Migration 0004: Fundação Financeiro Disk (104 Funções) + RH & DP (45 Funções)
-- + Matriz Oficial de Rastreabilidade (149 Rotas) + Ponte Transacional RH → Financeiro
-- Reversibilidade documentada em: 0004_finance_rh_catalog_and_bridge.down.sql
-- ============================================================================

-- 1. Catálogo Oficial das 149 Funções (104 Financeiro Disk + 45 RH & DP)
CREATE TABLE IF NOT EXISTS catalog_149_functions (
  numero INTEGER PRIMARY KEY CHECK (numero BETWEEN 1 AND 149),
  area VARCHAR(24) NOT NULL CHECK (area IN ('FINANCEIRO', 'RH')),
  grupo VARCHAR(120) NOT NULL,
  grupo_rh VARCHAR(120),
  etiqueta VARCHAR(180) NOT NULL,
  id_origem VARCHAR(120) NOT NULL,
  filter_arg VARCHAR(120),
  rota VARCHAR(255) NOT NULL UNIQUE,
  fonte_menu VARCHAR(120) NOT NULL DEFAULT 'js/menuConfig.js',
  tem_case_explicito BOOLEAN NOT NULL DEFAULT TRUE,
  status_origem VARCHAR(64) NOT NULL DEFAULT 'ROTA_NO_DISPATCHER_LEGADO',
  estado_migracao VARCHAR(48) NOT NULL DEFAULT 'PENDENTE' CHECK (
    estado_migracao IN (
      'PENDENTE',
      'IMPLEMENTADO_NAO_TESTADO',
      'TESTADO_HOMOLOGACAO',
      'APROVADO_PRODUCAO'
    )
  ),
  target_module_code VARCHAR(64) NOT NULL,
  required_permission VARCHAR(64) NOT NULL,
  preservar BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Centros de Custo Segregados (CORPORATIVO_RH vs EVENTO_STAFF)
CREATE TABLE IF NOT EXISTS finance_cost_centers (
  id UUID PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  center_type VARCHAR(32) NOT NULL CHECK (center_type IN ('CORPORATIVO_RH', 'EVENTO_STAFF', 'OPERACIONAL_DISK')),
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (center_type = 'EVENTO_STAFF' AND event_id IS NOT NULL)
    OR
    (center_type <> 'EVENTO_STAFF' AND event_id IS NULL)
  )
);

-- 3. Cadastro Mestre Único de Colaboradores (RH Disk / DP) com Proteção LGPD
CREATE TABLE IF NOT EXISTS rh_employees (
  id UUID PRIMARY KEY,
  matricula VARCHAR(48) NOT NULL UNIQUE,
  cpf_hash VARCHAR(128) NOT NULL UNIQUE,
  cpf_masked VARCHAR(24) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contract_type VARCHAR(32) NOT NULL CHECK (
    contract_type IN ('CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO_EVENTO', 'FREELANCER')
  ),
  department_name VARCHAR(120) NOT NULL,
  role_title VARCHAR(120) NOT NULL,
  base_salary_cents BIGINT NOT NULL CHECK (base_salary_cents >= 0),
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED')
  ),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cercas Virtuais (Geofences) e Registro de Ponto (Disk Ponto Portaria 671 MTE)
CREATE TABLE IF NOT EXISTS rh_geofences (
  id UUID PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rh_time_punches (
  id UUID PRIMARY KEY,
  nsr BIGSERIAL UNIQUE,
  employee_id UUID NOT NULL REFERENCES rh_employees(id) ON DELETE RESTRICT,
  geofence_id UUID REFERENCES rh_geofences(id) ON DELETE RESTRICT,
  punch_type VARCHAR(24) NOT NULL CHECK (
    punch_type IN ('ENTRADA', 'INICIO_INTERVALO', 'FIM_INTERVALO', 'SAIDA')
  ),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  distance_meters INTEGER NOT NULL CHECK (distance_meters >= 0),
  validation_status VARCHAR(32) NOT NULL CHECK (
    validation_status IN ('VALIDADA', 'FORA_DA_AREA', 'PENDENTE_ANALISE', 'OFFLINE_SINCRONIZADA')
  ),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  authenticity_hash VARCHAR(128) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Lotes de Pagamento RH -> Solicitação de Tesouraria Financeiro Disk (Sem PII/Salários Individuais no Evento)
CREATE TABLE IF NOT EXISTS rh_payment_batches (
  id UUID PRIMARY KEY,
  company_code VARCHAR(64) NOT NULL DEFAULT 'DISKINGRESSOS',
  batch_code VARCHAR(80) NOT NULL UNIQUE,
  batch_type VARCHAR(32) NOT NULL CHECK (
    batch_type IN ('FOLHA', 'EQUIPE_EVENTO', 'REEMBOLSO_RH')
  ),
  competencia CHAR(7) NOT NULL CHECK (competencia ~ '^[0-9]{4}-[0-9]{2}$'),
  cost_center_id UUID NOT NULL REFERENCES finance_cost_centers(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  headcount INTEGER NOT NULL CHECK (headcount > 0),
  total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents > 0),
  totalization_hash VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  status VARCHAR(48) NOT NULL DEFAULT 'AGUARDANDO_FINANCEIRO' CHECK (
    status IN (
      'RASCUNHO',
      'EM_REVISAO',
      'APROVADO_RH',
      'AGUARDANDO_FINANCEIRO',
      'APROVADO_FINANCEIRO',
      'PENDENTE_INTEGRACAO_BANCARIA',
      'LIQUIDADO',
      'REJEITADO',
      'FALHA'
    )
  ),
  requested_by_user_id UUID NOT NULL REFERENCES users(id),
  approved_by_finance_user_id UUID REFERENCES users(id),
  prepared_by_treasury_user_id UUID REFERENCES users(id),
  reconciled_by_finance_user_id UUID REFERENCES users(id),
  external_provider_name VARCHAR(64),
  external_confirmation_ref VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (batch_type = 'EQUIPE_EVENTO' AND event_id IS NOT NULL)
    OR
    (batch_type = 'FOLHA' AND event_id IS NULL)
    OR
    (batch_type = 'REEMBOLSO_RH')
  ),
  CHECK (
    approved_by_finance_user_id IS NULL OR approved_by_finance_user_id <> requested_by_user_id
  )
);

-- 6. Razão Auxiliar Imutável de Partidas Dobradas (Ledger Financeiro Disk)
CREATE TABLE IF NOT EXISTS finance_ledger_entries (
  id UUID PRIMARY KEY,
  entry_number VARCHAR(64) NOT NULL UNIQUE,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
  rh_batch_id UUID REFERENCES rh_payment_batches(id) ON DELETE RESTRICT,
  entry_type VARCHAR(48) NOT NULL CHECK (
    entry_type IN (
      'VENDA_INGRESSO_BRUTA',
      'RECEITA_TAXA_DISK',
      'OBRIGACAO_PRODUTOR',
      'RESERVA_ESTORNO',
      'REPASSE_PRODUTOR',
      'DESPESA_RH_CORPORATIVA',
      'DESPESA_STAFF_EVENTO',
      'AJUSTE_COMPENSATORIO'
    )
  ),
  debit_account VARCHAR(80) NOT NULL,
  credit_account VARCHAR(80) NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  description_pt_br TEXT NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION forbid_finance_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Lançamentos do Ledger Financeiro (finance_ledger_entries) são imutáveis; utilize lançamento compensatório.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forbid_finance_ledger_mutation ON finance_ledger_entries;
CREATE TRIGGER trg_forbid_finance_ledger_mutation
BEFORE UPDATE OR DELETE ON finance_ledger_entries
FOR EACH ROW EXECUTE FUNCTION forbid_finance_ledger_mutation();

CREATE INDEX IF NOT EXISTS idx_catalog_149_area_grupo ON catalog_149_functions(area, grupo);
CREATE INDEX IF NOT EXISTS idx_rh_payment_batches_status ON rh_payment_batches(status);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_event ON finance_ledger_entries(event_id);
