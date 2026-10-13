# CEREBRO VISUAL · MOTION / SIGNAL V2 · ACCEPTANCE

Date: 2026-10-13
Environment: LAB / PREPROD
Candidate: `V1.4.26-motion`
Visual base: `V1.4.25`
Frozen renderer rollback: `V1.4.7` (`76a19de070a1af5c197557a79acec2c51227507e`)
PROD_AUTHORIZED: false
Additional cost: 0 EUR

## HECHO · GREEN_PREPROD

### P2 · SIGNAL_PROPAGATION_V2

- Preserves the existing neural graph; signal travel is an overlay on the canonical graph.
- Uses a coherent multi-hop route and destination reaction.
- Browser QA proved the signal becomes active toward `COMMS`, completes, and leaves the expected destination reaction.
- No hidden model reasoning / chain-of-thought telemetry is exposed.

### P3 · MOTION_CONTROLLER_V2

- Orchestrates the existing camera only; it does not move or rebuild the graph.
- Replaces fixed transition timing with target-arrival detection based on real camera position and zoom error.
- Human wheel/pointer/touch/navigation-key input synchronously returns control to `MANUAL`.
- Browser QA proved wheel override in less than one 60 Hz frame (`< 16.7 ms`).
- Reduced-motion mode snaps to the existing camera target and settles without a fixed animation duration.

### P4 · CONVERSATION_MOTION_V2

- Uses `SIGNAL_PROPAGATION_V2` when available.
- Conversation phases are explicit operational UI states only: LISTEN / THINK / RESPOND; they are not hidden chain-of-thought telemetry.
- Response motion waits for real camera arrival.
- Artifact reveal is held until the camera-arrival gate is proven; QA recorded `CAMERA_ARRIVED` before reveal.
- Human override cancels the conversational camera takeover.

## PHYSICAL QA EVIDENCE

GitHub Actions run: `38332490362`
Job: `115085143917`
Browser: Playwright Chromium
Result: `2 passed (10.1s)`

Validated in the browser contract:

1. V1.4.25 visual composition + Signal V2 + Motion V2 + Conversation Motion V2 loads coherently.
2. Stage 3 camera reaches and settles at its existing deep target.
3. Human wheel override returns to MANUAL synchronously in `< 16.7 ms`.
4. Signal V2 reaches `COMMS` and triggers the destination reaction.
5. Artifact reveal timestamp is not earlier than the camera-arrival timestamp.
6. Reduced-motion deep transition settles by snap, with no fixed animation duration.

Workflow classification:

- `CEREBRO_VISUAL_MOTION_V2=GREEN_PREPROD`
- `VISUAL_BASE=v1.4.25`
- `ROLLBACK_BASE=v1.4.7`
- `PROD_AUTHORIZED=false`
- `ADDITIONAL_COST_EUR=0`

## PRESERVATION / ROLLBACK

- V1.4.25 visual base is preserved.
- V1.4.7 frozen renderer remains the lower rollback boundary.
- `index.html` was not replaced by the motion work.
- No App, CRM, Supabase schema, WordPress, SEO, Training, Trading or PROD routing mutation was introduced by this block.
- Changes are additive and isolated in LAB/PREPROD.

## PARCIAL / SEPARATE GATES

- **P8 · VOICE-001 visual binding:** the existing real App voice runtime is not yet proven to emit the visual-motion event contract; the old LAB visual adapter still targets Conversation Motion V1. Keep PARCIAL until the semantic event seam is bound and browser-tested without changing action authority.
- **P9 · target-PC physical performance:** CI proves browser behavior, not the user's physical target-PC FPS / rendering budget. Keep PARCIAL until target-hardware evidence exists.
- **Authenticated visual-state owner E2E:** remains PARCIAL because `CEREBRO_E2E_USER_JWT` is currently absent from repository Actions secrets. Public health and unauthenticated fail-closed gates are already green.

## NEXT BLOCK

Continue directly with P8 `VOICE-001 → VISUAL MOTION V2` binding. Reuse the existing App voice semantic seams; do not rebuild voice, do not add a paid voice service, do not introduce new backend authority, and keep PROD false until PREPROD evidence is green.
