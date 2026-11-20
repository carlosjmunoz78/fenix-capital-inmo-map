#!/usr/bin/env python3
"""UMS-001: credential-only health check for Replicate API in LAB.

It NEVER creates predictions or prints secrets, account identifiers or API responses.
Runner env supplies REPLICATE_API_TOKEN through GitHub encrypted secrets.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

API_BASE = "https://api.replicate.com/v1/"
MODEL = "black-forest-labs/flux-1.1-pro"


def get_safe_json(route, token, opener=urllib.request.urlopen):
    request = urllib.request.Request(
        API_BASE + route,
        method="GET",
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/json",
            "User-Agent": "CEREBRO-UMS001-REPLICATE-HEALTH-LAB/1.0",
        },
    )
    try:
        with opener(request, timeout=12) as resp:
            if resp.status != 200:
                return int(resp.status), {}
            data = json.loads(resp.read(160_000))
            return 200, data if isinstance(data, dict) else {}
    except urllib.error.HTTPError as error:
        # Never print the response body or URL, to avoid provider-side leakage.
        return int(error.code), {}
    except (ValueError, TypeError, TimeoutError, OSError):
        return 0, {}


def healthcheck(token, opener=urllib.request.urlopen):
    report = {
        "company_id": "fenix",
        "engine_id": "UMS-001",
        "environment": "LAB",
        "provider": "REPLICATE",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "mode": "READ_ONLY_ZERO_PREDICTIONS",
        "paid_execution_enabled": False,
        "publications_enabled": False,
        "account_http": None,
        "model_http": None,
        "status": "BLOCKED_SECRET_MISSING",
        "cost_eur": 0,
    }
    if not isinstance(token, str) or not token.startswith("r8_") or len(token) < 20:
        return report
    account_code, account = get_safe_json("account", token, opener)
    model_code, model = get_safe_json("models/" + MODEL, token, opener)
    ok = account_code == 200 and account.get("type") in ("user", "organization")
    ok = ok and model_code == 200 and model.get("owner") == "black-forest-labs"
    ok = ok and model.get("name") == "flux-1.1-pro"
    report["account_http"] = account_code
    report["model_http"] = model_code
    report["status"] = "AUTH_AND_MODEL_GREEN" if ok else "AUTH_OR_MODEL_BLOCKED"
    return report


def main():
    report = healthcheck(os.environ.get("REPLICATE_API_TOKEN", ""))
    # Only a fixed dictionary is printed; never log token, identity or provider payload.
    print("REPLICATE_HEALTH_STATUS=" + report["status"])
    print("REPLICATE_ACCOUNT_HTTP=" + str(report["account_http"]))
    print("REPLICATE_MODEL_HTTP=" + str(report["model_http"]))
    print("REPLICATE_PREDICTIONS_SUBMITTED=0")
    summary = os.environ.get("GITHUB_STEP_SUMMARY", "")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write("### CEREBRO UMS-001 · Replicate credential (LAB, read only)\n")
            handle.write("| Scope | Result |\n|---|---|\n")
            for field in ("environment", "status", "account_http", "model_http", "paid_execution_enabled", "cost_eur"):
                handle.write("| " + field + " | " + str(report[field]) + " |\n")
            handle.write("\nNo prediction created. No secret or account information included.\n")
    path = os.environ.get("HEALTH_REPORT_FILE", "")
    if path:
        p = pathlib.Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 0 if report["status"] == "AUTH_AND_MODEL_GREEN" else 2


if __name__ == "__main__":
    sys.exit(main())
