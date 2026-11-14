-- Independent immutable evidence for deterministic editorial PRECHECK; not professional signoff.
-- PREPROD project hnqlnvakzaywtafeiybt only. Data fields never contain customer PII or article text.
CREATE TABLE IF NOT EXISTS public.cerebro_seo_editorial_technical_qa_preprod_v0 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 work_id text NOT NULL REFERENCES public.cerebro_seo_editorial_queue_preprod_v0(work_id) ON DELETE RESTRICT,
 company_id text NOT NULL CHECK (company_id ~ '^[a-z0-9_-]{2,64}$'),
 engine_id text NOT NULL DEFAULT 'SEO-001' CHECK (engine_id = 'SEO-001'),
 environment text NOT NULL DEFAULT 'PREPROD' CHECK (environment = 'PREPROD'),
 version text NOT NULL CHECK (length(version) BETWEEN 3 AND 64),
 persona text NOT NULL CHECK (persona IN ('PARTICULARES','INMOBILIARIAS')),
 source_git_blob_sha text NOT NULL CHECK (source_git_blob_sha ~ '^[0-9a-f]{40}$'),
 source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
 github_run_id bigint NOT NULL CHECK (github_run_id > 0),
 evidence_job_id text NOT NULL CHECK (length(evidence_job_id) BETWEEN 12 AND 100),
 worker_status text NOT NULL CHECK (worker_status = 'SUCCEEDED'),
 technical_qa_status text NOT NULL
   CHECK (technical_qa_status IN ('TECHNICAL_PRECHECK_PASS','TECHNICAL_PRECHECK_FAIL')),
 tribunal_decision text NOT NULL
   CHECK (tribunal_decision IN ('TECHNICAL_PRECHECK_PASS_RELEASE_HOLD','TECHNICAL_PRECHECK_FAIL_RELEASE_HOLD')),
 independent_professional_qa_verified boolean NOT NULL DEFAULT false CHECK (independent_professional_qa_verified=false),
 independent_tribunal_iam_verified boolean NOT NULL DEFAULT false CHECK (independent_tribunal_iam_verified=false),
 wordpress_write_authorized boolean NOT NULL DEFAULT false CHECK (wordpress_write_authorized=false),
 publish_authorized boolean NOT NULL DEFAULT false CHECK (publish_authorized=false),
 notes text NOT NULL DEFAULT 'Deterministic code precheck only; expert and owner review pending'
   CHECK (length(notes) <= 250),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (company_id,work_id,source_sha256,github_run_id),
 CONSTRAINT seo_qa_outcome_consistent CHECK (
  (technical_qa_status='TECHNICAL_PRECHECK_PASS' AND tribunal_decision='TECHNICAL_PRECHECK_PASS_RELEASE_HOLD')
  OR (technical_qa_status='TECHNICAL_PRECHECK_FAIL' AND tribunal_decision='TECHNICAL_PRECHECK_FAIL_RELEASE_HOLD')
 )
);
ALTER TABLE public.cerebro_seo_editorial_technical_qa_preprod_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cerebro_seo_editorial_technical_qa_preprod_v0 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.cerebro_seo_editorial_technical_qa_preprod_v0 TO service_role;
-- Deliberately no GRANT UPDATE/DELETE: append-only and no public access.
