#!/usr/bin/env python3
"""Zero-cost physical Spanish TTS adapter for CEREBRO UMS PREPROD.

Kokoro-82M is used as a CPU-capable baseline. This script never silently falls
back to a robotic OS voice: if neural TTS cannot render, the production fails.
"""
from __future__ import annotations

import argparse
import json
import wave
from pathlib import Path

import numpy as np
from kokoro import KPipeline

SAMPLE_RATE = 24000


def render(text: str, output: Path, voice: str, speed: float) -> dict:
    text = text.strip()
    if not text:
        raise RuntimeError("VOICE_TEXT_EMPTY")
    if not voice.startswith("e"):
        raise RuntimeError("VOICE_MUST_BE_SPANISH")

    pipeline = KPipeline(lang_code="e", device="cpu")
    chunks: list[np.ndarray] = []
    for result in pipeline(text, voice=voice, speed=speed, split_pattern=r"\n+"):
        audio = getattr(result, "audio", None)
        if audio is None:
            # Backward-compatible tuple shape used by older Kokoro releases.
            try:
                audio = result[2]
            except Exception:
                audio = None
        if audio is None:
            continue
        if hasattr(audio, "detach"):
            audio = audio.detach().cpu().numpy()
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        if audio.size:
            chunks.append(audio)

    if not chunks:
        raise RuntimeError("KOKORO_RENDER_EMPTY")

    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak <= 1e-6:
        raise RuntimeError("KOKORO_RENDER_SILENT")
    # Leave headroom for the downstream dialogue/music master.
    if peak > 0.92:
        audio = audio * (0.92 / peak)

    pcm = np.clip(audio, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype(np.int16)
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())

    duration = float(len(pcm) / SAMPLE_RATE)
    evidence = {
        "status": "PASS",
        "provider": "KOKORO_82M_LOCAL_CPU",
        "language": "es",
        "voice": voice,
        "speed": speed,
        "sample_rate_hz": SAMPLE_RATE,
        "duration_sec": duration,
        "commercial_runtime_cost_eur": 0,
        "fallback_used": False,
    }
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text-file", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--voice", default="ef_dora")
    parser.add_argument("--speed", type=float, default=1.02)
    args = parser.parse_args()

    text = Path(args.text_file).read_text(encoding="utf-8")
    evidence = render(text, Path(args.output), args.voice, args.speed)
    Path(args.evidence).write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    print("CEREBRO_KOKORO_VOICE_RENDER_COMPLETE")
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
