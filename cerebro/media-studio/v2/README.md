# CEREBRO Universal Media Studio V2 · PROD Foundation

Status: `FOUNDATION_PROD / NOT_UNIVERSAL_MEDIA_STUDIO_READY`
Date: 2026-10-25
Engine: `UMS-001`
Rollback anchor: `cerebro/ums-v2-safety-rollback-20261025`

## Objective
Build the canonical Universal Media Studio as an additive CEREBRO control plane. Existing App, CRM, Supabase, SEO, WordPress, Training and unrelated CEREBRO engines are preserved. Existing capabilities are wrapped before any new runtime is created.

## HECHO · control plane
- 529 base logical roles: 1 Studio Brain, 48 department heads, 384 specialists, 32 supervisors, 12 tribunals / 48 judges and 16 guardians.
- Unlimited ephemeral pod contract.
- Media Master Graph, Pod Factory, Capability/Surface registries, Asset Registry, Voice Registry and Effects Factory.
- Tool/Model Router, identity/rights gates, Knowledge Store and governed Learning Inbox.
- 12-benchmark fail-closed readiness gate.
- BM-01 and BM-03 physical benchmark harness contracts.

## HECHO · knowledge in PROD
All `384/384` specialists now have at least one verified department-level professional source mapping. The previous gap of 24 departments / 192 specialists with zero mapped sources is closed.

The previously uncovered `192/192` specialists now receive an active PROD enrichment pack containing:
- at least 2 verified professional sources;
- at least 6 concrete professional knowledge points;
- reusable CEREBRO skills where available;
- LAB/benchmark/HOLD candidates without false promotion;
- known capability gaps;
- daily learning questions;
- NOW / EMERGING / COMING / FRONTIER watch.

A deep knowledge matrix covers `192 specialists × 12 sections = 2,304 cells`:
1. professional standards;
2. canonical workflows;
3. tools and models;
4. research and papers;
5. case studies;
6. benchmarks;
7. rights and licenses;
8. failure modes;
9. quality metrics;
10. cost / latency / compute;
11. interoperability;
12. future watch.

Every cell has evidence and/or active research queries. Seeded knowledge is not declared mastery. Tool execution, write authority, spending and automatic knowledge promotion remain disabled by the knowledge layer.

## HECHO · professional source expansion
The previously uncovered departments now inherit verified/primary material from sources such as YouTube/Google, Meta, Crossref, DataCite, Academy/Nicholl, Ink, Twine, Adobe, Epic/MetaHuman, W3C, Qwen, Amphion, ARRI, COLMAP, Apple, MPEG, Procreate, Avid, Blackmagic, OpenTimelineIO, Blender, Krita, Vicon, SAG-AFTRA, AES, FMOD, MIDI Association, W3C Music Notation, Dolby, Ableton, OpenUtau and Wwise.

Concrete source records and knowledge points live in:
- `knowledge/verified-source-expansion-prod-2026-10-25.json`
- `knowledge/prod-specialist-enrichment-v1.mjs`
- `knowledge/prod-specialist-depth-matrix-v1.mjs`

## HECHO · existing CEREBRO skills reused
UMS preserves and reuses existing CEREBRO capabilities instead of duplicating them. Current reuse/benchmark knowledge includes:
- `CREATIVE-PROGRAMMATIC-RENDER-V1`;
- FFmpeg;
- ComfyUI seam;
- Z-Image Turbo candidate;
- Qwen3-TTS seam;
- HyperFrames reference;
- Procedural Film candidate;
- OpenMontage LAB;
- LTX Video LAB;
- WATCH video-understanding seam;
- Remotion HOLD;
- Fish Audio / ElevenLabs benchmark HOLD;
- governed `image-analysis` candidate.

Canonical map: `knowledge/existing-skill-reuse-map-prod-2026-10-25.json`.

## HECHO · frontier knowledge watch
Current knowledge-only candidates include Blender 5.2 LTS / 5.3 future watch, SAM 3D Objects, SAM 3D Body, gsplat, Nerfstudio, TRELLIS, Hunyuan3D, Wan, LTX-2, HunyuanVideo, MuseTalk, Qwen3-TTS, IndexTTS, GPT-SoVITS, ACE-Step, Stable Audio Tools and AudioCraft/MusicGen/AudioGen.

These are knowledge/benchmark candidates, not silently installed production dependencies. Each requires OLD vs NEW, quality/cost/latency/compute, rights/license/security and tribunal review before operational binding.

Canonical watch: `knowledge/frontier-media-tech-watch-prod-2026-10-25.json`.

## HECHO · daily continuous improvement design
Every one of the 192 enriched specialists emits one learning request per day. A central layer deduplicates those requests by department/knowledge section before research, avoiding hundreds of redundant searches. A 12-day rotation exposes all 12 deep knowledge sections for every specialist.

A professional-source watcher monitors verified and frontier source URLs for observable change. A changed source becomes `REVALIDATION_REQUIRED`; it never overwrites accepted knowledge automatically.

Daily workflow installed in PROD:
`.github/workflows/cerebro-ums-daily-knowledge-improvement-v1.yml`

Schedule: daily at `04:17 UTC`. The code and contract tests exist in PROD; the first scheduled execution is only considered physically proven after its first real scheduled run produces evidence.

## HECHO · knowledge regression gate
A dedicated PROD knowledge workflow verifies:
- exactly 192 enriched specialists / 24 formerly uncovered departments;
- all 192 active;
- all 192 with >=2 verified sources and >=6 knowledge points;
- exactly 2,304 deep knowledge cells;
- all 384 specialists / 48 departments with zero verified-source gaps;
- no false mastery, spend or execution authority.

Workflow: `.github/workflows/cerebro-ums-prod-knowledge-load-v1.yml`.

The full UMS foundation gate has passed with the new knowledge tests included.

## HECHO · existing multimedia systems discovered and preserved
CEREBRO already has substantial multimedia infrastructure, including:
- `cerebro/runtime/creative-output-pipeline-v1.mjs`
- `cerebro/runtime/creative-job-runner-v1.mjs`
- `cerebro/digital-build/multimedia-factory-runtime-v0.mjs`
- Chromium/HTML render paths;
- FFmpeg composition paths;
- image/carousel/reel/video artifact generation and hashing.

UMS wraps these capabilities rather than creating a second media factory.

## HECHO · BM-01 Stage 0
Synthetic original identity: `UMS-SYNTH-CHAR-001` / `Nova-01`.

Three 512×512 physical reference views and a character bible were generated and validated. Stage status: `BM01_STAGE0_REFERENCE_GREEN`.

Global benchmark status remains `BM-01 = NOT_RUN` because a real pass still requires:
- `VIDEO_IDENTITY_PROOF`;
- `THREE_D_REFERENCE_PROOF`;
- `CROSS_MODAL_CONSISTENCY_METRICS`.

## Clone / identity policy
The studio targets persistent synthetic characters, authorized digital doubles, authorized face/body/voice reconstruction, authorized voice conversion/TTS/singing, motion transfer and multilingual ADR. Real-person execution remains fail-closed without valid consent, scope, provenance and revocation evidence.

## Readiness
`UNIVERSAL_MEDIA_STUDIO_READY = false` until all 12 mandatory benchmarks are `PASS_WITH_EVIDENCE`.

Current state: **0/12 `PASS_WITH_EVIDENCE`**.

Knowledge growth, source discovery, a smoke test or a Stage-0 artifact cannot mutate this readiness flag.

## Current status
- **HECHO:** 529-role control plane; source coverage closed to 384/384 specialists; 192/192 formerly uncovered specialists enriched; 2,304 deep knowledge cells; existing CEREBRO media skills mapped; current frontier technologies tracked; daily learning/request generation installed; source-change watcher installed; PROD knowledge regression guard installed; BM-01 Stage 0 physical references.
- **EXISTENTE:** CEREBRO creative/multimedia render stack with Chromium/FFmpeg paths; preserved and reused.
- **PARCIAL:** deep mastery is deliberately still open and improves continuously; first real scheduled daily-learning execution is not yet evidenced; UMS E2E execution through all media modalities remains incomplete.
- **POR AUDITAR / BENCHMARK:** 3D/DCC physical binding, 3D reconstruction, current generative video OLD-vs-NEW, voice-clone physical engine, singing synthesis, lip-sync/dubbing, mocap and neural reconstruction.
- **NOT READY:** 0/12 full physical readiness benchmarks.

## Next block
1. Consume the first daily knowledge cycle and promote only verified findings.
2. Benchmark the highest-value zero-cost candidates: Blender 5.2 LTS, Qwen3-TTS vs IndexTTS/GPT-SoVITS, LTX-2 vs Wan vs HunyuanVideo, SAM 3D / gsplat / Nerfstudio / Hunyuan3D / TRELLIS, and ACE-Step / Stable Audio / AudioCraft.
3. Physically execute UMS through the existing CEREBRO render path to advance BM-01 video identity evidence.
4. Solve the 3D reference and cross-modal identity consistency requirements for a real BM-01 pass.
5. Keep real-person voice/digital-double execution fail-closed until authorized source material exists.
