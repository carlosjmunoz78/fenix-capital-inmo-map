"""VOICE-001 LAB-only ESM08 Spain-Spanish base-timbre sweep.

Purpose: compare genuinely different permissive es-ES male source timbres.
This is not actor/character cloning and does not use movie audio.
No automatic promotion.
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

REPO_ID = "rhasspy/piper-voices"

CANDIDATES = {
    "CARLFM": {
        "model": "es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx",
        "config": "es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json",
        "card": "es/es_ES/carlfm/x_low/MODEL_CARD",
        "dataset_license": "PUBLIC_DOMAIN",
        "sample_rate_expected": 16000,
    },
    "MLS10246": {
        "model": "es/es_ES/mls_10246/low/es_ES-mls_10246-low.onnx",
        "config": "es/es_ES/mls_10246/low/es_ES-mls_10246-low.onnx.json",
        "card": "es/es_ES/mls_10246/low/MODEL_CARD",
        "dataset_license": "CC-BY-4.0",
        "sample_rate_expected": 16000,
    },
    "MLS9972": {
        "model": "es/es_ES/mls_9972/low/es_ES-mls_9972-low.onnx",
        "config": "es/es_ES/mls_9972/low/es_ES-mls_9972-low.onnx.json",
        "card": "es/es_ES/mls_9972/low/MODEL_CARD",
        "dataset_license": "CC-BY-4.0",
        "sample_rate_expected": 16000,
    },
}

TEXT = (
    "Buenas noches. CEREBRO está preparado y puedo continuar cuando quiera. "
    "He revisado la documentación y no hay ninguna incidencia crítica. "
    "En Córdoba y Zaragoza mantendré un castellano de España claro, preciso y natural. "
    "La operación asciende a ciento ochenta y cinco mil euros y la financiación solicitada es del noventa y cinco por ciento. "
    "Vosotros podéis revisar el expediente mientras preparo el siguiente paso. "
    "No hace falta elevar la voz. Una respuesta serena, breve y exacta es suficiente. "
    "Si le parece bien, señor, continuamos."
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return (r.getnframes() / r.getframerate(), r.getframerate())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM08 timbre sweep refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    cache = out / "hf"
    cache.mkdir(exist_ok=True)

    evidence_candidates = {}
    for name, spec in CANDIDATES.items():
        model = Path(hf_hub_download(REPO_ID, spec["model"], repo_type="model", cache_dir=cache))
        config = Path(hf_hub_download(REPO_ID, spec["config"], repo_type="model", cache_dir=cache))
        card = Path(hf_hub_download(REPO_ID, spec["card"], repo_type="model", cache_dir=cache))

        local_model = out / f"{name}.onnx"
        local_config = out / f"{name}.onnx.json"
        local_model.write_bytes(model.read_bytes())
        local_config.write_bytes(config.read_bytes())

        voice = PiperVoice.load(str(local_model))
        wav_path = out / f"ESM08_{name}_raw_timbre.wav"
        with wave.open(str(wav_path), "wb") as wav_file:
            voice.synthesize_wav(
                TEXT,
                wav_file,
                syn_config=SynthesisConfig(
                    volume=0.92,
                    length_scale=1.10,
                    noise_scale=0.42,
                    noise_w_scale=0.45,
                    normalize_audio=True,
                ),
            )

        duration, sr = wav_meta(wav_path)
        evidence_candidates[name] = {
            "wav": wav_path.name,
            "wav_sha256": sha256(wav_path),
            "audio_seconds": round(duration, 3),
            "sample_rate": sr,
            "sample_rate_expected": spec["sample_rate_expected"],
            "source_model": spec["model"],
            "source_model_sha256": sha256(local_model),
            "source_config_sha256": sha256(local_config),
            "source_model_card_sha256": sha256(card),
            "dataset_license_declared": spec["dataset_license"],
        }

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM08",
        "environment": "LAB",
        "status": "MULTI_BASE_ES_ES_TIMBRE_SWEEP_FOR_OWNER_LISTENING",
        "target_locale": "es-ES",
        "backend": "piper",
        "source_repository": REPO_ID,
        "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
        "candidates": evidence_candidates,
        "identity_policy": {
            "original_cerebro_voice_search": True,
            "actor_clone": False,
            "character_clone": False,
            "movie_audio_reference": False,
            "actor_reference_audio": False,
        },
        "authority": {
            "owner_listening_required": True,
            "voice_bank_ready": False,
            "automatic_promotion": False,
            "preprod_ready": False,
            "prod_enabled": False,
            "public_clone_enabled": False,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / "ESM08_timbre_sweep_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": evidence["status"], "candidates": list(CANDIDATES), "automatic_promotion": False}))


if __name__ == "__main__":
    main()
