# JARVIS CUT30 · Cloudflare Access OWNER canary · 2026-11-06

**Status:** HECHO LAB code/CI; CLOUD LOGIN NOT DEPLOYED; PROD NO-GO; PR #25 DRAFT.

## Reason to build this stage
CUT29 established remote D1 in jurisdiction EU and remote independent **empty schema** restore. Remaining highest-priority blocker is authentic owner login with no PC on, not more synthetic database exercises. Reuse Cloudflare Workers Free and Cloudflare Access Free if the current account qualifies; do NOT change the current Fénix App authentication or deploy a fake "OWNER_ROOT" account.

## Facts observed
- Existing JARVIS D1 EU `988b11e1-21aa-4cf9-8b9d-110319df7ccc` and restore EU `c446f17c-c26d-4c76-a3ea-f62c843d461b` remain preserved.
- Cloudflare authenticated Opera → Cloudflare One shows "Bienvenido a Cloudflare Zero Trust" with "Comenzar" onboarding. This is **not evidence of a configured, working Access application**.
- Cloudflare official Access product offers Free to small teams (<50 users); current account-specific Access plan eligibility has not been verified. If a payment card, paid plan, subscription or contract increase is required, **STOP** (HUMAN_REQUIRED/MONEY_LIMIT).
- Access can authenticate a request before a Worker and pass verified `ctx.access` with identity and app AUD; such context is not forwarded across service bindings. Read official docs before enabling any routing: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ .

## HECHO CODE CUT30
- `zeus/jarvis/core/jarvis-access-owner-canary.mjs`: a LAB-only admission probe; requires (a) runtime `ctx.access` (not headers), (b) exact `JARVIS_ACCESS_AUD` secret and (c) exact normalized `JARVIS_OWNER_EMAIL` secret. No client JWT parsing, no owner identity response or email echo. GET `/__jarvis/owner-check` only; all other requests forbidden; runtime OFF unless `JARVIS_ACCESS_PROBE_ENABLED=true`.
- `zeus/jarvis/cloudflare-lab/worker-access-probe.mjs`: candidate Worker entrypoint with **no D1** and no mission service.
- `zeus/jarvis/cloudflare-lab/wrangler-access-canary.lab.jsonc`: new private Worker candidate, `workers_dev:false`, `routes:[]`, `JARVIS_ACCESS_PROBE_ENABLED:false`, B2/B3 and Gateway OFF, no secrets or client data in config.
- `zeus/jarvis/core/jarvis-access-owner-canary.test.mjs`: 10 tests for spoofed headers, missing/mismatched AUD, missing owner secret, unauthorized identity, non-GET methods, route abuse, no leaks or PROD, and positive synthetic owner.
- `zeus/jarvis/cloudflare-lab/verify-cut30-access-canary.mjs`: deployment guard. Wrangler `deploy --dry-run` compiles canary with no Cloudflare modifications.

**CI evidence:** SHA `e290963a312cca0d930573937c5c4c941fa125b9`, Core `42186776169` **705/705 PASS**; Wrangler `42186776106` OFF canary bundle PASS; B4 `42186776254`, B7 `42186776147`, Governed `42186776226` all SUCCESS. Promotion NOT executed.

## One physical activation mission — strict order
1. In Cloudflare account `e39a57e1ac42650ca5a6d5307cf0ac8e`, inventory any existing Zero Trust organization, free tier, Access apps and Workers. **DO NOT enable an account-wide Access rule**; this could change old Fénix Workers.
2. Complete Zero Trust **Free** onboarding only if plan and cost exactly 0, without disturbing existing protections. Any billing or security risk escalates.
3. Inspect for prior `cerebro-jarvis-lab-eu` Worker. If absent, deploy a new `worker-access-probe.mjs` from PR #25 config (OFF, no route, no D1), preserve deploy version/rollback. Never use the old Workers.
4. Add **Worker-scoped Access** allow rule only for the owner's verified identity (exact single email, NOT whole email domain, NOT all workers). Do not expose Worker to public requests until Access policy is verified. Keep `JARVIS_GATEWAY_ENABLED=false` and B2/B3 false.
5. Store `JARVIS_ACCESS_AUD` and `JARVIS_OWNER_EMAIL` using Cloudflare Worker Secrets only, never repo/console/log/ZIP/ChatGPT; verify exact audience and email match and kill switch/rollback.
6. If and only if Access blocks unauthenticated callers and requires owner login, enable a LAB-specific `workers.dev` route for **this Worker alone** and the canary flag. Execute: owner from desktop, owner from mobile, unrelated identity, missing Access. Capture sanitized result, resource URL and event evidence; no PII/token snapshots. If account cannot enforce Access before route, leave route OFF and report HOLD.
7. Revert to OFF and no route on failure. Do not enroll B2 owner, grant B3, deploy Gateway, query D1, integrate App or promote PROD during this stage.

## What this does NOT yet prove
An authenticated Cloudflare Access identity check is **not** JARVIS OWNER_ROOT B2 session enrollment. No HMAC session is saved in D1, no B3 grant, no two-device mission continuity, no B10. These remain next phase after Access identity canary is physically verified. Cloudflare Access Free may impose account prerequisites and initial human login.

## Protected resources
No App/CRM real changes, no Supabase changes, no main merge, no DNS, Trading, ANA, SEO, WordPress or old Cloudflare Worker mutations. Additional subscription cost 0. D1 source and restore preserved. Rollback: code-only revert in PR25 DRAFT until a separate Work deployment is explicitly done.
