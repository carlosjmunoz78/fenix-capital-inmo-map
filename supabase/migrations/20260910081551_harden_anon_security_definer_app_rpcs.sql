-- Source-control snapshot of PROD hardening applied 2026-09-10.
-- Sensitive SECURITY DEFINER application RPCs must never be executable by anon/PUBLIC.

revoke execute on function public.fenix_prod_exp_people_server(text,text) from public, anon;
revoke execute on function public.fenix_prod_exp_create(text,text,text,text,text,numeric,numeric,numeric) from public, anon;
revoke execute on function public.fenix_prod_exp_update(text,text,bigint,jsonb) from public, anon;
revoke execute on function public.fenix_prod_exp_stage_server(text,text,bigint,text) from public, anon;
revoke execute on function public.fenix_prod_exp_person_create_server(text,text,jsonb) from public, anon;
revoke execute on function public.fenix_prod_contact_create(text,text,text,text,text,text,text,jsonb) from public, anon;
revoke execute on function public.fenix_prod_contact_update(text,text,bigint,jsonb) from public, anon;
revoke execute on function public.fenix_prod_contact_lists_server(text) from public, anon;
revoke execute on function public.fenix_prod_contact_list_save(text,text,text,text) from public, anon;
revoke execute on function public.fenix_prod_contact_list_delete(text,text) from public, anon;
revoke execute on function public.fenix_prod_sign_create(text,text,text,text,timestamptz,text,text) from public, anon;
revoke execute on function public.fenix_prod_sign_update(text,text,bigint,jsonb) from public, anon;
revoke execute on function public.fenix_prod_expediente_consistency_server(text,text) from public, anon;

-- Authenticated/service execution is granted only on RPCs that are intentionally browser/server callable.
grant execute on function public.fenix_prod_exp_people_server(text,text) to authenticated, service_role;
grant execute on function public.fenix_prod_exp_create(text,text,text,text,text,numeric,numeric,numeric) to authenticated, service_role;
grant execute on function public.fenix_prod_exp_update(text,text,bigint,jsonb) to authenticated, service_role;
grant execute on function public.fenix_prod_exp_stage_server(text,text,bigint,text) to authenticated, service_role;
grant execute on function public.fenix_prod_exp_person_create_server(text,text,jsonb) to authenticated, service_role;
grant execute on function public.fenix_prod_contact_create(text,text,text,text,text,text,text,jsonb) to authenticated, service_role;
grant execute on function public.fenix_prod_contact_update(text,text,bigint,jsonb) to authenticated, service_role;
grant execute on function public.fenix_prod_contact_lists_server(text) to authenticated, service_role;
grant execute on function public.fenix_prod_contact_list_save(text,text,text,text) to authenticated, service_role;
grant execute on function public.fenix_prod_contact_list_delete(text,text) to authenticated, service_role;
grant execute on function public.fenix_prod_sign_create(text,text,text,text,timestamptz,text,text) to authenticated, service_role;
grant execute on function public.fenix_prod_sign_update(text,text,bigint,jsonb) to authenticated, service_role;
grant execute on function public.fenix_prod_expediente_consistency_server(text,text) to authenticated, service_role;
