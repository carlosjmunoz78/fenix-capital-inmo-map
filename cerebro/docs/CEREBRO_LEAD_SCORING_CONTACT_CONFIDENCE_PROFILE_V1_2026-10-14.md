# CEREBRO Lead Scoring & Contact Confidence Profile V1

Date: 2026-10-14  
Scope: block 83-92  
Environment: LAB/PREPROD policy  
Additional cost: 0 EUR  
PROD write: not authorized  
CRM write: not authorized  
Outreach: not authorized  
Trading: isolated

## Closure decision

Block 83-92 is **HECHO for the transversal integration scope**. It is implemented as one additive profile over canonical `LEAD-001`; it does not create ten engines, replace existing lead/intent/signal modules, activate an external verifier, authorize outreach, mutate CRM or enable PROD execution.

The migration sequence remains `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Dependency inventory

Preserved unchanged:
- `cerebro/runtime/lead-discovery-enrichment-profile-v1.mjs` for ICP and lead evidence.
- `cerebro/runtime/company-intent-resolution-profile-v1.mjs` for company-level intent.
- `cerebro/runtime/first-party-account-signals-profile-v1.mjs` for consented first-party page/return signals.
- canonical engine registry and existing CRM/Sales boundaries.

Additive wrapper only: `cerebro/runtime/lead-scoring-contact-confidence-profile-v1.mjs`.

## Scoring contract

`fit_score` reuses an evidenced ICP score and stays bounded to 0-100. `intent_score` combines already-produced Company Intent and First-Party page-intent scores; it does not build a parallel intent engine. `urgency_score` is restricted to explicit business events with evidence and deterministic freshness decay.

`conversion_probability` is **DETERMINISTIC_HEURISTIC_V0**, conservative and explicitly **not statistically calibrated**. It is a prioritization signal, not a claim that an ML conversion model exists. `expected_value` is bounded analytical `probability x business_value`; it cannot authorize spend, pricing, payment or any financial action.

`next_best_action` is plan-only/read-only. Allowed outcomes are research, review-packet preparation, prioritization and watchlist actions. It cannot send email, WhatsApp, place calls, mutate CRM or execute outreach.

Protected/personal attributes are not scoring inputs. Upstream `SCORED` results require non-empty evidence references; an unevidenced score cannot influence lead scoring or upgrade a next-best-action.

## Contact-confidence contract

Approved source bases are limited to explicit first-party contact data, public business contact data, or existing CRM contact data with an established basis. First-party/existing-CRM person-level contact with an established basis may be scored read-only; public person-level contact requires explicit lawful-basis evidence or escalates to `LEGAL_REQUIRED`.

Email confidence is explainable and passive: syntax + supplied domain/MX evidence + optional already-authorized non-sending SMTP evidence. This profile itself never opens an SMTP probe and never sends mail. A catch-all domain is classified as uncertainty and its confidence is capped; it is never represented as verified deliverability. Malformed local/domain forms are rejected and contradictory explicit domain/MX evidence fails closed.

Phone confidence performs only normalization and structural plausibility. It does not execute carrier lookup, reverse/person lookup, enrichment or paid verification.

## Verifio audit

The exact candidate was identified as `verifio-email/verifio`. Its README describes syntax, DNS, MX, SMTP-handshake and catch-all checks and labels the repository MIT/self-hostable/free-to-start. The repository `LICENSE`, however, contains Apache-2.0 wording plus an additional Reloop Labs clause that restricts commercial redistribution, hosted-service use and competing-product use.

Therefore item 90 remains **HOLD_LICENSE_CONFLICT**. No Verifio code, package, image, SDK or runtime dependency was copied or executed. CEREBRO uses its own minimal deterministic passive contract while this licensing contradiction remains unresolved.

## Child status after verified integration

- 83 LEAD-001: **PARCIAL** — additive profile integrated; no PROD/CRM-write/outreach activation.
- 84 fit_score: **PARCIAL** — deterministic evidenced ICP reuse integrated; no PROD activation.
- 85 intent_score: **PARCIAL** — deterministic reuse of existing intent outputs integrated; no PROD activation.
- 86 urgency_score: **PARCIAL** — explicit business-event freshness scoring integrated; no PROD activation.
- 87 conversion_probability: **PARCIAL** — heuristic V0 integrated; not calibrated and not a deployed ML model.
- 88 expected_value: **PARCIAL** — bounded analytical value integrated; no money authority.
- 89 next_best_action: **PARCIAL** — plan-only/read-only integration; no outreach execution.
- 90 Verifio: **HOLD** — unresolved repository license conflict.
- 91 email/MX/SMTP/catch-all confidence: **PARCIAL** — passive evidence scoring integrated; no active SMTP/provider activation.
- 92 phone/contact confidence: **PARCIAL** — normalization/plausibility integrated; no external lookup/provider activation.

The block-level **HECHO** status is intentionally narrower than claiming every child is physically/live operational.

## Safety boundaries

Top-level human exceptions remain exactly: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No personal/protected scoring, no email/phone guessing, no active SMTP probing, no email sending, no carrier/person lookup, no auth/MFA/CAPTCHA/anti-abuse bypass, no silent spend, no paid verifier, no CRM writes, no outreach, no PROD execution and no Trading access.

## Verification and OLD-vs-NEW

Feature PR: **#665**.  
Base main: `88c7b75f93f8c17b9267c0158f4fe9f626632293`.  
Exact feature head: `0c65b0e526e3032a8d870e06c00010b3633dbf0a`.  
Feature merge: `15312fe2383372a5b160264f9664eebd6c78d71a`.

Pre-merge exact-head evidence:
- custom Node 24 profile run `38517314398`: **SUCCESS**;
- focused profile: **PASS**;
- Lead Discovery + Company Intent + First-Party Signals + Web Acquisition regressions: **PASS**;
- candidate full CEREBRO suite: **PASS**;
- exact-base full CEREBRO suite: **PASS**;
- Governed Main Integration run `38517314283`: **SUCCESS**;
- RSI Promotion Readiness Shadow run `38517314242`: **SUCCESS**.

Post-merge evidence on exact main merge SHA:
- profile run `38517412390`: **SUCCESS**;
- PROD Runtime Smoke run `38517412433`: **SUCCESS**;
- PROD Live Deploy run `38517412401`: **SKIPPED**, as required.

OLD-vs-NEW: **NEW_BETTER_NO_REGRESSION_WITH_ADDED_DETERMINISTIC_LEAD_SCORING_CONTACT_CONFIDENCE_AND_LICENSE_GUARDS**.

Review hardening completed before merge additionally prevents unevidenced upstream scores/contact-confidence from influencing decisions, differentiates lawful first-party person-contact from unreviewed public person-contact, strengthens email syntax checks and fails closed on contradictory explicit DNS/MX evidence.

## Rollback / rebuild

Rollback: revert PR #665 / merge `15312fe2383372a5b160264f9664eebd6c78d71a`. Existing Lead Discovery, Company Intent and First-Party Account Signals profiles remain untouched and canonical.

Rebuild: recreate this additive wrapper from its runtime contract, tests, registry, documentation and the recorded Verifio provenance/license audit on current main.

## Next block

93-104 is authorized for audit and safe implementation: `SALE-001 completo`, `Linki patterns`, `Mautic patterns`, `Dittofeed`, `listmonk`, `Posta`, `email cadence`, `WhatsApp cadence`, `call cadence`, `automatic recheck`, `Comp AI CRM patterns`, `Agent Inbox`.
