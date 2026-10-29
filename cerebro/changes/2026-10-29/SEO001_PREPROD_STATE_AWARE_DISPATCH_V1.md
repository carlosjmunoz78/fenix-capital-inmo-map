# CEREBRO OS · SEO-001 PREPROD state-aware dispatch guard · V1

Date: 2026-10-29
Scope: PREPROD only
Supabase project: `hnqlnvakzaywtafeiybt`
PROD project `cluhljgonannaafpmblx`: NOT MODIFIED

## HECHO

- Identified recurring PREPROD Edge invocations driven by `pg_net/0.19.5`.
- Identified source cron jobs through SQL dispatchers.
- `fenix-seo-infrastructure-autopilot-preprod` had ~1,417 invocations in the previous 24h and was returning HTTP 502 once per minute in the live sample.
- Current SEO control reported `next_phase=BLOCKED_PENDING_CONTENT_UX_REMEDIATION`.
- Current queue had 0 pending rows for `staging_noindex_enforcer_v2` and 0 pending rows for `runtime_pro_independence_v1`.
- Backed up original SQL dispatchers before modification.
- Added a state-aware guard only to `seo001_dispatch_infrastructure_autopilot_preprod()`.
- Kept cron job 65 ACTIVE at `* * * * *`; the scheduler remains alive.
- When the next phase is blocked on Content/UX and there is no infrastructure queue work, the dispatcher now returns `SKIPPED_BLOCKED_NEXT_PHASE` without making an Edge/WordPress network call.
- If the next phase changes or infrastructure work appears, the original dispatch path is used automatically.

## REGRESSION DISPATCHER DECISION

A first candidate guard was tested for `seo001_dispatch_sitewide_regression_preprod()`.
Two old `post` rows (`wp_id` 52247 and 52248) do not carry the current regression version, while the Edge function intentionally scopes posts by their current WordPress publication status.
A pure SQL stale-version guard cannot reproduce that WordPress publication scope safely.

Therefore the regression dispatcher was restored to its original behavior. Cron job 62 remains ACTIVE every minute. No optimization is claimed for that path.

This preserves future detection if an old post is published without a queue-row mutation.

## LIVE VERIFICATION

After the refined infrastructure guard:

- direct dispatcher test returned:
  - `ok=true`
  - `state=SKIPPED_BLOCKED_NEXT_PHASE`
  - `next_phase=BLOCKED_PENDING_CONTENT_UX_REMEDIATION`
- cron job 65 remained ACTIVE, schedule `* * * * *`.
- query window 2026-10-29 22:53–22:55 UTC showed 0 `function_edge_logs` invocations for `fenix-seo-infrastructure-autopilot-preprod` after the guard.

## Expected load effect

While the current blocked state remains stable, this removes roughly 1,400+ unnecessary infrastructure Edge invocations/day, plus the associated Supabase REST reads and WordPress/plugin/ability checks that each Edge invocation would otherwise perform.

This is load avoidance, not an immediate guaranteed invoice reduction: the fixed Pro plan and second active Micro compute remain intentionally in place.

## Rollback

Original dispatcher definitions are stored at:
`cerebro/backups/supabase/2026-10-29/seo001-preprod-dispatchers-before-state-aware.sql`

Backup commit:
`60cf0279b75dd2e33c9b69ec03b7324025bbd2a9`

Rollback: reapply the original definition of `public.seo001_dispatch_infrastructure_autopilot_preprod()` from that snapshot, then verify cron job 65 is ACTIVE and the Edge function receives the next scheduled call.

## POR AUDITAR

- `fenix-seo-b2c-perfect-audit-preprod` was observed around ~712 invocations/24h and returns HTTP 422 in the live sample.
- Other per-minute SEO superloop jobs exist (52, 53, 55, 56, 61, 66, 67).
- These are not modified in this change because their gating/continuation contracts require separate dependency review before reducing cadence or dispatch.

## Safety

- PROD untouched.
- No table/schema/data deletion.
- No cron job disabled.
- No paid service added.
- State-aware skip automatically stops applying when the blocking state/work conditions change.
