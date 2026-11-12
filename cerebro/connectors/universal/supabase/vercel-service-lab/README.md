# FACT-001 · Vercel service identity LAB · aceptación física (2026-11-10)

Estado: **VERCEL READ+WRITE+ROLLBACK FROM INDEPENDENT CEREBRO SERVICE VERIFIED IN LAB**. CEREBRO Console Gateway **NOT CONNECTED**, PROD autonomous actions **NOT AUTHORIZED**. PR #44 remains DRAFT.

## Scope
- `company_id=fenix-capital`, `engine_id=FACT-001`, `environment=LAB`, `version=1.0.0`.
- Vercel Team `team_qnh6u1Ofy2WPp0MGEKlyMA50` (`carlosjmunozcabeza-2582s-projects`).
- Only mutatable project: `cerebro-fact001-vercel-connector-lab-20261110`, ID `prj_vvil5epQ99mngK29vpLVOWmlVRP1`.
- Protected (read-only for this proof): `fenix-capital-preprod` (`prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`) and `fenix-capital-preprod-app` (`prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`); no domains, App, CRM, DNS, production resources modified.
- Secret `cerebro_vercel_service_token_v1` exists in Supabase Vault, project `cluhljgonannaafpmblx`, created `2026-11-10T11:22:09Z`; **never logged, fetched by ChatGPT, or stored in GitHub**. Source code references only name.

## Physical chain
GitHub Actions on private CEREBRO FACT-001 feature branch (signed ephemeral OIDC) → new isolated Supabase Edge Function `cerebro-fact001-vercel-service-lab` v2, `verify_jwt=false` but **custom mandatory GitHub OIDC RSA signature verification** with JWKS, exact audience + repo/ref/workflow + time + push event → Postgres `vault.decrypted_secrets` server-side → Vercel REST API over TLS and fixed allowlist. No API calls permitted before signature verification. GitHub runner never receives the Vercel secret.
- `GET /health` requires signed OIDC; anonymous/fake Bearer returns 401.
- `POST /verify-projects` requires strict 4D fixed order and checks three real known projects, GET only.
- `POST /verify-reversible-update` requires strict 4D fixed order and can **only** PATCH the single LAB project. Must find original `framework=null`; PATCH to `vite`, verify, PATCH back to null and verify. On ambiguous PATCH error it attempts compensation; if outcome cannot be attested, no success claim.
- No generic Vercel URL, arbitrary request, billing, project deletion, domain, Git hookup, deployment, or PROD mutation. The Edge Function itself is isolated but runs inside Supabase PROD **infrastructure**; treat as security-critical sidecar and avoid exposing any additional routes.

## Evidence
- Vault metadata: exact name and UUID detected, no secret returned.
- [Read-only autonomous E2E Actions #42807524830](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42807524830): 4/4 OIDC and scope tests, anon/fake 401, signed service 200, Vercel API 200, 3/3 known projects, no writes, credential_exposed=false. SUCCESS.
- [Reversible independent write E2E Actions #42808203559](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42808203559): 8/8 tests, same three projects Vercel 200, isolated LAB PATCH API 200, `write_verified=true`, `rollback_verified=true`, original `framework=null` verified after reversal. SUCCESS.
- [Service policy tests #42807993555](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42807993555): tests PASS, no tokens. Additional shared connector 24/24 tests [#42805923990](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42805923990).
- Both existing ChatGPT MCP connectors `Vercel · ChatGPT · Proyecto LAB` and `CEREBRO · Vercel Universal` have `Allow all actions` in ChatGPT permissions; this is **not** an API or legal permission override.

## Responsibility boundaries
ChatGPT current MCP OAuth and independent CEREBRO service Vault credentials are genuinely separate authentication flows. One can work while the other is offline. The shared `FACT-001` typed adapter exists with Vercel service transport injection, but it **is not yet wired into CEREBRO Console Gateway v33** or the new Cloudflare Cron recovery runner. GitHub branch push currently triggers proof workflow; this is not an always-on autonomous job queue nor a general command interface.

## Gates remaining before universal autonomy
1. Secure CEREBRO Gateway route for `client_id=cerebro` to enqueue signed instructions, based on separate verified IAM service identity and 4D scope. Keep Gateway v33, APP, CRM and Supabase transactional tables intact.
2. D1-backed durable idempotency, job claim and lease across retries, sealed Vault token access through broker, rate limits, no secrets in logs, cost guard and policy engine. No blind retry on uncertain writes.
3. Per-capability API catalog for listing/creating/updating/deploying projects; LAB acceptance by operation. Provider first deployment may appear `target=production` even when requesting preview; verify actual target after creating.
4. Before PROD control: inventory, snapshots, dependency map, branch PR, contract, tests, rollback, observability, tribunal and PREPROD separate; forbid unexpected domain assignments.
5. Vercel Hobby plan has personal/non-commercial limitations; obtain official eligibility confirmation before commercial usage or justify another deployment platform at budget gate. No paid subscriptions authorized.
6. GitHub Actions workflow presently triggered by **push to an existing DRAFT branch**. Any future manual command or unattended scheduler must use a new authenticated route and operator rights; not assume the signed proof is a fully autonomous CEREBRO agent.

## Rollback
- Sidecar `cerebro-fact001-vercel-service-lab` v2 can be disabled/replaced ONLY after confirming no consumers; feature branch maintains v1/v2 source.
- No Vercel permanent setting change in LAB; post-write original `framework=null` was verified by service. Existing projects were untouched.
- Secrets remain Vault-managed; never revoke/rotate without mapping dependent service. If compromised, revoke Vercel token via Vercel dashboard and suspend new sidecar requests; don't print it.
- External tests executed against fixed new LAB project only; no new Vercel deployment during service write validation.
