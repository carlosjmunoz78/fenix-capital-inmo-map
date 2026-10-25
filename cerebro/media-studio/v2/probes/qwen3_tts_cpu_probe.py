#!/usr/bin/env python3
"""CEREBRO UMS · Qwen3-TTS CPU physical worker/probe.

LAB/PREPROD only. No external mutations. The worker intentionally uses the
smallest released Qwen3-TTS CustomVoice model and CPU-only PyTorch so that
CEREBRO can execute and evidence the zero-cost fallback route before any GPU
runtime is provisioned.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import sys
import time
import traceback
from pathlib import Path

REPORT_PATH = Path(os.environ.get("UMS_QWEN_REPORT", "ums-qwen3-tts-cpu-probe.json"))
OUTPUT_PATH = Path(os.environ.get("UMS_QWEN_OUTPUT", "ums-qwen3-tts-cpu-probe.wav"))
MODEL_ID = os.environ.get("UMS_QWEN_MODEL", "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice")
TEXT = os.environ.get("UMS_QWEN_TEXT", "CEREBRO, prueba de voz en español.")
SPEAKER = os.environ.get("UMS_QWEN_SPEAKER", "Aiden")
LANGUAGE = os.environ.get("UMS_QWEN_LANGUAGE", "Spanish")
MAX_NEW_TOKENS = int(os.environ.get("UMS_QWEN_MAX_NEW_TOKENS", "96"))

started = time.time()
report: dict = {
    "schema": "cerebro_ums_qwen3_tts_cpu_probe_v1",
    "environment": "PREPROD_LAB",
    "external_mutations": False,
    "paid_api_calls": 0,
    "target_cost_eur": 0,
    "model_id": MODEL_ID,
    "device_requested": "cpu",
    "text": TEXT,
    "speaker": SPEAKER,
    "language": LANGUAGE,
    "max_new_tokens": MAX_NEW_TOKENS,
    "runtime": {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "machine": platform.machine(),
    },
    "status": "STARTED",
}


def write_report() -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report["elapsed_seconds"] = round(time.time() - started, 3)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


try:
    import psutil

    vm = psutil.virtual_memory()
    disk = psutil.disk_usage(".")
    report["runtime"].update(
        {
            "memory_total_bytes": int(vm.total),
            "memory_available_before_bytes": int(vm.available),
            "disk_free_before_bytes": int(disk.free),
        }
    )
except Exception as exc:  # Evidence only; not a functional blocker.
    report["runtime"]["resource_probe_warning"] = repr(exc)

try:
    import torch
    import soundfile as sf
    from importlib.metadata import version
    from qwen_tts import Qwen3TTSModel

    report["packages"] = {
        "torch": torch.__version__,
        "qwen_tts": version("qwen-tts"),
        "soundfile": version("soundfile"),
    }
    report["runtime"].update(
        {
            "torch_cuda_available": bool(torch.cuda.is_available()),
            "torch_cuda_device_count": int(torch.cuda.device_count()),
        }
    )

    if torch.cuda.is_available():
        raise RuntimeError("CPU probe guard violated: CUDA is unexpectedly available")

    load_started = time.time()
    model = Qwen3TTSModel.from_pretrained(
        MODEL_ID,
        device_map="cpu",
        dtype=torch.float32,
        low_cpu_mem_usage=True,
    )
    report["model_load_seconds"] = round(time.time() - load_started, 3)
    report["model_device"] = str(model.device)
    report["supported_languages"] = sorted(list(model.model.get_supported_languages()))
    report["supported_speakers"] = sorted(list(model.model.get_supported_speakers()))

    if LANGUAGE.lower() not in {str(value).lower() for value in report["supported_languages"]}:
        raise RuntimeError(f"Unsupported requested language: {LANGUAGE}")
    if SPEAKER.lower() not in {str(value).lower() for value in report["supported_speakers"]}:
        raise RuntimeError(f"Unsupported requested speaker: {SPEAKER}")

    generation_started = time.time()
    wavs, sample_rate = model.generate_custom_voice(
        text=TEXT,
        language=LANGUAGE,
        speaker=SPEAKER,
        max_new_tokens=MAX_NEW_TOKENS,
    )
    report["generation_seconds"] = round(time.time() - generation_started, 3)

    if not wavs:
        raise RuntimeError("Qwen3-TTS returned no waveform")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(OUTPUT_PATH), wavs[0], sample_rate)
    payload = OUTPUT_PATH.read_bytes()
    info = sf.info(str(OUTPUT_PATH))
    report["artifact"] = {
        "path": str(OUTPUT_PATH),
        "bytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "sample_rate": int(info.samplerate),
        "frames": int(info.frames),
        "duration_seconds": round(float(info.duration), 3),
        "channels": int(info.channels),
    }

    if len(payload) <= 44 or info.frames <= 0 or info.duration <= 0:
        raise RuntimeError("Generated WAV failed minimum semantic artifact checks")

    report["status"] = "PASSED_CPU_REAL_INFERENCE"
    report["decision"] = "CPU_FALLBACK_TECHNICALLY_WORKS"
    write_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
except Exception as exc:
    report["status"] = "FAILED"
    report["decision"] = "CPU_FALLBACK_NOT_YET_PROVEN"
    report["error_type"] = type(exc).__name__
    report["error"] = str(exc)
    report["traceback"] = traceback.format_exc(limit=20)
    write_report()
    print(json.dumps(report, ensure_ascii=False, indent=2), file=sys.stderr)
    raise
