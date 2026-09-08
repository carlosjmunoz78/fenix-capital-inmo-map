"""COMP-REG-001 · deterministic Company Registry V0.

PREPROD-only shared-runtime implementation. It stores company identity metadata,
never credentials or secret material. Persistence is a small atomic JSON file so
V0 does not consume Supabase, a new service, or a paid dependency.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import pathlib
import re
import tempfile
from typing import Any, Iterable

ENGINE_ID = "COMP-REG-001"
ENGINE_VERSION = "0.2.0"
SCHEMA_VERSION = 1
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}
COMPANY_ID_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
DOMAIN_RE = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
SECRET_KEY_PARTS = ("secret", "password", "passwd", "token", "api_key", "apikey", "credential", "private_key")
LIFECYCLE_STATES = {"REGISTERED", "ONBOARDING", "ACTIVE", "SUSPENDED", "ARCHIVED"}
TRANSITIONS = {
    "REGISTERED": {"ONBOARDING", "ARCHIVED"},
    "ONBOARDING": {"ACTIVE", "SUSPENDED", "ARCHIVED"},
    "ACTIVE": {"SUSPENDED", "ARCHIVED"},
    "SUSPENDED": {"ACTIVE", "ARCHIVED"},
    "ARCHIVED": set(),
}


class CompanyRegistryError(Exception):
    """Base deterministic registry error."""

    code = "COMPANY_REGISTRY_ERROR"
    human_required_code: str | None = None


class RegistryPolicyConflict(CompanyRegistryError):
    code = "COMPANY_ID_CONFLICT"
    human_required_code = "POLICY_CONFLICT"


class RegistrySecurityError(CompanyRegistryError):
    code = "SECRET_MATERIAL_REJECTED"
    human_required_code = "SECURITY_INCIDENT"


class RegistryNotFound(CompanyRegistryError):
    code = "COMPANY_NOT_FOUND"


class RegistryValidationError(CompanyRegistryError):
    code = "INVALID_COMPANY_RECORD"


class LifecycleTransitionError(CompanyRegistryError):
    code = "INVALID_LIFECYCLE_TRANSITION"
    human_required_code = "POLICY_CONFLICT"


def _stable_unique(values: Iterable[str]) -> list[str]:
    normalized = []
    seen = set()
    for value in values:
        item = str(value).strip()
        if item and item not in seen:
            seen.add(item)
            normalized.append(item)
    return normalized


def _contains_secret_key(value: Any, path: str = "") -> str | None:
    if isinstance(value, dict):
        for key, nested in value.items():
            key_norm = str(key).strip().lower().replace("-", "_")
            if any(part in key_norm for part in SECRET_KEY_PARTS):
                return f"{path}.{key}" if path else str(key)
            found = _contains_secret_key(nested, f"{path}.{key}" if path else str(key))
            if found:
                return found
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            found = _contains_secret_key(nested, f"{path}[{index}]")
            if found:
                return found
    return None


def _canonical_record(payload: dict[str, Any], environment: str) -> dict[str, Any]:
    forbidden = _contains_secret_key(payload)
    if forbidden:
        raise RegistrySecurityError(f"secret-like field is forbidden in Company Registry: {forbidden}")

    allowed = {
        "company_id", "legal_name", "display_name", "owner", "brands", "domains",
        "geographies", "access_refs", "lifecycle_state", "metadata",
    }
    unknown = sorted(set(payload) - allowed)
    if unknown:
        raise RegistryValidationError(f"unknown fields: {unknown}")

    company_id = str(payload.get("company_id") or "").strip().lower()
    if not COMPANY_ID_RE.fullmatch(company_id):
        raise RegistryValidationError("company_id must be a lower-case slug of 1-64 characters")

    legal_name = str(payload.get("legal_name") or "").strip()
    display_name = str(payload.get("display_name") or "").strip()
    owner = str(payload.get("owner") or "").strip()
    if not legal_name or not display_name or not owner:
        raise RegistryValidationError("legal_name, display_name and owner are required")

    brands = _stable_unique(payload.get("brands") or [])
    domains = [value.lower() for value in _stable_unique(payload.get("domains") or [])]
    invalid_domains = [domain for domain in domains if not DOMAIN_RE.fullmatch(domain)]
    if invalid_domains:
        raise RegistryValidationError(f"invalid domains: {invalid_domains}")

    geographies = _stable_unique(payload.get("geographies") or [])
    access_refs = _stable_unique(payload.get("access_refs") or [])
    if any(len(ref) > 160 or any(ch.isspace() for ch in ref) for ref in access_refs):
        raise RegistryValidationError("access_refs must be compact logical references without whitespace")

    lifecycle_state = str(payload.get("lifecycle_state") or "REGISTERED").strip().upper()
    if lifecycle_state != "REGISTERED":
        raise RegistryValidationError("new companies must enter the Registry as REGISTERED")

    metadata = payload.get("metadata") or {}
    if not isinstance(metadata, dict):
        raise RegistryValidationError("metadata must be an object")
    if _contains_secret_key(metadata):
        raise RegistrySecurityError("secret-like metadata is forbidden")

    return {
        "company_id": company_id,
        "legal_name": legal_name,
        "display_name": display_name,
        "owner": owner,
        "brands": brands,
        "domains": domains,
        "geographies": geographies,
        "access_refs": access_refs,
        "lifecycle_state": lifecycle_state,
        "environment": environment,
        "record_version": 1,
        "metadata": copy.deepcopy(metadata),
    }


class CompanyRegistry:
    """Small deterministic, multi-company metadata registry."""

    def __init__(self, storage_path: str | os.PathLike[str], environment: str = "PREPROD") -> None:
        environment = str(environment).strip().upper()
        if environment not in ALLOWED_ENVIRONMENTS:
            raise RegistryValidationError("COMP-REG-001 V0 is non-PROD only")
        self.environment = environment
        self.storage_path = pathlib.Path(storage_path)
        self._ensure_store()

    def _empty_state(self) -> dict[str, Any]:
        return {
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "schema_version": SCHEMA_VERSION,
            "environment": self.environment,
            "companies": {},
            "audit": [],
        }

    def _ensure_store(self) -> None:
        if self.storage_path.exists():
            self._load()
            return
        self._atomic_write(self._empty_state())

    def _load(self) -> dict[str, Any]:
        data = json.loads(self.storage_path.read_text(encoding="utf-8"))
        if data.get("engine_id") != ENGINE_ID or data.get("schema_version") != SCHEMA_VERSION:
            raise RegistryValidationError("unsupported Company Registry storage schema")
        if data.get("environment") != self.environment:
            raise RegistryValidationError("storage environment mismatch")
        if not isinstance(data.get("companies"), dict) or not isinstance(data.get("audit"), list):
            raise RegistryValidationError("invalid Company Registry storage structure")
        return data

    def _atomic_write(self, data: dict[str, Any]) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=self.storage_path.parent, delete=False) as handle:
            handle.write(payload)
            temp_path = pathlib.Path(handle.name)
        temp_path.replace(self.storage_path)

    @staticmethod
    def _audit(state: dict[str, Any], event: str, company_id: str, detail: dict[str, Any] | None = None) -> None:
        state["audit"].append({
            "sequence": len(state["audit"]) + 1,
            "event": event,
            "company_id": company_id,
            "detail": copy.deepcopy(detail or {}),
        })

    def register(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise RegistryValidationError("payload must be an object")
        candidate = _canonical_record(payload, self.environment)
        state = self._load()
        company_id = candidate["company_id"]
        existing = state["companies"].get(company_id)
        if existing is not None:
            if existing == candidate:
                return copy.deepcopy(existing)
            raise RegistryPolicyConflict(f"company_id {company_id} is already registered with different canonical data")

        state["companies"][company_id] = candidate
        self._audit(state, "COMPANY_REGISTERED", company_id, {"record_version": 1})
        self._atomic_write(state)
        return copy.deepcopy(candidate)

    def get(self, company_id: str) -> dict[str, Any]:
        key = str(company_id).strip().lower()
        state = self._load()
        if key not in state["companies"]:
            raise RegistryNotFound(key)
        return copy.deepcopy(state["companies"][key])

    def list_companies(self) -> list[dict[str, Any]]:
        state = self._load()
        return [copy.deepcopy(state["companies"][key]) for key in sorted(state["companies"])]

    def transition(self, company_id: str, target_state: str) -> dict[str, Any]:
        key = str(company_id).strip().lower()
        target = str(target_state).strip().upper()
        if target not in LIFECYCLE_STATES:
            raise RegistryValidationError(f"unknown lifecycle state: {target}")
        state = self._load()
        record = state["companies"].get(key)
        if record is None:
            raise RegistryNotFound(key)
        current = record["lifecycle_state"]
        if target == current:
            return copy.deepcopy(record)
        if target not in TRANSITIONS[current]:
            raise LifecycleTransitionError(f"{current} -> {target} is not allowed")
        record["lifecycle_state"] = target
        record["record_version"] = int(record.get("record_version", 1)) + 1
        self._audit(state, "COMPANY_LIFECYCLE_CHANGED", key, {"from": current, "to": target})
        self._atomic_write(state)
        return copy.deepcopy(record)

    def snapshot(self, snapshot_path: str | os.PathLike[str]) -> dict[str, Any]:
        source = self.storage_path.read_bytes()
        target = pathlib.Path(snapshot_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile("wb", dir=target.parent, delete=False) as handle:
            handle.write(source)
            temp_path = pathlib.Path(handle.name)
        temp_path.replace(target)
        return {
            "engine_id": ENGINE_ID,
            "environment": self.environment,
            "sha256": hashlib.sha256(source).hexdigest(),
            "bytes": len(source),
        }

    def restore(self, snapshot_path: str | os.PathLike[str], expected_sha256: str | None = None) -> dict[str, Any]:
        snapshot = pathlib.Path(snapshot_path)
        raw = snapshot.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if expected_sha256 and digest != expected_sha256:
            raise RegistryValidationError("snapshot checksum mismatch")
        data = json.loads(raw.decode("utf-8"))
        if data.get("engine_id") != ENGINE_ID or data.get("schema_version") != SCHEMA_VERSION:
            raise RegistryValidationError("invalid snapshot schema")
        if data.get("environment") != self.environment:
            raise RegistryValidationError("snapshot environment mismatch")
        self._atomic_write(data)
        return self.health()

    def health(self) -> dict[str, Any]:
        state = self._load()
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.environment,
            "schema_version": SCHEMA_VERSION,
            "company_count": len(state["companies"]),
            "audit_count": len(state["audit"]),
            "storage": "atomic_json_file",
            "external_cost_eur": 0,
        }

    def audit_events(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._load()["audit"])
