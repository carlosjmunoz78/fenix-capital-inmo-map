-- FACT-001 P0-B: additive, non-deployed proposal for pre-existing Cloudflare EU LAB D1.
-- NEVER run in PROD. Existing six historical jobs/events are immutable; do not backfill.
-- Requires snapshot, grants review, old/new tests, rollback approval before applying.
CREATE TABLE IF NOT EXISTS fact001_provider_receipts_lab_v0 (
  receipt_id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL UNIQUE REFERENCES fact001_cf_command_jobs_v1(id),
  request_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
  engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
  environment TEXT NOT NULL CHECK(environment='LAB'),
  version TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN
    ('worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private')),
  resource_name TEXT NOT NULL CHECK(resource_name GLOB 'cerebro-fact001-managed-lab-*'),
  policy_version TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider='CLOUDFLARE_WORKERS'),
  provider_version_id TEXT,
  message_digest TEXT NOT NULL CHECK(length(message_digest)=64),
  readback_status TEXT NOT NULL CHECK(readback_status='READBACK_MATCHED_UNATTESTED'),
  source TEXT NOT NULL CHECK(source='FACT001_RUNNER_LAB'),
  signed_runtime_receipt_verified INTEGER NOT NULL DEFAULT 0 CHECK(signed_runtime_receipt_verified=0),
  prod_promotion_allowed INTEGER NOT NULL DEFAULT 0 CHECK(prod_promotion_allowed=0),
  observed_at_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fact001_receipts_observed_lab_v0
 ON fact001_provider_receipts_lab_v0(observed_at_ms);
-- Append-only protection. A new migration would be needed to add signing later;
-- a string digest here does NOT authenticate an executor or provider.
CREATE TRIGGER IF NOT EXISTS fact001_receipts_lab_no_update_v0
 BEFORE UPDATE ON fact001_provider_receipts_lab_v0
 BEGIN SELECT RAISE(ABORT, 'FACT001_RECEIPT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS fact001_receipts_lab_no_delete_v0
 BEFORE DELETE ON fact001_provider_receipts_lab_v0
 BEGIN SELECT RAISE(ABORT, 'FACT001_RECEIPT_IMMUTABLE'); END;
-- Rollback only after verifying empty or full export and no active readers:
-- DROP TRIGGER fact001_receipts_lab_no_update_v0;
-- DROP TRIGGER fact001_receipts_lab_no_delete_v0;
-- DROP INDEX idx_fact001_receipts_observed_lab_v0;
-- DROP TABLE fact001_provider_receipts_lab_v0;
