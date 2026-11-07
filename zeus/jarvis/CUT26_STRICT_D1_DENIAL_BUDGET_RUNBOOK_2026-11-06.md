# JARVIS CUT26 · Strict LAB D1 denial-audit write budget · 2026-11-06

**Estado: HECHO LAB, PROD NO-GO.** PR #25 remains DRAFT and not merged.

## Evidence
Code SHA `1431a16067893e5235b09a474680c4554eae9df1`.
- Core run `42131429937`: **673 PASS, 0 FAIL** (9 additional checks over CUT25).
- Official Wrangler **LOCAL** D1 run `42131429933`: migration 0005, atomic budget 2/2 with third reservation rejected, SQL export, independent local restore of daily counter. SUCCESS.
- B4 `42131429843`, B7 `42131429844`, Governed `42131429891`: SUCCESS. Promotion not attempted.

## Contracts: new, additive, isolated
- `cloudflare-lab/0005_jarvis_d1_daily_denial_quota_lab.sql`: one LAB-only global row per UTC day, quota name GATEWAY_DENIAL, no enrollment or secrets; strict checked max <=1000, no PII fields.
- `core/jarvis-d1-strict-denial-quota.mjs`: parameterized INSERT...ON CONFLICT...DO UPDATE WHERE consumed<max...RETURNING; atomic database serialization across Worker requests sharing **the same database**. 500/day safe default. If DB/clock unavailable or quota depleted, returns false to CUT25 wrapper. Binding must be server-only.
- `core/jarvis-d1-strict-denial-quota.test.mjs`: 9 tests for hard cap, daily UTC reset, controlled config mismatch, concurrent reservations, file reopen, credential redaction, fail closed and actual CUT25 audit-wrapper integration.

## What this does NOT prove
- Does **not** limit Cloudflare account-wide D1 rows read/written, Workers requests or B3/mission SQL. It is strictly a reservation cap for **CUT25 denial-audit writes**, and takes place **after** the underlying gateway handler returns. It cannot by itself block abusive upstream reads/CPU; a separate pre-handler Worker edge limiter is required.
- Cloudflare native Workers Rate Limiting API is approximate, eventually consistent and per colo. It is not strict global protection. If a global quota is mandatory, use an atomic durable counter on a dedicated controlled resource, while respecting its own D1 read/write costs.
- A failed audit insert after a successful reservation consumes a slot, by design (conservative). Quota exhausted/failure returns deny without logging, to avoid recursive writes. For critical high-risk security incidents a separate low-cost external monitoring channel or edge log is still to be evaluated.
- No authenticated remote D1 verification occurred. No Worker was deployed, no dedicated EU-jurisdiction D1 was created, no real B2/B3/Vault or device session used. Physical cloud certification remains **PENDIENTE**.

## Free tier and relevant documented facts (checked 2026-11-06)
Cloudflare Workers Free: 100,000 requests/day and 10ms CPU per invocation. D1 Free: 5 million rows read/day and 100,000 rows written/day; on hitting limits, calls fail rather than billing or upgrading automatically. The current account was previously observed Free and remote D1 `cerebro-jarvis-lab-cut21` had jurisdiction NONE. No new paid plan.
Sources:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Rollout and next physical blocker
1. Recheck Cloudflare D1 inventory; create **separate** `cerebro-jarvis-lab-eu` with jurisdiction **eu** at creation using a permitted write-capable admin interface/secure scoped credential. The authenticated Opera connector in chat supports navigation/read, not click/type/submit. No keys in chat.
2. Verify new D1 EU UUID and jurisdiction via trusted read-only API response. Snapshot, migrate 0001..0005 on isolated NEW D1 with synthetic records, demonstrate independent remote restore and documented rollback, verify resource usage.
3. Integrate dedicated server-only B2/Vault identity, B3 grants and Gateway under OFF/NO ROUTES; add early edge rate limiting and quota-aware observability, test with TWO physical sessions and revocation.
4. Independent B10 tribunal, OLD vs NEW and approved gradual rollout. **CI GREEN alone is not permission to deploy PROD.**

## Protected systems
App Fénix real, CRM, PROD, main, Supabase alternate (not empty), Trading, ANA, WordPress, DNS and existing Cloudflare Workers remain unchanged. No remote D1 mutations. Cost of GitHub Actions quota consumption not quantified.

## Rollback
Revert only CUT26 branch commits in PR #25 DRAFT. No remote resource to revert.
