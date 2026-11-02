# Changelog · 2026-11-02

- Added strict 179-engine autonomy/readiness audit. OLD baseline: 179 physical, 179 PROD-registration-ready, 0 autonomous PROD.
- Added `prod-engine-governance.v1.json` covering all 179 canonical IDs with fail-closed execution, no PROD writes, no Trading and 0 EUR additional cost.
- Added P23 Live integration contract targeting FACT-001.
- Added deterministic P23 runtime generating exactly 179 audit points with the required audit fields.
- Added P23 focused tests and full regression gate.
- Added daily + significant-change P23 Live workflow with durable Git state branch `cerebro/p23-state-v1`.
- Added exact-head PR promotion workflow for CEREBRO PROD control-plane registration. App/Supabase physical deployment is explicitly outside scope.
- Preserved canonical Registry and Factory unchanged.
- PREPROD readiness gate run `41457999602` GREEN on source `423ebdd438bedf686654031538ab8989e436119d`.
