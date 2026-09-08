"""BMD-001 · deterministic Business Model Discovery V0.

PREPROD-only shared-runtime discovery. It combines canonical Company Registry
metadata, SCAN-001 public evidence and explicitly declared business facts. It
never invents missing business claims and never requires a paid model.
"""
from __future__ import annotations

import copy
from typing import Any, Iterable

from cerebro.runtime.company_registry import CompanyRegistry, RegistryNotFound

ENGINE_ID = "BMD-001"
ENGINE_VERSION = "0.2.0"
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}
DIMENSIONS = (
    "services", "products", "customer_segments", "value_propositions",
    "geographies", "channels", "objectives", "restrictions",
)
SECRET_KEY_PARTS = ("secret", "password", "passwd", "token", "api_key", "apikey", "credential", "private_key")


class BusinessModelDiscoveryError(Exception):
    code = "BMD_ERROR"
    human_required_code: str | None = None


class BusinessModelValidationError(BusinessModelDiscoveryError):
    code = "BMD_INVALID_INPUT"


class BusinessModelPolicyError(BusinessModelDiscoveryError):
    code = "BMD_POLICY_CONFLICT"
    human_required_code = "POLICY_CONFLICT"


class BusinessModelSecurityError(BusinessModelDiscoveryError):
    code = "BMD_SECRET_MATERIAL_REJECTED"
    human_required_code = "SECURITY_INCIDENT"


def _stable_unique(values: Iterable[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = str(value or "").strip()
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _secret_path(value: Any, path: str = "") -> str | None:
    if isinstance(value, dict):
        for key, nested in value.items():
            k = str(key).strip().lower().replace("-", "_")
            current = f"{path}.{key}" if path else str(key)
            if any(part in k for part in SECRET_KEY_PARTS):
                return current
            found = _secret_path(nested, current)
            if found:
                return found
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            found = _secret_path(nested, f"{path}[{index}]")
            if found:
                return found
    return None


def _facts(value: Any) -> dict[str, list[str]]:
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise BusinessModelValidationError("declared_facts must be an object")
    secret = _secret_path(value)
    if secret:
        raise BusinessModelSecurityError(f"secret-like field forbidden: {secret}")
    unknown = sorted(set(value) - set(DIMENSIONS))
    if unknown:
        raise BusinessModelValidationError(f"unknown declared fact dimensions: {unknown}")
    result: dict[str, list[str]] = {}
    for dimension in DIMENSIONS:
        raw = value.get(dimension, [])
        if not isinstance(raw, list):
            raise BusinessModelValidationError(f"{dimension} must be a list")
        result[dimension] = _stable_unique(raw)
    return result


class BusinessModelDiscovery:
    """Deterministic business-profile assembler; no claim generation."""

    def __init__(self, registry: CompanyRegistry, environment: str = "PREPROD") -> None:
        env = str(environment or "").strip().upper()
        if env not in ALLOWED_ENVIRONMENTS:
            raise BusinessModelPolicyError("BMD-001 V0 is non-PROD only")
        if registry.environment != env:
            raise BusinessModelValidationError("Company Registry and BMD environment mismatch")
        self.registry = registry
        self.environment = env

    def discover(
        self,
        *,
        company_id: str,
        scan_evidence: dict[str, Any],
        declared_facts: dict[str, Any] | None,
        evidence_at: str,
    ) -> dict[str, Any]:
        company = str(company_id or "").strip().lower()
        stamp = str(evidence_at or "").strip()
        if not company or not stamp:
            raise BusinessModelValidationError("company_id and evidence_at are required")
        try:
            record = self.registry.get(company)
        except RegistryNotFound as exc:
            raise BusinessModelPolicyError("company must exist in COMP-REG-001") from exc
        if record.get("lifecycle_state") == "ARCHIVED":
            raise BusinessModelPolicyError("archived company denied")
        if not isinstance(scan_evidence, dict):
            raise BusinessModelValidationError("scan_evidence must be an object")
        if _secret_path(scan_evidence):
            raise BusinessModelSecurityError("secret-like scan evidence forbidden")
        if scan_evidence.get("engine_id") != "SCAN-001":
            raise BusinessModelValidationError("scan_evidence must originate from SCAN-001")
        if str(scan_evidence.get("company_id") or "").strip().lower() != company:
            raise BusinessModelPolicyError("cross-company scan evidence denied")
        if scan_evidence.get("read_only") is not True:
            raise BusinessModelValidationError("SCAN evidence must declare read_only=true")

        facts = _facts(declared_facts)
        facts["geographies"] = _stable_unique([*(record.get("geographies") or []), *facts["geographies"]])
        domain = str(scan_evidence.get("domain") or "").strip().lower()
        derived_channels: list[str] = []
        if domain:
            derived_channels.append(f"web:{domain}")
        socials = scan_evidence.get("social_profiles") or {}
        if not isinstance(socials, dict):
            raise BusinessModelValidationError("social_profiles must be an object")
        for network in sorted(socials):
            links = socials[network]
            if isinstance(links, list) and links:
                derived_channels.append(f"social:{network}")
        facts["channels"] = _stable_unique([*facts["channels"], *derived_channels])

        populated = [dimension for dimension in DIMENSIONS if facts[dimension]]
        missing = [dimension for dimension in DIMENSIONS if not facts[dimension]]
        completeness = round(len(populated) / len(DIMENSIONS), 3)
        human_required = "LOW_CONFIDENCE" if completeness < 0.75 else None
        status = "PARTIAL_LOW_CONFIDENCE" if human_required else "SUFFICIENT_PREPROD_PROFILE"
        evidence_refs = [
            f"comp-reg:{company}:record_version:{record.get('record_version', 1)}",
            f"scan:{scan_evidence.get('evidence_sha256', 'missing')}",
        ]
        return {
            "company_id": company,
            "engine_id": ENGINE_ID,
            "environment": self.environment,
            "version": ENGINE_VERSION,
            "evidence_at": stamp,
            "status": status,
            "business_model": copy.deepcopy(facts),
            "company_identity": {
                "legal_name": record.get("legal_name"),
                "display_name": record.get("display_name"),
                "brands": copy.deepcopy(record.get("brands") or []),
                "domains": copy.deepcopy(record.get("domains") or []),
            },
            "public_scan_signals": {
                "domain": domain,
                "technologies": copy.deepcopy(scan_evidence.get("technologies") or []),
                "social_networks": sorted(socials),
            },
            "completeness": completeness,
            "populated_dimensions": populated,
            "missing_dimensions": missing,
            "human_required_code": human_required,
            "evidence_refs": evidence_refs,
            "source_policy": "DECLARED_OR_REGISTRY_OR_PUBLIC_SCAN_ONLY",
            "inferred_claims": [],
            "additional_cost_eur": 0,
            "prod_enabled": False,
        }

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.environment,
            "mode": "deterministic_no_claim_invention",
            "identity_source": "COMP-REG-001",
            "public_evidence_source": "SCAN-001",
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
