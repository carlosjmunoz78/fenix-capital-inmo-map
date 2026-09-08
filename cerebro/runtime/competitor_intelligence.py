from __future__ import annotations

from hashlib import sha256
import json
from typing import Any


_HUMAN_REQUIRED_CODES = {
    "LEGAL_REQUIRED", "SIGNATURE_REQUIRED", "LOW_CONFIDENCE", "HIGH_RISK",
    "POLICY_CONFLICT", "SECURITY_INCIDENT", "MONEY_LIMIT", "CUSTOMER_HUMAN_REQUEST",
}
_SECRET_KEYS = ("token", "secret", "password", "api_key", "apikey", "authorization", "credential")
_UNKNOWN = "unknown_without_public_evidence"


class CompetitorIntelligence:
    """Deterministic public-evidence-only competitor intelligence for PREPROD."""

    def __init__(self, *, environment: str = "PREPROD") -> None:
        if environment != "PREPROD":
            raise PermissionError("COMPET-001 V0 only supports PREPROD")
        self.environment = environment

    @staticmethod
    def _ensure_no_secrets(value: Any, path: str = "root") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                low = str(key).lower()
                if any(marker in low for marker in _SECRET_KEYS):
                    raise PermissionError(f"SECURITY_INCIDENT: secret-like field rejected at {path}.{key}")
                CompetitorIntelligence._ensure_no_secrets(child, f"{path}.{key}")
        elif isinstance(value, (list, tuple)):
            for i, child in enumerate(value):
                CompetitorIntelligence._ensure_no_secrets(child, f"{path}[{i}]")

    @staticmethod
    def _norm(value: Any) -> str:
        return " ".join(str(value or "").strip().lower().split())

    @classmethod
    def _norm_set(cls, value: Any) -> set[str]:
        if not isinstance(value, list):
            return set()
        return {cls._norm(x) for x in value if cls._norm(x)}

    @staticmethod
    def _company_guard(company_id: str, envelope: Any, label: str) -> None:
        if isinstance(envelope, dict) and envelope.get("company_id") not in (None, company_id):
            raise PermissionError(f"POLICY_CONFLICT: {label} company_id mismatch")

    def analyze(
        self,
        *,
        company_id: str,
        business_model_profile: dict[str, Any],
        keyword_discovery: dict[str, Any],
        digital_footprint: dict[str, Any],
        website_audit: dict[str, Any],
        local_presence: dict[str, Any],
        social_audit: dict[str, Any],
        public_competitor_evidence: list[dict[str, Any]] | None,
        evidence_at: str,
    ) -> dict[str, Any]:
        if not company_id or not evidence_at:
            raise ValueError("company_id and evidence_at are required")
        evidence = public_competitor_evidence or []
        inputs = {
            "BMD-001": business_model_profile,
            "KW-001": keyword_discovery,
            "SCAN-001": digital_footprint,
            "WAUD-001": website_audit,
            "LOCALP-001": local_presence,
            "SOCAUD-001": social_audit,
        }
        for label, value in inputs.items():
            self._ensure_no_secrets(value)
            self._company_guard(company_id, value, label)
        self._ensure_no_secrets(evidence)

        bmodel = business_model_profile.get("business_model", {}) if isinstance(business_model_profile.get("business_model"), dict) else {}
        own_services = self._norm_set(bmodel.get("services") or bmodel.get("products") or [])
        own_geo = self._norm_set(bmodel.get("geographies") or bmodel.get("geography") or [])
        own_channels = self._norm_set(bmodel.get("channels") or [])
        own_keywords: set[str] = set()
        for row in keyword_discovery.get("opportunities", []) if isinstance(keyword_discovery.get("opportunities"), list) else []:
            if isinstance(row, dict):
                term = self._norm(row.get("keyword") or row.get("term"))
                if term:
                    own_keywords.add(term)

        profiles_by_key: dict[str, dict[str, Any]] = {}
        for i, item in enumerate(evidence):
            if not isinstance(item, dict):
                continue
            self._company_guard(company_id, item, f"public_competitor_evidence:{i}")
            name = str(item.get("name") or "").strip()
            domain = self._norm(item.get("domain"))
            if not name and not domain:
                continue
            key = domain or self._norm(name)
            if not key:
                continue
            services = self._norm_set(item.get("services") or [])
            geographies = self._norm_set(item.get("geographies") or [])
            channels = self._norm_set(item.get("channels") or [])
            keywords = self._norm_set(item.get("keywords") or [])
            overlaps = {
                "services": sorted(own_services & services),
                "geographies": sorted(own_geo & geographies),
                "channels": sorted(own_channels & channels),
                "keywords": sorted(own_keywords & keywords),
            }
            overlap_count = sum(len(v) for v in overlaps.values())
            profile = {
                "name": name or None,
                "domain": domain or None,
                "source_refs": [f"public_competitor_evidence:{i}"],
                "overlap": overlaps,
                "evidence_state": "EVIDENCE_SUPPORTED" if overlap_count else "LIMITED_PUBLIC_EVIDENCE",
                "market_share": _UNKNOWN,
                "revenue": _UNKNOWN,
                "headcount": _UNKNOWN,
                "traffic": _UNKNOWN,
                "ad_spend": _UNKNOWN,
                "search_rank": _UNKNOWN,
                "followers": item.get("followers") if isinstance(item.get("followers"), int) and item.get("followers") >= 0 else _UNKNOWN,
                "review_metrics": item.get("review_metrics") if isinstance(item.get("review_metrics"), dict) else _UNKNOWN,
            }
            if key in profiles_by_key:
                existing = profiles_by_key[key]
                existing["source_refs"] = sorted(set(existing["source_refs"] + profile["source_refs"]))
                for axis in overlaps:
                    existing["overlap"][axis] = sorted(set(existing["overlap"][axis]) | set(overlaps[axis]))
                if overlap_count:
                    existing["evidence_state"] = "EVIDENCE_SUPPORTED"
            else:
                profiles_by_key[key] = profile

        profiles = sorted(profiles_by_key.values(), key=lambda x: ((x.get("domain") or ""), self._norm(x.get("name"))))
        missing = [] if profiles else ["explicit_public_competitor_evidence"]
        human_required = "LOW_CONFIDENCE" if missing else None
        assert human_required is None or human_required in _HUMAN_REQUIRED_CODES

        gap_matrix = [
            {
                "competitor": p.get("domain") or p.get("name"),
                "observed_overlap_axes": sorted([axis for axis, values in p["overlap"].items() if values]),
                "unobserved_axes": sorted([axis for axis, values in p["overlap"].items() if not values]),
                "policy": "absence_of_evidence_is_not_market_gap",
            }
            for p in profiles
        ]
        material = json.dumps({
            "company_id": company_id,
            "evidence_at": evidence_at,
            "profiles": profiles,
            "gap_matrix": gap_matrix,
        }, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return {
            "company_id": company_id,
            "engine_id": "COMPET-001",
            "environment": self.environment,
            "version": "0.2.0",
            "evidence_at": evidence_at,
            "evidence_sha256": sha256(material).hexdigest(),
            "profiles": profiles,
            "gap_matrix": gap_matrix,
            "human_required_code": human_required,
            "missing_evidence": missing,
            "market_metrics_policy": "public_evidence_only_no_estimation",
            "discovery_policy": "explicit_evidence_only_v0",
            "remote_write": False,
            "additional_cost_eur": 0,
        }

    def health(self) -> dict[str, Any]:
        return {
            "engine_id": "COMPET-001",
            "version": "0.2.0",
            "environment": self.environment,
            "mode": "deterministic_public_read_only",
            "login_required": False,
            "remote_write": False,
            "prod_enabled": False,
            "external_cost_eur": 0,
        }
