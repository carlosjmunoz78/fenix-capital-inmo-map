#!/usr/bin/env python3
"""JARVIS V2 local, zero-API-fee TTS pilot. No network unless explicitly allowed.

Generate NEW text via Chatterbox Multilingual V3 (language_id=es), with an
approved reference clip. Apply V2 preset only to the new waveform, without
altering approved originals. Model is self-hosted, not the vidIQ hosted clone.
"""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parent
REFERENCE = ROOT / "reference/JARVIS_MASTER_29S_INTOCABLE.mp3"
MASTER_HASH = "2db9951a7b334e93a8bcc2bd80ba360b5560f89b1795e2adef77ee41674bed28"
V2_RATE, V2_PITCH_SEMITONES = 1.10, 0.60
MODEL = "ResembleAI/chatterbox"
MODEL_CHOICE = "v3"  # explicit; the default package model may be v2
MIN_RECOMMENDED_MEMORY_GB = 12.0
MIN_RECOMMENDED_FREE_DISK_GB = 8.0
NOVEL_TEXT = "Buenas tardes. Soy JARVIS y esta frase acaba de generarse sin utilizar una API de voz de pago."


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def memory_gib():
    if sys.platform == "win32":
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                       ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                       ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                       ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                       ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            return round(stat.ullTotalPhys / (1024**3), 2)
    else:
        try:
            with open("/proc/meminfo", encoding="ascii") as f:
                mem_kib = next(int(line.split()[1]) for line in f if line.startswith("MemTotal:"))
            total = mem_kib * 1024
            for fn in ("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"):
                try:
                    limit = Path(fn).read_text(encoding="ascii").strip()
                    if limit.isdigit() and int(limit) > 0:
                        total = min(total, int(limit))
                except OSError:
                    pass
            return round(total / (1024**3), 2)
        except (OSError, ValueError, StopIteration):
            pass
    return None


def nvidia_gpu():
    exe = shutil.which("nvidia-smi")
    if not exe:
        return []
    try:
        p = subprocess.run([exe, "--query-gpu=name,memory.total", "--format=csv,noheader"],
                           capture_output=True, text=True, timeout=6, check=True)
        return [l.strip() for l in p.stdout.splitlines() if l.strip()]
    except (OSError, subprocess.SubprocessError):
        return []


def ffmpeg_available():
    executable = shutil.which("ffmpeg")
    if not executable:
        return False
    try:
        cmd = subprocess.run([executable, "-filters"], capture_output=True,
                             text=True, timeout=12, check=True)
        return "rubberband" in cmd.stdout
    except (OSError, subprocess.SubprocessError):
        return False


def probe(reference=REFERENCE):
    reference = Path(reference)
    valid_ref = reference.exists() and reference.is_file() and sha256(reference) == MASTER_HASH
    ram = memory_gib()
    disk_gib = shutil.disk_usage(ROOT).free / (1024**3)
    gpu = nvidia_gpu()
    ffmpeg_ok = ffmpeg_available()
    reasons = []
    if not valid_ref:
        reasons.append("APPROVED_REFERENCE_MISSING_OR_MODIFIED")
    if ram is None or ram < MIN_RECOMMENDED_MEMORY_GB:
        reasons.append("MEMORY_BELOW_RECOMMENDED_12_GIB")
    if disk_gib < MIN_RECOMMENDED_FREE_DISK_GB:
        reasons.append("DISK_BELOW_RECOMMENDED_8_GIB")
    if not ffmpeg_ok:
        reasons.append("FFMPEG_RUBBERBAND_MISSING")
    if sys.version_info < (3, 10):
        reasons.append("PYTHON_3_10_OR_NEWER_REQUIRED")
    return {
        "status": "READY_FOR_MODEL_INSTALL" if not reasons else "BLOCKED_OR_CAPACITY_LIMITED",
        "environment": "LAB", "company_id": "fenix", "engine_id": "VOICE-001",
        "system": platform.system(), "architecture": platform.machine(),
        "python": platform.python_version(), "physical_memory_gib": ram,
        "disk_free_gib": round(disk_gib, 2), "nvidia_gpu": gpu,
        "ffmpeg_rubberband_available": ffmpeg_ok, "reference_bytes": reference.stat().st_size if reference.exists() else 0,
        "reference_sha256_valid": valid_ref,
        "model_family": "ChatterboxMultilingualTTS", "model_variant": "v3",
        "model_locale": "es", "model_is_dedicated_es_es": False,
        "cost_per_tts_api_call_eur": 0, "cloud_provider_used": False,
        "paid_tts_provider_enabled": False,
        "caveat": "Reference-based self-hosted generation cannot guarantee exact identity or realtime latency until measured.",
        "blockers": reasons,
    }


def ensure_tool(name):
    p = shutil.which(name)
    if not p:
        raise RuntimeError(f"REQUIRED_TOOL_MISSING:{name}")
    return p


def prepare_wav_reference(reference, output):
    # Original input is NEVER modified.
    ff = ensure_tool("ffmpeg")
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                    "-i", str(reference), "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(output)],
                   check=True, timeout=75)
    if output.stat().st_size < 10000:
        raise RuntimeError("REFERENCE_CONVERSION_FAILED")


def final_preset(source, output):
    ff = ensure_tool("ffmpeg")
    if not ffmpeg_available():
        raise RuntimeError("RUBBERBAND_FILTER_REQUIRED_FOR_APPROVED_V2_PRESET")
    pitch_ratio = 2 ** (V2_PITCH_SEMITONES / 12)
    filter_spec = f"rubberband=tempo={V2_RATE:.6f}:pitch={pitch_ratio:.8f}"
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-nostdin", "-n",
                    "-i", str(source), "-af", filter_spec, "-c:a", "libmp3lame", "-q:a", "3", str(output)],
                   check=True, timeout=120)
    if output.stat().st_size < 1000:
        raise RuntimeError("FINAL_PRESET_INVALID")


def model_voice(text, reference_wav, output_wav, *, allow_download=False):
    # NEVER load/run a paid remote inference API. Hugging Face downloads only model weights.
    if not allow_download:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
    import torch
    import torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        torch.set_num_threads(max(1, min(6, os.cpu_count() or 1)))
    start_load = time.perf_counter()
    try:
        model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model=MODEL_CHOICE)
    except TypeError as exc:
        raise RuntimeError("INSTALLED_CHATTERBOX_LACKS_EXPLICIT_V3_LOADER") from exc
    load_sec = round(time.perf_counter() - start_load, 3)
    t0 = time.perf_counter()
    with torch.inference_mode():
        audio = model.generate(text, language_id="es", audio_prompt_path=str(reference_wav),
                               exaggeration=0.5, cfg_weight=0.35, temperature=0.8)
    generation_sec = round(time.perf_counter() - t0, 3)
    torchaudio.save(str(output_wav), audio.detach().cpu(), model.sr)
    duration_sec = round(audio.shape[-1] / model.sr, 3)
    return {"model": MODEL, "variant": MODEL_CHOICE, "device": device,
            "load_seconds": load_sec, "generation_seconds": generation_sec,
            "generated_seconds": duration_sec,
            "real_time_factor": round(generation_sec / duration_sec, 3) if duration_sec else None}


def run_render(args):
    report = probe(args.reference)
    if report["blockers"] and not args.override_capacity_gate:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 3
    text = args.text.strip()
    if not text or len(text) > 220 or re.search(r"(?i)password|contraseña|api[_ -]?key|bearer\s|access[_ -]?token", text):
        print("TEXT_REJECTED: only short non-sensitive test utterances are supported")
        return 4
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    job = uuid.uuid4().hex[:10]
    ref_wav = output_dir / f"jarvis_ref_{job}.wav"
    raw_wav = output_dir / f"jarvis_raw_{job}.wav"
    final_mp3 = output_dir / f"JARVIS_V2_LOCAL_NUEVA_FRASE_{job}.mp3"
    started = time.perf_counter()
    try:
        prepare_wav_reference(args.reference, ref_wav)
        metrics = model_voice(text, ref_wav, raw_wav, allow_download=args.allow_model_download)
        final_preset(raw_wav, final_mp3)
        completed = {
            "status": "LOCAL_TTS_AUDIO_GENERATED_NEEDS_HUMAN_LISTENING_APPROVAL",
            "environment": "LAB", "voice_identity": "LOCAL_CLONE_CANDIDATE_NOT_VIDIQ_MODEL",
            "approved_profile_target": "JARVIS_V2_MAS_CLARA_1_10X",
            "rate": V2_RATE, "pitch_semitones": V2_PITCH_SEMITONES,
            "output_file": str(final_mp3), "output_sha256": sha256(final_mp3),
            "input_text_sha256": hashlib.sha256(text.encode()).hexdigest(),
            "elapsed_total_seconds": round(time.perf_counter() - started, 3),
            "performance": metrics, "model_download_allowed": args.allow_model_download,
            "paid_api_calls": 0,
        }
        (output_dir / f"JARVIS_LOCAL_OSS_EVIDENCIA_{job}.json").write_text(
            json.dumps(completed, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(completed, ensure_ascii=False, indent=2))
        return 0
    finally:
        if ref_wav.exists():
            ref_wav.unlink()
        if raw_wav.exists():
            raw_wav.unlink()


def main():
    p = argparse.ArgumentParser(description="JARVIS V2: speech synthesis locally, without voice API fees")
    p.add_argument("mode", choices=["probe", "render"])
    p.add_argument("--reference", type=Path, default=REFERENCE)
    p.add_argument("--output-dir", type=Path, default=ROOT / "output")
    p.add_argument("--text", default=NOVEL_TEXT)
    p.add_argument("--allow-model-download", action="store_true",
                   help="Allow free Hugging Face weights download (several GB, no inference API)")
    p.add_argument("--override-capacity-gate", action="store_true",
                   help="LAB only: opt in to testing a slow/underpowered CPU")
    args = p.parse_args()
    if args.mode == "probe":
        result = probe(args.reference)
        args.output_dir.mkdir(parents=True, exist_ok=True)
        (args.output_dir / "JARVIS_DIAGNOSTICO_HARDWARE.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["status"] == "READY_FOR_MODEL_INSTALL" else 2
    return run_render(args)

if __name__ == "__main__":
    raise SystemExit(main())