"""CHAT-001 · provider-neutral conversational gateway V0.

Normalizes authenticated conversation input for CEREBRO. It has no model SDK,
provider binding, network call or action execution capability. CTX-001 supplies
company-scoped context before a conversational envelope can be created.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from cerebro.runtime.context_loader import LoadedContext

ENGINE_ID = "CHAT-001"
ENGINE_VERSION = "0.2.0"
MAX_MESSAGE_CHARS = 12000
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$")


class ChatValidationError(ValueError):
    code = "CHAT_INVALID"


@dataclass(frozen=True)
class ChatEnvelope:
    request_id: str
    company_id: str
    environment: str
    context_type: str
    message: str
    channel: str
    model_route: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "company_id": self.company_id,
            "environment": self.environment,
            "context_type": self.context_type,
            "message": self.message,
            "channel": self.channel,
            "model_route": self.model_route,
        }


def normalize_message(value: str) -> str:
    message = str(value or "").strip()
    if not message:
        raise ChatValidationError("message is required")
    if len(message) > MAX_MESSAGE_CHARS:
        raise ChatValidationError("message exceeds V0 limit")
    return message


def create_envelope(
    *,
    request_id: str,
    context: LoadedContext,
    message: str,
    channel: str = "console",
) -> ChatEnvelope:
    rid = str(request_id or "").strip()
    if not REQUEST_ID_RE.fullmatch(rid):
        raise ChatValidationError("invalid request_id")
    ch = str(channel or "").strip().lower()
    if ch not in {"console", "api", "internal"}:
        raise ChatValidationError("unsupported channel")
    if context.tenant.environment == "PROD":
        raise ChatValidationError("CHAT-001 V0 is non-PROD only")
    return ChatEnvelope(
        request_id=rid,
        company_id=context.tenant.company_id,
        environment=context.tenant.environment,
        context_type=context.context_type,
        message=normalize_message(message),
        channel=ch,
        model_route=None,
    )


def health() -> dict[str, Any]:
    return {
        "ok": True,
        "engine_id": ENGINE_ID,
        "engine_version": ENGINE_VERSION,
        "provider_neutral": True,
        "direct_model_binding": False,
        "network_calls": False,
        "executes_actions": False,
        "external_cost_eur": 0,
        "prod_enabled": False,
    }
