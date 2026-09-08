"""CTX-001 · authenticated company context loader V0.

Loads only canonical company metadata after TENANT-001 has authorized the same
company boundary. PREPROD-only, deterministic, provider/model neutral.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.tenant_isolation import TenantContext, TenantIsolationGuard

ENGINE_ID = "CTX-001"
ENGINE_VERSION = "0.2.0"
_ALLOWED_SUBJECT_KINDS = {"company", "contact", "case", "document", "task", "engine"}


class ContextValidationError(ValueError):
    code = "CTX_INVALID"


@dataclass(frozen=True)
class LoadedContext:
    tenant: TenantContext
    company: dict[str, Any]
    subject: dict[str, str] | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "company_id": self.tenant.company_id,
            "engine_id": self.tenant.engine_id,
            "environment": self.tenant.environment,
            "version": self.tenant.version,
            "company": copy.deepcopy(self.company),
            "subject": copy.deepcopy(self.subject),
        }


class ContextLoader:
    def __init__(self, registry: CompanyRegistry, tenant_guard: TenantIsolationGuard) -> None:
        self.registry = registry
        self.tenant_guard = tenant_guard
        if registry.environment != tenant_guard.environment:
            raise ContextValidationError("registry/TENANT environment mismatch")

    def load(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        subject_kind: str | None = None,
        subject_id: str | None = None,
    ) -> LoadedContext:
        tenant = self.tenant_guard.authorize(
            authenticated_company_id=authenticated_company_id,
            target_company_id=target_company_id,
            engine_id=ENGINE_ID,
            version=ENGINE_VERSION,
        )
        record = self.registry.get(tenant.company_id)
        company = {
            key: copy.deepcopy(record.get(key))
            for key in (
                "company_id", "legal_name", "display_name", "owner", "brands",
                "domains", "geographies", "access_refs", "lifecycle_state", "metadata",
            )
        }
        subject = self._subject(subject_kind, subject_id)
        return LoadedContext(tenant=tenant, company=company, subject=subject)

    @staticmethod
    def _subject(kind: str | None, subject_id: str | None) -> dict[str, str] | None:
        if kind is None and subject_id is None:
            return None
        normalized_kind = str(kind or "").strip().lower()
        normalized_id = str(subject_id or "").strip()
        if normalized_kind not in _ALLOWED_SUBJECT_KINDS or not normalized_id:
            raise ContextValidationError("subject requires allowed kind and non-empty id")
        if "/" in normalized_id:
            raise ContextValidationError("subject_id must be a compact identifier")
        return {"kind": normalized_kind, "id": normalized_id}

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.registry.environment,
            "identity_source": "COMP-REG-001",
            "isolation_source": "TENANT-001",
            "model_binding": "NONE",
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
