# CEREBRO Voice & Human Experience Lab V0

Date: 2026-10-10
Status: LAB / PREPROD DESIGN. No PROD authority.
Cost target: 0 EUR additional by default.

## Purpose

Make direct interaction with CEREBRO excellent in both directions: human -> CEREBRO and CEREBRO -> human. Correctness is necessary but not sufficient; voice quality, clarity, latency, interaction design, motion, feedback and perceived quality are first-class product requirements.

## Existing canonical owners

- `VOICE-001` remains the canonical owner of voice/call capability.
- `VOICEUI-001` remains the canonical owner of the voice interface.
- `COM-001` remains the multichannel communication owner.
- `CX-001` remains customer-experience oriented and must not be silently repurposed as CEREBRO-human UX ownership.

FACT-001 requests in this branch ask only for structural scaffolds of existing canonical engines. They do not enable PROD, grant permissions or authorize spend.

## VOICE-001 quality loop

VOICE-001 must maintain a provider-agnostic voice candidate registry and continuously compare candidates using OLD vs NEW.

Minimum evaluation dimensions:

1. real Spain accent verification, independent from provider labels;
2. naturalness;
3. warmth / closeness;
4. authority without broadcaster stiffness;
5. pronunciation of CEREBRO, Fenix, Cordoba, Supabase, Notion, CRM, SEO, amounts, dates and percentages;
6. expressiveness and emotional range;
7. first-audio latency and stability;
8. cost per synthesized minute / character;
9. availability and provider risk;
10. owner preference and observed interaction outcomes.

Provider metadata such as `Spanish` or `es-ES` is not trusted as sufficient proof. Candidates remain unverified until listening tests and/or stronger evidence confirm Spain Spanish. Latin American candidates must be rejectable even if mislabeled by the provider.

## Physical lab implemented outside Git

A parallel Voice Lab surface has been created under the existing Fenix web infrastructure. It presents candidates one at a time, plays provider preview audio, records `SPAIN`, `LATAM`, `UNSURE` and preference feedback, and preserves the current working voice conversation separately.

Supabase LAB objects created for this experiment:

- `cerebro_voice_candidates_v0`
- `cerebro_voice_feedback_v0`
- Edge Function `cerebro-voice-lab-feedback-v0`

The first bank contains 31 HeyGen candidates marked `UNVERIFIED_PROVIDER_CLAIM`. Provider locale labels are deliberately not treated as truth.

## Candidate future engine: Human <-> CEREBRO Experience

Working candidate name: `HCI-001 · Human-CEREBRO Interaction Engine`.

This identity is NOT canonical and is NOT registered by this branch. FACT-001 V0 cannot create new canonical engine identities.

Proposed ownership if approved later:

- learn preferred response length, tone, modality and timing;
- measure repetitions, corrections, interruptions, abandonment and effort;
- adapt text, voice and interaction patterns without hiding material facts;
- share one policy across Console, Telegram, email and future surfaces;
- keep safety/policy authority outside the UX engine.

## Candidate future engine: Presence & Motion

Working candidate name: `MOTION-001 · CEREBRO Presence & Motion Engine`.

This identity is NOT canonical and is NOT registered by this branch.

Proposed ownership if approved later:

- idle / listening / thinking / speaking / success / warning / HUMAN_REQUIRED states;
- audio-reactive neural-network motion;
- transitions and interruption feedback;
- reduced-motion accessibility;
- device/performance adaptation;
- visual tokens from the CEREBRO brand system.

## UX target

The visible CEREBRO presence must feel intentional and premium rather than like a generic microphone widget. Motion must communicate state, not decorate randomly. Voice playback and interruption must stay synchronized with visual state.

## Promotion gates

No candidate voice or UX implementation may replace the current path without:

- accent verification;
- stable playback;
- measured latency;
- pronunciation tests;
- owner acceptance;
- cost evidence;
- rollback path;
- OLD vs NEW comparison;
- PREPROD evidence;
- no regression in authentication, HUMAN_REQUIRED or Trading isolation.

## Current status

- Voice conversation path: PARCIAL / physically usable, current TTS quality rejected by owner.
- Voice Lab candidate registry and feedback endpoint: LAB implemented; full physical E2E awaits owner use.
- `VOICE-001` scaffold request: branch only.
- `VOICEUI-001` scaffold request: branch only.
- `HCI-001`: DEFINED CANDIDATE, not canonical.
- `MOTION-001`: DEFINED CANDIDATE, not canonical.
- Additional cost authorized: 0 EUR.
- PROD authority: false.
- Trading access: false.
