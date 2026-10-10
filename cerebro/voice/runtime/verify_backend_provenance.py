"""Verify installed VOICE-001 backend packages came from reviewed source commits.

Fail closed before model loading if either direct-VCS dependency drifts. This
reads Python package metadata only; it performs no network call and emits no
credentials.
"""

from __future__ import annotations

import importlib.metadata
import json

EXPECTED = {
    "chatterbox-tts": {
        "repository_url": "https://github.com/resemble-ai/chatterbox.git",
        "commit_id": "5de7a54aa4e5e2baadb0182dde554908b48b85c2",
    },
    "resemble-perth": {
        "repository_url": "https://github.com/resemble-ai/Perth.git",
        "commit_id": "ff1c8ac55a976971245cdd53c18d6131ca00d993",
    },
}


def normalize_url(value: str) -> str:
    return value.rstrip("/").lower()


def direct_url(package: str) -> dict:
    distribution = importlib.metadata.distribution(package)
    raw = distribution.read_text("direct_url.json")
    if not raw:
        raise RuntimeError(f"{package}:direct_url_metadata_missing")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{package}:direct_url_metadata_invalid") from exc


def verify() -> dict:
    evidence = {}
    for package, expected in EXPECTED.items():
        metadata = direct_url(package)
        url = str(metadata.get("url") or "")
        vcs_info = metadata.get("vcs_info") or {}
        commit_id = str(vcs_info.get("commit_id") or "").lower()
        vcs = str(vcs_info.get("vcs") or "").lower()
        requested_revision = str(vcs_info.get("requested_revision") or "")

        if vcs != "git":
            raise RuntimeError(f"{package}:unexpected_vcs")
        if normalize_url(url) != normalize_url(expected["repository_url"]):
            raise RuntimeError(f"{package}:repository_drift")
        if commit_id != expected["commit_id"].lower():
            raise RuntimeError(f"{package}:commit_drift")

        evidence[package] = {
            "repository_url": expected["repository_url"],
            "commit_id": expected["commit_id"],
            "requested_revision": requested_revision,
            "verified": True,
        }

    return {
        "status": "GREEN",
        "engine_id": "VOICE-001",
        "network_used": False,
        "packages": evidence,
    }


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=False))
