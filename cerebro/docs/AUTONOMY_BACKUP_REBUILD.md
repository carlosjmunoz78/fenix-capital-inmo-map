# CEREBRO OS · AUTONOMY / BACKUP / REBUILD

## Autonomy state

### HECHO structural/reference
- FACT-001 / GOV-001.
- FACT-001 AutoFactory V0 is `AUTOMATIC_SCAFFOLD_VERIFIED` for bounded canonical SCAFFOLD requests, backed by live push run `37830400943` and deterministic rerun evidence.
- COMP-ONB-001 structural onboarding V0 is `AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED`, backed by `main` run `37833181826` attempts 1 and 2 on exact source SHA `cb46c0c95b4e628608990404e4c1ac38e889b79e`, both producing 17 engines, 306 structural files and aggregate SHA-256 `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`.
- COMP-REG-001 and TENANT-001 PREPROD reference execution are `PREPROD_REFERENCE_EXECUTION_VERIFIED`, backed by run `37838584276` attempts 1 and 2 on source `6710067e0f1beb28f930c038aceebfb9168f965a`, both reproducing execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8` with tenant isolation and promotion deny.
- Phase 4 multi-company bootstrap V0.
- Phase 5 Console/Gateway V0.
- Governance V0: POL-001 / HEX-001.
- EVT-001 / JOB-001 persistent local/self-hosted PREPROD single-writer reference adapters.

### PARCIAL
- RUNTIME-001 / FINOPS-001 are executable reference V0 components.
- EVT-001 / JOB-001 are persistent reference components but are not yet wired as the SharedRuntime replacement, not multi-process/shared-worker coordinated and not autonomous PROD.
- Existing-engine bindings are wrappers/contracts only until live evidence is audited.
- FACT-001 `repository_dispatch` support is defined, but ACTGW-001 → repository_dispatch live proof is still pending. Git-backed automatic request execution is verified.
- Generated target engines remain `SCAFFOLD` until their own implementation/evaluation/tribunal/PREPROD gates pass.
- COMP-ONB-001 is verified only for structural company scaffold generation. Structural company bootstrap does not mark scan/SEO/social/local/marketing/knowledge/CRM/App/automation/Training/TENANT/activation engines GREEN; actual onboarding execution remains downstream.
- COMP-REG-001/TENANT-001 verification is reference execution only: `MultiCompanyBootstrap` still persists companies in memory only. Durable transactional Company Registry persistence remains unimplemented and must be audited before any binding.

### DEFINIDO
- DBOFF-001 / STOROFF-001 / FREE-001 / AIBUD-001 contracts/targets.
- `ACTGW-001 → cerebro_new_company_scaffold` and `ACTGW-001 → cerebro_company_reg_tenant_preprod` repository-dispatch contracts are defined but not live-verified.

### NOT AUTONOMOUS PROD
No CEREBRO engine may be interpreted as autonomous PROD solely from scaffold, unit-test, PREPROD or repository deployment evidence. Individual promotion still requires contracts, permissions, tests, evaluation, tribunal, observability, rollback, backup, rebuild, measured cost, policy and PREPROD.

## Human-by-exception boundary

HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.

## Backup model V0

- Git history is the source snapshot for code/config/docs in `cerebro/`.
- Factory generated output is not a backup source; it is rebuildable output.
- FACT-001 AutoFactory request contracts and seed requests are Git-backed; generated request artifacts are reproducible and retained by GitHub Actions as run evidence, not treated as source of truth.
- FACT-001 accepted deterministic identity is the request idempotency key + generated bundle checksum + registry checksum; ZIP artifact digests may differ because archive metadata is not the scaffold identity.
- COMP-ONB structural request contracts and synthetic acceptance fixture are Git-backed. The 17 generated Phase 4 structures are rebuildable artifacts, not a business-data backup or source of truth.
- COMP-ONB accepted deterministic identity is exact source/request context plus aggregate SHA-256 `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`; Actions ZIP digests may differ because archive metadata is not the structural identity.
- COMP-REG/TENANT V0 creates no authoritative durable business state. Its Actions artifacts are evidence only; accepted deterministic identity is exact source/request context plus execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`.
- Optional structural company profile data is not persisted raw in the result; only a SHA-256 fingerprint is retained. Credential/secret/bank-like fields are rejected before generation.
- Persistent EVT/JOB V0 journal files are runtime state and are not replaced by Git history; production-grade activation would require an explicit state backup/restore contract before migration.
- Existing production systems and their data remain governed by their existing backup mechanisms; these structural/reference V0 paths do not replace or modify them.
- No new paid backup service is introduced.

## Rollback model

- Before merge, exact branch HEAD is preserved in Git history and PREPROD evidence is tied to that SHA.
- After merge, exact merge SHA is captured and safety workflows are verified.
- FACT-001 AutoFactory has repository read-only permission and writes only temporary runner files plus CI artifacts. Rollback is therefore a narrow Git revert of the workflow/runner/request-contract additions; no application or business-data rollback is required.
- COMP-ONB structural automation is also repository read-only and performs no runtime cutover. Rollback is a narrow revert of the company structural adapter/workflow/request/test/docs changes; generated artifacts may be discarded because they are reproducible and contain no authoritative business state.
- COMP-REG/TENANT reference execution is repository read-only and in-memory only. Rollback is a narrow Git revert of the additive runner/workflow/fixture/tests/docs; there is no database rollback because no durable write is authorized.
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

FACT-001 AutoFactory single-request rebuild:
```bash
node cerebro/runtime/fact001-request-runner.mjs \
  --request cerebro/factory/requests/fact001-selfcheck.v0.json \
  --out /tmp/fact001-scaffold
```
Expected boundary: exact `SCAFFOLD`, 18 structural files, deterministic hashes, additional cost 0, PROD/Trading false.

COMP-ONB structural company rebuild:
```bash
cd cerebro
node multicompany/company-scaffold-bootstrap.mjs \
  --request multicompany/requests/company-bootstrap-selfcheck.v0.json \
  --out /tmp/cerebro-company-bootstrap
```
Expected boundary: `STRUCTURAL_BOOTSTRAP_GREEN`, 17 Phase 4 engines, 306 canonical structural files, zero business engines marked GREEN from scaffold generation, exact PREPROD adapter/SCAFFOLD outputs, aggregate SHA-256 `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`, additional cost 0 and PROD/Trading/Supabase-write false.

COMP-REG/TENANT PREPROD reference rebuild:
```bash
cd cerebro
node multicompany/company-reg-tenant-preprod.mjs \
  --request multicompany/requests/company-reg-tenant-selfcheck.v0.json \
  --out /tmp/company-reg-tenant-result.json
```
Expected boundary: `COMP_REG_TENANT_PREPROD_GREEN`, GREEN engines exactly COMP-REG-001/TENANT-001, tenant isolation true, COMP-ONB READY, SCAN/ENGACT BLOCKED, promotion denied, `IN_MEMORY_REFERENCE_ONLY`, execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`, cost 0 and PROD/Trading/Supabase writes false.

Reference runtime/multi-company/console/governance behavior is rebuilt from repository source and verified through `npm test` plus PREPROD gates.

Persistent EVT/JOB V0 code is rebuilt from repository source; persisted journal state is reconstructed deterministically by operation replay when the journal is available. A future production state store requires an explicit backup/restore procedure before activation.

## Cost

Additional cost target remains **0 €**. Deterministic Node/JSON/GitHub CI paths are used; paid AI is not required for runtime correctness.
