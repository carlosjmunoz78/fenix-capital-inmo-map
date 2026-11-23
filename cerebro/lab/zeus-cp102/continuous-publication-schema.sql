-- LAB: append-only authenticated LRN publications, without touching canonical replay cursor.
-- Backup bookmark before migration: 00000f32-00000002-0000512c-877bb47f11f9a94e834435ae69d9f6a5
CREATE TABLE IF NOT EXISTS zeus_lrn_auto_receipts_v1 (
 company_id TEXT NOT NULL CHECK(company_id='fenix'),
 engine_id TEXT NOT NULL CHECK(engine_id='LRN-001'),
 environment TEXT NOT NULL CHECK(environment='PREPROD'),
 run_id TEXT NOT NULL,
 run_attempt INTEGER NOT NULL CHECK(run_attempt>0),
 publisher_job_id TEXT NOT NULL,
 source_head_sha TEXT NOT NULL CHECK(length(source_head_sha)=40),
 state_commit TEXT NOT NULL CHECK(length(state_commit)=40),
 daily_status TEXT NOT NULL CHECK(daily_status IN ('ELIGIBLE','NO_DAILY_RESULT')),
 daily_lock_key TEXT,
 manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_extract(manifest,'$.schema')='zeus-lrn-publication-auto/v1'),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ((daily_status='ELIGIBLE' AND length(daily_lock_key)=64) OR (daily_status='NO_DAILY_RESULT' AND daily_lock_key IS NULL)),
 PRIMARY KEY(company_id,engine_id,environment,run_id,run_attempt)
);
CREATE TABLE IF NOT EXISTS zeus_lrn_auto_daily_v1 (
 company_id TEXT NOT NULL CHECK(company_id='fenix'),
 engine_id TEXT NOT NULL CHECK(engine_id='LRN-001'),
 environment TEXT NOT NULL CHECK(environment='PREPROD'),
 daily_lock_key TEXT NOT NULL CHECK(length(daily_lock_key)=64),
 first_run_id TEXT NOT NULL,
 state_commit TEXT NOT NULL CHECK(length(state_commit)=40),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,engine_id,environment,daily_lock_key)
);
