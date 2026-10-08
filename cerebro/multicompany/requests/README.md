# COMP-ONB-001 · Multi-company Structural Bootstrap Request V0

This directory contains **structural** onboarding requests for the existing Phase 4 multi-company graph.

The V0 purpose is narrow: when a new company is registered for CEREBRO onboarding, generate reproducible FACT-001 scaffolds for the 17 canonical Phase 4 engines while preserving their real runtime/evidence state. A green structural run does **not** mean SEO, scanning, CRM, App, marketing, Training or any other business engine is operational.

## Request

Required/accepted fields:

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

## Output boundary

For each of the 17 canonical Phase 4 engine IDs, the adapter invokes the already verified FACT-001 structural factory in `SCAFFOLD` context and records tenant-scoped evidence externally. It does not rewrite the 18 canonical scaffold files to inject a tenant; generic factory output stays reusable and deterministic.

Expected structural total: **17 engines × 18 canonical scaffold files = 306 structural files**.

The Phase 4 logical bootstrap state is also recorded after company registration. Structural generation is forbidden from marking any business engine `GREEN`; real engine progression still requires its own PREPROD execution/evidence.

## Acceptance fixture

`company-bootstrap-selfcheck.v0.json` is synthetic and contains no customer/business credentials. It exists only to prove the hostless automation path after merge.
