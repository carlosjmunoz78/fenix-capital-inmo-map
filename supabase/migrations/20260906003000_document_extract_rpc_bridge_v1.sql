-- PROD document extractor bridge: keep internal fenix_prod tables off direct Data API access.
-- All functions are server-only and executable exclusively by service_role.

create or replace function public.fenix_prod_document_extract_resolve_server(
  p_actor_code text,
  p_upload_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  us fenix_prod.document_upload_sessions%rowtype;
  v_document_id uuid;
  v_exp_code text;
  v_owner text;
begin
  select role into v_role
    from fenix_prod.actors
   where actor_code=p_actor_code and active=true
   limit 1;
  if v_role is null then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;

  select * into us
    from fenix_prod.document_upload_sessions
   where id=p_upload_id
   limit 1;
  if not found then
    return jsonb_build_object('ok',false,'status',404,'error','upload_not_found');
  end if;
  if us.status <> 'completed' then
    return jsonb_build_object('ok',false,'status',409,'error','upload_not_completed');
  end if;

  select dv.document_id into v_document_id
    from fenix_prod.document_versions dv
   where dv.storage_path=us.storage_path
   order by dv.created_at desc nulls last
   limit 1;

  if us.origin_type is not null and us.origin_code is not null then
    if v_role <> 'Direccion' and us.actor_code <> p_actor_code then
      return jsonb_build_object('ok',false,'status',403,'error','forbidden');
    end if;
    return jsonb_build_object(
      'ok',true,'status',200,'legacy',false,
      'origin_type',us.origin_type,'origin_code',us.origin_code,
      'document_id',v_document_id,
      'upload',jsonb_build_object(
        'id',us.id,'actor_code',us.actor_code,'origin_type',us.origin_type,
        'origin_code',us.origin_code,'storage_path',us.storage_path,
        'mime_type',us.mime_type,'filename',us.filename,'status',us.status
      )
    );
  end if;

  if v_document_id is null then
    return jsonb_build_object('ok',false,'status',404,'error','legacy_document_version_not_found');
  end if;

  select d.owner_actor_code, e.expediente_code
    into v_owner, v_exp_code
    from fenix_prod.documentos d
    join fenix_prod.expedientes e on e.id=d.expediente_id
   where d.id=v_document_id and e.synthetic=false
   limit 1;
  if v_exp_code is null then
    return jsonb_build_object('ok',false,'status',404,'error','legacy_expediente_not_found');
  end if;
  if v_role <> 'Direccion' and coalesce(v_owner,'') <> p_actor_code then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;

  return jsonb_build_object(
    'ok',true,'status',200,'legacy',true,
    'origin_type','expediente','origin_code',v_exp_code,
    'document_id',v_document_id,
    'upload',jsonb_build_object(
      'id',us.id,'actor_code',us.actor_code,'origin_type',us.origin_type,
      'origin_code',us.origin_code,'storage_path',us.storage_path,
      'mime_type',us.mime_type,'filename',us.filename,'status',us.status
    )
  );
end $$;

create or replace function public.fenix_prod_document_extract_run_upsert_server(
  p_upload_id uuid,
  p_document_id uuid,
  p_expediente_code text,
  p_actor_code text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $$
begin
  insert into fenix_prod.document_intelligence_runs(
    upload_id,document_id,expediente_code,actor_code,status,error,updated_at
  ) values(
    p_upload_id,p_document_id,p_expediente_code,p_actor_code,'processing',null,now()
  )
  on conflict (upload_id) do update set
    document_id=excluded.document_id,
    expediente_code=excluded.expediente_code,
    actor_code=excluded.actor_code,
    status='processing',
    error=null,
    updated_at=now();
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.fenix_prod_document_extract_run_update_server(
  p_upload_id uuid,
  p_status text,
  p_extraction jsonb default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_count int;
begin
  update fenix_prod.document_intelligence_runs
     set status=p_status,
         extraction=coalesce(p_extraction,extraction),
         error=p_error,
         updated_at=now()
   where upload_id=p_upload_id;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok',v_count=1,'updated',v_count);
end $$;

create or replace function public.fenix_prod_document_extract_legacy_status_server(
  p_actor_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  v_total bigint;
  v_counts jsonb;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  select count(*) into v_total
    from fenix_prod.document_upload_sessions
   where status='completed'
     and mime_type in ('application/pdf','image/jpeg','image/png','image/webp')
     and origin_type is null;
  select coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb) into v_counts
    from (select status,count(*)::bigint cnt from fenix_prod.document_intelligence_runs group by status) s;
  return jsonb_build_object('ok',true,'status',200,'total_legacy_files',v_total,'by_status',v_counts);
end $$;

create or replace function public.fenix_prod_document_extract_legacy_candidates_server(
  p_actor_code text,
  p_limit integer default 2
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  v_ids jsonb;
  v_limit int;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then
    return jsonb_build_object('ok',false,'status',403,'error','forbidden');
  end if;
  v_limit := greatest(1,least(coalesce(p_limit,2),2));
  select coalesce(jsonb_agg(id order by created_at),'[]'::jsonb) into v_ids
  from (
    select us.id, us.created_at
      from fenix_prod.document_upload_sessions us
     where us.status='completed'
       and us.mime_type in ('application/pdf','image/jpeg','image/png','image/webp')
       and us.origin_type is null
       and not exists (
         select 1 from fenix_prod.document_intelligence_runs r
          where r.upload_id=us.id and r.status in ('applied','needs_review')
       )
     order by us.created_at
     limit v_limit
  ) q;
  return jsonb_build_object('ok',true,'status',200,'upload_ids',v_ids);
end $$;

revoke all on function public.fenix_prod_document_extract_resolve_server(text,uuid) from public,anon,authenticated;
revoke all on function public.fenix_prod_document_extract_run_upsert_server(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.fenix_prod_document_extract_run_update_server(uuid,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.fenix_prod_document_extract_legacy_status_server(text) from public,anon,authenticated;
revoke all on function public.fenix_prod_document_extract_legacy_candidates_server(text,integer) from public,anon,authenticated;

grant execute on function public.fenix_prod_document_extract_resolve_server(text,uuid) to service_role;
grant execute on function public.fenix_prod_document_extract_run_upsert_server(uuid,uuid,text,text) to service_role;
grant execute on function public.fenix_prod_document_extract_run_update_server(uuid,text,jsonb,text) to service_role;
grant execute on function public.fenix_prod_document_extract_legacy_status_server(text) to service_role;
grant execute on function public.fenix_prod_document_extract_legacy_candidates_server(text,integer) to service_role;
