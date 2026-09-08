from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
import re
from typing import Any, Iterable


class WebsiteAuditError(ValueError):
    pass


@dataclass(frozen=True)
class AuditFinding:
    code: str
    severity: str
    page_url: str
    evidence: str
    category: str


class WebsiteAudit:
    """WAUD-001 V0.2: deterministic, PREPROD-only audit over supplied public snapshots.

    The engine never fetches or mutates remote systems itself. WEB-001/SCAN-001 remain
    the public-web boundary. Inputs are normalized snapshots supplied by callers/tests.
    """

    REQUIRED_BMD_DIMENSIONS = ("services", "customers", "value_proposition")
    TRACKING_MARKERS = ("gtag(", "googletagmanager", "google-analytics", "fbq(", "matomo")

    def health(self) -> dict[str, Any]:
        return {
            "engine_id": "WAUD-001",
            "version": "0.2.0",
            "environment": "PREPROD",
            "mode": "DETERMINISTIC_READ_ONLY_AUDIT",
            "remote_fetch": False,
            "remote_write": False,
            "external_cost_eur": 0,
            "prod_enabled": False,
        }

    def audit(
        self,
        *,
        company_id: str,
        scan_result: dict[str, Any],
        business_model_profile: dict[str, Any],
        pages: Iterable[dict[str, Any]],
        evidence_at: str,
        environment: str = "PREPROD",
    ) -> dict[str, Any]:
        self._validate_inputs(company_id, scan_result, business_model_profile, evidence_at, environment)
        normalized_pages = [self._normalize_page(page) for page in pages]
        if not normalized_pages:
            raise WebsiteAuditError("at least one public page snapshot is required")

        findings: list[AuditFinding] = []
        for page in normalized_pages:
            findings.extend(self._audit_page(page))

        business_model = business_model_profile.get("business_model") or {}
        missing_bmd = [key for key in self.REQUIRED_BMD_DIMENSIONS if not business_model.get(key)]
        if missing_bmd:
            findings.append(
                AuditFinding(
                    code="BMD_LOW_CONFIDENCE_INPUT",
                    severity="warning",
                    page_url=normalized_pages[0]["url"],
                    evidence=",".join(sorted(missing_bmd)),
                    category="business_alignment",
                )
            )

        findings = sorted(findings, key=lambda x: (x.page_url, x.category, x.code, x.evidence))
        payload = {
            "company_id": company_id,
            "engine_id": "WAUD-001",
            "environment": environment,
            "version": "0.2.0",
            "evidence_at": evidence_at,
            "read_only": True,
            "pages_audited": len(normalized_pages),
            "summary": self._summary(findings),
            "findings": [finding.__dict__ for finding in findings],
            "dependencies": {
                "scan_evidence_sha256": scan_result.get("evidence_sha256"),
                "business_model_completeness": business_model_profile.get("completeness"),
                "web_boundary": "WEB-001",
                "seo_boundary": "SEO-001",
            },
            "external_cost_eur": 0,
            "prod_mutation": False,
        }
        payload["evidence_sha256"] = sha256(
            json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        return payload

    def _validate_inputs(
        self,
        company_id: str,
        scan_result: dict[str, Any],
        business_model_profile: dict[str, Any],
        evidence_at: str,
        environment: str,
    ) -> None:
        if not company_id or not isinstance(company_id, str):
            raise WebsiteAuditError("company_id is required")
        if environment != "PREPROD":
            raise WebsiteAuditError("WAUD-001 V0.2 is PREPROD-only")
        if not evidence_at or not isinstance(evidence_at, str):
            raise WebsiteAuditError("evidence_at is required")
        if scan_result.get("company_id") != company_id:
            raise WebsiteAuditError("SCAN-001 company_id mismatch")
        if business_model_profile.get("company_id") != company_id:
            raise WebsiteAuditError("BMD-001 company_id mismatch")
        if scan_result.get("read_only") is not True:
            raise WebsiteAuditError("SCAN-001 evidence must be read_only")
        if self._contains_sensitive_material(scan_result) or self._contains_sensitive_material(business_model_profile):
            raise WebsiteAuditError("sensitive material rejected")

    def _normalize_page(self, page: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(page, dict):
            raise WebsiteAuditError("page snapshot must be an object")
        url = str(page.get("url") or "").strip()
        html = str(page.get("html") or "")
        status = page.get("status", 200)
        if not url.startswith(("http://", "https://")):
            raise WebsiteAuditError("page url must be public http(s)")
        if not isinstance(status, int):
            raise WebsiteAuditError("page status must be integer")
        return {"url": url, "html": html, "status": status}

    def _audit_page(self, page: dict[str, Any]) -> list[AuditFinding]:
        url, html, status = page["url"], page["html"], page["status"]
        low = html.lower()
        findings: list[AuditFinding] = []

        if status >= 400:
            findings.append(AuditFinding("HTTP_ERROR", "error", url, str(status), "technical"))
        if not re.search(r"<title[^>]*>\s*[^<]+\s*</title>", html, re.I | re.S):
            findings.append(AuditFinding("MISSING_TITLE", "warning", url, "title absent", "seo"))
        if not re.search(r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"'][^\"']+", html, re.I):
            findings.append(AuditFinding("MISSING_META_DESCRIPTION", "warning", url, "meta description absent", "seo"))
        if not re.search(r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"'][^\"']+", html, re.I):
            findings.append(AuditFinding("MISSING_CANONICAL", "warning", url, "canonical absent", "seo"))
        h1_count = len(re.findall(r"<h1(?:\s|>)", html, re.I))
        if h1_count == 0:
            findings.append(AuditFinding("MISSING_H1", "warning", url, "0", "content"))
        elif h1_count > 1:
            findings.append(AuditFinding("MULTIPLE_H1", "info", url, str(h1_count), "content"))
        if "<html" in low and not re.search(r"<html[^>]+lang=[\"'][^\"']+", html, re.I):
            findings.append(AuditFinding("MISSING_HTML_LANG", "info", url, "lang absent", "accessibility"))
        if "name=\"viewport\"" not in low and "name='viewport'" not in low:
            findings.append(AuditFinding("MISSING_VIEWPORT", "warning", url, "viewport absent", "technical"))
        if "<form" in low:
            if not re.search(r"<form[^>]+method=[\"'](?:post|get)[\"']", html, re.I):
                findings.append(AuditFinding("FORM_METHOD_UNDECLARED", "warning", url, "method absent", "conversion"))
            if not re.search(r"<(?:label)[^>]*>", html, re.I):
                findings.append(AuditFinding("FORM_LABELS_ABSENT", "warning", url, "label absent", "conversion"))
        if not any(marker in low for marker in self.TRACKING_MARKERS):
            findings.append(AuditFinding("TRACKING_SIGNAL_NOT_DETECTED", "info", url, "known marker absent", "tracking"))
        if re.search(r"<img(?![^>]+alt=)[^>]*>", html, re.I):
            findings.append(AuditFinding("IMAGE_ALT_MISSING", "warning", url, "img without alt", "content"))
        return findings

    @staticmethod
    def _summary(findings: list[AuditFinding]) -> dict[str, int]:
        summary = {"error": 0, "warning": 0, "info": 0, "total": len(findings)}
        for finding in findings:
            summary[finding.severity] = summary.get(finding.severity, 0) + 1
        return summary

    @staticmethod
    def _contains_sensitive_material(value: Any) -> bool:
        sensitive_keys = {"password", "secret", "token", "api_key", "apikey", "private_key", "authorization"}
        if isinstance(value, dict):
            for key, item in value.items():
                if str(key).lower() in sensitive_keys:
                    return True
                if WebsiteAudit._contains_sensitive_material(item):
                    return True
        elif isinstance(value, list):
            return any(WebsiteAudit._contains_sensitive_material(item) for item in value)
        return False
