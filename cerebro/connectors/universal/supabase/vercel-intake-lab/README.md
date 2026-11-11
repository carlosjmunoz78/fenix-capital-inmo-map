# Vercel signed command intake LAB · FACT-001

New Supabase Edge Function `cerebro-fact001-vercel-intake-lab` (separate from App/CRM), with external GitHub RS256 OIDC exact workflow, branch, repo, actor, fixed audience; Vault read of existing **D1 Write** token only. It can submit **idempotent D1 jobs** for one Vercel private Hobby LAB project, but it cannot call Vercel or change any existing project. No new Supabase database/tables, only a separate Edge Function.

`health`, `submit`, `status` all deny unauthenticated access. The first physical test is health + PROD-denied only, no actual queued job, until the user safely installs `VERCEL_API_TOKEN` as a Secret in private Cloudflare Worker and its visibility is verified. Then a signed lab read-only order can enter and prove autonomous execution. Without the token, the private Worker returns `VERCEL_SECRET_NOT_CONFIGURED` before claiming jobs.

Status defined/testable, not yet verified physically. Do not mark Vercel FULL.


**Postdeployment physical state:** Existing Vercel PAT in Supabase Vault was already present and valid. Implemented signed `execute` route with strict project/tenant allowlist, one D1 claim, provider GET/PATCH/GET readback, completed status + event audit, replay 409. v5 ACTIVE. Four command E2E successfully verified (read, update, rollback, deployment list); one old first read failed SSO API shape gate and retained in RECONCILE. No need to create another PAT. No Vercel token in Cloudflare. Source doc `../../docs/FACT001_VERCEL_VAULT_SIGNED_SERVICE_PHYSICAL_E2E_2026-11-11.md`.
