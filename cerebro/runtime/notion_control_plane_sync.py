"""Event-driven Git -> Notion control-plane mirror for CEREBRO.

Source of truth stays in Git. Notion is a human-readable control plane only.
No deletes are performed. Updates are idempotent and scoped to PREPROD governance.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import urllib.error
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENGINE_REGISTRY = ROOT / "cerebro/factory/registry/engine-registry.json"
HEX_QUEUE = ROOT / "cerebro/factory/governance/human-exception-queue-2026-09-07.json"

NOTION_VERSION = "2025-09-03"
ENGINE_DS = "f9051714-19e2-462f-ac2b-c85837a672d9"
HEX_DS = "66843d2a-4e67-40f9-93d0-a66ea091d436"
GOVERNANCE_DS = "fe5594d3-6e62-4372-8a63-6ac31898bdbc"
KNOWN_SHARED_DOCUMENTATION_DS = "34037d5e-21e8-4221-b020-b0e6e1a5a14f"
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
ENGINE_STATUSES = {
    "CONFIRMED_OPERATIONAL",
    "DOCUMENTED_PARTIAL",
    "DEFINED_NOT_BUILT",
    "PROPOSED",
    "UNKNOWN_REQUIRES_AUDIT",
}
ENVIRONMENTS = {"GLOBAL", "LAB", "PREPROD", "PROD"}


class SyncError(RuntimeError):
    pass


def _text(value: Any) -> dict[str, Any]:
    s = "" if value is None else str(value)
    return {"rich_text": [{"type": "text", "text": {"content": s[:2000]}}]} if s else {"rich_text": []}


def engine_to_properties(engine: dict[str, Any], registry_version: str, sync_date: str) -> dict[str, Any]:
    status = str(engine.get("status") or "UNKNOWN_REQUIRES_AUDIT")
    if status not in ENGINE_STATUSES:
        status = "UNKNOWN_REQUIRES_AUDIT"
    environment = str(engine.get("environment") or "GLOBAL").upper()
    if environment not in ENVIRONMENTS:
        environment = "GLOBAL"
    company = str(engine.get("company_id") or "GLOBAL")
    return {
        "Engine ID": {"title": [{"type": "text", "text": {"content": str(engine["engine_id"])}}]},
        "Company ID": _text(company),
        "Environment": {"select": {"name": environment}},
        "Version": _text(engine.get("version") or ""),
        "Status": {"select": {"name": status}},
        "Source of Truth": _text(engine.get("source_of_truth") or "git"),
        "Manifest": _text(engine.get("manifest") or ""),
        "Registry Version": _text(registry_version),
        "Mirror only": {"checkbox": True},
        "Última sync": {"date": {"start": sync_date}},
    }


def _scope_engine_id(scope: Any) -> str:
    if isinstance(scope, str) and scope and "/" not in scope and scope.upper() == scope:
        return scope[:120]
    return ""


def hex_to_properties(item: dict[str, Any], queue_version: str) -> dict[str, Any]:
    code = str(item.get("code") or "")
    if code not in CANONICAL_CODES:
        raise SyncError(f"non-canonical HUMAN_REQUIRED code: {code}")
    priority = "Crítica" if code in {"SECURITY_INCIDENT", "HIGH_RISK"} else "Alta"
    blocker = bool(item.get("unit_blocking", False))
    return {
        "Ticket": {"title": [{"type": "text", "text": {"content": str(item["id"])}}]},
        "Human Exception Code": {"select": {"name": code}},
        "Company ID": _text("GLOBAL"),
        "Engine ID": _text(_scope_engine_id(item.get("scope"))),
        "Environment": {"select": {"name": "GLOBAL"}},
        "Version": _text(queue_version),
        "Clave idempotencia": _text(item["id"]),
        "Descripción": _text(item.get("required_resolution") or ""),
        "Motivo escalado": _text(item.get("blocker") or ""),
        "Resultado esperado": _text(item.get("required_resolution") or ""),
        "Origen": {"select": {"name": "Sistema"}},
        "Prioridad": {"select": {"name": priority}},
        "Estado": {"select": {"name": "Escalado"}},
        "Requiere escalado": {"checkbox": True},
        "Bloqueante": {"checkbox": blocker},
        "Es TEST": {"checkbox": False},
        "Escalado a": {"select": {"name": "Según dominio"}},
    }


class Notion:
    def __init__(self, token: str) -> None:
        if not token:
            raise SyncError("NOTION_TOKEN is required for --apply")
        self.token = token

    def request(self, path: str, method: str = "GET", payload: dict[str, Any] | None = None) -> dict[str, Any]:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.notion.com/v1" + path,
            data=body,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
                "User-Agent": "CEREBRO-Control-Plane-Sync/0.1",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise SyncError(f"notion_http_{exc.code}: {detail[:500]}") from exc

    def can_access(self, data_source_id: str) -> tuple[bool, str]:
        try:
            self.request(f"/data_sources/{data_source_id}/query", "POST", {"page_size": 1})
            return True, "OK"
        except SyncError as exc:
            return False, str(exc)

    def accessible_data_sources(self) -> list[dict[str, str]]:
        result = self.request("/search", "POST", {
            "page_size": 100,
            "filter": {"property": "object", "value": "data_source"},
            "sort": {"direction": "descending", "timestamp": "last_edited_time"},
        })
        out: list[dict[str, str]] = []
        for row in result.get("results") or []:
            title = ""
            raw_title = row.get("title") or []
            if isinstance(raw_title, list):
                title = "".join(str(x.get("plain_text") or "") for x in raw_title if isinstance(x, dict))
            out.append({"id": str(row.get("id") or ""), "title": title[:160]})
        return out

    def find_one(self, data_source_id: str, property_name: str, property_type: str, value: str) -> dict[str, Any] | None:
        payload = {
            "page_size": 2,
            "filter": {"property": property_name, property_type: {"equals": value}},
        }
        result = self.request(f"/data_sources/{data_source_id}/query", "POST", payload)
        rows = result.get("results") or []
        if len(rows) > 1:
            raise SyncError(f"duplicate Notion mirror rows for {property_name}={value}")
        return rows[0] if rows else None

    def upsert(self, data_source_id: str, key_name: str, key_type: str, key_value: str, properties: dict[str, Any]) -> str:
        existing = self.find_one(data_source_id, key_name, key_type, key_value)
        if existing:
            self.request(f"/pages/{existing['id']}", "PATCH", {"properties": properties})
            return "updated"
        self.request("/pages", "POST", {"parent": {"data_source_id": data_source_id}, "properties": properties})
        return "created"


def load_plan(sync_date: str) -> dict[str, Any]:
    registry = json.loads(ENGINE_REGISTRY.read_text(encoding="utf-8"))
    queue = json.loads(HEX_QUEUE.read_text(encoding="utf-8"))
    codes = set(queue.get("canonical_human_required_codes") or [])
    if codes != CANONICAL_CODES:
        raise SyncError("canonical HUMAN_REQUIRED code set drifted")
    engines = registry.get("engines") or []
    items = queue.get("items") or []
    return {
        "registry_version": str(registry.get("registry_version") or ""),
        "queue_version": str(queue.get("queue_version") or ""),
        "engines": [
            {"key": str(e["engine_id"]), "properties": engine_to_properties(e, str(registry.get("registry_version") or ""), sync_date)}
            for e in engines
        ],
        "exceptions": [
            {"key": str(i["id"]), "properties": hex_to_properties(i, str(queue.get("queue_version") or ""))}
            for i in items
        ],
    }


def run(apply: bool, sync_date: str) -> dict[str, Any]:
    plan = load_plan(sync_date)
    summary = {
        "ok": True,
        "mode": "APPLY" if apply else "DRY_RUN",
        "engine_count": len(plan["engines"]),
        "exception_count": len(plan["exceptions"]),
        "created": 0,
        "updated": 0,
        "deletes": 0,
        "source_of_truth": "git",
        "notion_role": "human_control_plane_mirror",
        "additional_cost_eur": 0,
    }
    if not apply:
        return summary

    notion = Notion(os.environ.get("NOTION_TOKEN", ""))
    access = {}
    for name, ds in {
        "engine_mirror": ENGINE_DS,
        "human_exception": HEX_DS,
        "governance_existing": GOVERNANCE_DS,
        "known_shared_documentation": KNOWN_SHARED_DOCUMENTATION_DS,
    }.items():
        ok, detail = notion.can_access(ds)
        access[name] = {"ok": ok, "detail": detail}
    summary["preflight"] = access
    if not access["engine_mirror"]["ok"] or not access["human_exception"]["ok"]:
        discovery = notion.accessible_data_sources()
        raise SyncError(
            "Notion control-plane target is not shared with the GitHub integration: "
            + json.dumps({"access": access, "accessible_data_sources": discovery}, sort_keys=True)
        )

    for row in plan["engines"]:
        outcome = notion.upsert(ENGINE_DS, "Engine ID", "title", row["key"], row["properties"])
        summary[outcome] += 1
    for row in plan["exceptions"]:
        outcome = notion.upsert(HEX_DS, "Clave idempotencia", "rich_text", row["key"], row["properties"])
        summary[outcome] += 1
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write idempotent mirror updates to Notion")
    parser.add_argument("--sync-date", default=os.environ.get("SYNC_DATE") or "2026-09-28")
    args = parser.parse_args()
    print(json.dumps(run(args.apply, args.sync_date), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
