-- CEREBRO Browser 1 Phase 2 rebuild closure: barrier ACL.
revoke all on table public.cerebro_browser_barrier_v2 from public, anon, authenticated;
grant select, insert, update, delete on table public.cerebro_browser_barrier_v2 to service_role;
