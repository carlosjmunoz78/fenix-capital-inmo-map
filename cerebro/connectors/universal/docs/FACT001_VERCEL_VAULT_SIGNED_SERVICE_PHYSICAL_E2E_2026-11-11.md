# FACT001 · Vercel sealed Vault service · physical signed E2E 2026-11-11

**VERIFIED_LAB within one owned project, NOT VERCEL FULL.**

## Identity and existing credential
GitHub OIDC RS256 exact repository `carlosjmunoz78/fenix-capital-inmo-map`, workflow `fact001-vercel-intake-oidc-probe.yml`, branch `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`, GitHub actor `carlosjmunoz78`, audience `cerebro-fact001-vercel-intake-lab-20261111`. Incoming anonymous/fake/PROD requests denied, validated in CI.

Previously provisioned PAT `cerebro_vercel_service_token_v1` remains **inside Supabase Vault** (not copied to Cloudflare, GitHub or chat). New separate Edge Function `cerebro-fact001-vercel-intake-lab` version 5 ACTIVE: takes signed commands, D1 jobs and audited single attempt, reads token only in process; uses fixed REST endpoints and only owned LAB project. Separate from App/CRM and other Edge functions.

Vercel account Hobby; team `team_qnh6u1Ofy2WPp0MGEKlyMA50`. Only permitted project: `cerebro-fact001-vercel-lab-20261111` (`prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu`). Existing `fenix-capital-preprod` and `fenix-capital-preprod-app` not modified. No automatic Git link, no domains or deployments, SSO all, live false. No paid subscription.

## Physical runs

| Request | State / attempts / errors | Provider proof |
|---|---|---|
| `READ-01` first read | `RECONCILE`, 1, `VERCEL_SSO_NO_DEPLOYMENT_GATE` | Initial overly strict SSO JSON parser, **not retried** |
| `READ-02` read | `COMPLETED`, 1, NULL | REST GET 200, identity+protection+absence deployment checked |
| `UPDATE-01` framework null→vite | `COMPLETED`, 1, NULL | Vercel API and independent ChatGPT readback showed vite and SSO all |
| `ROLLBACK-01` framework vite→null | `COMPLETED`, 1, NULL | Vercel returned framework null, no domains, no deployments, SSO enabled all |
| `DEPLOY-LIST-01` read deployments | `COMPLETED`, 1, NULL | Zero deployments verified |

Data source: Cloudflare Recovery D1 existing `1305f791-7c44-47f9-946b-f330a09c88aa`, additive tables `fact001_vercel_jobs_v1` (five rows), `fact001_vercel_events_v1` (five events). Jobs idempotent by ID and key; each completed exactly once, replay attempt explicitly DENIED with 409. No D1 created/deleted; Free tier remains 10/10.

Signed GitHub workflow evidence: [READ #43053945817](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43053945817), [UPDATE #43054170024](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43054170024), [ROLLBACK #43054365439](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43054365439), [DEPLOY LIST #43054646304](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43054646304).

### SSO schema correction
Official Vercel REST API returns `ssoProtection: {deploymentType: 'all'}` with **enabled field absent**. A signed, read-only, whitelist-only probe proved `sso_type=all`, `sso_enabled=UNSET`, `live=false`, `deployed=false`, without revealing the PAT. The security gate now accepts type `all` if `enabled` is not explicitly false; it continues to reject missing/non-all protection and any explicitly disabled state. Mock tests and physical read+rollback prove this.

## Rebuild and rollback
Original LAB project settings restored (`framework:null`), exact id and team readback, SSO all, no deployment/domain. Earlier Cloudflare Worker independent Vercel module `543b68e8-cd59-4960-9f17-d66276416389` deployed tokenless and intentionally **dormant**; it does not claim D1 jobs. Vercel signed Vault path handles these jobs in Supabase Edge v5. No route to PROD, no broad project delete, no raw credential migration.

## Incomplete
Broader project lifecycle, protected content deployments/rollback, actual command ingress from CEREBRO Gateway (not GitHub workflow trigger), role-based multi-company routing, long-term PAT rotation, backups/rebuild and incident recovery. Do not call Vercel FULL or PROD-ready.
