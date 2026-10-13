# CEREBRO Company Intent & Visitor Resolution Profile V1

Date: 2026-10-14  
Scope: block 69-73  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
Outreach: not authorized  
Trading: isolated

## Architecture decision

Block 69-73 is one transversal company-level intent profile over `LEAD-001`, `CAP-001`, `CRM-001`, `RSH-001`, `ROUTE-001` and `IAM-001`. It does not create vendor engines and it deliberately does **not** implement first-party event capture; that belongs to the following 74-82 block.

The sequence remains `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Source order

`FIRST_PARTY_AGGREGATED_ACCOUNT_SIGNALS -> EXISTING_CRM_SIGNALS -> PUBLIC_BUSINESS_SIGNALS -> OPTIONAL_SALES_NAVIGATOR`.

Sales Navigator is allowed only as an optional existing-license source when incremental cost is zero and ROI evidence exists. Otherwise it remains HOLD or `MONEY_LIMIT`. No new paid subscription is introduced.

## Company intent scoring

The V1 score accepts only explicit, evidenced, fresh company/account signals. Initial deterministic weights are:
- company website visit: 15
- repeat company visit: 25
- company pricing-page visit: 35
- public hiring signal: 15
- public funding signal: 10

Signals older than 30 days are excluded; signals 8-30 days old receive a deterministic freshness reduction. Unknown/person-level signal types fail closed. The profile consumes signals but does not deploy tracking or event collection.

## Visitor resolution boundary

Allowed autonomous planning is company-level and first-party/explicit only: authenticated account company, first-party account id, or an explicitly supplied company domain. Device fingerprinting, covert deanonymization and cross-device identity graphs are denied. Person-level or third-party anonymous visitor resolution routes to `LEGAL_REQUIRED` before any execution.

## External source dispositions

- **LinkedIn Sales Navigator**: official documentation confirms Buyer Intent for Advanced/Advanced Plus. Optional only if already licensed, zero incremental cost and ROI-evidenced.
- **Gojiberry AI**: official product/help describes ICP scoring, buying signals, company visitor identification and outbound. Its paid/outreach runtime is not imported; only intent/ICP prioritization patterns inform the zero-cost deterministic design.
- **MasLeads**: official Website Visitors/Copilot material describes identification of visiting companies and intent-based prioritization. CEREBRO uses the company-level concept only; no mandatory provider or automatic person/contact enrichment.
- **Pearl Diver**: official Prospect Resolution material describes connecting identifiers across devices/touchpoints to individuals or companies. CEREBRO keeps this privacy-gated and does not implement cross-device/person resolution.
- **Beton Inspector**: `getbeton/inspector`, AGPL-3.0, self-hostable revenue intelligence around PostHog/CRM account signals. It is LAB benchmark/pattern evidence only; no code is copied or executed and no PostHog dependency is activated in this block.

## Safety boundaries

Top-level human exceptions remain exactly `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No personal resolution by default, no fingerprinting, no covert visitor deanonymization, no outreach, no CRM writes, no auth/MFA/CAPTCHA/anti-abuse bypass, no automatic paid fallback, no PROD write and no Trading access.

## Dependency map

Preserve:
- `cerebro/runtime/lead-discovery-enrichment-profile-v1.mjs`
- `cerebro/runtime/web-acquisition-intelligence-profile-v1.mjs`
- `cerebro/router/execution-model-router.mjs`
- `cerebro/registry/engine-registry.seed.json`

Overlay:
- `cerebro/runtime/company-intent-resolution-profile-v1.mjs`
- `cerebro/tests/company-intent-resolution-profile-v1.test.mjs`
- `cerebro/registry/company-intent-resolution-profile.v1.json`
- `.github/workflows/cerebro-company-intent-resolution-profile-v1.yml`

Deferred intact to 74-82: first-party event capture, PostHog activation, analytics/tracking runtime, visitor-event persistence and CRM+website event merge.

## Promotion gate

Exact-head Node 24 focused tests, lead/web profile regressions, candidate full CEREBRO suite, exact-base full suite, OLD-vs-NEW, policy/security/privacy/cost review, merge and post-merge main verification are required before transversal closure.

Rollback is profile-only revert. Rebuild is deterministic from this document, registry, runtime contract and tests. Cost=0 EUR, PROD authority=false, outreach=false, Trading=false.
