"""TENANT-001 · deterministic multi-company isolation guard V0.

Shared-runtime, PREPROD-only logical isolation. It does not create per-company
servers, databases, forks or credentials. Every scoped execution must carry an
authenticated company_id and target the same company_id; cross-company access is
deny-by-default.
"""
from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from typing import Any

ENGINE_ID = "TENANT-001"
ENGINE_VERSION = "0.2.0"
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}
COMPANY_ID_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
ENGINE_ID_RE = re.compile(r"^[A-Z][A-Z0-9-]{2,63}$")


class TenantIsolationError(Exception):
    code = "TENANT_ISOLATION_DENY"
    human_required_code: str | None = "POLICY_CONFLICT"


class TenantValidationError(TenantIsolationError):
    code = "TENANT_CONTEXT_INVALID"
    human_required_code = None


@dataclass(frozen=True)
class TenantContext:
    company_id: str
    engine_id: str
    environment: str
    version: str

    def as_dict(self) -> dict[str, str]:
        return {
            "company_id": self.company_id,
            "engine_id": self.engine_id,
            "environment": self.environment,
            "version": self.version,
        }


def _company_id(value: Any) -> str:
    result = str(value or "").strip().lower()
    if not COMPANY_ID_RE.fullmatch(result):
        raise TenantValidationError("company_id must be a canonical lower-case slug")
    return result


def _engine_id(value: Any) -> str:
    result = str(value or "").strip().upper()
    if not ENGINE_ID_RE.fullmatch(result):
        raise TenantValidationError("invalid engine_id")
    return result


def _environment(value: Any) -> str:
    result = str(value or "").strip().upper()
    if result not in ALLOWED_ENVIRONMENTS:
        raise TenantValidationError("TENANT-001 V0 is non-PROD only")
    return result


def authorize_context(
    *,
    authenticated_company_id: str,
    target_company_id: str,
    engine_id: str,
    environment: str,
    version: str,
) -> TenantContext:
    authenticated = _company_id(authenticated_company_id)
    target = _company_id(target_company_id)
    if authenticated != target:
        raise TenantIsolationError(
            f"cross-company access denied: authenticated={authenticated} target={target}"
        )
    engine = _engine_id(engine_id)
    env = _environment(environment)
    ver = str(version or "").strip()
    if not ver:
        raise TenantValidationError("version is required")
    return TenantContext(company_id=target, engine_id=engine, environment=env, version=ver)


def namespace(context: TenantContext, resource_kind: str, resource_id: str) -> str:
    kind = str(resource_kind or "").strip().lower()
    rid = str(resource_id or "").strip()
    if not kind or not rid or "/" in kind or "/" in rid:
        raise TenantValidationError("resource_kind/resource_id must be compact non-empty identifiers")
    return f"company/{context.company_id}/{kind}/{rid}"


def filter_company_records(context: TenantContext, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fail closed: a mixed-company collection is rejected, not silently filtered."""
    result: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            raise TenantValidationError("records must be objects")
        record_company = _company_id(record.get("company_id"))
        if record_company != context.company_id:
            raise TenantIsolationError("mixed-company collection rejected")
        result.append(copy.deepcopy(record))
    return result


def health() -> dict[str, Any]:
    return {
        "ok": True,
        "engine_id": ENGINE_ID,
        "engine_version": ENGINE_VERSION,
        "isolation": "deny_by_default",
        "cross_company_access": "DENY",
        "runtime": "shared",
        "external_cost_eur": 0,
        "prod_enabled": False,
    }
