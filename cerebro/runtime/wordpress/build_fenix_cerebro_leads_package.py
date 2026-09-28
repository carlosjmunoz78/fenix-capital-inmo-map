from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
SOURCE = ROOT / "runtime" / "wordpress" / "plugins" / "fenix-cerebro-leads-1.3.3.php"
PLUGIN_DIR = "fenix-cerebro-leads"
PLUGIN_FILE = "fenix-cerebro-leads.php"


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def build(out_dir: pathlib.Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / "fenix-cerebro-leads-1.3.3.zip"
    manifest_path = out_dir / "fenix-cerebro-leads-1.3.3.build.json"

    if not SOURCE.exists():
        raise SystemExit(f"missing source: {SOURCE}")

    data = SOURCE.read_bytes()
    info = zipfile.ZipInfo(f"{PLUGIN_DIR}/{PLUGIN_FILE}")
    info.date_time = (2026, 9, 28, 0, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr(info, data)

    evidence = {
        "artifact": zip_path.name,
        "engine_id": "PLUGIN-UNIVERSAL-001",
        "company_id": "fenix-capital",
        "environment": "PREPROD",
        "plugin": "Fénix CEREBRO Leads",
        "version": "1.3.3",
        "source": str(SOURCE.relative_to(ROOT.parent)),
        "source_sha256": hashlib.sha256(data).hexdigest(),
        "zip_sha256": sha256(zip_path),
        "zip_member": f"{PLUGIN_DIR}/{PLUGIN_FILE}",
        "additional_cost_eur": 0,
        "prod_deploy_authorized": False,
    }
    manifest_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return evidence


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="dist/wordpress")
    args = ap.parse_args()
    evidence = build(pathlib.Path(args.out))
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
