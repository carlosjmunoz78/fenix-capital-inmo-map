"""Read-safe adapter contract for the existing CEREBRO Universal STAGING runtime.

The physical WordPress runtime already exists. This adapter wraps its proven
route surface without duplicating the plugin or inventing write payloads.
Protected write endpoints remain unavailable until their authenticated schemas
and policy contracts are verified.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

BASE_URL = "https://staging.fenixcapital.es"
NAMESPACE = "cerebro-universal/v1"

READ_ENDPOINTS = {
    "status": "/status",
    "capabilities": "/capabilities",
    "command_catalog": "/command/catalog",
    "queue_status": "/queue/status",
    "b3_preflight": "/b3/preflight",
    "b3_storage_observer": "/b3/storage-observer",
}

WRITE_ENDPOINTS_PRESENT_BUT_UNBOUND = {
    "batch_preview": "/batch/preview",
    "command": "/command",
    "queue_submit": "/queue/submit",
    "operation": "/operation",
}


class UniversalRestAdapterError(RuntimeError):
    pass


@dataclass(frozen=True)
class UniversalRestRequest:
    name: str
    method: str
    url: str


def build_read_request(name: str) -> UniversalRestRequest:
    path = READ_ENDPOINTS.get(name)
    if path is None:
        raise UniversalRestAdapterError(f"read endpoint is not contracted: {name}")
    return UniversalRestRequest(name=name, method="GET", url=f"{BASE_URL}/wp-json/{NAMESPACE}{path}")


def execute_read(
    name: str,
    *,
    transport: Callable[[UniversalRestRequest], dict[str, Any]],
) -> dict[str, Any]:
    request = build_read_request(name)
    result = transport(request)
    status = int(result.get("status_code") or 0)
    if status == 401:
        raise UniversalRestAdapterError("PERMISSION_REQUIRED")
    if status < 200 or status >= 300:
        raise UniversalRestAdapterError(f"unexpected_http_status:{status}")
    return result


def writes_are_bound() -> bool:
    return False
