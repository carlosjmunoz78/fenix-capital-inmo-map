# CEREBRO OS · AUTONOMY / BACKUP / REBUILD

## Autonomy state

### HECHO structural/reference
- FACT-001 / GOV-001.
- Phase 4 multi-company bootstrap V0.
- Phase 5 Console/Gateway V0.
- Governance V0: POL-001 / HEX-001.
- EVT-001 / JOB-001 persistent local/self-hosted PREPROD single-writer reference adapters.

### PARCIAL
- RUNTIME-001 / FINOPS-001 are executable reference V0 components.
- EVT-001 / JOB-001 are persistent reference components but are not yet wired as the SharedRuntime replacement, not multi-process/shared-worker coordinated and not autonomous PROD.
- Existing-engine bindings are wrappers/contracts only until live evidence is audited.

### DEFINIDO
- DBOFF-001 / STOROFF-001 / FREE-001 / AIBUD-001 contracts/targets.

### NOT AUTONOMOUS PROD
No CEREBRO engine may be interpreted as autonomous PROD solely from scaffold, unit-test, PREPROD or repository deployment evidence. Individual promotion still requires contracts, permissions, tests, evaluation, tribunal, observability, rollback, backup, rebuild, measured cost, policy and PREPROD.

## Human-by-exception boundary

HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.

## Backup model V0

- Git history is the source snapshot for code/config/docs in `cerebro/`.
- Factory generated output is not a backup source; it is rebuildable output.
- Persistent EVT/JOB V0 journal files are runtime state and are not replaced by Git history; production-grade activation would require an explicit state backup/restore contract before migration.
- Existing production systems and their data remain governed by their existing backup mechanisms; this V0 does not replace or modify them.
- No new paid backup service is introduced.

## Rollback model

- Before merge, exact branch HEAD is preserved in Git history and PREPROD evidence is tied to that SHA.
- After merge, exact merge SHA is captured and production safety workflows are verified.
- Persistent EVT/JOB adapters remain parallel to the existing in-memory runtime, so no runtime cutover rollback is required for this V0. Any future SharedRuntime wiring must define and test OLD-vs-NEW rollback before promotion.
- If production deploy/smoke fails after exposure, execute the canonical repository rollback in `docs/PROD_ROLLBACK_RUNBOOK.md`: rehearse last known-good, revert offending commit(s) on a branch without rewriting history, merge through PREPROD, then require exact-SHA PROD deploy/smoke green.
- Prefer narrow revert/hotfix over destructive rebuild or replacement of existing systems.

## Rebuild model

Factory registry/scaffolds:
```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Reference runtime/multi-company/console/governance behavior is rebuilt from repository source and verified through `npm test` plus PREPROD gates.

Persistent EVT/JOB V0 code is rebuilt from repository source; persisted journal state is reconstructed deterministically by operation replay when the journal is available. A future production state store requires an explicit backup/restore procedure before activation.

## Cost

Additional cost target remains **0 €**. Deterministic Node/JSON/GitHub CI paths are used; paid AI is not required for runtime correctness.
