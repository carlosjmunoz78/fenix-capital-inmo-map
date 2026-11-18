# CEREBRO · Supabase activity v8 candidate (not deployed)

Immutable baseline: Supabase `cerebro-console-activity-v0`, version **7**, `verify_jwt=true`, original source below `backup/cerebro-console-activity-v7-index.ts`. The baseline SHA256 from Supabase metadata was `72c99c22bafa4e0a6a26057dbd87145f7a9bc8eb4b4f8ee1ab92744c52f30410`.

Reason: the existing 20-minute GitHub Actions snapshot can expire when schedule/workflow_run does not refresh. When stale or unreachable, a public GitHub REST API **read-only single page** fallback obtains live workflow run metadata (no token or secret). The same owner-only auth `withSupabase({auth:"user"})`, CARLOS-ADMIN RPC check, strict origin, read-only GET, rate-limit-sensitive fail-closed behavior and cache are preserved.

No claim about precise global run counts, agents or engine links: fallback reports a lower bound from a single page and only canonical GitHub workflow URLs. If GitHub's public API is also unavailable or rate-limited, keep HTTP 503 and expose `SNAPSHOT_STALE_AND_PUBLIC_API_UNAVAILABLE`. UI must mark this DEGRADED.

Files to deploy together to the existing Edge Function: `index.ts` + `public-github-fallback.mjs`. Verify JWT remains TRUE. Never deploy before static/build tests and reversible rollback. Revert by deploying `backup/cerebro-console-activity-v7-index.ts` as `index.ts` with no fallback import.

Known run recovery: GitHub Actions `44272965727` SUCCESS generated snapshot at `2026-11-18T09:07:47.055Z`. This does not establish continuous SLA.

Cost objective 0€; no new project, Worker, DB or subscription.
