# COMP-ONB-001 · Automatic Structural Acceptance · 2026-10-08

## Status

`HECHO · AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED`

Scope is strictly structural PREPROD/SCAFFOLD onboarding. This acceptance does not mark any business engine GREEN and does not authorize PROD, PROD writes, Trading, Supabase writes, external code execution or paid services.

## Preserved authorities

- Canonical Phase 4 graph: `cerebro/registry/multicompany-bootstrap.json`.
- Existing deterministic registration/dependency state machine: `cerebro/multicompany/bootstrap.mjs`.
- Canonical scaffold generator: FACT-001.
- COMP-ONB-001 composes those authorities; it does not replace them.

## Merge evidence

- PR: #509.
- Exact merge/source SHA: `cb46c0c95b4e628608990404e4c1ac38e889b79e`.
- Automatic `main` workflow: `CEREBRO Multi-Company Structural Bootstrap V0`.
- Run ID: `37833181826`.
- Attempt 1: SUCCESS, triggered automatically by `push` on `main`.
- Attempt 2: SUCCESS, deterministic rerun against the same immutable source SHA and request.

## Deterministic acceptance identity

Both attempts produced the same canonical result:

- request_id: `company-bootstrap-selfcheck-v0`
- company_id: `cerebro-bootstrap-selfcheck`
- phase4_engine_count: `17`
- structural_files_total: `306`
- aggregate_sha256: `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`
- next_gate: `COMP_REG_AND_TENANT_PREPROD_EXECUTION_REQUIRED`
- additional_cost_eur: `0`
- prod_authorized: `false`
- prod_write_authorized: `false`
- trading_access: `false`
- supabase_writes: `false`

Both attempts also completed the CEREBRO regression suite with `643 passed / 0 failed`.

The Actions ZIP artifact digests differ between attempts because archive metadata is not the deterministic scaffold identity. The accepted deterministic identity is the structural aggregate SHA-256 above plus the exact source/request context.

Evidence artifacts:

- Attempt 1 artifact ID `11574213742`, `company-scaffold-bootstrap-37833181826-1`.
- Attempt 2 artifact ID `11575991610`, `company-scaffold-bootstrap-37833181826-2`.

## Structural boundary

The verified automation creates the 17 canonical Phase 4 engine structures, each through FACT-001, for a total of 306 canonical structural files. It explicitly preserves zero business engines GREEN from scaffold generation.

Therefore `AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED` means:

`bounded company request → Phase 4 canonical graph → FACT-001 → 17 deterministic scaffolds → immutable evidence`

It does not mean scanning, keyword research, web audit, SEO, social audit, local presence, marketing, knowledge, CRM, App, automations, Training, tenant activation or PROD execution has completed.

## HUMAN_REQUIRED / safety

Canonical fail-closed routing remains unchanged:

- contract/schema drift → `POLICY_CONFLICT`
- authority/environment expansion → `HIGH_RISK`
- non-zero incremental spend → `MONEY_LIMIT`
- credential-like structural input → `SECURITY_INCIDENT`
- impossible structural count/state drift → `LOW_CONFIDENCE`

No new HUMAN_REQUIRED class is introduced.

## Backup / rollback / rebuild

Source of truth is Git. Generated structures are rebuildable output; Actions artifacts are evidence, not business-data backups. Rollback is a narrow Git revert of the additive COMP-ONB structural adapter/workflow/request/test/docs scope because there is no runtime cutover or production-data mutation.

Rebuild:

```bash
cd cerebro
npm run validate
npm test
node multicompany/company-scaffold-bootstrap.mjs \
  --request multicompany/requests/company-bootstrap-selfcheck.v0.json \
  --out /tmp/cerebro-company-bootstrap
```

Expected: `STRUCTURAL_BOOTSTRAP_GREEN`, 17 engines, 306 structural files, aggregate identity above, zero business engines GREEN, cost 0, PROD/Trading/Supabase-write false.

## Next block

`COMP-REG-001 + TENANT-001 · REAL PREPROD EXECUTION/EVIDENCE`

That block must prove actual tenant registration/dependency progression in PREPROD before scan/bootstrap engines can be described as operational. `ACTGW-001 → cerebro_new_company_scaffold` remains `DEFINED / POR AUDITAR LIVE` until a real Gateway-originated repository dispatch is observed.
