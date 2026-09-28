# JOB-001 · Wave 1 · Evidence snapshot 2026-09-28

Status: SHADOW / NO CUT-OVER
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

This is evidence that the legacy schedule is stable and that the shadow schedule model matches the live cadence. It is **not** evidence that an external worker is already operational.

## Canary selection

Candidate: legacy job **13** · `seo001_probe_wp_bridge_preprod`.

Reason: the live function performs an HTTP GET against the staging WordPress Core Guard status endpoint and records PREPROD bridge-health evidence. It does not publish content, mutate a customer/lead, send an email, or touch payments. This makes it the lowest-impact candidate among the Wave 1 set.

The canary is **not authorized yet**. Required gates remain: verified runtime host, credential reference, isolated tests, no-double-execution gate, saved legacy definition and tested rollback.

## Current blocker

No verified always-on shared CEREBRO runtime host has yet been demonstrated for this branch. The Trading LAB VM is explicitly excluded from general CEREBRO workloads. Therefore no legacy cron is disabled and no external execution is enabled.
