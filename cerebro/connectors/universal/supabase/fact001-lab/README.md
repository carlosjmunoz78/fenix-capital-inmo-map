# CEREBRO FACT-001 · Deployed-sidecar candidate · OIDC LAB only

**State: DEPLOYED LAB READ-ONLY, physical signed OIDC + Vault + Cloudflare GET VERIFIED. Existing CEREBRO Console PROD not integrated.**

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
## Physical E2E acceptance · 2026-11-09

- New Supabase Edge Function `cerebro-fact001-cloudflare-lab` version 1 ACTIVE (new slug only, not replacing any existing function).
- [Physical signed service-to-service E2E run #42688149814](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42688149814): 12/12 negative and signature tests pass, anonymous 401, fake identity 401, signed GitHub OIDC health 200.
- Same real run securely provisioned exactly **one** named LAB secret into existing Supabase Vault (`PAIRED`, SQL count=1) and then queried Cloudflare real D1 and Worker GET (`200`, 8 D1, 7 Workers, 0 Cloudflare mutations). No token value was emitted in logs or replies.
- Existing `cerebro-console-gateway-v0` v33 ACTIVE remains unchanged. This **is a deployed CEREBRO LAB service**, but **NOT an integrated CEREBRO Console PROD route**.
- Cloudflare Worker remains workers.dev=false, previews=false, zero routes/crons; owner-only Access app ID `34a3cd38-968a-41f8-a654-351e7c1e7964` attached to exact Worker immutable ID `862c28ba6b834d54ba3825161170bf68`. Cloudflare Worker itself remains OFF; deployed sidecar calls Cloudflare REST directly through Vault.
- Legacy GitHub cloud admin token has a broader scope than strictly necessary. It is stored encrypted for this LAB pilot only. **Do not enable full account writes or production until a separately scoped READ-ONLY credential is provisioned and rotated**. Token management endpoints return 403 for existing administrator token.
- Access app installer workflow was made manual-only after success, preventing accidental re-creation. Only one Vault record, no DB schema creation.

## On-demand order from normal ChatGPT and future CEREBRO

Update only the approved request ID in `requests/probe.v1.json`; GitHub Actions verifies the exact 4D contract and only permits `cloudflare.account.inventory`, then invokes the deployed CEREBRO LAB service using fresh GitHub signed OIDC. This is the shared zero-Work bridge. Existing CEREBRO Console v33 can be bound only through a separately reviewed authenticated routing change; never report it already functional.

## Rollback

Leave Cloudflare Worker OFF and Access protected. The new Edge Function may be disabled/retired independently after recorded dependency and rollback tests; never replace any old Gateway. Vault credential rotation/revocation requires independent review and new scoped token, never print or copy the old token.

## Post-provision hardening: no token retransmission

After the first successful Vault pairing and verification, the normal GitHub OIDC inventory workflow stopped injecting `CEREBRO_CLOUDFLARE_API_TOKEN` and no longer calls the provisioning endpoint. It only sends the temporary signed OIDC identity to the deployed CEREBRO LAB sidecar, which retrieves the existing encrypted secret from Supabase Vault internally. A new approved order ID is required to retrigger via the allowlisted request JSON; all scope, account and operation fields are immutable. This reduces ongoing exposure of the existing administratively broad token. Future key rotation must be explicitly designed as a separate one-time secure workflow rather than allowing ordinary inventory calls to re-pair credentials.
