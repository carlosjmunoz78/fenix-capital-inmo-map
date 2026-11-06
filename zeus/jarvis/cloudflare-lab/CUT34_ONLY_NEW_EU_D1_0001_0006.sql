-- CEREBRO OS / JARVIS CUT34 -- dedicated EU-jurisdiction D1 ONLY.
-- DB ID: 968e86d4-617c-4539-adde-541edc9ec215
-- NEVER execute on any other database. Export baseline and verify empty first.
-- Idempotent additive CREATE only. No default rows, real identities, grants or credentials.

-- FILE 0001_jarvis_d1_mission_lab.sql
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

-- FILE 0002_jarvis_d1_session_lab.sql
-- CUT22 · Additive session registry candidate for NEW dedicated D1 LAB only.
-- NOT for shared D1 or any App/CRM database. No real users, credentials,
-- tokens, device identifiers or session records are inserted by this migration.
-- Unlike PostgreSQL, D1 has NO RLS: mandatory trusted Worker B2/B3 perimeter.
CREATE TABLE IF NOT EXISTS jarvis_lab_session_binding_v0 (
  owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 200),
  session_hmac TEXT NOT NULL CHECK(length(session_hmac)=64 AND session_hmac NOT GLOB '*[^0-9a-f]*'),
  environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
  channel TEXT NOT NULL CHECK(length(channel) BETWEEN 2 AND 80),
  role TEXT NOT NULL CHECK(role='OWNER_ROOT'),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
  revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
  authorized_companies_json TEXT NOT NULL
    CHECK(json_valid(authorized_companies_json) AND json_type(authorized_companies_json)='array'
       AND json_array_length(authorized_companies_json) BETWEEN 1 AND 50),
  expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>0),
  issued_at_ms INTEGER NOT NULL CHECK(issued_at_ms>0),
  PRIMARY KEY (owner_id,session_hmac,environment)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_session_active_lookup_v0
 ON jarvis_lab_session_binding_v0(owner_id,environment,expires_at_ms)
 WHERE active=1 AND revoked=0;
-- No mutation API, HTTP routes or service bindings are created here.
-- Enrollment and revocation must be performed only by separate trusted
-- server-side administrative workflow with audit and HUMAN_REQUIRED gates.

-- FILE 0003_jarvis_d1_b3_readonly_audit_lab.sql
-- CUT24 · B3 read-only grants and append-only audit (LAB only).
-- Additive to NEW dedicated EU-jurisdiction D1 ONLY after verified remote backup.
-- No grants, controls, users, tokens or permissions are enrolled by migration.
-- D1 DOES NOT HAVE PostgreSQL RLS; private Worker binding and B2/B3 remain mandatory.
CREATE TABLE IF NOT EXISTS jarvis_lab_b3_control_v0 (
 company_id TEXT NOT NULL CHECK(length(company_id) BETWEEN 1 AND 100),
 environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 kill_switch INTEGER NOT NULL DEFAULT 1 CHECK(kill_switch IN (0,1)),
 PRIMARY KEY(company_id,environment)
);
CREATE TABLE IF NOT EXISTS jarvis_lab_b3_read_grant_v0 (
 grant_id TEXT NOT NULL PRIMARY KEY CHECK(length(grant_id) BETWEEN 1 AND 100),
 owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 100),
 company_id TEXT NOT NULL CHECK(length(company_id) BETWEEN 1 AND 100),
 environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 action_name TEXT NOT NULL DEFAULT 'MISSION_INSPECT' CHECK(action_name='MISSION_INSPECT'),
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
 max_cost INTEGER NOT NULL DEFAULT 0 CHECK(max_cost=0),
 allow_mutations INTEGER NOT NULL DEFAULT 0 CHECK(allow_mutations=0),
 expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>0),
 issued_at_ms INTEGER NOT NULL CHECK(issued_at_ms>0),
 UNIQUE(owner_id,company_id,environment,action_name)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_b3_read_scope_v0
 ON jarvis_lab_b3_read_grant_v0(owner_id,company_id,environment,action_name,expires_at_ms);
CREATE TABLE IF NOT EXISTS jarvis_lab_b3_audit_v0 (
 event_id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_code TEXT NOT NULL CHECK(event_code IN ('ALLOW','DENY','HUMAN_REQUIRED')),
 action_name TEXT NOT NULL DEFAULT 'MISSION_INSPECT' CHECK(action_name='MISSION_INSPECT'),
 company_id TEXT NOT NULL CHECK(length(company_id) BETWEEN 1 AND 100),
 engine_id TEXT NOT NULL DEFAULT 'JARVIS' CHECK(engine_id='JARVIS'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 grant_id TEXT CHECK(grant_id IS NULL OR length(grant_id) BETWEEN 1 AND 100),
 allowed INTEGER NOT NULL CHECK(allowed IN (0,1)),
 created_at_ms INTEGER NOT NULL CHECK(created_at_ms>0),
 CHECK((event_code='ALLOW' AND allowed=1) OR (event_code<>'ALLOW' AND allowed=0))
);
CREATE INDEX IF NOT EXISTS jarvis_lab_b3_audit_company_ts_v0
 ON jarvis_lab_b3_audit_v0(company_id,environment,created_at_ms);
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b3_audit_immutable_update_v0
 BEFORE UPDATE ON jarvis_lab_b3_audit_v0
 BEGIN SELECT RAISE(ABORT,'B3_AUDIT_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b3_audit_immutable_delete_v0
 BEFORE DELETE ON jarvis_lab_b3_audit_v0
 BEGIN SELECT RAISE(ABORT,'B3_AUDIT_APPEND_ONLY'); END;
-- No public API or grants. D1 admin retains schema privileges; this trigger
-- does not substitute for dedicated admin controls or independent backups.

-- FILE 0004_jarvis_d1_gateway_denial_audit_lab.sql
-- CUT25 · JARVIS gateway denial security audit. Dedicated LAB D1 only.
-- Additive, no data inserts, no new grants, no identity, token, IP or device data.
-- D1 has NO PostgreSQL RLS; private Worker binding and B2/B3 remain essential.
CREATE TABLE IF NOT EXISTS jarvis_lab_gateway_denial_audit_v0 (
 event_id INTEGER PRIMARY KEY AUTOINCREMENT,
 engine_id TEXT NOT NULL DEFAULT 'JARVIS' CHECK(engine_id='JARVIS'),
 environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 stage TEXT NOT NULL DEFAULT 'GATEWAY'
   CHECK(stage='GATEWAY'),
 reason_class TEXT NOT NULL
   CHECK(reason_class IN (
     'BAD_REQUEST','AUTH_REQUIRED','ACCESS_DENIED','NOT_FOUND',
     'METHOD_DENIED','RATE_LIMITED','DEPENDENCY_UNAVAILABLE'
   )),
 http_status INTEGER NOT NULL
   CHECK(http_status IN (400,401,403,404,405,429,503)),
 created_at_ms INTEGER NOT NULL CHECK(created_at_ms>0)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_gateway_denial_time_v0
 ON jarvis_lab_gateway_denial_audit_v0(created_at_ms,reason_class);
CREATE TRIGGER IF NOT EXISTS jarvis_lab_gateway_denial_audit_no_update_v0
 BEFORE UPDATE ON jarvis_lab_gateway_denial_audit_v0
 BEGIN SELECT RAISE(ABORT,'JARVIS_GATEWAY_AUDIT_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS jarvis_lab_gateway_denial_audit_no_delete_v0
 BEFORE DELETE ON jarvis_lab_gateway_denial_audit_v0
 BEGIN SELECT RAISE(ABORT,'JARVIS_GATEWAY_AUDIT_APPEND_ONLY'); END;
-- No SQL drop/alter of prior D1 schemas and no network/public route.
-- A quota-guard is mandatory on wrapper: do not burn unlimited Free writes
-- under abusive unauthenticated traffic. Failure to audit => deny 503.

-- FILE 0005_jarvis_d1_daily_denial_quota_lab.sql
-- CUT26 · GLOBAL daily quota for gateway denial audit, LAB only.
-- Uses one atomic SQLite/D1 UPSERT with RETURNING; no owner, session, IP,
-- request, credentials or company details. No default rows are created.
-- One increment + at most one denial audit row per accepted reservation.
CREATE TABLE IF NOT EXISTS jarvis_lab_denial_quota_v0 (
 usage_day TEXT NOT NULL
   CHECK(length(usage_day)=10 AND usage_day GLOB '????-??-??'),
 environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 quota_name TEXT NOT NULL DEFAULT 'GATEWAY_DENIAL'
   CHECK(quota_name='GATEWAY_DENIAL'),
 consumed INTEGER NOT NULL CHECK(consumed BETWEEN 1 AND 1000),
 max_per_day INTEGER NOT NULL CHECK(max_per_day BETWEEN 1 AND 1000),
 PRIMARY KEY (usage_day,environment,quota_name),
 CHECK(consumed <= max_per_day)
);
-- Atomic monotonic counter; no UPDATE/DELETE privilege is exposed to
-- the Gateway's public request surface. Dedicated DB binding is server-only.
-- Retention/compaction is an administrative backup-verified operation,
-- never automatic, and must not erase the active day's quota.

-- FILE 0006_jarvis_d1_b2_device_enrollment_audit_lab.sql
-- CUT32 candidate ONLY: append-only audit for an explicitly approved, short LAB
-- device enrollment window. Apply to dedicated EU D1 after backup, never PROD.
-- Additive; no owner enrolled, no API enabled, zero default grants.
CREATE TABLE IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_v0 (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 100),
  session_hmac TEXT NOT NULL CHECK(length(session_hmac)=64
    AND session_hmac NOT GLOB '*[^0-9a-f]*'),
  event_code TEXT NOT NULL CHECK(event_code='ENROLLED'),
  environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
  issued_at_ms INTEGER NOT NULL CHECK(issued_at_ms>0),
  expires_at_ms INTEGER NOT NULL CHECK(expires_at_ms>issued_at_ms)
);
CREATE INDEX IF NOT EXISTS jarvis_lab_b2_device_enrolled_ts_v0
 ON jarvis_lab_b2_device_enrollment_audit_v0(issued_at_ms);
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_no_update_v0
 BEFORE UPDATE ON jarvis_lab_b2_device_enrollment_audit_v0
 BEGIN SELECT RAISE(ABORT,'B2_DEVICE_ENROLLMENT_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS jarvis_lab_b2_device_enrollment_audit_no_delete_v0
 BEFORE DELETE ON jarvis_lab_b2_device_enrollment_audit_v0
 BEGIN SELECT RAISE(ABORT,'B2_DEVICE_ENROLLMENT_APPEND_ONLY'); END;
