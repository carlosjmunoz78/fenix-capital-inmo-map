# CEREBRO VOICE-001 · Local Reference Capture V0

Status: `PREPROD_CAPTURE_TOOLING / NO_REAL_VOICE_ACCEPTED / PROD_FALSE`.

## Purpose

Reduce the physical voice-cloning step to a controlled local flow without creating a public upload surface:

`authorized speaker -> localhost capture -> WAV + consent sidecar -> deterministic audio validation -> private registry -> Q1-Q10 benchmark -> physical listening QA`.

The capture page does not upload audio, call external APIs or promote any voice. It is intended to be served only from `127.0.0.1` by `Open-VoiceCapture.ps1`.

## Capture

From the repository on the LAB Windows host:

```powershell
./cerebro/voice/runtime/windows/Open-VoiceCapture.ps1
```

Select one of the 20 predefined slots, confirm explicit consent, read the fixed reference text naturally and export both files:

- `ESF01_reference.wav` (or another slot);
- `ESF01_consent.json`.

Target 45–90 seconds. The validator accepts only a conservative 20–120 second technical envelope; this does not mean a 20-second sample is guaranteed to produce good cloning.

## Register + benchmark

After the owned runtime is installed:

```powershell
./cerebro/voice/runtime/windows/Register-And-Benchmark-Voice.ps1 `
  -VoiceId ESF01 `
  -Audio 'C:\path\ESF01_reference.wav' `
  -ConsentMetadata 'C:\path\ESF01_consent.json' `
  -Provenance OWNER_RECORDED
```

The script validates the WAV before copying anything into the private registry. A successful run ends at `MEASURED_NOT_ACCEPTED`; it does not mark the slot `PREPROD_READY`.

## Mandatory physical acceptance

Every real slot still requires the fixed Q1–Q10 corpus and review of Spain-Spanish accent, intelligibility, naturalness, prosody, numbers/dates, proper nouns, hallucination/repetition/truncation, latency and resource use. Cloned voices also require similarity review.

## Boundaries

- No PROD binding.
- No anonymous/public upload.
- No recording is committed to Git.
- No cross-company voice use.
- No cloning without explicit consent or compatible license.
- Browser `speechSynthesis` remains rollback/fallback until owned VOICE-001 passes PREPROD gates.
