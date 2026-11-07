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
