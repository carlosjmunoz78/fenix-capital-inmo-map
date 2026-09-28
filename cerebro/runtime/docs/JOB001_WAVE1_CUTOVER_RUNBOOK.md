# JOB-001 · Wave 1 cut-over runbook

Status: PREPARED / FAIL-CLOSED
Date: 2026-09-28
Scope: FENIX_CAPITAL · SEO-001 · PREPROD
Additional subscription cost: 0 EUR

## Architecture

Hostinger runs one master cron every minute. The PHP master scheduler preserves the exact legacy minute offsets internally and dispatches only job IDs present in `job001_enabled_jobs.json`.

Hostinger never receives the Supabase service-role key and never receives the legacy `FENIX CEREBRO PREPROD` cron secret.

Hostinger calls only:

`https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-job001-gateway-preprod`

using a dedicated JOB-001 PREPROD gateway secret.

The gateway:
- accepts only POST;
- validates a SHA-256 of the dedicated gateway secret;
- allowlists jobs 2, 6, 7, 10, 12, 13, 16 and 21;
- supports `dry_run:true` without dispatch;
- uses service-role internally to call `public.cerebro_job001_dispatch_preprod(integer)`.

The database dispatcher is executable only by `service_role`; `anon` and `authenticated` have no EXECUTE privilege.

## Live evidence

- gateway Edge Function version 1 is ACTIVE;
- dry-run request for job 13 returned HTTP 200, `ok:true`, `state:DRY_RUN`, `dispatch:false`;
- RPC privileges: anon=false, authenticated=false, service_role=true;
- legacy job 13 rollback toggle was exercised transactionally and restored active=true;
- no legacy cron was left disabled;
- no customer communication or stateful Wave 1 job was double-executed during preparation.

## Hostinger master scheduler files

- `job001_master_scheduler.php`
- `job001_enabled_jobs.json`
- local secret file: `secrets/cerebro_job001_gateway_preprod.secret` (never commit)
- audit log: `job001_master_scheduler.log`
- idempotency/minute state: `job001_master_scheduler_state.json`
- lock: `job001_master_scheduler.lock`

Default allowlist is empty, so installation is fail-closed.

Hostinger cron:

`* * * * *`

Command:

`/usr/bin/php /home/u497370767/domains/fenixcapital.es/cerebro/job001_master_scheduler.php`

## Exact migration order

1. job 13 — WP bridge probe.
2. job 2 — weekly SEO orchestrator.
3. job 7 — page-quality probe.
4. job 10 — downloadable QA.
5. job 16 — conversion E2E.
6. job 21 — mobile QA.
7. job 6 — growth email worker.
8. job 12 — lead magnet builder.

Jobs 6 and 12 remain last because they have higher side-effect/state risk.

## Per-job cut-over protocol

For each job:

1. Snapshot live `cron.job` row and recent `cron.job_run_details`.
2. Add exactly one job ID to Hostinger allowlist.
3. Disable exactly that legacy pg_cron job with `cron.alter_job(... active := false)`.
4. Observe the next due Hostinger run.
5. Verify HTTP/gateway result plus job-specific downstream evidence.
6. If red: remove job ID from Hostinger allowlist and immediately reactivate legacy pg_cron.
7. If green: leave legacy row present but inactive for rollback until the full Wave 1 observation window closes.
8. Do not migrate the next job until current evidence is green.

## Rollback

Database rollback for a legacy job:

`select cron.alter_job(job_id := <ID>, active := true);`

Hostinger rollback:
- remove the job ID from `enabled_job_ids`.

The legacy cron definition is preserved; no unschedule/delete is required.

## Cost conclusion

This migration removes scheduler responsibility from pg_cron but does not by itself eliminate PREPROD database compute. Supabase savings may only be claimed if later evidence proves the PREPROD project can be paused, windowed or downsized without breaking retained data/state dependencies.
