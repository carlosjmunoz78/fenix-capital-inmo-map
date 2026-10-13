# CEREBRO VISUAL · V1.4.25 ACCEPTANCE

Date: 2026-10-13
Environment: LAB / PREPROD
PROD_AUTHORIZED: false

## Baseline and rollback
- Frozen rollback: `V1.4.7 · REFERENCE-PARITY OPAQUE-PEARL NEURITE FINAL` at `76a19de070a1af5c197557a79acec2c51227507e`.
- Final visual candidate: `candidate-v1425.html`.
- V1.4.7 `index.html` remains preserved; V1.4.25 is additive.
- Cost added: 0 EUR.

## Four visual gates
- GLOBAL: GREEN. Brain silhouette remains recognizable, viewport occupancy is strong, thousands of micro-points remain visible, bright cyan/white clusters preserve hierarchy. Reference metrics improved from 72.2/100 to 86.1/100 on the pinned QA harness.
- ACTIVE REGION: GREEN. Same graph and same brain remain visible with more local detail and surrounding context; no giant generic spheres.
- NEURAL CLUSTER: GREEN. Dense node field, luminous hierarchy and fine organic connections remain visible at cluster LOD.
- SUBCLUSTER / DEEP: GREEN. More zoom produces more information rather than black void; dense white/cyan microstructure remains anchored to the real CORE cluster. Reference metrics improved from 25.6/100 on the early V8 deep audit to 85.2/100 on the accepted deep composition.

## Accepted composition
Global-only layers:
- `reference-global-polish-v1.js`
- `reference-global-polish-v2.js`
- `reference-global-polish-v3.js`

Multiscale/deep layers:
- `reference-polish-v8.js`
- `reference-polish-v11.js`
- `reference-polish-v13.js`
- `reference-polish-v14.js`
- `reference-polish-v15.js`
- `reference-polish-v16.js`
- `reference-polish-v17.js`
- `reference-polish-v18.js`

## QA evidence
- Opera Browser Connector used with one reused QA tab.
- GLOBAL, ACTIVE REGION, NEURAL CLUSTER and SUBCLUSTER/DEEP captured from the same renderer family.
- Pinned metric harnesses force exact camera state for deterministic comparison because remote Opera can throttle requestAnimationFrame between connector calls.
- No production changes were made.

## Gates preserved
- MOVE THE CAMERA, NEVER THE GRAPH.
- PC first.
- PREPROD before PROD.
- PROD FALSE.
- Zero additional cost.
- No chain-of-thought / hidden-reasoning telemetry.
- Rollback preserved.

## Status
VISUAL_BASE_PC = GREEN_PREPROD
PROD = FALSE
HUMAN_REQUIRED = FALSE

## Next block
Resume the already additive Motion/Signal track from the live repository state; do not rebuild the visual base. P8/P9 evidence gaps remain separate from this visual-gate acceptance.