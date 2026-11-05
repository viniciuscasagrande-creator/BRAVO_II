-- ============================================================================
-- BRAVO_II — Migration 0003: Clientes PF, Inventário/Assentos, Holds, Cupons/Cortesias,
-- PDV/Caixa, Pedidos, Pagamentos Sandbox, Ingressos (8 Dígitos + QR Independente),
-- Entrega com Retry e Check-in de Portaria
-- Reversibilidade documentada em: 0003_sales_tickets_pos_gate_coupons.down.sql
-- ============================================================================

-- 1. Clientes Pessoa Física (CRM-B2C) com proteção de PII e consentimento separado
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  cpf_hash VARCHAR(128) NOT NULL UNIQUE,
  cpf_masked VARCHAR(24) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(48) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  source_system VARCHAR(64) NOT NULL DEFAULT 'BRAVO_II',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Assentos Numerados e Reservas Temporárias de Inventário (INV)
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE CASCADE,
  seat_code VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')
  ),
  active_hold_id UUID,
  active_ticket_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sector_id, seat_code)
);

CREATE TABLE IF NOT EXISTS inventory_holds (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES seats(id) ON DELETE RESTRICT,
  channel_type VARCHAR(24) NOT NULL CHECK (channel_type IN ('SITE', 'PDV', 'CORTESIA')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'RELEASED')
  ),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Cupons Comerciais e Quotas de Cortesias (CPN)
CREATE TABLE IF NOT EXISTS coupon_campaigns (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES event_sessions(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  discount_type VARCHAR(24) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  percentage_rate NUMERIC(7, 4),
  fixed_amount_cents BIGINT,
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= max_uses),
  status VARCHAR(24) NOT NULL DEFAULT 'ATIVO' CHECK (
    status IN ('RASCUNHO', 'APROVADO', 'ATIVO', 'PAUSADO', 'ENCERRADO', 'EXPIRADO')
  ),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, code)
);

CREATE TABLE IF NOT EXISTS courtesy_quotas (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE CASCADE,
  authorized_quantity INTEGER NOT NULL CHECK (authorized_quantity > 0),
  issued_quantity INTEGER NOT NULL DEFAULT 0 CHECK (
    issued_quantity >= 0 AND issued_quantity <= authorized_quantity
  ),
  status VARCHAR(24) NOT NULL DEFAULT 'AUTORIZADA' CHECK (
    status IN ('SOLICITADA', 'AUTORIZADA', 'REVOGADA')
  ),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Terminais e Sessões de Caixa PDV (POS)
CREATE TABLE IF NOT EXISTS pos_terminals (
  id UUID PRIMARY KEY,
  terminal_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  location_description VARCHAR(255) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_cash_sessions (
  id UUID PRIMARY KEY,
  terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE RESTRICT,
  operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opening_balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (opening_balance_cents >= 0),
  total_sales_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_sales_cents >= 0),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 5. Pedidos, Itens e Pagamentos Sandbox (ORD / PAY)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  channel_type VARCHAR(24) NOT NULL CHECK (channel_type IN ('SITE', 'PDV', 'CORTESIA')),
  pos_cash_session_id UUID REFERENCES pos_cash_sessions(id) ON DELETE RESTRICT,
  hold_id UUID NOT NULL REFERENCES inventory_holds(id) ON DELETE RESTRICT,
  coupon_campaign_id UUID REFERENCES coupon_campaigns(id) ON DELETE RESTRICT,
  status VARCHAR(48) NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO' CHECK (
    status IN (
      'RASCUNHO',
      'RESERVADO',
      'AGUARDANDO_PAGAMENTO',
      'CONFIRMADO',
      'FINALIZADO',
      'EXPIRADO',
      'CANCELAMENTO_SOLICITADO',
      'CANCELADO',
      'PARCIALMENTE_CANCELADO'
    )
  ),
  subtotal_nominal_cents BIGINT NOT NULL CHECK (subtotal_nominal_cents >= 0),
  discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  disk_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (disk_fee_cents >= 0),
  total_charged_cents BIGINT NOT NULL CHECK (total_charged_cents >= 0),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE RESTRICT,
  seat_id UUID REFERENCES seats(id) ON DELETE RESTRICT,
  price_lot_id UUID NOT NULL REFERENCES event_price_lots(id) ON DELETE RESTRICT,
  nominal_price_cents BIGINT NOT NULL CHECK (nominal_price_cents >= 0),
  discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  disk_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (disk_fee_cents >= 0),
  fee_snapshot_id UUID REFERENCES event_fee_snapshots(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES coupon_campaigns(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_applied_cents BIGINT NOT NULL CHECK (discount_applied_cents >= 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, order_id)
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_name VARCHAR(64) NOT NULL DEFAULT 'SANDBOX_GATEWAY',
  payment_method VARCHAR(32) NOT NULL CHECK (
    payment_method IN ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CORTESIA_ZERO')
  ),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'AUTORIZACAO_PENDENTE' CHECK (
    status IN (
      'CRIADO',
      'AUTORIZACAO_PENDENTE',
      'AUTORIZADO',
      'CAPTURADO',
      'LIQUIDACAO_PENDENTE',
      'LIQUIDADO',
      'RECUSADO',
      'CANCELADO',
      'ESTORNO_PENDENTE',
      'ESTORNADO',
      'CONTESTADO'
    )
  ),
  external_reference VARCHAR(128),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_provider_events (
  id UUID PRIMARY KEY,
  provider_name VARCHAR(64) NOT NULL,
  provider_event_id VARCHAR(128) NOT NULL UNIQUE,
  payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  event_type VARCHAR(64) NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT TRUE,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Ingressos (8 Dígitos Públicos + Eixos Separados de Validade/Entrega/Check-in) e Credencial QR Independente (TKT / GATE)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  public_code CHAR(8) NOT NULL UNIQUE CHECK (public_code ~ '^[0-9]{8}$'),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  sector_id UUID NOT NULL REFERENCES event_sectors(id) ON DELETE RESTRICT,
  seat_id UUID REFERENCES seats(id) ON DELETE RESTRICT,
  validity_status VARCHAR(24) NOT NULL DEFAULT 'EMITIDO' CHECK (
    validity_status IN ('RESERVADO', 'EMITIDO', 'BLOQUEADO', 'TROCADO', 'CANCELADO', 'ESTORNADO')
  ),
  delivery_status VARCHAR(24) NOT NULL DEFAULT 'PENDENTE' CHECK (
    delivery_status IN ('PENDENTE', 'ENVIADO', 'FALHA_ENVIO')
  ),
  checkin_status VARCHAR(24) NOT NULL DEFAULT 'NAO_UTILIZADO' CHECK (
    checkin_status IN ('NAO_UTILIZADO', 'VALIDADO')
  ),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_credentials (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  token_version INTEGER NOT NULL DEFAULT 1,
  qr_token VARCHAR(128) NOT NULL UNIQUE,
  signature_hmac VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_deliveries (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  channel VARCHAR(24) NOT NULL DEFAULT 'EMAIL',
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'SENT', 'FAILED_RETRYABLE', 'EXHAUSTED')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_checkins (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE RESTRICT,
  credential_id UUID REFERENCES ticket_credentials(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE RESTRICT,
  gate_device_code VARCHAR(64) NOT NULL,
  operator_user_id UUID REFERENCES users(id),
  outcome VARCHAR(48) NOT NULL CHECK (
    outcome IN (
      'ALLOWED',
      'DENIED_ALREADY_USED',
      'DENIED_INVALID_STATUS',
      'DENIED_INVALID_SIGNATURE',
      'DENIED_PUBLIC_CODE_ONLY'
    )
  ),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seats_sector_status ON seats(sector_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_session_status ON inventory_holds(session_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_public_code ON tickets(public_code);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_credentials_qr ON ticket_credentials(qr_token);
