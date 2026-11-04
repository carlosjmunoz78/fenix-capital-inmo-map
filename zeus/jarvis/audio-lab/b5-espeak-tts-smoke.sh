#!/usr/bin/env bash
# ZEUS/JARVIS B5 CUT04: isolated TTS WAV smoke. Only synthetic, non-sensitive Spanish text.
# This is not an STT test, voice quality certification, browser integration or PROD rollout.
set -euo pipefail
command -v espeak-ng >/dev/null || { echo "TTS_BINARY_MISSING"; exit 2; }
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
out="$tmpdir/tts-spanish-fixture.wav"
espeak-ng --voices=es >/dev/null
espeak-ng -v es -s 160 -w "$out" 'Hola. Soy un motor de prueba seguro. La ejecución está desactivada.' >/dev/null
python3 - "$out" <<'PY'
import sys, wave, math, array
f=sys.argv[1]
with wave.open(f,'rb') as w:
    rate=w.getframerate()
    channels=w.getnchannels()
    width=w.getsampwidth()
    count=w.getnframes()
    raw=w.readframes(count)
    assert 8000 <= rate <= 48000, "SAMPLE_RATE_INVALID"
    assert channels in (1,2), "CHANNELS_INVALID"
    assert width == 2, "SAMPLE_WIDTH_INVALID"
    seconds=count / rate
    assert 0.3 < seconds < 30.0, "WAV_DURATION_INVALID"
    pcm=array.array('h')
    pcm.frombytes(raw)
    assert len(pcm) >= count, "EMPTY_WAV"
    energy=sum(x*x for x in pcm) / len(pcm)
    assert energy > 1.0, "SILENT_WAV"
    rms=math.sqrt(energy)
    print(f"B5_TTS_REAL_WAV_LAB_PASS duration_s={seconds:.2f} rate_hz={rate} channels={channels} rms={rms:.1f}")
print("STT_NOT_TESTED; QUALITY_NOT_CERTIFIED; NO_AUDIO_PERSISTED; PROD_NOT_CONNECTED")
PY
