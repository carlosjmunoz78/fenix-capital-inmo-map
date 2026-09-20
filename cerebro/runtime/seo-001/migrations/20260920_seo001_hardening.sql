-- SEO-001 rebuild/reference migrations
-- Applied to PREPROD project hnqlnvakzaywtafeiybt on 2026-09-20.
-- This file is documentary/rebuild source; migration history in Supabase remains authoritative.

-- 1. Multi-company scope
alter table public.seo_cerebro_runs_preprod
  add column if not exists company_id text not null default 'FENIX_CAPITAL',
  add column if not exists engine_id text not null default 'SEO-001',
  add column if not exists environment text not null default 'PREPROD',
  add column if not exists engine_version text not null default '0.4.1';

alter table public.seo_cerebro_changes_preprod
  add column if not exists company_id text not null default 'FENIX_CAPITAL',
  add column if not exists engine_id text not null default 'SEO-001',
  add column if not exists environment text not null default 'PREPROD',
  add column if not exists engine_version text not null default '0.4.1';

create unique index if not exists seo_cerebro_runs_scope_run_key_uq
  on public.seo_cerebro_runs_preprod(company_id,engine_id,environment,run_key);
create unique index if not exists seo_cerebro_changes_scope_change_key_uq
  on public.seo_cerebro_changes_preprod(company_id,engine_id,environment,change_key);

-- 2. Query→page evidence
alter table public.seo_cerebro_runs_preprod
  add column if not exists query_page_pairs jsonb not null default '[]'::jsonb,
  add column if not exists ga4_active_users_valid boolean not null default false;

-- 3. Prioritized backlog
create table if not exists public.seo_cerebro_backlog_preprod (
  id uuid primary key default gen_random_uuid(),
  company_id text not null, engine_id text not null, environment text not null, engine_version text not null,
  run_key text not null, item_key text not null, priority integer not null, action text not null,
  mode text not null, target text not null default '', status text not null default 'OPEN',
  evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists seo_cerebro_backlog_scope_item_uq
  on public.seo_cerebro_backlog_preprod(company_id,engine_id,environment,item_key);
alter table public.seo_cerebro_backlog_preprod enable row level security;

-- 4. Longitudinal autonomy evidence ledger + health view
-- See live migration `seo001_observability_cycle_ledger_v1`; keep additive/fail-closed semantics during rebuild.
