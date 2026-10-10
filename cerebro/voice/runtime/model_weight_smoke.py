"""VOICE-001 CI/LAB model-weight smoke.

Loads the exact reviewed Chatterbox multilingual backend, downloads/loads the
selected T3 checkpoint, synthesizes one short Spanish sample with the model's
built-in/default voice, and records non-promotional evidence.

This is not a voice-bank acceptance test and never promotes a voice.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil
import soundfile as sf


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    p.add_argument("--t3-model", default=os.getenv("CEREBRO_VOICE_T3_MODEL", "v3"), choices=["v2", "v3"])
    p.add_argument("--device", default=os.getenv("CEREBRO_VOICE_DEVICE", "cpu"))
    args = p.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 model smoke refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    wav_path = out / f"voice001_default_es_{args.t3_model}.wav"
    evidence_path = out / "model-weight-smoke.json"

    process = psutil.Process(os.getpid())
    started = time.perf_counter()
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    load_started = time.perf_counter()
    model = ChatterboxMultilingualTTS.from_pretrained(device=args.device, t3_model=args.t3_model)
    load_ms = int((time.perf_counter() - load_started) * 1000)
    ram_after_load_mb = round(process.memory_info().rss / (1024 ** 2), 2)

    text = "Hola. Esta es una prueba técnica de CEREBRO en castellano de España."
    gen_started = time.perf_counter()
    wav = model.generate(text, language_id="es")
    generation_ms = int((time.perf_counter() - gen_started) * 1000)
    audio = wav.detach().cpu().squeeze().numpy()
    sample_rate = int(model.sr)
    sf.write(wav_path, audio, sample_rate, format="WAV", subtype="PCM_16")
    audio_seconds = round(float(len(audio) / sample_rate), 3) if sample_rate else 0.0

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "status": "MODEL_WEIGHT_AND_DEFAULT_ES_SYNTHESIS_SMOKE_ONLY",
        "backend": "chatterbox_multilingual",
        "t3_model": args.t3_model,
        "device": args.device,
        "locale": "es-ES-target / language_id=es",
        "host": {
            "os": platform.platform(),
            "python": platform.python_version(),
        },
        "package_version": package_version("chatterbox-tts"),
        "model_load_ms": load_ms,
        "generation_ms": generation_ms,
        "total_ms": int((time.perf_counter() - started) * 1000),
        "ram_after_load_mb": ram_after_load_mb,
        "sample_rate": sample_rate,
        "audio_seconds": audio_seconds,
        "wav_sha256": sha256(wav_path),
        "wav_bytes": wav_path.stat().st_size,
        "github_sha": os.getenv("GITHUB_SHA"),
        "authority": {
            "automatic_promotion": False,
            "voice_bank_ready": False,
            "reference_voice_used": False,
            "prod_enabled": False,
            "prod_writes": False,
            "public_clone_enabled": False,
        },
        "notes": [
            "This proves only model-weight load and one Spanish synthesis path.",
            "The default model voice is not accepted as a CEREBRO bank voice.",
            "Spain-Spanish accent, naturalness, cloning similarity and latency remain physical QA gates.",
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    evidence_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": evidence["status"],
        "model_load_ms": load_ms,
        "generation_ms": generation_ms,
        "audio_seconds": audio_seconds,
        "wav": str(wav_path),
        "evidence": str(evidence_path),
        "automatic_promotion": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
