# CEREBRO MOTION-001 · V1.4.7 VISUAL ACCEPTANCE RECORD

Status: LAB / PREPROD · PROD FALSE
Date: 2026-10-13
Branch: `cerebro-visual-lab`

## HECHO

- Current visual candidate: `LAB V1.4.7 · REFERENCE-PARITY OPAQUE-PEARL NEURITE FINAL`.
- Active index commit: `76a19de070a1af5c197557a79acec2c51227507e`.
- QA harness commit: `5b4a4f55c4de2e3d3a28f67e28458b622f904062`.
- JavaScript syntax validation: PASS before promotion of the candidate.
- Browser QA executed for `GLOBAL_BRAIN`, `ACTIVE_REGION`, `NEURAL_CLUSTER` and `SUBCLUSTER / DEEP` using one reused Opera tab.
- Same graph/world is preserved at every LOD. Camera changes framing and depth; the graph is not replaced.
- Global view preserves a recognizable brain silhouette, dense luminous blue/cyan/white racimos and depth/bokeh.
- Cluster/deep views preserve dense pearl nodes, microactivity and thin organic neurites without falling into an empty black field.
- Manual wheel speed remains proportional to input magnitude.
- `prod_authorized:false` remains explicit.

## EXISTENTE

- Ten logical cluster placeholders remain available for later live engine bindings.
- Camera/manual interaction contracts from the preceding iterations are preserved.
- Previous candidates remain available as immutable rollback commits.

## ROLLBACK

- V1.4.6 index: `eb5892decd268347f6308533b59e8b00d49e442c`
- V1.4.5 index: `cbe28768da8fd4bd38a52faa86ca78307703513e`
- V1.4.4 index: `2c64ca3c4d522eb332195e29b68b57827969b33e`
- V1.4.3 index: `dcd8610bd42b71f9ec35c80c523b9a0004d7e11f`

## REFERENCIAS CANÓNICAS

- `CEREBRO_REFERENCE_GLOBAL_BRAIN.png`
- `CEREBRO_REFERENCE_CLUSTER_CLOSEUP.png`

The references are calibration targets, not production sprites. Runtime geometry remains deterministic/procedural to avoid visual jitter.

## PARCIAL

- Explicit owner visual sign-off on V1.4.7 is still pending.
- Performance benchmarking across more than one target PC remains pending.
- `prefers-reduced-motion`, accessibility and mobile optimization remain pending.
- Semantic live bindings, state animation, signal propagation, affect and artifact rendering are not part of this visual closure.

## NEXT BLOCK

Freeze the PC visual base at V1.4.7 unless a demonstrated mismatch against the canonical references requires a correction. Continue with real semantic bindings and `SIGNAL_PROPAGATION_V1`, preserving the current renderer, rollback chain and PREPROD gate.

## PROMOTION RULE

No PROD promotion is authorized. Any later promotion still requires contracts, permissions, tests, evaluation, observability, rollback, backup/rebuild evidence, PREPROD comparison and explicit promotion gate approval.
