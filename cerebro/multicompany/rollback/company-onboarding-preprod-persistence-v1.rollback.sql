-- Exact rollback for durable Company Onboarding PREPROD persistence V1.
-- Bounded to objects created by 20261013083000_cerebro_company_onboarding_preprod_persistence_v1.sql.

drop function if exists public.cerebro_company_engine_states_get_preprod(text,text);
drop function if exists public.cerebro_company_onboarding_get_preprod(text,text);
drop function if exists public.cerebro_company_onboarding_start_preprod(text,text,text,text,text,text);
drop table if exists public.cerebro_company_onboarding_history_preprod;
drop table if exists public.cerebro_company_engine_state_preprod;
drop table if exists public.cerebro_company_onboarding_preprod;
