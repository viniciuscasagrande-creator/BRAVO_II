-- ============================================================================
-- BRAVO_II — Migration 0008: Pacote 09 (Checkout por Pedido com Idempotência,
-- Referência de Sandbox PagBank sem Liquidação/Cartão em Claro,
-- Terminais PDV Bloqueados em Homologação e Turnos de Operadores)
-- Reversibilidade documentada em: 0008_pacote09_checkout_pagbank_sandbox_and_pdv_terminals.down.sql
-- ============================================================================

-- 1. Terminais físicos de PDV (cadastrados sempre como BLOQUEADO_HOMOLOGACAO nesta fase)
CREATE TABLE IF NOT EXISTS p09_pdv_terminals (
  id UUID PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
  label VARCHAR(100) NOT NULL,
  venue VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'BLOQUEADO_HOMOLOGACAO' CHECK (
    status IN ('BLOQUEADO_HOMOLOGACAO', 'ATIVO', 'INATIVO')
  ),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p09_pdv_terminals_status ON p09_pdv_terminals(status);

-- 2. Turnos de operadores de PDV (abertura bloqueada enquanto ENABLE_PDV_OPERATIONS != 'true')
CREATE TABLE IF NOT EXISTS p09_pdv_shifts (
  id UUID PRIMARY KEY,
  terminal_id UUID NOT NULL REFERENCES p09_pdv_terminals(id) ON DELETE RESTRICT,
  operator_id VARCHAR(128) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ABERTO' CHECK (
    status IN ('ABERTO', 'FECHADO')
  ),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_p09_pdv_shifts_terminal_status ON p09_pdv_shifts(terminal_id, status);
CREATE INDEX IF NOT EXISTS idx_p09_pdv_shifts_operator_status ON p09_pdv_shifts(operator_id, status);

-- 3. Vínculo opcional de terminal e turno no pedido do Pacote 08 (para reservas originadas de PDV autenticado)
ALTER TABLE p08_sale_orders
  ADD COLUMN IF NOT EXISTS pdv_terminal_id UUID REFERENCES p09_pdv_terminals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pdv_shift_id UUID REFERENCES p09_pdv_shifts(id) ON DELETE RESTRICT;

-- 4. Tentativas de Checkout (uma tentativa por pedido nesta fase; sem confirmação bancária nem dados de cartão)
CREATE TABLE IF NOT EXISTS p09_checkout_attempts (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL UNIQUE,
  request_hash VARCHAR(64) NOT NULL,
  provider VARCHAR(24) NOT NULL CHECK (provider IN ('PAGBANK', 'REDE')),
  method VARCHAR(24) NOT NULL CHECK (method IN ('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO')),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDENTE_HOMOLOGACAO' CHECK (
    status IN ('PENDENTE_HOMOLOGACAO', 'ENVIANDO_SANDBOX', 'CRIADO_SANDBOX', 'RESULTADO_INDETERMINADO')
  ),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  sandbox_checkout_id VARCHAR(128) UNIQUE,
  last_error VARCHAR(120),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p09_checkout_attempts_order_created ON p09_checkout_attempts(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p09_checkout_attempts_status_created ON p09_checkout_attempts(status, created_at DESC);
