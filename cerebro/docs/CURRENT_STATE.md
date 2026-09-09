# CEREBRO OS · CURRENT STATE

Evidence anchors are scoped to the change they prove; they are not intended to mirror every later documentation-only `main` SHA. Structured evidence: `docs/EVIDENCE.json`. Phase 2 binding audit: `evidence/phase2-existing-bindings-audit.json`.

## HECHO

- FACT-001 Engine Factory V0: structural/reference green.
- GOV-001 Engine Registry V0: 177/177 canonical engine IDs registered; scaffold generation deterministic and reproducible.
- Phase 2 existing-engine wrapper registry: structural/read-only binding layer green.
- Phase 2 read-only evidence audit V0: complete for all nine bindings without activation or writes.
- `APP-001`: `CONFIRMED_OPERATIONAL` for the existing App surface only, based on exact-SHA successful PROD deploy/runtime smoke for `6bf6af92c1106884da87fb9a659f807093d47e0a` (`34293941974`, `34293942069`). This does not imply autonomous CEREBRO execution.
- Phase 4 multi-company bootstrap V0: structural/reference green for 17 canonical engines.
- Phase 5 Console/Gateway V0: structural/reference green for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Governance V0: `POL-001` and `HEX-001` structural/reference green; merge `c523da8f11dbf1a2618982aeeb5940670317bb6e`, PROD Live Deploy `34330670776` and Runtime Smoke `34330670550` success on exact merge SHA.
- Persistent Events/Jobs V0: `EVT-001` and `JOB-001` structural/reference green as local/self-hosted PREPROD single-writer adapters. Reviewed HEAD `16484fdf50760afbd98e1d85824ed352dd3a5585`; PREPROD Factory `34337677363` and App `34337677429` success; merge `26fb9c75b9a7361afccccdc111761ad10aac5fa4`; PROD Live Deploy `34340279918` and Runtime Smoke `34340279922` success. The existing in-memory runtime remains preserved in parallel.

## EXISTENTE

- App Fénix and its current production pipeline/contracts are existing systems and were preserved by these additive CEREBRO changes.
- CEREBRO V0 code is additive and isolated under `cerebro/`; preservation does not imply live proof for every external integration.

## PARCIAL

- `CORE-001`, `SUP-001`, `TRN-001`, `DOC-001`: `DOCUMENTED_PARTIAL`; source/document/scope evidence exists but does not prove a complete live CEREBRO engine.
- `RUNTIME-001` and `FINOPS-001` have executable V0 reference implementations, not autonomous PROD engines.
- `EVT-001`/`JOB-001` persistence is green only for the additive PREPROD single-writer reference. Wiring into `SharedRuntime`, OLD-vs-NEW migration, multi-process/shared-worker coordination and autonomous PROD remain outside this completed scope.

## DEFINIDO

- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` are V0 contracts/targets and must not be described as live operational services.
- Console/Gateway V0 defines the Gateway-only interaction boundary; it does not claim the final production Console UI is deployed as an autonomous CEREBRO control plane.

## POR AUDITAR

- `CRM-001`, `SEO-001`, `WEB-001`: `UNKNOWN_REQUIRES_AUDIT`; no stronger live claim is supported by this repository audit.
- `LAB-TRD`: `UNKNOWN_REQUIRES_AUDIT`, explicitly isolated and requiring a separate audit; no Trading integration with CEREBRO PROD is claimed.
- Real production autonomy per engine.
- `EVT-001`/`JOB-001` migration/wiring into `SharedRuntime` and scaling beyond the single-writer V0 reference.
- Promotion gates for each individual engine before autonomous PROD.
- Legacy `.github/workflows/one-shot-promote-899839d.yml`: historical exact-candidate promotion workflow. Its `paths` filter means it is triggered only when that workflow file itself changes; if triggered without the original promotion commit message, its promote job is skipped. It is not a required CEREBRO gate; do not modify or remove without inventory, dependency map, backup, contract, tests and rollback evidence.

## Non-negotiable boundaries

- `company_id`, `engine_id`, `environment`, `version` remain canonical context.
- Cross-company access defaults to deny.
- HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.
- Trading remains isolated.
- Additional cost target remains 0 €.
- No engine becomes autonomous PROD solely because its scaffold/reference implementation or read-only evidence audit is green.
