# CEREBRO OS · AUTONOMY / BACKUP / REBUILD

## Autonomy state

### HECHO structural/reference
- FACT-001 / GOV-001.
- Phase 4 multi-company bootstrap V0.
- Phase 5 Console/Gateway V0.

### PARCIAL
- RUNTIME-001 / EVT-001 / JOB-001 / FINOPS-001 are executable reference V0 components.
- Existing-engine bindings are wrappers/contracts only until live evidence is audited.

### DEFINIDO
- DBOFF-001 / STOROFF-001 / FREE-001 / AIBUD-001 contracts/targets.

### NOT AUTONOMOUS PROD
No CEREBRO engine may be interpreted as autonomous PROD solely from scaffold, unit-test, PREPROD or repository deployment evidence. Individual promotion still requires contracts, permissions, tests, evaluation, tribunal, observability, rollback, backup, rebuild, measured cost, policy and PREPROD.

## Human-by-exception boundary

Allowed escalation reasons only:
- LEGAL_REQUIRED
- SIGNATURE_REQUIRED
- LOW_CONFIDENCE
- HIGH_RISK
- POLICY_CONFLICT
- SECURITY_INCIDENT
- MONEY_LIMIT
- CUSTOMER_HUMAN_REQUEST

## Backup model V0

- Git history is the source snapshot for code/config/docs in `cerebro/`.
- Factory generated output is not a backup source; it is rebuildable output.
- Existing production systems and their data remain governed by their existing backup mechanisms; this V0 does not replace or modify them.
- No new paid backup service is introduced.

## Rollback model

- Before merge, exact branch HEAD is preserved in Git history and PREPROD evidence is tied to that SHA.
- After merge, exact merge SHA is captured and production safety workflows are verified.
- If a regression appears, prefer narrow revert/hotfix over destructive rebuild or replacement of existing systems.

## Rebuild model

Factory registry/scaffolds:
```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Reference runtime/multi-company/console behavior is rebuilt from repository source and verified through `npm test` plus PREPROD gates.

## Cost

Additional cost target remains **0 €**. Deterministic Node/JSON/GitHub CI paths are used; paid AI is not required for runtime correctness.