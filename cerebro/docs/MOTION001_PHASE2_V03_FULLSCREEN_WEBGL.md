# MOTION-001 · PHASE 2 V0.3 · FULLSCREEN WEBGL

Status: USABLE_SHADOW_PROTOTYPE / LAB_PREPROD_ONLY / PROD_FALSE
Date: 2026-10-11
Engine: MOTION-001
Additional cost target: 0 EUR

## Owner feedback incorporated

The owner requested two changes after Phase 2 V0.2:

1. minimize/hide text fields so the brain itself dominates the experience;
2. continue improving the visual quality toward a more premium result.

## Dependency audit before implementation

Repository `main` was audited before adding rendering dependencies:

- `three`: NOT FOUND;
- `@react-three/fiber`: NOT FOUND;
- existing WebGL runtime: NOT FOUND;
- current app stack: React + Vite + TypeScript + Supabase, with no 3D package registered.

Decision: do not add a new package yet. Build the viability candidate with native WebGL2 plus Canvas2D fallback, preserving the current stack and keeping cost at 0 EUR.

## V0.3 visual rule

CEREBRO becomes the interface. UI becomes secondary and contextual.

### Fullscreen / brain-first

- brain/neuronal volume occupies nearly the entire viewport;
- operator panel is hidden by default;
- `SOLO CEREBRO` clean mode hides brand, status, controls and breadcrumbs;
- contextual information appears only on explicit operator interaction;
- mobile keeps the operator surface compact and dismissible.

### Rendering

Primary renderer:
- native WebGL2;
- procedural particle cloud;
- exterior density field;
- internal family clusters;
- engine nodes;
- depth attenuation;
- shader-controlled point glow;
- additive light blending.

Fallback:
- Canvas2D procedural rendering;
- no paid or remote rendering dependency.

### Navigation hierarchy

`PRESENCE → INSIDE → FAMILY CLUSTER → ENGINE → MICRO-NET / JOB EVENT SHADOW`

The `SEGUIR SEÑAL` path remains a simulated visual choreography for UX validation only.

### Palette discipline

Normal:
- deep navy / black;
- electric blue;
- cyan;
- white.

Exceptions remain reserved:
- restrained amber for HUMAN_REQUIRED;
- restrained red for ERROR / SECURITY_INCIDENT.

No rainbow engine coloring.

## No-fake-cognition

All Phase 2 V0.3 activity is `SIMULATED_SHADOW`.

It MUST NOT be represented as hidden chain-of-thought, model reasoning, or live motor activity.

Future detailed activation may only occur when supported by real bounded telemetry/events and must exclude customer PII, secrets and raw sensitive payloads.

## Artifact evidence

Conversation artifact:
- `CEREBRO_PHASE2_V03_FULLSCREEN_WEBGL.html`
- SHA-256: `39428350a2de29abdb5f66beea895ce6900dc018d94f96f397a46309e194ff52`
- self-contained HTML;
- no external dependencies;
- JavaScript syntax gate: Node `--check` GREEN;
- WebGL2 primary with Canvas2D fallback.

Bundle:
- `CEREBRO_PHASE2_V03_FULLSCREEN_WEBGL.zip`
- SHA-256: `f5759f39f96dc3a1ecd5c750f65bcdfe5cd080b1b4963e89cc6654d8e096e8ed`

## Preservation / authority

Preserved as OLD/fallback:
- Phase 1 V1;
- Phase 1 V2;
- Phase 1 V2.1;
- Phase 1 V2.2;
- Phase 2 V0;
- Phase 2 V0.1;
- Phase 2 V0.2.

Authority:
- no PROD authorization;
- no UI replacement;
- no App/CRM/Supabase/WordPress/Trading writes;
- no automatic promotion;
- no business authority;
- additional cost target 0 EUR.

## Acceptance gate

Current state: CODE/ARTIFACT_READY_FOR_OWNER_VISUAL_REVIEW.

Pending physical owner review:
- fullscreen cleanliness;
- premium impression;
- depth/3D impression;
- camera/fly-through feel;
- WebGL performance on mobile;
- fallback quality;
- operator UI discoverability without visual clutter.

Do not promote to live/PROD from this prototype.