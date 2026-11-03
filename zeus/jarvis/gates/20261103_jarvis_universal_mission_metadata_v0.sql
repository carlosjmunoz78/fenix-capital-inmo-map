-- SPEC ONLY: NOT EXECUTED IN PROD. Dedicated, lightweight mission metadata.
-- Existing App/CRM tables, projects and browser data are untouched.
-- Before applying: backup/rollback, Data API exposure check, advisor + RLS verification.
CREATE TABLE IF NOT EXISTS public.jarvis_universal_mission_v0 (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  company_id text NOT NULL,
  idempotency_key text NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  mission jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jarvis_um_v0_scope_key UNIQUE(owner_id,company_id,idempotency_key),
  CONSTRAINT jarvis_um_v0_small_metadata CHECK (octet_length(mission::text) <= 32768)
);
ALTER TABLE public.jarvis_universal_mission_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jarvis_universal_mission_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.jarvis_universal_mission_v0 TO service_role;
-- Dedicated trusted server only; never put service_role credentials in a browser/client.
-- Rollback: do not DROP until verifying that no missions were created or exported.