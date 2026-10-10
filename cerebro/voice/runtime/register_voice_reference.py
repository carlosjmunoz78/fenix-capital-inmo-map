"""Register an authorized voice reference into the private VOICE-001 registry.

No network calls. No Git writes. LAB/PREPROD only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

VOICE_ID_RE = re.compile(r"^ES[FM][0-9]{2}$")
ALLOWED_PROVENANCE = {"OWNER_RECORDED", "EMPLOYEE_CONSENTED", "LICENSED_VOICE_ASSET", "SYNTHETIC_OWNED"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path, default: dict) -> dict:
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Register an authorized VOICE-001 es-ES reference")
    parser.add_argument("--voice-id", required=True)
    parser.add_argument("--company-id", required=True)
    parser.add_argument("--audio", required=True)
    parser.add_argument("--provenance", required=True, choices=sorted(ALLOWED_PROVENANCE))
    parser.add_argument("--consent-ref")
    parser.add_argument("--license")
    parser.add_argument("--verified-by", required=True)
    parser.add_argument("--ref-root", default=os.getenv("CEREBRO_VOICE_REF_ROOT", ".private-refs"))
    parser.add_argument("--private-registry", default=os.getenv("CEREBRO_VOICE_PRIVATE_REGISTRY"))
    args = parser.parse_args()

    if not VOICE_ID_RE.fullmatch(args.voice_id):
        raise SystemExit("invalid voice_id")
    if not args.company_id.strip():
        raise SystemExit("company_id required")
    if not args.consent_ref and not args.license:
        raise SystemExit("consent_ref or license required")
    if args.provenance in {"OWNER_RECORDED", "EMPLOYEE_CONSENTED"} and not args.consent_ref:
        raise SystemExit("explicit consent_ref required for a real recorded speaker")

    source = Path(args.audio).expanduser().resolve()
    if not source.is_file():
        raise SystemExit("audio file not found")
    if source.suffix.lower() != ".wav":
        raise SystemExit("V0 accepts WAV references only")
    if source.stat().st_size <= 1024:
        raise SystemExit("audio reference is too small")

    root = Path(args.ref_root).expanduser().resolve()
    registry_path = Path(args.private_registry).expanduser().resolve() if args.private_registry else root / "registry.private.json"
    digest = sha256(source)
    relative = Path(args.company_id) / args.voice_id / f"{digest}.wav"
    destination = (root / relative).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)

    registry = load_json(registry_path, {
        "schema_version": "0.1.0",
        "engine_id": "VOICE-001",
        "environment": "LAB",
        "voices": []
    })
    if registry.get("engine_id") != "VOICE-001" or registry.get("environment") == "PROD":
        raise SystemExit("private registry contract invalid")

    now = datetime.now(timezone.utc).isoformat()
    record = {
        "voice_id": args.voice_id,
        "company_id": args.company_id,
        "status": "LAB_READY",
        "reference_ref": relative.as_posix(),
        "reference_sha256": digest,
        "provenance": args.provenance,
        "consent_ref": args.consent_ref,
        "license": args.license,
        "verified_by": args.verified_by,
        "verified_at": now,
        "model_version": None,
        "qa": {}
    }
    voices = [item for item in registry.get("voices", []) if item.get("voice_id") != args.voice_id]
    voices.append(record)
    registry["voices"] = sorted(voices, key=lambda item: item["voice_id"])
    atomic_json(registry_path, registry)

    print(json.dumps({
        "status": "LAB_READY",
        "voice_id": args.voice_id,
        "company_id": args.company_id,
        "reference_sha256": digest,
        "reference_ref": relative.as_posix(),
        "private_registry": str(registry_path)
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
