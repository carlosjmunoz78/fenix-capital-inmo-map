# ZEUS / CEREBRO — transversal skill learning contract (LAB)

Architecture decision, 2026-11-24: mandatory universal learning contract for existing and future skills, designed for extension to all engines and agents through FACT-001, LRN-001, evaluation, Tribunal, supervision and ROUTE-001. No separate engine or ledger. This decision does not grant production authority.

Canonical LAB implementation: `cerebro/skills/skill-universal-learning-contract-v1.mjs`, contract 1.0.0. Existing FACT wrapper/evaluation planner and LRN adapter consume it. Every admission must bind all 12 mechanisms; evidence of association is not evidence of execution. Compare GPT_BASE, CHAMPION, EXTERNAL and CHALLENGER with equal conditions and independent holdout. Missing arm/evidence means HOLD. Preserve all installed versions until evaluation, rollback and separate promotion gates.

Verified:
- Integration CI 26/26, [run 45479537969](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45479537969), synthetic local journal only.
- Authenticated private inventory read/bind, [run 45480535752](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45480535752): 42 skill IDs, 82 revisions, 984 associations, no provider calls.
- Controlled zero-price LAB skill evaluation via existing ROUTE-001 path, [run 45472692787](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45472692787): single case, not comparative certification.

Private artifacts, revision-level inventory, evidence and handoff are stored in authorized private Library/Drive/Notion surfaces. Do not copy them to this public repository. No secrets in source. Existing hourly learning task must consume the same contract. New admissions must update the private snapshot version and verify the authenticated reader; the current snapshot reader is fixed to CP04, not a dynamic universal production registry.

Pending: real recurring mechanism receipts, durable remote proposal ingestion, comparable semantic evaluation, independent Tribunal, controlled promotion/distribution and verification of all ZEUS engine/agent consumers. The owner-authorized own-skill inference exception does not permit customer data or credentials. Budget: zero additional cost, bounded five learning attempts per rolling 24 hours with prior durable reservation, no paid fallback; account-wide exclusive dispatch not yet verified.

Rollback: preserve prior commit, private snapshots and ledger history. Disable candidate use or revert only isolated changes with tests; no main/PROD/App/CRM/Trading change. Documentation-only annex, not promotion or a claim of production activation.
