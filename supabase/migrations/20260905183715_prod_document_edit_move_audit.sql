create table if not exists fenix_prod.document_change_history (
  id uuid primary key default gen_random_uuid(), document_code text not null, actor_code text not null,
  action text not null check (action in ('edit','move','edit_move')), from_expediente_code text, to_expediente_code text,
  before_values jsonb not null default '{}'::jsonb, after_values jsonb not null default '{}'::jsonb,
  version_before integer not null, version_after integer not null, created_at timestamptz not null default now()
);
alter table fenix_prod.document_change_history enable row level security;
revoke all on fenix_prod.document_change_history from public, anon, authenticated;
grant all on fenix_prod.document_change_history to service_role;

create or replace function public.fenix_prod_document_edit_server(p_actor_code text,p_document_code text,p_expected_version integer,p_title text default null,p_tipo text default null,p_sensibilidad text default null,p_estado text default null,p_calidad text default null,p_new_expediente_code text default null) returns jsonb language plpgsql security definer set search_path to 'public','fenix_prod','pg_temp' as $function$
declare v_role text; d fenix_prod.documentos%rowtype; target_exp fenix_prod.expedientes%rowtype; old_exp_code text; new_exp_code text; before_j jsonb; after_j jsonb; action_kind text:='edit';
begin
 select role into v_role from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
 if coalesce(v_role,'') not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into d from fenix_prod.documentos where document_code=p_document_code for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
 if v_role='Financiero' and d.owner_actor_code<>p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if d.current_version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',d.current_version); end if;
 if d.expediente_id is not null then select expediente_code into old_exp_code from fenix_prod.expedientes where id=d.expediente_id; end if; new_exp_code:=old_exp_code;
 if nullif(trim(coalesce(p_new_expediente_code,'')),'') is not null and p_new_expediente_code is distinct from old_exp_code then
  if v_role<>'Direccion' then return jsonb_build_object('ok',false,'status',403,'error','move_requires_direction'); end if;
  select * into target_exp from fenix_prod.expedientes where expediente_code=p_new_expediente_code limit 1;
  if not found then return jsonb_build_object('ok',false,'status',404,'error','target_expediente_not_found'); end if;
  new_exp_code:=target_exp.expediente_code; action_kind:='move';
 end if;
 before_j:=jsonb_build_object('title',d.title,'tipo',d.tipo,'sensibilidad',d.sensibilidad,'estado',d.estado,'calidad',d.calidad,'expediente_code',old_exp_code,'owner_actor_code',d.owner_actor_code);
 update fenix_prod.documentos set title=coalesce(nullif(trim(p_title),''),title),tipo=coalesce(nullif(trim(p_tipo),''),tipo),sensibilidad=coalesce(nullif(trim(p_sensibilidad),''),sensibilidad),estado=coalesce(nullif(trim(p_estado),''),estado),calidad=coalesce(nullif(trim(p_calidad),''),calidad),expediente_id=case when new_exp_code is distinct from old_exp_code then target_exp.id else expediente_id end,owner_actor_code=case when new_exp_code is distinct from old_exp_code then target_exp.owner_actor_code else owner_actor_code end,current_version=current_version+1,updated_at=now() where id=d.id returning * into d;
 after_j:=jsonb_build_object('title',d.title,'tipo',d.tipo,'sensibilidad',d.sensibilidad,'estado',d.estado,'calidad',d.calidad,'expediente_code',new_exp_code,'owner_actor_code',d.owner_actor_code);
 if action_kind='move' and before_j - 'expediente_code' is distinct from after_j - 'expediente_code' then action_kind:='edit_move'; end if;
 insert into fenix_prod.document_change_history(document_code,actor_code,action,from_expediente_code,to_expediente_code,before_values,after_values,version_before,version_after) values(p_document_code,p_actor_code,action_kind,old_exp_code,new_exp_code,before_j,after_j,p_expected_version,d.current_version);
 return jsonb_build_object('ok',true,'status',200,'document_code',p_document_code,'current_version',d.current_version,'document',jsonb_build_object('document_code',d.document_code,'title',d.title,'tipo',d.tipo,'sensibilidad',d.sensibilidad,'estado',d.estado,'calidad',d.calidad,'current_version',d.current_version,'scope_type',case when d.expediente_id is not null then 'expediente' when d.inmobiliaria_id is not null then 'inmobiliaria' else 'general' end,'scope_code',new_exp_code,'updated_at',d.updated_at));
end $function$;
revoke all on function public.fenix_prod_document_edit_server(text,text,integer,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.fenix_prod_document_edit_server(text,text,integer,text,text,text,text,text,text) to service_role;
