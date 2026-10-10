# VOICE-001 Owned Runtime · LAB Runbook V0

## State

`PREPROD_CODE_ONLY`. Do not use this document as evidence that the model has been physically benchmarked.

## 1. Host prerequisites

- Python 3.11 preferred for the first Chatterbox benchmark.
- Private/LAB host; do not expose directly to Internet.
- Enough disk/RAM for the selected model.
- GPU is optional only if the selected backend/device can meet the quality/latency target on CPU; measure, do not assume.

## 2. Install in an isolated environment

```bash
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r cerebro/voice/runtime/requirements.txt
```

Pin exact dependency versions only after the first reproducible physical benchmark.

## 3. Private paths and token

```bash
export CEREBRO_ENVIRONMENT=LAB
export CEREBRO_VOICE_REF_ROOT=/srv/cerebro/voice-private
export CEREBRO_VOICE_PRIVATE_REGISTRY=/srv/cerebro/voice-private/registry.private.json
export CEREBRO_VOICE_RUNTIME_TOKEN='<secret from vault>'
export CEREBRO_VOICE_DEVICE=cpu
```

The token belongs in the configured secret/vault mechanism, never in Git or logs.

## 4. Register a consented reference

Use a clean WAV recording with natural speech and minimal room noise. Reference length is an evaluation variable, not a hardcoded promise.

```bash
python cerebro/voice/runtime/register_voice_reference.py \
  --voice-id ESF01 \
  --company-id fenix \
  --audio /secure/input/reference.wav \
  --provenance OWNER_RECORDED \
  --consent-ref CONSENT-VOICE-0001 \
  --verified-by authorized-operator \
  --ref-root /srv/cerebro/voice-private
```

This copies the reference to private storage, computes SHA-256 and records the metadata outside Git.

## 5. Start runtime locally

```bash
uvicorn cerebro.voice.runtime.app:app --host 127.0.0.1 --port 8765
```

If packaging/import rules require module-path adjustment on the chosen host, fix the launcher without weakening the runtime gates.

## 6. Minimum physical acceptance per voice

Generate a fixed `es-ES` corpus including:

- ordinary conversation;
- mortgage/real-estate vocabulary used by Fénix;
- numbers, percentages, euros, dates and times;
- names and Córdoba localities;
- interrogative/exclamatory prosody;
- long sentence and short command;
- potentially difficult Spanish phonemes and proper nouns.

Record at least:

- intelligibility errors;
- Spain-Spanish accent acceptance;
- speaker similarity when cloning;
- hallucination/repetition/truncation;
- real-time factor / latency;
- CPU/GPU/RAM;
- generated duration;
- reference/model/backend version.

No voice advances to `PREPROD_READY` from one pleasant sample.

## 7. 20-voice bank gate

Do not claim “20 voices ready” until all 20 slots have legitimate references and individual QA. The target remains 10 feminine + 10 masculine voice presentations in `es-ES` with varied profiles.

## 8. Integration order

1. Local LAB runtime and one authorized voice.
2. Repeated synthesis and restart/recovery.
3. Expand to 20 accepted references.
4. Shadow binding from CEREBRO Console while browser TTS remains primary.
5. OLD vs NEW quality/latency.
6. EVA-001 + JDG-001.
7. PREPROD primary with browser fallback.
8. PROD only after explicit promotion gates.

## Rollback

Disable the owned-runtime feature binding and return immediately to the existing browser `speechSynthesis` path. The V0 runtime does not modify CRM, Supabase business data, WordPress, Trading or external customer systems.
