# FACT-001 · Automatic Engine Scaffold Request Contract V0

This directory is the git-backed ingress for zero-cost, hostless FACT-001 scaffold requests.

## Scope

A request may ask FACT-001 to create, rebuild, or verify the structural scaffold of an engine that already exists in the canonical Engine Registry seed. V0 does **not** create a new canonical engine identity, grant permissions, enable an engine, promote to PREPROD/PROD, execute external code, touch Trading, or spend money.

A valid request is a JSON object with:

- `schema_version`: `1.0.0`
- `request_id`: stable caller identity for idempotency
- `company_id`: tenant scope
- `engine_id`: existing canonical engine id
- `environment`: exactly `SCAFFOLD`
- `version`: requested scaffold version
- `intent`: `CREATE_SCAFFOLD`, `REBUILD_SCAFFOLD`, or `VERIFY_SCAFFOLD`
- `additional_cost_eur`: `0`
- `prod_authorized`: `false`
- `prod_write_authorized`: `false`
- `trading_access`: `false`
- `external_code_execution`: `false`

## Automation

`CEREBRO FACT-001 AutoFactory V0` runs automatically when request files or factory authority files change on `main`. It also supports explicit `workflow_dispatch` and future `repository_dispatch` integration from CEREBRO Gateway without adding a paid provider.

For every accepted request it:

1. validates the canonical registry and FACT-001 contracts;
2. executes the existing deterministic factory;
3. extracts exactly the requested engine scaffold;
4. verifies the 18 mandatory scaffold files;
5. emits deterministic request and bundle hashes;
6. uploads immutable run evidence as a GitHub Actions artifact.

The result is only a structural scaffold. Engine implementation, independent evaluation, tribunal, PREPROD promotion, backup/rollback testing, and any later production decision remain separate gates.

## Fail closed

Unknown engine identity or schema/policy drift -> `POLICY_CONFLICT`.
Authority expansion or non-SCAFFOLD context -> `HIGH_RISK`.
Any additional spend -> `MONEY_LIMIT`.

All are canonical `HUMAN_REQUIRED` reasons. No workflow path here can authorize PROD or Trading.
