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
- UMS uses the existing CEREBRO continuous-learning chain; it does not create a competing scheduler.

## HECHO · knowledge structure and measured gaps
All `384/384` specialists have an inherited professional knowledge pack. A pack is structure, not proof of expert knowledge.

Current verified-source snapshot:
- 10 verified official sources.
- 48 departments / 384 specialists evaluated.
- 24 departments / 192 specialists have one or more verified department-level source mappings.
- 24 departments / 192 specialists currently have zero verified department-level source mappings.
- 48 governed research jobs generated; 24 are `CRITICAL` zero-source jobs.
- Section-level verification is not inferred from department-level source mapping.
- Deep verified operational knowledge claims: `0`.
- Knowledge auto-promotion: `false`.

Research path remains:
`discover -> source/license/security/rights verification -> role/section mapping -> benchmark when operational -> OLD vs NEW -> tribunal -> Knowledge Store review -> accept/reject/supersede`

## HECHO · governed skill intake
The UMS learning bridge accepts only safe, zero-cost, LRN-green, tribunal-passed capabilities and never auto-promotes them. Media relevance is fail-closed and deduplicated. Current governed candidate remains `image-analysis` with status `BENCHMARK_REQUIRED`.

## HECHO · physical runner evidence
Strict runner-native audit, with no runtime preparation/install/download before probing, found:
- Chrome `155.0.8059.39`.
- Chromium `155.0.8059.0`.
- Python `3.12.3`.
- Node `22.23.3`.

That runner did not contain FFmpeg/FFprobe, Blender, SoX or ImageMagick. This only describes that runner; it is not a claim that CEREBRO has no other media runtime.

A physical zero-cost smoke passed:
`Node fixture -> local HTML -> Chrome -> PNG -> Python inspection/hash -> Node evidence validation`

Output: PNG `640x360`, 27,817 bytes, SHA-256 `f340480860d1b6ae803092bf45e759051072fa2c22eab832e3a4544863057d33`.

Smoke status: `PREPROD_SMOKE_GREEN`; benchmark credit, PROD binding and readiness mutation remain false.

## HECHO · existing multimedia systems discovered and preserved
A repository-wide inventory excluding UMS itself scanned 2,088 tracked text entries and found pre-existing CEREBRO media infrastructure:
- FFmpeg: 137 references across 41 paths.
- SoX: 19 references across 14 paths.
- ImageMagick: 21 references across 13 paths.
- Remotion: 13 references across 8 paths.
- HyperFrames: 19 references across 14 paths.
- Blender: no tracked reference found outside UMS.

Important existing systems include:
- `cerebro/runtime/creative-output-pipeline-v1.mjs`
- `cerebro/runtime/creative-job-runner-v1.mjs`
- `cerebro/digital-build/multimedia-factory-runtime-v0.mjs`
- `cerebro/contracts/creative-output-pipeline-v1.contract.json`
- `.github/workflows/cerebro-creative-output-pipeline-v1.yml`
- `.github/workflows/cerebro-creative-job-runner-v1.yml`

The existing creative pipeline independently declares `CREATIVE-PROGRAMMATIC-RENDER-V1` as `PROD_GREEN`, provider `CEREBRO_HTML_CHROMIUM_FFMPEG`, execution plane `GITHUB_ACTIONS_OIDC_WORKER`, heavy render outside Supabase and additional cost 0 €, under its own contracts/evidence.

UMS now has `existing-creative-pipeline-adapter.mjs` to **wrap** this capability in PREPROD. The wrapper creates no new media runtime and grants no UMS PROD/publish/spend authority. Physical execution through the UMS wrapper is still unproven.

## HECHO · BM-01 Stage 0
Synthetic original identity: `UMS-SYNTH-CHAR-001` / `Nova-01`.

Physically generated references:
- FRONT `512x512`, SHA-256 `e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec`.
- PROFILE_LEFT `512x512`, SHA-256 `fd18b29d82a0de3acbd178210938c5ab021aa25fde260285f5bddd741ba0b172`.
- THREE_QUARTER_RIGHT `512x512`, SHA-256 `97fb7b322508f995378d7d3dfd01baa7511d91d3b78b69a05518f40a4a63b651`.
- Character bible SHA-256 `02b2be4c5560c4bb9b3f8a1dd547530b6ac4ab53413dc3fca5305a254eaeaceb`.

Stage status: `BM01_STAGE0_REFERENCE_GREEN`.
Global benchmark status: `BM-01 = NOT_RUN`.
Benchmark credit: `false`.

Still required for a real BM-01 pass:
- `VIDEO_IDENTITY_PROOF`.
- `THREE_D_REFERENCE_PROOF`.
- `CROSS_MODAL_CONSISTENCY_METRICS`.

## Clone / identity policy
The studio targets persistent synthetic characters, authorized digital doubles, authorized face/body/voice reconstruction, authorized voice conversion/TTS/singing, motion transfer, multilingual ADR and related workflows. Real-person execution remains fail-closed without valid consent, scope, provenance and revocation evidence. BM-03 therefore remains `LEGAL_REQUIRED` until real authorized source material exists.

## Readiness
`UNIVERSAL_MEDIA_STUDIO_READY = false` until all 12 mandatory benchmarks are `PASS_WITH_EVIDENCE`.

Current state: **0/12 `PASS_WITH_EVIDENCE`**.

No PREPROD smoke, source mapping, runtime discovery, plan, or Stage-0 artifact can mutate this readiness flag.

## Canonical evidence and operations
- `cerebro/media-studio/v2/evidence/preprod-runtime-learning-smoke-2026-10-25.json`
- `cerebro/media-studio/v2/evidence/preprod-knowledge-runtime-bm01-stage0-2026-10-25.json`
- `cerebro/media-studio/v2/RUNBOOK.md`
- `cerebro/media-studio/v2/CHANGELOG.md`

## Current status
- **HECHO:** control plane; 529 roles; 384 knowledge-pack structures; measured knowledge gaps; governed learning; source freshness; asset/voice/effects contracts; rights gates; physical browser smoke; clean repository runtime inventory; existing creative pipeline reuse wrapper; BM-01 Stage 0 physical references.
- **EXISTENTE:** CEREBRO creative/multimedia pipeline with Chromium/FFmpeg physical paths and its own certification/evidence; preserved and wrapped rather than replaced.
- **PARCIAL:** deep verified knowledge for 384 specialists; UMS E2E execution through the existing creative pipeline; durable heavy-media persistence/observability.
- **DEFINIDO:** BM-01/BM-03 evidence contracts, media graph, pods, registries and promotion rules.
- **POR AUDITAR:** exact E2E UMS→existing creative job-runner seam; existing SoX/ImageMagick physical applicability; zero-cost 3D strategy because no prior Blender implementation was found outside UMS.
- **NOT READY:** 0/12 physical readiness benchmarks.

## Next block
1. Physically execute UMS through the existing `CREATIVE-PROGRAMMATIC-RENDER-V1` path to produce BM-01 video identity evidence without duplicating the runtime.
2. Add deterministic identity-consistency measurements between the three Stage-0 references and video frames.
3. Solve the genuine 3D gap with an inventory/benchmark-first zero-cost strategy; do not install Blender blindly.
4. Map verified sources to each role's required knowledge sections and feed the 48 research jobs through the existing learning loop.
5. Keep BM-03 blocked until authorized voice material and legal evidence are available.
