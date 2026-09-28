# JOB-001 · Hostinger zero-cost canary runtime

Status: PREPARED_NOT_INSTALLED
Date: 2026-09-28

## Why Hostinger is the preferred first runtime host

Fénix already pays for Business Web Hosting. Hostinger documents cron support for web/cloud hosting, custom commands/scripts, UTC schedules and unlimited cron jobs for Premium and above. Therefore this route introduces **0 EUR additional subscription cost**.

Vercel Hobby was audited and rejected as the primary scheduler for Wave 1 because Hobby cron execution is limited to daily cadence; Wave 1 requires 15/30 minute schedules. GitHub Actions is not selected because the account's included Actions minutes are currently exhausted and budgets stop additional usage. Trading LAB is explicitly excluded.

## Canary design

`job001_wp_bridge_canary.php` is intentionally read-only. It performs only:

1. HTTPS GET to the existing staging Core Guard status endpoint.
2. Verify HTTP 2xx.
3. Verify response is JSON.
4. Emit one JSON line with timestamp and SHA-256 fingerprint.

It has no Supabase key, no WordPress write, no email, no publishing and no customer-data access.

This does **not** replace legacy pg_cron job 13. The legacy job remains authoritative until the Hostinger cron path is physically installed, observed and compared.

## Intended Hostinger schedule

Run every 15 minutes, matching legacy job 13 minute offsets:

`3,18,33,48 * * * *`

Hostinger schedules are UTC.

## Physical install gate

The runner must be placed outside a publicly browsable directory when possible, e.g.:

`/home/<account>/cerebro/job001_wp_bridge_canary.php`

Then create a PHP/custom cron in hPanel using the installed PHP binary/path. Exact account path must be obtained from hPanel; do not guess it.

## Acceptance

- 96 expected executions in a 24h window.
- 96 outputs present.
- 0 execution errors.
- 96 HTTP 2xx responses.
- no secrets in script/output.
- resource usage remains negligible.
- legacy pg_cron job 13 remains ON during this observation window.

Only after this gate may the project design a no-double-execution cut-over that preserves health evidence and rollback.
