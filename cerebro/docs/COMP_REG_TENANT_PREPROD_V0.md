# COMP-REG-001 + TENANT-001 · PREPROD Reference Execution V0

Date: 2026-10-08

## Objective

Close the next Phase 4 gate after automatic structural onboarding by executing the existing deterministic Company Registry and Tenant Boundary reference nodes in exact PREPROD, with tenant-isolation evidence and without pretending that in-memory reference state is durable production registration.

Rule: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Existing authority preserved

- `cerebro/registry/multicompany-bootstrap.json` remains the canonical 17-engine Phase 4 dependency graph.
- `cerebro/multicompany/bootstrap.mjs` remains the current deterministic state-machine authority.
- `COMP-REG-001` has no dependencies and starts READY after registration.
- `TENANT-001` depends on `COMP-REG-001`.
- `COMP-ONB-001` also depends on `COMP-REG-001`.
- `ENGACT-001` remains dependent on TENANT plus later business bootstrap nodes.

This V0 adds an execution/evidence adapter only; it does not replace or mutate the existing state machine.

## Execution path

`bounded PREPROD request → register primary tenant + isolated control tenant → COMP-REG-001 RUNNING→GREEN → verify COMP-ONB-001/TENANT-001 READY → TENANT-001 RUNNING→GREEN → verify tenant isolation → verify SCAN/ENGACT remain BLOCKED → verify PROD promotion denied → immutable CI evidence`

## Strict evidence boundary

A green run proves the current deterministic Phase 4 reference implementation actually executed in PREPROD and respected dependency/tenant isolation semantics.

It does **not** prove durable Company Registry persistence. `MultiCompanyBootstrap` currently stores companies in an in-memory `Map`, and the canonical Phase 4 contract keeps `supabase_writes=false`.

Therefore the accepted state for this block can be no stronger than a PREPROD reference-execution claim. Durable transactional persistence requires a separate inventory/contract/backup/rollback audit before any Supabase or other state-store binding.

## Required success invariants

- exact environment `PREPROD`;
- primary tenant reaches `COMP-REG-001=GREEN` and `TENANT-001=GREEN`;
- only those two engines may be GREEN in this bounded block;
- `COMP-ONB-001` is READY afterwards;
- `SCAN-001` remains BLOCKED until COMP-ONB is GREEN;
- `ENGACT-001` remains BLOCKED;
- a synthetic control tenant remains unchanged with only `COMP-REG-001` READY;
- promotion remains `allowed=false`, reason `PHASE4_NOT_ALL_GREEN`;
- cost 0 EUR;
- PROD/PROD-write/Trading/Supabase-write/external-code authority false.

## HUMAN_REQUIRED

- schema/intent drift → `POLICY_CONFLICT`
- environment/authority expansion → `HIGH_RISK`
- non-zero incremental cost → `MONEY_LIMIT`
- cross-company state leakage → `SECURITY_INCIDENT`
- impossible state progression → `LOW_CONFIDENCE`

No new exception class is introduced.

## Hostless automation

Workflow: `CEREBRO Company Registry Tenant PREPROD V0`.

Ingress:

- automatic self-check on `main` when the runner/state-machine/registry/fixture/workflow changes;
- explicit bounded `workflow_dispatch` request;
- defined `repository_dispatch: cerebro_company_reg_tenant_preprod` for future Gateway binding.

Repository permission is `contents: read`; evidence is emitted only as temporary runner output plus immutable Actions artifacts.

## Backup / rollback

No authoritative business state is persisted by this V0. Source of truth is Git; run artifacts are evidence only.

Rollback before merge: abandon/revert the candidate branch.

Rollback after merge: narrow Git revert of the additive runner/workflow/fixture/tests/docs. No production data rollback is required because there is no durable data write or runtime cutover.

## Rebuild

```bash
cd cerebro
npm run validate
npm test
node multicompany/company-reg-tenant-preprod.mjs \
  --request multicompany/requests/company-reg-tenant-selfcheck.v0.json \
  --out /tmp/company-reg-tenant-result.json
```

Expected result:

- `COMP_REG_TENANT_PREPROD_GREEN`
- green engines exactly `COMP-REG-001`, `TENANT-001`
- `COMP-ONB-001` READY
- `SCAN-001` / `ENGACT-001` BLOCKED
- tenant isolation verified
- promotion denied
- `durability_state=IN_MEMORY_REFERENCE_ONLY`
- next gate `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`
- cost0 / PROD false / Trading false / Supabase writes false.

## Promotion rule

Do not record this block as verified until:

1. exact-head candidate gates pass;
2. implementation merges additively to `main`;
3. automatic `main` run succeeds;
4. deterministic rerun reproduces the same `execution_sha256` against the same source/request.

Even after acceptance, durable Company Registry persistence remains a separate gate.

## Acceptance closure · 2026-10-08

The promotion rule is satisfied for the PREPROD reference-execution scope only.

- PR #511 merged additively to `main` at `6710067e0f1beb28f930c038aceebfb9168f965a`.
- Automatic run `37838584276` attempt 1 completed SUCCESS.
- Deterministic rerun of the same source/request, attempt 2, completed SUCCESS.
- Both attempts completed `651 passed / 0 failed` CEREBRO tests.
- Both produced `COMP_REG_TENANT_PREPROD_GREEN` with GREEN engines exactly `COMP-REG-001` and `TENANT-001`.
- Both reproduced execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`.
- `COMP-ONB-001` became READY; `SCAN-001` and `ENGACT-001` remained BLOCKED.
- The synthetic control tenant remained unchanged, proving tenant isolation in this bounded reference path.
- Promotion remained denied with `PHASE4_NOT_ALL_GREEN`.
- Additional cost remained 0 EUR and PROD/PROD-write/Trading/Supabase-write/external-code authority remained false.

Accepted state for both engines: `PREPROD_REFERENCE_EXECUTION_VERIFIED` with `durability_state=IN_MEMORY_REFERENCE_ONLY`.

Next gate remains `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`.
