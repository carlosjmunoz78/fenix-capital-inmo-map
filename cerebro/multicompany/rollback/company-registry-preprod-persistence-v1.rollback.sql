-- Exact rollback for CEREBRO durable Company Registry PREPROD persistence V1.
-- Scope is limited to objects created by 20261013075000_cerebro_company_registry_preprod_persistence_v1.sql.

drop function if exists public.cerebro_company_tenant_boundary_check_preprod(text,text);
drop function if exists public.cerebro_company_registry_get_preprod(text);
drop function if exists public.cerebro_company_register_preprod(text,text,text,text,text);
drop table if exists public.cerebro_company_registry_history_preprod;
drop table if exists public.cerebro_company_registry_preprod;
