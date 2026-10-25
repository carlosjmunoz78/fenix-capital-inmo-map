# CEREBRO Universal Media Studio V2 · Runbook

Date: 2026-10-25
Engine: `UMS-001`
Default environment: `PREPROD`
Global readiness: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`

## Safety invariants
- Do not mutate App, CRM, Supabase, SEO, WordPress, Training or unrelated CEREBRO engines from UMS validation workflows.
- Do not install or download a runtime merely to make a discovery audit green.
- Runtime discovery is not operational binding.
- A PREPROD smoke is not a physical benchmark pass.
- No knowledge item auto-promotes from Internet/source discovery.
- No paid fallback or spend is authorized by these workflows.
- Real-person voice/face/body cloning requires valid authorization, provenance, revocation and scope.
- Trading is isolated and out of scope.

## Persistent character / digital-double V0
Canonical contract: `cerebro/media-studio/v2/contracts/persistent-character.schema.json`
Orchestrator: `cerebro/media-studio/v2/runtime/character-clone-orchestrator.mjs`
Physical acceptance contract: `cerebro/media-studio/v2/benchmarks/character-clone-required-benchmarks.json`

Supported logical character components:
- face
- body
- voice
- motion
- performance
- expressions
- wardrobe
- behavior

Identity classes:
- `SYNTHETIC_ORIGINAL`: original synthetic character owned/created inside the governed pipeline.
- `FICTIONAL_LICENSED`: fictional/licensed identity with rights evidence.
- `REAL_AUTHORIZED`: real person only with valid authorization, provenance and revocation evidence.

Required flow:
`request -> provenance check -> rights gate -> character plan -> component routing -> PREPROD adapter evidence -> physical benchmark -> tribunals/guardians -> release decision`

Fail-closed rules:
- Missing provenance: reject planning.
- Real person with incomplete rights/consent/revocation: `HUMAN_REQUIRED: LEGAL_REQUIRED`.
- Passing rights does not authorize physical generation by itself.
- Physical adapter binding stays blocked until license/security/cost evidence, applicable quality metrics, provenance and rollback/rebuild are GREEN.
- Internet images/videos are reference material only unless the rights record permits the requested use.
- Voice-only jobs must include the Voice Consent Guardian.
- Digital-double/face/body jobs must include Identity & Likeness Consent plus Rights & Provenance guardians.
- Release remains subject to Release Guardian; there is no autonomous PROD publication from this V0.

Minimum continuity checks before a persistent character can be considered physically stable:
- identity similarity
- temporal identity drift
- body proportion drift
- voice similarity when voice is present
- lip-sync offset when talking video is present
- expression continuity
- wardrobe continuity
- mannerism continuity
- multi-angle identity consistency
- long-sequence identity consistency where applicable
- rights/provenance recheck
- license/security and measured cost
- rollback/rebuild proof
- tribunal pass

Important status distinction:
- The control plane may be merged to `main` after CI GREEN.
- That does **not** mean a face/body/voice/video/3D model is physically installed or PROD-certified.
- Each physical adapter/model is promoted independently through PREPROD evidence and OLD vs NEW comparison.

## Continuous learning
Workflow: `.github/workflows/cerebro-ums-governed-learning-bridge-v1.yml`

Expected chain:
`CEREBRO Universal Skill Continuous Intake -> Dynamic Skill Adoption -> UMS Governed Learning Bridge -> BENCHMARK_REQUIRED candidate -> OLD vs NEW -> tribunal -> Knowledge Store review`

Expected report invariants:
- `environment = PREPROD`
- `knowledge_auto_promotion = false`
- `readiness_mutation = false`
- `additional_cost_eur = 0`
- media relevance requires strong identifier/domain evidence or multi-group operational description
- duplicate media candidates collapse to the newest governed evidence

If style-only or weakly related skills enter the media candidate set, treat it as a filtering regression and block promotion.

The specialist daily-learning scout must deduplicate the shared 12-section curriculum centrally while retaining the exact consumer role and department IDs. A day with `deduplicated_job_count >= role_request_count` is a regression and blocks the UMS gate.

## Runner-native runtime audit
Workflow: `.github/workflows/cerebro-ums-physical-runtime-audit-v1.yml`

Purpose: discover only binaries already present in the GitHub-hosted runner.

Required invariants:
- no `setup-*` runtime preparation before the probe
- `runtime_preparation_performed = false`
- `runtime_installation_performed = false`
- `runtime_network_download_performed = false`
- discovered tools remain `PREPROD_DISCOVERED`
- `prod_bound = 0`
- `operational_claims = 0`

Current observed runner-native adapters on 2026-10-25:
- Chrome 155.0.8059.39
- Python 3.12.3
- Node 22.23.3

Observed but not separately bound: Chromium 155.0.8059.0.

Not present in the probed runner:
- FFmpeg
- FFprobe
- Blender
- SoX
- ImageMagick

Do not install these as part of the discovery workflow. Any future installation/binding requires a separate candidate review, license/security/cost evidence, deterministic smoke, rollback and PREPROD comparison.

## Zero-cost media smoke
Workflow: `.github/workflows/cerebro-ums-zero-cost-media-smoke-v1.yml`

Purpose: prove a physical local render path with runner-native Chrome + Node + Python without external network use by the test.

Expected pipeline:
`Node fixture -> local HTML -> Chrome headless render -> PNG -> Python structural inspection/hash -> Node evidence validation`

Green means only:
- `PREPROD_SMOKE_GREEN`
- Chrome/Node/Python smoke path physically executed
- PNG evidence produced and hashed
- no benchmark credit
- no PROD binding

Green does NOT mean:
- BM-01 passed
- BM-03 passed
- UMS is production-ready
- Hollywood/blockbuster quality is proven

## Physical benchmark harness
File: `cerebro/media-studio/v2/benchmarks/physical-benchmark-harness.mjs`

Currently materialized harnesses:
- `BM-01` persistent synthetic character
- `BM-03` authorized voice cloning / conversion / TTS

A benchmark may become `PASS_WITH_EVIDENCE` only with real physical execution, immutable artifact hashes, evidence refs and green quality/rights/provenance metrics.

## Promotion checklist
Before merging a UMS PREPROD block to `main`:
1. UMS V2 Gate = SUCCESS.
2. Governed Main Integration = SUCCESS.
3. RSI Promotion Readiness Shadow = SUCCESS.
4. Any block-specific workflow = SUCCESS.
5. No false readiness mutation.
6. OLD vs NEW behavior remains additive/isolation-preserving.
7. Rollback anchor/base SHA is recorded.
8. Evidence snapshot and changelog are updated.

## Rollback
Current foundation rollback anchor: `cerebro/ums-v2-safety-rollback-20261025`.

For an additive UMS regression:
1. Stop promotion.
2. Identify the specific UMS commit/PR.
3. Revert only the additive UMS change where possible.
4. Re-run UMS Gate + Governed Main + RSI shadow.
5. Do not roll back unrelated App/CRM/SEO/Supabase/WordPress state.

## Rebuild
UMS control plane must be rebuildable from versioned repository contracts, registries, role factories, knowledge packs, workflows and evidence. Generated media artifacts are evidence/assets, not the canonical source of the control-plane definition.
