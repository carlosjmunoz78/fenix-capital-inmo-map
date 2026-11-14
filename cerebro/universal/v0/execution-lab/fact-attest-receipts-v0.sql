-- CEREBRO OS · FACT-001 first real deterministic LAB execution receipt.
-- No new scheduler, no AI, no outbound staging, no PROD. Fixed-scope append-only receipts.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cerebro_universal_fact_attestation_lab_v0 (
 receipt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 company_id text NOT NULL CHECK (company_id='fenix'),
 environment text NOT NULL CHECK (environment='LAB'),
 actor_code text NOT NULL CHECK (actor_code='CARLOS-ADMIN'),
 engine_id text NOT NULL CHECK (engine_id='FACT-001'),
 capability_id text NOT NULL CHECK (capability_id='fact.registry.attest'),
 version text NOT NULL CHECK (version='0.1.0-lab'),
 idempotency_key text NOT NULL UNIQUE CHECK (idempotency_key ~ '^lab-fact-attest-[a-z0-9-]{12,48}$'),
 registry_count integer NOT NULL CHECK (registry_count=179),
 base_count integer NOT NULL CHECK (base_count=177),
 preserved_base boolean NOT NULL CHECK (preserved_base=true),
 registry_digest text NOT NULL CHECK (registry_digest ~ '^[a-f0-9]{64}$'),
 policy_decision text NOT NULL CHECK (policy_decision='LAB_EXECUTION_ALLOWLIST'),
 executed boolean NOT NULL CHECK (executed=true),
 external_actions_executed boolean NOT NULL CHECK (external_actions_executed=false),
 prod_execution_enabled boolean NOT NULL CHECK (prod_execution_enabled=false),
 additional_cost_eur numeric NOT NULL CHECK (additional_cost_eur=0),
 source text NOT NULL CHECK (source='FACT001_CANONICAL_REPOSITORY_LAB')
);
ALTER TABLE public.cerebro_universal_fact_attestation_lab_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cerebro_universal_fact_attestation_lab_v0 FROM PUBLIC,anon,authenticated;
GRANT SELECT, INSERT ON public.cerebro_universal_fact_attestation_lab_v0 TO service_role;
COMMENT ON TABLE public.cerebro_universal_fact_attestation_lab_v0 IS
 'Owner-only PREPROD LAB FACT-001 deterministic registry attestation receipts; append-only by contract; no target execution, no staging/prod changes';
COMMIT;
