-- Explicit rollback for CEREBRO Browser 1 Phase 3 V0 only.
-- Does not touch Browser V1/V2.
drop table if exists public.cerebro_browser_event_v3;
drop table if exists public.cerebro_browser_control_v3;
drop table if exists public.cerebro_browser_session_v3;
