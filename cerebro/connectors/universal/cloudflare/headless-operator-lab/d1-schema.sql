-- Additive D1-only logical engine tables. No existing database or table changes.
CREATE TABLE IF NOT EXISTS fact001_cf_d1_jobs_v1(
 id TEXT PRIMARY KEY,company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 operation TEXT NOT NULL CHECK(operation IN ('d1.owned.create','d1.owned.update','d1.owned.rollback','d1.owned.delete')),
 resource_key TEXT NOT NULL CHECK(resource_key GLOB 'fact001-lab-*'),
 request_id TEXT NOT NULL UNIQUE,idempotency_key TEXT NOT NULL UNIQUE,
 max_cost_eur INTEGER NOT NULL CHECK(max_cost_eur=0),
 submitted_by TEXT NOT NULL CHECK(submitted_by IN ('CHATGPT_OPERATOR','CEREBRO_SIGNED_OIDC')),
 state TEXT NOT NULL CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE')),
 phase TEXT NOT NULL DEFAULT 'PENDING',error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts IN (0,1)),
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER
);
CREATE TABLE IF NOT EXISTS fact001_cf_d1_owned_values_v1(
 resource_key TEXT PRIMARY KEY,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 state TEXT NOT NULL CHECK(state IN ('V1','V2','ROLLED_BACK','DELETED')),
 value_tag TEXT NOT NULL CHECK(value_tag IN ('V1','V2','DELETED')),
 created_by_request TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fact001_cf_d1_events_v1(
 event_id INTEGER PRIMARY KEY AUTOINCREMENT,
 job_id TEXT NOT NULL,state TEXT NOT NULL,phase TEXT NOT NULL,
 error_code TEXT,recorded_at_ms INTEGER NOT NULL
);
