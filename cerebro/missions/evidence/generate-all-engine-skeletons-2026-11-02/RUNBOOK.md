# Runbook · GENERATE_ALL_ENGINE_SKELETONS

## Rebuild
1. Checkout the isolated mission branch or a descendant preserving the same Registry/Factory contracts.
2. Install only repository-declared dependencies with `npm ci --ignore-scripts`.
3. Validate FACT-001 V1 against `cerebro/registry/engine-registry.v1.json`.
4. Run `node cerebro/missions/generate-all-engine-skeletons-v1.mjs --out <isolated-output>`.
5. Require `total_registry=179`, `blocked=0`, `additional_cost_eur=0`, `prod_touched=false`.
6. Require `TEST_REPORT.status=GREEN`, zero failed mission assertions and `REBUILD_PROOF.status=GREEN`.
7. Require all 179 rebuilt pack hashes to match the first generation.

## Rollback
This mission is additive and isolated. Rollback is deletion/reversion of the mission branch commits only. Do not modify Registry, FACT-001 V0/V1, main, PROD, CRM PROD, WP PROD, DNS or Trading LAB as rollback shortcuts.

## Safety invariants
- No PROD promotion.
- No direct main mutation from this mission.
- No secrets, credentials or customer data in scaffold artifacts.
- Exact canonical HUMAN_REQUIRED vocabulary only.
- Zero additional cost by default.
- Existing physical engines are wrapped/preserved, not overwritten.
- P23 Live Audit remains POR_AUDITAR until a real physical integration path exists and is tested.

## Known preserved baseline
The continuous worker is intentionally paused. Its two related red tests are not changed or reactivated by this mission.
