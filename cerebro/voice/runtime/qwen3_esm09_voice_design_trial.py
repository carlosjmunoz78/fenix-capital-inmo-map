"""VOICE-001 LAB-only ESM09 Qwen3 VoiceDesign trial.

Calls the official public Qwen3-TTS Hugging Face Space to generate ORIGINAL
Spain-Spanish listening candidates from text descriptions. No reference audio,
actor audio, movie audio, or identifiable-person cloning is used.

External Space is a zero-cost LAB trial only, never a production dependency.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import wave
from datetime import datetime, timezone
from pathlib import Path

from gradio_client import Client

SPACE = "Qwen/Qwen3-TTS"
TEXT = (
    "Buenas noches. CEREBRO está preparado. He revisado la información y no hay incidencias críticas. "
    "En Córdoba y Zaragoza mantendré un castellano de España claro, preciso y natural. "
    "Vosotros podéis revisar el expediente mientras preparo el siguiente paso. "
    "Si le parece bien, señor, continuamos."
)

DESIGNS = {
    "A_YOUNG_BARITONE": (
        "A native European Spanish male from Spain, around 36 years old. "
        "Low-mid baritone, smooth and natural, calm intelligent delivery, clean articulation, "
        "quiet confidence and restrained authority. Conversational rather than announcer-like. "
        "Clearly adult but not elderly, no rasp, no old-man quality. Standard Peninsular Castilian pronunciation. "
        "Absolutely no Latin American accent and no English accent bleed."
    ),
    "B_POLISHED_TECHNICAL": (
        "A native European Spanish male from Spain, around 40 years old. "
        "Medium-low polished voice, elegant and technical, precise consonants, measured pace, "
        "warm but restrained, composed and trustworthy. Modern intelligent assistant character, "
        "subtle dry wit, never theatrical and never elderly. Standard Spain Castilian pronunciation. "
        "Absolutely no Latin American accent and no English accent bleed."
    ),
    "C_DARKER_CINEMATIC": (
        "A native European Spanish male from Spain, around 38 years old. "
        "Slightly deep cinematic baritone without sounding old, smooth resonance, low vocal effort, "
        "calm technical precision, discreet elegance and quiet authority. Natural conversational prosody, "
        "not a radio announcer, not raspy, not elderly. Standard Peninsular Castilian pronunciation. "
        "Absolutely no Latin American accent and no English accent bleed."
    ),
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_audio(value) -> Path:
    if isinstance(value, str):
        return Path(value)
    if isinstance(value, dict):
        for key in ("path", "name"):
            if value.get(key):
                return Path(value[key])
    if hasattr(value, "path"):
        return Path(value.path)
    raise RuntimeError(f"Unsupported Gradio audio output type: {type(value)!r}")


def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate(), r.getframerate()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM09 VoiceDesign trial refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    client = Client(SPACE, verbose=False)
    generated = {}

    for candidate_id, description in DESIGNS.items():
        result = client.predict(
            TEXT,
            "Spanish",
            description,
            api_name="/generate_voice_design",
        )
        if not isinstance(result, (tuple, list)) or len(result) < 2:
            raise RuntimeError(f"Unexpected Space result for {candidate_id}: {result!r}")
        audio_value, status = result[0], result[1]
        if "success" not in str(status).lower():
            raise RuntimeError(f"Qwen Space generation failed for {candidate_id}: {status}")

        src = resolve_audio(audio_value)
        dst = out / f"ESM09_{candidate_id}.wav"
        shutil.copyfile(src, dst)
        duration, sr = wav_meta(dst)
        generated[candidate_id] = {
            "wav": dst.name,
            "wav_sha256": sha256(dst),
            "audio_seconds": round(duration, 3),
            "sample_rate": sr,
            "description_sha256": hashlib.sha256(description.encode("utf-8")).hexdigest(),
            "status": str(status),
        }

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM09",
        "environment": "LAB",
        "status": "QWEN3_VOICE_DESIGN_ES_ES_OWNER_LISTENING_CANDIDATES",
        "target_locale": "es-ES",
        "language_parameter": "Spanish",
        "backend": "Qwen3-TTS VoiceDesign",
        "model": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "model_license": "Apache-2.0",
        "external_trial_surface": "Qwen/Qwen3-TTS official Hugging Face Space ZeroGPU",
        "production_dependency": False,
        "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
        "candidates": generated,
        "identity_policy": {
            "original_cerebro_voice_search": True,
            "reference_audio_used": False,
            "actor_clone": False,
            "character_clone": False,
            "movie_audio_reference": False,
            "identifiable_person_reference": False,
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
    (out / "ESM09_qwen3_voice_design_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": evidence["status"], "candidates": list(generated), "automatic_promotion": False}))


if __name__ == "__main__":
    main()
