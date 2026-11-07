-- JARVIS CUT19 · Candidate migration for NEW, DEDICATED Cloudflare D1 LAB database.
-- Never apply to Fenix App, CRM, existing shared D1, Supabase or Trading.
-- D1 is SQLite; it has NO PostgreSQL RLS. Isolation MUST be enforced by server-only
-- Worker bindings + OWNER_ROOT/B2/B3 policy + scoped SQL. No public D1 API.
-- No default owner enrollment, permissions, grants, credentials or public mutations.
CREATE TABLE IF NOT EXISTS jarvis_lab_mission_v0 (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  engine_id TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment = 'LAB'),
  version TEXT NOT NULL,
  project_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  mission_json TEXT NOT NULL CHECK(json_valid(mission_json) AND length(mission_json) <= 32768),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_id,company_id,environment,idempotency_key)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_mission_scope_v0
  ON jarvis_lab_mission_v0(owner_id,company_id,environment,updated_at);
-- CUT19 rollback rule: do not DROP an initialized live database. Verify export,
-- consumers and independent restore first. This SQL remains a non-deployed candidate.
