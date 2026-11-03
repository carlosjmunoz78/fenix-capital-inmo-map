-- JARVIS Project Hub V1 transactional RPCs · PREPROD only

create or replace function public.jarvis_project_create_v1(
  p_actor text,
  p_title text,
  p_objective text default null,
  p_subprojects jsonb default '[]'::jsonb,
  p_dependencies jsonb default '[]'::jsonb,
  p_source text default 'JARVIS_UI',
  p_event_type text default 'CREATED'
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  pid text;
  row_after public.jarvis_project_overlay_v1%rowtype;
  next_order integer;
begin
  if p_actor not in ('CARLOS','JARVIS','CARLOS-ADMIN') then raise exception 'ACTOR_DENIED'; end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 160 then raise exception 'TITLE_INVALID'; end if;
  if p_event_type not in ('CREATED','IMPORTED') then raise exception 'EVENT_TYPE_INVALID'; end if;
  if jsonb_typeof(coalesce(p_subprojects,'[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p_dependencies,'[]'::jsonb)) <> 'array' then raise exception 'ARRAYS_REQUIRED'; end if;
  pid := 'PRJ-USER-' || replace(gen_random_uuid()::text,'-','');
  select coalesce(max(sort_order),999)+1 into next_order from public.jarvis_project_overlay_v1 where company_id='fenix' and environment='PREPROD' and version='v1';
  insert into public.jarvis_project_overlay_v1(company_id,engine_id,environment,version,project_id,is_user_created,title,objective,status,owner,editors,autonomy_state,subprojects,dependencies,audit_refs,source,sort_order,created_by)
  values('fenix','CONSOLE-001','PREPROD','v1',pid,true,btrim(p_title),nullif(btrim(coalesce(p_objective,'')),''),'PLANIFICADO','CARLOS','["CARLOS","JARVIS"]'::jsonb,'ACTIVE',coalesce(p_subprojects,'[]'::jsonb),coalesce(p_dependencies,'[]'::jsonb),'[]'::jsonb,left(coalesce(p_source,'JARVIS_UI'),160),next_order,p_actor)
  returning * into row_after;
  insert into public.jarvis_project_revision_v1(company_id,engine_id,environment,version,project_id,actor,event_type,before_state,after_state)
  values('fenix','CONSOLE-001','PREPROD','v1',pid,p_actor,p_event_type,null,to_jsonb(row_after));
  return to_jsonb(row_after);
end $$;

create or replace function public.jarvis_project_rename_v1(
  p_actor text,
  p_project_id text,
  p_title text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  before_row public.jarvis_project_overlay_v1%rowtype;
  after_row public.jarvis_project_overlay_v1%rowtype;
  existed boolean := false;
begin
  if p_actor not in ('CARLOS','JARVIS','CARLOS-ADMIN') then raise exception 'ACTOR_DENIED'; end if;
  if p_project_id is null or length(btrim(p_project_id)) not between 3 and 128 then raise exception 'PROJECT_ID_INVALID'; end if;
  if p_title is null or length(btrim(p_title)) not between 1 and 160 then raise exception 'TITLE_INVALID'; end if;
  select * into before_row from public.jarvis_project_overlay_v1 where company_id='fenix' and environment='PREPROD' and version='v1' and project_id=btrim(p_project_id) for update;
  existed := found;
  if existed then
    update public.jarvis_project_overlay_v1 set title=btrim(p_title),updated_at=now() where company_id='fenix' and environment='PREPROD' and version='v1' and project_id=btrim(p_project_id) returning * into after_row;
  else
    insert into public.jarvis_project_overlay_v1(company_id,engine_id,environment,version,project_id,is_user_created,title,source,created_by)
    values('fenix','CONSOLE-001','PREPROD','v1',btrim(p_project_id),false,btrim(p_title),'CANONICAL_TITLE_OVERLAY',p_actor)
    returning * into after_row;
  end if;
  insert into public.jarvis_project_revision_v1(company_id,engine_id,environment,version,project_id,actor,event_type,before_state,after_state)
  values('fenix','CONSOLE-001','PREPROD','v1',btrim(p_project_id),p_actor,'RENAMED',case when existed then to_jsonb(before_row) else null end,to_jsonb(after_row));
  return to_jsonb(after_row);
end $$;

create or replace function public.jarvis_project_list_v1() returns jsonb
language sql
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by coalesce(p.sort_order,2147483647),p.created_at,p.project_id),'[]'::jsonb)
  from public.jarvis_project_overlay_v1 p
  where p.company_id='fenix' and p.environment='PREPROD' and p.version='v1';
$$;

create or replace function public.jarvis_project_revisions_v1(p_project_id text) returns jsonb
language sql
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  from public.jarvis_project_revision_v1 r
  where r.company_id='fenix' and r.environment='PREPROD' and r.version='v1' and r.project_id=p_project_id;
$$;

revoke all on function public.jarvis_project_create_v1(text,text,text,jsonb,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.jarvis_project_rename_v1(text,text,text) from public, anon, authenticated;
revoke all on function public.jarvis_project_list_v1() from public, anon, authenticated;
revoke all on function public.jarvis_project_revisions_v1(text) from public, anon, authenticated;
grant execute on function public.jarvis_project_create_v1(text,text,text,jsonb,jsonb,text,text) to service_role;
grant execute on function public.jarvis_project_rename_v1(text,text,text) to service_role;
grant execute on function public.jarvis_project_list_v1() to service_role;
grant execute on function public.jarvis_project_revisions_v1(text) to service_role;
