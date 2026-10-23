-- CEREBRO Browser 1 Phase 2 rebuild closure: barrier table.
create table if not exists public.cerebro_browser_barrier_v2 (
  run_id text not null,
  stage_concurrency integer not null check (stage_concurrency between 1 and 32),
  worker_slot integer not null check (worker_slot between 1 and 32),
  worker_id text not null,
  ready_at timestamptz not null default now(),
  primary key (run_id, stage_concurrency, worker_slot)
);
alter table public.cerebro_browser_barrier_v2 enable row level security;
