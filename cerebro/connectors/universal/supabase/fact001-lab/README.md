# CEREBRO FACT-001 · Deployed-sidecar candidate · OIDC LAB only

**State: candidate code, pending controlled deploy and physical verification.**

This is a **new** isolated Supabase Edge Function, not an update to the existing `cerebro-console-gateway-v0` (ACTIVE v33) or App/CRM/Auth. It does not implement a ChatGPT native MCP server. It exposes three strictly authenticated operations for the CEREBRO laboratory only: `GET /health` (no changes), `POST /provision` (one-time encrypted Vault secret only), and `POST /inventory` (exact Cloudflare account GET-only D1 and Worker counts). All other requests denied. No Cloudflare API mutation methods exist in code.

## Identity

Ephemeral GitHub OIDC signed RS256 JWT, audience `cerebro-fact001-cloudflare-lab-20261109`, exact repository, protected LAB branch, `workflow_ref` pinned to `.github/workflows/fact001-cerebro-supabase-physical-e2e-lab.yml`, `event_name=push`, strict lifetime, JWK fetched only from GitHub Actions official issuer. Do not accept arbitrary Bearer, user supplied scopes, expired owner JWTs, or metadata as proof. The Edge Function sets `verify_jwt=false` **only because GitHub OIDC is not a Supabase JWT**; its own signature+claims gate occurs **before all methods**. Negative anonymous and forged JWT tests required.

## Secret policy

The existing Cloudflare token is injected by GitHub Actions secret `CEREBRO_CLOUDFLARE_API_TOKEN`. The Workflows are separate from the model and never echo or log it. `POST /provision` accepts it once only with trusted GitHub OIDC to store into **existing Supabase Vault** as `cerebro_fact001_cf_readonly_lab_20261109`. No existing Vault record may be overwritten, no App/CRM rows modified, no schema migration. Production promotion requires a **separate READ ONLY scoped API token** before enabling any other endpoints; the existing token is administratively broad and must not be used for autonomous writes.

Supabase Edge Function uses an existing `SUPABASE_DB_URL` through a single bounded postgres-js connection (`npm:postgres@3.4.7`) for Vault operations. No new subscription, server or database. It never returns the token, JWT or secret ID. All Cloudflare HTTP operations are fixed GET allowlist, valid for account `e39a57e1ac42650ca5a6d5307cf0ac8e` only. No worker domain, DNS, R2, CRM, App, FB/IG resource changes.

## Test & promotion

1. Build candidate code on isolated PR #44 branch; 12+ unit tests for signed GitHub OIDC and deny-by-default.
2. New function slug `cerebro-fact001-cloudflare-lab` must be absent before deploy; deploy only it, never redeploy any existing Edge Function.
3. GET anonymous `/health` must return 401. A trusted GitHub OIDC workflow must return authenticated health 200, then pair once into Vault and invoke real Cloudflare GET D1/Workers. Verify counts and `cloudflare_writes=0`.
4. Validate full 4D context, OIDC identity and no arbitrary API paths. Keep existing CEREBRO PROD Gateway unchanged.
5. If all green, mark the **sidecar** live for LAB read-only. This is NOT evidence that the original CEREBRO Console already calls it. Connecting the console requires separate planned, tested, reversible contract, and an owner login/auth routing decision.

## Rollback / rebuild

No existing service was modified. To disable, revoke the GitHub workflow's OIDC path by changing the exact `workflow_ref` allowlist or remove the isolated new Edge Function after dependencies, snapshot and explicit security review; never touch CEREBRO Console v33. A separate review may revoke the new dedicated Vault record (exact name only) after confirming no dependent workflow. Retain source in PR #44, no merge until safety gates green.