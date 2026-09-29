# JOB-001 · Hostinger zero-cost canary runtime

Status: INSTALLED_SHADOW_VALIDATION
Date: 2026-09-28

## Why Hostinger is the preferred first runtime host

Fénix already pays for Business Web Hosting, and the current hPanel exposes Cron Jobs and SSH on the existing account. The selected path therefore introduces **0 EUR additional subscription cost**.

GitHub Actions is not selected for this validation because the account's included Actions minutes are currently exhausted and hard budgets stop additional usage. Trading LAB is explicitly excluded. No new paid runtime has been introduced.

## Canary design

`job001_wp_bridge_canary.php` is intentionally read-only. It performs only:

1. HTTPS GET to the existing staging Core Guard status endpoint.
2. Verify HTTP 2xx.
3. Verify response is JSON.
4. Emit one JSON line with timestamp and SHA-256 fingerprint.

It has no Supabase key, no WordPress write, no email, no publishing and no customer-data access.

This does **not** replace legacy pg_cron job 13. The legacy job remains authoritative until the Hostinger cron path is physically installed, observed, compared and an equivalent evidence/rollback contract exists.

## Live physical evidence · 2026-09-28

SSH login to the existing Hostinger account was confirmed.

The real filesystem path was discovered rather than guessed:

`/home/u497370767/domains/fenixcapital.es/cerebro/job001_wp_bridge_canary_FIXED.php`

Manual PHP execution returned a valid JSON result with:

- `ok:true`
- HTTP `200`
- environment `PREPROD`
- mode `READ_ONLY_CANARY`
- response SHA-256 fingerprint

Redirected manual execution also created:

`/home/u497370767/domains/fenixcapital.es/cerebro/job001_wp_bridge_canary.log`

Hostinger subsequently displayed a fresh successful automatic result at:

`2026-09-28T09:45:04+00:00`

with `ok:true` and HTTP `200`.

At that minute both a temporary every-minute canary and the provisional 15-minute canary were eligible to execute, so that observation proves the scheduler/runtime path but does not yet uniquely attribute the run to the final cron entry.

## Final intended Hostinger schedule

Legacy pg_cron job 13 currently uses minute offsets:

`3,18,33,48 * * * *`

Live hPanel evidence shows the practical scheduler options created through the UI include expressions such as `*/15`, `*/2`, `0,30`, and single-minute schedules such as `48`. Attempting to emulate legacy offsets by stacking multiple cron entries caused overlapping schedules and would over-execute the canary.

Therefore the final Hostinger shadow runner uses a **single** supported 15-minute schedule:

`*/15 * * * *`

This yields four runs per hour (96/day) at minutes 00, 15, 30 and 45. OLD-vs-NEW validation compares each Hostinger run against the nearest corresponding legacy pg_cron run/window; exact timestamp equality is not required. Behavioral equivalence is based on successful execution, target, HTTP result, payload validity and response fingerprint.

Hostinger scheduler timestamps observed during validation are UTC.

## Cleanup gate

Delete temporary validation cron entries once scheduler execution is proven:

- any `* * * * *` canary entry;
- any `/bin/date` probe;
- any canary entry using the invalid path `/home/u497370767/cerebro/...`.

Keep only the final shadow canary schedule above.

Do **not** alter or disable the existing WordPress cron as part of this gate.
Do **not** disable Supabase pg_cron job 13 yet.

## Acceptance

- one sole Hostinger canary cron remains;
- exactly one Hostinger canary cron remains using `*/15 * * * *`;
- 96 expected executions in a 24h window (four runs per hour);
- 96 outputs present;
- 0 execution errors;
- 96 HTTP 2xx responses;
- no secrets in script/output;
- resource usage remains negligible;
- legacy pg_cron job 13 remains ON during the observation window.

Only after this gate may the project design a no-double-execution cut-over that preserves health evidence and rollback.


## Self-logging hardening · 2026-09-28

A backup was created on Hostinger before modifying the live canary:

`/home/u497370767/domains/fenixcapital.es/cerebro/job001_wp_bridge_canary_BACKUP_20260928.php`

The live PHP runner was hardened to append its own JSON evidence to:

`/home/u497370767/domains/fenixcapital.es/cerebro/job001_wp_bridge_canary.log`

This removes reliance on hPanel shell redirection for audit evidence.

Manual post-patch execution at `2026-09-28T10:08:30+00:00` returned `ok:true`, HTTP 200, and the same record was present in the self-managed log. Another self-log record exists at `10:08:02+00:00`.

Self-logging is therefore **CONFIRMED**. Scheduled execution of the sole final `*/15` entry still requires one post-cleanup timestamp that lands on the scheduled cadence before the cron itself is marked fully confirmed.
