-- CEREBRO Creative Pipeline V1 rollback
-- Purpose: fail closed without deleting jobs, assets, or evidence.
-- Re-enable by reapplying the grants in the canonical creative migrations.

begin;

revoke execute on function public.cerebro_creative_enqueue_v1(jsonb) from service_role;
revoke execute on function public.cerebro_creative_lease_v1(text,integer) from service_role;
revoke execute on function public.cerebro_creative_complete_v1(uuid,uuid,text,text,jsonb,jsonb,text) from service_role;
revoke all on table public.cerebro_creative_job_v1 from service_role;

commit;
