# ADR · BRANDBOOT-001 · Dedicated engine vs existing capability

Date: 2026-10-05
Status: `PROPOSED / GOVERNANCE_DECISION_PENDING`
Scope: CEREBRO multi-company onboarding

## Context

The canonical V2 inventory contains no dedicated brand/identity engine. The closest existing engines have narrower responsibilities:

- `BMD-001` discovers products, customers, geography, channels, value proposition, revenues/costs and objectives.
- `KBOOT-001` creates the company knowledge namespace with sources, rules, glossary, products, processes and confidence/provenance.
- `MKTBOOT-001` builds funnel, personas, tracking, channels, offers, experiments, content and zero-budget-first marketing.
- `SOCBOOT-001` consumes brand/business/social audit to build pillars, tone, formats, calendar, assets and metrics.
- `APPBOOT-001` consumes company configuration/brand context to configure the app shell.

A brand system is therefore an upstream, cross-cutting contract used by several downstream engines rather than a subset of one of them.

## Required outputs

The candidate produces machine-readable and human-readable artifacts with their own lifecycle:

- brand manual;
- `brand.json`;
- `design-tokens.json`;
- `brand.css`;
- asset inventory;
- voice rules;
- web/app/social/email/document presets;
- naming/trademark gate state.

These outputs need independent versioning, accessibility/contrast tests, asset provenance, rollback and rebuild. They are consumed by web, app, social, marketing, documents and product UI.

## Options considered

### A. Fold into KBOOT-001
Rejected as preferred architecture. KBOOT is knowledge/provenance bootstrap. Embedding visual identity generation there would mix knowledge namespace construction with design-token/asset lifecycle and would make brand changes harder to version and roll back independently.

### B. Fold into MKTBOOT-001
Rejected as preferred architecture. Brand identity is upstream of marketing and is also consumed by app, web, documents, checkout and product surfaces. Marketing must consume the brand contract, not own it.

### C. Treat only as a shared capability with no engine identity
Possible technically, but weaker for governance. Naming clearance, asset provenance, design-token versioning, contrast tests, manual generation and rebuild are material enough to need a clear owner and promotion gate.

### D. Create `BRANDBOOT-001` as a canonical multi-company engine
**Recommended**, subject to GOV-001/FACT-001 approval and canonical registry version change.

## Recommendation

Accept `BRANDBOOT-001` as a dedicated L8 multi-company engine positioned after business/knowledge discovery and before downstream SEO/social/marketing/app finalization.

Suggested dependency shape:

`COMP-ONB-001 -> SCAN/BMD/PROC/KBOOT -> BRANDBOOT-001 -> SOCBOOT/MKTBOOT/APPBOOT/WEB outputs`

Not every company must create a new identity: if approved brand assets already exist, BRANDBOOT imports, validates, normalizes and emits the canonical brand contract instead of redesigning it.

## No-break migration

Do **not** directly change `CANONICAL_COUNT = 177` in the current Factory V0 without a registry-version migration. The safe path is:

1. keep current candidate outside canonical seed;
2. approve this ADR;
3. version the registry/schema as a deliberate 177 -> 178 migration (or equivalent registry format that no longer hardcodes count);
4. update Factory tests/workflows atomically;
5. generate the standard FACT-001 scaffold;
6. run old-vs-new validation showing all 177 legacy IDs unchanged plus one new ID;
7. prove rollback to the previous registry version;
8. keep engine disabled outside LAB/PREPROD until evaluation/tribunal are green.

## Cost and autonomy

- additional fixed cost target: 0 €;
- paid AI required: false;
- paid design SaaS required: false;
- cross-company access: deny;
- publishing: deny by default;
- naming/trademark clearance for public brand: `LEGAL_REQUIRED`;
- autonomous PROD: false until normal promotion gates pass.

## Decision state

Recommendation is technically supported but **not yet canonical**. The draft PR remains the isolated implementation vehicle. No existing engine behavior or PROD surface depends on it.
