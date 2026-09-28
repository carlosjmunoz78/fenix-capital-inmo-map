# JOB-001 · Wave 1 · Evidence snapshot 2026-09-28

Status: HOSTINGER_SHADOW_ACTIVE / NO CUT-OVER
Scope: FENIX_CAPITAL · SEO-001 · PREPROD

## Live 24h scheduler evidence

A read-only query of `cron.job_run_details` was compared with the eight Wave 1 schedules.

| Legacy job | Expected | Actual | Succeeded | Failed | Parity |
|---|---:|---:|---:|---:|---|
| 2 | 1 | 1 | 1 | 0 | GREEN |
| 6 | 96 | 96 | 96 | 0 | GREEN |
| 7 | 96 | 96 | 96 | 0 | GREEN |
| 10 | 48 | 48 | 48 | 0 | GREEN |
| 12 | 96 | 96 | 96 | 0 | GREEN |
| 13 | 96 | 96 | 96 | 0 | GREEN |
| 16 | 49 | 49 | 49 | 0 | GREEN |
| 21 | 48 | 48 | 48 | 0 | GREEN |

All eight jobs matched their expected firing count in the observed 24-hour window and every observed run succeeded.

## Hostinger runtime evidence

The existing paid Hostinger account now provides a verified zero-additional-cost external runtime path.

Live evidence:
- SSH access confirmed.
- PHP CLI confirmed.
- Physical script path confirmed at `/home/u497370767/domains/fenixcapital.es/cerebro/job001_wp_bridge_canary_FIXED.php`.
- Manual execution returned HTTP 200 and `ok:true`.
- Log redirection works.
- hPanel produced a fresh automatic canary result with HTTP 200 and `ok:true`.
- final shadow schedule normalized to exactly one `*/15 * * * *` entry because the hPanel UI created overlapping entries during testing.

Legacy Supabase pg_cron job 13 remains ON.

## Current legacy evidence for job 13

Fresh read-only evidence from `cron.job_run_details` shows job 13 continuing to succeed at:
- 09:03 UTC
- 09:18 UTC
- 09:33 UTC
- 09:48 UTC

All returned `succeeded`.

The bridge-health reconciliation table also continues to receive HTTP 200 observations. The current WordPress payload reports `ok:false` / `state=NOT_READY` because the Core Guard response itself is in observer/not-ready state, while transport and endpoint availability are healthy. This is not a scheduler failure.

## Wave 1 dependency classification

| Job | Legacy cadence | Current implementation | Externalization class | Next gate |
|---|---|---|---|---|
| 2 | weekly | direct HTTP POST to PREPROD Edge Function using Vault secret | B · scheduler-only first | external credential reference + idempotency |
| 6 | 15 min | direct HTTP POST to PREPROD Edge Function using Vault secret | B · scheduler-only first | external credential reference + idempotency |
| 7 | 15 min | DB dispatcher selects active city, then Edge Function | C · DB-coupled | extract selection/data contract before offload |
| 10 | 30 min | DB dispatcher selects downloadable, then Edge Function | C · DB-coupled | extract selection/data contract before offload |
| 12 | 15 min | DB dispatcher mutates/bootstrap-checks DB, then Edge Function | D · stateful DB-coupled | preserve idempotency + transactional contract |
| 13 | 15 min | GET WordPress status + health evidence | A · external-friendly | complete shadow observation + evidence parity |
| 16 | 30 min | DB dispatcher selects city/asset, then Edge Function | C · DB-coupled | extract selection/data contract before offload |
| 21 | 30 min | DB dispatcher selects landing/mobile state, then Edge Function | C · DB-coupled | extract selection/data contract before offload |

## Decision

Do **not** bulk-disable the eight pg_cron jobs.

Migration order:
1. finish job 13 shadow validation;
2. prepare jobs 2 and 6 as scheduler-only external adapters with externalized secret reference;
3. wrap jobs 7/10/16/21 behind stable data contracts so Hostinger does not need direct database credentials;
4. handle job 12 last because it contains stateful database logic;
5. only after measured OLD-vs-NEW parity, introduce one-at-a-time cut-over with tested rollback.

No Supabase compute saving is claimed yet. Hostinger currently proves the runtime path; PREPROD remains active and authoritative.
