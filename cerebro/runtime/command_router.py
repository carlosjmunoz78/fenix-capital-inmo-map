"""CMD-001 · deterministic command router V0.

Classifies an already-scoped conversation into a query or an explicit engine
request. It never executes the request. Sensitive actions remain behind
ACTGW-001 policy/permission/idempotency gates.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.chat_gateway import ConversationEnvelope
from cerebro.runtime.context_loader import LoadedContext

ENGINE_ID = "CMD-001"
ENGINE_VERSION = "0.2.0"
ENGINE_RE = re.compile(r"^[A-Z][A-Z0-9-]{2,63}$")
EXPLICIT_RE = re.compile(r"^/(run|orchestrate)\s+([A-Za-z][A-Za-z0-9-]{2,63})\s+([A-Za-z][A-Za-z0-9_.:-]{0,63})(?:\s+(.*))?$", re.S)


class CommandRoutingError(ValueError):
    code = "CMD_INVALID"
    human_required_code: str | None = None


class CommandPolicyConflict(CommandRoutingError):
    code = "CMD_POLICY_CONFLICT"
    human_required_code = "POLICY_CONFLICT"


@dataclass(frozen=True)
class CommandPlan:
    request_id: str
    company_id: str
    mode: str
    target_engine_id: str | None
    operation: str
    arguments: str | None
    environment: str = "PREPROD"
    engine_id: str = ENGINE_ID
    version: str = ENGINE_VERSION

    @property
    def executable(self) -> bool:
        return False

    def as_dict(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "company_id": self.company_id,
            "mode": self.mode,
            "target_engine_id": self.target_engine_id,
            "operation": self.operation,
            "arguments": self.arguments,
            "environment": self.environment,
            "engine_id": self.engine_id,
            "version": self.version,
            "executable": False,
        }


class CommandRouter:
    def route(self, envelope: ConversationEnvelope, context: LoadedContext) -> CommandPlan:
        if envelope.environment != "PREPROD" or context.tenant.environment != "PREPROD":
            raise CommandRoutingError("CMD-001 V0 is PREPROD only")
        if envelope.company_id != context.tenant.company_id:
            raise CommandPolicyConflict("chat/context company mismatch")

        text = envelope.text.strip()
        match = EXPLICIT_RE.fullmatch(text)
        if not match:
            return CommandPlan(
                request_id=envelope.request_id,
                company_id=envelope.company_id,
                mode="QUERY",
                target_engine_id=None,
                operation="answer",
                arguments=text,
            )

        verb, target, operation, arguments = match.groups()
        target = target.upper()
        if not ENGINE_RE.fullmatch(target):
            raise CommandRoutingError("invalid target engine_id")
        return CommandPlan(
            request_id=envelope.request_id,
            company_id=envelope.company_id,
            mode="ENGINE_ACTION" if verb == "run" else "ORCHESTRATION",
            target_engine_id=target,
            operation=operation.lower(),
            arguments=None if arguments is None else arguments.strip(),
        )

    @staticmethod
    def health() -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": "PREPROD",
            "execution": "DENY",
            "model_binding": "NONE",
            "explicit_action_syntax_required": True,
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
