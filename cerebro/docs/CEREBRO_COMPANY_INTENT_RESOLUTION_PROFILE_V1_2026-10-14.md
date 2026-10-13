# CEREBRO Company Intent & Visitor Resolution Profile V1

Date: 2026-10-14  
Scope: block 69-73  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
Outreach: not authorized  
Trading: isolated

## Closure decision

The **transversal profile integration scope** for block 69-73 is HECHO on `main`. This does not activate tracking, external providers or person-level visitor resolution. Individual child states remain evidence-based.

Block 69-73 is one transversal company-level intent profile over `LEAD-001`, `CAP-001`, `CRM-001`, `RSH-001`, `ROUTE-001` and `IAM-001`. It creates no vendor engines and deliberately does **not** implement first-party event capture; that belongs to block 74-82.

The sequence remained `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Evidence-based child status

- 69 Sales Navigator optional ROI: **HOLD**. Optional only with an existing license, zero incremental cost and ROI evidence; never a mandatory dependency.
- 70 Gojiberry patterns: **PARCIAL**. Deterministic zero-cost company-level buying-signal and ICP-prioritization patterns are integrated; the paid provider/outreach runtime is not imported.
- 71 MasLeads concept: **PARCIAL**. Company-visitor intent and target-fit concepts are integrated as local deterministic policy; there is no provider dependency or automatic contact enrichment.
- 72 Pearl Diver concept: **HOLD**. Autonomous planning is company-level and first-party only. Person-level, cross-device or third-party anonymous resolution remains `LEGAL_REQUIRED`; covert fingerprinting is denied.
- 73 Beton Inspector LAB: **LAB_REFERENCE**. `getbeton/inspector`, AGPL-3.0, is benchmark evidence for account signals/scoring only. No code is imported or executed and no PostHog/CRM dependency is activated.

## Source order

`FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS -> EXISTING_CRM_SIGNALS -> PUBLIC_BUSINESS_SIGNALS -> OPTIONAL_SALES_NAVIGATOR`.

Sales Navigator is usable only as an optional source when it is already licensed, incremental cost is zero and ROI evidence exists. Otherwise it remains HOLD or routes to `MONEY_LIMIT`. No subscription was introduced.

## Company intent scoring

The integrated V1 accepts only explicit, evidenced and fresh company/account signals. Deterministic weights are:
- company website visit: 15
- repeat company visit: 25
- company pricing-page visit: 35
- public hiring signal: 15
- public funding signal: 10

Signals older than 30 days are excluded; signals 8-30 days old receive a deterministic freshness reduction. Unknown or person-level signal types fail closed. The profile consumes signals but does not deploy tracking/event collection.

## Visitor resolution boundary

Allowed autonomous planning remains company-level and first-party/explicit only: authenticated account company, first-party account id or an explicitly supplied company domain. Device fingerprinting, covert deanonymization and cross-device identity graphs are denied. Person-level or third-party anonymous visitor resolution routes to `LEGAL_REQUIRED` before execution.

## Safety boundaries

Top-level human exceptions remain exactly `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No personal resolution by default, no fingerprinting, no covert visitor deanonymization, no outreach, no CRM writes, no auth/MFA/CAPTCHA/anti-abuse bypass, no automatic paid fallback, no PROD write and no Trading access.

## Verified promotion evidence

Feature PR: **#661**.  
Exact feature head: `c2c093c415e873c072b2267cdf0edb2887187eb9`.  
Feature merge on main: `5693e2061469bcc3bae49e5dddb9246b510c4a2a`.

Pre-merge exact-head workflow run **38484652051** passed all four Node 24 gates: focused profile, lead/web regressions, candidate full CEREBRO suite and exact-base full CEREBRO suite. On the same head, Governed Main Integration run **38484651972** and RSI Promotion Readiness Shadow run **38484652021** also passed.

OLD-vs-NEW: **NEW_BETTER_NO_REGRESSION_WITH_ADDED_PRIVACY_AND_INTENT_POLICY_COVERAGE**. Exact base and candidate full suites both passed while the candidate added company-level intent, freshness/evidence checks and privacy boundaries without expanding cost, PROD, outreach or Trading authority.

Post-merge main workflow run **38484741580** completed SUCCESS. Focused profile, lead/web regressions and full CEREBRO suite passed. PROD Runtime Smoke run **38484741562** passed. PROD Live Deploy run **38484741631** was **SKIPPED**, as required.

## Rollback and rebuild

Rollback: revert PR #661 / merge `5693e2061469bcc3bae49e5dddb9246b510c4a2a`; Lead Discovery and Web Acquisition profiles remain canonical.  
Rebuild: recreate from this document, registry, runtime contract, tests and source dispositions on top of current main.

Cost=0 EUR, PROD authority=false, outreach=false, Trading=false.

## Next canonical block

Authorized next block is **74-82**:
`74 First-party event capture -> 75 PostHog -> 76 Talivia -> 77 Microsoft Clarity -> 78 Yandex Metrica -> 79 Company visitor identification -> 80 Visited-page intent score -> 81 Return-visit signal -> 82 CRM + website event merge`.

The next block must remain first-party/privacy-first. It must not silently deploy tracking tags, persist raw IP/user-agent/form contents, identify people, fingerprint devices, write to CRM or incur paid analytics usage. Any provider activation requires the appropriate consent/privacy/legal and zero-cost gates.
