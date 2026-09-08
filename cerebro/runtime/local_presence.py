from __future__ import annotations

from hashlib import sha256
import json
from typing import Any


_SECRET_KEYS = ("token", "secret", "password", "api_key", "apikey", "authorization", "credential")


class LocalPresenceAudit:
    """Deterministic read-only local presence audit for PREPROD.

    V0 evaluates only supplied public evidence. It does not call or mutate Google Business Profile.
    """

    def __init__(self, *, environment: str = "PREPROD") -> None:
        if environment != "PREPROD":
            raise PermissionError("LOCALP-001 V0 only supports PREPROD")
        self.environment = environment

    @staticmethod
    def _ensure_no_secrets(value: Any, path: str = "root") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                low = str(key).lower()
                if any(marker in low for marker in _SECRET_KEYS):
                    raise PermissionError(f"SECURITY_INCIDENT: secret-like field rejected at {path}.{key}")
                LocalPresenceAudit._ensure_no_secrets(child, f"{path}.{key}")
        elif isinstance(value, (list, tuple)):
            for i, child in enumerate(value):
                LocalPresenceAudit._ensure_no_secrets(child, f"{path}[{i}]")

    @staticmethod
    def _norm(value: Any) -> str:
        return " ".join(str(value or "").strip().lower().split())

    def audit(
        self,
        *,
        company_id: str,
        business_model_profile: dict[str, Any],
        scan_result: dict[str, Any],
        declared_business: dict[str, Any],
        public_local_evidence: dict[str, Any] | None,
        evidence_at: str,
    ) -> dict[str, Any]:
        if not company_id or not evidence_at:
            raise ValueError("company_id and evidence_at are required")
        public_local_evidence = public_local_evidence or {}
        for obj in (business_model_profile, scan_result, declared_business, public_local_evidence):
            self._ensure_no_secrets(obj)
            if isinstance(obj, dict) and obj.get("company_id") not in (None, company_id):
                raise PermissionError("POLICY_CONFLICT: company_id mismatch")

        declared_name = self._norm(declared_business.get("name"))
        declared_address = self._norm(declared_business.get("address"))
        declared_phone = self._norm(declared_business.get("phone"))
        observed_name = self._norm(public_local_evidence.get("name"))
        observed_address = self._norm(public_local_evidence.get("address"))
        observed_phone = self._norm(public_local_evidence.get("phone"))

        findings: list[dict[str, Any]] = []
        def compare(field: str, declared: str, observed: str) -> None:
            if not declared:
                findings.append({"category": "nap", "field": field, "severity": "medium", "status": "declared_missing"})
            elif not observed:
                findings.append({"category": "nap", "field": field, "severity": "low", "status": "public_evidence_missing"})
            elif declared != observed:
                findings.append({"category": "nap", "field": field, "severity": "high", "status": "mismatch"})
            else:
                findings.append({"category": "nap", "field": field, "severity": "info", "status": "match"})

        compare("name", declared_name, observed_name)
        compare("address", declared_address, observed_address)
        compare("phone", declared_phone, observed_phone)

        declared_categories = {self._norm(v) for v in declared_business.get("categories", []) if self._norm(v)}
        observed_categories = {self._norm(v) for v in public_local_evidence.get("categories", []) if self._norm(v)}
        missing_categories = sorted(declared_categories - observed_categories) if observed_categories else sorted(declared_categories)
        if missing_categories:
            findings.append({"category": "categories", "severity": "medium", "status": "not_observed", "items": missing_categories})

        declared_services = {self._norm(v) for v in declared_business.get("services", []) if self._norm(v)}
        observed_services = {self._norm(v) for v in public_local_evidence.get("services", []) if self._norm(v)}
        missing_services = sorted(declared_services - observed_services) if observed_services else sorted(declared_services)
        if missing_services:
            findings.append({"category": "services", "severity": "low", "status": "not_observed", "items": missing_services})

        coverage = [self._norm(v) for v in declared_business.get("service_areas", []) if self._norm(v)]
        if not coverage:
            findings.append({"category": "geography", "severity": "medium", "status": "declared_coverage_missing"})

        review_count = public_local_evidence.get("review_count")
        rating = public_local_evidence.get("rating")
        reviews_state = "unknown_without_public_evidence"
        if isinstance(review_count, int) and review_count >= 0 and isinstance(rating, (int, float)):
            reviews_state = "observed_public_evidence"

        material_obj = {
            "company_id": company_id,
            "evidence_at": evidence_at,
            "findings": findings,
            "reviews_state": reviews_state,
            "review_count": review_count if reviews_state == "observed_public_evidence" else None,
            "rating": rating if reviews_state == "observed_public_evidence" else None,
        }
        material = json.dumps(material_obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return {
            "company_id": company_id,
            "engine_id": "LOCALP-001",
            "environment": self.environment,
            "version": "0.2.0",
            "evidence_at": evidence_at,
            "evidence_sha256": sha256(material).hexdigest(),
            "findings": findings,
            "reviews": {
                "state": reviews_state,
                "review_count": material_obj["review_count"],
                "rating": material_obj["rating"],
            },
            "remote_fetch": False,
            "remote_write": False,
            "additional_cost_eur": 0,
        }

    def health(self) -> dict[str, Any]:
        return {
            "engine_id": "LOCALP-001",
            "version": "0.2.0",
            "environment": self.environment,
            "mode": "deterministic_public_evidence_only",
            "google_business_api": False,
            "remote_write": False,
            "prod_enabled": False,
            "external_cost_eur": 0,
        }
