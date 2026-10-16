"""VOICE-001 LAB smoke for the dedicated Spain-Spanish Chatterbox T3 finetune.

Loads the reviewed broad multilingual V3 runtime, replaces only the T3 language
model with the official ResembleAI Spain-Spanish finetune, verifies the published
T3 SHA-256, and synthesizes a short listening sample.

No voice slot, reference or PROD promotion is authorized by this script.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file as load_safetensors

MODEL_REPO = "ResembleAI/Chatterbox-Multilingual-es-es"
T3_FILENAME = "t3_es_es.safetensors"
T3_SHA256 = "d85844b13ea8cb45e95b8d84a55bcfeccb2d743035cf304ee3d778fc6be39546"
TEXT = (
    "Buenos días, Carlos. He revisado el expediente. La documentación está correcta, "
    "salvo dos puntos que conviene comprobar antes de continuar. Si quieres, puedo "
    "explicártelos ahora con calma y decirte exactamente qué falta."
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    p.add_argument("--device", default=os.getenv("CEREBRO_VOICE_DEVICE", "cpu"))
    p.add_argument("--revision", default=os.getenv("CEREBRO_VOICE_ES_ES_REVISION", "main"))
    args = p.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 dedicated es-ES smoke refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    load_started = time.perf_counter()
    model = ChatterboxMultilingualTTS.from_pretrained(device=args.device, t3_model="v3")
    base_load_ms = int((time.perf_counter() - load_started) * 1000)

    t3_path = Path(hf_hub_download(
        repo_id=MODEL_REPO,
        filename=T3_FILENAME,
        repo_type="model",
        revision=args.revision,
        token=os.getenv("HF_TOKEN"),
    )).resolve()
    observed_t3_sha = sha256(t3_path)
    if observed_t3_sha != T3_SHA256:
        raise SystemExit(f"Spain-Spanish T3 SHA mismatch: {observed_t3_sha}")

    swap_started = time.perf_counter()
    state = load_safetensors(t3_path)
    if "model" in state:
        state = state["model"][0]
    model.t3.load_state_dict(state)
    model.t3.to(args.device).eval()
    t3_swap_ms = int((time.perf_counter() - swap_started) * 1000)

    gen_started = time.perf_counter()
    wav = model.generate(
        TEXT,
        language_id="es",
        exaggeration=0.35,
        cfg_weight=0.5,
        temperature=0.7,
    )
    generation_ms = int((time.perf_counter() - gen_started) * 1000)
    audio = wav.detach().cpu().squeeze().numpy()
    sample_rate = int(model.sr)
    wav_path = out / "voice001_es_es_dedicated_default_reference.wav"
    sf.write(wav_path, audio, sample_rate, format="WAV", subtype="PCM_16")

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "status": "ES_ES_DEDICATED_T3_LISTENING_SMOKE_ONLY",
        "backend": "chatterbox_multilingual_v3_plus_es_es_t3",
        "model_repo": MODEL_REPO,
        "t3_filename": T3_FILENAME,
        "t3_sha256": observed_t3_sha,
        "target_locale": "es-ES",
        "language_id": "es",
        "base_load_ms": base_load_ms,
        "t3_swap_ms": t3_swap_ms,
        "generation_ms": generation_ms,
        "sample_rate": sample_rate,
        "audio_seconds": round(float(len(audio) / sample_rate), 3),
        "wav_sha256": sha256(wav_path),
        "wav_bytes": wav_path.stat().st_size,
        "generation": {"exaggeration": 0.35, "cfg_weight": 0.5, "temperature": 0.7},
        "authority": {
            "automatic_promotion": False,
            "prod_enabled": False,
            "voice_bank_ready": False,
            "reference_voice_used": False,
            "esm05_accepted": False
        },
        "notes": [
            "This is a listening smoke for the dedicated Spain-Spanish T3 finetune.",
            "It does not prove ESM05 character fit because no authorized ESM05 reference was used.",
            "Owner listening QA remains mandatory before any PREPROD voice acceptance."
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    (out / "es-es-dedicated-smoke.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "es-es-dedicated-text.txt").write_text(TEXT + "\n", encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
