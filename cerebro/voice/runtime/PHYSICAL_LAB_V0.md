# VOICE-001 · Physical LAB V0

Status: `AUTOMATION_READY / MODEL_NOT_PHYSICALLY_BENCHMARKED / PROD_FALSE`

This block converts the already-merged owned voice runtime into a reproducible physical LAB procedure without changing the current browser TTS binding.

## Scope

`CEREBRO -> VOICE-001 -> local Chatterbox multilingual -> generated WAV evidence`

The current browser `speechSynthesis` route remains intact and primary until the owned path passes physical QA, OLD vs NEW, EVA-001/JDG-001 and rollback.

## Windows one-command host preparation

Run from a local clone of the repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\cerebro\voice\runtime\windows\Install-VoiceLab.ps1
```

The installer:

- creates an isolated virtual environment under `%LOCALAPPDATA%\CEREBRO\voice-runtime`;
- installs the LAB runtime dependencies;
- creates private voice/evidence directories outside the repository;
- generates a runtime token and stores it encrypted with Windows DPAPI for the current user;
- verifies the Chatterbox multilingual import;
- executes `physical_lab_probe.py`;
- refuses PROD and never changes App/CRM/Supabase/WordPress/Trading bindings.

The installer does **not** claim that model weights have been loaded successfully and does not claim voice quality.

## Register and benchmark one authorized voice

A real speaker requires explicit consent metadata. Example for the owner's own recording:

```powershell
powershell -ExecutionPolicy Bypass -File .\cerebro\voice\runtime\windows\Register-And-Benchmark-Voice.ps1 `
  -VoiceId ESM01 `
  -Audio C:\secure\carlos-reference.wav `
  -CompanyId fenix `
  -Provenance OWNER_RECORDED `
  -ConsentRef CONSENT-VOICE-CARLOS-001
```

This step:

1. copies the WAV into private storage outside Git;
2. computes and registers SHA-256 plus consent/provenance metadata;
3. loads the local multilingual model;
4. generates the fixed Q1-Q10 corpus;
5. records timing, RTF, CPU/RAM and available GPU VRAM measurements;
6. writes generated WAVs and `benchmark.json` under `%LOCALAPPDATA%\CEREBRO\voice-evidence`;
7. stops at `MEASURED_NOT_ACCEPTED`.

It never promotes a voice automatically.

## Start the local runtime

```powershell
powershell -ExecutionPolicy Bypass -File .\cerebro\voice\runtime\windows\Start-VoiceLab.ps1
```

The launcher binds only to `127.0.0.1` by default. It decrypts the local DPAPI token only into the process environment and does not print the token.

## Mandatory human QA before PREPROD_READY

For every candidate voice, listen to the generated Q1-Q10 corpus and complete:

- `accent_es_es`: PASS / FAIL / REVIEW;
- `intelligibility`: 0-5;
- `naturalness`: 0-5;
- `speaker_similarity`: 0-5 when cloned;
- `prosody`: 0-5;
- `numbers_dates`: PASS / FAIL;
- `proper_nouns`: PASS / FAIL;
- hallucination/repetition/truncation counts.

A model/provider label is not accepted as proof of Spain-Spanish accent. A successful machine benchmark is not a substitute for listening QA.

## Promotion boundary

The physical block can advance only through:

`HOST_GREEN -> REFERENCE_REGISTERED -> MEASURED_NOT_ACCEPTED -> HUMAN_QA_PASS -> LAB_READY_EVIDENCE -> PREPROD_SHADOW`

It cannot jump directly to PROD. No automatic voice promotion is implemented here.

## Current unavoidable dependency

The next physical step requires at least one legitimate WAV reference and its consent/license metadata. Until such a reference exists, the system remains correctly at `REFERENCE_REQUIRED`; no synthetic claim should replace that evidence.
