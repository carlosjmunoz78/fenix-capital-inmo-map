#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

import torch
import torchaudio as ta
from huggingface_hub import hf_hub_download
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ADAPTER_VERSION = "2.7.5"
REGIONAL_PROFILE = "es-ES"
REGIONAL_REPO = "ResembleAI/Chatterbox-Multilingual-es-es"
REGIONAL_REVISION = "f04a96b476ca007fdb069f42a046ea3980686ee9"
SHARED_REPO = "ResembleAI/chatterbox"
SHARED_REVISION = "11120405b7cec7936a0fde4c84c6366789a6897a"
MODEL_DIR_DEFAULT = "/tmp/cerebro-chatterbox-es-es"

EXPECTED_SHA256 = {
    "t3_es_es.safetensors": "d85844b13ea8cb45e95b8d84a55bcfeccb2d743035cf304ee3d778fc6be39546",
    "s3gen.pt": "9b9ff07e60b20c136e2b1b3d7563a24604e8d2c4c267888d1ee929dd0151d2a3",
    "ve.pt": "4b16d836bc598509860f6fa068165a8bb5e9ac84f05582dfcf278a5a372879f1",
    "conds.pt": "6552d70568833628ba019c6b03459e77fe71ca197d5c560cef9411bee9d87f4e",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def checked_copy(src: str, dst: Path, expected_sha: str | None = None) -> str:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    digest = sha256_file(dst)
    if expected_sha and digest != expected_sha:
        raise SystemExit(f"MODEL_ASSET_SHA_MISMATCH:{dst.name}:{digest}")
    return digest


def materialize_es_es_model(model_dir: Path) -> dict:
    """
    Build a local checkpoint directory compatible with the pinned Chatterbox runtime.

    Spanish-Spain T3 and its multilingual tokenizer come from the same pinned
    regional repository revision. S3Gen, voice encoder and builtin conditionals
    stay on the exact pinned shared Chatterbox revision because the regional
    V3 S3Gen checkpoint uses a different state schema than this pinned runtime.
    This preserves the es-ES linguistic specialization while keeping the decoder
    contract deterministic and load-compatible.
    """
    model_dir.mkdir(parents=True, exist_ok=True)
    regional_files = {
        "t3_es_es.safetensors": "t3_es_es.safetensors",
        "grapheme_mtl_merged_expanded_v1.json": "grapheme_mtl_merged_expanded_v1.json",
    }
    shared_files = {
        "s3gen.pt": "s3gen.pt",
        "ve.pt": "ve.pt",
        "conds.pt": "conds.pt",
    }
    assets = []

    for remote_name, local_name in regional_files.items():
        src = hf_hub_download(
            repo_id=REGIONAL_REPO,
            filename=remote_name,
            revision=REGIONAL_REVISION,
            token=os.getenv("HF_TOKEN"),
        )
        digest = checked_copy(src, model_dir / local_name, EXPECTED_SHA256.get(remote_name))
        assets.append({
            "role": "REGIONAL_ES_ES_T3_TOKENIZER",
            "source_repo": REGIONAL_REPO,
            "source_revision": REGIONAL_REVISION,
            "source_file": remote_name,
            "local_file": local_name,
            "sha256": digest,
        })

    for remote_name, local_name in shared_files.items():
        src = hf_hub_download(
            repo_id=SHARED_REPO,
            filename=remote_name,
            revision=SHARED_REVISION,
            token=os.getenv("HF_TOKEN"),
        )
        digest = checked_copy(src, model_dir / local_name, EXPECTED_SHA256.get(remote_name))
        assets.append({
            "role": "PINNED_SHARED_RUNTIME_COMPATIBILITY",
            "source_repo": SHARED_REPO,
            "source_revision": SHARED_REVISION,
            "source_file": remote_name,
            "local_file": local_name,
            "sha256": digest,
        })

    return {
        "profile": REGIONAL_PROFILE,
        "regional_repo": REGIONAL_REPO,
        "regional_revision": REGIONAL_REVISION,
        "regional_t3": "t3_es_es.safetensors",
        "regional_tokenizer": "grapheme_mtl_merged_expanded_v1.json",
        "shared_repo": SHARED_REPO,
        "shared_revision": SHARED_REVISION,
        "compatibility_policy": "PINNED_REGIONAL_ES_ES_T3_TOKENIZER_PLUS_PINNED_SHARED_S3GEN_VE_CONDS",
        "assets": assets,
    }


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
    p = argparse.ArgumentParser(description="CEREBRO V2.7.5 Chatterbox Spanish-Spain batch narration adapter")
    p.add_argument("--input", required=True, help="JSON array/object with items: id,text")
    p.add_argument("--out-dir", required=True)
    p.add_argument("--manifest", required=True)
    p.add_argument("--language", default="es")
    p.add_argument("--regional-profile", default="es-ES", choices=["es-ES"])
    p.add_argument("--model-dir", default=os.getenv("CEREBRO_CHATTERBOX_ES_ES_DIR", MODEL_DIR_DEFAULT))
    p.add_argument("--exaggeration", type=float, default=0.58)
    p.add_argument("--cfg-weight", type=float, default=0.38)
    p.add_argument("--temperature", type=float, default=0.74)
    return p.parse_args()


def main():
    args = parse_args()
    if args.language != "es" or args.regional_profile != "es-ES":
        raise SystemExit("SPANISH_SPAIN_PROFILE_REQUIRED")

    source = json.loads(Path(args.input).read_text(encoding="utf-8"))
    items = source.get("items", []) if isinstance(source, dict) else source
    if not isinstance(items, list) or not items:
        raise SystemExit("BATCH_ITEMS_REQUIRED")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(args.manifest)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    device = select_device()
    model_dir = Path(args.model_dir)
    regional_model = materialize_es_es_model(model_dir)
    model = ChatterboxMultilingualTTS.from_local(
        model_dir,
        device=device,
        t3_model="t3_es_es.safetensors",
    )

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
        "schema_version": "1.1.2",
        "adapter_version": ADAPTER_VERSION,
        "engine": "CHATTERBOX_MTL_V3_ES_ES",
        "upstream": "resemble-ai/chatterbox",
        "upstream_pin": "5de7a54aa4e5e2baadb0182dde554908b48b85c2",
        "upstream_license": "MIT",
        "language_id": args.language,
        "regional_target": REGIONAL_PROFILE,
        "regional_profile_enforced": True,
        "regional_model": regional_model,
        "voice_conditioning": "PINNED_REGIONAL_ES_ES_T3_TOKENIZER_WITH_PINNED_COMPATIBLE_SHARED_S3GEN_AND_BUILTIN_CONDITIONALS",
        "device": device,
        "model_loaded_once": True,
        "generation": {
            "exaggeration": args.exaggeration,
            "cfg_weight": args.cfg_weight,
            "temperature": args.temperature,
        },
        "items": outputs,
        "human_voice_quality_review": "PENDING_ES_ES_AUDIT",
        "publish_authorized": False,
        "promotion_eligible": False,
        "additional_recurring_cost_eur": 0,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
