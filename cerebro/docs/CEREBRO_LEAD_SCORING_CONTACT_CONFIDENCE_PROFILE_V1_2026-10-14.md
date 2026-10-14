# CEREBRO Lead Scoring & Contact Confidence Profile V1

Date: 2026-10-14  
Scope: block 83-92  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
CRM write: not authorized  
Outreach: not authorized  
Trading: isolated

## Candidate decision

Block 83-92 is implemented as one additive transversal profile over canonical `LEAD-001`; it does not create ten engines and does not replace Lead Discovery, Company Intent or First-Party Account Signals. Current state is **PARCIAL / candidate pending exact-head CI and merge evidence**.

The migration sequence remains `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Dependency inventory

Preserved unchanged:
- `cerebro/runtime/lead-discovery-enrichment-profile-v1.mjs` for ICP and lead evidence.
- `cerebro/runtime/company-intent-resolution-profile-v1.mjs` for company-level intent.
- `cerebro/runtime/first-party-account-signals-profile-v1.mjs` for consented first-party page/return signals.
- canonical engine registry and existing CRM/Sales boundaries.

New wrapper only: `cerebro/runtime/lead-scoring-contact-confidence-profile-v1.mjs`.

## Scoring contract

`fit_score` reuses an evidenced ICP score and stays bounded to 0-100. `intent_score` combines already-produced Company Intent and First-Party page-intent scores; it does not build a parallel intent engine. `urgency_score` is restricted to explicit business events with evidence and deterministic freshness decay.

`conversion_probability` is **DETERMINISTIC_HEURISTIC_V0**, conservative and explicitly **not statistically calibrated**. It is a prioritization signal, not a claim that an ML conversion model exists. `expected_value` is bounded analytical `probability x business_value`; it cannot authorize spend, pricing, payment or any financial action.

`next_best_action` is plan-only/read-only. Allowed outcomes are research, review-packet preparation, prioritization and watchlist actions. It cannot send email, WhatsApp, place calls, mutate CRM or execute outreach.

Protected/personal attributes are not scoring inputs.

## Contact-confidence contract

Approved source bases are limited to explicit first-party contact data, public business contact data, or existing CRM contact data with an established basis. Person-level contact use without that basis escalates to `LEGAL_REQUIRED`.

Email confidence is explainable and passive: syntax + supplied domain/MX evidence + optional already-authorized non-sending SMTP evidence. This profile itself never opens an SMTP probe and never sends mail. A catch-all domain is classified as uncertainty and its confidence is capped; it is never represented as verified deliverability.

Phone confidence performs only normalization and structural plausibility. It does not execute carrier lookup, reverse/person lookup, enrichment or paid verification.

## Verifio audit

The exact candidate was identified as `verifio-email/verifio`. Its README describes syntax, DNS, MX, SMTP-handshake and catch-all checks and labels the repository MIT/self-hostable/free-to-start. The repository `LICENSE`, however, contains Apache-2.0 wording plus an additional Reloop Labs clause that restricts commercial redistribution, hosted-service use and competing-product use.

Therefore item 90 is **HOLD_LICENSE_CONFLICT**. No Verifio code, package, image, SDK or runtime dependency is copied or executed. CEREBRO uses its own minimal deterministic passive contract while this licensing contradiction remains unresolved.

## Child status before CI

- 83 LEAD-001: **PARCIAL** — additive scoring/contact profile candidate, no activation.
- 84 fit_score: **PARCIAL** — deterministic ICP reuse.
- 85 intent_score: **PARCIAL** — deterministic reuse of existing intent outputs.
- 86 urgency_score: **PARCIAL** — explicit business-event freshness scoring.
- 87 conversion_probability: **PARCIAL** — heuristic V0, not calibrated.
- 88 expected_value: **PARCIAL** — bounded analytical value only.
- 89 next_best_action: **PARCIAL** — plan-only/read-only.
- 90 Verifio: **HOLD** — license conflict.
- 91 email/MX/SMTP/catch-all confidence: **PARCIAL** — passive evidence scoring; no active SMTP.
- 92 phone/contact confidence: **PARCIAL** — normalization/plausibility; no external lookup.

## Safety boundaries

Top-level human exceptions remain exactly: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No personal/protected scoring, no email/phone guessing, no active SMTP probing, no email sending, no carrier/person lookup, no auth/MFA/CAPTCHA/anti-abuse bypass, no silent spend, no paid verifier, no CRM writes, no outreach, no PROD execution and no Trading access.

## Tests and OLD-vs-NEW gate

The focused suite covers multiempresa context, deterministic score bounds, evidence reuse, conservative conversion semantics, expected-value cap, catch-all uncertainty, SMTP non-execution, lawful contact basis, phone normalization, exact human-reason enum, zero-cost boundary and PROD closure.

CI must run Node 24 with:
1. focused block 83-92 tests;
2. Lead Discovery + Company Intent + First-Party Account Signals + Web Acquisition regressions;
3. candidate full CEREBRO test suite;
4. exact base full CEREBRO test suite.

Block closure is forbidden until exact feature-head and post-merge evidence are green. OLD-vs-NEW must show no regression and added deterministic/privacy/license coverage.

## Rollback / rebuild

Rollback: revert the feature PR once created. Existing Lead Discovery, Company Intent and First-Party Account Signals profiles remain untouched and canonical.

Rebuild: recreate this wrapper from its runtime contract, registry, tests and the recorded Verifio provenance/license audit on current main.

## Next block after verified closure

93-104: `SALE-001 completo`, `Linki patterns`, `Mautic patterns`, `Dittofeed`, `listmonk`, `Posta`, `email cadence`, `WhatsApp cadence`, `call cadence`, `automatic recheck`, `Comp AI CRM patterns`, `Agent Inbox`.
