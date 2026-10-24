# MOTION-001 · PHASE 2 V0.3.1 · MINIMAL UI / CLICKABLE CONTROLS

Status: USABLE_SHADOW_PROTOTYPE / LAB_PREPROD_ONLY / PROD_FALSE
Date: 2026-10-11
Engine: MOTION-001
Additional cost target: 0 EUR

## Owner feedback incorporated

Owner clarified that minimizing the text/UI is correct, but essential actions must remain clickable. In V0.3, clean mode could hide the `SEGUIR SEÑAL` control, which violates the intended UX.

## Canonical UX rule

**Minimize secondary information; never hide or disable essential actions.**

Applied in V0.3.1:
- `SEGUIR SEÑAL` remains visible and clickable at all times;
- `SOLO CEREBRO` hides brand/status/context/operator chrome but preserves the essential bottom controls;
- clean-mode button changes to `MOSTRAR INTERFAZ` so the user can always exit clean mode;
- minimum mobile touch target: 44 px;
- essential controls use explicit pointer-events and elevated z-index;
- no change to visual WebGL2 renderer or Canvas fallback;
- previous V0.3 preserved as OLD.

## Artifact evidence

Conversation artifact:
- `CEREBRO_PHASE2_V031_MINIMAL_CLICKABLE.html`
- SHA-256: `2d5cb6741f714dccaa4ca7e24f07eb3e7d17b75cbdab7b560d369de877cdc078`
- bytes: 26473

Bundle:
- `CEREBRO_PHASE2_V031_MINIMAL_CLICKABLE.zip`
- SHA-256: `26f9397c28e63105dc5114ebc978b4a18908c5b597d3840d6424f1b077b4e3a3`

## Preservation / authority

- additive only;
- V0.3 and all previous versions preserved;
- LAB/PREPROD only;
- no live UI replacement;
- no PROD authorization;
- no App/CRM/Supabase/WordPress/Trading writes;
- no business authority;
- 0 EUR additional cost target.

## Acceptance gate

Current state: READY_FOR_OWNER_REVIEW.

Do not promote until owner confirms the minimized UI keeps `SEGUIR SEÑAL` and recovery controls practically usable on the target device.