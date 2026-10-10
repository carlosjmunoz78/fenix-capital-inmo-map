"""VOICE-001 LAB-only screening of currently available Spain-Spanish male neural voices.

This is a timbre-discovery experiment, not a production dependency and not a
reference-audio/training source. It uses the same fixed es-ES corpus for every
voice so the owner can compare timbre, age impression, diction and prosody.
No actor/character/movie reference audio is used.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import edge_tts
from edge_tts import VoicesManager

TEXT = (
    "Buenas tardes. CEREBRO está preparado. He revisado la información y no hay incidencias críticas. "
    "En Córdoba y Zaragoza mantendré un castellano de España claro, preciso y natural. "
    "Vosotros podéis revisar el expediente mientras preparo el siguiente paso. "
    "La operación asciende a ciento ochenta y cinco mil euros y la financiación solicitada es del noventa y cinco por ciento. "
    "Si le parece bien, señor, continuamos."
)

# Prioritize official es-ES male families known from Microsoft documentation.
PREFERRED_ORDER = [
    "es-ES-AlvaroNeural",
    "es-ES-ArnauNeural",
    "es-ES-DarioNeural",
    "es-ES-EliasNeural",
    "es-ES-NilNeural",
    "es-ES-SaulNeural",
    "es-ES-TeoNeural",
    "es-ES-TristanMultilingualNeural",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


async def main_async(output_dir: Path) -> None:
    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 ESM12 screen refuses PROD")

    output_dir.mkdir(parents=True, exist_ok=True)
    manager = await VoicesManager.create()
    male_es = manager.find(Locale="es-ES", Gender="Male")
    available = {v["ShortName"]: v for v in male_es}

    ordered = [name for name in PREFERRED_ORDER if name in available]
    ordered.extend(sorted(name for name in available if name not in ordered))
    if not ordered:
        raise RuntimeError("No es-ES male voices returned by the discovery service")

    evidence_voices = []
    for idx, short_name in enumerate(ordered, start=1):
        safe = short_name.replace("es-ES-", "").replace("Neural", "")
        out = output_dir / f"ESM12_{idx:02d}_{safe}_RAW_es_ES.mp3"
        communicate = edge_tts.Communicate(
            TEXT,
            short_name,
            rate="-4%",
            volume="+0%",
            pitch="-2Hz",
        )
        await communicate.save(str(out))
        if not out.exists() or out.stat().st_size < 1000:
            raise RuntimeError(f"Invalid generated file for {short_name}")
        info = available[short_name]
        evidence_voices.append({
            "candidate_number": idx,
            "short_name": short_name,
            "friendly_name": info.get("FriendlyName"),
            "locale": info.get("Locale"),
            "gender": info.get("Gender"),
            "mp3": out.name,
            "mp3_sha256": sha256(out),
            "mp3_bytes": out.stat().st_size,
        })

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "voice_target": "ESM12",
        "environment": "LAB",
        "status": "ES_ES_MALE_TIMBRE_SCREEN_FOR_OWNER_LISTENING",
        "target_locale": "es-ES",
        "purpose": "screen native Spain-Spanish male base timbres before any cinematic FX",
        "fixed_rate": "-4%",
        "fixed_pitch": "-2Hz",
        "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
        "candidates": evidence_voices,
        "usage_boundary": {
            "external_lab_discovery_only": True,
            "production_dependency": False,
            "training_or_cloning_reference_use": False,
            "licensing_review_required_before_any_other_use": True,
        },
        "identity_policy": {
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
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (output_dir / "ESM12_voicebank_screen_evidence.json").write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"status": evidence["status"], "count": len(evidence_voices), "voices": ordered}))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    asyncio.run(main_async(Path(args.output_dir).resolve()))


if __name__ == "__main__":
    main()
