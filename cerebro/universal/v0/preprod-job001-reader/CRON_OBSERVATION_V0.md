# PREPROD pg_cron read observation V0 (read-only)

Source: `hnqlnvakzaywtafeiybt` existing `cron.job` and `cron.job_run_details`. Fixed job IDs `6,22,23,25`. These 4 are currently active. The other 16 legacy JOB-001 control records are not active `cron.job` jobs. This reader does not assume the Hostinger scheduler is deployed.

Security: private-schema SECURITY DEFINER with empty search_path and a separate public SECURITY INVOKER wrapper. Both deny PUBLIC/anon/authenticated; grant only service_role used by the existing dedicated PREPROD Edge service. No execution of arbitrary commands or SQL from caller. Never reads `cron.job.command`.

Gates: a `succeeded` pg_cron status proves the database cron command completed, **not** that an external target, SEO publication or Hostinger master finished. State is never renamed `job001_queue_connected=true`. Read freshness, count and time only. No scheduler activation or production change.

Rollback and backup: migration file in GitHub PR #66; original `cron.job` and `job_run_details` are not mutated. Drop new wrapper then private function after identifying consumers. No extra subscription.
