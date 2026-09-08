from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
import json
import re
from typing import Any, Iterable


_HUMAN_REQUIRED_CODES = {
    "LEGAL_REQUIRED", "SIGNATURE_REQUIRED", "LOW_CONFIDENCE", "HIGH_RISK",
    "POLICY_CONFLICT", "SECURITY_INCIDENT", "MONEY_LIMIT", "CUSTOMER_HUMAN_REQUEST",
}
_SECRET_KEYS = ("token", "secret", "password", "api_key", "apikey", "authorization", "credential")
_TRANSACTIONAL = ("precio", "presupuesto", "comprar", "contratar", "venta", "servicio", "solicitar", "tasación")
_INFORMATIONAL = ("como", "cómo", "que", "qué", "guia", "guía", "consejos", "informacion", "información")


@dataclass(frozen=True)
class KeywordOpportunity:
    keyword: str
    intent: str
    cluster: str
    source_refs: tuple[str, ...]
    priority: int
    search_volume: None = None
    cpc: None = None
    difficulty: None = None
    current_rank: None = None


class KeywordDiscovery:
    """Deterministic, evidence-only keyword discovery for PREPROD.

    It never claims external search metrics without an authorized evidence source.
    """

    def __init__(self, *, environment: str = "PREPROD") -> None:
        if environment != "PREPROD":
            raise PermissionError("KW-001 V0 only supports PREPROD")
        self.environment = environment

    @staticmethod
    def _ensure_no_secrets(value: Any, path: str = "root") -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                low = str(key).lower()
                if any(marker in low for marker in _SECRET_KEYS):
                    raise PermissionError(f"SECURITY_INCIDENT: secret-like field rejected at {path}.{key}")
                KeywordDiscovery._ensure_no_secrets(child, f"{path}.{key}")
        elif isinstance(value, (list, tuple)):
            for i, child in enumerate(value):
                KeywordDiscovery._ensure_no_secrets(child, f"{path}[{i}]")

    @staticmethod
    def _norm(text: str) -> str:
        return re.sub(r"\s+", " ", str(text).strip().lower())

    @staticmethod
    def _strings(value: Any) -> list[str]:
        out: list[str] = []
        if isinstance(value, str):
            v = value.strip()
            if v:
                out.append(v)
        elif isinstance(value, (list, tuple, set)):
            for item in value:
                out.extend(KeywordDiscovery._strings(item))
        return out

    @staticmethod
    def _intent(keyword: str, locations: Iterable[str]) -> str:
        low = keyword.lower()
        if any(KeywordDiscovery._norm(loc) in low for loc in locations if str(loc).strip()):
            return "local"
        if any(token in low for token in _TRANSACTIONAL):
            return "transactional"
        if any(token in low for token in _INFORMATIONAL):
            return "informational"
        return "commercial_investigation"

    @staticmethod
    def _cluster(term: str) -> str:
        low = KeywordDiscovery._norm(term)
        words = [w for w in re.split(r"[^\wáéíóúüñ]+", low) if len(w) > 2]
        return " ".join(words[:3]) if words else "general"

    def discover(
        self,
        *,
        company_id: str,
        business_model_profile: dict[str, Any],
        website_audit_result: dict[str, Any],
        declared_seed_terms: list[str] | None = None,
        locations: list[str] | None = None,
        evidence_at: str,
    ) -> dict[str, Any]:
        if not company_id or not evidence_at:
            raise ValueError("company_id and evidence_at are required")
        self._ensure_no_secrets(business_model_profile)
        self._ensure_no_secrets(website_audit_result)
        if business_model_profile.get("company_id") not in (None, company_id):
            raise PermissionError("POLICY_CONFLICT: BMD company_id mismatch")
        if website_audit_result.get("company_id") not in (None, company_id):
            raise PermissionError("POLICY_CONFLICT: WAUD company_id mismatch")

        declared_seed_terms = declared_seed_terms or []
        locations = locations or []
        evidence: dict[str, set[str]] = {}

        def add(term: str, source: str) -> None:
            normalized = self._norm(term)
            if len(normalized) < 2:
                return
            evidence.setdefault(normalized, set()).add(source)

        for term in declared_seed_terms:
            add(term, "declared_seed")

        model = business_model_profile.get("business_model") or business_model_profile
        for key in ("services", "products", "value_proposition", "customer_segments", "channels", "geography"):
            for term in self._strings(model.get(key)) if isinstance(model, dict) else []:
                add(term, f"BMD-001:{key}")

        for loc in locations:
            add(loc, "declared_location")

        findings = website_audit_result.get("findings", [])
        if isinstance(findings, list):
            for finding in findings:
                if not isinstance(finding, dict):
                    continue
                for key in ("title", "h1", "observed", "value", "text"):
                    for term in self._strings(finding.get(key)):
                        if 2 <= len(term.split()) <= 12:
                            add(term, f"WAUD-001:{finding.get('category','finding')}")

        base_terms = sorted(evidence)
        for term in list(base_terms):
            for loc in locations:
                nloc = self._norm(loc)
                if nloc and nloc not in term:
                    add(f"{term} {nloc}", "derived_from_evidence:location")

        opportunities: list[KeywordOpportunity] = []
        for keyword in sorted(evidence):
            refs = tuple(sorted(evidence[keyword]))
            source_strength = min(4, len(refs))
            specificity = min(3, max(0, len(keyword.split()) - 1))
            priority = min(10, 3 + source_strength + specificity)
            opportunities.append(
                KeywordOpportunity(
                    keyword=keyword,
                    intent=self._intent(keyword, locations),
                    cluster=self._cluster(keyword),
                    source_refs=refs,
                    priority=priority,
                )
            )

        payload = [asdict(item) for item in opportunities]
        material = json.dumps(
            {"company_id": company_id, "evidence_at": evidence_at, "opportunities": payload},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        missing = []
        if not opportunities:
            missing.append("evidence_backed_seed_terms")
        human_required = "LOW_CONFIDENCE" if missing else None
        assert human_required is None or human_required in _HUMAN_REQUIRED_CODES
        return {
            "company_id": company_id,
            "engine_id": "KW-001",
            "environment": self.environment,
            "version": "0.2.0",
            "evidence_at": evidence_at,
            "evidence_sha256": sha256(material).hexdigest(),
            "opportunities": payload,
            "clusters": sorted({item.cluster for item in opportunities}),
            "human_required_code": human_required,
            "missing_evidence": missing,
            "external_metrics": {
                "search_volume": "unknown_without_authorized_source",
                "cpc": "unknown_without_authorized_source",
                "difficulty": "unknown_without_authorized_source",
                "current_rank": "unknown_without_authorized_source",
            },
            "additional_cost_eur": 0,
            "remote_write": False,
        }

    def health(self) -> dict[str, Any]:
        return {
            "engine_id": "KW-001",
            "version": "0.2.0",
            "environment": self.environment,
            "mode": "deterministic_evidence_only",
            "external_metrics_fabricated": False,
            "remote_write": False,
            "prod_enabled": False,
            "external_cost_eur": 0,
        }
