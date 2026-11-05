-- ============================================================================
-- BRAVO_II — Rollback Migration 0001: Fundação Greenfield do Core
-- ============================================================================

DROP TRIGGER IF EXISTS trg_forbid_audit_records_mutation ON audit_records;
DROP FUNCTION IF EXISTS forbid_audit_records_mutation();

DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS audit_records;
DROP TABLE IF EXISTS refund_requests;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS user_event_scopes;
DROP TABLE IF EXISTS user_producer_scopes;
DROP TABLE IF EXISTS event_fee_agreements;
DROP TABLE IF EXISTS event_producers;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS producers;
DROP TABLE IF EXISTS user_role_grants;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
