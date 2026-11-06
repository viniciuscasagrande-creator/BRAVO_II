-- ============================================================================
-- BRAVO_II — Migration 0009: Pacote 10 (SAC Omnicanal, SLA Versionado, ITIL,
-- Base de Conhecimento, CSAT, Pós-Venda / Troca de Sessão, Cancelamentos e
-- Estornos com Dupla Aprovação Financeira Individual sem Conector Externo)
-- Reversibilidade documentada em: 0009_pacote10_sac_pos_venda_estornos.down.sql
-- ============================================================================

-- 0. Evolução de event_change_cases para suportar revisão financeira formal em cancelamento de evento
ALTER TABLE event_change_cases
  ADD COLUMN IF NOT EXISTS finance_review_status VARCHAR(32);

ALTER TABLE event_change_cases DROP CONSTRAINT IF EXISTS event_change_cases_status_check;
ALTER TABLE event_change_cases ADD CONSTRAINT event_change_cases_status_check CHECK (
  status IN ('ABERTO', 'SOLICITADO', 'EM_ANALISE', 'APROVADO', 'CONCLUIDO', 'CANCELADO', 'REPROVADO')
);

-- 1. Equipes, Membros e Filas de Atendimento SAC
CREATE TABLE IF NOT EXISTS p10_support_teams (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS p10_support_team_members (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES p10_support_teams(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_p10_support_team_members_user ON p10_support_team_members(user_id);

CREATE TABLE IF NOT EXISTS p10_support_queues (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  team_id UUID REFERENCES p10_support_teams(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Políticas de SLA Versionadas por Categoria e Prioridade (minutos corridos)
CREATE TABLE IF NOT EXISTS p10_sla_policies (
  id UUID PRIMARY KEY,
  category VARCHAR(48) NOT NULL,
  priority VARCHAR(24) NOT NULL,
  response_minutes INTEGER NOT NULL CHECK (response_minutes > 0 AND response_minutes <= 525600),
  resolution_minutes INTEGER NOT NULL CHECK (resolution_minutes >= response_minutes AND resolution_minutes <= 525600),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, priority, version)
);

-- 3. Chamados SAC e Interações Imutáveis
CREATE TABLE IF NOT EXISTS p10_support_cases (
  id UUID PRIMARY KEY,
  protocol VARCHAR(26) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  queue_id UUID REFERENCES p10_support_queues(id) ON DELETE RESTRICT,
  policy_id UUID REFERENCES p10_sla_policies(id) ON DELETE RESTRICT,
  subject VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(48) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  priority VARCHAR(24) NOT NULL DEFAULT 'NORMAL',
  status VARCHAR(32) NOT NULL DEFAULT 'ABERTO' CHECK (
    status IN ('ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'ESCALADO', 'RESOLVIDO', 'FECHADO')
  ),
  assigned_to VARCHAR(128),
  created_by VARCHAR(128) NOT NULL,
  first_response_due_at TIMESTAMPTZ,
  resolution_due_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_support_cases_status_prio_created ON p10_support_cases(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p10_support_cases_assigned_status ON p10_support_cases(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_p10_support_cases_order ON p10_support_cases(order_id);
CREATE INDEX IF NOT EXISTS idx_p10_support_cases_due_status ON p10_support_cases(resolution_due_at, status);

CREATE TABLE IF NOT EXISTS p10_support_interactions (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES p10_support_cases(id) ON DELETE RESTRICT,
  kind VARCHAR(32) NOT NULL CHECK (kind IN ('NOTA_INTERNA', 'RESPOSTA_CLIENTE', 'SISTEMA')),
  body TEXT NOT NULL,
  author_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_support_interactions_case_created ON p10_support_interactions(case_id, created_at ASC);

-- 4. Problemas, Incidentes ITIL, Base de Conhecimento e CSAT
CREATE TABLE IF NOT EXISTS p10_support_problems (
  id UUID PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  root_cause TEXT,
  workaround TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'INVESTIGACAO' CHECK (
    status IN ('INVESTIGACAO', 'CAUSA_IDENTIFICADA', 'RESOLVIDO')
  ),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS p10_support_incidents (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL UNIQUE REFERENCES p10_support_cases(id) ON DELETE RESTRICT,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4')),
  is_major BOOLEAN NOT NULL DEFAULT FALSE,
  service_name VARCHAR(140) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ABERTO' CHECK (
    status IN ('ABERTO', 'EM_TRATAMENTO', 'MONITORANDO', 'RESOLVIDO')
  ),
  problem_id UUID REFERENCES p10_support_problems(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_support_incidents_major_status ON p10_support_incidents(is_major, status);

CREATE TABLE IF NOT EXISTS p10_knowledge_articles (
  id UUID PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'PUBLICADO')),
  author_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_knowledge_articles_status_cat ON p10_knowledge_articles(status, category);

CREATE TABLE IF NOT EXISTS p10_support_satisfactions (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL UNIQUE REFERENCES p10_support_cases(id) ON DELETE RESTRICT,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Pós-Venda: Solicitações de Troca de Sessão e Substituição Rastreável de Ingressos
CREATE TABLE IF NOT EXISTS p10_order_change_requests (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES p08_issued_tickets(id) ON DELETE RESTRICT,
  target_session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  target_lot_id UUID NOT NULL REFERENCES event_price_lots(id) ON DELETE RESTRICT,
  type VARCHAR(32) NOT NULL DEFAULT 'TROCA_SESSAO',
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SOLICITADA' CHECK (
    status IN (
      'SOLICITADA',
      'EM_ANALISE',
      'APROVADA_OPERACAO',
      'AGUARDANDO_PAGAMENTO',
      'PRONTA_EXECUCAO',
      'EXECUTADA',
      'NEGADA',
      'CANCELADA'
    )
  ),
  version INTEGER NOT NULL DEFAULT 1,
  requested_by VARCHAR(128) NOT NULL,
  reviewed_by VARCHAR(128),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_order_change_requests_order_status ON p10_order_change_requests(order_id, status);
CREATE INDEX IF NOT EXISTS idx_p10_order_change_requests_ticket_status ON p10_order_change_requests(ticket_id, status);

CREATE TABLE IF NOT EXISTS p10_ticket_replacements (
  id UUID PRIMARY KEY,
  change_id UUID NOT NULL UNIQUE REFERENCES p10_order_change_requests(id) ON DELETE RESTRICT,
  old_ticket_id UUID NOT NULL UNIQUE REFERENCES p08_issued_tickets(id) ON DELETE RESTRICT,
  new_ticket_id UUID NOT NULL UNIQUE REFERENCES p08_issued_tickets(id) ON DELETE RESTRICT,
  actor_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Solicitações de Cancelamento (Ingresso, Pedido, Evento)
CREATE TABLE IF NOT EXISTS p10_cancellation_requests (
  id UUID PRIMARY KEY,
  type VARCHAR(24) NOT NULL CHECK (type IN ('INGRESSO', 'PEDIDO', 'EVENTO')),
  order_id UUID REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  ticket_id UUID REFERENCES p08_issued_tickets(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SOLICITADO' CHECK (
    status IN ('SOLICITADO', 'EM_ANALISE', 'APROVADO_OPERACAO', 'NEGADO')
  ),
  requested_by VARCHAR(128) NOT NULL,
  reviewed_by VARCHAR(128),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_cancellation_requests_order_status ON p10_cancellation_requests(order_id, status);
CREATE INDEX IF NOT EXISTS idx_p10_cancellation_requests_event_status ON p10_cancellation_requests(event_id, status);

-- 7. Solicitações de Estorno, Dupla Aprovação Financeira Individual, Tentativas e Planejamento em Lote
CREATE TABLE IF NOT EXISTS p10_refund_requests (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  cancellation_id UUID REFERENCES p10_cancellation_requests(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL UNIQUE,
  request_hash VARCHAR(64) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason TEXT NOT NULL,
  provider VARCHAR(64) NOT NULL,
  provider_ref VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SOLICITADO' CHECK (
    status IN (
      'SOLICITADO',
      'EM_ANALISE',
      'APROVADO_1',
      'APROVADO_2',
      'AGUARDANDO_CONECTOR',
      'PROCESSANDO',
      'CONCLUIDO',
      'NEGADO',
      'FALHOU'
    )
  ),
  version INTEGER NOT NULL DEFAULT 1,
  requested_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_refund_requests_order_status ON p10_refund_requests(order_id, status);
CREATE INDEX IF NOT EXISTS idx_p10_refund_requests_status_created ON p10_refund_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS p10_refund_approvals (
  id UUID PRIMARY KEY,
  refund_id UUID NOT NULL REFERENCES p10_refund_requests(id) ON DELETE RESTRICT,
  step INTEGER NOT NULL CHECK (step IN (1, 2)),
  actor_id VARCHAR(128) NOT NULL,
  decision VARCHAR(24) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (refund_id, step)
);

CREATE INDEX IF NOT EXISTS idx_p10_refund_approvals_actor_created ON p10_refund_approvals(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS p10_refund_attempts (
  id UUID PRIMARY KEY,
  refund_id UUID NOT NULL REFERENCES p10_refund_requests(id) ON DELETE RESTRICT,
  provider VARCHAR(64) NOT NULL,
  provider_ref VARCHAR(128),
  request_key VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'NAO_ENVIADO',
  evidence_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_p10_refund_attempts_refund_status ON p10_refund_attempts(refund_id, status);

CREATE TABLE IF NOT EXISTS p10_event_refund_batches (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  event_case_id UUID NOT NULL REFERENCES event_change_cases(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'PLANEJADO',
  eligible_orders INTEGER NOT NULL CHECK (eligible_orders >= 0),
  planned_value_cents BIGINT NOT NULL CHECK (planned_value_cents >= 0),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p10_event_refund_batches_event_created ON p10_event_refund_batches(event_id, created_at DESC);
