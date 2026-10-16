"""VOICE-001 LAB-only ESM10 synthetic-timbre -> native es-ES bridge.

Goal:
1) Create an ORIGINAL synthetic male timbre with Qwen3 VoiceDesign in English.
2) Use that synthetic audio only as a timbre reference for ResembleAI's dedicated
   Chatterbox Spanish (Spain) single-language model.
3) Keep accent/pronunciation authority on the es-ES stage.

No actor audio, movie audio, character audio, or identifiable-person reference is used.
No automatic promotion. No production dependency.
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

from gradio_client import Client, handle_file

QWEN_SPACE = "Qwen/Qwen3-TTS"
ES_ES_SPACE = "ResembleAI/Chatterbox-Multilingual-TTS-es-es"

REFERENCE_TEXT_EN = (
    "Good evening. The system is ready. I have reviewed the available information and there are no critical issues. "
    "I will remain calm, precise and concise while preparing the next step."
)

OUTPUT_TEXT_ES = (
    "Buenas tardes. CEREBRO está preparado. He revisado la información y no hay incidencias críticas. "
    "En Córdoba y Zaragoza mantendré un castellano de España claro, preciso y natural. "
    "Vosotros podéis revisar el expediente mientras preparo el siguiente paso. "
    "La operación asciende a ciento ochenta y cinco mil euros y la financiación solicitada es del noventa y cinco por ciento. "
    "Si le parece bien, señor, continuamos."
)

DESIGNS = {
    "A_SMOOTH_BARITONE": (
        "Original male voice, late thirties. Smooth low-mid baritone with clean resonance, calm intelligence, "
        "precise articulation and quiet authority. Elegant, restrained and modern. Slight warmth, subtle dry wit, "
        "no rasp, no booming announcer quality, no elderly quality, no theatrical performance. Natural conversational delivery."
    ),
    "B_POLISHED_SYSTEM": (
        "Original male voice, around forty. Polished medium-low timbre, very clean and controlled, technically precise, "
        "soft-spoken but confident, composed, elegant and trustworthy. Rich but not heavy resonance, modern system-assistant feel, "
        "minimal vocal effort, no old-man quality, no radio-announcer style, no exaggerated emotion."
    ),
    "C_RESONANT_YOUNGER": (
        "Original male voice, mid to late thirties. Resonant but youthful baritone, smooth chest resonance, clear upper harmonics, "
        "measured pace, calm technical precision, restrained confidence and discreet sophistication. Natural, intimate and controlled, "
        "never raspy, never elderly, never booming, never melodramatic."
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
    if isinstance(value, (tuple, list)) and value:
        return resolve_audio(value[0])
    if hasattr(value, "path"):
        return Path(value.path)
    raise RuntimeError(f"Unsupported Gradio audio output type: {type(value)!r}: {value!r}")


def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate(), r.getframerate()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM10 bridge refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    qwen = Client(QWEN_SPACE, verbose=False)
    es_es = Client(ES_ES_SPACE, verbose=False)
    generated = {}

    for candidate_id, description in DESIGNS.items():
        qwen_result = qwen.predict(
            REFERENCE_TEXT_EN,
            "English",
            description,
            api_name="/generate_voice_design",
        )
        if not isinstance(qwen_result, (tuple, list)) or len(qwen_result) < 2:
            raise RuntimeError(f"Unexpected Qwen result for {candidate_id}: {qwen_result!r}")
        qwen_audio, qwen_status = qwen_result[0], qwen_result[1]
        if "success" not in str(qwen_status).lower():
            raise RuntimeError(f"Qwen generation failed for {candidate_id}: {qwen_status}")

        ref_src = resolve_audio(qwen_audio)
        ref_dst = out / f"ESM10_{candidate_id}_synthetic_reference.wav"
        shutil.copyfile(ref_src, ref_dst)

        # Dedicated Spain-Spanish synthesis. Low CFG reduces transfer of reference-language accent
        # while preserving useful speaker/timbre conditioning.
        es_result = es_es.predict(
            OUTPUT_TEXT_ES,
            handle_file(str(ref_dst)),
            0.42,   # restrained expressiveness
            0.72,   # temperature
            1701,   # deterministic seed
            0.20,   # minimum UI CFG/Pace; accent authority stays with es-ES stage
            api_name="/generate_tts_audio",
        )
        es_src = resolve_audio(es_result)
        es_dst = out / f"ESM10_{candidate_id}_es_ES.wav"
        shutil.copyfile(es_src, es_dst)

        ref_duration, ref_sr = wav_meta(ref_dst)
        out_duration, out_sr = wav_meta(es_dst)
        generated[candidate_id] = {
            "synthetic_reference_wav": ref_dst.name,
            "synthetic_reference_sha256": sha256(ref_dst),
            "synthetic_reference_seconds": round(ref_duration, 3),
            "synthetic_reference_sample_rate": ref_sr,
            "es_es_wav": es_dst.name,
            "es_es_wav_sha256": sha256(es_dst),
            "es_es_audio_seconds": round(out_duration, 3),
            "es_es_sample_rate": out_sr,
            "design_sha256": hashlib.sha256(description.encode("utf-8")).hexdigest(),
            "qwen_status": str(qwen_status),
        }

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM10",
        "environment": "LAB",
        "status": "SYNTHETIC_TIMBRE_TO_DEDICATED_ES_ES_OWNER_LISTENING_CANDIDATES",
        "target_locale": "es-ES",
        "pipeline": [
            "Qwen3-TTS VoiceDesign original synthetic timbre",
            "Chatterbox dedicated Spanish-Spain single-language finetune",
        ],
        "qwen_space": QWEN_SPACE,
        "es_es_space": ES_ES_SPACE,
        "accent_strategy": "English synthetic reference + dedicated es-ES synthesis + low CFG",
        "production_dependency": False,
        "candidates": generated,
        "identity_policy": {
            "original_cerebro_voice_search": True,
            "synthetic_reference_only": True,
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
    (out / "ESM10_bridge_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "status": evidence["status"],
        "candidates": list(generated),
        "automatic_promotion": False,
    }))


if __name__ == "__main__":
    main()
