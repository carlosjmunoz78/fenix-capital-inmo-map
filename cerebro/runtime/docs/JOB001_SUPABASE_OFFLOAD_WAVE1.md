# JOB-001 · Supabase Offload Wave 1

Status: DOCUMENTED_PARTIAL / SHADOW ONLY
Date: 2026-09-28
Scope: FENIX_CAPITAL · SEO-001 · PREPROD
Cost target: 0 EUR additional

## Purpose

Wrap, do not replace, the existing Supabase `pg_cron` schedule. Wave 1 models the eight jobs that are predominantly scheduling, HTTP dispatch, probe or QA triggers. The legacy jobs remain authoritative until OLD-vs-NEW equivalence, rollback and observability are proven.

## Live legacy jobs represented

- 2 `fenix-seo-cerebro-preprod` weekly trigger.
- 6 `fenix-seo-growth-email-worker-preprod`.
- 7 `seo001_dispatch_active_city_quality_probe_preprod`.
- 10 `seo001_dispatch_downloadable_qa_preprod`.
- 12 `seo001_dispatch_lead_magnet_builder_preprod`.
- 13 `seo001_probe_wp_bridge_preprod`.
- 16 `seo001_dispatch_conversion_e2e_preprod`.
- 21 `seo001_dispatch_mobile_qa_preprod`.

## Safety contract

`ShadowScheduler` is side-effect free: it does not call HTTP, Supabase, WordPress, Brevo or any external system. It only emits deterministic due-job plans. It rejects PROD and any job not marked `shadow_only=True`.

No secrets are stored in code. A future execution adapter must obtain credentials through an authorized credential reference and must not log secret values.

## Promotion gates

1. Run the shadow planner alongside the live pg_cron schedule.
2. Record `legacy_pg_cron_job_id`, due timestamp, intended target, company, engine, environment and version.
3. Compare expected OLD firing times with NEW plans for at least one full representative schedule window.
4. Add idempotency keys, retry policy, timeout, audit event and per-job kill switch before enabling writes/network calls.
5. Add an adapter in PREPROD only and prove identical outcome/evidence without double execution.
6. Disable one legacy cron at a time only after rollback is tested.
7. Do not pause the Supabase PREPROD project while any retained core jobs or dependent state remain active.

## Rollback

Until cut-over, rollback is trivial: stop the shadow worker because legacy pg_cron remains unchanged. After a future single-job cut-over, rollback means disable the new job and re-enable the exact legacy cron definition for that job.

## FinOps objective

This wave does not itself claim a Supabase saving. It creates the prerequisite to move periodic orchestration out of continuous database compute and later evaluate safe PREPROD pause/windows or reduced compute. No savings are counted until measured after migration.
