# CEREBRO UMS · Character Physical Model Selection V0 Runbook

Engine: `UMS-001`
Default territory: `EU`
Default environment: `PREPROD`
Default commercial mode: `true`
Default zero-cost policy: `required`

## Objective
Select and promote physical models/tools for persistent characters without confusing technical quality with legal, commercial, territorial or operational readiness.

## Canonical flow
`requested capability -> identity/rights gate -> candidate registry -> territory gate -> commercial/license gate -> zero-cost gate -> dependency audit -> PREPROD physical smoke -> OLD vs NEW benchmark -> tribunal -> rollback/rebuild proof -> bounded promotion`

## Hard rules
1. Never infer commercial usability from an open-source code license when model weights, checkpoints or dependencies have separate terms.
2. Never use a candidate whose license excludes the target territory.
3. No Internet repo/model availability implies installation authority.
4. No candidate may silently download models, use paid inference, or create recurring cost.
5. Real-person face/body/voice/performance remains blocked unless rights/provenance/revocation/scope are valid.
6. A successful smoke does not equal a benchmark pass.
7. A benchmark pass does not equal PROD authorization until rollback/rebuild, security, observability, cost and tribunal gates are green.
8. HOLD and REJECT states cannot be overridden by benchmark output alone.

## Capability routing
### Voice cloning / TTS
Preferred first benchmark: `CHAR-QWEN3-TTS-06B-BASE`.
Required measurements: voice similarity, intelligibility, prosody, language fidelity, latency, VRAM/RAM, deterministic/repeatability evidence, provenance and rights.

### Lip-sync / talking head
Preferred first benchmark: `CHAR-MUSETALK`.
Required measurements: audiovisual offset, identity drift, mouth/teeth artifacts, temporal stability, head-pose tolerance, long-sequence degradation, latency/compute.

### Still-image character consistency
Preferred first benchmark: `CHAR-IP-ADAPTER` non-FaceID path.
Required measurements: multi-angle identity consistency, expression/wardrobe consistency, prompt adherence, background/style independence, base-model license status.

### 3D / body
`CHAR-BLENDER` is a DCC/runtime candidate and should be used for deterministic asset processing, rigging/animation/rendering after its runtime path is governed.
`CHAR-SAM3D-BODY` remains HOLD until license/checkpoint review.
`CHAR-HUNYUAN3D-21` is denied for EU routing under the currently recorded license.

### Face restoration
`CHAR-GFPGAN` may be benchmarked as restoration only. It must not be used to inflate or fabricate identity similarity scores.

## Promotion evidence contract
Every promoted candidate must prove:
- exact upstream source/revision pinned;
- immutable artifact/model hashes;
- primary license PASS;
- dependency/checkpoint license PASS;
- security review PASS;
- physical PREPROD smoke PASS;
- applicable quality benchmark PASS;
- rights/provenance PASS;
- measured additional recurring cost = `0 €` under the selected route;
- rollback proven;
- rebuild proven;
- tribunal PASS;
- no unrelated App/CRM/Supabase/SEO/WordPress/Training drift.

## Real identity procedure
For any real-person character or voice:
1. Resolve identity to `REAL_AUTHORIZED` only with a valid rights record.
2. Store provenance evidence and permitted scope/territory/expiry.
3. Require revocation path.
4. Mount Identity & Likeness Consent Guardian and, for voice, Voice Consent Guardian.
5. Reject/HUMAN_REQUIRED when scope is unclear, expired, revoked or incomplete.
6. Recheck rights at release time, not only at model-training/reference-ingest time.

## Failure procedure
If any license, security, cost, rights, quality or rollback gate fails:
- stop promotion;
- retain evidence;
- mark candidate `HOLD` or `REJECT` with explicit reason;
- do not substitute a paid provider silently;
- route research to the relevant specialists;
- compare a safe alternative using the same fixture and metrics.

## Current intended benchmark order
1. Qwen3-TTS voice path.
2. MuseTalk lip-sync path.
3. IP-Adapter non-FaceID visual identity path.
4. Blender deterministic 3D/runtime path.
5. Cross-modal persistent-character test combining the winners.

No item in this order is a claim that the physical capability is already installed or production-ready.
