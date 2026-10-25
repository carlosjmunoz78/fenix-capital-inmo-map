# CEREBRO UMS · Runtime Audit · 2026-10-25

Status: **PARCIAL / PREPROD-LAB**  
Scope: runtime/GPU/workers/queue/storage baseline before Qwen3-TTS → MuseTalk → IP-Adapter → Blender → BM-01.  
PROD: **NOT TOUCHED**.

## Live anchor

- Repository: `carlosjmunoz78/fenix-capital-inmo-map`
- Baseline branch: `main`
- Baseline commit: `42ba7038...`
- Baseline tree: `54c18b858e87e87af0aea4cb2d62e3a9f30038fd`
- Handoff archive SHA manifest: verified before continuation.

## Phase A findings

| Capability | State | Evidence / interpretation |
|---|---|---|
| CPU worker | EXISTENTE | GitHub-hosted Linux X64 worker physically probed in LAB/PREPROD. |
| Worker lifecycle | EXISTENTE | Ephemeral GitHub Actions execution; package installation is per-job. |
| Creative job dispatch | EXISTENTE | `repository_dispatch` + creative job runner/state machine. |
| Queue | EXISTENTE / LOGICAL | Dispatcher/poller/state/report contract exists; no separate durable broker is claimed here. |
| Artifact storage | EXISTENTE / LIMITED | Deterministic output paths, evidence reports and GitHub Actions artifact upload are proven. A separate persistent private media object store is not claimed. |
| FFmpeg | EXISTENTE | Physically detected in runtime audit and used by current media path. |
| Piper | EXISTENTE | Installed by current creative runner as zero-cost TTS fallback. |
| GPU runtime | POR AUDITAR | Audited worker had no `nvidia-smi` and no detected hardware acceleration. No configured/proven live GPU runner was found in the audited repository/runtime evidence. |
| Docker on audited runner | NOT AVAILABLE IN PROBE | This is a property of the audited job only; it is not generalized to every possible runtime. |
| External egress | EXISTENTE | Allowed in the runtime probe; required for package/model retrieval. |
| Added service cost | 0 EUR target | No new subscription/provider introduced by this block. |

## Current execution path

`repository_dispatch / workflow_dispatch → GitHub-hosted ephemeral CPU worker → creative output pipeline / job runner → deterministic artifacts + report/evidence → GitHub artifact upload`

This path is **PREPROD/LAB only** for the current UMS integration work.

## Gap classification

The missing proven GPU runtime is a **technical capability gap**, not `HUMAN_REQUIRED`.

Do not provision or pay for a GPU service merely to make the gate green. First test whether the smallest Qwen3-TTS model can execute on the already-proven CPU worker. MuseTalk and IP-Adapter remain blocked from physical inference until a suitable GPU path is proven or an equivalent zero-cost execution route passes the same contract.

## Qwen3-TTS decision for next test

Official upstream evidence supports:

- package: `qwen-tts`;
- license: Apache-2.0;
- released small model: `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`;
- Spanish language support;
- CLI accepts `cpu` as a device;
- CUDA / FlashAttention are preferred acceleration paths, not a license or architectural requirement for the probe.

Therefore the next safe action is an isolated CPU inference smoke test with:

- CPU-only PyTorch;
- 0.6B CustomVoice model;
- short Spanish phrase;
- strict workflow timeout;
- no paid API;
- no production write;
- WAV + JSON evidence uploaded even on controlled failure;
- Piper remains rollback/fallback.

## Promotion rule

A successful CPU probe proves only that Qwen3-TTS can execute on this fallback runtime. It does **not** prove that CPU latency is acceptable for production, nor does it prove GPU-dependent MuseTalk/IP-Adapter execution.

Next block after the probe:

1. classify Qwen result as PASS / RESOURCE_LIMIT / DEPENDENCY_FAILURE / MODEL_RUNTIME_FAILURE;
2. if PASS, wrap Qwen as an optional UMS provider behind the existing media contract;
3. if CPU is too slow or fails by resource limit, evaluate only zero-cost/owned GPU candidates with hard cost guard;
4. preserve Piper fallback;
5. continue to MuseTalk only after runtime capability is evidenced.
