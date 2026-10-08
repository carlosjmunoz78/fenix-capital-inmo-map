# CEREBRO Multi-company Request Contracts V0

This directory contains bounded PREPROD request fixtures/contracts for the existing Phase 4 multi-company graph.

## COMP-ONB-001 · structural company scaffold request

Purpose: when a new company is registered for CEREBRO onboarding, generate reproducible FACT-001 scaffolds for the 17 canonical Phase 4 engines while preserving their real runtime/evidence state. A green structural run does **not** mean SEO, scanning, CRM, App, marketing, Training or any other business engine is operational.

Accepted fields:

- `schema_version`: `1.0.0`
- `request_id`: stable bounded idempotency identity
- `company_id`: tenant identifier
- `environment`: exactly `PREPROD`
- `version`: bootstrap contract version
- `intent`: exactly `BOOTSTRAP_COMPANY_SCAFFOLDS`
- optional `profile`: small non-sensitive company metadata; only its SHA-256 fingerprint is persisted in structural result evidence
- `additional_cost_eur`: `0`
- `prod_authorized`: `false`
- `prod_write_authorized`: `false`
- `trading_access`: `false`
- `supabase_writes`: `false`
- `external_code_execution`: `false`

Credential/secret/bank-like profile keys are rejected with `SECURITY_INCIDENT`; non-zero incremental cost with `MONEY_LIMIT`; authority/environment expansion with `HIGH_RISK`; contract drift with `POLICY_CONFLICT`.

For each of the 17 canonical Phase 4 engine IDs, the adapter invokes FACT-001 in `SCAFFOLD` context and records tenant-scoped evidence externally. It does not rewrite the 18 canonical scaffold files to inject a tenant. Expected structural total: **17 × 18 = 306 files**. Structural generation is forbidden from marking business engines `GREEN`.

Acceptance fixture: `company-bootstrap-selfcheck.v0.json`.

## COMP-REG-001 + TENANT-001 · PREPROD reference execution request

Purpose: exercise the existing `MultiCompanyBootstrap` state machine for the two deterministic reference nodes that establish company registration and tenant-boundary progression, without inventing durable persistence or production authority.

Accepted fields:

- `schema_version`: `1.0.0`
- `request_id`: stable execution identity
- `company_id`: tenant identifier
- `environment`: exactly `PREPROD`
- `version`: Phase 4 reference contract version
- `intent`: exactly `EXECUTE_COMP_REG_TENANT_PREPROD`
- `additional_cost_eur`: `0`
- `prod_authorized`: `false`
- `prod_write_authorized`: `false`
- `trading_access`: `false`
- `supabase_writes`: `false`
- `external_code_execution`: `false`

The runner creates a separate synthetic control tenant, executes `COMP-REG-001` then `TENANT-001` only for the requested tenant, verifies that the control tenant remains unchanged, confirms `COMP-ONB-001` becomes READY while `SCAN-001` and `ENGACT-001` remain BLOCKED, and confirms promotion remains denied.

The result explicitly states `durability_state=IN_MEMORY_REFERENCE_ONLY`. It is evidence of real execution of the current deterministic PREPROD reference state machine, **not** evidence of a durable production Company Registry. The next gate is `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`.

Acceptance fixture: `company-reg-tenant-selfcheck.v0.json`.
