# CEREBRO First-Party Account Signals & Analytics Profile V1

Date: 2026-10-14  
Scope: block 74-82  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
Provider activation: not authorized  
PROD write: not authorized  
CRM write: not authorized  
Trading: isolated

## Architecture decision

Block 74-82 is one transversal privacy-first signals profile over canonical `EVT-001`, `LEAD-001`, `CAP-001`, `CRM-001`, `OBS-001`, `OBSERV-001`, `ROUTE-001` and `IAM-001`. It does not create analytics-vendor engines.

The implementation is deliberately **contract/normalization/scoring/merge logic first**. It does not inject scripts into WordPress/App Fénix, activate provider projects, persist analytics events, alter CRM, or touch PROD.

The migration sequence remains `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## First-party event contract

Allowed event classes are limited to structural analytics metadata: `PAGE_VIEW`, `CTA_CLICK`, `FORM_SUBMIT_METADATA`, `AUTHENTICATED_ACCOUNT_VIEW`, `CONVERSION_METADATA`.

Analytics consent is required by policy before a normalized event is accepted. URLs are reduced to origin + path; query strings and fragments are discarded. Raw IPs, user-agent strings, cookie values, form values, email, phone, names, tokens, device fingerprints and raw query data are forbidden inputs rather than merely ignored.

Known `account_id` and an explicit company domain may be attached when already available through a legitimate first-party context. No person identity is derived.

## Analytics provider order

`FIRST_PARTY_LOCAL -> POSTHOG_FREE -> MICROSOFT_CLARITY_FREE -> YANDEX_METRICA_FREE`.

This is a **planning order**, not an activation. First-party/local remains preferred. External analytics are optional fallbacks and require consent/privacy readiness. There is no automatic paid fallback.

### Provider dispositions

- **PostHog**: official pricing currently includes 1M product-analytics events per month free and states no card is required for the free plan. PostHog also documents freely available self-hosting, while noting self-hosting is unsupported by PostHog. CEREBRO keeps it optional, caps cloud planning at the free allowance and permits no automatic spend or deployment.
- **Talivia**: current official material describes revenue-attribution/session tracking and a trial followed by paid pricing. It remains **patterns only / HOLD** under the 0 EUR policy.
- **Microsoft Clarity**: official pricing says free forever. Microsoft documentation states consent signals are enforced for EEA/UK/CH traffic for full functionality from 2025-10-31. It remains a free **consent/privacy-gated candidate**, not an activated tracker.
- **Yandex Metrica**: official GDPR documentation describes cookie/tracking notice, data-processing agreement and IP-masking controls, while noting form-field recognition/masking is not guaranteed in every implementation. It remains **HOLD pending privacy/legal review** and is not injected into the site.

## Company visitor identification

Autonomous planning is restricted to exact, known first-party company context: an existing `account_id` or an explicitly supplied company domain with a first-party/consent basis. Person resolution, third-party anonymous visitor resolution, device fingerprinting and covert deanonymization are outside autonomous scope.

## Visited-page intent signal

The profile emits a bounded account-level page-intent signal rather than replacing the broader Phase 7 lead score. Initial deterministic page weights are:
- HOME 5
- BLOG 10
- SERVICE 20
- CASE_STUDY 25
- CONTACT 30
- PRICING 35
- APPLICATION_START 40

Only normalized, consented first-party events tied to the exact account are scored. Each category contributes at most once and the result is capped at 100.

## Return-visit signal

A return visit is derived only for the same exact account when normalized events create at least two visit windows separated by a deterministic configurable gap (30 minutes by default). It does not use device fingerprints or person identity.

## CRM + website event merge

The V1 merge is read-only and exact-key only. Website events join to CRM accounts by exact `account_id`; an explicit normalized company domain may be used only where it uniquely maps to one CRM account. Ambiguous domains are not resolved. Fuzzy company/person matching is disabled. No CRM mutation occurs.

## Safety boundaries

Top-level human exceptions remain exactly `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No raw IP/user-agent/cookie/form contents, no person resolution, no device fingerprinting, no covert deanonymization, no provider activation, no CRM writes, no auth/MFA/CAPTCHA/anti-abuse bypass, no automatic paid usage, no PROD write and no Trading access.

## Dependency map

Preserve:
- `cerebro/runtime/company-intent-resolution-profile-v1.mjs`
- `cerebro/runtime/lead-discovery-enrichment-profile-v1.mjs`
- `cerebro/runtime/web-acquisition-intelligence-profile-v1.mjs`
- `cerebro/registry/engine-registry.seed.json`

Overlay:
- `cerebro/runtime/first-party-account-signals-profile-v1.mjs`
- `cerebro/tests/first-party-account-signals-profile-v1.test.mjs`
- `cerebro/registry/first-party-account-signals-profile.v1.json`
- `.github/workflows/cerebro-first-party-account-signals-profile-v1.yml`

Not activated by this block: WordPress/App tracking tags, PostHog runtime, Clarity runtime, Yandex Metrica runtime, Talivia runtime, CRM writes or analytics persistence.

## Promotion gate

Before transversal closure: exact-head Node 24 focused tests, regressions for Company Intent + Lead Discovery + Web Acquisition, candidate full CEREBRO suite, exact-base full suite, OLD-vs-NEW, privacy/security/cost review, merge and post-merge main verification.

Rollback is profile-only revert. Rebuild is deterministic from this document, registry, runtime contract and tests. Cost=0 EUR, provider activation=false, PROD authority=false, CRM write=false, Trading=false.
