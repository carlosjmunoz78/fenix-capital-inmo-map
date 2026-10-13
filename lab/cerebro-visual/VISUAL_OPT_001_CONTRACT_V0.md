# VISUAL-OPT-001 · Governed Visual Self-Optimizer V0

Date: 2026-10-13
Company scope: multiempresa
Environment: LAB / PREPROD
PROD_AUTHORIZED: false
Additional cost target: 0 EUR

## 1. Purpose
VISUAL-OPT-001 is the governed optimizer for CEREBRO's operational visual representation. Its job is to improve graphics, rendering, LOD, motion, readability and performance without rebuilding or silently replacing the accepted visual base.

Accepted baseline: `V1.4.25 · FOUR-LOD REFERENCE PARITY FINAL`.
Frozen rollback: `V1.4.7 · REFERENCE-PARITY OPAQUE-PEARL NEURITE FINAL` at `76a19de070a1af5c197557a79acec2c51227507e`.

The visual interface represents real engines, subengines, states, signals and artifacts. Decorative activity must never be presented as operational truth.

## 2. Governing loop
Every candidate follows:

`OBSERVE → MEASURE → PROPOSE → BUILD CANDIDATE → TEST → OLD vs NEW → TRIBUNAL → PROMOTE or DISCARD → DOCUMENT → LEARN`

No candidate may overwrite the accepted baseline before comparison and rollback validation.

## 3. Optimization tiers
### Tier 1 · AUTO_SAFE
May be optimized autonomously in LAB/PREPROD when all regression gates remain green:
- FPS / frame time and render workload
- progressive loading and LOD thresholds
- particle and micro-node density
- off-screen / distant detail reduction
- cache and draw-call efficiency
- small luminance, halo and contrast calibration
- interaction latency and camera timing
- reduced-motion behavior
- accessibility and legibility improvements

### Tier 2 · TRIBUNAL_REQUIRED
CEREBRO may generate and test these autonomously, but promotion requires OLD vs NEW tribunal evidence:
- material changes to composition
- new transition systems
- alternative cluster layouts
- new ways to represent activity, routes or hierarchy
- changes that materially alter scene density or visual hierarchy

### Tier 3 · HUMAN_OR_POLICY_BOUNDARY
Do not autonomously promote:
- abandoning the neural visual language
- changing canonical semantic meaning of blue/cyan, amber/gold or red/crimson
- changing product identity or core interaction contract
- any change triggering `POLICY_CONFLICT`, `HIGH_RISK`, `SECURITY_INCIDENT`, `MONEY_LIMIT` or another valid HUMAN_REQUIRED reason

## 4. Required inputs
When available, evaluate:
- `company_id`
- `engine_id`
- `environment`
- `version`
- real engine/subengine graph size
- real event/signal rate
- active LOD and viewport occupancy
- FPS / frame time
- CPU/GPU or renderer workload where measurable without new paid infrastructure
- interaction latency
- camera arrival latency
- visual-gate/reference score
- accessibility checks
- reduced-motion checks
- artifact readability
- errors and dropped-event/render evidence

Missing metrics must be marked `NOT_MEASURED`; they must not be fabricated.

## 5. Non-regression gates
A visual candidate cannot be promoted unless:
1. GLOBAL remains GREEN.
2. ACTIVE REGION remains GREEN.
3. NEURAL CLUSTER remains GREEN.
4. SUBCLUSTER / DEEP remains GREEN.
5. `MOVE THE CAMERA, NEVER THE GRAPH` remains respected unless a separately approved architecture change says otherwise.
6. Real engine topology remains truthful.
7. Real events are distinguishable from demo/synthetic events.
8. Accessibility does not regress.
9. Reduced-motion policy does not regress.
10. Rollback is present and tested at the same promotion boundary.
11. Cost delta is measured and defaults to 0 EUR.
12. PROD remains false until the normal CEREBRO promotion contract is satisfied.

## 6. Real operational graph rule
The visual graph is a projection of CEREBRO's real operational graph, not a hand-maintained illustration.

Target flow:
`FACT-001 / Engine Registry → Gateway / graph projection → renderer → interaction / Artifact Viewer`

When a real engine or subengine is created, enabled, disabled, repaired or retired, the visual graph should update from the governed source of truth. Visual nodes must carry at least:
`company_id · engine_id · parent_engine_id/subengine relation · environment · version · enabled · phase · activity_level · health_state · current_job · last_event · artifact_ids · confidence · updated_at`.

## 7. Real signal rule
Signal animation should be driven by real operational events whenever live integration exists. Synthetic/demo signal sources are allowed only in LAB QA and must be explicitly labeled as synthetic/demo.

## 8. Learning memory
VISUAL-OPT-001 records both winners and losers. A rejected experiment must store:
- hypothesis
- candidate version
- metrics before/after
- regressions
- tribunal outcome
- rejection reason

This prevents repeated failed experiments and supports progressive optimization.

## 9. Runtime and cost policy
Prefer, in order:
1. deterministic JavaScript/Canvas/Web APIs already in use
2. open-source/local techniques
3. existing contracted infrastructure
4. free tier/self-hosted components
5. paid external graphics/AI services only with explicit justification and ROI

Three.js, Unity, Unreal or paid visual platforms are not required for the current accepted architecture.

## 10. Documentation contract
Each accepted visual change updates:
- visual state / version
- changelog
- OLD vs NEW evidence
- visual gates
- rollback reference
- rebuild instructions where applicable
- cost state
- autonomy state

No hidden chain-of-thought or private reasoning telemetry is stored or rendered.

## 11. Current status
- Engine status: `DEFINED`
- Baseline: `V1.4.25 GREEN_PREPROD`
- Rollback: `V1.4.7 PRESERVED`
- Autonomous PROD authority: `FALSE`
- Additional cost: `0 EUR`
- HUMAN_REQUIRED: `FALSE`

## 12. Immediate execution order
Do not reopen visual polishing without evidence of a defect. Continue from the accepted V1.4.25 base with:
1. live engine/subengine graph binding,
2. live event/signal binding,
3. live artifact binding,
4. P8 VOICE-001 live source integration,
5. remaining P9 target-PC physical evidence at the correct promotion boundary.
