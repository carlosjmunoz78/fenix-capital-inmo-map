# COMP-ONB-001 · Multi-company Structural Onboarding V0

Date: 2026-10-08

## Objective

Use the verified FACT-001 AutoFactory to prepare the complete structural Phase 4 engine set for a newly registered company without falsely claiming that the company's business engines are operational.

Rule: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Existing authority preserved

- `cerebro/registry/multicompany-bootstrap.json` remains the canonical Phase 4 dependency graph.
- `cerebro/multicompany/bootstrap.mjs` remains the current deterministic PREPROD reference for registration/dependency state.
- `FACT-001` remains the canonical structural scaffold generator.
- This adapter composes those authorities; it does not replace them and does not add a new canonical engine ID.

## Scope

A valid company structural request produces FACT-001 scaffolds for the existing 17 Phase 4 engines:

`COMP-REG-001`, `COMP-ONB-001`, `SCAN-001`, `KW-001`, `WAUD-001`, `SOCAUD-001`, `LOCALP-001`, `KBOOT-001`, `SEOBOOT-001`, `SOCBOOT-001`, `MKTBOOT-001`, `CRMBOOT-001`, `APPBOOT-001`, `AUTBOOT-001`, `TRNBOOT-001`, `ENGACT-001`, `TENANT-001`.

Expected structural output: **17 × 18 = 306 canonical scaffold files**.

Tenant identity is recorded in the external onboarding evidence and FACT request identity. The 18 generic canonical scaffold files themselves are not rewritten with company-specific data, preserving FACT determinism and reuse.

## Strict evidence boundary

Structural generation may not mark any Phase 4 business engine `GREEN`. After registration the existing dependency graph remains in its real READY/BLOCKED state until each engine receives actual PREPROD execution evidence.

Therefore:

`STRUCTURAL_BOOTSTRAP_GREEN` means the 17 required engine structures exist reproducibly for the company context.

It does **not** mean web scanning, keyword research, SEO, social audit, local presence, marketing, knowledge, CRM, App, automations, Training, activation or tenant runtime work has executed.

## Request contract

- `company_id`: tenant scope.
- `engine_id`: result authority is `COMP-ONB-001`; sub-scaffolds use the 17 canonical Phase 4 IDs.
- `environment`: exact `PREPROD` for the onboarding adapter.
- `version`: contract version.
- generated FACT requests run exact `SCAFFOLD`.
- additional cost: 0 EUR.
- no PROD authorization/write.
- no Trading access.
- no Supabase writes.
- no external code execution.

Small optional non-sensitive company profile metadata may be supplied, but only its SHA-256 fingerprint is persisted in structural evidence. Credential/secret/bank-like keys fail closed to `SECURITY_INCIDENT`.

## HUMAN_REQUIRED routing

- contract/schema drift → `POLICY_CONFLICT`
- PREPROD/authority expansion → `HIGH_RISK`
- non-zero incremental spend → `MONEY_LIMIT`
- credential-like structural input → `SECURITY_INCIDENT`
- impossible structural count/state drift → `LOW_CONFIDENCE`

No new exception class is introduced.

## Hostless automation

Workflow: `CEREBRO Multi-Company Structural Bootstrap V0`.

Ingress:

- automatic `push` self-check when the structural onboarding implementation/authority changes on `main`;
- explicit `workflow_dispatch` for a bounded repository request;
- defined `repository_dispatch: cerebro_new_company_scaffold` for future CEREBRO Gateway binding.

Permissions: repository `contents: read` only. Output: temporary runner files plus immutable Actions artifact evidence. No source branch/state mutation.

## Backup

Git is the source of truth for code, graph and request contract. Generated structures are rebuildable output. Actions artifacts are evidence, not canonical business data.

No existing App/CRM/Supabase/WordPress/SEO/Training data is modified by this structural V0, so this additive change requires no migration/data rollback.

## Rollback

Before merge: abandon/revert the candidate branch.

After merge: narrow Git revert of the structural adapter/workflow/request/test/docs additions. Because the workflow is read-only and does not cut over an existing runtime, no production data rollback is required.

## Rebuild

```bash
cd cerebro
npm run validate
npm test
node multicompany/company-scaffold-bootstrap.mjs \
  --request multicompany/requests/company-bootstrap-selfcheck.v0.json \
  --out /tmp/cerebro-company-bootstrap
```

Expected:

- `STRUCTURAL_BOOTSTRAP_GREEN`
- 17 Phase 4 engines
- 306 structural files
- zero GREEN business engines from scaffold generation
- deterministic aggregate identity on rerun
- cost 0
- PROD/Trading/Supabase writes false.

## Promotion rule

`COMP-ONB-001` may be recorded as `AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED` only after exact-head gates are green, implementation merges additively to `main`, an automatic main run succeeds and an identical rerun reproduces the aggregate deterministic identity.

Even after that structural acceptance, actual onboarding remains **PARCIAL** until the real execution chain progresses through `COMP-REG-001` and `TENANT-001`, then the scanning/bootstrap engines, with their own PREPROD evidence. Autonomous PROD is outside this V0.
