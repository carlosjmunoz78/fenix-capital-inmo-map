-- CEREBRO OS · isolated PREPROD durable operator dry-run audit; no execution queue.
-- New table only. Rollback requires a saved snapshot then DROP TABLE,
-- only if no consumers (never delete or alter legacy tables).
create table public.cerebro_operativa_lab_audit_v0(
 audit_id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 company_id text not null default 'fenix' check(company_id='fenix'),
 environment text not null default 'LAB' check(environment='LAB'),
 actor_code text not null default 'CARLOS-ADMIN' check(actor_code='CARLOS-ADMIN'),
 engine_id text not null default 'FACT-001' check(engine_id='FACT-001'),
 capability_id text not null default 'fact.registry.summary' check(capability_id='fact.registry.summary'),
 source_version text not null default '0.1.0-lab' check(source_version='0.1.0-lab'),
 action text not null default 'FACT001_DRY_RUN_AUDIT' check(action='FACT001_DRY_RUN_AUDIT'),
 policy_decision text not null default 'DRY_RUN_VALIDATED' check(policy_decision='DRY_RUN_VALIDATED'),
 idempotency_key text not null unique check(idempotency_key ~ '^lab-[a-z0-9-]{12,48}$'),
 executed boolean not null default false check(executed=false),
 prod_execution_enabled boolean not null default false check(prod_execution_enabled=false),
 additional_cost_eur numeric not null default 0 check(additional_cost_eur=0)
);
alter table public.cerebro_operativa_lab_audit_v0 enable row level security;
revoke all on table public.cerebro_operativa_lab_audit_v0 from public,anon,authenticated;
grant select,insert on table public.cerebro_operativa_lab_audit_v0 to service_role;
comment on table public.cerebro_operativa_lab_audit_v0
is 'Isolated LAB-only durable audit of owner-verified FACT001 dry-run; no engine queue, tokens, customer data, or production dispatch';
