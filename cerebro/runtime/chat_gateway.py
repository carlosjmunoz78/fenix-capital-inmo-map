"""CHAT-001 · provider-neutral conversational gateway V0.

Prepares deterministic conversation envelopes. It never invokes a model and
never executes an action. Provider/model selection belongs behind CEREBRO Model
Router, not inside Console or CHAT-001.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any

ENGINE_ID = "CHAT-001"
ENGINE_VERSION = "0.2.0"
MAX_MESSAGE_CHARS = 20_000
COMPANY_ID_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")


class ChatValidationError(ValueError):
    code = "CHAT_INVALID"


@dataclass(frozen=True)
class ConversationEnvelope:
    request_id: str
    company_id: str
    text: str
    context_ref: str | None
    engine_id: str = ENGINE_ID
    version: str = ENGINE_VERSION
    environment: str = "PREPROD"

    def as_dict(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "company_id": self.company_id,
            "text": self.text,
            "context_ref": self.context_ref,
            "engine_id": self.engine_id,
            "version": self.version,
            "environment": self.environment,
        }


class ConversationalGateway:
    def __init__(self, environment: str = "PREPROD") -> None:
        env = str(environment or "").strip().upper()
        if env != "PREPROD":
            raise ChatValidationError("CHAT-001 V0 is PREPROD only")
        self.environment = env

    def prepare(self, *, company_id: str, text: str, context_ref: str | None = None) -> ConversationEnvelope:
        cid = str(company_id or "").strip().lower()
        if not COMPANY_ID_RE.fullmatch(cid):
            raise ChatValidationError("invalid company_id")
        normalized = str(text or "").strip()
        if not normalized:
            raise ChatValidationError("message text is required")
        if len(normalized) > MAX_MESSAGE_CHARS:
            raise ChatValidationError("message exceeds V0 size limit")
        ref = None if context_ref is None else str(context_ref).strip()
        if ref == "":
            raise ChatValidationError("context_ref cannot be blank")
        canonical = json.dumps({"company_id": cid, "text": normalized, "context_ref": ref}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        request_id = "chat-" + hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]
        return ConversationEnvelope(request_id=request_id, company_id=cid, text=normalized, context_ref=ref)

    def health(self) -> dict[str, Any]:
        return {
            "ok": True,
            "engine_id": ENGINE_ID,
            "engine_version": ENGINE_VERSION,
            "environment": self.environment,
            "provider_binding": "NONE",
            "model_binding": "NONE",
            "action_execution": "DENY",
            "external_cost_eur": 0,
            "prod_enabled": False,
        }
