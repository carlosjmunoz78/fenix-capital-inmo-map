-- CEREBRO Browser Workspace V1 · PREPROD contracts
-- Additive. Keeps Browser V3 / Workspace V0 intact and introduces the missing
-- profile catalog, hibernated state and auditable Work lifecycle events.

alter table public.cerebro_browser_session_v3
  drop constraint if exists cerebro_browser_session_v3_state_check;

alter table public.cerebro_browser_session_v3
  add constraint cerebro_browser_session_v3_state_check
  check (state = any (array[
    'CONNECTING'::text,
    'CEREBRO_CONTROLLED'::text,
    'HUMAN_REQUIRED'::text,
    'TAKEOVER_PENDING'::text,
    'HUMAN_CONTROLLED'::text,
    'HANDBACK_PENDING'::text,
    'AI_RESUMING'::text,
    'HIBERNATE_PENDING'::text,
    'HIBERNATED'::text,
    'STOPPED'::text,
    'ERROR'::text,
    'CLOSED'::text
  ]));

alter table public.cerebro_browser_event_v3
  drop constraint if exists cerebro_browser_event_v3_event_type_check;

alter table public.cerebro_browser_event_v3
  add constraint cerebro_browser_event_v3_event_type_check
  check (event_type = any (array[
    'SESSION_OPENED'::text,
    'SESSION_CLOSED'::text,
    'AI_ACTION'::text,
    'AI_ACTION_RESULT'::text,
    'HUMAN_REQUIRED'::text,
    'HUMAN_TAKEOVER'::text,
    'HUMAN_ACTION'::text,
    'HUMAN_HANDBACK'::text,
    'AI_RESUME'::text,
    'TAB_OPENED'::text,
    'TAB_CLOSED'::text,
    'CONTROL_CHANGED'::text,
    'EMERGENCY_STOP'::text,
    'WORKER_HEARTBEAT'::text,
    'ERROR'::text,
    'PROFILE_SELECTED'::text,
    'PROFILE_LEASE_ACQUIRED'::text,
    'PROFILE_SWITCH_REQUESTED'::text,
    'SESSION_HIBERNATED'::text,
    'SESSION_RESUMED'::text,
    'ACCOUNT_VERIFICATION_OBSERVED'::text,
    'ACCOUNT_VERIFIED'::text,
    'REAUTH_REQUIRED'::text,
    'SESSION_EXPIRED'::text,
    'LOGOUT'::text,
    'LEASE_RELEASED'::text
  ]));

create table if not exists public.cerebro_browser_workspace_profile_v1 (
  workspace_profile_id uuid primary key default gen_random_uuid(),
  company_id text not null,
  environment text not null,
  identity_id text not null,
  account_id text not null,
  browser_profile_id text not null,
  provider text not null,
  display_label text not null,
  allowed_origins text[] not null default '{}'::text[],
  credential_ref_id text,
  login_policy text not null default 'HUMAN_LOGIN_REQUIRED',
  verification_state text not null default 'UNVERIFIED',
  expected_account_hash text,
  expected_account_hint text,
  pending_account_hash text,
  pending_account_hint text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz,
  constraint cerebro_browser_workspace_profile_v1_environment_ck
    check (environment in ('PREPROD','PROD')),
  constraint cerebro_browser_workspace_profile_v1_login_policy_ck
    check (login_policy in ('HUMAN_LOGIN_REQUIRED','SESSION_ONLY','CREDENTIAL_BROKER_ALLOWED')),
  constraint cerebro_browser_workspace_profile_v1_verification_ck
    check (verification_state in ('UNVERIFIED','PENDING_CONFIRMATION','VERIFIED','REAUTH_REQUIRED','MISMATCH')),
  constraint cerebro_browser_workspace_profile_v1_scope_uq
    unique (company_id,environment,identity_id,account_id),
  constraint cerebro_browser_workspace_profile_v1_browser_profile_uq
    unique (company_id,environment,browser_profile_id)
);

create index if not exists cerebro_browser_workspace_profile_v1_company_idx
  on public.cerebro_browser_workspace_profile_v1(company_id,environment,active,updated_at desc);

alter table public.cerebro_browser_workspace_profile_v1 enable row level security;
revoke all on table public.cerebro_browser_workspace_profile_v1 from public, anon, authenticated;
grant select,insert,update on table public.cerebro_browser_workspace_profile_v1 to service_role;

comment on table public.cerebro_browser_workspace_profile_v1 is
  'Logical CEREBRO Work browser profiles. Metadata only; credentials and raw authenticated storage never live here.';

alter table public.cerebro_browser_session_bundle_v1
  add column if not exists verified_account_hash text,
  add column if not exists verification_method text;

-- PREPROD identity metadata only. No password, OAuth token, cookie or Vault secret is copied.
-- First legitimate Google login must be completed by a human and then confirmed.
insert into public.cerebro_browser_workspace_profile_v1(
  company_id,environment,identity_id,account_id,browser_profile_id,provider,display_label,
  allowed_origins,credential_ref_id,login_policy,verification_state,active
) values (
  'fenix','PREPROD','iam:carlos-google-primary','acct:carlos-google-primary',
  'b1-fenix-iam_carlos-google-primary-acct_carlos-google-primary-PREPROD',
  'google','Google principal',
  array[
    'https://www.google.com','https://www.google.es','https://accounts.google.com',
    'https://myaccount.google.com','https://mail.google.com','https://drive.google.com',
    'https://docs.google.com','https://calendar.google.com'
  ],
  null,'HUMAN_LOGIN_REQUIRED','UNVERIFIED',true
)
on conflict (company_id,environment,identity_id,account_id)
do update set
  browser_profile_id=excluded.browser_profile_id,
  provider=excluded.provider,
  display_label=excluded.display_label,
  allowed_origins=excluded.allowed_origins,
  updated_at=now();
