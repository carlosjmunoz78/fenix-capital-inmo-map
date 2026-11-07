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
