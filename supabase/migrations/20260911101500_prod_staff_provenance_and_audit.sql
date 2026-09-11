begin;

alter table fenix_prod.actors
  add column if not exists created_by_auth_user_id uuid,
  add column if not exists created_by_actor_code text,
  add column if not exists profile_kind text;

update fenix_prod.actors
set profile_kind = case
  when actor_code='CARLOS-ADMIN' then 'Carlos'
  when actor_code='BELEN-DIR' then 'Belen'
  when role='Financiero' then 'Financiero'
  when role='Visitador' then 'Visitador'
  when role='Direccion' then 'Director'
  else role
end
where profile_kind is null;

alter table fenix_prod.actors
  drop constraint if exists actors_profile_kind_check;

alter table fenix_prod.actors
  add constraint actors_profile_kind_check
  check (profile_kind is null or profile_kind in ('Carlos','Belen','Director','Financiero','Visitador'));

create index if not exists idx_actors_created_by_auth_user_id
  on fenix_prod.actors(created_by_auth_user_id)
  where created_by_auth_user_id is not null;

create table if not exists fenix_prod.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_code text,
  actor_auth_user_id uuid,
  event_type text not null,
  scope text not null default 'company',
  subject_type text,
  subject_code text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_events_occurred_at on fenix_prod.audit_events(occurred_at desc);
create index if not exists idx_audit_events_actor_code on fenix_prod.audit_events(actor_code,occurred_at desc);
create index if not exists idx_audit_events_event_type on fenix_prod.audit_events(event_type,occurred_at desc);

revoke all on fenix_prod.audit_events from anon, authenticated;

commit;
