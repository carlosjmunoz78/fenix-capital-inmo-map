-- CUT13 · SPEC/LAB ONLY: run in a separate disposable PostgreSQL instance.
-- NEVER run this on fenix-capital-prod or an unverified project.
-- Capture pg_dump schema+data BEFORE applying and verify restore to another isolated DB.
BEGIN;
CREATE SCHEMA IF NOT EXISTS jarvis_lab_identity;
REVOKE ALL ON SCHEMA jarvis_lab_identity FROM PUBLIC;
CREATE TABLE IF NOT EXISTS jarvis_lab_identity.owner_binding_v0 (
  channel text NOT NULL CHECK(length(channel) BETWEEN 2 AND 80),
  subject_hmac text NOT NULL CHECK(subject_hmac ~ '^[a-f0-9]{64}$'),
  owner_id text NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 200),
  role text NOT NULL CHECK(role = 'OWNER_ROOT'),
  active boolean NOT NULL DEFAULT false,
  authorized_companies text[] NOT NULL CHECK(cardinality(authorized_companies) BETWEEN 1 AND 50 AND NOT ('*'=ANY(authorized_companies))),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(channel,subject_hmac)
);
ALTER TABLE jarvis_lab_identity.owner_binding_v0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_lab_identity.owner_binding_v0 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON jarvis_lab_identity.owner_binding_v0 FROM PUBLIC;
-- The dedicated server DB role is created by the isolated infrastructure owner.
-- No default anon/authenticated/service_role privileges and NO default owner enrolment.
-- For a dedicated jarvis_lab_reader role, grant schema USAGE, table SELECT,
-- and a narrowly scoped SELECT RLS policy only after identity/role verification.
-- Never grant INSERT/UPDATE/DELETE to that runtime reader.
COMMIT;
-- End of SQL candidate; physical snapshot/restore, owner role creation, and role tests PENDING.
