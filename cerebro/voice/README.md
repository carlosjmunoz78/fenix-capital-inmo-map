# CEREBRO VOICE-001 · Owned Voice Runtime V0

Status: `PREPROD_CODE_ONLY / MODEL_NOT_DEPLOYED / PROD_FALSE`

This module extends the existing canonical `VOICE-001`. It does **not** create a new engine ID and does not replace the current browser TTS path yet.

## Objective

Make CEREBRO independent from whichever voices a browser/device happens to expose while preserving a zero-additional-cost path:

`CEREBRO text -> VOICE-001 -> owned/self-hosted TTS -> audio -> Console/App/Telegram`

Fallback remains:

`owned TTS unavailable -> browser speechSynthesis`

## V0 target

- 20 controlled `es-ES` voice slots: 10 feminine + 10 masculine.
- Authorized voice cloning from reference audio.
- No paid TTS API dependency.
- Provider/model-agnostic contract.
- Chatterbox multilingual/es-ES is the first candidate backend; OpenVoice V2 is a fallback candidate.
- No public cloning endpoint.
- No cross-company voice references.
- No voice is considered usable until reference provenance, consent/license, checksum and quality gates are present.

## Non-negotiable gates

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

The runtime is LAB/PREPROD only by default. The service must bind to loopback/private network unless explicitly placed behind the CEREBRO Gateway. It must not expose raw reference audio or accept anonymous public uploads.

## Cost policy

Recurring API cost target: `0 EUR`.

Compute, electricity, storage and hardware are still resources and must be measured by FinOps. A zero-API-cost model is not treated as zero-resource-cost.

## Promotion path

`CODE -> LOCAL_LAB -> 20-VOICE QA -> CLONE QA -> PREPROD SHADOW -> OLD vs NEW -> EVA-001 -> JDG-001 -> gradual binding`

Browser TTS remains intact until the owned path proves equal or better and rollback is tested.
