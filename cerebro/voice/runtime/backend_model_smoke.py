"""VOICE-001 Chatterbox multilingual backend smoke.

This is a backend-health test only. It intentionally uses the model's default
voice and no human reference so it can prove weight loading + Spanish waveform
generation without crossing voice-consent boundaries. It never promotes a
voice, never changes bindings, and refuses PROD.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
import tempfile
import time
from pathlib import Path

import soundfile as sf

RUNTIME_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(RUNTIME_DIR))
import app as runtime_app  # noqa: E402

SMOKE_TEXT = "Hola. CEREBRO está comprobando el motor de voz en español antes de usar una referencia autorizada."


def is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name, suffix=".tmp", dir=path.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="Load VOICE-001 backend weights and synthesize one Spanish smoke sentence")
    parser.add_argument("--output", help="Optional JSON evidence path outside repository")
    parser.add_argument("--keep-wav", help="Optional WAV evidence path outside repository")
    args = parser.parse_args()

    if runtime_app.ENVIRONMENT == "PROD":
        raise SystemExit("VOICE-001 backend model smoke refuses PROD")
    if runtime_app.BACKEND != "chatterbox_multilingual":
        raise SystemExit("backend_model_smoke supports chatterbox_multilingual only")
    if runtime_app.T3_MODEL != "v3":
        raise SystemExit("backend_model_smoke requires the canonical V3 candidate")

    for raw in (args.output, args.keep_wav):
        if raw and is_within(Path(raw).expanduser().resolve(), REPO_ROOT):
            raise SystemExit("model smoke evidence must remain outside Git/repository")

    try:
        import torch
    except Exception as exc:
        raise SystemExit(f"torch_unavailable:{type(exc).__name__}") from exc

    if runtime_app.DEVICE.startswith("cuda") and torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()

    started_load = time.perf_counter()
    model = runtime_app._get_model()
    model_load_ms = int((time.perf_counter() - started_load) * 1000)

    started_generation = time.perf_counter()
    wav = model.generate(SMOKE_TEXT, language_id="es")
    generation_ms = int((time.perf_counter() - started_generation) * 1000)

    audio = wav.detach().cpu().squeeze().numpy()
    sample_rate = int(model.sr)
    if sample_rate <= 0 or getattr(audio, "size", 0) <= 0:
        raise SystemExit("generated_audio_empty")

    finite = bool(all(math.isfinite(float(value)) for value in audio.reshape(-1)[:: max(1, audio.size // 5000)]))
    if not finite:
        raise SystemExit("generated_audio_non_finite")

    audio_seconds = float(audio.size / sample_rate)
    if audio_seconds <= 0.1:
        raise SystemExit("generated_audio_too_short")

    temp_created = False
    if args.keep_wav:
        wav_path = Path(args.keep_wav).expanduser().resolve()
        wav_path.parent.mkdir(parents=True, exist_ok=True)
    else:
        fd, temp_name = tempfile.mkstemp(prefix="cerebro-voice-v3-smoke-", suffix=".wav")
        os.close(fd)
        wav_path = Path(temp_name)
        temp_created = True

    try:
        sf.write(wav_path, audio, sample_rate, format="WAV", subtype="PCM_16")
        wav_sha256 = sha256_path(wav_path)
        wav_bytes = wav_path.stat().st_size
    finally:
        if temp_created and wav_path.exists():
            wav_path.unlink()

    gpu_vram_peak_mb = None
    if runtime_app.DEVICE.startswith("cuda") and torch.cuda.is_available():
        gpu_vram_peak_mb = round(torch.cuda.max_memory_allocated() / (1024**2), 2)

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": runtime_app.ENVIRONMENT,
        "status": "GREEN_MODEL_SMOKE_ONLY",
        "backend": runtime_app.BACKEND,
        "t3_model": runtime_app.T3_MODEL,
        "device": runtime_app.DEVICE,
        "language_id": "es",
        "locale_target": "es-ES",
        "model_load_ms": model_load_ms,
        "generation_ms_total": generation_ms,
        "audio_seconds": round(audio_seconds, 3),
        "real_time_factor": round((generation_ms / 1000.0) / audio_seconds, 4),
        "sample_rate": sample_rate,
        "wav_sha256": wav_sha256,
        "wav_bytes": wav_bytes,
        "gpu_vram_peak_mb": gpu_vram_peak_mb,
        "human_reference_used": False,
        "voice_bank_mutated": False,
        "acceptance": {
            "accent_es_es": "NOT_EVALUATED",
            "naturalness": "NOT_EVALUATED",
            "speaker_similarity": "NOT_APPLICABLE",
        },
        "authority": {
            "automatic_promotion": False,
            "prod_enabled": False,
            "prod_writes": False,
            "public_clone_enabled": False,
            "paid_tts_api_used": False,
        },
        "notes": [
            "This proves only that the configured V3 backend can load and emit a non-empty Spanish waveform on this host.",
            "It does not prove Spain-Spanish accent, voice quality, cloned-speaker similarity, or physical user-PC performance.",
            "A legitimate reference and listening QA remain mandatory before any voice becomes PREPROD_READY.",
        ],
    }

    if args.output:
        atomic_json(Path(args.output).expanduser().resolve(), evidence)

    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
