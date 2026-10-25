#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ADAPTER_VERSION = "2.7.3"


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
    p = argparse.ArgumentParser(description="CEREBRO V2.7 batch Chatterbox narration adapter")
    p.add_argument("--input", required=True, help="JSON array/object with items: id,text")
    p.add_argument("--out-dir", required=True)
    p.add_argument("--manifest", required=True)
    p.add_argument("--language", default="es")
    p.add_argument("--exaggeration", type=float, default=0.58)
    p.add_argument("--cfg-weight", type=float, default=0.38)
    p.add_argument("--temperature", type=float, default=0.74)
    return p.parse_args()


def main():
    args = parse_args()
    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    items = source.get("items", []) if isinstance(source, dict) else source
    if not isinstance(items, list) or not items:
        raise SystemExit("BATCH_ITEMS_REQUIRED")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(args.manifest)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    device = select_device()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
    outputs = []
    for idx, item in enumerate(items):
        item_id = str(item.get("id", f"item-{idx+1}")).strip()
        text = str(item.get("text", "")).strip()
        if not item_id or not text:
            raise SystemExit(f"BATCH_ITEM_INVALID:{idx+1}")
        out = out_dir / f"{item_id}-raw.wav"
        wav = model.generate(
            text,
            language_id=args.language,
            exaggeration=args.exaggeration,
            cfg_weight=args.cfg_weight,
            temperature=args.temperature,
        )
        ta.save(str(out), wav, model.sr)
        info = ta.info(str(out))
        duration = info.num_frames / info.sample_rate if info.sample_rate else 0.0
        outputs.append({
            "id": item_id,
            "file": str(out),
            "sample_rate_hz": info.sample_rate,
            "channels": info.num_channels,
            "duration_seconds": round(duration, 3),
            "text": text,
        })

    manifest = {
        "schema_version": "1.0.0",
        "adapter_version": ADAPTER_VERSION,
        "engine": "CHATTERBOX_MTL_V3",
        "upstream": "resemble-ai/chatterbox",
        "upstream_pin": "5de7a54aa4e5e2baadb0182dde554908b48b85c2",
        "upstream_license": "MIT",
        "language_id": args.language,
        "regional_target": "es-ES",
        "device": device,
        "model_loaded_once": True,
        "items": outputs,
        "human_voice_quality_review": "PENDING",
        "publish_authorized": False,
        "promotion_eligible": False,
        "additional_recurring_cost_eur": 0,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
