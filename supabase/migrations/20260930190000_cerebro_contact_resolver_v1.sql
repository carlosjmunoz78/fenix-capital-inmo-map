create table if not exists fenix_prod.cerebro_contact_aliases(
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null,
  source text not null,
  active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(display_name,email,source)
);
alter table fenix_prod.cerebro_contact_aliases enable row level security;

insert into fenix_prod.cerebro_contact_aliases(display_name,email,source,active,verified_at)
values('Belén Amor','bmjimenezdominguez@gmail.com','GOOGLE_CONTACTS_VERIFIED',true,now())
on conflict(display_name,email,source) do update set active=true, verified_at=excluded.verified_at;

create or replace function public.fenix_prod_cerebro_contact_search_server(p_actor_code text,p_query text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','fenix_prod','pg_temp'
as $function$
declare
  v_role text;
  q text;
  items jsonb;
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role <> 'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  q:=lower(trim(coalesce(p_query,'')));
  if q='' then return jsonb_build_object('ok',false,'status',400,'error','missing_query'); end if;

  with candidates as (
    select display_name as name,email,source,1 as priority
    from fenix_prod.cerebro_contact_aliases
    where active=true and email<>'' and lower(display_name) like '%'||q||'%'
    union all
    select trim(concat_ws(' ',nombre,apellidos)) as name,email,'CRM_CLIENTES' as source,2
    from fenix_prod.clientes
    where active=true and synthetic=false and coalesce(email,'')<>''
      and lower(trim(concat_ws(' ',nombre,apellidos))) like '%'||q||'%'
    union all
    select nombre as name,email_directo as email,'PERSONAL_DIRECTORIO' as source,3
    from fenix_prod.personal_directorio
    where activo=true and coalesce(email_directo,'')<>'' and lower(nombre) like '%'||q||'%'
  ), dedup as (
    select distinct on(lower(email)) name,email,source,priority
    from candidates
    order by lower(email),priority
  )
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'email',email,'source',source) order by priority,name),'[]'::jsonb)
  into items from dedup;

  return jsonb_build_object('ok',true,'status',200,'items',items,'count',jsonb_array_length(items));
end
$function$;

revoke all on function public.fenix_prod_cerebro_contact_search_server(text,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_cerebro_contact_search_server(text,text) to service_role;
