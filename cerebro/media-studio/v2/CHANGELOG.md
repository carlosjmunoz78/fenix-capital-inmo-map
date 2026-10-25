# CEREBRO Universal Media Studio V2 · Changelog

## 2026-10-25 · Specialist knowledge + governed learning + physical runtime evidence

Environment: `PREPROD`
Base before block: `96c22743ac512cc3cc9e9331720cd312d6eae450`
Pull request: `#932`
Readiness before: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Readiness after: `UNIVERSAL_MEDIA_STUDIO_READY = NOT_READY`
Physical benchmarks before/after: `0/12 PASS_WITH_EVIDENCE`
Additional recurring cost introduced: `0 €`

### HECHO
- Added inherited professional knowledge-pack structure for all `384/384` specialist roles.
- Each specialist pack includes professional standards, canonical workflows, tools/models, research, case studies, benchmarks, rights/licenses, failure modes, quality metrics, cost/latency/compute, interoperability and future-watch sections.
- Specialist packs explicitly remain `STRUCTURED_RESEARCH_REQUIRED`; no pack falsely claims deep verified operational knowledge.
- Added zero-cost-first physical adapter candidate registry for FFmpeg, FFprobe, Chrome/Chromium, Blender, SoX, ImageMagick, Python and Node.js.
- Added fail-closed physical adapter evidence normalizer and tests. Discovery can only produce `PREPROD_DISCOVERED`; it cannot produce a PROD binding or operational claim.
- Added runner-native physical runtime audit with no runtime preparation, installation or network download before discovery.
- Runner-native audit evidence on 2026-10-25 found Chrome `155.0.8059.39`, Chromium `155.0.8059.0`, Python `3.12.3` and Node `22.23.3`.
- Runner-native audit did not find FFmpeg, FFprobe, Blender, SoX or ImageMagick.
- Added a zero-install, zero-external-network physical media smoke using Node -> deterministic local HTML -> Chrome headless -> PNG -> Python inspection -> Node evidence validation.
- Physical smoke produced a real 640x360 PNG, 27,817 bytes, SHA-256 `f340480860d1b6ae803092bf45e759051072fa2c22eab832e3a4544863057d33`.
- Smoke status is only `PREPROD_SMOKE_GREEN`; `benchmark_credit=false`, `prod_operational_claim=false`, `readiness_mutation=false`.
- Hardened UMS governed learning relevance. Real governed execution reduced a noisy 41-candidate media set to one deduplicated strong media candidate: `image-analysis`.
- Current governed-learning evidence: 136 safe capabilities inspected, 2 raw strong-media matches, 1 deduplicated candidate, 134 weak-media signals rejected, 0 unsafe/unproven candidates admitted, 0 auto-promotions.
- Added durable evidence snapshot at `cerebro/media-studio/v2/evidence/preprod-runtime-learning-smoke-2026-10-25.json`.
- Added operational runbook at `cerebro/media-studio/v2/RUNBOOK.md`.

### Correcciones realizadas durante PREPROD
- Fixed invalid GitHub Actions use of `${{ runner.temp }}` at job-level `env` in the UMS learning and runtime-audit workflows; replaced with fixed `/tmp` evidence paths inside the isolated runner.
- Removed `actions/setup-node` from the physical runtime discovery workflow after identifying that runtime setup would contaminate the claim of a runner-native audit.
- Tightened media relevance to reject style-only web/design skills and require either a strong media identifier/domain or a multi-group operational media description.
- Added deterministic deduplication so repeated governed versions of the same technical capability/domain retain only the newest governed evidence.

### EXISTENTE Y PRESERVADO
- App Fénix behavior: unchanged.
- CRM behavior/data contracts: unchanged.
- Supabase production behavior: unchanged.
- SEO and WordPress production behavior: unchanged.
- Training and unrelated CEREBRO engines: unchanged.
- Existing CEREBRO Universal Skill Continuous Intake scheduler: reused; no competing scheduler added.
- Trading isolation: unchanged.

### Evidencia física / CI
- Governed learning run `40204350170`, artifact `12603725051`, digest `sha256:faa2093bbe3bea25096e6cee2d69bca4b6e8df05d820e1301921d0b0238b6ed2`.
- Runner-native runtime audit run `40204350222`, artifact `12603166808`, digest `sha256:41fcfa72b3737049128821cc9afd099713532fd1da0539ff12865d7aca61d4eb`.
- Zero-cost media smoke run `40204350257`, artifact `12602704703`, digest `sha256:236c601ec11bc606b1fe7956dec03a9566711b4259f7ac5469126880a8706b99`.
- The evidence above is PREPROD evidence and does not count as any of the 12 mandatory readiness benchmark passes.

### PARCIAL
- Professional knowledge coverage is structurally complete for 384 specialists, but deep source-backed content remains to be ingested, measured and promoted through the governed learning pipeline.
- Chrome/Node/Python have a physical PREPROD smoke path but are not PROD-bound media adapters.
- `image-analysis` is only `BENCHMARK_REQUIRED`; it is not accepted UMS knowledge or a PROD capability binding.

### POR AUDITAR / PENDIENTE
- Zero-cost/self-hosted strategy for FFmpeg/FFprobe/Blender/SoX/ImageMagick or equivalent existing CEREBRO runtimes.
- Durable heavy media storage, asset/effect/voice persistence and observability implementation.
- Physical benchmark execution for BM-01 through BM-12.
- BM-03 remains impossible to execute honestly without authorized real-person voice material and valid consent/provenance/revocation/scope evidence.

### Rollback / rebuild
- Foundation rollback anchor remains `cerebro/ums-v2-safety-rollback-20261025`.
- This block is additive and isolated under `cerebro/media-studio/v2/**` plus dedicated UMS workflows.
- Rebuild sources are the versioned role factories, contracts, registries, knowledge packs, workflows, runbook and evidence snapshots; transient media artifacts are evidence/assets, not control-plane source of truth.
