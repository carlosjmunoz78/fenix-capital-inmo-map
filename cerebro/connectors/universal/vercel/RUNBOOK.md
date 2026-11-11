# FACT001 · Vercel private LAB · Contract and Runbook

**Status: PARTIAL.** ChatGPT Vercel OAuth access physically verified; CEREBRO independent access not yet demonstrated.

## Physical pre-test inventory
- Account Hobby on authenticated Vercel. Team `team_qnh6u1Ofy2WPp0MGEKlyMA50`.
- Existing projects **DO NOT MODIFY**: `fenix-capital-preprod` / `fenix-capital-preprod-app`; these names do not establish App PREPROD operational status.
- Created isolated `cerebro-fact001-vercel-lab-20261111`, ID `prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu`, no Git connection or deploys, no domains, `live=false`, SSO protection `all`.
- Physically tested exact settings update `framework: null → vite → null` with readback, no deployment, SSO retained. ChatGPT OAuth executed; **NOT independent CEREBRO autonomy**.

## Safety contracts
- No PROD, no App/CRM, no existing Vercel projects, no domains, no automatic git deployments, no subscription or resource increase.
- `operator.mjs` deterministic allowlist and `policy.mjs` with company_id/engine_id/environment/version, literal team and project. Reject extra fields, paid options, absent/invalid service token, deployments, loss of SSO or identity drift.
- Idempotent signed queue/Gateway pending. No endpoint deployed; no Vercel personal API token has been read or transferred. Provision future service token as **Secret `VERCEL_API_TOKEN`** in the CEREBRO private runtime using secure provider UI, only after credential scope review.
- Code is only a scaffold with mock tests; cannot be promoted as autonomous without physical service API read, write, rollback, audit, cost and rebuild gates.

## Rollback
- Protected project original framework `null`; SSO `all`, zero domains/deployments; verified after ChatGPT OAuth settings lifecycle.
- Changes confined to separate GitHub branch, not main. Never remove existing Vercel project. Lab project deletion requires a separate human dashboard action; not required by V0 and not attempted.
- Vercel account Hobby; no additional subscription. Keep deployments zero before protecting any future URL.
