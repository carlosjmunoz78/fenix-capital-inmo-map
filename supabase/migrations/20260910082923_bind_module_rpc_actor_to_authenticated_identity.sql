-- Shared identity guard used by authenticated PROD RPCs.
create or replace function public.fenix_prod_actor_binding_guard(p_actor_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'fenix_prod', 'public', 'pg_temp'
as $function$
declare c jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok',false,'status',401,'error','unauthorized');
  end if;
  c:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
  if not coalesce((c->>'ok')::boolean,false) then
    return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked');
  end if;
  if c->>'actor_code' is distinct from p_actor_code then
    return jsonb_build_object('ok',false,'status',403,'error','actor_mismatch');
  end if;
  return jsonb_build_object('ok',true,'status',200,'actor_code',c->>'actor_code','role',c->>'role','zone_code',c->>'zone_code');
end $function$;

revoke all on function public.fenix_prod_actor_binding_guard(text) from public, anon, authenticated;
grant execute on function public.fenix_prod_actor_binding_guard(text) to service_role;
