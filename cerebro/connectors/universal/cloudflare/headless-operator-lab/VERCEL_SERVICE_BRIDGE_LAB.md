# CEREBRO FACT-001 · Vercel service bridge LAB

Code branch `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`. Independent pure adapter source is copied from isolated Vercel source branch `cerebro/fact001-vercel-universal-lab-v0-20261111`, shared runtime uses **one Cloudflare Worker**, not a new server.

Vercel Hobby project: `cerebro-fact001-vercel-lab-20261111`, ID `prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu`, team `team_qnh6u1Ofy2WPp0MGEKlyMA50`. Existing projects untouched. Scope fences: company_id=fenix-capital, engine_id=FACT-001, environment=LAB, version=0.1.0, max_cost_eur=0. Only project GET and PATCH framework to vite and rollback null and GET empty deployments, with SSO enabled, no domains, no current deployments. No create/delete Vercel project nor arbitrary Vercel API paths.

Cloudflare Worker **must** get a protected Secret **`VERCEL_API_TOKEN`** from user-provisioned Vercel team-scoped access token before any service call. Unlike ChatGPT's Vercel OAuth connection, CEREBRO cannot use its authorization directly. Never reveal or copy token between apps, and no automatic credential minting. Credential absent → `VERCEL_SECRET_NOT_CONFIGURED` returns before D1 claim. Only 2 additive D1 tables in existing Recovery LAB, no new D1 or subscription.

REQUIRES private Worker deployment with strict binding inheritance preserving CF_WORKERS_TOKEN, CF_PAGES_TOKEN, RECOVERY_DB; then a READ_ONLY service API GET test, followed by owned framework update→rollback; D1 job audit must reach COMPLETED at attempts=1. Not green before physical Vercel API reads. No generic CEREBRO command interface yet; separate signed OIDC ingress must be validated. For now **DEFINED/TESTED**, not independently verified.

## Physical pre-DDL Vercel job schema bookmark · 2026-11-11

D1 Recovery UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, bookmark **`0000015d-00000036-00005120-8ee00ff768c38020d8df002e67d092da`** before `fact001_vercel_jobs_v1` and `fact001_vercel_events_v1` existed. Private CEREBRO Worker active version `fde58260-9a26-4dec-a84f-201114ba071b`, cron `*/5 * * * *`, three bindings (`RECOVERY_DB`, `CF_PAGES_TOKEN`, `CF_WORKERS_TOKEN`). No Vercel secret bound. Other command queues had zero pending jobs. One existing Fénix Pages project remains. No whole-D1 bookmark restoration is permitted; backup is evidence only, rollback via own data/worker version.
