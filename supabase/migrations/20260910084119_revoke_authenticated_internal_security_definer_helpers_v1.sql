-- Internal SECURITY DEFINER helpers must not be callable from PostgREST by signed-in users.
revoke execute on function public.fenix_prod_apply_employment_status_from_fields(text,jsonb) from authenticated, anon, public;
revoke execute on function public.fenix_prod_participant_evidence_profile(text,text) from authenticated, anon, public;
revoke execute on function public.fenix_prod_recover_participant_extraction(uuid,text,text,jsonb) from authenticated, anon, public;
revoke execute on function public.fenix_prod_recover_participant_read_failure_trigger() from authenticated, anon, public;
grant execute on function public.fenix_prod_apply_employment_status_from_fields(text,jsonb) to service_role;
grant execute on function public.fenix_prod_participant_evidence_profile(text,text) to service_role;
grant execute on function public.fenix_prod_recover_participant_extraction(uuid,text,text,jsonb) to service_role;
grant execute on function public.fenix_prod_recover_participant_read_failure_trigger() to service_role;
