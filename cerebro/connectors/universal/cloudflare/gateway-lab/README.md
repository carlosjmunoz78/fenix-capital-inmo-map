# FACT-001 · CEREBRO Cloudflare Private Gateway LAB · Rebuild & Rollback

**Status:** HECHO / LAB / OFF; **not a production-ready connector**. Date 2026-11-09. Cloudflare account `e39a57e1ac42650ca5a6d5307cf0ac8e`, owner company `fenix-capital`, engine `FACT-001`.

## Physical baseline / OLD vs NEW
OLD: 6 Worker scripts before run; existing CEREBRO gateway `cerebro-console-gateway-v0` active v33 in Supabase, owner JWT required (anonymous GET health HTTP 401). No live FACT-001 binding to that gateway.

NEW: new isolated worker `cerebro-fact001-gateway-lab-eu-20261109` (deploy run https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42682594574), created only after exact-name collision and account/quota preflight. Separate GitHub action test executes Cloudflare API GET and verifies `workers_dev=false`, `previews_enabled=false`, `routes=[]`, `crons=[]`, and zero secrets. No App/CRM/Gateway/SEO/DNS/FB/Instagram/other Worker changes.

## Exact source contract
- Source: `cerebro/connectors/universal/cloudflare/gateway-lab/src/index.mjs`. Always denies `fetch` with HTTP 403, no outbound calls.
- Config: `wrangler.lab.jsonc`; workers_dev false, preview_urls false, routes empty, cron empty, all execution vars false; no secrets or data bindings.
- Deploy workflow: `.github/workflows/fact001-cerebro-private-lab-worker-deploy.yml`. Preflight refuses an already existing same-name Worker, so it cannot silently overwrite this new one on future push.
- Post-deploy read-only audit: `.github/workflows/fact001-private-worker-security-postdeploy-lab.yml`. Uses stored GitHub Actions secret only, logs no secret values, never executes writes.

## Current dual-client gates
- Normal ChatGPT via GitHub Actions has 2 repeatable real GET audits: #42677693830, #42678166836.
- CEREBRO Console+ACTGW+FACT-001 actual code in isolated CI performed real Cloudflare GET: #42680213195; 77/77 Factory tests and 9/9 Gateway tests.
- No live deployed CEREBRO Console -> this Worker routing or signed principal verification exists yet. **Do not claim an operational live Gateway**.
- Cloudflare official MCP API-token handshake returned HTTP 403; direct REST route already works in CI. R2 returns 10042 NotEntitled; Logpush read requires Logs Write and was not escalated.

## Security gates BEFORE any network exposure
1. Inventory/snapshot existing live CEREBRO Gateway and dependencies; do not modify in place.
2. Issue a **dedicated** read-only credential (not the broad no-expiry administrator token), service-scoped; secure Vault only. Never place token in a public Worker or client.
3. Configure Cloudflare Access Free app for exact domain and only owner/authorized service identity **before** turning on any workers.dev or custom route. Ensure public anonymous request is DENIED.
4. Wire trusted CEREBRO principal through ACTGW-001 and shared FACT-001 4D policy; enable harmless GET-only capability. Require durable audit, idempotency for future writes, quota and verified cost.
5. Physically test authenticated Console deployed -> Gateway -> private Worker -> Cloudflare real GET, and negative anonymous/foreign-tenant/cost/write tests.
6. Commit CI, tribunal and safe rollback; gradual promotion only when fully green. Without this Worker remains OFF.

## Rollback and rebuild
- In present OFF state, rollback is **do nothing to PROD**, keep isolated Worker completely inaccessible, and revert PR draft code if needed. The new Worker itself remains OFF until explicitly retired; do not touch any existing Cloudflare resource.
- For a rebuild use source snapshot in GitHub, new versioned LAB name and preflight. Do not overwrite or delete any existing Worker without dependency inventory, tests and explicit approved rollback.
- Additional contracted spend **0 EUR**; cloud routing disabled and no cron means 0 runtime traffic from this resource.
