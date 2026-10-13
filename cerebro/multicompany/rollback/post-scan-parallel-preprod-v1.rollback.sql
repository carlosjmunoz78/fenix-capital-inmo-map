-- Exact schema rollback for CEREBRO post-SCAN parallel durable execution V1.
-- Bounded to objects created by 20261013101500_cerebro_post_scan_parallel_preprod_v1.sql.
-- Existing Company Registry / COMP-ONB / SCAN / engine-state objects are preserved.

drop function if exists public.cerebro_post_scan_parallel_status_preprod(text,text);
drop function if exists public.cerebro_post_scan_audit_record_preprod(text,text,text,timestamptz,text,text,integer,integer,text,text,text);
drop table if exists public.cerebro_post_scan_audit_run_preprod;
