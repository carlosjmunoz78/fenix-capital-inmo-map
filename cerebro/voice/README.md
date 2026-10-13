# CEREBRO VOICE-001 · Voice Layer

VOICE-001 is the common voice capability for CEREBRO. **Voice is transport/presentation, never a second authority layer.** Every voice adapter must reuse the authoritative text/action contract of its channel and inherit authentication, RBAC, context, memory, HUMAN_REQUIRED and governed learning.

## Current state · 2026-10-13

### Browser/channel adapters

- **CEREBRO Console Voice:** `PROD_DEPLOYED`. Owner: existing `CerebroConsoleShell`. Authority: `cerebro-console-gateway-v0:/chat`.
- **Ana Voice:** `PROD_DEPLOYED`. Owner: `AnaVoiceQueryBlock`. Authority: `fenix-app-gateway:/v2/ana/knowledge/answer`.
- **Telegram Voice:** existing PROD backend remains independent in transport/permissions and uses the common multichannel conversation policy.
- **WhatsApp Voice / Phone Voice / Web Widget Voice:** `PLANNED_ADAPTER`; not active and not authorized merely by appearing in the registry.

The production frontend source for the Ana/Console voice UI after deduplication is recorded in `channel-registry.v1.json`. The duplicate Console implementation was removed; the pre-existing canonical Console is the only `/cerebro` voice UI.

### Owned/self-hosted TTS runtime

Status remains: `PREPROD_CODE_ONLY / MODEL_NOT_DEPLOYED / PROD_FALSE`.

The owned TTS runtime is a future output backend for VOICE-001. It does **not** create a new engine ID and does not replace browser speech synthesis until quality, provenance, cost, rollback and promotion gates pass.

## Authority contract

For every adapter:

`voice/audio -> transcription -> existing authoritative text/action contract -> existing policy/permissions/context/memory/learning -> response -> optional speech output`

Rules:

- audio is not persisted by default;
- low-confidence transcription must be reviewed rather than silently executed;
- sensitive confirmations never bypass the existing action/policy gate;
- no voice channel grants new permissions;
- no channel creates a parallel memory or learning system;
- text fallback remains available where the UI supports it;
- adding a new channel means adding an adapter, not another CEREBRO.

See `channel-registry.v1.json` for current and planned adapters.

## Owned TTS objective

Make CEREBRO independent from whichever voices a browser/device happens to expose while preserving a zero-additional-cost path:

`CEREBRO text -> VOICE-001 -> owned/self-hosted TTS -> audio -> Console/App/Telegram/...`

Fallback remains:

`owned TTS unavailable -> browser speechSynthesis`

## Owned TTS V0 target

- 20 controlled `es-ES` voice slots: 10 feminine + 10 masculine.
- Authorized voice cloning from reference audio.
- No paid TTS API dependency.
- Provider/model-agnostic contract.
- Chatterbox multilingual/es-ES is the first candidate backend; OpenVoice V2 is a fallback candidate.
- No public cloning endpoint.
- No cross-company voice references.
- No voice is considered usable until reference provenance, consent/license, checksum and quality gates are present.

## Non-negotiable voice-model gates

A cloned or imported voice is `READY` only if all are true:

1. `locale == es-ES`.
2. provenance is known.
3. explicit consent or compatible asset license exists.
4. reference SHA-256 is recorded.
5. speaker/reference audio is stored outside Git.
6. intelligibility and pronunciation pass.
7. Spain-Spanish accent is physically reviewed; provider labels alone are insufficient.
8. no severe hallucination/repetition/truncation defects.
9. latency and resource use are measured.
10. generated output is attributable to its engine/model/version.

## Voice bank

`voice-bank.v0.json` intentionally contains **slots, not fabricated voices**. The 20 references must be supplied from authorized recordings or clearly reusable licensed sources. CEREBRO must never scrape or clone a real person's voice without authorization.

## Runtime boundary

The owned model runtime is LAB/PREPROD only by default. It must bind to loopback/private network unless explicitly placed behind the CEREBRO Gateway. It must not expose raw reference audio or accept anonymous public uploads.

## Cost policy

Recurring API cost target: `0 EUR`.

Compute, electricity, storage and hardware are still resources and must be measured by FinOps. A zero-API-cost model is not treated as zero-resource-cost.

## Promotion path

Owned TTS:

`CODE -> LOCAL_LAB -> 20-VOICE QA -> CLONE QA -> PREPROD SHADOW -> OLD vs NEW -> EVA-001 -> JDG-001 -> gradual binding`

New channel adapter:

`REGISTER -> IDENTIFY EXISTING AUTHORITY -> CONTRACT TEST -> PREPROD -> E2E -> ROLLBACK -> GRADUAL ACTIVATION -> OBSERVABILITY`

Browser TTS remains intact until the owned path proves equal or better and rollback is tested.
