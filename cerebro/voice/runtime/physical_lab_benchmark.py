"""VOICE-001 physical LAB benchmark harness.

Runs the fixed es-ES QA corpus against one already-authorized LAB voice.
It writes generated WAVs and machine evidence outside Git, never promotes a
voice automatically, and refuses PROD.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import statistics
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil
import soundfile as sf

RUNTIME_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(RUNTIME_DIR))
import app as runtime_app  # noqa: E402

CORPUS = {
    "Q1": "Hola, Carlos. He revisado lo que tenemos y hay dos cosas importantes. La primera está resuelta. La segunda necesita una comprobación antes de continuar.",
    "Q2": "El expediente solicita el cien por cien de financiación. Antes de enviarlo al banco comprobaremos ingresos líquidos, ratio de endeudamiento, ahorro, tasación y documentación.",
    "Q3": "El precio es de 185.750 euros. La aportación disponible es de 12.400 euros y la cuota estimada es de 742,35 euros al mes.",
    "Q4": "La firma está prevista para el miércoles 17 de junio de 2026 a las diez y media de la mañana.",
    "Q5": "Córdoba, Lucena, Montilla, Cabra, Puente Genil, Priego de Córdoba, Valdeolleros, Fuensanta y Arroyo del Moro.",
    "Q6": "Fénix Capital utiliza CEREBRO, Supabase, Notion, GitHub y WordPress dentro de sus flujos autorizados.",
    "Q7": "¿Quieres que lo revise ahora? ¿Prefieres la opción más rápida o la que ofrece mejores condiciones?",
    "Q8": "Perfecto. Esto sí está bien. Ahora viene lo importante: no vamos a tocar producción hasta que la prueba sea verde.",
    "Q9": "Para. Continúa. Repite. Abre el expediente. No envíes nada todavía.",
    "Q10": "Cuando una operación depende de varias personas, CEREBRO debe mantener el contexto, comprobar qué parte está bloqueada, informar sin saturar y continuar automáticamente con todo lo que pueda ejecutar de forma segura mientras espera la acción que realmente requiere intervención humana.",
}


def is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


class ResourceMonitor:
    def __init__(self) -> None:
        self.process = psutil.Process(os.getpid())
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.ram_peak_mb = 0.0
        self.cpu_peak_pct = 0.0

    def _run(self) -> None:
        self.process.cpu_percent(interval=None)
        while not self.stop_event.wait(0.1):
            try:
                self.ram_peak_mb = max(self.ram_peak_mb, self.process.memory_info().rss / (1024**2))
                self.cpu_peak_pct = max(self.cpu_peak_pct, self.process.cpu_percent(interval=None))
            except psutil.Error:
                return

    def __enter__(self) -> "ResourceMonitor":
        self.thread = threading.Thread(target=self._run, name="voice-resource-monitor", daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_args) -> None:
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=1.0)
        try:
            self.ram_peak_mb = max(self.ram_peak_mb, self.process.memory_info().rss / (1024**2))
        except psutil.Error:
            pass


def percentile_95(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1)))))
    return ordered[index]


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark one authorized VOICE-001 LAB voice")
    parser.add_argument("--voice-id", required=True)
    parser.add_argument("--company-id", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--blocks", default=",".join(CORPUS.keys()))
    args = parser.parse_args()

    if runtime_app.ENVIRONMENT == "PROD":
        raise SystemExit("VOICE-001 physical benchmark refuses PROD")
    if args.repeats < 1 or args.repeats > 5:
        raise SystemExit("repeats must be between 1 and 5")

    output_dir = Path(args.output_dir).expanduser().resolve()
    if is_within(output_dir, REPO_ROOT):
        raise SystemExit("generated voice evidence must remain outside Git/repository")
    output_dir.mkdir(parents=True, exist_ok=True)

    selected_blocks = [item.strip().upper() for item in args.blocks.split(",") if item.strip()]
    if not selected_blocks or any(block not in CORPUS for block in selected_blocks):
        raise SystemExit("blocks must be a comma-separated subset of Q1..Q10")

    bank = runtime_app._load_bank()
    voice = runtime_app._voice_entry(bank, args.voice_id)
    if voice.get("status") not in runtime_app.ALLOWED_READY_STATES:
        raise SystemExit("voice is not LAB_READY/PREPROD_READY in the private merged registry")
    if voice.get("company_id") != args.company_id:
        raise SystemExit("cross_company_voice_denied")
    if not voice.get("consent_ref") and not voice.get("license"):
        raise SystemExit("consent_or_license_missing")

    reference_ref = voice.get("reference_ref")
    expected_sha = str(voice.get("reference_sha256") or "").lower()
    if not reference_ref or not expected_sha:
        raise SystemExit("reference_contract_incomplete")
    reference_path = runtime_app._safe_reference_path(str(reference_ref))
    if runtime_app._sha256(reference_path) != expected_sha:
        raise SystemExit("reference_checksum_mismatch")

    torch_module = None
    try:
        import torch as torch_module
    except Exception:
        torch_module = None

    if torch_module is not None and runtime_app.DEVICE.startswith("cuda") and torch_module.cuda.is_available():
        torch_module.cuda.reset_peak_memory_stats()

    model_load_started = time.perf_counter()
    with ResourceMonitor() as load_monitor:
        model = runtime_app._get_model()
    model_load_ms = int((time.perf_counter() - model_load_started) * 1000)

    records = []
    all_generation_ms: list[float] = []
    all_rtf: list[float] = []
    run_started = datetime.now(timezone.utc).isoformat()

    for repeat in range(1, args.repeats + 1):
        for block in selected_blocks:
            text = CORPUS[block]
            if torch_module is not None and runtime_app.DEVICE.startswith("cuda") and torch_module.cuda.is_available():
                torch_module.cuda.reset_peak_memory_stats()

            started = time.perf_counter()
            with ResourceMonitor() as monitor:
                wav = model.generate(text, language_id="es", audio_prompt_path=str(reference_path))
                audio = wav.detach().cpu().squeeze().numpy()
            generation_ms = int((time.perf_counter() - started) * 1000)
            sample_rate = int(model.sr)
            audio_seconds = float(len(audio) / sample_rate) if sample_rate else 0.0
            rtf = (generation_ms / 1000.0) / audio_seconds if audio_seconds > 0 else None

            filename = f"{args.voice_id}_{block}_r{repeat}.wav"
            output_path = output_dir / filename
            sf.write(output_path, audio, sample_rate, format="WAV", subtype="PCM_16")

            gpu_vram_peak_mb = None
            if torch_module is not None and runtime_app.DEVICE.startswith("cuda") and torch_module.cuda.is_available():
                gpu_vram_peak_mb = round(torch_module.cuda.max_memory_allocated() / (1024**2), 2)

            record = {
                "block": block,
                "repeat": repeat,
                "text_sha256": sha256_bytes(text.encode("utf-8")),
                "generation_ms_total": generation_ms,
                "audio_seconds": round(audio_seconds, 3),
                "real_time_factor": round(rtf, 4) if rtf is not None else None,
                "cpu_peak_pct": round(monitor.cpu_peak_pct, 2),
                "ram_peak_mb": round(monitor.ram_peak_mb, 2),
                "gpu_vram_peak_mb": gpu_vram_peak_mb,
                "sample_rate": sample_rate,
                "output_file": filename,
                "output_sha256": sha256_path(output_path),
                "output_bytes": output_path.stat().st_size,
            }
            records.append(record)
            all_generation_ms.append(float(generation_ms))
            if rtf is not None:
                all_rtf.append(float(rtf))

    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": runtime_app.ENVIRONMENT,
        "status": "MEASURED_NOT_ACCEPTED",
        "company_id": args.company_id,
        "voice_id": args.voice_id,
        "locale": "es-ES",
        "backend": runtime_app.BACKEND,
        "device": runtime_app.DEVICE,
        "model_package_version": package_version("chatterbox-tts"),
        "reference_sha256": expected_sha,
        "run_started_at": run_started,
        "model_load_ms": model_load_ms,
        "model_load_cpu_peak_pct": round(load_monitor.cpu_peak_pct, 2),
        "model_load_ram_peak_mb": round(load_monitor.ram_peak_mb, 2),
        "repeats": args.repeats,
        "blocks": selected_blocks,
        "summary": {
            "samples": len(records),
            "generation_ms_median": round(statistics.median(all_generation_ms), 2) if all_generation_ms else None,
            "generation_ms_p95": round(percentile_95(all_generation_ms), 2) if all_generation_ms else None,
            "real_time_factor_median": round(statistics.median(all_rtf), 4) if all_rtf else None,
            "real_time_factor_p95": round(percentile_95(all_rtf), 4) if all_rtf else None,
        },
        "records": records,
        "acceptance": {
            "accent_es_es": "REVIEW",
            "intelligibility": None,
            "naturalness": None,
            "speaker_similarity": None,
            "prosody": None,
            "numbers_dates": "REVIEW",
            "proper_nouns": "REVIEW",
            "hallucination_count": None,
            "repetition_count": None,
            "truncation_count": None,
        },
        "authority": {
            "automatic_promotion": False,
            "prod_enabled": False,
            "prod_writes": False,
            "public_clone_enabled": False,
            "paid_api_required": False,
        },
        "notes": [
            "Generated audio and evidence remain outside Git.",
            "A successful benchmark does not promote the voice.",
            "Physical listening review is mandatory before PREPROD_READY.",
        ],
    }

    evidence_path = output_dir / "benchmark.json"
    evidence_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": evidence["status"],
        "voice_id": args.voice_id,
        "samples": len(records),
        "benchmark_file": str(evidence_path),
        "automatic_promotion": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
