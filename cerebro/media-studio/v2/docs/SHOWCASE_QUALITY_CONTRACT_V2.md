# UMS · SHOWCASE QUALITY CONTRACT V2

**Date:** 2026-10-26  
**Scope:** LAB / PREPROD  
**Status:** DEFINED + IMPLEMENTED IN QUALITY GATE BRANCH  
**PROD:** untouched

## Why this contract exists

The previous showcase proved that CEREBRO UMS can physically render valid MP4 files, synthesize/assemble audio and produce deterministic procedural animation. It did **not** prove that the specialist studio roles were used to create a professional showcase.

A technical render can be valid while the creative result is poor. From this version onward those two decisions are separated:

- `TECHNICAL_VALID`: file, codec, duration, dimensions, audio and integrity are correct.
- `CREATIVE_ACCEPTED`: the piece also meets the requested artistic/professional standard.

`TECHNICAL_VALID` can never imply `CREATIVE_ACCEPTED`.

## Root cause corrected

The prior showcase path used a standalone Python/PIL/FFmpeg renderer. It created geometric scenes, text cards, basic waveform/cube/portal/destruction motifs and then encoded them correctly.

That path bypassed the UMS specialist production chain. Registered specialist roles existed, but **registration is not execution**.

The old manifest could also list capabilities such as characters, 3D, VFX, camera or editing without storing evidence that the corresponding specialist/tool/model actually produced an artifact. A title card saying `3D + VFX + CAMERA` is not evidence of 3D, VFX or camera work.

## Non-negotiable rules for a premium studio showcase

### 1. The real studio must execute the work

Premium showcase requests must pass through `UMS_POD_FACTORY` and leave pod/role execution evidence. Minimum executed disciplines:

- creative direction;
- story/script;
- visual generation;
- camera/animation;
- edit;
- sound;
- independent QA.

A direct procedural render script can remain as a LAB regression fixture or a deliberate motion-graphics tool, but cannot self-certify a premium studio presentation.

### 2. Capability claims require evidence

Every item in `demonstrated_capabilities` must point to concrete evidence containing:

- artifact path or SHA256;
- responsible role and/or tool/model;
- provenance sufficient to reproduce/audit the claim.

Text labels, subtitles, scene names or hard-coded manifest arrays do not count.

### 3. A studio showcase must demonstrate visual breadth physically

A general presentation of the Productora must demonstrate, not merely mention:

- character/human work;
- photoreal or live-looking scene work;
- 3D or VFX;
- design/illustration;
- editing/camera language;
- audio/voice/music.

Simple procedural geometry may be one ingredient, but it cannot dominate a general premium showcase. The current gate blocks a premium piece when procedural/simple geometric frames exceed 50% of the visual piece.

This does **not** ban procedural graphics. If the brief explicitly requests a motion-graphics-only ident, that profile is allowed and judged as motion graphics.

### 4. Creative tribunal is mandatory

Before creative acceptance, at least two independent reviewer roles must inspect distributed frame samples and score:

- overall quality;
- art direction;
- visual richness;
- shot variety;
- narrative clarity;
- originality;
- audio mix.

Minimum sample: 8 distributed frames.  
Minimum overall/art direction/visual richness/shot variety: 8/10.  
Other thresholds are encoded in `production-quality-gate.mjs`.

The reviewers must be independent of the generating role/pod for the artifact they judge.

### 5. Fail closed

If specialist execution, provenance, coverage or perceptual review is absent, the output is:

`CREATIVE_REJECTED / BLOCKED`

The system may preserve the MP4 as technical evidence, but it must not present it as an accepted professional showcase.

## Correct intended workflow

`BRIEF`  
→ Creative Director interprets objective  
→ Production Pod builds treatment/story/shot plan  
→ Character / Image / 3D / VFX / Camera / Audio specialists produce their real assets  
→ Editor assembles  
→ Audio Post mixes  
→ Technical QA  
→ Independent Creative Tribunal  
→ autocorrection/re-render if below threshold  
→ PREPROD acceptance  
→ only then deliver as professional showcase.

## What happens to the three previous MP4 files

They are **not deleted**. They remain valuable regression/evidence artifacts for the procedural renderer and encoding path.

Their classification changes conceptually from:

`PASS_WITH_PHYSICAL_DELIVERABLES = professional showcase`

to:

`TECHNICAL_VALID / PROCEDURAL_DEMO_ONLY / CREATIVE_REJECTED_AS_PREMIUM_SHOWCASE`

This preserves evidence while removing the false green.

## Cost policy

No new paid subscription is required by this correction. The gate must first use installed/available UMS roles, tools, local/open-source capabilities and already-authorized resources. Paid models remain optional candidates subject to Router/FinOps/MONEY_LIMIT policy.

## Promotion rule

Do not promote this correction to PROD merely because unit tests pass. First execute against PREPROD manifests and verify that:

1. the old procedural showcase is rejected as premium;
2. a genuine UMS pod production with evidence can pass;
3. rollback is available;
4. existing technical rendering workflows are not broken.
