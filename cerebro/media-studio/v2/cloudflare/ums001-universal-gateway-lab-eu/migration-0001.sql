-- Dedicated LAB EU D1 ONLY. No existing D1 is modified.
CREATE TABLE IF NOT EXISTS media_issuers (
 key_id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 environment TEXT NOT NULL CHECK(environment='LAB'),
 origin_engine_id TEXT NOT NULL,
 public_spki_base64 TEXT NOT NULL,
 public_spki_sha256 TEXT NOT NULL,
 allowed_channels TEXT NOT NULL,
 allowed_kinds TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS media_issuer_scope ON media_issuers(company_id,environment,origin_engine_id,key_id);
CREATE TABLE IF NOT EXISTS media_nonces (
 key_id TEXT NOT NULL,
 nonce TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(key_id,nonce)
);
CREATE TABLE IF NOT EXISTS media_jobs (
 idempotency_key TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 origin_engine_id TEXT NOT NULL,
 consumer_engine_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 channel_id TEXT NOT NULL,
 asset_kind TEXT NOT NULL,
 request_sha256 TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('REGISTERED_QA_PENDING','HELD','FAILED','DELIVERED')),
 created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS media_jobs_unique_request ON media_jobs(company_id,environment,origin_engine_id,request_id,consumer_engine_id,item_id);
CREATE TABLE IF NOT EXISTS media_events (
 event_id TEXT PRIMARY KEY,
 idempotency_key TEXT NOT NULL REFERENCES media_jobs(idempotency_key),
 event_type TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_events_job ON media_events(idempotency_key);
CREATE TABLE IF NOT EXISTS media_rejections (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code TEXT NOT NULL,
 created_at TEXT NOT NULL
);
