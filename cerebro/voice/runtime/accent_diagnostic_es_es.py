"""VOICE-001 LAB-only Spanish (Spain) accent diagnostic.

Generates a longer default-voice sample from the reviewed Chatterbox multilingual
backend. It is evidence for listening only: no slot, clone, acceptance or PROD.
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

TEXT = """Hola. Esta es una prueba más larga del motor de voz de CEREBRO. Quiero que escuches con atención el acento, la pronunciación y el ritmo. Estamos buscando un castellano natural de España, sin mezcla latinoamericana y sin tono artificial. En Córdoba podemos hablar de una vivienda en Ciudad Jardín, una hipoteca al noventa y cinco por ciento, una tasación, una notaría y una firma prevista para el miércoles diecisiete de junio a las diez y media. También quiero comprobar palabras que suelen delatar el acento. Zaragoza, cerveza, cinco, ciento cincuenta, gracias, decisión, financiación, organización, habitación, zapato, corazón, precio y operación. Ahora una frase cotidiana. Vosotros podéis revisar la documentación esta tarde y, si os parece bien, mañana seguimos con el banco. Otra frase. Necesito que me digáis si la pronunciación os suena realmente española, cercana y creíble. CEREBRO debe poder hablar durante una conversación completa sin cambiar de acento, sin arrastrar vocales y sin sonar como una locución de otro país. La voz tiene que mantener el mismo carácter al decir números, fechas, nombres propios y términos financieros. Córdoba, Lucena, Montilla, Puente Genil, Cabra y Priego de Córdoba. Tres mil quinientos euros más IVA. Ciento ochenta y cinco mil euros de compraventa. Veintinueve años, treinta y siete años y cuarenta y ocho años. Esta muestra termina con una conversación sencilla. Buenos días. ¿Cómo estás? Cuéntame qué necesitas y lo revisamos juntos. Si quieres comprar una vivienda, primero veremos cuánto puedes pagar, qué documentación tienes y qué opciones reales ofrece el banco. Después te explicaré los siguientes pasos de forma clara, sin prisas y con un castellano natural de España."""


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    p.add_argument("--t3-model", default="v3", choices=["v2", "v3"])
    p.add_argument("--device", default=os.getenv("CEREBRO_VOICE_DEVICE", "cpu"))
    args = p.parse_args()

    if os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper() == "PROD":
        raise SystemExit("VOICE-001 accent diagnostic refuses PROD")

    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    wav_path = out / f"voice001_es_es_accent_diagnostic_{args.t3_model}.wav"

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    load_started = time.perf_counter()
    model = ChatterboxMultilingualTTS.from_pretrained(device=args.device, t3_model=args.t3_model)
    load_ms = int((time.perf_counter() - load_started) * 1000)

    gen_started = time.perf_counter()
    wav = model.generate(TEXT, language_id="es")
    generation_ms = int((time.perf_counter() - gen_started) * 1000)
    audio = wav.detach().cpu().squeeze().numpy()
    sample_rate = int(model.sr)
    sf.write(wav_path, audio, sample_rate, format="WAV", subtype="PCM_16")
    audio_seconds = round(float(len(audio) / sample_rate), 3)

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "status": "ES_ES_ACCENT_DIAGNOSTIC_LISTENING_ONLY",
        "backend": "chatterbox_multilingual",
        "t3_model": args.t3_model,
        "language_id": "es",
        "target_locale": "es-ES",
        "model_load_ms": load_ms,
        "generation_ms": generation_ms,
        "audio_seconds": audio_seconds,
        "text_sha256": hashlib.sha256(TEXT.encode("utf-8")).hexdigest(),
        "wav_sha256": sha256(wav_path),
        "wav_bytes": wav_path.stat().st_size,
        "authority": {
            "automatic_promotion": False,
            "voice_bank_ready": False,
            "reference_voice_used": False,
            "prod_enabled": False,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    (out / "accent-diagnostic.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "accent-diagnostic-text.txt").write_text(TEXT + "\n", encoding="utf-8")
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
