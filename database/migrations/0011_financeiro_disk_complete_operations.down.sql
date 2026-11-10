DROP INDEX IF EXISTS idx_governance_5w2h_status;
DROP INDEX IF EXISTS idx_governance_risks_status;
DROP INDEX IF EXISTS idx_finance_reconciliations_status;
DROP INDEX IF EXISTS idx_finance_op_records_screen;
DROP INDEX IF EXISTS idx_finance_closings_created;
DROP INDEX IF EXISTS idx_finance_suppliers_type;
DROP INDEX IF EXISTS idx_finance_bank_accounts_owner;
DROP INDEX IF EXISTS idx_finance_payout_requests_type_status;

DROP TABLE IF EXISTS finance_configurable_params;
DROP TABLE IF EXISTS governance_action_plans_5w2h;
DROP TABLE IF EXISTS governance_risks;
DROP TABLE IF EXISTS finance_gateway_reconciliations;
DROP TABLE IF EXISTS finance_gateway_mdr_rules;
DROP TABLE IF EXISTS finance_operational_records;
DROP TABLE IF EXISTS finance_event_closings;
DROP TABLE IF EXISTS finance_suppliers_and_payables;
DROP TABLE IF EXISTS finance_bank_accounts;
DROP TABLE IF EXISTS finance_payout_requests;

ALTER TABLE ticket_credentials DROP COLUMN IF EXISTS issued_ticket_id;
ALTER TABLE p08_sale_orders
  DROP COLUMN IF EXISTS fee_snapshot_id,
  DROP COLUMN IF EXISTS producer_net_cents,
  DROP COLUMN IF EXISTS gateway_fee_cents,
  DROP COLUMN IF EXISTS disk_fee_cents;

ALTER TABLE events DROP COLUMN IF EXISTS advance_release_limit_bps;

DROP INDEX IF EXISTS idx_finance_ledger_producer;
DROP INDEX IF EXISTS idx_finance_ledger_batch;
ALTER TABLE finance_ledger_entries
  DROP COLUMN IF EXISTS refund_id,
  DROP COLUMN IF EXISTS order_id,
  DROP COLUMN IF EXISTS reverses_entry_id,
  DROP COLUMN IF EXISTS journal_batch_id;

DROP TABLE IF EXISTS finance_chart_of_accounts;
