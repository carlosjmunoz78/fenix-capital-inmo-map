-- Roll back only CEREBRO bootstrap tier V1 objects.
-- Preserve Company Registry, onboarding, SCAN and post-SCAN durable state.

drop function if exists public.cerebro_bootstrap_tier_status_preprod(text,text);
drop function if exists public.cerebro_bootstrap_tier_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text);
drop table if exists public.cerebro_bootstrap_tier_run_preprod;
