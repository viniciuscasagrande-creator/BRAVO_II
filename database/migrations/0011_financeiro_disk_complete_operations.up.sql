-- ============================================================================
-- BRAVO_II — Migration 0011: Consolidação Canônica do Financeiro Disk, Plano de Contas,
-- Evolução do Ledger Único (finance_ledger_entries), Conciliação de Gateway,
-- Repasses com Segregação (Maker-Checker), Matriz de Riscos (P x I), Plano 5W2H
-- e Parâmetros Configuráveis.
-- Nenhuma tabela paralela de produtores/eventos/pedidos/ingressos/usuários é criada.
-- Nenhuma movimentação financeira real externa é executada em homologação.
-- ============================================================================

-- 1. Plano de Contas Relacional Canônico (finance_chart_of_accounts)
CREATE TABLE IF NOT EXISTS finance_chart_of_accounts (
  code VARCHAR(32) PRIMARY KEY,
  name_pt_br VARCHAR(160) NOT NULL,
  nature VARCHAR(16) NOT NULL CHECK (nature IN ('ATIVO', 'PASSIVO', 'RECEITA', 'DESPESA')),
  parent_code VARCHAR(32) REFERENCES finance_chart_of_accounts(code) ON DELETE RESTRICT,
  accepts_entries BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO finance_chart_of_accounts (code, name_pt_br, nature, parent_code, accepts_entries) VALUES
  ('1', 'ATIVO', 'ATIVO', NULL, FALSE),
  ('1.1.01', 'Banco – conta principal', 'ATIVO', '1', TRUE),
  ('1.1.02', 'Recebíveis do gateway', 'ATIVO', '1', TRUE),
  ('2', 'PASSIVO', 'PASSIVO', NULL, FALSE),
  ('2.1.01', 'Repasses a produtores', 'PASSIVO', '2', TRUE),
  ('3', 'RECEITAS', 'RECEITA', NULL, FALSE),
  ('3.1.01', 'Comissão sobre ingressos (Taxa Disk por Evento)', 'RECEITA', '3', TRUE),
  ('3.1.02', 'Spread de taxas', 'RECEITA', '3', TRUE),
  ('4', 'DESPESAS', 'DESPESA', NULL, FALSE),
  ('4.1.01', 'Taxas de gateway e adquirência (MDR)', 'DESPESA', '4', TRUE),
  ('4.1.02', 'Despesas operacionais de eventos e RH', 'DESPESA', '4', TRUE),
  ('4.1.03', 'Estornos e chargebacks', 'DESPESA', '4', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. Evolução do Ledger Único (finance_ledger_entries) para Lotes Balanceados, Estorno Compensatório e Rastreabilidade
ALTER TABLE finance_ledger_entries
  ADD COLUMN IF NOT EXISTS journal_batch_id UUID,
  ADD COLUMN IF NOT EXISTS reverses_entry_id UUID UNIQUE REFERENCES finance_ledger_entries(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES p10_refund_requests(id) ON DELETE RESTRICT;

ALTER TABLE finance_ledger_entries DROP CONSTRAINT IF EXISTS finance_ledger_entries_entry_type_check;
ALTER TABLE finance_ledger_entries ADD CONSTRAINT finance_ledger_entries_entry_type_check CHECK (
  entry_type IN (
    'VENDA_INGRESSO_BRUTA',
    'RECEITA_TAXA_DISK',
    'OBRIGACAO_PRODUTOR',
    'RESERVA_ESTORNO',
    'REPASSE_PRODUTOR',
    'DESPESA_RH_CORPORATIVA',
    'DESPESA_STAFF_EVENTO',
    'AJUSTE_COMPENSATORIO',
    'TAXA_GATEWAY_MDR',
    'AJUSTE_CONCILIACAO_TAXA',
    'ESTORNO_APROVADO',
    'ESTORNO_LANCAMENTO'
  )
);

CREATE INDEX IF NOT EXISTS idx_finance_ledger_batch ON finance_ledger_entries(journal_batch_id);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_producer ON finance_ledger_entries(producer_id);

-- 3. Limite Contratual de Liberação Antecipada por Evento (Sem comissão global fixa)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS advance_release_limit_bps INTEGER NOT NULL DEFAULT 0 CHECK (
    advance_release_limit_bps >= 0 AND advance_release_limit_bps <= 10000
  );

-- 4. Ponte Canônica de Pedidos e Ingressos (p08_sale_orders / p08_issued_tickets <-> snapshots e credenciais QR)
ALTER TABLE p08_sale_orders
  ADD COLUMN IF NOT EXISTS disk_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (disk_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS gateway_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (gateway_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS producer_net_cents INTEGER NOT NULL DEFAULT 0 CHECK (producer_net_cents >= 0),
  ADD COLUMN IF NOT EXISTS fee_snapshot_id UUID REFERENCES event_fee_snapshots(id) ON DELETE RESTRICT;

ALTER TABLE ticket_credentials
  ADD COLUMN IF NOT EXISTS issued_ticket_id UUID REFERENCES p08_issued_tickets(id) ON DELETE CASCADE;

-- 5. Solicitações de Repasse, Antecipação e Transferência com Segregação (Maker-Checker)
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
  requested_by_user_id UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  ledger_entry_id UUID REFERENCES finance_ledger_entries(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payout_maker_checker CHECK (
    approved_by IS NULL OR requested_by_user_id IS NULL OR approved_by <> requested_by_user_id
  )
);

-- 6. Contas Bancárias, Fornecedores/Contas a Pagar, Fechamentos/Borderôs e Registros Operacionais
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

-- 7. Catálogo de Regras MDR por Adquirente e Conciliação de Extrato de Gateway (Fase 4)
CREATE TABLE IF NOT EXISTS finance_gateway_mdr_rules (
  id UUID PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  brand VARCHAR(64) NOT NULL DEFAULT 'TODAS',
  installments_min INTEGER NOT NULL DEFAULT 1 CHECK (installments_min >= 1),
  installments_max INTEGER NOT NULL DEFAULT 1 CHECK (installments_max >= installments_min),
  mdr_bps INTEGER NOT NULL CHECK (mdr_bps >= 0 AND mdr_bps <= 10000),
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_gateway_reconciliations (
  id UUID PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  external_tx_id VARCHAR(128) NOT NULL,
  order_id UUID REFERENCES p08_sale_orders(id) ON DELETE SET NULL,
  ledger_entry_id UUID REFERENCES finance_ledger_entries(id) ON DELETE SET NULL,
  gross_cents BIGINT NOT NULL,
  gateway_fee_cents BIGINT NOT NULL,
  net_cents BIGINT NOT NULL,
  expected_gross_cents BIGINT NOT NULL DEFAULT 0,
  expected_fee_cents BIGINT NOT NULL DEFAULT 0,
  diff_gross_cents BIGINT NOT NULL DEFAULT 0,
  diff_fee_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL CHECK (
    status IN ('CONCILIADA', 'DIVERGENTE', 'SEM_GATEWAY', 'SEM_LANCAMENTO', 'AJUSTADA')
  ),
  adjustment_ledger_entry_id UUID REFERENCES finance_ledger_entries(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_tx_id)
);

-- 8. Matriz de Riscos e Compliance (Probabilidade x Impacto) e Plano de Ação 5W2H (Fases 1 e 5)
CREATE TABLE IF NOT EXISTS governance_risks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(48) NOT NULL CHECK (
    category IN ('Financeiro', 'Fraude', 'Operacional', 'Compliance')
  ),
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  level INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  control_description TEXT,
  owner_user_id UUID REFERENCES users(id),
  owner_name VARCHAR(160) NOT NULL DEFAULT 'Diretoria / Governança',
  status VARCHAR(24) NOT NULL DEFAULT 'Aberto' CHECK (
    status IN ('Aberto', 'Mitigado', 'Aceito')
  ),
  reviewed_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_action_plans_5w2h (
  id UUID PRIMARY KEY,
  plan_code VARCHAR(64) NOT NULL,
  priority VARCHAR(24) NOT NULL DEFAULT 'Alta',
  what_text TEXT NOT NULL,
  why_text TEXT,
  who_user_id UUID REFERENCES users(id),
  who_name VARCHAR(160) NOT NULL DEFAULT 'Equipe Financeiro Disk',
  area_name VARCHAR(64) NOT NULL DEFAULT 'FINANCEIRO',
  where_text VARCHAR(160) DEFAULT 'ERP BRAVO_II',
  start_date DATE DEFAULT CURRENT_DATE,
  deadline_days INTEGER DEFAULT 15,
  planned_end_date DATE,
  actual_end_date DATE,
  how_text TEXT,
  how_much_cents BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'Não iniciado' CHECK (
    status IN ('Não iniciado', 'Em andamento', 'Concluído', 'Atrasado')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Parâmetros Financeiros Configuráveis (12 Perguntas Abertas — sem hardcode no código)
CREATE TABLE IF NOT EXISTS finance_configurable_params (
  param_key VARCHAR(80) PRIMARY KEY,
  param_value TEXT NOT NULL,
  description_pt_br TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO finance_configurable_params (param_key, param_value, description_pt_br) VALUES
  ('DIVISAO_TAXA_PADRAO_BPS', 'POR_EVENTO_CONTRATUAL', 'Pergunta 1: Taxa Disk negociada individualmente por evento (event_fee_agreements)'),
  ('PAGADOR_TAXA_GATEWAY_PADRAO', 'PRODUCER_OR_DISK_BY_EVENT', 'Pergunta 2: Responsável pelo custo de MDR configurável por acordo do evento'),
  ('ALCADA_NEGOCIACAO_TAXAS', 'FINANCEIRO_DISK,COMERCIAL_DISK,ADMIN_SUPER', 'Pergunta 3: Perfis autorizados a propor e aprovar taxas (maker-checker)'),
  ('LIMITE_ANTECIPACAO_PADRAO_BPS', '0', 'Pergunta 4: Limite padrão de antecipação pré-evento (events.advance_release_limit_bps)'),
  ('MAX_PARCELAS_PADRAO_EVENTO', '12', 'Pergunta 5: Limite máximo padrão de parcelas habilitadas por evento'),
  ('METODOS_ATIVOS_PADRAO_EVENTO', 'PIX,CREDIT_CARD,DEBIT_CARD', 'Pergunta 6: Métodos ativos por padrão na abertura do evento'),
  ('MODO_EMISSAO_NOTA_FISCAL', 'SISTEMA_CONTABIL_EXTERNO', 'Pergunta 7: Emissão de NF via integração com sistema contábil externo'),
  ('GATEWAY_PAGAMENTO_PADRAO', 'PAGBANK_SANDBOX', 'Pergunta 8: Provedor de gateway homologado para conciliação e checkout'),
  ('PRAZO_RESERVA_CHECKOUT_MINUTOS', '15', 'Pergunta 9: Prazo de expiração de reserva de ingresso no checkout (minutos)'),
  ('RESPONSAVEL_CUSTO_ESTORNO_PADRAO', 'CONFORME_CONTRATO_EVENTO', 'Pergunta 10: Alocação contábil de estorno conforme contrato do evento'),
  ('SLA_PADRAO_SAC_SUPORTE_ESTORNO_HORAS', 'CONFIGURADO_EM_P10_SLA_POLICIES', 'Pergunta 11: Prazos de resposta/resolução governados por p10_sla_policies'),
  ('PERIODICIDADE_REVISAO_RISCOS_DIAS', '90', 'Pergunta 12: Periodicidade máxima em dias para revisão da matriz de riscos')
ON CONFLICT (param_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_finance_payout_requests_type_status ON finance_payout_requests(request_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_bank_accounts_owner ON finance_bank_accounts(owner_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_suppliers_type ON finance_suppliers_and_payables(record_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_closings_created ON finance_event_closings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_op_records_screen ON finance_operational_records(screen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliations_status ON finance_gateway_reconciliations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_risks_status ON governance_risks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_5w2h_status ON governance_action_plans_5w2h(status, area_name);
