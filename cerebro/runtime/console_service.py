"""CONSOLE-001 · CEREBRO Console V0 service interface.

Own, model-neutral interface over Company Registry, Context, Chat, Command Router
and Action Gateway. Sending a message never executes an action automatically.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.action_gateway import ActionExecutionGateway, ActionResult
from cerebro.runtime.chat_gateway import ConversationalGateway, ConversationEnvelope
from cerebro.runtime.command_router import CommandPlan, CommandRouter
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader, LoadedContext

ENGINE_ID = "CONSOLE-001"
ENGINE_VERSION = "0.2.0"


class ConsoleStateError(RuntimeError):
    code = "CONSOLE_STATE_INVALID"


@dataclass(frozen=True)
class ConsoleTurn:
    sequence: int
    company_id: str
    envelope: ConversationEnvelope
    plan: CommandPlan


class CerebroConsole:
    def __init__(
        self,
        registry: CompanyRegistry,
        context_loader: ContextLoader,
        chat_gateway: ConversationalGateway,
        command_router: CommandRouter,
        action_gateway: ActionExecutionGateway,
    ) -> None:
        self.registry = registry
        self.context_loader = context_loader
        self.chat_gateway = chat_gateway
        self.command_router = command_router
        self.action_gateway = action_gateway
        self._context: LoadedContext | None = None
        self._history: list[ConsoleTurn] = []
        self._audit: list[dict[str, Any]] = []

    def companies(self) -> list[dict[str, Any]]:
        return [
            {k: copy.deepcopy(row.get(k)) for k in ("company_id", "display_name", "lifecycle_state", "environment")}
            for row in self.registry.list_companies()
        ]

    def select_context(
        self,
        *,
        authenticated_company_id: str,
        target_company_id: str,
        subject_kind: str | None = None,
        subject_id: str | None = None,
    ) -> dict[str, Any]:
        self._context = self.context_loader.load(
            authenticated_company_id=authenticated_company_id,
            target_company_id=target_company_id,
            subject_kind=subject_kind,
            subject_id=subject_id,
        )
        self._audit_event("CONTEXT_SELECTED", {"subject": self._context.subject})
        return self._context.as_dict()

    def submit(self, text: str) -> dict[str, Any]:
        if self._context is None:
            raise ConsoleStateError("select_context is required before chat")
        context_ref = f"company:{self._context.tenant.company_id}"
        if self._context.subject:
            context_ref += f":{self._context.subject['kind']}:{self._context.subject['id']}"
        envelope = self.chat_gateway.prepare(
            company_id=self._context.tenant.company_id,
            text=text,
            context_ref=context_ref,
        )
        plan = self.command_router.route(envelope, self._context)
        turn = ConsoleTurn(len(self._history) + 1, self._context.tenant.company_id, envelope, plan)
        self._history.append(turn)
        self._audit_event("COMMAND_PLANNED", {"request_id": envelope.request_id, "mode": plan.mode, "target_engine_id": plan.target_engine_id, "operation": plan.operation})
        return {"envelope": envelope.as_dict(), "plan": plan.as_dict(), "executed": False}

    def execute_last(self, *, idempotency_key: str | None = None) -> ActionResult:
        if self._context is None or not self._history:
            raise ConsoleStateError("a planned command is required before execution")
        plan = self._history[-1].plan
        result = self.action_gateway.execute(plan, self._context, idempotency_key=idempotency_key)
        self._audit_event("ACTION_EXECUTED", {"request_id": result.request_id, "target_engine_id": result.target_engine_id, "operation": result.operation, "status": result.status})
        return result

    def history(self) -> list[dict[str, Any]]:
        return [
            {"sequence": turn.sequence, "company_id": turn.company_id, "envelope": turn.envelope.as_dict(), "plan": turn.plan.as_dict()}
            for turn in self._history
        ]

    def audit(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._audit)

    def _audit_event(self, event: str, detail: dict[str, Any]) -> None:
        self._audit.append({
            "sequence": len(self._audit) + 1,
            "event": event,
            "company_id": self._context.tenant.company_id if self._context else None,
            "detail": copy.deepcopy(detail),
        })

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": "PREPROD",
            "company_selector": True,
            "context_selector": True,
            "chat": True,
            "command_planning": True,
            "explicit_execution": True,
            "history": True,
            "audit": True,
            "direct_model_binding": "NONE",
            "gateway": "ACTGW-001",
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
