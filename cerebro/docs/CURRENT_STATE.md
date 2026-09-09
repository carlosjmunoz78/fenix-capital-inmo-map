# CEREBRO OS · CURRENT STATE

Evidence anchors are scoped to the change they prove; they are not intended to mirror every later documentation-only `main` SHA. Structured Phase 5 evidence: `docs/EVIDENCE.json`. Phase 2 binding audit: `evidence/phase2-existing-bindings-audit.json`.

## HECHO

- FACT-001 Engine Factory V0: structural/reference green.
- GOV-001 Engine Registry V0: 177/177 canonical engine IDs registered; scaffold generation deterministic and reproducible.
- Phase 2 existing-engine wrapper registry: structural/read-only binding layer green.
- Phase 2 read-only evidence audit V0: complete for all nine bindings without activation or writes.
- `APP-001`: `CONFIRMED_OPERATIONAL` for the existing App surface only, based on exact-SHA successful PROD deploy/runtime smoke for `6bf6af92c1106884da87fb9a659f807093d47e0a` (`34293941974`, `34293942069`). This does not imply autonomous CEREBRO execution.
- Phase 4 multi-company bootstrap V0: structural/reference green for 17 canonical engines.
- Phase 5 Console/Gateway V0: structural/reference green for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.

## EXISTENTE

- App Fénix and its current production pipeline/contracts are existing systems and were preserved by these additive CEREBRO changes.
- CEREBRO V0 code is additive and isolated under `cerebro/`; preservation does not imply live proof for every external integration.

## PARCIAL

- `CORE-001`, `SUP-001`, `TRN-001`, `DOC-001`: `DOCUMENTED_PARTIAL`; source/document/scope evidence exists but does not prove a complete live CEREBRO engine.
- Phase 3 `RUNTIME-001`, `EVT-001`, `JOB-001`, `FINOPS-001` have executable V0 reference implementations, not autonomous PROD engines.

## DEFINIDO

- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` are V0 contracts/targets and must not be described as live operational services.
- Console/Gateway V0 defines the Gateway-only interaction boundary; it does not claim the final production Console UI is deployed as an autonomous CEREBRO control plane.

## POR AUDITAR

- `CRM-001`, `SEO-001`, `WEB-001`: `UNKNOWN_REQUIRES_AUDIT`; no stronger live claim is supported by this repository audit.
- `LAB-TRD`: `UNKNOWN_REQUIRES_AUDIT`, explicitly isolated and requiring a separate audit; no Trading integration with CEREBRO PROD is claimed.
- Real production autonomy per engine.
- Persistent job/event infrastructure beyond the V0 reference implementation.
- Promotion gates for each individual engine before autonomous PROD.

## Non-negotiable boundaries

- `company_id`, `engine_id`, `environment`, `version` remain canonical context.
- Cross-company access defaults to deny.
- HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.
- Trading remains isolated.
- Additional cost target remains 0 €.
- No engine becomes autonomous PROD solely because its scaffold/reference implementation or read-only evidence audit is green.