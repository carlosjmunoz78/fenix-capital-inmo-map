#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ADAPTER_VERSION = "2.7.0"


def select_device():
    forced = os.getenv("CEREBRO_TTS_DEVICE", "").strip().lower()
    if forced:
        return forced
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def parse_args():
    parser = argparse.ArgumentParser(description="CEREBRO Creative Studio V2.7 Chatterbox TTS adapter")
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--language", default="es")
    parser.add_argument("--exaggeration", type=float, default=0.62)
    parser.add_argument("--cfg-weight", type=float, default=0.35)
    parser.add_argument("--temperature", type=float, default=0.78)
    parser.add_argument("--reference-audio", default=None)
    return parser.parse_args()


def main():
    args = parse_args()
    out = Path(args.output)
    manifest_path = Path(args.manifest)
    out.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    device = select_device()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")

    kwargs = {
        "language_id": args.language,
        "exaggeration": args.exaggeration,
        "cfg_weight": args.cfg_weight,
        "temperature": args.temperature,
    }
    if args.reference_audio:
        kwargs["audio_prompt_path"] = args.reference_audio

    wav = model.generate(args.text, **kwargs)
    ta.save(str(out), wav, model.sr)

    info = ta.info(str(out))
    duration = info.num_frames / info.sample_rate if info.sample_rate else 0.0
    manifest = {
        "schema_version": "1.0.0",
        "adapter_version": ADAPTER_VERSION,
        "engine": "CHATTERBOX_MTL_V3",
        "upstream": "resemble-ai/chatterbox",
        "upstream_license": "MIT",
        "language_id": args.language,
        "regional_target": "es-ES",
        "regional_pack_status": "DEFINED_NOT_YET_LOADER_VERIFIED",
        "device": device,
        "sample_rate_hz": info.sample_rate,
        "channels": info.num_channels,
        "duration_seconds": round(duration, 3),
        "reference_voice_used": bool(args.reference_audio),
        "human_voice_quality_review": "PENDING",
        "publish_authorized": False,
        "promotion_eligible": False,
        "additional_recurring_cost_eur": 0,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
