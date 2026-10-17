# CEREBRO OS · B18 · CHANGELOG

## 2026-10-18 · B18_LRN_MEASURED_ENGINEER_OUTCOME_LOOP

### Changed
- `cerebro/platform/auto001-preprod-patch-planner-v0.mjs`
  - selection among equivalent certified mappings is now deterministic and independent of array order.
- `cerebro/tests/auto001-preprod-patch-executor-v0.test.mjs`
  - added permutation regression proving stable repair selection and plan id.

### Added
- `cerebro/runtime/universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.mjs`
- `cerebro/tests/universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.test.mjs`
- `.github/workflows/cerebro-universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.yml`
- `cerebro/registry/universal-skill-b18-lrn-measured-engineer-outcome-loop.v1.json`
- B18 contract, dependency map, runbook and backup/rebuild/autonomy docs.

### Measured result
- OLD baseline: `order_invariance_score=0`.
- NEW: `order_invariance_score=1`.
- LRN persisted evidence and generated governed improvement candidate.
- Safe Engineering: `PASS_PREPROD_PLAN`.
- independent Tribunal: `APPROVE_PREPROD_NEXT_STAGE`.
- next-cycle evidence changed the subsequent decision to `KEEP_NEW_MONITOR`.

### Certification
Workflow run #2 / `run_id=39080643672` SUCCESS at exact PR head `ed92f8b7ff351d98318d57225b4d3f510e20b7a4`; targeted + real OLD/NEW + full CEREBRO regression GREEN.

### Safety
No PROD write. No auto-merge. No Trading. No customer data. Additional cost 0 €.

### Next
`B19_UNIVERSAL_E2E_REAL`.
