-- Exact rollback for CEREBRO SCAN-001 durable PREPROD persistence V1.
-- Bounded to objects created by 20261013093000_cerebro_scan001_preprod_persistence_v1.sql.
-- Existing Company Registry / COMP-ONB / engine-state tables are preserved.

drop function if exists public.cerebro_scan001_latest_get_preprod(text,text);
drop function if exists public.cerebro_scan001_record_success_preprod(text,text,text,timestamptz,text,text,integer,boolean,boolean,integer,integer,integer,integer,text,text);
drop table if exists public.cerebro_scan001_run_preprod;
