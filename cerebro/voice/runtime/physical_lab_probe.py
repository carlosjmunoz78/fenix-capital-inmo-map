"""VOICE-001 physical LAB host probe.

This probe records only bounded host/runtime evidence. It never prints secrets,
never loads reference audio, never performs synthesis, and refuses PROD.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import shutil
import sys
import tempfile
from pathlib import Path

SCRIPT_PATH = Path(__file__).resolve()
RUNTIME_DIR = SCRIPT_PATH.parent
VOICE_DIR = RUNTIME_DIR.parent
REPO_ROOT = SCRIPT_PATH.parents[3]
BANK_PATH = Path(os.getenv("CEREBRO_VOICE_BANK_PATH", str(VOICE_DIR / "voice-bank.v0.json"))).resolve()


def default_private_root() -> Path:
    if os.name == "nt":
        base = Path(os.getenv("LOCALAPPDATA", str(Path.home() / "AppData" / "Local")))
        return (base / "CEREBRO" / "voice-private").resolve()
    return (Path.home() / ".local" / "share" / "cerebro" / "voice-private").resolve()


def is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def atomic_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name, suffix=".tmp", dir=path.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            tmp.unlink()


def torch_capabilities() -> dict:
    result = {
        "importable": False,
        "cuda_available": False,
        "cuda_device_count": 0,
        "cuda_version": None,
        "gpu_names": [],
        "mps_available": False,
    }
    try:
        import torch

        result["importable"] = True
        result["cuda_available"] = bool(torch.cuda.is_available())
        result["cuda_device_count"] = int(torch.cuda.device_count()) if torch.cuda.is_available() else 0
        result["cuda_version"] = getattr(torch.version, "cuda", None)
        if torch.cuda.is_available():
            result["gpu_names"] = [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
        mps = getattr(torch.backends, "mps", None)
        result["mps_available"] = bool(mps and mps.is_available())
    except Exception as exc:
        result["import_error_class"] = type(exc).__name__
    return result


def load_bank_contract() -> dict:
    data = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    voices = data.get("voices", [])
    return {
        "engine_id": data.get("engine_id"),
        "environment": data.get("environment"),
        "locale": data.get("locale"),
        "prod_enabled": data.get("prod_enabled"),
        "voice_slots": len(voices),
        "feminine_slots": sum(1 for voice in voices if voice.get("presentation") == "feminine"),
        "masculine_slots": sum(1 for voice in voices if voice.get("presentation") == "masculine"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe a host for VOICE-001 physical LAB readiness")
    parser.add_argument("--output", help="Optional JSON evidence path outside the repository")
    parser.add_argument("--require-token", action="store_true")
    parser.add_argument("--require-model-package", action="store_true")
    args = parser.parse_args()

    environment = os.getenv("CEREBRO_ENVIRONMENT", "LAB").upper()
    if environment == "PROD":
        raise SystemExit("VOICE-001 physical LAB probe refuses PROD")

    private_root = Path(os.getenv("CEREBRO_VOICE_REF_ROOT", str(default_private_root()))).expanduser().resolve()
    registry_path = Path(
        os.getenv("CEREBRO_VOICE_PRIVATE_REGISTRY", str(private_root / "registry.private.json"))
    ).expanduser().resolve()
    token_present = bool(os.getenv("CEREBRO_VOICE_RUNTIME_TOKEN"))

    bank = load_bank_contract()
    private_root_outside_repo = not is_within(private_root, REPO_ROOT)
    registry_outside_repo = not is_within(registry_path, REPO_ROOT)

    disk_target = private_root.parent if private_root.parent.exists() else Path.home()
    disk = shutil.disk_usage(disk_target)
    packages = {
        name: package_version(name)
        for name in (
            "chatterbox-tts",
            "torch",
            "torchaudio",
            "fastapi",
            "uvicorn",
            "pydantic",
            "soundfile",
            "psutil",
        )
    }

    gates = {
        "environment_non_prod": environment in {"LAB", "PREPROD"},
        "python_supported": sys.version_info >= (3, 10),
        "python_311_preferred": sys.version_info[:2] == (3, 11),
        "bank_engine": bank["engine_id"] == "VOICE-001",
        "bank_locale": bank["locale"] == "es-ES",
        "bank_prod_false": bank["prod_enabled"] is False,
        "bank_20_slots": bank["voice_slots"] == 20,
        "bank_10_10_distribution": bank["feminine_slots"] == 10 and bank["masculine_slots"] == 10,
        "private_root_outside_repo": private_root_outside_repo,
        "private_registry_outside_repo": registry_outside_repo,
        "runtime_token_present": token_present,
        "model_package_present": packages["chatterbox-tts"] is not None,
    }

    required = [
        "environment_non_prod",
        "python_supported",
        "bank_engine",
        "bank_locale",
        "bank_prod_false",
        "bank_20_slots",
        "bank_10_10_distribution",
        "private_root_outside_repo",
        "private_registry_outside_repo",
    ]
    if args.require_token:
        required.append("runtime_token_present")
    if args.require_model_package:
        required.append("model_package_present")

    status = "GREEN" if all(gates[name] for name in required) else "HOLD"
    evidence = {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": environment,
        "status": status,
        "authority": {
            "prod_enabled": False,
            "prod_writes": False,
            "public_clone_enabled": False,
            "paid_api_required": False,
        },
        "host": {
            "os": platform.system(),
            "os_release": platform.release(),
            "machine": platform.machine(),
            "python": platform.python_version(),
            "python_executable_name": Path(sys.executable).name,
            "cpu_logical_count": os.cpu_count(),
            "disk_free_gb": round(disk.free / (1024**3), 2),
        },
        "packages": packages,
        "accelerators": torch_capabilities(),
        "voice_bank": bank,
        "private_storage": {
            "root_exists": private_root.exists(),
            "registry_present": registry_path.is_file(),
            "root_outside_repo": private_root_outside_repo,
            "registry_outside_repo": registry_outside_repo,
        },
        "runtime_token_present": token_present,
        "gates": gates,
        "required_gates": required,
        "notes": [
            "No secret values are emitted.",
            "No model weights are loaded by this probe.",
            "No voice audio is read or written by this probe.",
            "Python 3.11 is preferred because the selected backend is officially tested there; >=3.10 is only a package compatibility gate.",
        ],
    }

    if args.output:
        output = Path(args.output).expanduser().resolve()
        if is_within(output, REPO_ROOT):
            raise SystemExit("physical LAB evidence must remain outside Git/repository")
        atomic_json(output, evidence)

    print(json.dumps(evidence, ensure_ascii=False))
    if status != "GREEN":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
