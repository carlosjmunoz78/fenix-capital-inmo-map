# CEREBRO OS · SEO-001 PREPROD backlog observer (13 nov 2026)

This isolated SQL source reads only summary counts from existing `seo_cerebro_expansion_jobs_preprod` and the latest supervisor state in `seo_cerebro_supervisor_preprod`, strictly limited to `company_id=FENIX_CAPITAL`, `environment=PREPROD`, `engine_id=SEO-001`. The Universal Gateway maps source company to `fenix` for owner-display only.

No staging requests, no workers, no cron creation, no DML, no publishing, and no reactivation of suspended WordPress staging. The result always states `seo_dispatch_authorized=false`, `downstream_publication_verified=false`. Counts are not proof of completion for WordPress or SEO external effects. `QUEUED` must not be interpreted as safe to dispatch. Supervisor may be stale.

Owner policy in `dependency-policy.mjs` remains the governing LAB permission gate. The SQL function is service_role-only; `anon` and `authenticated` cannot invoke it. Rebuild from PR #66. Rollback only after consumer inventory: drop public wrapper, then private function, without touching legacy tables or external crons.
