# COMP-REG-001 + TENANT-001 · PREPROD Acceptance · 2026-10-08

## Status

`HECHO · PREPROD_REFERENCE_EXECUTION_VERIFIED`

This acceptance is deliberately narrower than durable operational registration. It proves the existing deterministic Phase 4 reference state machine executed correctly and reproducibly in exact PREPROD. It does not claim a durable Company Registry, Supabase persistence, PROD authority or activation of downstream business engines.

## Preserved authorities

- Canonical Phase 4 dependency graph: `cerebro/registry/multicompany-bootstrap.json`.
- Existing deterministic state machine: `cerebro/multicompany/bootstrap.mjs`.
- Additive execution/evidence adapter: `cerebro/multicompany/company-reg-tenant-preprod.mjs`.

## Merge and automatic evidence

- Implementation PR: #511.
- Exact merge/source SHA: `6710067e0f1beb28f930c038aceebfb9168f965a`.
- Workflow: `CEREBRO Company Registry Tenant PREPROD V0`.
- Run ID: `37838584276`.
- Attempt 1: SUCCESS, automatic `push` run on `main`.
- Attempt 2: SUCCESS, deterministic rerun against the same immutable source/request.
- Both attempts: `651 passed / 0 failed` CEREBRO tests.

## Deterministic execution identity

Both attempts produced the same bounded result:

- request_id: `company-reg-tenant-selfcheck-v0`
- company_id: `cerebro-reg-tenant-selfcheck`
- environment: `PREPROD`
- version: `0.1.0`
- status: `COMP_REG_TENANT_PREPROD_GREEN`
- GREEN engines: `COMP-REG-001`, `TENANT-001`
- next READY engine: `COMP-ONB-001`
- `SCAN-001`: `BLOCKED`
- `ENGACT-001`: `BLOCKED`
- tenant isolation: verified through independent synthetic control tenant
- promotion: denied with `PHASE4_NOT_ALL_GREEN`
- execution_sha256: `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`
- durability: `IN_MEMORY_REFERENCE_ONLY`
- next gate: `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`
- additional cost: `0 EUR`
- PROD / PROD write / Trading / Supabase write / external-code authority: `false`

Evidence artifacts:

- attempt 1 artifact ID `11577210274`
- attempt 2 artifact ID `11576851850`

Actions ZIP hashes are transport metadata and are not the deterministic execution identity. The accepted identity is the execution SHA-256 above plus exact source/request context.

## Boundary

This block proves:

`register company in existing PREPROD state machine → COMP-REG-001 GREEN → TENANT-001 GREEN → tenant isolation and dependency progression verified`

It does not prove:

- durable transactional company registration;
- a persisted tenant registry surviving workflow/process restart;
- business scanning, SEO, social, local, marketing, knowledge, CRM, App, automation or Training execution;
- `COMP-ONB-001` business execution;
- autonomous PROD promotion.

The current implementation intentionally stores company state in an in-memory `Map`; therefore any stronger persistence claim would be false.

## HUMAN_REQUIRED / safety

Canonical routing remains unchanged:

- contract/schema/intent drift → `POLICY_CONFLICT`
- environment or authority expansion → `HIGH_RISK`
- non-zero incremental cost → `MONEY_LIMIT`
- cross-company state leakage → `SECURITY_INCIDENT`
- impossible state progression → `LOW_CONFIDENCE`

## Backup / rollback / rebuild

There is no authoritative business-state mutation in this V0. Git is the source of truth and Actions artifacts are evidence only.

Rollback is a narrow Git revert of the additive runner/workflow/request/tests/docs; no production-data rollback is required.

Rebuild:

```bash
cd cerebro
npm run validate
npm test
node multicompany/company-reg-tenant-preprod.mjs \
  --request multicompany/requests/company-reg-tenant-selfcheck.v0.json \
  --out /tmp/company-reg-tenant-result.json
```

Expected identity: `COMP_REG_TENANT_PREPROD_GREEN`, exact two GREEN engines, tenant isolation true, promotion denied, execution SHA-256 above, cost 0 and all PROD/Trading/Supabase-write authority false.

## Next block

`DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`.

The next block must begin read-only: inventory existing Supabase company/tenant/registry schemas, RLS, RPCs, dependencies, backup/rollback and current App/CRM contracts before proposing any additive persistence binding.
