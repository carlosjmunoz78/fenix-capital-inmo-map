-- Rebuildable prerequisites for ACTGW -> SEO-001 PREPROD binding.
-- Mirrors the live PREPROD columns/constraints needed by the activation path.

create table if not exists public.seo_cerebro_territories_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null default 'SEO-001',
  environment text not null default 'PREPROD',
  engine_version text not null default '0.4.1',
  province text not null,
  municipality text not null,
  wave integer not null check (wave between 1 and 9),
  primary_keyword text not null,
  secondary_keyword text not null,
  b2b_keyword text not null,
  planned_url text not null,
  structural_family text not null,
  differentiation_seed text not null,
  existing_url_state text not null default 'POR_AUDITAR',
  local_research_state text not null default 'RESEARCH_REQUIRED',
  status text not null default 'PLANNED',
  image_manifest jsonb not null default '{}'::jsonb,
  keyword_evidence jsonb not null default '{}'::jsonb,
  cannibalization_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists seo_territory_scope_muni_uq
  on public.seo_cerebro_territories_preprod(company_id,engine_id,environment,province,municipality);

create table if not exists public.seo_cerebro_expansion_jobs_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null default 'SEO-001',
  environment text not null default 'PREPROD',
  province text not null,
  municipality text not null,
  job_type text not null,
  priority integer not null default 50,
  status text not null default 'QUEUED',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  attempts integer not null default 0,
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text
);
create unique index if not exists seo_expansion_job_scope_uq
  on public.seo_cerebro_expansion_jobs_preprod(company_id,engine_id,environment,province,municipality,job_type);

create table if not exists public.seo_cerebro_city_runs_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null default 'SEO-001',
  environment text not null default 'PREPROD',
  province text not null,
  municipality text not null,
  run_role text not null default 'NORMAL'
    check (run_role in ('PILOT','VALIDATION_CITY','NORMAL')),
  sequence_no integer not null,
  state text not null default 'QUEUED'
    check (state in ('QUEUED','RESEARCH','COPY','SEMANTIC_QA','WORDPRESS_DRAFT','VISUALS','PREPUBLISH_QA',
      'READY_FOR_SUPERVISION','SUPERVISION_FAILED','SUPERVISION_PASSED','READY_TO_PUBLISH','PUBLISHED',
      'POSTPUBLISH_QA','COMPLETE','BLOCKED')),
  auto_execute boolean not null default true,
  supervisor_required boolean not null default false,
  supervisor_state text not null default 'NOT_REQUIRED'
    check (supervisor_state in ('NOT_REQUIRED','PENDING','PASS','FAIL')),
  learned_policy_version integer not null default 1,
  blockers jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ready_for_supervision_at timestamptz,
  supervisor_completed_at timestamptz,
  released_next_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  publish_receipt jsonb not null default '{}'::jsonb,
  postpublish_verified boolean not null default false,
  postpublish_verified_at timestamptz,
  overall_state text not null default 'GROWTH_STACK_PENDING',
  city_complete boolean not null default false,
  completion_contract_version text not null default 'CITY_GROWTH_STACK_V2',
  completion_gates jsonb not null default '{}'::jsonb
);
create unique index if not exists seo_city_run_scope_uq
  on public.seo_cerebro_city_runs_preprod(company_id,engine_id,environment,province,municipality);

create table if not exists public.seo_cerebro_city_growth_stack_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  engine_id text not null default 'SEO-001',
  environment text not null default 'PREPROD',
  province text not null,
  municipality text not null,
  contract_version text not null default 'CITY_GROWTH_STACK_V2',
  landing_state text not null default 'PENDING',
  supporting_posts_state text not null default 'PENDING',
  internal_links_state text not null default 'PENDING',
  lead_magnet_state text not null default 'PENDING',
  gated_form_state text not null default 'PENDING',
  consent_legal_state text not null default 'PENDING',
  email_delivery_state text not null default 'PENDING',
  newsletter_sequence_state text not null default 'PENDING',
  crm_capture_state text not null default 'PENDING',
  segmentation_state text not null default 'PENDING',
  conversion_tracking_state text not null default 'PENDING',
  schema_state text not null default 'PENDING',
  technical_seo_state text not null default 'PENDING',
  visual_assets_state text not null default 'PENDING',
  local_evidence_state text not null default 'PENDING',
  b2b_path_state text not null default 'PENDING',
  downloadable_qa_state text not null default 'PENDING',
  mobile_ux_state text not null default 'PENDING',
  cache_state text not null default 'PENDING',
  postpublish_state text not null default 'PENDING',
  measurement_baseline_state text not null default 'PENDING',
  autonomy_state text not null default 'PENDING',
  city_complete boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  keyword_intent_state text not null default 'PENDING',
  unique(company_id,engine_id,environment,province,municipality)
);
