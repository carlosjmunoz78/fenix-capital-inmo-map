-- CEREBRO OS · Remaining SECURITY DEFINER read wrappers
-- PREPARED ON PARALLEL BRANCH ONLY. NOT APPLIED TO PROD.
-- Exact-parity strategy: resolve actor -> set transaction-local JWT subject -> call existing user RPC.
-- This preserves current semantics while moving invocation behind service_role-only wrappers.

begin;

create or replace function public.fenix_prod_ana_knowledge_answer_server(
  p_actor_code text,
  p_question text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_ana_knowledge_answer_user(p_question);
end $$;

create or replace function public.fenix_prod_chat_conversations_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_conversations_user();
end $$;

create or replace function public.fenix_prod_chat_list_v2_server(
  p_actor_code text,
  p_conversation_code text,
  p_limit integer default 100
) returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_list_v2_user(p_conversation_code,p_limit);
end $$;

create or replace function public.fenix_prod_chat_people_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_people_user();
end $$;

create or replace function public.fenix_prod_profile_get_full_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_profile_get_user();
end $$;

create or replace function public.fenix_prod_profile_socials_get_server(p_actor_code text)
returns jsonb language plpgsql stable security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$
declare v_auth_user_id uuid;
begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_profile_socials_get_user();
end $$;

revoke all on function public.fenix_prod_ana_knowledge_answer_server(text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_conversations_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_list_v2_server(text,text,integer) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_people_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_get_full_server(text) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_socials_get_server(text) from public, anon, authenticated;

grant execute on function public.fenix_prod_ana_knowledge_answer_server(text,text) to service_role;
grant execute on function public.fenix_prod_chat_conversations_server(text) to service_role;
grant execute on function public.fenix_prod_chat_list_v2_server(text,text,integer) to service_role;
grant execute on function public.fenix_prod_chat_people_server(text) to service_role;
grant execute on function public.fenix_prod_profile_get_full_server(text) to service_role;
grant execute on function public.fenix_prod_profile_socials_get_server(text) to service_role;

commit;

-- No direct authenticated RPC is revoked here.
-- Promotion gate: syntax/behavior tests -> apply wrappers -> Gateway routes -> authenticated HTTP parity -> only then retire corresponding *_user EXECUTE.
