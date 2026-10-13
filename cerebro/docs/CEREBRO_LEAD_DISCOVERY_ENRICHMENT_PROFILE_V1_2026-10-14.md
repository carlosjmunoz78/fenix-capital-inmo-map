# CEREBRO Lead Discovery & Enrichment Profile V1

Date: 2026-10-14  
Scope: block 62-68  
Environment: LAB/PREPROD policy  
Additional cost target: 0 EUR  
PROD write: not authorized  
Outreach: not authorized  
Trading: isolated

## Closure decision

The **transversal profile integration scope** for block 62-68 is HECHO on `main`. This closure does not promote external providers or current partial engines to physical operational status.

Block 62-68 is one transversal capability profile over canonical `CAP-001`, `LEAD-001`, `CRM-001`, `MKT-001`, `RSH-001`, `ROUTE-001` and `IAM-001`; no vendor-specific engines were created.

The migration rule remained `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

## Evidence-based child status

- 62 `CAP-001` autonomous: **PARCIAL**. Canonical ID exists; historical PR #293 has acquisition-runtime evidence, but that runtime path is absent from current main. V1 adds only a non-writing planning overlay.
- 63 Lead discovery: **PARCIAL**. Deterministic business-entity-first planning is integrated; physical discovery sources remain separately gated.
- 64 ICP discovery: **PARCIAL**. Firmographic definition and evidence-aware scoring are integrated; no autonomous PROD/CRM mutation.
- 65 Lead enrichment waterfall: **PARCIAL**. Zero-cost company-first planning is integrated with provenance/freshness and no personal-contact guessing.
- 66 Clay patterns: **POR AUDITAR**. Optional connector/pattern source only.
- 67 PhantomBuster benchmark: **POR AUDITAR**. Benchmark only; no outreach/CAPTCHA capability imported.
- 68 Octoparse fallback: **POR AUDITAR**. Free-local fallback benchmark only; no cloud paid dependency or CAPTCHA capability.

## Lead discovery route

`FIRST_PARTY_INBOUND -> EXISTING_CRM -> OFFICIAL_PUBLIC_BUSINESS_SOURCE -> WEB_ACQUISITION_PROFILE`.

V1 remains plan-only and read-only. It does not send messages, write to CRM, buy credits, scrape authenticated areas, or authorize PROD. Person-level contact discovery remains disabled by default and requires `LEGAL_REQUIRED` review if explicitly requested.

## ICP and enrichment contract

ICP uses firmographic/business dimensions only: sector, location, employee band, business model and explicit public signals. Personal/protected dimensions are rejected.

Enrichment waterfall:
`NORMALIZE_COMPANY -> DOMAIN_AND_WEBSITE -> PUBLIC_FIRMOGRAPHICS -> PUBLIC_BUSINESS_CHANNELS -> EVIDENCE_AND_FRESHNESS -> ICP_SCORE`.

Email and phone guessing remain forbidden. Provenance/freshness are required. Deterministic dedupe uses normalized company/domain/location identity and merges evidence refs.

## Safety boundaries

Allowed top-level human exceptions remain exactly:
`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

No auth/MFA/CAPTCHA/anti-abuse bypass, no protected-attribute inference, no personal-data enrichment by default, no outreach, no CRM mutation, no PROD write and no Trading access. Any non-zero incremental cost remains `MONEY_LIMIT`.

## Verified promotion evidence

Feature PR: **#659**.  
Exact feature head: `be5c913e54b101fbc4d5b9ea7215cf6615b01207`.  
Feature merge on main: `177e23c15f9c3b8d463c1fc7a38a600bfe80cf62`.

Pre-merge workflow run **38483982081** passed all four Node 24 gates: focused profile, Web Acquisition regression, candidate full CEREBRO suite and exact-base full CEREBRO suite. On the same exact feature head, **CEREBRO Governed Main Integration V0** run `38483981896` and **CEREBRO RSI Promotion Readiness Shadow V0** run `38483981958` also passed.

OLD-vs-NEW: **NEW_BETTER_NO_REGRESSION_WITH_ADDED_POLICY_COVERAGE**. Exact base and candidate full suites both passed, while candidate adds firmographic-only ICP, zero-cost enrichment, dedupe, no-outreach and personal-data boundaries without expanding cost, PROD or Trading authority.

Post-merge main workflow run **38484081770** completed **SUCCESS**. Focused profile, Web Acquisition regression and full CEREBRO suite passed. PROD Runtime Smoke run **38484081639** passed. PROD Live Deploy run **38484081681** was **SKIPPED**, as required.

## Rollback and rebuild

Rollback: revert PR #659 / merge `177e23c15f9c3b8d463c1fc7a38a600bfe80cf62`; current-main Web Acquisition profile and canonical engine registry remain intact.  
Rebuild: recreate from this document, registry, runtime contract, tests and source dispositions on top of current main.

## Next canonical block

Authorized next block is **69-73**:
`69 Sales Navigator optional only if ROI -> 70 Gojiberry patterns -> 71 MasLeads concept -> 72 Pearl Diver concept -> 73 Beton Inspector LAB`.

The next block must remain company-level/first-party/public-business-signal first. No covert deanonymization, fingerprinting, personal visitor resolution, paid Sales Navigator dependency or outreach is authorized by default.
