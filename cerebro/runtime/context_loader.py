"""CTX-001 · authenticated, company-scoped context loader V0.

PREPROD-only and deterministic. Company identity comes from COMP-REG-001 and
isolation is enforced by TENANT-001 before any context is returned. No secret
material is loaded and no model/provider is invoked.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.tenant_isolation import TenantIsolationGuard, TenantContext

ENGINE_ID = "CTX-001"
ENGINE_VERSION = "0.2.0"


class ContextValidationError(ValueError):
    code = "CTX_INVALID"


@dataclass(frozen=True)
class LoadedContext:
    tenant: TenantContext
    company: dict[str, Any]
    context_type: str
    entity_ref: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "tenant": self.tenant.as_dict(),
            "company": copy.deepcopy(self.company),
            "context_type": self.context_type,
            "entity_ref": self.entity_ref,
        }


class ContextLoader:
    ALLOWED_CONTEXT_TYPES = {"company", "engine", "entity", "workflow"}

    def __init__(self, registry: CompanyRegistry, tenant_guard: TenantIsolationGuard) -> None:
        self.registry = registry
        self.tenant_guard = tenant_guard
        if registry.environment != tenant_guard.environment:
            raise ContextValidationError("registry/tenant environment mismatch")

    def load(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        context_type: str = "company",
        entity_ref: str | None = None,
    ) -> LoadedContext:
        ctype = str(context_type or "").strip().lower()
        if ctype not in self.ALLOWED_CONTEXT_TYPES:
            raise ContextValidationError("unsupported context_type")
        ref = str(entity_ref).strip() if entity_ref is not None else None
        if ctype == "entity" and not ref:
            raise ContextValidationError("entity context requires entity_ref")
        tenant = self.tenant_guard.authorize(
            authenticated_company_id=authenticated_company_id,
            target_company_id=target_company_id,
            engine_id=ENGINE_ID,
            version=ENGINE_VERSION,
        )
        company = self.registry.get(tenant.company_id)
        safe_company = {
            key: copy.deepcopy(value)
            for key, value in company.items()
            if key not in {"access_refs"}
        }
        return LoadedContext(
            tenant=tenant,
            company=safe_company,
            context_type=ctype,
            entity_ref=ref,
        )

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.registry.environment,
            "identity_source": "COMP-REG-001",
            "isolation_source": "TENANT-001",
            "secrets_loaded": False,
            "model_binding": None,
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
