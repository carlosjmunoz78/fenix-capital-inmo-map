# CEREBRO UMS · Character Physical Model Selection V0

Date: 2026-10-25
Engine: `UMS-001`
Environment: `PREPROD`
Change type: additive control-plane / candidate governance
Additional recurring cost introduced: `0 €`
Global UMS readiness after this block: `NOT_READY`

## HECHO
- Added a governed physical-model candidate registry for persistent characters / digital humans.
- Added a policy router that evaluates capability, EU territory compatibility, commercial-use compatibility and the CEREBRO zero-cost policy before a model can even reach benchmark status.
- Added a physical-promotion evidence gate requiring pinned source, artifact hashes, direct and dependency licenses, security, physical smoke, benchmark, rights/provenance, measured cost, rollback, rebuild and tribunal evidence.
- Registry presence does not authorize installation, network download, paid calls, model execution or PROD binding.
- Real-person identity continues to use the existing UMS rights gate and cannot bypass consent/provenance/revocation requirements.
- Added automated tests proving that HOLD/REJECT candidates cannot be promoted by fabricated green benchmark evidence.

## PRIORIDAD DE BENCHMARK
### Priority 1
- `CHAR-QWEN3-TTS-06B-BASE` — voice clone / TTS / voice design. Apache-2.0 upstream model/card. Real-person reference audio still requires Voice Consent Guardian and valid rights.
- `CHAR-MUSETALK` — lip-sync / talking-head / audio-driven facial video. MIT code and upstream commercial-use declaration for trained model; third-party dependency audit remains mandatory.
- `CHAR-IP-ADAPTER` — reference-image conditioning / character visual consistency. Use non-FaceID path by default. Any selected base diffusion model is separately licensed and must pass its own gate.
- `CHAR-COMFYUI` — reuse as orchestration seam only. Every model and custom node is independently governed.
- `CHAR-BLENDER` — zero-cost DCC/runtime candidate for 3D asset processing, rigging, animation, rendering and compositing. It is not itself an identity model.

### Priority 2
- `CHAR-GFPGAN` — face restoration/enhancement. Restoration is not allowed to fabricate identity benchmark success.
- `CHAR-SAM3D-BODY` — HOLD pending explicit SAM/checkpoint commercial-license review and physical quality benchmark.

## HOLD / REJECT
- `CHAR-LIVEPORTRAIT` — HOLD for zero-cost commercial use while the default stack depends on commercially restricted InsightFace `buffalo_l` model assets.
- `CHAR-INSTANTID` — HOLD because upstream checkpoints / InsightFace dependency are not suitable for silent commercial promotion.
- `CHAR-PULID` — HOLD because the upstream identity stack includes restricted/non-commercial dependencies.
- `CHAR-INSIGHTFACE-PRETRAINED` / InSwapper — REJECT under current zero-cost commercial policy: code license and pretrained-model commercial rights are different matters.
- `CHAR-HUNYUAN3D-21` — REJECT for Fénix default EU routing because the upstream license excludes European Union territory.

## EXISTENTE Y REUTILIZADO
- Character Clone Engine V0 merged in PR #934.
- Existing `rights-gate.mjs` and `clone-job.schema.json` remain canonical and are not replaced.
- Existing ComfyUI seam is reused where appropriate; no duplicate visual orchestration runtime is created.
- Existing creative/multimedia pipeline remains unchanged.

## PARCIAL
- Model selection and promotion governance are implemented and tested.
- No new GPU model is claimed physically installed, executable or PROD-certified by this block.
- No real person has been cloned by this block.
- Quality rankings remain provisional until the physical OLD-vs-NEW benchmark suite is executed on representative fixtures.

## POR AUDITAR / SIGUIENTE
1. Pin exact Qwen3-TTS 0.6B model revision, dependencies and hashes; execute zero-cost/local PREPROD voice benchmark.
2. Pin MuseTalk code/model revisions and every third-party dependency; execute identity-drift + lip-sync benchmark.
3. Benchmark IP-Adapter non-FaceID character consistency against the existing synthetic character fixture with a separately approved base model.
4. Solve/install Blender only through a separately governed runtime path; execute deterministic 3D smoke and rollback/rebuild evidence.
5. Build cross-modal character benchmark: still image -> talking video -> voice -> multi-angle/long-sequence -> optional 3D.
6. Keep all HOLD/REJECT candidates unavailable unless fresh evidence changes their license/territory status and the full revalidation pipeline passes.

## ROLLBACK / REBUILD
- This block is additive under `cerebro/media-studio/v2/**`.
- Rollback boundary: PR #935.
- Rebuild source of truth: candidate registry + model router + automated tests + this record + physical benchmark evidence generated later.
