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
