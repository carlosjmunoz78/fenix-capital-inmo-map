"""VOICE-001 LAB-only original male Spain-Spanish seed candidate.

Uses a public-domain Spanish (Spain) Piper voice as a legally clean baseline for
ESM05. This is NOT a clone of any actor, character or identifiable person and
never promotes a voice automatically.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import wave
from datetime import datetime, timezone
from pathlib import Path

from huggingface_hub import hf_hub_download
from piper import PiperVoice, SynthesisConfig

REPO_ID = "Trelis/piper-es-es-davefx-medium"
MODEL_FILE = "model.onnx"
CONFIG_FILE = "model.onnx.json"
README_FILE = "README.md"

TEXT = (
    "Buenas noches. CEREBRO está operativo y preparado para asistirle. "
    "He revisado la información disponible y no encuentro ninguna incidencia crítica. "
    "Si le parece bien, podemos continuar con la siguiente tarea. "
    "En Córdoba, Zaragoza o cualquier otra ciudad de España, mantendré un castellano claro, "
    "preciso y natural. Vosotros podéis revisar la documentación mientras preparo el resumen. "
    "La operación asciende a ciento ochenta y cinco mil euros, con una financiación del noventa y cinco por ciento. "
    "No necesito elevar la voz para ser claro. Prefiero una respuesta breve, exacta y útil. "
    "Cuando quiera, continuamos."
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 Piper seed refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    cache = out / "hf"
    cache.mkdir(exist_ok=True)

    model = Path(hf_hub_download(REPO_ID, MODEL_FILE, cache_dir=cache))
    config = Path(hf_hub_download(REPO_ID, CONFIG_FILE, cache_dir=cache))
    readme = Path(hf_hub_download(REPO_ID, README_FILE, cache_dir=cache))

    # Ensure Piper can discover the matching config beside the model.
    local_model = out / MODEL_FILE
    local_config = out / CONFIG_FILE
    local_model.write_bytes(model.read_bytes())
    local_config.write_bytes(config.read_bytes())

    voice = PiperVoice.load(str(local_model))
    syn = SynthesisConfig(
        volume=0.92,
        length_scale=1.10,
        noise_scale=0.52,
        noise_w_scale=0.55,
        normalize_audio=True,
    )

    wav_path = out / "ESM05_original_es_es_executive_seed.wav"
    with wave.open(str(wav_path), "wb") as wav_file:
        voice.synthesize_wav(TEXT, wav_file, syn_config=syn)

    with wave.open(str(wav_path), "rb") as r:
        duration = r.getnframes() / r.getframerate()
        sample_rate = r.getframerate()

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_id": "ESM05",
        "environment": "LAB",
        "status": "ORIGINAL_ES_ES_MALE_SEED_LISTENING_ONLY",
        "target_locale": "es-ES",
        "backend": "piper",
        "source_repository": REPO_ID,
        "source_license_declared": "CC0-1.0",
        "source_readme_sha256": sha256(readme),
        "model_sha256": sha256(local_model),
        "config_sha256": sha256(local_config),
        "wav_sha256": sha256(wav_path),
        "wav_bytes": wav_path.stat().st_size,
        "sample_rate": sample_rate,
        "audio_seconds": round(duration, 3),
        "text": TEXT,
        "style_target": {
            "identity": "original CEREBRO voice",
            "traits": ["male", "grave-leaning", "calm", "precise", "executive", "restrained", "Spain-Spanish"],
            "forbidden": ["actor clone", "character clone", "celebrity reference", "LatAm drift"],
        },
        "authority": {
            "automatic_promotion": False,
            "voice_bank_ready": False,
            "ESM05_accepted": False,
            "prod_enabled": False,
            "public_clone_enabled": False,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / "ESM05_piper_seed_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "status": evidence["status"],
        "wav": str(wav_path),
        "audio_seconds": evidence["audio_seconds"],
        "automatic_promotion": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
