create table if not exists fenix_prod.expediente_stage_history (
  id uuid primary key default gen_random_uuid(),
  expediente_code text not null,
  actor_code text not null,
  from_stage text,
  to_stage text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
revoke all on fenix_prod.expediente_stage_history from anon, authenticated;
grant select, insert on fenix_prod.expediente_stage_history to service_role;

create or replace function public.fenix_prod_exp_stage_server(p_actor_code text,p_exp_code text,p_expected_version int,p_new_stage text)
returns jsonb
language plpgsql
security definer
set search_path='fenix_prod','public','pg_temp'
as $fn$
declare a fenix_prod.actors%rowtype; e fenix_prod.expedientes%rowtype; v_stage text:=trim(coalesce(p_new_stage,''));
begin
 select * into a from fenix_prod.actors where actor_code=p_actor_code and active=true;
 if not found or a.role not in ('Direccion','Financiero') then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 select * into e from fenix_prod.expedientes where expediente_code=p_exp_code for update;
 if not found then return jsonb_build_object('ok',false,'status',404,'error','not_found'); end if;
 if a.role='Financiero' and e.owner_actor_code<>p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
 if e.version<>p_expected_version then return jsonb_build_object('ok',false,'status',409,'error','version_conflict','current_version',e.version,'current_stage',e.stage); end if;
 if v_stage='' or length(v_stage)>80 then return jsonb_build_object('ok',false,'status',400,'error','invalid_stage'); end if;
 if v_stage=e.stage then return jsonb_build_object('ok',true,'status',200,'no_op',true,'stage',e.stage,'version',e.version); end if;
 update fenix_prod.expedientes set stage=v_stage,version=version+1,updated_at=now() where id=e.id;
 insert into fenix_prod.expediente_stage_history(expediente_code,actor_code,from_stage,to_stage,source) values(e.expediente_code,p_actor_code,e.stage,v_stage,'manual');
 return jsonb_build_object('ok',true,'status',200,'stage',v_stage,'version',e.version+1,'source','manual');
end $fn$;
revoke all on function public.fenix_prod_exp_stage_server(text,text,int,text) from public,anon,authenticated;
grant execute on function public.fenix_prod_exp_stage_server(text,text,int,text) to service_role;