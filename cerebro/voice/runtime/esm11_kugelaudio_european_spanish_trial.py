"""VOICE-001 LAB-only ESM11 forensic-style -> European Spanish KugelAudio trial.

Purpose:
- Create ORIGINAL synthetic male timbre references from high-level vocal traits only.
- Render them through KugelAudio, a model trained specifically for European languages,
  using Spanish (Spain) output.
- No actor, movie, character, or identifiable-person reference audio.
- No automatic promotion and no PROD dependency.
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
KUGEL_SPACE = "multimodalart/kugelaudio"

REFERENCE_TEXT_EN = (
    "Good evening. The system is ready. I have reviewed the information and there are no critical issues. "
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
    "A_GRAVE_SERENE": (
        "Original male voice, around forty. Grave to medium-low register, substantial but smooth chest resonance, "
        "powerful underlying timbre with restrained delivery, calm and serene, technically precise, elegant and controlled. "
        "Very clear consonants, low pitch variance, measured conversational pace, quiet authority, subtle warmth. "
        "Adult but not elderly, no rasp, no booming announcer sound, no melodrama, no robotic monotone."
    ),
    "B_SMOOTH_PRECISE": (
        "Original male voice, late thirties to early forties. Smooth medium-low baritone, clean resonance and crisp articulation, "
        "serene and composed, intelligent, concise, slightly dry and understated, with quiet confidence rather than force. "
        "Natural conversational delivery, stable intonation, minimal vocal effort. Not elderly, not raspy, not theatrical, not radio-like."
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
    raise RuntimeError(f"Unsupported audio output: {type(value)!r}: {value!r}")


def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate(), r.getframerate()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM11 trial refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    qwen = Client(QWEN_SPACE, verbose=False)
    kugel = Client(KUGEL_SPACE, verbose=False)
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
        ref_dst = out / f"ESM11_{candidate_id}_synthetic_reference.wav"
        shutil.copyfile(ref_src, ref_dst)

        kugel_result = kugel.predict(
            OUTPUT_TEXT_ES,
            handle_file(str(ref_dst)),
            "Spanish 🇪🇸",
            3.0,
            3072,
            api_name="/clone_voice",
        )
        if not isinstance(kugel_result, (tuple, list)) or len(kugel_result) < 2:
            raise RuntimeError(f"Unexpected KugelAudio result for {candidate_id}: {kugel_result!r}")
        kugel_audio, kugel_info = kugel_result[0], kugel_result[1]
        es_src = resolve_audio(kugel_audio)
        es_dst = out / f"ESM11_{candidate_id}_es_ES.wav"
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
            "qwen_status": str(qwen_status),
            "kugelaudio_info": str(kugel_info),
            "design_sha256": hashlib.sha256(description.encode("utf-8")).hexdigest(),
        }

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM11",
        "environment": "LAB",
        "status": "FORENSIC_STYLE_TO_EUROPEAN_SPANISH_OWNER_LISTENING_CANDIDATES",
        "target_locale": "es-ES",
        "pipeline": [
            "Qwen3-TTS VoiceDesign original synthetic timbre",
            "KugelAudio European-language TTS with Spanish (Spain) output",
        ],
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
    (out / "ESM11_kugelaudio_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": evidence["status"], "candidates": list(generated), "automatic_promotion": False}))


if __name__ == "__main__":
    main()
