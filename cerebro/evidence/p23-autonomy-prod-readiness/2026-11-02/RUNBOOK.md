# Runbook · P23 Live + 179-engine PROD control plane

## Scope

This block registers the canonical 179 CEREBRO engines in the PROD control plane using a deny-by-default policy and activates P23 (Jarvis) as a live FACT-001 audit writer. Registration is not execution authorization.

## Normal operation

1. `cerebro-p23-live-audit-v1.yml` runs on every significant CEREBRO change to `main` and at least once every 24 hours.
2. The runtime `cerebro/runtime/p23/fact001-audit-live-v1.mjs` reads the canonical Registry and governed PROD policy, performs the evidence-first readiness audit, and emits exactly 179 audit points.
3. Each point contains company_id, engine_id, environment, version, status, score, criticidad, fallos, plan_de_mejora and fecha.
4. The workflow persists `LATEST.json`, `SUMMARY.json`, `AUDIT_POINTS.jsonl` and a history receipt to `cerebro/p23-state-v1`.
5. All 179 engines are registered in PROD control plane. Execution and writes remain disabled by default.

## Safety invariants

- Registry remains 179 unique IDs.
- `prod_execution_authorized=false` and `prod_write_authorized=false` by default.
- Trading is forbidden.
- Secret values are forbidden.
- Cross-company access is denied.
- Additional cost remains 0 EUR.
- App/Supabase are outside this promotion scope.
- No App physical deploy is triggered by this control-plane promotion.

## Failure behavior

Any mismatch in Registry count, governance policy, P23 contract, tests, regression, rebuild, source SHA, state receipt or allowed paths fails closed. No merge to `main` is permitted without the exact-head PREPROD gate GREEN.

## Rollback

1. Revert the exact CEREBRO PROD control-plane promotion commit on `main`.
2. Preserve `cerebro/p23-state-v1` as immutable audit evidence; do not delete history.
3. The previous `main` SHA is the source rollback point.
4. PROD business execution is unaffected because this block grants no autonomous execution/write authority.

## Rebuild

The system rebuilds from `engine-registry.v1.json`, the L0-L9 physical manifests, `prod-engine-governance.v1.json`, the P23 contract and deterministic runtime. P23 tests prove identical output for identical audited_at/source_sha/evidence.

## Promotion rule

Promotion is exact-head via PR. The promotion workflow requires the same candidate SHA to pass the PREPROD gate, permits only `cerebro/` and `.github/workflows/` changes, merges without the App `[DEPLOY_PROD]` marker, then requires a successful P23 Live run on the resulting `main` SHA and a durable state-branch receipt.
