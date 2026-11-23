-- SPEC ONLY: do not execute until backup, threat model and E2E owner authentication gates pass.
-- A channel subject is represented only by a server-generated HMAC-SHA256 (with secret key in Vault).
CREATE TABLE IF NOT EXISTS public.jarvis_zeus_identity_binding_v0 (
  channel text NOT NULL CHECK (length(channel) BETWEEN 2 AND 80),
  subject_hmac text NOT NULL CHECK (subject_hmac ~ '^[a-f0-9]{64}$'),
  owner_id text NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 200),
  role text NOT NULL CHECK (role IN ('OWNER_ROOT')),
  active boolean NOT NULL DEFAULT false,
  authorized_companies text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel,subject_hmac),
  CHECK (cardinality(authorized_companies) BETWEEN 1 AND 50),
  CHECK (NOT ('*'=ANY(authorized_companies)))
);
ALTER TABLE public.jarvis_zeus_identity_binding_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jarvis_zeus_identity_binding_v0 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.jarvis_zeus_identity_binding_v0 TO service_role;
-- No automatic owner grants, inserts or redirects; bootstrap requires separate owner-verified approval.
-- Rollback only if empty and after a captured schema snapshot; do not remove an inhabited table.