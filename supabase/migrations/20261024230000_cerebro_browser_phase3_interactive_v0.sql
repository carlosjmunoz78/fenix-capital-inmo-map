-- CEREBRO Browser 1 · Phase 3 interactive control plane V0
-- Additive only. Browser V1/V2 tables and functions remain untouched.

create table if not exists public.cerebro_browser_session_v3 (
  session_id uuid primary key,
  job_id uuid not null unique,
  company_id text not null,
  engine_id text not null default 'CONSOLE-001',
  department_id text not null default 'cerebro',
  environment text not null check (environment in ('PREPROD','PROD','LAB')),
  version text not null default 'v3',
  identity_id text not null default 'public',
  account_id text not null default 'public',
  browser_profile_id text not null,
  worker_id text,
  state text not null default 'CONNECTING' check (state in ('CONNECTING','CEREBRO_CONTROLLED','HUMAN_REQUIRED','TAKEOVER_PENDING','HUMAN_CONTROLLED','HANDBACK_PENDING','AI_RESUMING','STOPPED','ERROR','CLOSED')),
  control_owner text not null default 'NONE' check (control_owner in ('CEREBRO','HUMAN','NONE')),
  worker_alive boolean not null default false,
  emergency_stop boolean not null default false,
  current_url text,
  current_title text,
  tabs jsonb not null default '[]'::jsonb,
  active_tab_index integer,
  viewport_width integer,
  viewport_height integer,
  frame_ciphertext text,
  frame_iv text,
  frame_seq bigint not null default 0,
  frame_mime text,
  frame_captured_at timestamptz,
  human_lease_id uuid,
  human_lease_expires_at timestamptz,
  human_required jsonb,
  last_heartbeat_at timestamptz,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint cerebro_browser_v3_human_lease_consistency check (
    control_owner <> 'HUMAN' or (human_lease_id is not null and human_lease_expires_at is not null)
  )
);

create index if not exists cerebro_browser_session_v3_scope_idx
  on public.cerebro_browser_session_v3(environment, company_id, department_id, updated_at desc);
create index if not exists cerebro_browser_session_v3_worker_idx
  on public.cerebro_browser_session_v3(worker_id, state) where worker_alive = true;

create table if not exists public.cerebro_browser_control_v3 (
  command_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cerebro_browser_session_v3(session_id) on delete cascade,
  lease_id uuid,
  actor text not null check (actor in ('HUMAN','CEREBRO','SYSTEM')),
  command_type text not null check (command_type in ('CLICK_POINT','DOUBLE_CLICK_POINT','MOVE_POINT','KEYBOARD_TYPE','KEYBOARD_PRESS','SCROLL','SWITCH_TAB','BACK','FORWARD','RELOAD','OPEN_TAB','CLOSE_TAB')),
  payload_ciphertext text,
  payload_iv text,
  status text not null default 'QUEUED' check (status in ('QUEUED','CLAIMED','COMPLETED','FAILED','DENIED')),
  worker_id text,
  audit_id text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  error_code text
);

create index if not exists cerebro_browser_control_v3_queue_idx
  on public.cerebro_browser_control_v3(session_id, status, created_at);

create table if not exists public.cerebro_browser_event_v3 (
  event_id bigint generated always as identity primary key,
  session_id uuid not null references public.cerebro_browser_session_v3(session_id) on delete cascade,
  event_type text not null check (event_type in ('SESSION_OPENED','SESSION_CLOSED','AI_ACTION','AI_ACTION_RESULT','HUMAN_REQUIRED','HUMAN_TAKEOVER','HUMAN_ACTION','HUMAN_HANDBACK','AI_RESUME','TAB_OPENED','TAB_CLOSED','CONTROL_CHANGED','EMERGENCY_STOP','WORKER_HEARTBEAT','ERROR')),
  actor text not null check (actor in ('CEREBRO','HUMAN','SYSTEM')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cerebro_browser_event_v3_session_idx
  on public.cerebro_browser_event_v3(session_id, event_id desc);

alter table public.cerebro_browser_session_v3 enable row level security;
alter table public.cerebro_browser_control_v3 enable row level security;
alter table public.cerebro_browser_event_v3 enable row level security;

comment on table public.cerebro_browser_session_v3 is 'Browser 1 Phase 3 live session state. Frames are AES-GCM ciphertext only; UI access is through governed Edge API.';
comment on table public.cerebro_browser_control_v3 is 'Ephemeral encrypted human input queue. Plain keyboard/form values are forbidden.';
comment on table public.cerebro_browser_event_v3 is 'Sparse non-secret audit events for takeover/handback/session lifecycle.';
