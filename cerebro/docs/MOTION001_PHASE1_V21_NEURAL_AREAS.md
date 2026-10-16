# MOTION-001 · PHASE 1 V2.1 · NEURAL AREAS

Status: PROCEDURAL_PROTOTYPE_USABLE / LAB_PREPROD_ONLY / PROD_FALSE
Date: 2026-10-11
Engine: MOTION-001
Additional cost target: 0 EUR

## Owner feedback incorporated

Owner accepted Phase 1 V2 direction and requested that when neurons activate, the connecting line/filament between them also illuminates so activity reads as a neural area rather than isolated glowing points.

## V2.1 visual rule

Connections use three simultaneous semantic layers:

1. LATENT
   - faint local topology always available;
   - blue/cyan only;
   - thin and low-opacity;
   - never a fully illuminated web.

2. ACTIVE
   - when both endpoint neurons become active, their connecting filament increases brightness and thickness;
   - broad restrained glow + thin luminous core;
   - neighboring active filaments form coherent neural areas;
   - short afterglow keeps the area readable after the immediate pulse.

3. PULSE
   - travelling signal moves along an active filament;
   - signal can continue to an adjacent connected edge, producing a multi-hop route rather than unrelated random sparks;
   - pulse leaves temporary edge heat/afterglow.

## State semantics

- IDLE: sparse local activity, mostly latent network.
- LISTENING: inbound local areas and connected receptive routes.
- PROCESSING: multiple local clusters and route chains activate concurrently.
- SPEAKING: output-oriented connected routes with rhythmic activity.
- HUMAN_REQUIRED: amber only on the focal neural area / route involved.
- DEGRADED: fewer active filaments, lower density and lower luminance.
- ERROR: red only on the localized fault area / route; entire brain must never turn red by default.

## Palette discipline

Normal operation remains:
- near-black / deep navy;
- electric blue;
- cyan;
- white.

No rainbow engine colouring.

Exception accents only:
- amber/gold: HUMAN_REQUIRED;
- red: ERROR / SECURITY_INCIDENT focal use only.

## Runtime prototype evidence

Conversation artifact:
- `CEREBRO_MOTION_PHASE1_V21_NEURAL_AREAS.html`
- SHA-256: `33fe4596bf463bd1b50766dfc65f99c9ba0247acc3ea607ab723ed65603dfceb`
- self-contained HTML5 Canvas;
- no external runtime dependency;
- existing V1 and V2 preserved as OLD/fallback;
- syntax gate: Node `--check` passed;
- browser visual acceptance remains OWNER_REQUIRED.

Bundle:
- `CEREBRO_MOTION_PHASE1_V21_NEURAL_AREAS.zip`
- SHA-256: `dcf21ac7e81abad223ad567fa6375deeb8884a8004a8099bbd868cf70e4e2286`

## Preservation / authority

- additive only;
- LAB/PREPROD only;
- no current UI replacement;
- no PROD authorization;
- no App/CRM/Supabase/WordPress/Trading write;
- no business authority;
- no secrets or customer PII needed;
- reduced-motion behavior remains mandatory;
- 0 EUR additional cost target.

## Acceptance gate

Current state: CODE/ARTIFACT_READY_FOR_OWNER_VISUAL_REVIEW.

Do not promote or declare final until owner physically reviews V2.1 and accepts line density, glow, afterglow, route behavior and visual cleanliness.