"""VOICE-001 LAB-only ESM06/ESM07 Spain-Spanish listening candidates.

Creates two ORIGINAL CEREBRO voices from the permissively licensed Spanish
(Spain) Sharvard Piper model. It does not clone an actor, character or
identifiable person. Owner listening only; no automatic promotion.
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
MODEL_FILE = "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx"
CONFIG_FILE = "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json"
MODEL_CARD = "es/es_ES/sharvard/medium/MODEL_CARD"

TEXT = (
    "Buenas noches. CEREBRO está preparado. He revisado la información disponible y puedo continuar cuando quiera. "
    "En Córdoba, Zaragoza y cualquier otra ciudad de España mantendré un castellano claro y natural. "
    "Vosotros podéis revisar la documentación mientras preparo el resumen. "
    "La operación asciende a ciento ochenta y cinco mil euros, con una financiación del noventa y cinco por ciento. "
    "Cerveza, Zaragoza, decisión, financiación, organización y precisión. "
    "No necesito elevar la voz para ser claro. Prefiero una respuesta breve, serena, exacta y útil. "
    "Si le parece bien, señor, continuamos con la siguiente tarea."
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


def render_variant(voice: PiperVoice, out: Path, voice_id: str, syn: SynthesisConfig) -> Path:
    final = out / f"{voice_id}_cerebro_candidate.wav"
    with wave.open(str(final), "wb") as wav_file:
        voice.synthesize_wav(TEXT, wav_file, syn_config=syn)
    return final


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM06/ESM07 candidate generator refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    cache = out / "hf"
    cache.mkdir(exist_ok=True)

    model = Path(hf_hub_download(REPO_ID, MODEL_FILE, repo_type="model", cache_dir=cache))
    config = Path(hf_hub_download(REPO_ID, CONFIG_FILE, repo_type="model", cache_dir=cache))
    card = Path(hf_hub_download(REPO_ID, MODEL_CARD, repo_type="model", cache_dir=cache))

    local_model = out / "es_ES-sharvard-medium.onnx"
    local_config = out / "es_ES-sharvard-medium.onnx.json"
    local_model.write_bytes(model.read_bytes())
    local_config.write_bytes(config.read_bytes())
    voice = PiperVoice.load(str(local_model))

    # Male speaker is explicit in the model config: speaker_id 0 == M.
    # ESM06: softer, slower and warmer delivery.
    esm06 = render_variant(
        voice,
        out,
        "ESM06",
        SynthesisConfig(
            speaker_id=0,
            volume=0.88,
            length_scale=1.17,
            noise_scale=0.40,
            noise_w_scale=0.42,
            normalize_audio=True,
        ),
    )

    # ESM07: calmer, tighter, more technical and restrained delivery.
    esm07 = render_variant(
        voice,
        out,
        "ESM07",
        SynthesisConfig(
            speaker_id=0,
            volume=0.93,
            length_scale=1.08,
            noise_scale=0.24,
            noise_w_scale=0.24,
            normalize_audio=True,
        ),
    )

    d6, sr6 = wav_meta(esm06)
    d7, sr7 = wav_meta(esm07)
    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "status": "ESM06_ESM07_ORIGINAL_ES_ES_LISTENING_CANDIDATES",
        "target_locale": "es-ES",
        "backend": "piper",
        "source_repository": REPO_ID,
        "source_model": "es_ES-sharvard-medium",
        "source_model_sha256": sha256(local_model),
        "source_config_sha256": sha256(local_config),
        "source_model_card_sha256": sha256(card),
        "source_model_card_dataset_license": "CC-BY-3.0",
        "speaker_id": 0,
        "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
        "candidates": {
            "ESM06": {
                "role": "soft_executive",
                "wav": esm06.name,
                "wav_sha256": sha256(esm06),
                "audio_seconds": round(d6, 3),
                "sample_rate": sr6,
                "traits": ["soft", "warm", "clean", "elegant", "restrained", "Spain-Spanish"],
            },
            "ESM07": {
                "role": "calm_technical_assistant",
                "wav": esm07.name,
                "wav_sha256": sha256(esm07),
                "audio_seconds": round(d7, 3),
                "sample_rate": sr7,
                "traits": ["calm", "technical", "precise", "controlled", "polite", "restrained", "Spain-Spanish"],
            },
        },
        "identity_policy": {
            "original_cerebro_voices": True,
            "actor_clone": False,
            "character_clone": False,
            "celebrity_reference": False,
            "movie_audio_reference": False,
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
    (out / "ESM06_ESM07_candidate_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "status": evidence["status"],
        "ESM06": esm06.name,
        "ESM07": esm07.name,
        "automatic_promotion": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
