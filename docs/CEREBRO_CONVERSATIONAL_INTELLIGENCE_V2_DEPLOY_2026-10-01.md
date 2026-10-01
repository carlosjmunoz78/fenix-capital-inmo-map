# CEREBRO Conversational Intelligence V2 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Scope:
- bounded multi-turn context: last 10 conversation turns, max 8,000 chars server-side;
- deterministic follow-up resolution for short/anaphoric questions and numbered items;
- structured conversational memory V2 with USER_TURN, FACT, DECISION, CORRECTION, PREFERENCE and OPERATIONAL_KNOWLEDGE;
- subject_key, validity window, candidate status and explicit supersession lineage;
- explicit corrections such as «eso ya no es así» may supersede the prior related memory rather than accumulating contradictions;
- time-sensitive knowledge returns REQUIRES_CURRENT_VERIFICATION rather than being presented as timeless fact;
- existing Local VAD interruption, unlimited voice turns, action confirmation and owner-only boundaries remain unchanged.

Evidence before promotion:
- PR #477 merged as a628102aeb05de05f8c145a5c94ea8520d2a00ce.
- CEREBRO Session Context Regression Guard #153: SUCCESS.
- App Restoration Build Gate #395: SUCCESS.
- Exact migration exercised transactionally in PREPROD with disposable fenix_prod stubs; observe V2 + supersession + privileges passed and transaction rolled back.
- PROD migration cerebro_conversational_intelligence_v2 applied successfully.
- Gateway PROD V28 ACTIVE.
- Gateway artifact SHA256: 4a6cf9ac3065b5ad8ab5283f0df99b8853490e4f6c941026d011e55cc03aa00b.
- Previous frontend rollback source: fbdbb99e22a821b578874157c86d73789f111e10.

Physical multi-turn acceptance remains mandatory after frontend deployment.
