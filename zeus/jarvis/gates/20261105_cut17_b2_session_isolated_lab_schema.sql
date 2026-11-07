-- CUT17 candidate: isolated PostgreSQL LAB only. Never execute on a shared or PROD DB.
-- This ADDITIVE migration does not enrol an owner or create B3 grants.
BEGIN;
CREATE SCHEMA IF NOT EXISTS jarvis_lab_identity;
REVOKE ALL ON SCHEMA jarvis_lab_identity FROM PUBLIC;
CREATE TABLE IF NOT EXISTS jarvis_lab_identity.session_binding_v0 (
 owner_id text NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 200),
 session_hmac text NOT NULL CHECK(session_hmac ~ '^[a-f0-9]{64}$'),
 environment text NOT NULL CHECK(environment = 'LAB'),
 channel text NOT NULL CHECK(channel ~ '^[a-z][a-z0-9-]{1,79}$'),
 role text NOT NULL CHECK(role='OWNER_ROOT'),
 active boolean NOT NULL DEFAULT false,
 revoked boolean NOT NULL DEFAULT false,
 authorized_companies text[] NOT NULL CHECK(cardinality(authorized_companies) BETWEEN 1 AND 50 AND NOT ('*'=ANY(authorized_companies))),
 expires_at timestamptz NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,session_hmac)
);
ALTER TABLE jarvis_lab_identity.session_binding_v0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_lab_identity.session_binding_v0 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON jarvis_lab_identity.session_binding_v0 FROM PUBLIC;
-- No read grants by default; RLS context and dedicated NOLOGIN reader are provisioned
-- by the trusted LAB runtime only, after host + identity verification.
COMMIT;
