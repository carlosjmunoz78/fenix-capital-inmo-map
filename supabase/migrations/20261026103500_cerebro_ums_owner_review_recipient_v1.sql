-- CEREBRO UMS owner review recipient resolver V1
-- PREPROD-only migration. Keeps owner email out of repository manifests and jobs.

create or replace function public.cerebro_ums_owner_review_recipient_v1()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_email text;
  v_user_id uuid;
begin
  select u.id, lower(u.email)
    into v_user_id, v_email
  from preprod_test.actors a
  join auth.users u on u.id = a.auth_user_id
  where a.actor_code='CARLOS-ADMIN'
    and a.role='Direccion'
    and a.active=true
    and u.email is not null
  limit 1;

  if v_email is null then
    return jsonb_build_object('ok',false,'error','OWNER_REVIEW_RECIPIENT_NOT_FOUND');
  end if;

  return jsonb_build_object(
    'ok',true,
    'actor_code','CARLOS-ADMIN',
    'auth_user_id',v_user_id,
    'email',v_email
  );
end;
$function$;

revoke all on function public.cerebro_ums_owner_review_recipient_v1() from public;
revoke all on function public.cerebro_ums_owner_review_recipient_v1() from anon;
revoke all on function public.cerebro_ums_owner_review_recipient_v1() from authenticated;
grant execute on function public.cerebro_ums_owner_review_recipient_v1() to service_role;

comment on function public.cerebro_ums_owner_review_recipient_v1()
is 'PREPROD service-only resolver for the CEREBRO owner review recipient; avoids hardcoding personal email in media jobs or repository code.';
