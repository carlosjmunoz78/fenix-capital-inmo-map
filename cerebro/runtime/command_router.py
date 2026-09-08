"""CMD-001 · deterministic command classifier/router V0.

Classifies provider-neutral CHAT-001 envelopes into QUERY, ACTION or
ORCHESTRATION. It never executes actions. Ambiguous or sensitive commands are
routed conservatively to ACTION with policy review required.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.chat_gateway import ChatEnvelope

ENGINE_ID = "CMD-001"
ENGINE_VERSION = "0.2.0"

QUERY_PREFIXES = ("show", "list", "get", "find", "search", "consulta", "muestra", "lista", "buscar", "dime")
ACTION_PREFIXES = ("create", "update", "delete", "send", "publish", "execute", "crear", "actualiza", "actualizar", "borra", "borrar", "envia", "envía", "publica", "ejecuta")
ORCHESTRATION_MARKERS = ("onboard", "pipeline", "workflow", "orquesta", "onboarding", "proceso completo", "flujo completo")
SENSITIVE_MARKERS = ("prod", "production", "real money", "dinero real", "rotate secret", "rotar secreto", "firma", "sign")


class CommandValidationError(ValueError):
    code = "CMD_INVALID"


@dataclass(frozen=True)
class CommandEnvelope:
    request_id: str
    company_id: str
    environment: str
    command_type: str
    text: str
    requires_policy_check: bool
    executes_action: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "company_id": self.company_id,
            "environment": self.environment,
            "command_type": self.command_type,
            "text": self.text,
            "requires_policy_check": self.requires_policy_check,
            "executes_action": self.executes_action,
        }


def _normalized(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().lower())


def classify(chat: ChatEnvelope) -> CommandEnvelope:
    text = _normalized(chat.message)
    if not text:
        raise CommandValidationError("empty command")
    if chat.environment == "PROD":
        raise CommandValidationError("CMD-001 V0 is non-PROD only")

    if any(marker in text for marker in ORCHESTRATION_MARKERS):
        command_type = "ORCHESTRATION"
        policy = True
    elif text.startswith(ACTION_PREFIXES):
        command_type = "ACTION"
        policy = True
    elif text.startswith(QUERY_PREFIXES) or text.endswith("?"):
        command_type = "QUERY"
        policy = False
    else:
        # Fail conservatively: an unknown imperative must never become a free query.
        command_type = "ACTION"
        policy = True

    if any(marker in text for marker in SENSITIVE_MARKERS):
        policy = True
        if command_type == "QUERY" and not text.endswith("?"):
            command_type = "ACTION"

    return CommandEnvelope(
        request_id=chat.request_id,
        company_id=chat.company_id,
        environment=chat.environment,
        command_type=command_type,
        text=chat.message,
        requires_policy_check=policy,
        executes_action=False,
    )


def health() -> dict[str, Any]:
    return {
        "ok": True,
        "engine_id": ENGINE_ID,
        "engine_version": ENGINE_VERSION,
        "deterministic": True,
        "executes_actions": False,
        "unknown_default": "ACTION_REQUIRES_POLICY",
        "external_cost_eur": 0,
        "prod_enabled": False,
    }
