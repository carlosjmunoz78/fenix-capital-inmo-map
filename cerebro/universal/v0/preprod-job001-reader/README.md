# JOB-001 · Existing PREPROD control metadata · LAB read-only

Isolation: new side-by-side Edge Function `cerebro-operativa-job001-read-lab-v0`, **only** in Supabase project `hnqlnvakzaywtafeiybt`. Do not replace existing `cerebro-job001-gateway-preprod`.

Authentication: owner session from existing real Supabase Auth is resolved via PROD `fenix-app-gateway/session/context` GET; requires `CARLOS-ADMIN`, scope `fenix` + `LAB`. Production server used as identity provider only; it is not modified. Browser clients call the Vercel preview owner-authenticated Gateway, which proxies this read-only function. There are no CORS grants or public write APIs.

Queries: bounded SELECTs on existing PREPROD tables `cerebro_job001_control_preprod`, `cerebro_external_job_control_preprod`, `cerebro_company_engine_state_preprod` and count-only `cerebro_job001_telemetry_preprod`. No legacy scheduler secret, no cron dispatch or RPC, no writes. All rows are provenance-labelled PREPROD and stale if older than 24h. `enabled:true` is CONFIG, never proof of a running job.

Existing evidence as of 2026-11-13: 20 job controls (all SEO-001, FENIX_CAPITAL, PREPROD, v0), 2 external controls (both disabled), 17 company engine declarations (fenix, PREPROD, v1.0.0) and 0 telemetry rows. Control changes last seen 2026-09-28 and engine states 2026-10-13; NOT runtime freshness evidence.

Promotion: blocked until physically verified owner E2E, traceable runtime evidence, durable audit, backup and rollback, policy and cost gate. This is not a new queue; do not call it a live JOB-001 executor.
