// FACT-001: strictly additive D1 EU queue, never touches existing recovery tables.
// Run only after backup/checkpoint and test on a disposable LAB copy.
export const NOTION_QUEUE_LAB_SCHEMA=String.raw`
CREATE TABLE IF NOT EXISTS fact001_notion_queue_config_v1 (
  id INTEGER PRIMARY KEY NOT NULL CHECK(id=1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  provider_writes_enabled INTEGER NOT NULL DEFAULT 0 CHECK(provider_writes_enabled=0),
  max_jobs_per_tick INTEGER NOT NULL DEFAULT 1 CHECK(max_jobs_per_tick=1),
  max_additional_cost_eur INTEGER NOT NULL DEFAULT 0 CHECK(max_additional_cost_eur=0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO fact001_notion_queue_config_v1
(id,enabled,provider_writes_enabled,max_jobs_per_tick,max_additional_cost_eur)
VALUES(1,0,0,1,0) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS fact001_notion_queue_jobs_v1 (
 id TEXT PRIMARY KEY NOT NULL,
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 version TEXT NOT NULL CHECK(version='1.0.0'),
 client_id TEXT NOT NULL CHECK(client_id='cerebro'),
 operation TEXT NOT NULL CHECK(operation='notion.lab.queue.probe'),
 payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
 state TEXT NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','COMPLETED','RECONCILE','BLOCKED')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1),
 lease_until_ms INTEGER,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS fact001_notion_queue_state_v1
 ON fact001_notion_queue_jobs_v1(state,created_at,id);
`;
export const NOTION_QUEUE_CONFIG_DEFAULTS=Object.freeze({enabled:0,provider_writes_enabled:0,max_jobs_per_tick:1,max_additional_cost_eur:0});
