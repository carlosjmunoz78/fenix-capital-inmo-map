#!/usr/bin/env python3
"""FACT-001 V0.4 · versioned engine update workflow.

This helper evolves an already-generated engine without overwriting its immutable
FACT-001 scaffold. It is filesystem-only, PREPROD-only in V0.4, zero-dependency,
and updates Engine Registry atomically. It never deploys, calls PROD, changes
permissions, rotates secrets, or mutates external infrastructure.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import tempfile
from typing import Any

FACTORY_ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = FACTORY_ROOT / "registry" / "engine-registry.json"
ENGINE_ID_RE = re.compile(r"^[A-Z][A-Z0-9-]{2,63}$")
SEMVER_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}
ALLOWED_STATUS = {
    "DEFINED_NOT_BUILT",
    "DOCUMENTED_PARTIAL",
    "CONFIRMED_OPERATIONAL",
    "PROPOSED",
    "UNKNOWN_REQUIRES_AUDIT",
}


def load_json(path: pathlib.Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def atomic_write(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as fh:
        fh.write(content)
        tmp = pathlib.Path(fh.name)
    tmp.replace(path)


def normalize_engine_id(value: str) -> str:
    engine_id = value.strip().upper()
    if not ENGINE_ID_RE.fullmatch(engine_id):
        raise ValueError("engine_id must match ^[A-Z][A-Z0-9-]{2,63}$")
    return engine_id


def semver_tuple(value: str) -> tuple[int, int, int]:
    match = SEMVER_RE.fullmatch(value or "")
    if not match:
        raise ValueError(f"version must be strict semver X.Y.Z: {value!r}")
    return tuple(int(part) for part in match.groups())


def registry_path_for(args: argparse.Namespace, root: pathlib.Path) -> pathlib.Path:
    return pathlib.Path(args.registry).resolve() if args.registry else root / "registry" / "engine-registry.json"


def unique_entry(registry: dict[str, Any], engine_id: str) -> dict[str, Any]:
    matches = [entry for entry in registry.get("engines", []) if entry.get("engine_id") == engine_id]
    if len(matches) != 1:
        raise ValueError(f"expected exactly one Registry entry for {engine_id}; found {len(matches)}")
    return matches[0]


def base_manifest_path(root: pathlib.Path, engine_id: str) -> pathlib.Path:
    return root / "generated" / engine_id / "engine.manifest.json"


def version_manifest_path(root: pathlib.Path, engine_id: str, version: str) -> pathlib.Path:
    return root / "versions" / engine_id / version / "engine.manifest.json"


def validate_candidate(candidate: dict[str, Any], engine_id: str) -> str:
    if candidate.get("engine_id") != engine_id:
        raise ValueError(f"candidate engine_id mismatch: {candidate.get('engine_id')} != {engine_id}")
    environment = candidate.get("environment")
    if environment not in ALLOWED_ENVIRONMENTS:
        raise ValueError("V0.4 versioned updates are PREPROD/non-PROD only")
    status = candidate.get("status")
    if status not in ALLOWED_STATUS:
        raise ValueError(f"unsupported candidate status: {status}")
    version = str(candidate.get("version") or "")
    semver_tuple(version)
    budget = candidate.get("cost_budget", {})
    if budget.get("additional_monthly_eur_target") != 0:
        raise ValueError("V0.4 requires additional_monthly_eur_target=0")
    for field in ("backup", "rollback", "rebuild"):
        if not isinstance(candidate.get(field), dict) or not candidate[field]:
            raise ValueError(f"candidate must declare {field}")
    return version


def rel_from_registry(registry_path: pathlib.Path, manifest_path: pathlib.Path) -> str:
    return pathlib.Path(pathlib.os.path.relpath(manifest_path, registry_path.parent)).as_posix()


def snapshot_entry(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "manifest": entry.get("manifest"),
        "status": entry.get("status"),
        "version": entry.get("version"),
        "environment": entry.get("environment"),
        "company_id": entry.get("company_id"),
        "source_of_truth": entry.get("source_of_truth"),
    }


def append_history(entry: dict[str, Any], snapshot: dict[str, Any]) -> None:
    history = entry.setdefault("version_history", [])
    if snapshot not in history:
        history.append(snapshot)


def command_apply(args: argparse.Namespace) -> int:
    engine_id = normalize_engine_id(args.engine_id)
    root = pathlib.Path(args.root).resolve() if args.root else FACTORY_ROOT
    registry_path = registry_path_for(args, root)
    registry = load_json(registry_path)
    entry = unique_entry(registry, engine_id)

    generated = base_manifest_path(root, engine_id)
    if not generated.exists():
        raise ValueError(f"immutable generated scaffold missing for {engine_id}")
    generated_before = generated.read_bytes()

    candidate_path = pathlib.Path(args.manifest_file).resolve()
    candidate = load_json(candidate_path)
    version = validate_candidate(candidate, engine_id)
    current_version = str(entry.get("version") or "")
    if semver_tuple(version) <= semver_tuple(current_version):
        raise ValueError(f"candidate version {version} must be greater than Registry version {current_version}")

    target = version_manifest_path(root, engine_id, version)
    target_rel = rel_from_registry(registry_path, target)
    candidate_text = dump_json(candidate)

    if target.exists():
        if target.read_text(encoding="utf-8") != candidate_text:
            print(f"CONFLICT: {engine_id} version {version} already exists with different content", file=sys.stderr)
            return 3
        if entry.get("manifest") == target_rel and entry.get("version") == version and entry.get("status") == candidate.get("status"):
            print(f"NO_CHANGE: {engine_id} already points to version {version}")
            return 0
        raise ValueError(f"version {version} exists but Registry does not point to it; use rollback/reconcile explicitly")

    plan = {
        "action": "version_apply",
        "engine_id": engine_id,
        "from_version": current_version,
        "to_version": version,
        "write": str(target),
        "registry": str(registry_path),
        "generated_scaffold": "PRESERVE",
        "deployment": "NONE",
        "prod_mutation": False,
    }
    if args.plan:
        print(dump_json(plan), end="")
        return 0

    previous = snapshot_entry(entry)
    atomic_write(target, candidate_text)
    append_history(entry, previous)
    entry.update({
        "manifest": target_rel,
        "status": candidate["status"],
        "source_of_truth": "git+versioned_update",
        "environment": candidate["environment"],
        "company_id": candidate.get("company_id"),
        "version": version,
        "factory_scaffold": rel_from_registry(registry_path, generated),
    })
    atomic_write(registry_path, dump_json(registry))

    if generated.read_bytes() != generated_before:
        raise RuntimeError("immutable generated scaffold changed unexpectedly")
    print(dump_json({**plan, "result": "APPLIED"}), end="")
    return 0


def resolve_rollback_target(root: pathlib.Path, engine_id: str, version: str) -> pathlib.Path:
    generated = base_manifest_path(root, engine_id)
    if generated.exists():
        base = load_json(generated)
        if str(base.get("version")) == version:
            return generated
    target = version_manifest_path(root, engine_id, version)
    if target.exists():
        return target
    raise ValueError(f"rollback target version {version} not found for {engine_id}")


def command_rollback(args: argparse.Namespace) -> int:
    engine_id = normalize_engine_id(args.engine_id)
    target_version = args.to_version
    semver_tuple(target_version)
    root = pathlib.Path(args.root).resolve() if args.root else FACTORY_ROOT
    registry_path = registry_path_for(args, root)
    registry = load_json(registry_path)
    entry = unique_entry(registry, engine_id)
    target_path = resolve_rollback_target(root, engine_id, target_version)
    target = load_json(target_path)
    validate_candidate(target, engine_id)
    target_rel = rel_from_registry(registry_path, target_path)

    if entry.get("version") == target_version and entry.get("manifest") == target_rel:
        print(f"NO_CHANGE: {engine_id} already at version {target_version}")
        return 0

    plan = {
        "action": "version_rollback",
        "engine_id": engine_id,
        "from_version": entry.get("version"),
        "to_version": target_version,
        "registry": str(registry_path),
        "generated_scaffold": "PRESERVE",
        "deployment": "NONE",
        "prod_mutation": False,
    }
    if args.plan:
        print(dump_json(plan), end="")
        return 0

    append_history(entry, snapshot_entry(entry))
    entry.update({
        "manifest": target_rel,
        "status": target["status"],
        "source_of_truth": "git+versioned_update" if "versions" in target_path.parts else "git",
        "environment": target["environment"],
        "company_id": target.get("company_id"),
        "version": target_version,
        "factory_scaffold": rel_from_registry(registry_path, base_manifest_path(root, engine_id)),
    })
    atomic_write(registry_path, dump_json(registry))
    print(dump_json({**plan, "result": "ROLLED_BACK"}), end="")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="version_engine", description="FACT-001 V0.4 versioned engine updates")
    sub = p.add_subparsers(dest="command", required=True)

    apply = sub.add_parser("apply", help="Register a higher non-PROD engine manifest version without overwriting its scaffold")
    apply.add_argument("--engine-id", required=True)
    apply.add_argument("--manifest-file", required=True)
    apply.add_argument("--root")
    apply.add_argument("--registry")
    apply.add_argument("--plan", action="store_true")
    apply.set_defaults(func=command_apply)

    rollback = sub.add_parser("rollback", help="Move Registry back to an existing version/scaffold without deleting newer versions")
    rollback.add_argument("--engine-id", required=True)
    rollback.add_argument("--to-version", required=True)
    rollback.add_argument("--root")
    rollback.add_argument("--registry")
    rollback.add_argument("--plan", action="store_true")
    rollback.set_defaults(func=command_rollback)
    return p


def main() -> int:
    args = parser().parse_args()
    try:
        return args.func(args)
    except (ValueError, KeyError, json.JSONDecodeError, OSError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
