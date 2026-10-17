"""Minimal Brevo Marketing API adapter for CEREBRO newsletters.

No secret is stored in code. BREVO_API_KEY must be injected by the runtime.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Callable

from cerebro.runtime.brevo_newsletter_contract import BREVO_API_BASE, validate_provider


class BrevoError(RuntimeError):
    pass


def _http(api_key: str, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if not api_key:
        raise BrevoError("MISSING_CREDENTIAL:BREVO_API_KEY")
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BREVO_API_BASE + path,
        method=method,
        data=data,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "CEREBRO-Brevo-Newsletter/0.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return {"status_code": response.status, "body": json.loads(raw) if raw else {}}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise BrevoError(f"brevo_http_{exc.code}:{detail[:500]}") from exc


class BrevoNewsletterAdapter:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        transport: Callable[[str, str, dict[str, Any] | None], dict[str, Any]] | None = None,
    ) -> None:
        validate_provider("brevo")
        self.api_key = api_key if api_key is not None else os.environ.get("BREVO_API_KEY", "")
        self.transport = transport or (lambda method, path, payload=None: _http(self.api_key, method, path, payload))

    def upsert_contact(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.transport("POST", "/contacts", payload)

    def list_lists(self) -> dict[str, Any]:
        return self.transport("GET", "/contacts/lists?limit=50", None)

    def create_campaign(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.transport("POST", "/emailCampaigns", payload)

    def get_campaign(self, campaign_id: int) -> dict[str, Any]:
        return self.transport("GET", f"/emailCampaigns/{int(campaign_id)}", None)

    def update_campaign(self, campaign_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return self.transport("PUT", f"/emailCampaigns/{int(campaign_id)}", payload)

    def send_now(self, campaign_id: int) -> dict[str, Any]:
        return self.transport("POST", f"/emailCampaigns/{int(campaign_id)}/sendNow", {})
