# CEREBRO OS · Snapshot reversible de cron staging · 2026-11-14

Owner mandate: **SUSPEND ALL staging.fenixcapital.es activity until further explicit order**. All entries below were read from live Supabase PREPROD project `hnqlnvakzaywtafeiybt` before applying any change. This snapshot documents jobs by immutable ID and does not contain decrypted secrets.

- Job **61** — `active=true`, schedule `* * * * *`, command `select public.seo001_dispatch_elementor_safe_writer_batch_preprod();`.
- Job **62** — `active=true`, schedule `* * * * *`, command `select public.seo001_dispatch_sitewide_regression_preprod();`.
- Job **65** — `active=true`, schedule `* * * * *`, command `select public.seo001_dispatch_infrastructure_autopilot_preprod();`.
- Job **67** — `active=true`, schedule `* * * * *`, command `select public.seo001_dispatch_web_content_ux_audit_v1_preprod();`.
- Job **68** — `active=true`, schedule `17 */6 * * *`, command `select public.seo001_dispatch_all_landing_contract_audits_preprod();`.
- Job **70** — `active=true`, schedule `12 * * * *`, command `select public.seo001_dispatch_blog_visual_audit_preprod();`.

The six SQL dispatchers lead to PREPROD Edge workers that use staging for audits/SEO/WordPress operations; job 68 indirectly calls `fenix-seo-landing-contract-audit-preprod`. The Edge functions currently lack owner suspension gate. The initially blocked job 13 remains guarded separately. Jobs 6,22,23,25 and other PREPROD/PROD tasks are **not** part of this isolated cron suspension without further consumer verification.

## Suspension protocol
Before change: verify each job still matches `active=true`, exact schedule and exact dispatcher SQL. Execute `cron.alter_job(job_id:=...,active:=false)` *only* for these IDs, in one transaction with guard preconditions. Never `unschedule` or delete. Confirm `active=false` by SELECT, and `cron.job_run_details` has no newly started runs after the stop (in-flight runs may finish). This does not guarantee stopping independently invoked Edge functions.

## Controlled rollback (PROHIBITED until explicit owner reactivation)
After the owner expressly lifts the staging suspension and after dependency, runtime, authorization and readiness gates: for **each** of these IDs, validate the snapshot schedule/command and execute `select cron.alter_job(job_id:=ID,active:=true);`. Do not reactivate because a readiness or CI test says GREEN. Also consider restoring the guarded JOB13 function separately only upon explicit authorization.

Cost: no new subscription. PROD App, CRM, WordPress, DNS, GitHub main, Trading remain unchanged.
