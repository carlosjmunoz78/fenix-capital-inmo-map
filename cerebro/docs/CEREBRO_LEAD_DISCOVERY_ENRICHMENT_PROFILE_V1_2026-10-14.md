# CEREBRO Lead Discovery & Enrichment Profile V1

Date: 2026-10-14  
Scope: block 62-68  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
Outreach: not authorized  
Trading: isolated

## Architecture decision

Block 62-68 is one transversal capability profile over canonical `CAP-001`, `LEAD-001`, `CRM-001`, `MKT-001`, `RSH-001`, `ROUTE-001` and `IAM-001`. It does not create seven engines or a vendor-specific runtime.

The migration rule remains `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Current-main inventory

- `CAP-001` and `LEAD-001` exist in the canonical engine registry.
- Historical PR #293 contains `cerebro/marketing/acquisition-engine.mjs`, but that runtime path is not on current main. CAP autonomous runtime therefore remains **PARCIAL**; the new profile does not claim otherwise.
- Current-main Web Acquisition profile is preserved and may be used only as the last public-research discovery route after first-party, CRM and official public business sources.

## Lead discovery route

`FIRST_PARTY_INBOUND -> EXISTING_CRM -> OFFICIAL_PUBLIC_BUSINESS_SOURCE -> WEB_ACQUISITION_PROFILE`.

V1 is plan-only and read-only. It does not send messages, write to CRM, buy credits, scrape authenticated areas, or authorize PROD. Person-level contact discovery is disabled by default; requesting it routes to `LEGAL_REQUIRED` for legal-basis review.

## ICP discovery

ICP definition and scoring use firmographic/business dimensions only: sector, location, employee band, business model and explicit public signals. Personal or protected dimensions are rejected rather than inferred. Scoring requires evidence references and is deterministic.

## Enrichment waterfall

`NORMALIZE_COMPANY -> DOMAIN_AND_WEBSITE -> PUBLIC_FIRMOGRAPHICS -> PUBLIC_BUSINESS_CHANNELS -> EVIDENCE_AND_FRESHNESS -> ICP_SCORE`.

Only zero-cost company/business fields are allowed by default. Email and phone guessing are forbidden. Provenance and freshness are required. Dedupe uses a stable hash of normalized company/domain/location identity and merges evidence references deterministically.

## External source dispositions

- **Clay**: official product material describes broad prospecting/enrichment integrations plus API/webhook connectivity. In CEREBRO V1 it is an optional pattern/connector source only, never a mandatory dependency and never permitted to spend credits automatically.
- **PhantomBuster**: official 2026 material documents a limited free plan and paid plans. In CEREBRO V1 it is benchmark-only. Automated outreach and CAPTCHA functionality are explicitly outside this profile.
- **Octoparse**: official 2026 pricing documents a free local plan and paid cloud/automation capabilities. In CEREBRO V1 it is a free-local fallback benchmark only. CAPTCHA-solving functionality is prohibited by policy even if a vendor offers it.

Vendor activation is a later gated decision requiring provenance, terms/legal review where applicable, security, cost, impact analysis, tests, evaluation, OLD-vs-NEW and rollback. No new subscription is introduced here.

## Safety boundaries

Allowed top-level human exceptions remain exactly:
`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No auth/MFA/CAPTCHA/anti-abuse bypass, no protected-attribute inference, no personal-data enrichment by default, no outreach, no CRM mutation, no PROD write and no Trading access.

## Dependency map

Preserve:
- `cerebro/runtime/web-acquisition-intelligence-profile-v1.mjs`
- `cerebro/router/execution-model-router.mjs`
- `cerebro/governance/identity-credential-broker.mjs`
- `cerebro/registry/engine-registry.seed.json`

Historical only, not current-main runtime:
- PR #293 `cerebro/marketing/acquisition-engine.mjs`

Overlay:
- `cerebro/runtime/lead-discovery-enrichment-profile-v1.mjs`
- `cerebro/tests/lead-discovery-enrichment-profile-v1.test.mjs`
- `cerebro/registry/lead-discovery-enrichment-profile.v1.json`
- `.github/workflows/cerebro-lead-discovery-enrichment-profile-v1.yml`

## Promotion gate

Exact-head Node 24 focused tests, Web Acquisition regression, candidate full CEREBRO suite, exact-base full suite, OLD-vs-NEW, policy/security/cost review, merge and post-merge main verification are required before transversal block closure. Individual provider/runtime statuses remain evidence-based after merge.

Rollback is profile-only revert. Rebuild is deterministic from this document, registry, runtime contract and tests. Additional cost=0 EUR, PROD authority=false, outreach=false, Trading=false.
