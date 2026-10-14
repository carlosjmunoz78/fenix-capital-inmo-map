-- Roll back only CEREBRO final onboarding chain V1 objects.
-- Preserve Company Registry, onboarding, SCAN, post-SCAN, bootstrap-tier and Marketing/CRM durable state.

drop function if exists public.cerebro_final_onboarding_status_preprod(text,text);
drop function if exists public.cerebro_final_onboarding_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text);
drop table if exists public.cerebro_final_onboarding_run_preprod;
