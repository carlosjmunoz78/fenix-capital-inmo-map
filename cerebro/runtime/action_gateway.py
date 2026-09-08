"""ACTGW-001 · policy-gated action execution gateway V0.

Executes only explicitly registered PREPROD read-only handlers. Mutations are
fail-closed as HIGH_RISK in V0. The gateway is model-neutral and credentialless;
connectors/engine adapters own their credentials behind explicit contracts.
"""
from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from typing import Any, Callable

from cerebro.runtime.command_router import CommandPlan
from cerebro.runtime.context_loader import LoadedContext

ENGINE_ID = "ACTGW-001"
ENGINE_VERSION = "0.2.0"
CANONICAL_HUMAN_CODES = {
    "LEGAL_REQUIRED", "SIGNATURE_REQUIRED", "LOW_CONFIDENCE", "HIGH_RISK",
    "POLICY_CONFLICT", "SECURITY_INCIDENT", "MONEY_LIMIT", "CUSTOMER_HUMAN_REQUEST",
}
OP_RE = re.compile(r"^[a-z][a-z0-9_.:-]{0,63}$")


class ActionGatewayError(Exception):
    code = "ACTGW_ERROR"


class HumanRequired(ActionGatewayError):
    code = "HUMAN_REQUIRED"

    def __init__(self, reason: str, detail: str) -> None:
        if reason not in CANONICAL_HUMAN_CODES:
            raise ValueError("noncanonical HUMAN_REQUIRED reason")
        self.human_required_code = reason
        self.detail = detail
        super().__init__(f"{reason}: {detail}")


@dataclass(frozen=True)
class HandlerSpec:
    engine_id: str
    operation: str
    effect: str
    handler: Callable[[LoadedContext, str | None], Any]


@dataclass(frozen=True)
class ActionResult:
    request_id: str
    company_id: str
    target_engine_id: str
    operation: str
    status: str
    output: Any
    audit: dict[str, Any]


class ActionExecutionGateway:
    def __init__(self, environment: str = "PREPROD") -> None:
        env = str(environment or "").strip().upper()
        if env != "PREPROD":
            raise ActionGatewayError("ACTGW-001 V0 is PREPROD only")
        self.environment = env
        self._handlers: dict[tuple[str, str], HandlerSpec] = {}

    def register_handler(self, *, engine_id: str, operation: str, effect: str, handler: Callable[[LoadedContext, str | None], Any]) -> None:
        eid = str(engine_id or "").strip().upper()
        op = str(operation or "").strip().lower()
        eff = str(effect or "").strip().upper()
        if not eid or not OP_RE.fullmatch(op) or eff not in {"READ_ONLY", "MUTATION"} or not callable(handler):
            raise ActionGatewayError("invalid handler specification")
        key = (eid, op)
        if key in self._handlers:
            raise ActionGatewayError("handler already registered")
        self._handlers[key] = HandlerSpec(eid, op, eff, handler)

    def execute(self, plan: CommandPlan, context: LoadedContext, *, idempotency_key: str | None = None) -> ActionResult:
        if plan.environment != "PREPROD" or context.tenant.environment != "PREPROD":
            raise HumanRequired("POLICY_CONFLICT", "non-PREPROD execution denied")
        if plan.company_id != context.tenant.company_id:
            raise HumanRequired("POLICY_CONFLICT", "command/context company mismatch")
        if plan.mode not in {"ENGINE_ACTION", "ORCHESTRATION"} or not plan.target_engine_id:
            raise HumanRequired("POLICY_CONFLICT", "plan is not executable by ACTGW")
        key = (plan.target_engine_id, plan.operation)
        spec = self._handlers.get(key)
        if spec is None:
            raise HumanRequired("POLICY_CONFLICT", "no explicitly authorized handler")
        if spec.effect == "MUTATION":
            if not idempotency_key or not str(idempotency_key).strip():
                raise HumanRequired("POLICY_CONFLICT", "mutation requires idempotency key")
            raise HumanRequired("HIGH_RISK", "mutation execution remains disabled in ACTGW V0")

        output = spec.handler(context, plan.arguments)
        audit = {
            "engine_id": ENGINE_ID,
            "version": ENGINE_VERSION,
            "environment": self.environment,
            "company_id": plan.company_id,
            "request_id": plan.request_id,
            "target_engine_id": plan.target_engine_id,
            "operation": plan.operation,
            "effect": spec.effect,
            "decision": "ALLOW_READ_ONLY",
        }
        return ActionResult(
            request_id=plan.request_id,
            company_id=plan.company_id,
            target_engine_id=plan.target_engine_id,
            operation=plan.operation,
            status="SUCCESS",
            output=copy.deepcopy(output),
            audit=audit,
        )

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.environment,
            "registered_handlers": len(self._handlers),
            "read_only_execution": "ALLOW_IF_REGISTERED",
            "mutation_execution": "DENY_HIGH_RISK",
            "model_binding": "NONE",
            "credential_storage": "NONE",
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
