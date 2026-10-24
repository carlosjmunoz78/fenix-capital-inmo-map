create table if not exists public.cerebro_browser_session_bundle_v1 (
  bundle_id uuid primary key default gen_random_uuid(),
  company_id text not null,
  environment text not null,
  identity_id text not null,
  account_id text not null,
  browser_profile_id text not null,
  provider text,
  source_session_id uuid references public.cerebro_browser_session_v3(session_id) on delete set null,
  bundle_ciphertext text not null,
  bundle_iv text not null,
  bundle_sha256 text not null,
  tabs jsonb not null default '[]'::jsonb,
  active_tab_index integer,
  cookie_count integer not null default 0,
  origin_count integer not null default 0,
  verification_state text not null default 'UNVERIFIED',
  verified_account_hint text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_verified_at timestamptz,
  revoked_at timestamptz,
  constraint cerebro_browser_session_bundle_v1_environment_ck check (environment in ('PREPROD','PROD')),
  constraint cerebro_browser_session_bundle_v1_status_ck check (status in ('ACTIVE','REVOKED','EXPIRED')),
  constraint cerebro_browser_session_bundle_v1_verify_ck check (verification_state in ('UNVERIFIED','VERIFIED','REAUTH_REQUIRED','MISMATCH')),
  constraint cerebro_browser_session_bundle_v1_counts_ck check (cookie_count >= 0 and origin_count >= 0),
  constraint cerebro_browser_session_bundle_v1_ciphertext_size_ck check (char_length(bundle_ciphertext) <= 7000000),
  constraint cerebro_browser_session_bundle_v1_tabs_ck check (jsonb_typeof(tabs)='array')
);

create unique index if not exists cerebro_browser_session_bundle_v1_one_active_profile
  on public.cerebro_browser_session_bundle_v1(company_id,environment,browser_profile_id)
  where status='ACTIVE';

create index if not exists cerebro_browser_session_bundle_v1_lookup
  on public.cerebro_browser_session_bundle_v1(company_id,environment,identity_id,account_id,updated_at desc);

alter table public.cerebro_browser_session_bundle_v1 enable row level security;

comment on table public.cerebro_browser_session_bundle_v1 is
  'CEREBRO Browser Workspace encrypted session bundles. Ciphertext only; service-role/verified-worker path. Never store raw cookies, passwords or tokens here.';
