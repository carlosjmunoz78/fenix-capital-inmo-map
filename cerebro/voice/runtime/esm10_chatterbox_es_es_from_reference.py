"""VOICE-001 ESM10 LAB-only dedicated Spain-Spanish synthesis.

Consumes exactly one ORIGINAL synthetic reference created by ESM10 stage 1 and
uses ResembleAI's dedicated Spanish (Spain) Chatterbox Space to generate an
owner-listening candidate. No human/actor/movie/character reference audio.
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

SPACE = "ResembleAI/Chatterbox-Multilingual-TTS-es-es"
TEXT = (
    "Buenas tardes. CEREBRO está preparado. He revisado la información y no hay incidencias críticas. "
    "En Córdoba y Zaragoza mantendré un castellano de España claro, preciso y natural. "
    "Vosotros podéis revisar el expediente mientras preparo el siguiente paso. "
    "La financiación solicitada es del noventa y cinco por ciento. Si le parece bien, señor, continuamos."
)

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
    raise RuntimeError(f"Unsupported audio output type: {type(value)!r}: {value!r}")

def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate(), r.getframerate()

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--reference", required=True)
    p.add_argument("--candidate-id", required=True)
    p.add_argument("--output-dir", required=True)
    args = p.parse_args()
    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("ESM10 Spain-Spanish bridge refuses PROD")

    ref = Path(args.reference).resolve()
    if not ref.exists():
        raise SystemExit(f"Reference not found: {ref}")
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    client = Client(SPACE, verbose=False)
    result = client.predict(
        TEXT,
        handle_file(str(ref)),
        0.42,
        0.72,
        1701,
        0.20,
        api_name="/generate_tts_audio",
    )
    src = resolve_audio(result)
    dst = out / f"ESM10_{args.candidate_id}_es_ES.wav"
    shutil.copyfile(src, dst)
    duration, sr = wav_meta(dst)

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM10",
        "candidate_id": args.candidate_id,
        "environment": "LAB",
        "status": "DEDICATED_ES_ES_SYNTHESIS_FROM_SYNTHETIC_REFERENCE_FOR_OWNER_LISTENING",
        "target_locale": "es-ES",
        "backend": "ResembleAI Chatterbox dedicated Spanish-Spain single-language finetune",
        "source_space": SPACE,
        "reference_sha256": sha256(ref),
        "reference_is_synthetic": True,
        "cfg_weight": 0.20,
        "exaggeration": 0.42,
        "temperature": 0.72,
        "seed": 1701,
        "wav": dst.name,
        "wav_sha256": sha256(dst),
        "audio_seconds": round(duration, 3),
        "sample_rate": sr,
        "identity_policy": {
            "synthetic_reference_only": True,
            "actor_clone": False,
            "character_clone": False,
            "movie_audio_reference": False,
            "identifiable_person_reference": False,
        },
        "authority": {
            "owner_listening_required": True,
            "automatic_promotion": False,
            "voice_bank_ready": False,
            "preprod_ready": False,
            "prod_enabled": False,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / f"ESM10_{args.candidate_id}_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": evidence["status"], "candidate": args.candidate_id}))

if __name__ == "__main__":
    main()
