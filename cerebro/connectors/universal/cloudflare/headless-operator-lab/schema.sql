-- Exclusive FACT001 Cloudflare headless operator LAB table; existing Recovery D1 UUID remains unchanged.
CREATE TABLE IF NOT EXISTS fact001_cf_headless_worker_jobs_v1(
 id TEXT PRIMARY KEY CHECK(id='FACT001-CF-HEADLESS-CRON-E2E-20261111-001'),
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 operation TEXT NOT NULL CHECK(operation='cloudflare.worker.headless_lifecycle_lab'),
 state TEXT NOT NULL CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE','BLOCKED')),
 phase TEXT NOT NULL DEFAULT 'PREPARED',
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts IN (0,1)),
 started_at_ms INTEGER,
 updated_at_ms INTEGER
);
INSERT INTO fact001_cf_headless_worker_jobs_v1(id,company_id,engine_id,environment,version,operation,state,phase)
 VALUES('FACT001-CF-HEADLESS-CRON-E2E-20261111-001','fenix-capital','FACT-001','LAB','1.0.0',
 'cloudflare.worker.headless_lifecycle_lab','QUEUED','PREPARED')
 ON CONFLICT(id) DO NOTHING;
