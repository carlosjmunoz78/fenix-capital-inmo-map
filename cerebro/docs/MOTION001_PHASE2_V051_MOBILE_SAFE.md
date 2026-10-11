# MOTION-001 · PHASE 2 V0.5.1 · MOBILE SAFE SCENE GRAPH

Status: READY_FOR_PHYSICAL_RETEST / LAB_PREPROD_ONLY / PROD_FALSE
Date: 2026-10-11
Engine: MOTION-001
Additional cost target: 0 EUR

## Owner-reported issue

Phase 2 V0.5 was not visibly rendering on the owner's mobile device. PC status was not yet verified.

## V0.5.1 corrective strategy

Preserve the V0.5 architectural rule: **MOVE THE CAMERA, NEVER THE GRAPH**.

This hotfix does not return to the old moving-overlay model. It optimizes the same static-world scene graph for mobile:

- camera basis cached once per rendered frame instead of recalculated for every projected point/curve sample;
- adaptive edge density on mobile;
- target mobile frame budget ~30 fps;
- mobile DPR capped at 1.5;
- stronger neuron/filament contrast;
- slightly larger minimum mobile node size;
- Canvas-only runtime, no external dependency;
- `SEGUIR SEÑAL` remains clickable;
- world remains static and navigation remains camera-driven.

## Artifact evidence

Conversation artifact:
- `CEREBRO_PHASE2_V051_MOBILE_SAFE.html`
- SHA-256: `64b4c058d5db6f3baf34c68f3c8dc218e14777a28fe8cef76c75cc368dc0acbe`

Bundle:
- `CEREBRO_PHASE2_V051_MOBILE_SAFE.zip`
- SHA-256: `07711c4275f71fe7e7b7814575c5f3ca85379b960b95a10c649b6829836ca892`

JavaScript syntax gate: GREEN.

## Validation limits

Automated local browser rendering could not be physically validated in the sandbox browser because local file/localhost navigation is blocked by the execution environment policy. Therefore mobile visibility is **NOT claimed as proven** until owner retest.

## Preservation / authority

- V0.5 preserved as OLD/fallback evidence;
- no PROD authorization;
- no App/CRM/Supabase/WordPress/Trading writes;
- no automatic promotion;
- no secrets or customer PII;
- SHADOW only.

## Acceptance gate

Current state: `READY_FOR_OWNER_MOBILE_RETEST`.

Do not continue premium visual work until the mobile scene is physically visible and stable.