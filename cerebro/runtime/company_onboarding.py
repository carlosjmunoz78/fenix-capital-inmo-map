"""COMP-ONB-001 · deterministic Company Onboarding Orchestrator V0.

PREPROD-only shared-runtime implementation. It plans and tracks the canonical
new-company pipeline without pretending downstream engines are already built,
without calling AI, without storing credentials and without enabling PROD.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import pathlib
import tempfile
from typing import Any

from cerebro.runtime.company_registry import CompanyRegistry, RegistryValidationError
from cerebro.runtime.tenant_isolation import TenantIsolationGuard

ENGINE_ID = "COMP-ONB-001"
ENGINE_VERSION = "0.2.0"
SCHEMA_VERSION = 1
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}

HUMAN_REQUIRED_CODES = {
    "LEGAL_REQUIRED",
    "SIGNATURE_REQUIRED",
    "LOW_CONFIDENCE",
    "HIGH_RISK",
    "POLICY_CONFLICT",
    "SECURITY_INCIDENT",
    "MONEY_LIMIT",
    "CUSTOMER_HUMAN_REQUEST",
}
SYSTEM_BLOCKER_CODES = {
    "MISSING_CREDENTIAL",
    "EXPIRED_OR_REVOKED_CREDENTIAL",
    "MFA_REQUIRED",
    "PERMISSION_REQUIRED",
    "IRREVERSIBLE_PROD_RISK",
}

# Canonical V0 onboarding order. COMP-ONB only orchestrates these logical engines;
# it does not auto-execute a downstream engine and never infers that a scaffold is
# operational merely because it exists.
PIPELINE = (
    "SCAN-001",
    "KW-001",
    "WAUD-001",
    "SEOBOOT-001",
    "COMPET-001",
    "MKT-002",
    "SOCAUD-001",
    "LOCALP-001",
    "MKTBOOT-001",
    "BMD-001",
    "PROC-001",
    "KBOOT-001",
    "CRMBOOT-001",
    "APPBOOT-001",
    "AUTBOOT-001",
    "TRNBOOT-001",
    "ENGACT-001",
    "COMP-HLT-001",
    "COMP-BKP-001",
    "COMP-DEP-001",
)


class OnboardingError(Exception):
    code = "COMPANY_ONBOARDING_ERROR"
    human_required_code: str | None = None


class OnboardingValidationError(OnboardingError):
    code = "INVALID_ONBOARDING_REQUEST"


class OnboardingPolicyConflict(OnboardingError):
    code = "ONBOARDING_POLICY_CONFLICT"
    human_required_code = "POLICY_CONFLICT"


class OnboardingNotFound(OnboardingError):
    code = "ONBOARDING_NOT_FOUND"


class OnboardingBlocked(OnboardingError):
    code = "ONBOARDING_BLOCKED"


def _compact_ref(value: Any, field: str) -> str:
    ref = str(value or "").strip()
    if not ref or len(ref) > 240 or any(ch in ref for ch in "\r\n\t"):
        raise OnboardingValidationError(f"{field} must be a compact non-empty reference")
    return ref


def _empty_step(engine_id: str) -> dict[str, Any]:
    return {
        "engine_id": engine_id,
        "status": "PENDING",
        "evidence_refs": [],
        "blocker": None,
    }


class CompanyOnboardingOrchestrator:
    """Deterministic onboarding state machine backed by COMP-REG + TENANT."""

    def __init__(
        self,
        registry: CompanyRegistry,
        tenant_guard: TenantIsolationGuard,
        storage_path: str | os.PathLike[str],
        environment: str = "PREPROD",
    ) -> None:
        env = str(environment or "").strip().upper()
        if env not in ALLOWED_ENVIRONMENTS:
            raise OnboardingValidationError("COMP-ONB-001 V0 is non-PROD only")
        if registry.environment != env or tenant_guard.environment != env:
            raise OnboardingValidationError("registry/tenant/onboarding environment mismatch")
        self.registry = registry
        self.tenant_guard = tenant_guard
        self.environment = env
        self.storage_path = pathlib.Path(storage_path)
        self._ensure_store()

    def _empty_state(self) -> dict[str, Any]:
        return {
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "schema_version": SCHEMA_VERSION,
            "environment": self.environment,
            "runs": {},
            "audit": [],
        }

    def _ensure_store(self) -> None:
        if self.storage_path.exists():
            self._load()
        else:
            self._atomic_write(self._empty_state())

    def _load(self) -> dict[str, Any]:
        data = json.loads(self.storage_path.read_text(encoding="utf-8"))
        if data.get("engine_id") != ENGINE_ID or data.get("schema_version") != SCHEMA_VERSION:
            raise OnboardingValidationError("unsupported onboarding storage schema")
        if data.get("environment") != self.environment:
            raise OnboardingValidationError("onboarding storage environment mismatch")
        if not isinstance(data.get("runs"), dict) or not isinstance(data.get("audit"), list):
            raise OnboardingValidationError("invalid onboarding storage structure")
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

    def _authorize(self, authenticated_company_id: str, target_company_id: str) -> str:
        context = self.tenant_guard.authorize(
            authenticated_company_id=authenticated_company_id,
            target_company_id=target_company_id,
            engine_id=ENGINE_ID,
            version=ENGINE_VERSION,
        )
        return context.company_id

    @staticmethod
    def _run_view(run: dict[str, Any]) -> dict[str, Any]:
        return copy.deepcopy(run)

    def start(self, *, authenticated_company_id: str, target_company_id: str) -> dict[str, Any]:
        company_id = self._authorize(authenticated_company_id, target_company_id)
        company = self.registry.get(company_id)
        lifecycle = company.get("lifecycle_state")
        if lifecycle not in {"REGISTERED", "ONBOARDING"}:
            raise OnboardingPolicyConflict(f"company lifecycle {lifecycle} cannot start onboarding")

        state = self._load()
        existing = state["runs"].get(company_id)
        if existing and existing.get("workflow_state") not in {"CANCELLED"}:
            return self._run_view(existing)

        if lifecycle == "REGISTERED":
            self.registry.transition(company_id, "ONBOARDING")

        steps = [_empty_step(engine_id) for engine_id in PIPELINE]
        steps[0]["status"] = "READY"
        run = {
            "run_id": f"onb-{company_id}-1",
            "company_id": company_id,
            "engine_id": ENGINE_ID,
            "version": ENGINE_VERSION,
            "environment": self.environment,
            "workflow_state": "RUNNING",
            "current_index": 0,
            "steps": steps,
            "prod_autonomy": "DENY",
            "downstream_auto_execute": False,
        }
        state["runs"][company_id] = run
        self._audit(state, "ONBOARDING_STARTED", company_id, {"run_id": run["run_id"]})
        self._atomic_write(state)
        return self._run_view(run)

    def get(self, *, authenticated_company_id: str, target_company_id: str) -> dict[str, Any]:
        company_id = self._authorize(authenticated_company_id, target_company_id)
        state = self._load()
        run = state["runs"].get(company_id)
        if run is None:
            raise OnboardingNotFound(company_id)
        return self._run_view(run)

    def plan(self, *, authenticated_company_id: str, target_company_id: str) -> dict[str, Any]:
        run = self.get(
            authenticated_company_id=authenticated_company_id,
            target_company_id=target_company_id,
        )
        return {
            "run_id": run["run_id"],
            "company_id": run["company_id"],
            "environment": run["environment"],
            "version": run["version"],
            "workflow_state": run["workflow_state"],
            "current_engine_id": run["steps"][run["current_index"]]["engine_id"] if run["current_index"] < len(run["steps"]) else None,
            "pipeline": [step["engine_id"] for step in run["steps"]],
            "downstream_auto_execute": False,
            "prod_autonomy": "DENY",
        }

    def complete_step(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        engine_id: str,
        evidence_ref: str,
    ) -> dict[str, Any]:
        company_id = self._authorize(authenticated_company_id, target_company_id)
        evidence = _compact_ref(evidence_ref, "evidence_ref")
        state = self._load()
        run = state["runs"].get(company_id)
        if run is None:
            raise OnboardingNotFound(company_id)
        if run["workflow_state"] != "RUNNING":
            raise OnboardingBlocked(f"workflow is {run['workflow_state']}")

        index = int(run["current_index"])
        if index >= len(run["steps"]):
            raise OnboardingPolicyConflict("onboarding pipeline is already complete")
        step = run["steps"][index]
        requested = str(engine_id or "").strip().upper()
        if requested != step["engine_id"]:
            raise OnboardingPolicyConflict(
                f"out-of-order completion denied: expected {step['engine_id']} got {requested}"
            )
        if step["status"] != "READY":
            raise OnboardingBlocked(f"current step is {step['status']}")

        step["status"] = "COMPLETED"
        step["evidence_refs"].append(evidence)
        step["blocker"] = None
        self._audit(state, "ONBOARDING_STEP_COMPLETED", company_id, {"engine_id": requested, "evidence_ref": evidence})

        next_index = index + 1
        run["current_index"] = next_index
        if next_index < len(run["steps"]):
            run["steps"][next_index]["status"] = "READY"
        else:
            run["workflow_state"] = "PREPROD_PIPELINE_COMPLETE"
            self._audit(state, "ONBOARDING_PREPROD_PIPELINE_COMPLETE", company_id, {"prod_autonomy": "DENY"})
        self._atomic_write(state)
        return self._run_view(run)

    def block_step(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        code: str,
        detail_ref: str,
    ) -> dict[str, Any]:
        company_id = self._authorize(authenticated_company_id, target_company_id)
        blocker_code = str(code or "").strip().upper()
        if blocker_code not in HUMAN_REQUIRED_CODES | SYSTEM_BLOCKER_CODES:
            raise OnboardingValidationError("unknown blocker code")
        detail = _compact_ref(detail_ref, "detail_ref")
        state = self._load()
        run = state["runs"].get(company_id)
        if run is None:
            raise OnboardingNotFound(company_id)
        if run["workflow_state"] != "RUNNING":
            raise OnboardingBlocked(f"workflow is {run['workflow_state']}")
        index = int(run["current_index"])
        step = run["steps"][index]
        if step["status"] != "READY":
            raise OnboardingBlocked(f"current step is {step['status']}")

        step["status"] = "BLOCKED"
        step["blocker"] = {
            "code": blocker_code,
            "kind": "HUMAN_REQUIRED" if blocker_code in HUMAN_REQUIRED_CODES else "SYSTEM_BLOCKER",
            "detail_ref": detail,
        }
        run["workflow_state"] = step["blocker"]["kind"]
        self._audit(state, "ONBOARDING_BLOCKED", company_id, {"engine_id": step["engine_id"], **step["blocker"]})
        self._atomic_write(state)
        return self._run_view(run)

    def resume(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        resolution_ref: str,
    ) -> dict[str, Any]:
        company_id = self._authorize(authenticated_company_id, target_company_id)
        resolution = _compact_ref(resolution_ref, "resolution_ref")
        state = self._load()
        run = state["runs"].get(company_id)
        if run is None:
            raise OnboardingNotFound(company_id)
        if run["workflow_state"] not in {"HUMAN_REQUIRED", "SYSTEM_BLOCKER"}:
            raise OnboardingPolicyConflict("only a blocked onboarding run can resume")
        step = run["steps"][int(run["current_index"])]
        blocker = copy.deepcopy(step.get("blocker"))
        if not blocker:
            raise OnboardingPolicyConflict("blocked workflow has no blocker record")
        step["status"] = "READY"
        step["blocker"] = None
        step["evidence_refs"].append(resolution)
        run["workflow_state"] = "RUNNING"
        self._audit(state, "ONBOARDING_RESUMED", company_id, {"engine_id": step["engine_id"], "resolved": blocker, "resolution_ref": resolution})
        self._atomic_write(state)
        return self._run_view(run)

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
        raw = pathlib.Path(snapshot_path).read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if expected_sha256 and digest != expected_sha256:
            raise OnboardingValidationError("snapshot checksum mismatch")
        data = json.loads(raw.decode("utf-8"))
        if data.get("engine_id") != ENGINE_ID or data.get("schema_version") != SCHEMA_VERSION:
            raise OnboardingValidationError("invalid onboarding snapshot schema")
        if data.get("environment") != self.environment:
            raise OnboardingValidationError("snapshot environment mismatch")
        self._atomic_write(data)
        return self.health()

    def health(self) -> dict[str, Any]:
        state = self._load()
        blocked = sum(1 for run in state["runs"].values() if run.get("workflow_state") in {"HUMAN_REQUIRED", "SYSTEM_BLOCKER"})
        complete = sum(1 for run in state["runs"].values() if run.get("workflow_state") == "PREPROD_PIPELINE_COMPLETE")
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.environment,
            "run_count": len(state["runs"]),
            "blocked_count": blocked,
            "preprod_complete_count": complete,
            "pipeline_length": len(PIPELINE),
            "downstream_auto_execute": False,
            "prod_enabled": False,
            "external_cost_eur": 0,
        }

    def audit_events(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._load()["audit"])
