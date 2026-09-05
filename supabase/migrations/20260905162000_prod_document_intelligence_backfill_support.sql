create table if not exists fenix_prod.document_intelligence_runs (
  upload_id uuid primary key,
  document_id uuid null,
  expediente_code text null,
  actor_code text not null,
  status text not null check (status in ('processing','applied','needs_review','failed')),
  extraction jsonb null,
  error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table fenix_prod.document_intelligence_runs enable row level security;
revoke all on table fenix_prod.document_intelligence_runs from anon, authenticated;
grant select,insert,update,delete on table fenix_prod.document_intelligence_runs to service_role;

create or replace function public.fenix_prod_document_intelligence_fields_server(
  p_actor_code text,
  p_exp_code text,
  p_fields jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public','fenix_prod','pg_temp'
as $$
declare
  v_role text;
  e fenix_prod.expedientes%rowtype;
  v_payload jsonb;
  v_add jsonb := '{}'::jsonb;
  k text;
  v jsonb;
  changed text[] := array[]::text[];
begin
  select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  select * into e from fenix_prod.expedientes where expediente_code=p_exp_code and synthetic=false limit 1;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','expediente_not_found'); end if;
  if v_role='Financiero' and e.owner_actor_code is distinct from p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
  v_payload := coalesce(e.payload_operacion,'{}'::jsonb);
  for k,v in select key,value from jsonb_each(coalesce(p_fields,'{}'::jsonb)) loop
    if k = any(array['nombre','apellidos','documento_identidad','fecha_nacimiento','telefono','email','domicilio','codigo_postal','localidad','provincia','nacionalidad','estado_civil','profesion','empresa','tipo_contrato','antiguedad_laboral','ingresos_netos_mensuales','otros_ingresos_mensuales','cuotas_deuda_mensuales','ahorros','precio_vivienda','importe_solicitado']) then
      if not (v_payload ? k) or v_payload->k is null or v_payload->>k = '' then
        v_add := v_add || jsonb_build_object(k,v);
      end if;
    end if;
  end loop;
  update fenix_prod.expedientes set
    localidad = case when (localidad is null or btrim(localidad)='') and nullif(btrim(p_fields->>'localidad'),'') is not null then btrim(p_fields->>'localidad') else localidad end,
    precio_vivienda = case when precio_vivienda is null and jsonb_typeof(p_fields->'precio_vivienda')='number' then (p_fields->>'precio_vivienda')::numeric else precio_vivienda end,
    importe_solicitado = case when importe_solicitado is null and jsonb_typeof(p_fields->'importe_solicitado')='number' then (p_fields->>'importe_solicitado')::numeric else importe_solicitado end,
    payload_operacion = v_payload || v_add,
    updated_at = now(),
    version = version + 1
  where id=e.id;
  if e.localidad is null and nullif(btrim(p_fields->>'localidad'),'') is not null then changed:=array_append(changed,'localidad'); end if;
  if e.precio_vivienda is null and jsonb_typeof(p_fields->'precio_vivienda')='number' then changed:=array_append(changed,'precio_vivienda'); end if;
  if e.importe_solicitado is null and jsonb_typeof(p_fields->'importe_solicitado')='number' then changed:=array_append(changed,'importe_solicitado'); end if;
  if v_add <> '{}'::jsonb then changed:=changed || array(select jsonb_object_keys(v_add)); end if;
  return jsonb_build_object('ok',true,'status',200,'expediente_code',p_exp_code,'changed',to_jsonb(changed),'payload_added',v_add);
end $$;
revoke all on function public.fenix_prod_document_intelligence_fields_server(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.fenix_prod_document_intelligence_fields_server(text,text,jsonb) to service_role;
