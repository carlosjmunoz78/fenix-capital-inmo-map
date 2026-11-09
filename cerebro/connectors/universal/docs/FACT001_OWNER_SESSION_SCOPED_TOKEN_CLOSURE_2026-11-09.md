# FACT-001 · Cierre de gates humanos de CEREBRO y Cloudflare

2026-11-09 · Estado DEFINIDO, protegido, NO promovido. Coste adicional contratado 0 €.

## Evidencia previa
- Main `cerebro-console-gateway-v0` ACTIVE v33. Repo `supabase/functions/cerebro-console-gateway-v0/index.ts` identical to physical deployed source; blob SHA `44241c6abc3cb89560500336e332f0628219d0fc`.
- New owner canary LAB `cerebro-fact001-console-owner-canary-lab` ACTIVE v2. JWT of a signed-in Supabase owner must be checked using `auth.getUser` and server RPC actor `CARLOS-ADMIN`. Negative identity/CORS gates pass; signed GitHub OIDC client GET successful once.
- Golden shadow integration patch: `cerebro/connectors/universal/console/owner-console-v33-shadow-patch.mjs`, hard-disabled route `GET cloudflare-inventory` for eventual owner path. Golden regression/byte-for-byte rollback SUCCESS [#42707365667](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42707365667); 10/10 unit tests. No deployed Console changes.
- Owner browser observed `https://app.fenixcapital.es/cerebro` login screen `Acceso seguro / Entrar`; no authenticated Supabase session currently available to test. The earlier GitHub user E2E JWT expired.
- Cloudflare connected OAuth allows direct GET and selected LAB writes, but API token-management GET returned 403 code 9109. Dashboard shows Create Token and a preexisting broad active CEREBRO token with 59 permissions. No narrowly scoped new token is established.

## HUMAN_REQUIRED #1 · Owner login
Open existing Opera tab `https://app.fenixcapital.es/cerebro` and click **Entrar**. Sign in normally and keep the page open. NEVER send a password, session token, screenshot of a secret or API token through chat. After a session is available, invoke owner canary `owner-health` and fixed `owner-inventory` from the authenticated App context; require actor `CARLOS-ADMIN`, 200 and read-only returned counts. If 429, respect Cloudflare rate limit without retry storm.

## HUMAN_REQUIRED #2 · Minimal-scope Cloudflare token
Use owner dashboard `https://dash.cloudflare.com/profile/api-tokens` or account-owned token management as permitted by role. Name suggestion: `CEREBRO-FACT001-READONLY-V1`. Scope ONLY account `e39a57e1ac42650ca5a6d5307cf0ac8e`. Require **read-only** for account resources, D1, Workers Scripts, Workers KV Storage, Access Apps as needed by actual API calls. Do not grant Account Settings Edit, API Tokens Edit, DNS Edit, Workers Scripts Write or D1 Write in this READ profile. Exclude optional R2 and Logpush unless entitlement and permission are separately verified. Cloudflare permission exact labels may vary, validate in dashboard and official docs before finalizing.
Store the one-time token via an authenticated secure secret-entry path to Supabase Vault under a **new** name `cerebro_fact001_cf_readonly_v1`, not in chat, GitHub source, workflow logs, or plaintext frontend. Do not replace or delete the existing LAB Vault credential before positive signed read-only E2E and rollback. Rotation and budget alerts are a separate controlled workflow.

## After both gates are green (no implicit promotion)
1. Owner canary live GET 200 with new narrow token in separate vault record; verify token active and D1/Workers GET, no writes.
2. Compare existing 5 Console routes OLD vs NEW; import disabled flag patch into isolated parallel canary and physically verify old behavior, owner link, foreign tenant 403, anonymous 401, quota 429, observability.
3. Test rollback to old source SHA; activate feature flag only on approved promotion. Keep App/CRM/DNS/Trading and preexisting Cloudflare resources unchanged.
4. Expand specific Cloudflare CRUD for preexisting production resources only with per-operation policy, snapshots, permissions, cost check, evaluation tribunal and compensating rollback.

## Recovery
Current safe state: Console v33 unchanged and 4D Cloudflare LAB standalone services independent; owner route OFF, PR #44 DRAFT. No secret value included in this file.
