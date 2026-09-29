"""Versioned company configuration loader for WordPress adapters."""
from __future__ import annotations

import json
import pathlib
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
CONFIG_ROOT = ROOT / "config" / "wordpress"


class CompanyWordPressConfigError(RuntimeError):
    pass


def load_company_wordpress_config(company_id: str) -> dict[str, Any]:
    if not company_id or "/" in company_id or "\\" in company_id:
        raise CompanyWordPressConfigError("invalid company_id")
    path = CONFIG_ROOT / f"{company_id}.json"
    if not path.exists():
        raise CompanyWordPressConfigError(f"company config not found: {company_id}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("company_id") != company_id:
        raise CompanyWordPressConfigError("company_id mismatch")
    if data.get("policies", {}).get("additional_cost_eur_target") != 0:
        raise CompanyWordPressConfigError("additional cost target must remain zero")
    if data.get("policies", {}).get("prod_writes_default") != "DENY":
        raise CompanyWordPressConfigError("prod writes must default DENY")
    streams = data.get("newsletter_streams") or []
    stream_ids = [str(x.get("stream_id") or "") for x in streams]
    if any(not value for value in stream_ids) or len(stream_ids) != len(set(stream_ids)):
        raise CompanyWordPressConfigError("newsletter stream ids must be present and unique")
    if any(str(x.get("cadence") or "") not in {"WEEKLY", "MONTHLY", "MANUAL"} for x in streams):
        raise CompanyWordPressConfigError("invalid newsletter cadence")
    if any(x.get("send_enabled") is not False for x in streams):
        raise CompanyWordPressConfigError("newsletter send cannot be enabled before provider promotion")
    return data
