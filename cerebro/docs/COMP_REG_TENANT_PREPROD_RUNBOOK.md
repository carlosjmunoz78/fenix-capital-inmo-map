# COMP-REG-001 + TENANT-001 · PREPROD Runbook

## Accepted scope

Status: `PREPROD_REFERENCE_EXECUTION_VERIFIED`.

Exact accepted source: `6710067e0f1beb28f930c038aceebfb9168f965a`.
Accepted run: `37838584276`, attempts 1 and 2 SUCCESS.
Deterministic execution identity: `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`.

This runbook covers only the existing in-memory Phase 4 reference state machine. It does not cover durable company storage or PROD.

## Execute

```bash
cd cerebro
npm run validate
npm test
node multicompany/company-reg-tenant-preprod.mjs \
  --request multicompany/requests/company-reg-tenant-selfcheck.v0.json \
  --out /tmp/company-reg-tenant-result.json
```

Required result:

- status `COMP_REG_TENANT_PREPROD_GREEN`;
- exact PREPROD;
- GREEN engines exactly `COMP-REG-001`, `TENANT-001`;
- `COMP-ONB-001` READY;
- `SCAN-001` and `ENGACT-001` BLOCKED;
- synthetic control tenant has no GREEN engines;
- tenant isolation true;
- promotion denied `PHASE4_NOT_ALL_GREEN`;
- durability `IN_MEMORY_REFERENCE_ONLY`;
- cost 0;
- PROD/PROD-write/Trading/Supabase-write/external-code false.

## Automatic evidence

Workflow: `.github/workflows/cerebro-company-reg-tenant-preprod-v0.yml`.

The workflow is repository read-only and may run from main self-check, bounded manual dispatch, or defined `cerebro_company_reg_tenant_preprod` repository dispatch. Artifacts are evidence only.

## Failure handling

- `POLICY_CONFLICT`: stop this request; inspect contract/intent drift.
- `HIGH_RISK`: stop; no environment/authority expansion.
- `MONEY_LIMIT`: stop; no new spend path.
- `SECURITY_INCIDENT`: stop; investigate tenant isolation breach.
- `LOW_CONFIDENCE`: stop; inspect state/dependency drift.

After three failures in the same causal family, change strategy; do not repeat the same action.

## Rollback

There is no durable business-state write in this V0. Rollback is a narrow Git revert of the additive runner/workflow/request/tests/docs. Do not delete or rebuild existing App/CRM/Supabase/SEO/WordPress/Training assets.

## Rebuild

Rebuild from Git source plus the canonical Phase 4 registry and runner. The accepted execution SHA-256 must reproduce for the accepted source/request. Generated Actions ZIP digests are not the deterministic identity.

## Next gate

`DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`.

Before any persistence mutation: inventory current Supabase company/tenant/registry schemas, RLS, RPCs, dependencies, backup/restore and App/CRM contracts. Implement additive/parallel PREPROD first, then OLD-vs-NEW, rollback and promotion gates.
