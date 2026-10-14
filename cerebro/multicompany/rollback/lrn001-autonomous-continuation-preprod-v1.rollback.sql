-- Exact rollback for CEREBRO LRN-001 multi-company autonomous continuation PREPROD V1.
-- Removes only objects introduced by this bounded receipt layer.

drop function if exists public.cerebro_lrn001_status_preprod(text,text);
drop function if exists public.cerebro_lrn001_record_preprod(text,text,timestamptz,integer,text,text,text,text,numeric,numeric,boolean,text,text,text,text,text,text,text);
drop table if exists public.cerebro_lrn001_continuation_preprod;
