-- FACT-001 Recovery Runner LAB V0: new dedicated Cloudflare D1 only.
-- No dependencies on Facebook/Instagram/Jarvis/App/CRM. Never apply to existing D1.
CREATE TABLE IF NOT EXISTS fact001_runner_config_v1 (
  id INTEGER PRIMARY KEY CHECK(id=1),
  enabled INTEGER NOT NULL CHECK(enabled IN (0,1)) DEFAULT 0,
  max_jobs_per_tick INTEGER NOT NULL CHECK(max_jobs_per_tick BETWEEN 1 AND 2) DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO fact001_runner_config_v1(id,enabled,max_jobs_per_tick) VALUES(1,0,1);

CREATE TABLE IF NOT EXISTS fact001_runner_jobs_v1 (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment='LAB'),
  version TEXT NOT NULL,
  client_id TEXT NOT NULL CHECK(client_id IN ('chatgpt','cerebro')),
  operation TEXT NOT NULL CHECK(operation='fact001.lab.heartbeat'),
  payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
  state TEXT NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE','BLOCKED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1),
  lease_until_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_fact001_runner_jobs_state_created_v1 ON fact001_runner_jobs_v1(state,created_at);

CREATE TABLE IF NOT EXISTS fact001_runner_ticks_v1 (
  tick_key TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  outcome TEXT NOT NULL CHECK(outcome IN ('EMPTY','COMPLETED','BLOCKED','DISABLED'))
);

-- For future typed recovery operations, schema is separate. No arbitrary JSON jobs,
-- URLs, bearer tokens, SQL bodies, or production commands are accepted.
