-- Roll back only CEREBRO Marketing + CRM bootstrap V1 objects.
-- Preserve Company Registry, onboarding, SCAN, post-SCAN and bootstrap-tier durable state.

drop function if exists public.cerebro_marketing_crm_bootstrap_status_preprod(text,text);
drop function if exists public.cerebro_marketing_crm_bootstrap_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text);
drop table if exists public.cerebro_marketing_crm_bootstrap_run_preprod;
