-- FACT001 universal Cloudflare order queue; strictly additive, no existing table/runner altered.
-- One company+LAB allowlist in V0; future companies require separate reviewed policy and tenant binding.
CREATE TABLE IF NOT EXISTS fact001_cf_command_jobs_v1(
 id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 operation TEXT NOT NULL CHECK(operation IN
 ('worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private')),
 resource_name TEXT NOT NULL CHECK(resource_name GLOB 'cerebro-fact001-managed-lab-*' AND length(resource_name) BETWEEN 29 AND 57),
 request_id TEXT NOT NULL UNIQUE,
 idempotency_key TEXT NOT NULL UNIQUE,
 max_cost_eur INTEGER NOT NULL DEFAULT 0 CHECK(max_cost_eur=0),
 submitted_by TEXT NOT NULL CHECK(submitted_by IN ('CEREBRO_SIGNED_OIDC','CHATGPT_OPERATOR','CEREBRO_GATEWAY_VERIFIED')),
 state TEXT NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE','BLOCKED')),
 phase TEXT NOT NULL DEFAULT 'PENDING',
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts IN (0,1)),
 created_at_ms INTEGER NOT NULL,
 started_at_ms INTEGER,
 updated_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_fact001_cf_jobs_state_age_v1 ON fact001_cf_command_jobs_v1(state,created_at_ms);
CREATE TABLE IF NOT EXISTS fact001_cf_owned_workers_v1(
 name TEXT PRIMARY KEY,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 state TEXT NOT NULL CHECK(state IN ('V1','V2','ROLLED_BACK','DELETED')),
 v1_version_id TEXT NOT NULL,
 v2_version_id TEXT,
 current_version_id TEXT,
 created_by_request TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,
 updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fact001_cf_command_events_v1(
 event_id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_id TEXT NOT NULL,
 event TEXT NOT NULL,
 state TEXT NOT NULL,
 phase TEXT NOT NULL,
 error_code TEXT,
 recorded_at_ms INTEGER NOT NULL
);
