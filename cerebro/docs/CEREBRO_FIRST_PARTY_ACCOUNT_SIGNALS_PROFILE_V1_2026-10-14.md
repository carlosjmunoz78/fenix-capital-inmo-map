# CEREBRO First-Party Account Signals & Analytics Profile V1

Date: 2026-10-14  
Scope: block 74-82  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
Provider activation: not authorized  
PROD write: not authorized  
CRM write: not authorized  
Trading: isolated

## Closure decision

The **transversal profile integration scope** for block 74-82 is HECHO on `main`. This closure validates contract/normalization/scoring/merge logic; it does not activate tracking tags, analytics providers, persistence, CRM writes or PROD execution.

Block 74-82 remains one privacy-first signals profile over canonical `EVT-001`, `LEAD-001`, `CAP-001`, `CRM-001`, `OBS-001`, `OBSERV-001`, `ROUTE-001` and `IAM-001`. No analytics-vendor engines were created.

The migration sequence remained `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Evidence-based child status

- 74 First-party event capture: **PARCIAL**. Privacy-minimized deterministic event contract is integrated; no PROD tag deployment, provider activation or persistence.
- 75 PostHog: **POR AUDITAR**. Free-tier/self-host candidate only; no project/runtime activation.
- 76 Talivia: **HOLD**. Paid revenue-attribution service; patterns only under the 0 EUR rule.
- 77 Microsoft Clarity: **POR AUDITAR**. Free candidate but activation remains consent/privacy gated; no tag is deployed.
- 78 Yandex Metrica: **HOLD**. Privacy/legal/DPA/consent review remains required before any activation.
- 79 Company visitor identification: **PARCIAL**. Exact known account or explicit first-party company-domain planning only.
- 80 Visited-page intent score: **PARCIAL**. Deterministic account-level page signal is integrated; no live event source is active.
- 81 Return-visit signal: **PARCIAL**. Deterministic account return-visit derivation is integrated; no fingerprinting/live tracking.
- 82 CRM + website event merge: **PARCIAL**. Read-only exact account/domain merge is integrated; no CRM mutation or fuzzy person matching.

## First-party event contract

Allowed event classes are structural metadata only: `PAGE_VIEW`, `CTA_CLICK`, `FORM_SUBMIT_METADATA`, `AUTHENTICATED_ACCOUNT_VIEW`, `CONVERSION_METADATA`.

Analytics consent is required by policy before normalization. URLs are reduced to origin + path; query strings/fragments are discarded. Raw IP, user-agent, cookie values, form values, names, emails, phones, tokens, fingerprints and raw query data are forbidden inputs.

Known `account_id` and an explicit company domain may be attached only when already available through a legitimate first-party context. No person identity is derived.

## Analytics provider order

`FIRST_PARTY_LOCAL -> POSTHOG_FREE -> MICROSOFT_CLARITY_FREE -> YANDEX_METRICA_FREE`.

This remains a planning order, not activation. First-party/local is preferred; no automatic paid fallback exists.

Provider evidence remains recorded in the registry: PostHog is optional with a free-tier hard cap/no-auto-spend boundary; Talivia is paid/patterns-only; Clarity is free but consent/privacy gated; Yandex Metrica remains privacy/legal gated. None was activated.

## Company signals

Visited-page intent is bounded, account-level and deterministic. Page categories contribute at most once and the result is capped at 100. Return visits require at least two visit windows for the same exact account, separated by a deterministic gap. Neither uses person identity or device fingerprints.

CRM + website merge is read-only and exact-key only. `account_id` is preferred; an explicit company domain may be used only when it maps uniquely. Ambiguous/fuzzy matching is not performed.

## Safety boundaries

Top-level human exceptions remain exactly `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No raw IP/user-agent/cookie/form contents, no person resolution, no fingerprinting, no covert deanonymization, no provider activation, no CRM writes, no auth/MFA/CAPTCHA/anti-abuse bypass, no automatic paid usage, no PROD write and no Trading access.

## Verified promotion evidence

Feature PR: **#663**.  
Exact feature head: `67ec51ca0b041bae0967f8a6dc39ecdf6d83063a`.  
Feature merge on main: `c07037a9358ed9b53b004ba4ff6071a091355961`.

Pre-merge exact-head workflow run **38485399794** passed focused profile, Company Intent/Lead/Web regressions, candidate full CEREBRO suite and exact-base full CEREBRO suite. Governed Main Integration run **38485399733** and RSI Promotion Readiness Shadow run **38485399722** also passed on the exact feature head.

OLD-vs-NEW: **NEW_BETTER_NO_REGRESSION_WITH_ADDED_PRIVACY_FIRST_EVENT_AND_ACCOUNT_SIGNAL_COVERAGE**. Exact base and candidate full suites both passed while the candidate added strict data-minimization, consent, provider-cost and exact-account merge coverage without expanding PROD, CRM-write or Trading authority.

Post-merge main workflow run **38485472851** completed SUCCESS. Focused profile, prior intent/lead/web regressions and full CEREBRO suite passed. PROD Runtime Smoke run **38485472824** passed. PROD Live Deploy run **38485472900** was **SKIPPED**, as required.

## Rollback and rebuild

Rollback: revert PR #663 / merge `c07037a9358ed9b53b004ba4ff6071a091355961`; Company Intent, Lead Discovery and Web Acquisition profiles remain canonical.  
Rebuild: recreate from this document, registry, runtime contract, tests and provider dispositions on current main.

Cost=0 EUR, provider activation=false, PROD authority=false, CRM write=false, Trading=false.

## Next canonical block

Authorized next block is **83-92**:
`83 LEAD-001 -> 84 fit_score -> 85 intent_score -> 86 urgency_score -> 87 conversion_probability -> 88 expected_value -> 89 next_best_action -> 90 Verifio -> 91 email/MX/SMTP/catch-all confidence -> 92 phone/contact confidence`.

The next block must reuse the already integrated ICP, company-intent and first-party signal outputs. Lead scoring must remain deterministic/evidence-aware before any AI, verification must not send outreach, personal contact data must be legally/first-party sourced, and no paid verification service or CRM mutation is authorized by default.
