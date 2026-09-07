#!/usr/bin/env python3
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "schemas" / "engine-manifest.schema.json"
REGISTRY = ROOT / "registry" / "engine-registry.json"

REQUIRED = {
    "engine_id", "name", "layer", "company_scope", "company_id", "environment", "version",
    "status", "objective", "inputs", "outputs", "data_contracts", "permissions", "policies",
    "events_in", "events_out", "tests", "evaluation", "observability", "cost_budget",
    "backup", "rollback", "rebuild", "dependencies", "autonomy_level", "human_exception_codes"
}
VALID_ENV = {"LOCAL", "LAB", "DEV", "PREPROD", "PROD"}
VALID_SCOPE = {"GLOBAL_ONLY", "GLOBAL_OR_SCOPED", "COMPANY_SCOPED"}
VALID_STATUS = {"CONFIRMED_OPERATIONAL", "DOCUMENTED_PARTIAL", "DEFINED_NOT_BUILT", "PROPOSED", "UNKNOWN_REQUIRES_AUDIT", "PRIORITY_0"}
VALID_HUMAN = {
    "LEGAL_REQUIRED", "SIGNATURE_REQUIRED", "LOW_CONFIDENCE", "HIGH_RISK", "POLICY_CONFLICT",
    "SECURITY_INCIDENT", "MONEY_LIMIT", "CUSTOMER_HUMAN_REQUEST", "MISSING_CREDENTIAL",
    "EXPIRED_OR_REVOKED_CREDENTIAL", "MFA_REQUIRED", "PERMISSION_REQUIRED", "IRREVERSIBLE_PROD_RISK"
}


def load(path: pathlib.Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def validate_manifest(data, path):
    errors = []
    missing = sorted(REQUIRED - data.keys())
    if missing:
        errors.append(f"missing required fields: {', '.join(missing)}")
    if data.get("environment") not in VALID_ENV:
        errors.append("invalid environment")
    if data.get("company_scope") not in VALID_SCOPE:
        errors.append("invalid company_scope")
    if data.get("status") not in VALID_STATUS:
        errors.append("invalid status")
    if data.get("company_scope") == "COMPANY_SCOPED" and not data.get("company_id"):
        errors.append("COMPANY_SCOPED requires company_id")
    budget = data.get("cost_budget", {})
    if budget.get("additional_monthly_eur_target") != 0:
        errors.append("V0 requires additional_monthly_eur_target=0")
    unknown_human = sorted(set(data.get("human_exception_codes", [])) - VALID_HUMAN)
    if unknown_human:
        errors.append(f"unknown human exception codes: {', '.join(unknown_human)}")
    for field in ("backup", "rollback", "rebuild"):
        if not isinstance(data.get(field), dict) or not data.get(field):
            errors.append(f"{field} must be declared")
    return [f"{path}: {e}" for e in errors]


def main():
    errors = []
    _ = load(SCHEMA)
    registry = load(REGISTRY)
    seen = set()
    for entry in registry.get("engines", []):
        engine_id = entry.get("engine_id")
        if engine_id in seen:
            errors.append(f"registry duplicate engine_id: {engine_id}")
            continue
        seen.add(engine_id)
        manifest_path = (REGISTRY.parent / entry["manifest"]).resolve()
        if not manifest_path.exists():
            errors.append(f"manifest missing: {manifest_path}")
            continue
        data = load(manifest_path)
        errors.extend(validate_manifest(data, manifest_path))
        if data.get("engine_id") != engine_id:
            errors.append(f"registry/manifest engine_id mismatch: {engine_id} != {data.get('engine_id')}")
        if data.get("status") != entry.get("status"):
            errors.append(f"registry/manifest status mismatch for {engine_id}")
    if errors:
        for e in errors:
            print(f"ERROR: {e}")
        return 1
    print(f"OK: {len(seen)} registered engine manifests validated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
