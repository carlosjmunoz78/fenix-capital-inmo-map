create or replace function public.fenix_prod_sign_list_server(p_actor_code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'fenix_prod','public','pg_temp'
as $function$
declare r text; data jsonb; g jsonb; begin
g:=public.fenix_prod_actor_binding_guard(p_actor_code); if not coalesce((g->>'ok')::boolean,false) then return g; end if; r:=g->>'role';
if r='Visitador' then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
select coalesce(jsonb_agg((to_jsonb(f)-'id'-'synthetic') order by f.firma_code),'[]'::jsonb) into data from fenix_prod.firmas f where r='Direccion' or (r='Financiero' and f.owner_actor_code=p_actor_code);
return jsonb_build_object('ok',true,'status',200,'contract_version',3,'firmas',data,'items',data); end $function$;
