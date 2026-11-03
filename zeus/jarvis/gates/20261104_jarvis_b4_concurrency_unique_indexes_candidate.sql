-- ZEUS/JARVIS B4 · CONCURRENCY GATE CANDIDATE (NOT APPLIED)
-- DO NOT EXECUTE IN PROD without physical backup + restore rehearsal, owner binding and security approval.
-- Existing B4 rows must be audited for duplicate targets/checkpoints before any index is installed.
-- A B4 adapter checks targets/checkpoints in a snapshot. That is NOT atomic under competing workers.
-- These private, scope-bound UNIQUE expression indexes would close that race in PostgreSQL.
-- Expected rollback: keep flags OFF; DROP INDEX only after backup/restore and dependency review.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS b4_memory_event_one_resolution_per_target_uq
 ON zeus_jarvis.b4_memory_event
 (owner_id,company_id,environment,project_id,(event->>'targetId'))
 WHERE (event->>'kind') IN ('CORRECTION','REVOCATION');
CREATE UNIQUE INDEX IF NOT EXISTS b4_memory_event_checkpoint_sequence_uq
 ON zeus_jarvis.b4_memory_event
 (owner_id,company_id,environment,project_id,(event->>'missionId'),(event #>> '{checkpoint,sequence}'))
 WHERE (event->>'kind')='CHECKPOINT';
COMMIT;

-- Gates for promotion:
-- 1) DB reviewer verifies indexes on same PostgreSQL version as PROD.
-- 2) Existing event ledger is backed up and duplicate-free.
-- 3) Multi-session races with different idempotency keys: at most one INSERT can succeed.
-- 4) Retry with same idempotency key returns prior event; other conflicting keys raise 23505.
-- 5) Tenant isolation, query plan, restore and rollback tested outside live App/CRM path.
-- 6) No grants to anon/authenticated and B3/B4 control flags remain locked.
