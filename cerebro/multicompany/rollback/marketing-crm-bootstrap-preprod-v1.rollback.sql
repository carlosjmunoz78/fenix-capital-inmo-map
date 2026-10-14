-- Roll back only MKTBOOT-001 / CRMBOOT-001 V1 persistence objects.
-- Preserve registry, onboarding, SCAN, post-SCAN and knowledge/SEO/social bootstrap state.

drop function if exists public.cerebro_marketing_crm_bootstrap_status_preprod(text,text);
drop function if exists public.cerebro_marketing_crm_bootstrap_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text);
drop table if exists public.cerebro_marketing_crm_bootstrap_run_preprod;
