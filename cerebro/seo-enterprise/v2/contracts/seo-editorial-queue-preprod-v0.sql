-- SEO-001 editorial work-item metadata ONLY. No customer data, no prose or credentials.
-- Target project: hnqlnvakzaywtafeiybt (Supabase PREPROD). Does NOT deploy to WordPress.
CREATE TABLE IF NOT EXISTS public.cerebro_seo_editorial_queue_preprod_v0 (
  work_id text PRIMARY KEY CHECK (work_id ~ '^SEO001-[A-Z0-9-]{8,80}$'),
  company_id text NOT NULL CHECK (company_id ~ '^[a-z0-9_-]{2,64}$'),
  engine_id text NOT NULL DEFAULT 'SEO-001' CHECK (engine_id = 'SEO-001'),
  environment text NOT NULL DEFAULT 'PREPROD' CHECK (environment = 'PREPROD'),
  version text NOT NULL CHECK (length(version) BETWEEN 3 AND 64),
  persona text NOT NULL CHECK (persona IN ('PARTICULARES','INMOBILIARIAS')),
  target_slug text NOT NULL CHECK (target_slug ~ '^[a-z0-9-]{8,120}$'),
  draft_git_blob_sha text NOT NULL CHECK (draft_git_blob_sha ~ '^[0-9a-f]{40}$'),
  draft_path text NOT NULL CHECK (draft_path ~ '^cerebro/seo-enterprise/v2/drafts/[a-zA-Z0-9_.-]+\.draft\.html$'),
  source_registry_path text NOT NULL DEFAULT 'cerebro/seo-enterprise/v2/registry/seo-editorial-first-batch-2026-11-06.json',
  status text NOT NULL DEFAULT 'DRAFT_READY_FOR_QA'
    CHECK (status IN ('DRAFT_READY_FOR_QA','QA_BLOCKED','QA_REVIEWED','HOLD')),
  wordpress_post_id bigint NULL CHECK (wordpress_post_id IS NULL OR wordpress_post_id > 0),
  strategy_owner_approval_verified boolean NOT NULL DEFAULT false CHECK (strategy_owner_approval_verified=false),
  wordpress_write_authorized boolean NOT NULL DEFAULT false CHECK (wordpress_write_authorized=false),
  publish_authorized boolean NOT NULL DEFAULT false CHECK (publish_authorized=false),
  raw_customer_pii_present boolean NOT NULL DEFAULT false CHECK (raw_customer_pii_present=false),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, target_slug),
  UNIQUE (company_id, draft_git_blob_sha)
);
ALTER TABLE public.cerebro_seo_editorial_queue_preprod_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cerebro_seo_editorial_queue_preprod_v0 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.cerebro_seo_editorial_queue_preprod_v0 TO service_role;
-- Intentionally no anon/auth policy: server-only queue; no DELETE granted to service_role.
-- Release/owner approval must be a SEPARATE authenticated stage, not mutable flags here.
