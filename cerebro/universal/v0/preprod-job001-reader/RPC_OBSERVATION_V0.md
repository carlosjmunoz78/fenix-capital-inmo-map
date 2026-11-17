# CEREBRO JOB-001 · Postgres RPC observation V0

New isolated Supabase PREPROD read-only SQL function, not cron, queue or executor. Returns only PostgREST normalized SQL RPC invocation attempts since pg_stat_statements last reset for the existing JOB001 dispatch function. Does not expose query text, caller identity, payloads, or runtime results.

Hostinger master attribution is independently observed in Supabase Edge logs: 1,725 POST over previous 24 hours on Nov 13 20:20 UTC, 1,723 HTTP200, 2 HTTP500, HTTP User Agent CEREBRO-JOB-001-Hostinger-Master/0.1. The SQL observation itself does not identify Hostinger and cannot certify downstream completion.

Pre-change snapshot 79,993 cumulative SQL RPC calls, stats_reset_at 2026-08-14T16:57:07Z, 1 matching statement. Reset or new query normalization invalidates historical comparisons.

Private SECURITY DEFINER empty search_path and public SECURITY INVOKER wrapper; both only grant service_role. No existing function, table, queue or schedule modified. Rollback: stop using sidecar RPC and drop newly added wrapper then private function after dependency inventory.