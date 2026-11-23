-- Append-only observation. CP87 tables, jobs and cron are untouched.
CREATE TABLE IF NOT EXISTS zeus_lrn_cp103_observations (
 company_id TEXT NOT NULL CHECK(company_id='fenix'),
 engine_id TEXT NOT NULL CHECK(engine_id='LRN-001'),
 environment TEXT NOT NULL CHECK(environment='PREPROD'),
 version TEXT NOT NULL CHECK(version='0.6.0'),
 lock_key TEXT NOT NULL CHECK(length(lock_key)=64 AND lock_key NOT GLOB '*[^0-9a-f]*'),
 source_commit TEXT NOT NULL CHECK(length(source_commit)=40),
 source_blob TEXT NOT NULL CHECK(length(source_blob)=40),
 source_sha256 TEXT NOT NULL CHECK(length(source_sha256)=64),
 source_run_id TEXT NOT NULL,
 source_job_id TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 execution_state TEXT NOT NULL CHECK(execution_state='COMPLETED'),
 health_state TEXT NOT NULL CHECK(health_state='GREEN_AT_OBSERVATION'),
 autonomy_state TEXT NOT NULL CHECK(autonomy_state='PREPROD_POLICY_ONLY'),
 promotion_allowed INTEGER NOT NULL DEFAULT 0 CHECK(promotion_allowed=0),
 additional_cost_eur REAL NOT NULL DEFAULT 0 CHECK(additional_cost_eur=0),
 PRIMARY KEY (company_id,engine_id,environment,lock_key)
);

CREATE TABLE IF NOT EXISTS zeus_lrn_cp103_cursor (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='fenix:LRN-001:PREPROD:daily'),
 position INTEGER NOT NULL CHECK(position>=0)
);
INSERT INTO zeus_lrn_cp103_cursor VALUES ('fenix:LRN-001:PREPROD:daily',0)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS zeus_lrn_cp103_provenance (
 lock_key TEXT PRIMARY KEY NOT NULL CHECK(length(lock_key)=64 AND lock_key NOT GLOB '*[^0-9a-f]*'),
 manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_extract(manifest,'$.lock_key')=lock_key)
);
