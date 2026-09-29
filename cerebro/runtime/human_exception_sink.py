"""CEREBRO HUMAN_REQUIRED -> Notion control-plane sink.

Runtime-facing adapter. It keeps Supervisor planning pure and performs only an
idempotent upsert into the existing Human Exception Queue when a canonical
HUMAN_REQUIRED decision exists. No delete, no PROD mutation, no secret storage.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import os
import urllib.error
import urllib.request
from typing import Any, Callable

from cerebro.runtime.supervisor_cycle import SupervisorPlan

HEX_DS = "66843d2a-4e67-40f9-93d0-a66ea091d436"
NOTION_VERSION = "2025-09-03"
CANONICAL_CODES = {
    "LEGAL_REQUIRED",
    "SIGNATURE_REQUIRED",
    "LOW_CONFIDENCE",
    "HIGH_RISK",
    "POLICY_CONFLICT",
    "SECURITY_INCIDENT",
    "MONEY_LIMIT",
    "CUSTOMER_HUMAN_REQUEST",
}


@dataclass(frozen=True)
class HumanExceptionEvent:
    event_id: str
    company_id: str
    engine_id: str
    environment: str
    version: str
    code: str
    decision: str
    signal_ids: tuple[str, ...]


class HumanExceptionSinkError(RuntimeError):
    pass


def from_supervisor_plan(plan: SupervisorPlan, *, event_id: str) -> HumanExceptionEvent | None:
    if not plan.requires_human:
        return None
    code = str(plan.human_required_reason or "")
    if code not in CANONICAL_CODES:
        raise HumanExceptionSinkError(f"noncanonical HUMAN_REQUIRED code: {code}")
    source_engine = plan.engine_ids[0] if len(plan.engine_ids) == 1 else "SUPERVISOR-001"
    return HumanExceptionEvent(
        event_id=str(event_id),
        company_id=plan.company_id,
        engine_id=source_engine,
        environment=plan.environment,
        version=plan.version,
        code=code,
        decision=plan.guard_decision,
        signal_ids=plan.signal_ids,
    )


def notion_properties(event: HumanExceptionEvent) -> dict[str, Any]:
    priority = "Crítica" if event.code in {"SECURITY_INCIDENT", "HIGH_RISK"} else "Alta"
    description = (
        f"Supervisor bloqueó ejecución: {event.decision}. "
        f"signals={','.join(event.signal_ids) if event.signal_ids else 'none'}"
    )
    return {
        "Ticket": {"title": [{"type": "text", "text": {"content": event.event_id[:2000]}}]},
        "Human Exception Code": {"select": {"name": event.code}},
        "Company ID": {"rich_text": [{"type": "text", "text": {"content": event.company_id[:2000]}}]},
        "Engine ID": {"rich_text": [{"type": "text", "text": {"content": event.engine_id[:2000]}}]},
        "Environment": {"select": {"name": event.environment if event.environment in {"GLOBAL", "LAB", "PREPROD", "PROD"} else "GLOBAL"}},
        "Version": {"rich_text": [{"type": "text", "text": {"content": event.version[:2000]}}]},
        "Clave idempotencia": {"rich_text": [{"type": "text", "text": {"content": event.event_id[:2000]}}]},
        "Descripción": {"rich_text": [{"type": "text", "text": {"content": description[:2000]}}]},
        "Motivo escalado": {"rich_text": [{"type": "text", "text": {"content": event.decision[:2000]}}]},
        "Origen": {"select": {"name": "Supervisor"}},
        "Prioridad": {"select": {"name": priority}},
        "Estado": {"select": {"name": "Escalado"}},
        "Requiere escalado": {"checkbox": True},
        "Bloqueante": {"checkbox": True},
        "Es TEST": {"checkbox": event.environment != "PROD"},
        "Escalado a": {"select": {"name": "Según dominio"}},
    }


def _http(token: str, path: str, method: str, payload: dict[str, Any]) -> dict[str, Any]:
    req = urllib.request.Request(
        "https://api.notion.com/v1" + path,
        data=json.dumps(payload).encode("utf-8"),
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
            "User-Agent": "CEREBRO-Human-Exception-Sink/0.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HumanExceptionSinkError(f"notion_http_{exc.code}:{detail[:400]}") from exc


def publish(
    event: HumanExceptionEvent,
    *,
    token: str | None = None,
    transport: Callable[[str, str, dict[str, Any]], dict[str, Any]] | None = None,
) -> str:
    if event.code not in CANONICAL_CODES:
        raise HumanExceptionSinkError("noncanonical HUMAN_REQUIRED code")
    properties = notion_properties(event)
    token = token if token is not None else os.environ.get("NOTION_TOKEN", "")
    if transport is None:
        if not token:
            raise HumanExceptionSinkError("NOTION_TOKEN missing")
        transport = lambda path, method, payload: _http(token, path, method, payload)

    query = transport(
        f"/data_sources/{HEX_DS}/query",
        "POST",
        {
            "page_size": 2,
            "filter": {
                "property": "Clave idempotencia",
                "rich_text": {"equals": event.event_id},
            },
        },
    )
    rows = query.get("results") or []
    if len(rows) > 1:
        raise HumanExceptionSinkError("duplicate HUMAN_REQUIRED rows for idempotency key")
    if rows:
        transport(f"/pages/{rows[0]['id']}", "PATCH", {"properties": properties})
        return "updated"
    transport("/pages", "POST", {"parent": {"data_source_id": HEX_DS}, "properties": properties})
    return "created"


def publish_supervisor_plan(plan: SupervisorPlan, *, event_id: str, token: str | None = None) -> str:
    event = from_supervisor_plan(plan, event_id=event_id)
    if event is None:
        return "noop"
    return publish(event, token=token)
