-- ============================================================================
-- BRAVO_II — Migration 0007: Pacote 08 (Central de Clientes PF com CPF HMAC-SHA256,
-- Pedidos e Reservas Atômicas por Lote com Idempotência e Expiração,
-- Sequência Global de Ingressos de 8 Dígitos e Recibo Assinado de Liquidação)
-- Reversibilidade documentada em: 0007_pacote08_customers_orders_reservations_tickets.down.sql
-- ============================================================================

-- 1. Evolução da tabela canônica customers para suportar fingerprint HMAC-SHA256 (CPF nunca em texto claro)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS cpf_fingerprint VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS cpf_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS address_json JSONB,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_fullname_lower ON customers (LOWER(full_name));

-- 2. Evolução de event_price_lots para controle atômico de estoque reservado e emitido no PostgreSQL
ALTER TABLE event_price_lots
  ADD COLUMN IF NOT EXISTS reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  ADD COLUMN IF NOT EXISTS issued_count INTEGER NOT NULL DEFAULT 0 CHECK (issued_count >= 0);

ALTER TABLE event_price_lots DROP CONSTRAINT IF EXISTS chk_event_price_lots_inventory_bounds;
ALTER TABLE event_price_lots ADD CONSTRAINT chk_event_price_lots_inventory_bounds CHECK (
  reserved_count >= 0 AND issued_count >= 0 AND (reserved_count + issued_count) <= max_quantity
);

ALTER TABLE event_price_lots DROP CONSTRAINT IF EXISTS event_price_lots_status_check;
ALTER TABLE event_price_lots ADD CONSTRAINT event_price_lots_status_check CHECK (
  status IN ('DRAFT', 'RASCUNHO', 'ACTIVE', 'ATIVO', 'PAUSED', 'SOLD_OUT', 'ENDED')
);

ALTER TABLE event_sessions DROP CONSTRAINT IF EXISTS event_sessions_status_check;
ALTER TABLE event_sessions ADD CONSTRAINT event_sessions_status_check CHECK (
  status IN ('SCHEDULED', 'RASCUNHO', 'ON_SALE', 'ATIVA', 'PAUSED', 'CLOSED', 'POSTPONED', 'CANCELLED')
);

-- 3. Pedidos e Reservas do Pacote 08 (isolados de liquidação financeira direta sem recibo assinado)
CREATE TABLE IF NOT EXISTS p08_sale_orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  lot_id UUID NOT NULL REFERENCES event_price_lots(id) ON DELETE RESTRICT,
  channel VARCHAR(24) NOT NULL CHECK (channel IN ('ONLINE', 'PDV', 'BILHETERIA')),
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  unit_cents INTEGER NOT NULL CHECK (unit_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status VARCHAR(24) NOT NULL DEFAULT 'RESERVADO' CHECK (
    status IN ('RESERVADO', 'EXPIRADO', 'CANCELADO', 'PAGO')
  ),
  idempotency_key UUID NOT NULL UNIQUE,
  request_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_p08_sale_orders_status_expires ON p08_sale_orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_p08_sale_orders_customer_created ON p08_sale_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p08_sale_orders_event_created ON p08_sale_orders(event_id, created_at DESC);

-- 4. Sequência global de 8 dígitos numéricos (00000001..99999999) e Ingressos Emitidos
CREATE TABLE IF NOT EXISTS p08_ticket_sequences (
  id INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0 AND last_number <= 99999999)
);

INSERT INTO p08_ticket_sequences (id, last_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS p08_issued_tickets (
  id UUID PRIMARY KEY,
  number CHAR(8) NOT NULL UNIQUE CHECK (number ~ '^[0-9]{8}$'),
  order_id UUID NOT NULL REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  lot_id UUID NOT NULL REFERENCES event_price_lots(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'EMITIDO' CHECK (
    status IN ('EMITIDO', 'BLOQUEADO', 'TROCADO', 'CANCELADO', 'ESTORNADO')
  ),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p08_issued_tickets_order ON p08_issued_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_p08_issued_tickets_event_session ON p08_issued_tickets(event_id, session_id, status);

-- 5. Recibo de liquidação verificado pelo futuro adaptador interno de adquirente
CREATE TABLE IF NOT EXISTS p08_payment_confirmations (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES p08_sale_orders(id) ON DELETE RESTRICT,
  provider VARCHAR(64) NOT NULL,
  provider_ref VARCHAR(128) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  evidence_hash VARCHAR(64) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_ref)
);
