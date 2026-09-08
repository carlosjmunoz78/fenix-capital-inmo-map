# CEREBRO OS · CURRENT STATE

Evidence anchor: main `c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9` after Phase 5 merge.

## HECHO

- FACT-001 Engine Factory V0: structural/reference green.
- GOV-001 Engine Registry V0: 177/177 canonical engine IDs registered; scaffold generation deterministic and reproducible.
- Phase 4 multi-company bootstrap V0: structural/reference green for 17 canonical engines.
- Phase 5 Console/Gateway V0: structural/reference green for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Phase 5 exact-SHA production safety evidence: PROD Live Deploy `34292739019` success and PROD Runtime Smoke `34292739031` success on `c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9`.

## EXISTENTE

- Existing App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading relationships are preserved. CEREBRO V0 code is additive and isolated under `cerebro/`.
- Existing-engine bindings cover `CORE-001`, `SUP-001`, `TRN-001`, `APP-001`, `CRM-001`, `DOC-001`, `SEO-001`, `WEB-001`, `LAB-TRD`.

## PARCIAL

- Phase 2 bindings are structural wrappers/read-only contracts. Live operational status of each bound system remains to be verified independently.
- Phase 3 `RUNTIME-001`, `EVT-001`, `JOB-001`, `FINOPS-001` have executable V0 reference implementations, not autonomous PROD engines.

## DEFINIDO

- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` are V0 contracts/targets and must not be described as live operational services.
- Console/Gateway V0 defines the Gateway-only interaction boundary; it does not claim the final production Console UI is deployed as an autonomous CEREBRO control plane.

## POR AUDITAR

- Live evidence for Phase 2 existing-engine bindings.
- Real production autonomy per engine.
- Persistent job/event infrastructure beyond the V0 reference implementation.
- Promotion gates for each individual engine before autonomous PROD.

## Non-negotiable boundaries

- `company_id`, `engine_id`, `environment`, `version` remain canonical context.
- Cross-company access defaults to deny.
- HUMAN_REQUIRED is limited to `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
- Trading remains isolated.
- Additional cost target remains 0 €.
- No engine becomes autonomous PROD solely because its scaffold/reference implementation is green.