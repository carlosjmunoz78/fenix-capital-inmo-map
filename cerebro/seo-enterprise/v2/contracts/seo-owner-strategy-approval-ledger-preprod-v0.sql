-- PREPROD-only owner decision receipt. Append-only metadata; no WordPress permission.
-- Source: GitHub PR #22 author-verified owner strategy decision (2026-11-06).
CREATE TABLE IF NOT EXISTS public.cerebro_seo_owner_strategy_approval_preprod_v0 (
 provider_comment_id bigint PRIMARY KEY CHECK (provider_comment_id > 0),
 company_id text NOT NULL CHECK (company_id ~ '^[a-z0-9_-]{2,64}$'),
 engine_id text NOT NULL DEFAULT 'SEO-001' CHECK (engine_id = 'SEO-001'),
 environment text NOT NULL DEFAULT 'PREPROD' CHECK (environment = 'PREPROD'),
 version text NOT NULL,
 decision text NOT NULL CHECK (decision = 'STRATEGY_APPROVED'),
 approval_scope text NOT NULL CHECK (approval_scope = 'PREPARE_BRIEFS_AND_DRAFTS_ONLY'),
 plan_blob_sha text NOT NULL CHECK (plan_blob_sha ~ '^[a-f0-9]{40}$'),
 provider text NOT NULL DEFAULT 'github' CHECK (provider = 'github'),
 provider_repo text NOT NULL,
 provider_pr integer NOT NULL CHECK (provider_pr > 0),
 provider_owner_id bigint NOT NULL CHECK (provider_owner_id > 0),
 provider_created_at timestamptz NOT NULL,
 provider_updated_at timestamptz NOT NULL,
 source_url text NOT NULL CHECK (source_url LIKE 'https://github.com/%'),
 owner_verified boolean NOT NULL CHECK (owner_verified = true),
 grant_wp_write boolean NOT NULL DEFAULT false CHECK (grant_wp_write = false),
 grant_publish boolean NOT NULL DEFAULT false CHECK (grant_publish = false),
 grant_merge boolean NOT NULL DEFAULT false CHECK (grant_merge = false),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT seo_strategy_unedited_comment CHECK (provider_created_at = provider_updated_at),
 CONSTRAINT seo_strategy_unique_company_plan UNIQUE(company_id,plan_blob_sha)
);
ALTER TABLE public.cerebro_seo_owner_strategy_approval_preprod_v0 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cerebro_seo_owner_strategy_approval_preprod_v0 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.cerebro_seo_owner_strategy_approval_preprod_v0 TO service_role;
-- No anon/auth policies; no UPDATE or DELETE service-role grant. No authorization to publish.
