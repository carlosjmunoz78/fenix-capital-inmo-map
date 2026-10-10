"""Deterministic technical validation for VOICE-001 reference WAV files.

This is a LAB/PREPROD gate only. It validates container/audio hygiene and never
accepts voice identity, consent, accent, naturalness or production readiness.
"""
from __future__ import annotations

import argparse
import array
import json
import math
import sys
import wave
from pathlib import Path

MIN_SECONDS = 20.0
MAX_SECONDS = 120.0
MIN_SAMPLE_RATE = 16000
MAX_SAMPLE_RATE = 96000
MAX_CLIPPED_FRACTION = 0.001
MAX_SILENCE_FRACTION = 0.35
MIN_RMS_DBFS = -35.0
MAX_RMS_DBFS = -8.0


def analyze(path: Path) -> dict:
    reasons: list[str] = []
    try:
        with wave.open(str(path), "rb") as wf:
            channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            sample_rate = wf.getframerate()
            frames = wf.getnframes()
            compression = wf.getcomptype()
            raw = wf.readframes(frames)
    except (wave.Error, EOFError) as exc:
        return {"status": "FAIL", "reasons": [f"invalid_pcm_wav:{type(exc).__name__}"]}

    if compression != "NONE": reasons.append("compressed_wav_not_allowed")
    if channels != 1: reasons.append("mono_required")
    if sample_width != 2: reasons.append("pcm16_required")
    if not (MIN_SAMPLE_RATE <= sample_rate <= MAX_SAMPLE_RATE): reasons.append("sample_rate_out_of_range")
    duration = frames / sample_rate if sample_rate else 0.0
    if duration < MIN_SECONDS: reasons.append("reference_too_short")
    if duration > MAX_SECONDS: reasons.append("reference_too_long")

    peak = rms = clipped_fraction = silence_fraction = None
    if sample_width == 2 and raw:
        samples = array.array("h")
        samples.frombytes(raw)
        if sys.byteorder != "little": samples.byteswap()
        if channels > 1:
            samples = array.array("h", samples[::channels])
        total = len(samples)
        if total:
            scale = 32768.0
            abs_values = [abs(int(x)) for x in samples]
            peak = max(abs_values) / 32767.0
            rms_linear = math.sqrt(sum(float(x) * float(x) for x in samples) / total) / scale
            rms = 20.0 * math.log10(max(rms_linear, 1e-12))
            clipped_fraction = sum(1 for x in abs_values if x >= 32700) / total
            silence_fraction = sum(1 for x in abs_values if x <= 164) / total
            if clipped_fraction > MAX_CLIPPED_FRACTION: reasons.append("excessive_clipping")
            if silence_fraction > MAX_SILENCE_FRACTION: reasons.append("excessive_silence")
            if rms < MIN_RMS_DBFS: reasons.append("recording_too_quiet")
            if rms > MAX_RMS_DBFS: reasons.append("recording_too_loud")
        else:
            reasons.append("empty_audio")
    else:
        reasons.append("audio_samples_unavailable")

    return {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "status": "TECHNICALLY_ACCEPTABLE_FOR_LAB_REFERENCE" if not reasons else "FAIL",
        "path": str(path),
        "channels": channels,
        "sample_width_bytes": sample_width,
        "sample_rate": sample_rate,
        "frames": frames,
        "duration_seconds": round(duration, 3),
        "peak_ratio": round(peak, 5) if peak is not None else None,
        "rms_dbfs": round(rms, 2) if rms is not None else None,
        "clipped_fraction": round(clipped_fraction, 6) if clipped_fraction is not None else None,
        "silence_fraction": round(silence_fraction, 6) if silence_fraction is not None else None,
        "reasons": reasons,
        "authority": {
            "voice_identity_accepted": False,
            "consent_verified": False,
            "accent_accepted": False,
            "naturalness_accepted": False,
            "automatic_promotion": False,
            "prod_enabled": False,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a VOICE-001 reference WAV")
    parser.add_argument("audio")
    parser.add_argument("--output")
    args = parser.parse_args()
    path = Path(args.audio).expanduser().resolve()
    if not path.is_file(): raise SystemExit("audio file not found")
    result = analyze(path)
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        out = Path(args.output).expanduser().resolve(); out.parent.mkdir(parents=True, exist_ok=True); out.write_text(text, encoding="utf-8")
    print(text, end="")
    if result["status"] != "TECHNICALLY_ACCEPTABLE_FOR_LAB_REFERENCE": raise SystemExit(2)


if __name__ == "__main__":
    main()
