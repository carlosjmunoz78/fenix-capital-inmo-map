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


## LIVE CUT-OVER COMPLETED · 2026-09-28

Physical Hostinger evidence confirmed the master scheduler was running every minute:
- 10:22 UTC: job 6 reached gateway and was correctly `SKIPPED_DISABLED`.
- 10:23 UTC: job 7 executed through Hostinger and returned HTTP 200 / `DISPATCH_RESULT`.
- 10:26 UTC: job 12 executed through Hostinger and returned HTTP 200 / `DISPATCH_RESULT`.
- duplicate manual execution in the same minute was blocked by `SKIP_ALREADY_DONE`.

The earlier absence in Supabase log queries was an observability timing/query issue, not a Hostinger scheduler failure.

After physical proof, all eight Wave 1 jobs were atomically moved to HOSTINGER_ACTIVE. Current invariant:

| Job | Hostinger control | Legacy pg_cron |
|---|---|---|
| 2 | enabled=true | active=false |
| 6 | enabled=true | active=false |
| 7 | enabled=true | active=false |
| 10 | enabled=true | active=false |
| 12 | enabled=true | active=false |
| 13 | enabled=true | active=false |
| 16 | enabled=true | active=false |
| 21 | enabled=true | active=false |

One controlled execution per job was then validated while legacy was disabled:

- 13: probe DISPATCHED, HTTP transport 200. WordPress Core Guard payload remains observer/`ok:false`, which is application state rather than transport failure.
- 7: page-quality probe DISPATCHED for Jaén; downstream HTTP 200, canonical/schema checks green; PageSpeed external API returned HTTP 429 and therefore no PageSpeed data.
- 10: `NO_READY_DOWNLOADABLE` (valid no-op state).
- 16: DISPATCHED; downstream HTTP 200 with `WAIT_LIVE_FORM`.
- 21: `ALREADY_VERIFIED` (valid idempotent state).
- 6: DISPATCHED; downstream HTTP 200 / `NOOP` because no queued email existed, so no email was sent.
- 12: `ALREADY_BUILT` for Jaén (valid idempotent state).
- 2: DISPATCHED; downstream HTTP 200 and weekly PREPROD orchestration response returned successfully.

Rollback path was exercised earlier for jobs 7, 12 and 13 and restored legacy correctly. The atomic cut-over function keeps the invariant that one side is active and the other disabled.

Status: **WAVE 1 CUT-OVER GREEN / OBSERVATION ACTIVE**.

Important FinOps constraint: this removes these eight schedules from pg_cron, but does not itself remove the PREPROD database/Edge dependency. Do not claim Supabase compute savings until a separate pause/downsize/windowing gate proves that retained PREPROD dependencies allow it.


## Wave 2 preparation · remaining 12 PREPROD cron jobs

Prepared 2026-09-28 without disabling any remaining legacy job.

Remaining mappings added to the same control plane:

- 5 · city autopilot · `*/15 * * * *`
- 8 · page-quality reconcile · `10,25,40,55 * * * *`
- 9 · WordPress action worker · `*/5 * * * *`
- 11 · active-city growth bootstrap · `2,17,32,47 * * * *`
- 14 · WP bridge reconcile · `5,20,35,50 * * * *`
- 15 · active-city baseline · `9,39 * * * *`
- 17 · nurture E2E · `23,53 * * * *`
- 18 · gated-form enable · `7,22,37,52 * * * *`
- 19 · growth-control reconcile · `1,16,31,46 * * * *`
- 20 · autonomy proof · `14,44 * * * *`
- 22 · pilot plugin certificate · `6,21,36,51 * * * *`
- 23 · rollout-control refresh · `7,22,37,52 * * * *`

The central dispatcher and gateway now allowlist all 20 SEO PREPROD job IDs.

A transaction-scoped execution test was run for all twelve new mappings and rolled back. All twelve returned valid domain states without committing mutations. Representative states included:
- 5 `LANDING_PIPELINE`
- 8 `RECONCILED`
- 9 worker path executed contract and was rolled back
- 11 `ACTIVE_CITY_BOOTSTRAPPED`
- 14 `NOT_READY` with transport HTTP 200
- 15 `ALREADY_VERIFIED`
- 17/18 `WAIT_CONSENT_LEGAL`
- 19 `RECONCILED`
- 20 `WAIT_OTHER_GATES`
- 22 `ALREADY_CERTIFIED`
- 23 rollout refresh returned a valid control state

No legacy job 5/8/9/11/14/15/17/18/19/20/22/23 has been disabled yet.

Cut-over risk order:
1. deterministic/reconcile gates: 8,14,15,17,18,19,20,22,23
2. idempotent bootstrap: 11
3. stateful autopilot: 5
4. WordPress side-effect worker: 9 last

Hostinger must first refresh the master scheduler artifact and local allowlist to the 20-job version. Central control remains fail-closed for these twelve until their atomic cut-over.


## Wave 2 LIVE CUT-OVER COMPLETED · 2026-09-28

Physical Hostinger evidence confirmed the 20-job master scheduler and local allowlist were installed:
- master source listed all 20 legacy schedules;
- local config listed IDs 2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23;
- 10:52 UTC: jobs 18 and 23 reached gateway and were correctly SKIPPED_DISABLED;
- 10:53 UTC: job 17 reached gateway and returned DISPATCH_RESULT;
- 10:54 UTC: scheduler heartbeat reported all 20 IDs.

The remaining Wave 2 jobs were then atomically cut over through `cerebro_job001_set_cutover_preprod`.

Final invariant:
- Hostinger control enabled=true for all 20 jobs.
- Legacy pg_cron active=false for all 20 jobs.
- Legacy cron definitions remain present for rollback.
- No cron definition was deleted.

Status: **JOB-001 SEO PREPROD SCHEDULER OFFLOAD = GREEN / 20 OF 20**.

Observation remains required for domain-specific downstream states, but scheduler ownership has moved completely off pg_cron.


## FINOPS post-cutover conclusion · PREPROD compute

After the 20/20 scheduler offload, `cron.job where active=true` returned zero rows.

A clean observation window after the browser QA burst ended showed only the parked Browser Bridge gateway invoking PREPROD (5 invocations in roughly 3 minutes). No Ana/Canonical/KPI/Notion hot traffic remained in that clean window.

Important: PREPROD still cannot be paused while SEO-001 remains operational because the Hostinger master scheduler calls the PREPROD CEREBRO gateway, which invokes PREPROD database functions and Edge Functions. Scheduler ownership moved off pg_cron, but execution/state still depends on the PREPROD Supabase project being online.

Therefore:
- Edge/API overage optimization is immediately useful.
- GitHub Actions reduction is immediately useful.
- Full PREPROD compute elimination requires a later execution/state migration, not merely cron migration.
- No compute saving is claimed yet.

A deterministic multi-company cost governor was added to CEREBRO runtime. Default policy is zero paid AI and zero metered external spend; attempts require an explicit policy allowance and hard daily budget. MONEY_LIMIT is emitted on unauthorized paid spend.
