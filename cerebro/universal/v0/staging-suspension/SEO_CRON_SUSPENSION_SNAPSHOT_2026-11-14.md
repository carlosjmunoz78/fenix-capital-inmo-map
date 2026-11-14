# SEO-001 staging-dependent orchestration cron snapshot · 14 Nov 2026

Owner mandates all staging operations PAUSED. These eight **PREPROD SEO-001** cron jobs trigger staged launch/city review/quality/promotion orchestration and may indirectly dispatch staging-related activities. Preserve before deactivation; no deletion. Their schedules/commands at snapshot time:

- 22: active=true, schedule `6,21,36,51 * * * *`, command `select public.seo001_seed_pilot_plugin_certificate_preprod();`
- 23: active=true, schedule `7,22,37,52 * * * *`, command `select public.seo001_refresh_rollout_control_preprod();`
- 52: active=true, schedule `* * * * *`, command `select public.seo001_review_active_autonomy_tick_preprod();`
- 53: active=true, schedule `* * * * *`, command `select public.seo001_review_superloop_tick_preprod();`
- 55: active=true, schedule `* * * * *`, command `select public.seo001_review_orchestrator_v3_preprod();`
- 56: active=true, schedule `* * * * *`, command `select public.seo001_review_active_stale_reconcile_v3_preprod();`
- 66: active=true, schedule `* * * * *`, command `select public.seo001_seo_autonomy_superloop_preprod();`
- 69: active=true, schedule `35 * * * *`, command `select public.seo001_landing_contract_guard_preprod();`

**Why pause conservatively:** the review/orchestration functions invoke other SEO-001 PREPROD functions (some may reach staging indirectly); pausing them as a staged workflow is safer during the owner's hard suspension than allowing a new job path to bypass the Edge/SQL guards. This temporarily suspends related PREPROD SEO workflow updates; it does not disable SEO or website PROD.

**Rollback policy:** these jobs MUST stay `active=false` until an explicit owner order lifting the staging suspension, followed by dependency mapping, health gates, source-version equality and rehearsed recovery. Then restore using `cron.alter_job(job_id:=N,active:=true)` individually and observably. No automatic resume by CI, job runner, policy engine or environment deployment.
