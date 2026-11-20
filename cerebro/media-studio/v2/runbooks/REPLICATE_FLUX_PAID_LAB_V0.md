# UMS-001 · Replicate/FLUX secure adapter · LAB V0 · 2026-11-08

**Status: CANDIDATE / NOT PROD / NOT ENABLED / NO API BILLING.**

## Existing contracts protected
- Canonical runtime: `cerebro/runtime/creative-job-runner-v1.mjs`, `creative-output-pipeline-v1.mjs`, `supabase/functions/cerebro-creative-dispatch-v1/index.ts`.
- Preserve existing zero-cost render, private bucket, events, business logic, App/CRM/SEO, WordPress and current workflows.
- New module is **additive and unconnected**. It cannot run in PROD; no secrets, databases, workers or external account have been changed.

## Owner instructions
1. Visit https://replicate.com/account/billing and purchase only the prepaid credit you choose. Disable Auto reload. Credit expires after one year and is nonrefundable; check fees, exchange rate and tax.
2. Visit https://replicate.com/account/api-tokens and create a named token for **UMS-001-LAB**. NEVER paste token into chat, code, issue, commit or log.
3. Store token in an encrypted runner/secret store as `REPLICATE_API_TOKEN` (server-side only). GitHub Actions secret settings: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/settings/secrets/actions (not a place to create token). Distinct tokens needed for LAB and PROD.
4. Proposed budgets require atomic FINOPS ledger: **video 40 EUR/month**, **images 20 EUR/month initially** (two 20 EUR image envelopes for two months), per-company reservation, real FX+VAT safety margin, idempotency and concurrency. The Replicate account holds one shared balance. No automatic overspending.
5. Connect trusted completion webhook and validate Replicate signature, persist generated output immediately to private asset store (API outputs normally deleted after 1 hour); only then settle ledger, record hash, QA, Rights, Notion Assets and downstream distribution.
6. Integrate `planReplicateJob` and `submitReplicateJob` with UMS Tool/Model Router in LAB and OLD-vs-NEW; only after tests, tribunal, rollback and independent approval may route IMAGE jobs to FLUX by default. **Never silently fallback to OpenAI images** once an image job is explicitly FLUX-only.
7. No production videos or images until steps 3-6 pass. No automatic social publishing or paid ads from this branch.

## Supported initial official-model allowlist
- FLUX.1.1 Pro $0.04/image
- FLUX.1.1 Ultra $0.06/image
- FLUX Kontext Pro $0.04/image for consistent editing with a reference image
- Runway Gen-4.5 $0.12/sec for carefully chosen hero shots

Pruna P-Video and other video providers remain for separate model-schema and quality/rights review before writing the specific execution adapter. Prices are observations, not fixed contractual guarantees.

## Test locally
`node --test cerebro/media-studio/v2/tests/replicate-provider-lab-v0.test.mjs`

## Gates
Default is OFF. Paid mode requires LAB, owner-funded billing, valid encrypted token, atomic budget reservation, verified webhook, physical old-vs-new, asset persistence, audit and rollback. A stub/mock positive test is not evidence of live billed generation.

**Rollback:** Revert this draft branch/PR. No existing path was changed.
