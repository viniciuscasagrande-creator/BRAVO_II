-- ============================================================================
-- BRAVO_II — Reversão Migration 0009: Pacote 10 (SAC, Pós-Venda, Cancelamentos e Estornos)
-- ============================================================================

DROP TABLE IF EXISTS p10_event_refund_batches;
DROP TABLE IF EXISTS p10_refund_attempts;
DROP TABLE IF EXISTS p10_refund_approvals;
DROP TABLE IF EXISTS p10_refund_requests;
DROP TABLE IF EXISTS p10_cancellation_requests;
DROP TABLE IF EXISTS p10_ticket_replacements;
DROP TABLE IF EXISTS p10_order_change_requests;
DROP TABLE IF EXISTS p10_support_satisfactions;
DROP TABLE IF EXISTS p10_knowledge_articles;
DROP TABLE IF EXISTS p10_support_incidents;
DROP TABLE IF EXISTS p10_support_problems;
DROP TABLE IF EXISTS p10_support_interactions;
DROP TABLE IF EXISTS p10_support_cases;
DROP TABLE IF EXISTS p10_sla_policies;
DROP TABLE IF EXISTS p10_support_queues;
DROP TABLE IF EXISTS p10_support_team_members;
DROP TABLE IF EXISTS p10_support_teams;

ALTER TABLE event_change_cases
  DROP COLUMN IF EXISTS finance_review_status;
