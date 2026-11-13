# CEREBRO LAB · PREPROD SEO-001 staging suspension, targeted controlled cutover

Owner directive: staging.fenixcapital.es suspended until explicit notice. Existing Hostinger JOB001 dispatch ID13 calls only `public.seo001_probe_wp_bridge_preprod()`; this function originally calls `net.http_get()` against staging and writes a DISPATCHED row. SQL dependency scan found exactly one public caller (`cerebro_job001_dispatch_preprod`).

PRE-CUTOVER current SQL definition hash md5: `078cdfaa118c036e9548ffb8b73dd77c`. Full original definition backed up alongside this file. Do not invoke backup function because it would contact staging.

Parallel candidate `seo001_probe_wp_bridge_suspended_lab_v0()` returns `ok=false`, `state=BLOCKED_DEPENDENCY`, `reason=STAGING_SUSPENDED_BY_OWNER`, same JSON result type, no URL or side effects. Only after success and rollback compile check may the existing PREPROD probe be replaced with the no-op blocked contract, preserving its name/signature and execution grants. No changes to dispatcher, scheduled cron entries, WordPress, DNS, PROD, App/CRM, or other job IDs.

Acceptance: manual direct call to guarded function, no new bridge-health DISPATCHED row, no new `net.http_get` request, unchanged original dispatcher, other jobs untouched. Do NOT call the original pre-cutover function for testing.

Rollback: only AFTER explicit owner instruction to resume staging and checks of target safety. Reapply original exact function definition from `original-probe-snapshot.sql` in one transaction after prerequisite checks. Reversion is NOT permitted automatically while suspension is active. Avoid deleting snapshots or test evidence.
