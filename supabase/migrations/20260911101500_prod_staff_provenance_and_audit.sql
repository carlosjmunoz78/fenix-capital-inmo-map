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

commit;
