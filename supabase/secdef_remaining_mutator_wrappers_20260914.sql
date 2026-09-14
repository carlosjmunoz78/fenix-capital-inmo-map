-- CEREBRO OS · Remaining SECURITY DEFINER mutator wrappers
-- PREPARED ON PARALLEL BRANCH ONLY. NOT APPLIED TO PROD.
-- Exact-parity strategy: resolve actor -> set transaction-local JWT subject -> call existing user RPC.
-- No direct authenticated EXECUTE is revoked by this file.

begin;

create or replace function public.fenix_prod_chat_attachment_add_server(
  p_actor_code text,
  p_message_code text,
  p_storage_path text,
  p_filename text,
  p_mime_type text,
  p_size_bytes bigint
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_attachment_add_user(p_message_code,p_storage_path,p_filename,p_mime_type,p_size_bytes);
end $$;

create or replace function public.fenix_prod_chat_attachment_add_v2_server(
  p_actor_code text,
  p_message_code text,
  p_storage_path text,
  p_filename text,
  p_mime_type text,
  p_size_bytes bigint
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_attachment_add_v2_user(p_message_code,p_storage_path,p_filename,p_mime_type,p_size_bytes);
end $$;

create or replace function public.fenix_prod_chat_conversation_create_server(
  p_actor_code text,
  p_member_actor_codes text[],
  p_title text default null
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_conversation_create_user(p_member_actor_codes,p_title);
end $$;

create or replace function public.fenix_prod_chat_group_create_server(
  p_actor_code text,
  p_member_actor_codes text[],
  p_title text
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_group_create_user(p_member_actor_codes,p_title);
end $$;

create or replace function public.fenix_prod_chat_send_v2_server(
  p_actor_code text,
  p_conversation_code text,
  p_body text,
  p_idempotency_key text
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_chat_send_v2_user(p_conversation_code,p_body,p_idempotency_key);
end $$;

create or replace function public.fenix_prod_contact_create_v2_server(
  p_actor_code text,
  p_tipo text,
  p_nombre text,
  p_apellidos text default null,
  p_email text default null,
  p_telefono text default null,
  p_emails jsonb default '[]'::jsonb,
  p_telefonos jsonb default '[]'::jsonb,
  p_cargo text default null,
  p_entidad_id text default null,
  p_observaciones text default null,
  p_consentimiento_comercial boolean default false
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_contact_create_v2(p_tipo,p_nombre,p_apellidos,p_email,p_telefono,p_emails,p_telefonos,p_cargo,p_entidad_id,p_observaciones,p_consentimiento_comercial);
end $$;

create or replace function public.fenix_prod_inmo_followup_update_v1_server(
  p_actor_code text,
  p_inmobiliaria_code text,
  p_expected_version integer,
  p_notas text default null,
  p_proximo_contacto date default null
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_inmo_followup_update_v1(p_inmobiliaria_code,p_expected_version,p_notas,p_proximo_contacto);
end $$;

create or replace function public.fenix_prod_profile_socials_update_server(
  p_actor_code text,
  p_socials jsonb
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_profile_socials_update_user(p_socials);
end $$;

create or replace function public.fenix_prod_profile_update_full_server(
  p_actor_code text,
  p_profile jsonb
) returns jsonb language plpgsql security definer
set search_path = public, fenix_prod, auth, pg_temp
as $$ declare v_auth_user_id uuid; begin
  select auth_user_id into v_auth_user_id from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
  if v_auth_user_id is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  perform set_config('request.jwt.claim.sub',v_auth_user_id::text,true);
  return public.fenix_prod_profile_update_user(p_profile);
end $$;

revoke all on function public.fenix_prod_chat_attachment_add_server(text,text,text,text,text,bigint) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_attachment_add_v2_server(text,text,text,text,text,bigint) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_conversation_create_server(text,text[],text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_group_create_server(text,text[],text) from public, anon, authenticated;
revoke all on function public.fenix_prod_chat_send_v2_server(text,text,text,text) from public, anon, authenticated;
revoke all on function public.fenix_prod_contact_create_v2_server(text,text,text,text,text,text,jsonb,jsonb,text,text,text,boolean) from public, anon, authenticated;
revoke all on function public.fenix_prod_inmo_followup_update_v1_server(text,text,integer,text,date) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_socials_update_server(text,jsonb) from public, anon, authenticated;
revoke all on function public.fenix_prod_profile_update_full_server(text,jsonb) from public, anon, authenticated;

grant execute on function public.fenix_prod_chat_attachment_add_server(text,text,text,text,text,bigint) to service_role;
grant execute on function public.fenix_prod_chat_attachment_add_v2_server(text,text,text,text,text,bigint) to service_role;
grant execute on function public.fenix_prod_chat_conversation_create_server(text,text[],text) to service_role;
grant execute on function public.fenix_prod_chat_group_create_server(text,text[],text) to service_role;
grant execute on function public.fenix_prod_chat_send_v2_server(text,text,text,text) to service_role;
grant execute on function public.fenix_prod_contact_create_v2_server(text,text,text,text,text,text,jsonb,jsonb,text,text,text,boolean) to service_role;
grant execute on function public.fenix_prod_inmo_followup_update_v1_server(text,text,integer,text,date) to service_role;
grant execute on function public.fenix_prod_profile_socials_update_server(text,jsonb) to service_role;
grant execute on function public.fenix_prod_profile_update_full_server(text,jsonb) to service_role;

commit;

-- Promotion gate: apply wrappers in controlled DB migration, add Gateway routes, run OLD-vs-NEW parity and authenticated HTTP E2E, then revoke direct authenticated EXECUTE one capability at a time.