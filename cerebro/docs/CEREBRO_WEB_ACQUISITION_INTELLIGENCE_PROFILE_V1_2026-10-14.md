# CEREBRO Web Acquisition & Intelligence Profile V1

Date: 2026-10-14  
Scope: block 51-61  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
Trading: isolated

## Decision

Block 51-61 is implemented as a transversal acquisition/research profile over existing engines, not as eleven new engines or provider servers. It preserves the canonical engine IDs, the merged post-SCAN runtime and the central execution/browser safety boundaries.

Required sequence is `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`. No App, CRM, Supabase PROD, WordPress, SEO production runtime, Training or Trading runtime is replaced.

## Inventory reconciled against current main

- `WAUD-001`, `KW-001`, `SOCAUD-001`, `LOCALP-001`: EXISTENTE. Shared `post-scan-parallel-v1.mjs` runtime and durable PREPROD control-plane were merged in PR #621 with physical PREPROD smoke and rollback evidence.
- `COMPET-001`: PARCIAL on current main. Historical PR #159 contains a deterministic public-evidence implementation, but that PR was merged into an older non-main base and `cerebro/runtime/competitor_intelligence.py` is not present on current main. This profile therefore does not claim COMPET continuous runtime as operational.
- Technology Scout: PARCIAL. Deterministic V0 exists in legacy open stacked PR #201 but is not canonical main. V1 ports only the useful zero-cost/evidence/license/security scoring semantics into this transversal profile; it does not merge the stale stack.
- Draft PR #640 contained only the rollout queue and is not treated as implementation evidence.

## Acquisition order

`OFFICIAL_API_FEED_SITEMAP -> SCRAPLING -> CRAWLEE -> APIFY_FREE -> BROWSER_FALLBACK`.

The route is deterministic and plan-only in V1. Browser remains the final fallback and inherits the fresh-binding, LAB/PREPROD, no-bypass boundaries of the authorized execution/device profile.

## Provider/source dispositions

- Scrapling: `D4Vinci/Scrapling`, BSD-3-Clause. LAB/local OSS adapter candidate only.
- Crawlee: `apify/crawlee`, Apache-2.0. LAB/local OSS adapter candidate only.
- Apify platform: free-tier-only fallback. This profile creates no subscription and permits no automatic spend; any non-zero incremental cost routes to `MONEY_LIMIT`.
- Agent-Reach: `Panniantong/Agent-Reach`, MIT. LAB research/source-adapter candidate only; no automatic external code execution.

None becomes a production dependency in V1. Import/runtime activation requires provenance, license, security, cost, impact analysis, tests, evaluation and OLD-vs-NEW.

## Safety and acquisition policy

Only authorized public research is routable. Non-public/local network targets fail closed. Robots policy, legal/terms constraints, consent/auth boundaries and site security controls are mandatory gates. CAPTCHA, MFA, login, consent and anti-abuse controls are never bypassed or evaded.

Top-level `HUMAN_REQUIRED` remains restricted to `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

Routine robots/auth/CAPTCHA/consent/browser-binding failures are HOLD/ACTION_REQUIRED, not fabricated human exceptions.

## Technology Scout

The profile preserves the useful intent of legacy PR #201: deterministic candidate scoring requires source, observation/version, license, security notes, integration notes and explicit cost. Zero-cost candidates may be scored; non-zero cost is `HUMAN_REQUIRED/MONEY_LIMIT`; incomplete provenance/evidence is HOLD. It remains plan-only and does not authorize installation or execution.

## Dependency map

Preserve unchanged:
- `cerebro/multicompany/post-scan-parallel-v1.mjs`
- `cerebro/runtime/authorized-execution-device-profile-v1.mjs`
- `cerebro/router/execution-model-router.mjs`

Historical evidence, not current-main runtime:
- PR #159 `COMPET-001`
- PR #201 Technology Scout V0

Overlay:
- `cerebro/runtime/web-acquisition-intelligence-profile-v1.mjs`
- `cerebro/tests/web-acquisition-intelligence-profile-v1.test.mjs`
- `cerebro/registry/web-acquisition-intelligence-profile.v1.json`
- `.github/workflows/cerebro-web-acquisition-intelligence-profile-v1.yml`

No canonical engine implementation is deleted or replaced.

## Promotion gate

Before block-level HECHO: exact-head Node 24 focused tests, existing post-SCAN regressions, candidate full CEREBRO suite, exact-base full suite, OLD-vs-NEW, security/policy/cost review, merge, and post-merge main verification. Child statuses remain evidence-based: provider adapters, COMPET continuous runtime and Technology Scout do not become operational merely because the transversal profile is validated.

Rollback is profile-only revert; existing post-SCAN runtime remains canonical. Rebuild uses this document, registry, runtime contract and tests. PROD authority=false, PROD write=false, Trading=false, additional cost=0 EUR.
