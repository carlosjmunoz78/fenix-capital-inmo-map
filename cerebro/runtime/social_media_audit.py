from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
import json
from statistics import median
from typing import Any


_HUMAN_REQUIRED_CODES = {
    "LEGAL_REQUIRED", "SIGNATURE_REQUIRED", "LOW_CONFIDENCE", "HIGH_RISK",
    "POLICY_CONFLICT", "SECURITY_INCIDENT", "MONEY_LIMIT", "CUSTOMER_HUMAN_REQUEST",
}
_SECRET_KEYS = ("token", "secret", "password", "api_key", "apikey", "authorization", "credential")


@dataclass(frozen=True)
class SocialFinding:
    category: str
    severity: str
    message: str
    source_ref: str


class SocialMediaAudit:
    """Deterministic, public-evidence-only social audit for PREPROD."""

    def __init__(self, *, environment: str = "PREPROD") -> None:
        if environment != "PREPROD":
            raise PermissionError("SOCAUD-001 V0 only supports PREPROD")
        self.environment = environment

    @staticmethod
    def _ensure_no_secrets(value: Any, path: str = "root") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                low = str(key).lower()
                if any(marker in low for marker in _SECRET_KEYS):
                    raise PermissionError(f"SECURITY_INCIDENT: secret-like field rejected at {path}.{key}")
                SocialMediaAudit._ensure_no_secrets(child, f"{path}.{key}")
        elif isinstance(value, (list, tuple)):
            for i, child in enumerate(value):
                SocialMediaAudit._ensure_no_secrets(child, f"{path}[{i}]")

    @staticmethod
    def _norm_platform(value: str) -> str:
        return str(value or "unknown").strip().lower().replace(" ", "_")

    @staticmethod
    def _cadence_days(posts: list[dict[str, Any]]) -> float | None:
        stamps = sorted(
            float(item["published_at_epoch"])
            for item in posts
            if isinstance(item, dict) and isinstance(item.get("published_at_epoch"), (int, float))
        )
        if len(stamps) < 2:
            return None
        deltas = [(b - a) / 86400 for a, b in zip(stamps, stamps[1:]) if b >= a]
        return round(float(median(deltas)), 2) if deltas else None

    def audit(
        self,
        *,
        company_id: str,
        business_model_profile: dict[str, Any],
        digital_footprint: dict[str, Any],
        public_social_evidence: list[dict[str, Any]] | None,
        evidence_at: str,
    ) -> dict[str, Any]:
        if not company_id or not evidence_at:
            raise ValueError("company_id and evidence_at are required")
        public_social_evidence = public_social_evidence or []
        for value in (business_model_profile, digital_footprint, public_social_evidence):
            self._ensure_no_secrets(value)
        if business_model_profile.get("company_id") not in (None, company_id):
            raise PermissionError("POLICY_CONFLICT: BMD company_id mismatch")
        if digital_footprint.get("company_id") not in (None, company_id):
            raise PermissionError("POLICY_CONFLICT: SCAN company_id mismatch")

        observed_links = digital_footprint.get("social_profiles") or digital_footprint.get("profiles") or []
        profiles: dict[str, dict[str, Any]] = {}
        findings: list[SocialFinding] = []

        if isinstance(observed_links, list):
            for i, item in enumerate(observed_links):
                if not isinstance(item, dict):
                    continue
                platform = self._norm_platform(item.get("platform") or item.get("network"))
                url = str(item.get("url") or "").strip()
                if url:
                    profiles.setdefault(platform, {"platform": platform, "url": url, "source_refs": []})["source_refs"].append(f"SCAN-001:{i}")

        for i, item in enumerate(public_social_evidence):
            if not isinstance(item, dict):
                continue
            if item.get("company_id") not in (None, company_id):
                raise PermissionError("POLICY_CONFLICT: public social evidence company_id mismatch")
            platform = self._norm_platform(item.get("platform"))
            entry = profiles.setdefault(platform, {"platform": platform, "url": str(item.get("url") or "").strip(), "source_refs": []})
            entry["source_refs"].append(f"public_social_evidence:{i}")
            posts = item.get("posts") if isinstance(item.get("posts"), list) else []
            entry["observed_posts"] = len(posts)
            entry["formats"] = sorted({str(p.get("format")).strip().lower() for p in posts if isinstance(p, dict) and p.get("format")})
            entry["content_topics"] = sorted({str(t).strip().lower() for p in posts if isinstance(p, dict) for t in (p.get("topics") or []) if str(t).strip()})
            entry["median_cadence_days"] = self._cadence_days(posts)
            follower_count = item.get("followers")
            entry["followers"] = int(follower_count) if isinstance(follower_count, int) and follower_count >= 0 else None
            if entry["median_cadence_days"] is None:
                findings.append(SocialFinding("cadence", "info", f"{platform}: cadence unknown; fewer than two dated public posts", f"public_social_evidence:{i}"))
            if not entry["formats"]:
                findings.append(SocialFinding("formats", "info", f"{platform}: no public post format evidence supplied", f"public_social_evidence:{i}"))

        declared_channels = business_model_profile.get("business_model", {}).get("channels", []) if isinstance(business_model_profile.get("business_model"), dict) else []
        declared_channels = [str(x).strip().lower() for x in declared_channels if str(x).strip()]
        for channel in declared_channels:
            if any(token in channel for token in ("instagram", "facebook", "linkedin", "youtube", "tiktok", "x", "twitter")):
                matched = any(platform in channel or channel in platform for platform in profiles)
                if not matched:
                    findings.append(SocialFinding("coverage", "warning", f"Declared social channel has no matched public profile evidence: {channel}", "BMD-001:channels"))

        payload_profiles = []
        for platform in sorted(profiles):
            item = dict(profiles[platform])
            item["source_refs"] = sorted(set(item.get("source_refs", [])))
            item.setdefault("observed_posts", 0)
            item.setdefault("formats", [])
            item.setdefault("content_topics", [])
            item.setdefault("median_cadence_days", None)
            item.setdefault("followers", None)
            payload_profiles.append(item)

        missing = []
        if not payload_profiles:
            missing.append("public_social_profile_evidence")
        human_required = "LOW_CONFIDENCE" if missing else None
        assert human_required is None or human_required in _HUMAN_REQUIRED_CODES

        material = json.dumps({
            "company_id": company_id,
            "evidence_at": evidence_at,
            "profiles": payload_profiles,
            "findings": [asdict(f) for f in findings],
        }, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")

        return {
            "company_id": company_id,
            "engine_id": "SOCAUD-001",
            "environment": self.environment,
            "version": "0.2.0",
            "evidence_at": evidence_at,
            "evidence_sha256": sha256(material).hexdigest(),
            "profiles": payload_profiles,
            "findings": [asdict(f) for f in findings],
            "human_required_code": human_required,
            "missing_evidence": missing,
            "audience_metrics_policy": "public_evidence_only_no_estimation",
            "publishing": False,
            "remote_write": False,
            "additional_cost_eur": 0,
        }

    def health(self) -> dict[str, Any]:
        return {
            "engine_id": "SOCAUD-001",
            "version": "0.2.0",
            "environment": self.environment,
            "mode": "deterministic_public_read_only",
            "login_required": False,
            "publishing_enabled": False,
            "remote_write": False,
            "prod_enabled": False,
            "external_cost_eur": 0,
        }
