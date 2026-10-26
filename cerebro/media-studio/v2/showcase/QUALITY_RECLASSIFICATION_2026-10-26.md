# UMS SHOWCASE · QUALITY RECLASSIFICATION · 2026-10-26

## Status

- Existing Story MP4: `TECHNICAL_VALID / PROCEDURAL_DEMO_ONLY`
- Existing Reel MP4: `TECHNICAL_VALID / PROCEDURAL_DEMO_ONLY`
- Existing Hero MP4: `TECHNICAL_VALID / PROCEDURAL_DEMO_ONLY`
- Acceptance as premium Productora showcase: **REJECTED**
- PROD: **NOT TOUCHED**
- Files: **PRESERVED** for evidence/regression

## Confirmed cause

The physical showcase renderer is a standalone Python/PIL/FFmpeg path. It draws procedural geometry/text/waveforms/cubes/particles and produces valid encoded video/audio, but it does not execute the specialist UMS production chain.

Therefore the previous `PASS_WITH_PHYSICAL_DELIVERABLES` proves only physical/technical delivery. It does not prove professional creative quality or real execution of the registered specialist roles.

## False-green mechanism

The renderer's acceptance checks validate media properties such as duration, dimensions, codecs, output filename and minimum byte size. They do not perform perceptual/artistic review.

The generated manifest can list `demonstrated_capabilities` even when those capabilities were represented only by procedural motifs or title cards. This is now forbidden by `production-quality-gate.mjs`.

## Corrective action

The new gate requires, for a premium/general studio showcase:

1. `UMS_POD_FACTORY` execution evidence;
2. executed specialist disciplines, not merely registered profiles;
3. artifact provenance for every demonstrated capability;
4. physical coverage of human/character, photoreal/live-looking scene, 3D/VFX, design/illustration, camera/editing and audio/voice/music;
5. visual diversity limits so simple procedural geometry cannot dominate the piece;
6. at least two independent creative reviewers;
7. sampled-frame perceptual review and explicit score thresholds;
8. fail-closed creative rejection independent of codec/technical success.

## No destructive action

The three existing videos and their historical evidence are intentionally retained. They remain useful as a regression fixture for rendering/encoding and as evidence of the failure mode. This file supersedes only their **creative acceptance classification**, not the fact that the files were generated successfully.
