"""MAKE-001 shadow replacement for Make scenario 9527242.

Pure deterministic reconciliation. No network, no Make, no Notion, no AI.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Any


@dataclass(frozen=True)
class ReconciliationInput:
    router: Mapping[str, Any]
    execution_log: Mapping[str, Any]
    capture: Mapping[str, Any]
    quality: Mapping[str, Any]


def reconcile_facebook_24h(inp: ReconciliationInput) -> dict[str, Any]:
    router_status = str(inp.router.get("status", ""))
    log_status = str(inp.execution_log.get("status", ""))
    capture_status = str(inp.capture.get("status", ""))
    quality_status = str(inp.quality.get("status", ""))

    if capture_status == "REJECTED_EARLY_CAPTURE":
        status = "CONSISTENT_ROLLBACK_PENDING_RECAPTURE"
        difference = "TIMEZONE_ROLLBACK_PENDING_RECAPTURE"
    elif capture_status == "CAPTURED_PARTIAL":
        if quality_status == "PARTIAL_DATA_REVIEW":
            status = "CONSISTENT_CAPTURED_PARTIAL_HOLD"
            difference = "LEARNING_BLOCKED_PARTIAL_DATA"
        else:
            status = "CAPTURE_QUALITY_MISMATCH"
            difference = "NONE"
    elif quality_status == "WAITING_CAPTURE":
        status = "CONSISTENT_WAITING_CAPTURE"
        difference = "NONE"
    else:
        status = "REVIEW_REQUIRED"
        difference = "NONE"

    requires_human = capture_status == "CAPTURED_PARTIAL"
    severity = "warning" if requires_human else "informative"

    return {
        "key": "RECONCILIATION_FACEBOOK_24H_LAST",
        "phase": "24h",
        "status": status,
        "message": (
            f"Router={router_status} | Log={log_status} | "
            f"Captura={capture_status} | Quality={quality_status} | "
            f"Notion={inp.quality.get('notion_state', '')}"
        ),
        "network": "Facebook",
        "attempts": 0,
        "severity": severity,
        "difference": difference,
        "make_state": quality_status,
        "notion_url": inp.capture.get("notion_url"),
        "environment": "TEST",
        "external_id": inp.capture.get("external_id"),
        "record_type": "reconciliation",
        "result_hash": f"{inp.capture.get('result_hash','')}|{inp.quality.get('result_hash','')}",
        "scenario_id": "CORE-RECONCILIATION-V1.1",
        "source_hash": f"{router_status}|{log_status}|{capture_status}|{quality_status}",
        "notion_state": inp.quality.get("notion_state"),
        "scenario_name": "FENIX · CORE · Reconciliación universal · V1.1",
        "operation_type": "reconciliation",
        "platform_state": inp.capture.get("platform_state"),
        "requires_human": requires_human,
        "automatic_action": "Mantener bloqueado el Cerebro y escalar solo discrepancias reales",
        "notion_record_id": inp.capture.get("notion_record_id"),
        "scenario_version": "V1.1",
    }
