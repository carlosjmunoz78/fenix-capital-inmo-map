"""CEREBRO VOICE-001 owned TTS runtime V0.

LAB/PREPROD only. Fail-closed by design:
- no anonymous synthesis;
- no public voice upload/cloning route;
- only bank entries already approved as LAB_READY/PREPROD_READY can synthesize;
- reference audio lives outside Git;
- default bind should be loopback/private network.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import secrets
import time
from pathlib import Path
from threading import Lock
from typing import Literal

import soundfile as sf
from fastapi import Depends, FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
VOICE_DIR = APP_DIR.parent
BANK_PATH = Path(os.getenv("CEREBRO_VOICE_BANK_PATH", str(VOICE_DIR / "voice-bank.v0.json"))).resolve()
REF_ROOT = Path(os.getenv("CEREBRO_VOICE_REF_ROOT", str(VOICE_DIR / ".private-refs"))).resolve()
ENVIRONMENT = os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper()
BACKEND = os.getenv("CEREBRO_VOICE_BACKEND", "chatterbox_multilingual")
DEVICE = os.getenv("CEREBRO_VOICE_DEVICE", "cpu")
API_TOKEN = os.getenv("CEREBRO_VOICE_RUNTIME_TOKEN", "")
MAX_TEXT_CHARS = int(os.getenv("CEREBRO_VOICE_MAX_TEXT_CHARS", "1400"))
ALLOWED_READY_STATES = {"LAB_READY", "PREPROD_READY"}

if ENVIRONMENT == "PROD":
    raise RuntimeError("VOICE-001 owned runtime V0 refuses PROD")

app = FastAPI(title="CEREBRO VOICE-001 Owned Runtime", version="0.1.0", docs_url=None, redoc_url=None)
_model = None
_model_lock = Lock()


class SynthesisRequest(BaseModel):
    company_id: str = Field(min_length=1, max_length=80)
    voice_id: str = Field(pattern=r"^ES[FM][0-9]{2}$")
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    format: Literal["wav"] = "wav"


def _auth(authorization: str | None = Header(default=None)) -> None:
    if not API_TOKEN:
        raise HTTPException(status_code=503, detail="runtime_token_not_configured")
    expected = f"Bearer {API_TOKEN}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="unauthorized")


def _load_bank() -> dict:
    try:
        data = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"voice_bank_unavailable:{type(exc).__name__}") from exc
    if data.get("engine_id") != "VOICE-001" or data.get("locale") != "es-ES" or data.get("prod_enabled") is not False:
        raise HTTPException(status_code=503, detail="voice_bank_contract_invalid")
    return data


def _voice_entry(bank: dict, voice_id: str) -> dict:
    for voice in bank.get("voices", []):
        if voice.get("voice_id") == voice_id:
            return voice
    raise HTTPException(status_code=404, detail="voice_not_found")


def _safe_reference_path(reference_ref: str) -> Path:
    candidate = (REF_ROOT / reference_ref).resolve()
    try:
        candidate.relative_to(REF_ROOT)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="reference_path_outside_private_root") from exc
    if not candidate.is_file():
        raise HTTPException(status_code=409, detail="reference_audio_missing")
    return candidate


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _get_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        if BACKEND != "chatterbox_multilingual":
            raise HTTPException(status_code=503, detail="backend_not_implemented")
        try:
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            _model = ChatterboxMultilingualTTS.from_pretrained(device=DEVICE)
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"model_load_failed:{type(exc).__name__}") from exc
    return _model


@app.get("/health")
def health() -> dict:
    bank = _load_bank()
    voices = bank.get("voices", [])
    ready = sum(1 for voice in voices if voice.get("status") in ALLOWED_READY_STATES)
    return {
        "status": "ok",
        "engine_id": "VOICE-001",
        "environment": ENVIRONMENT,
        "prod_enabled": False,
        "backend": BACKEND,
        "device": DEVICE,
        "locale": "es-ES",
        "voice_slots": len(voices),
        "ready_voices": ready,
        "model_loaded": _model is not None,
        "public_clone_enabled": False,
        "paid_api_required": False,
    }


@app.get("/voices", dependencies=[Depends(_auth)])
def voices() -> dict:
    bank = _load_bank()
    return {
        "engine_id": "VOICE-001",
        "locale": "es-ES",
        "voices": [
            {
                "voice_id": voice.get("voice_id"),
                "presentation": voice.get("presentation"),
                "profile": voice.get("profile"),
                "status": voice.get("status"),
            }
            for voice in bank.get("voices", [])
        ],
    }


@app.post("/synthesize", dependencies=[Depends(_auth)])
def synthesize(payload: SynthesisRequest) -> Response:
    started = time.perf_counter()
    bank = _load_bank()
    voice = _voice_entry(bank, payload.voice_id)

    if voice.get("status") not in ALLOWED_READY_STATES:
        raise HTTPException(status_code=409, detail="voice_not_ready")
    if not voice.get("consent_ref") and not voice.get("license"):
        raise HTTPException(status_code=409, detail="consent_or_license_missing")
    reference_ref = voice.get("reference_ref")
    expected_sha = voice.get("reference_sha256")
    if not reference_ref or not expected_sha:
        raise HTTPException(status_code=409, detail="reference_contract_incomplete")

    reference_path = _safe_reference_path(str(reference_ref))
    if not secrets.compare_digest(_sha256(reference_path), str(expected_sha).lower()):
        raise HTTPException(status_code=409, detail="reference_checksum_mismatch")

    model = _get_model()
    try:
        wav = model.generate(payload.text, language_id="es", audio_prompt_path=str(reference_path))
        audio = wav.detach().cpu().squeeze().numpy()
        buffer = io.BytesIO()
        sf.write(buffer, audio, int(model.sr), format="WAV", subtype="PCM_16")
        body = buffer.getvalue()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"synthesis_failed:{type(exc).__name__}") from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return Response(
        content=body,
        media_type="audio/wav",
        headers={
            "X-Cerebro-Engine": "VOICE-001",
            "X-Cerebro-Voice": payload.voice_id,
            "X-Cerebro-Locale": "es-ES",
            "X-Cerebro-Backend": BACKEND,
            "X-Cerebro-Latency-Ms": str(elapsed_ms),
            "Cache-Control": "no-store",
        },
    )
