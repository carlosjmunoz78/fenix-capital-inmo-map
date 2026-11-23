-- P2/P3 CEREBRO LAB only. New isolated, removable table; never alter existing objects.
create table public.cerebro_agent_execution_receipt_lab_v1 (
  receipt_id text primary key,
  company_id text not null default 'fenix' check (company_id='fenix'),
  engine_id text not null default 'QA-001' check (engine_id='QA-001'),
  environment text not null default 'LAB' check (environment='LAB'),
  version text not null check (char_length(version) between 1 and 40),
  agent_role_id text not null default 'ENG-QA' check (agent_role_id='ENG-QA'),
  subagent_role_id text null check (subagent_role_id is null),
  source text not null default 'GITHUB_ACTIONS_OIDC' check (source='GITHUB_ACTIONS_OIDC'),
  executor_id text not null default 'github-actions/cerebro-agent-execution-lab' check (executor_id='github-actions/cerebro-agent-execution-lab'),
  job_id text not null check (job_id ~ '^gh-run-[0-9]+$'),
  run_id bigint not null check (run_id>0),
  run_sha text not null check (run_sha ~ '^[a-f0-9]{40}$'),
  event text not null check (event in ('STARTED','HEARTBEAT','SUCCEEDED','FAILED')),
  integrity text not null default 'VERIFIED_GITHUB_OIDC' check (integrity='VERIFIED_GITHUB_OIDC'),
  excellence_verified boolean not null default false check (excellence_verified=false),
  prod_execution_enabled boolean not null default false check (prod_execution_enabled=false),
  external_actions_executed boolean not null default false check (external_actions_executed=false),
  created_at timestamptz not null default now(),
  unique (run_id,event)
);
create index cerebro_agent_execution_receipt_lab_v1_recent_idx
  on public.cerebro_agent_execution_receipt_lab_v1 (created_at desc);
alter table public.cerebro_agent_execution_receipt_lab_v1 enable row level security;
revoke all on public.cerebro_agent_execution_receipt_lab_v1 from public, anon, authenticated;
-- Only Supabase service role inside isolated Edge Function may read/write. No user-facing RLS policy.
comment on table public.cerebro_agent_execution_receipt_lab_v1 is
 'Isolated QA-001 first-party GitHub-OIDC execution receipt ledger; NOT App/CRM PROD. Rollback only after evidence export: DROP TABLE public.cerebro_agent_execution_receipt_lab_v1.';
