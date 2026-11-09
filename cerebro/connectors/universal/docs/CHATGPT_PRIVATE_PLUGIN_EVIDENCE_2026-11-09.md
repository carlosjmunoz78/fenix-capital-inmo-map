# FACT-001 · Cloudflare Universal / ChatGPT Private Plugin · P0 evidence
Date: 2026-11-09
Company: fenix-capital
Engine: FACT-001
Environment: LAB
Version: 0.1.0

## Verifiable state
- GitHub PR #44 (DRAFT) and isolated branch `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`.
- Shared core, account-wide Cloudflare capability catalog, authenticated transport-neutral MCP adapter, CEREBRO Gateway bridge.
- Node test suite: 14/14 PASS on isolated local runtime, no external Cloudflare HTTP calls.
- Private ChatGPT plugin created: `plugins_6af1f05c0e348191a4afd20c4aa0cb79`; visibility PRIVATE, version 0.1.0, link: https://chatgpt.com/plugins/plugins_6af1f05c0e348191a4afd20c4aa0cb79
- **This plugin is a skill-only PREPARATION package. It is not an MCP connection and cannot directly access the Cloudflare API.**
- GitHub Actions repository secret `CEREBRO_CLOUDFLARE_API_TOKEN`: its NAME and presence were verified visually in authenticated Opera GitHub Actions Secrets UI on 2026-11-09; its value was NOT read.
- Cloudflare Account `e39a57e1ac42650ca5a6d5307cf0ac8e` D1 dashboard read-only inspection showed 7 existing D1 databases, including Instagram; Facebook target `cerebro-facebook-autoqual-lab` not present in visible rows.
- The Cloudflare token permissions and successful API authentication have **NOT** been tested or attested.
- Facebook D1 NOT created; Facebook Worker NOT deployed; no UUID replaced.
- No App, CRM, DNS, PROD, Instagram, or main changes.

## Remaining physical acceptance
1. Use a trusted authenticated runtime that receives Cloudflare secret from the encrypted repository store (not the chat). Prove the API token is valid for the exact Cloudflare account; discover permitted resource scopes and current free quota. No paid fallback.
2. Add a durable atomic idempotency store and verified FinOps guard before ANY mutation.
3. Safely create the isolated EU Facebook D1 if absent; verify real UUID, commit only to Facebook branch; deploy only disabled Worker after gates.
4. Bind `transport/mcp.mjs` to an HTTPS MCP server with OAuth 2.1 and a verified ChatGPT client identity, and `transport/cerebro-gateway.mjs` to existing CEREBRO Gateway with independent IAM. Do not pass repository API token to ChatGPT.
5. Verify actual tools/list, authenticated tools/call, provenance and rollback from ChatGPT normal AND CEREBRO separately. Never claim operational state based only on Node mocks.
6. Expand account-wide Cloudflare modules with separately approved granular scopes and non-destructive OLD/NEW regression.

## Safety / rollback
All changes are additive under `cerebro/connectors/universal/` on a DRAFT feature branch. Revert branch commits to undo code and skill integration; no Cloudflare resources have been created by this project step. GitHub Actions secret remains encrypted and is not automatically consumed by ChatGPT or Cloudflare.
Cost new external spend: 0 EUR. No ChatGPT Work.

## 2026-11-09 · Verified Cloudflare API read-only addendum (later than original audit)

- **Real GitHub Actions run:** https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42654687202
- **Commit verified:** `62493c9b8b7664915e319e62145550545d27d57b`; job `129289903328`; event `push`; GitHub conclusion **success**.
- The GitHub job used repository secret `CEREBRO_CLOUDFLARE_API_TOKEN` in runner environment without disclosing its value. The script made only HTTP **GET** requests to Cloudflare official APIs.
- Verified runner evidence from logs:
  - `CF_TOKEN_ACTIVE=true`
  - `CF_ACCOUNT_D1_READ=true`
  - `CF_ACCOUNT_WORKERS_READ=true`
  - `CF_D1_DATABASE_COUNT=7`
  - `CF_FACEBOOK_D1_EXISTS=false`
  - `CF_D1_FREE_REFERENCE_SLOTS=3`
  - `CF_PLAN_FREE_ATTESTED=false`
  - `CF_MUTATIONS=0`
  - `CF_CODE_GET_ONLY=true`
- The token/API credential and specific account read permissions are **verified for this run**; this supersedes earlier `NOT VERIFIED` status for those *read* gates only.
- **Not verified:** account billing plan, quota headroom under current account plan, D1 create permission, Workers deploy/write permission, durable idempotency store, MCP server/OAuth live connection, CEREBRO Gateway physical routing, OAuth client identity separation, rollback in Cloudflare, or zero-cost autonomous mutations.
- **Next gate:** verify Free-plan status & cost guard and persist idempotency before any D1/Worker mutation. Do not infer deployment safety from an active token.
- Existing PR remains DRAFT; no App/CRM/PROD/DNS/Instagram/FB Worker changes.

## 2026-11-09 · Cloudflare subscription UI physical read-only attestation

The authenticated Opera Browser Connector navigated to the **Subscriptions** panel for exact account `e39a57e1ac42650ca5a6d5307cf0ac8e`:
`https://dash.cloudflare.com/e39a57e1ac42650ca5a6d5307cf0ac8e/billing/subscriptions`.

Visible labels in the account at inspection:
- `Workers Free` — `Activo`
- `fenixcapital.es` — `Free Plan` — `Activo`
- `Teams Free Base` — subscribed.

**This is browser/dashboard-attested plan state**, separate from the GitHub API job output `CF_PLAN_FREE_ATTESTED=false` (the job did not query billing and must not claim it did). Cloudflare's documented Free D1 limit is 10 databases per account. Combined with GET-only D1 inventory count=7, the observed current capacity is 3 additional D1 database slots, subject to quotas staying unchanged.

**No subscription action, charge, new resource, DNS update, database mutation, or Worker deployment occurred.**

Remaining blocker for any Facebook D1 creation: a durable atomic idempotency mechanism and independently verified zero-additional-cost write gate must be wired; this read-only attestation is not a write approval on its own. Preserve PR #44 and FB PR #9 in DRAFT.

## 2026-11-09 · REAL Facebook EU D1 created (write gate passed)

- Official Cloudflare API D1 create-once executed from **public repo's isolated GitHub Actions feature branch** with encrypted repo secret; no ChatGPT Work and no new subscriptions.
- One-shot GitHub run **42657317186**, successful: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42657317186
- Source commit: `4dc9b9560b82d22223790c5b7e873d2fbfa5c6a1`.
- New **D1**: `cerebro-facebook-autoqual-lab` in jurisdiction `eu`; UUID **`e8fe801d-4b01-4e34-ac12-26014b79adc1`**. Verified by API readback and physical Cloudflare dashboard lookup.
- Durable GitHub ref `refs/heads/cerebro-ledger/facebook-d1-eu-create-v0` created and finished in `COMPLETE`. Repeated/uncertain requests fail-closed; no paid D1.
- Facebook private PR #9 only changed Wrangler config UUID (commit `4168ac54561ed2125adff611211c1025307006c7`) and later README evidence; all OFF flags and route isolation preserved.
- New offline tests `facebook-create-once.test.mjs`: **9/9 PASS**; combined universal factory Node tests **30/30 PASS** locally before deployment.
- **Worker not deployed, Cron not enabled, SQL migrations not run, Groq OFF, no public routes.**

### Separate private repository deployment attempt — BLOCKED by GitHub Actions billing
- The source Facebook repository is **PRIVATE**. It independently has an encrypted `CLOUDFLARE_API_TOKEN` repository secret (name only verified via authenticated GitHub UI). The secret was not viewed.
- OFF-only deployment workflow and gates added on FB DRAFT branch, source commit `8e5944a169066efc83fcbc8c17a10b25faa20999`.
- Workflow run **42659352602**: FAILED **before any job steps**. GitHub UI states: *The job was not started because recent account payments have failed or your spending limit needs to be increased.* No Wrangler deployment took place.
- The user has a **zero-additional-cost** policy; DO NOT increase any limit or enable billing, especially not to bypass this gate.
- GitHub settings under social repository show **no self-hosted runners configured**. A free self-hosted runner on an existing authorized device is a potential future path if approved/available, not implemented.
- This is not a Cloudflare API permission failure; the job never reached the token check.
- Existing public factory PR #44 remains DRAFT, no merge; private FB PR #9 remains DRAFT; no App/CRM/DNS/PROD/Instagram/Buffer changes.

### Current status distinctions
- **HECHO:** Free plan UI observed, token read proven, EU Facebook D1 created and UUID committed, idempotency persisted.
- **PARCIAL:** offline Worker test/gate source prepared, 4 local safety tests PASS.
- **BLOQUEADO:** private GitHub Actions billing block prevents Worker job startup; no authenticated ChatGPT MCP production route or CEREBRO Gateway E2E yet.
- **COST:** no additional paid services subscribed and no confirmed extra charge from these operations. Cloudflare Workers Free remained active.
