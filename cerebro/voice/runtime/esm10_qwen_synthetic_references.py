"""VOICE-001 ESM10 LAB-only original synthetic timbre reference generator.

Creates three ORIGINAL, non-identifiable English reference voices with Qwen3
VoiceDesign. These references are synthetic assets used only to condition the
next Spain-Spanish stage. No actor, character, movie, or human reference audio.
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
REFERENCE_TEXT = (
    "Good evening. The system is ready. I have reviewed the available information and there are no critical issues. "
    "I will remain calm, precise and concise while preparing the next step."
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
    if hasattr(value, "path"):
        return Path(value.path)
    raise RuntimeError(f"Unsupported audio output type: {type(value)!r}: {value!r}")

def wav_meta(path: Path) -> tuple[float, int]:
    with wave.open(str(path), "rb") as r:
        return r.getnframes() / r.getframerate(), r.getframerate()

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    args = p.parse_args()
    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("ESM10 synthetic reference generation refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    client = Client(SPACE, verbose=False)
    refs = {}

    for cid, desc in DESIGNS.items():
        result = client.predict(REFERENCE_TEXT, "English", desc, api_name="/generate_voice_design")
        if not isinstance(result, (tuple, list)) or len(result) < 2:
            raise RuntimeError(f"Unexpected Qwen result for {cid}: {result!r}")
        audio, status = result[0], result[1]
        if "success" not in str(status).lower():
            raise RuntimeError(f"Qwen failed for {cid}: {status}")
        src = resolve_audio(audio)
        dst = out / f"ESM10_{cid}_synthetic_reference.wav"
        shutil.copyfile(src, dst)
        duration, sr = wav_meta(dst)
        refs[cid] = {
            "wav": dst.name,
            "sha256": sha256(dst),
            "seconds": round(duration, 3),
            "sample_rate": sr,
            "design_sha256": hashlib.sha256(desc.encode("utf-8")).hexdigest(),
        }

    manifest = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM10",
        "environment": "LAB",
        "status": "ORIGINAL_SYNTHETIC_TIMBRE_REFERENCES_GENERATED",
        "backend": "Qwen3-TTS VoiceDesign",
        "references": refs,
        "identity_policy": {
            "synthetic_only": True,
            "actor_clone": False,
            "character_clone": False,
            "movie_audio_reference": False,
            "identifiable_person_reference": False,
        },
        "authority": {"automatic_promotion": False, "prod_enabled": False},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / "ESM10_synthetic_reference_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": manifest["status"], "references": list(refs)}))

if __name__ == "__main__":
    main()
