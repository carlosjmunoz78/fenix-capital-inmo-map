-- CP106 independent LAB evidence table; canonical daily ZEUS cursor and data stay untouched.
CREATE TABLE IF NOT EXISTS zeus_lrn_publications_cp106_lab (
 company_id TEXT NOT NULL CHECK(company_id='fenix'),
 engine_id TEXT NOT NULL CHECK(engine_id='LRN-001'),
 environment TEXT NOT NULL CHECK(environment='PREPROD'),
 run_id TEXT NOT NULL,
 run_attempt INTEGER NOT NULL CHECK(run_attempt>0),
 job_id TEXT NOT NULL,
 state_commit TEXT NOT NULL CHECK(length(state_commit)=40),
 daily_result TEXT NOT NULL CHECK(daily_result='NO_DAILY_RESULT'),
 manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_extract(manifest,'$.runId')=CAST(run_id AS INTEGER)),
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,engine_id,environment,run_id,run_attempt)
);
