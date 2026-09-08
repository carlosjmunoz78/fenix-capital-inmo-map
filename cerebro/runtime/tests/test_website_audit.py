from __future__ import annotations

import unittest

from cerebro.runtime.website_audit import WebsiteAudit, WebsiteAuditError


class WebsiteAuditTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = WebsiteAudit()
        self.scan = {
            "company_id": "co-1",
            "read_only": True,
            "evidence_sha256": "abc123",
        }
        self.bmd = {
            "company_id": "co-1",
            "completeness": 1.0,
            "business_model": {
                "services": ["advisory"],
                "customers": ["investors"],
                "value_proposition": "evidence-based",
            },
        }

    def test_clean_page_is_deterministic(self) -> None:
        page = {
            "url": "https://example.com/",
            "status": 200,
            "html": """<html lang='es'><head><title>Example</title><meta name='description' content='desc'><meta name='viewport' content='width=device-width'><link rel='canonical' href='https://example.com/'></head><body><h1>Example</h1><img src='x.jpg' alt='x'><script>gtag('config','x')</script></body></html>""",
        }
        first = self.engine.audit(company_id="co-1", scan_result=self.scan, business_model_profile=self.bmd, pages=[page], evidence_at="2026-09-08T13:00:00Z")
        second = self.engine.audit(company_id="co-1", scan_result=self.scan, business_model_profile=self.bmd, pages=[page], evidence_at="2026-09-08T13:00:00Z")
        self.assertEqual(first, second)
        self.assertEqual(first["summary"]["error"], 0)
        self.assertEqual(first["summary"]["warning"], 0)
        self.assertTrue(first["read_only"])
        self.assertEqual(first["external_cost_eur"], 0)

    def test_detects_expected_gaps(self) -> None:
        page = {"url": "https://example.com/", "status": 200, "html": "<html><body><form><input name='email'><img src='x.jpg'></form></body></html>"}
        result = self.engine.audit(company_id="co-1", scan_result=self.scan, business_model_profile=self.bmd, pages=[page], evidence_at="2026-09-08T13:00:00Z")
        codes = {item["code"] for item in result["findings"]}
        self.assertTrue({"MISSING_TITLE", "MISSING_META_DESCRIPTION", "MISSING_CANONICAL", "MISSING_H1", "MISSING_VIEWPORT", "FORM_METHOD_UNDECLARED", "FORM_LABELS_ABSENT", "TRACKING_SIGNAL_NOT_DETECTED", "IMAGE_ALT_MISSING"}.issubset(codes))

    def test_low_confidence_bmd_is_visible(self) -> None:
        weak = {"company_id": "co-1", "completeness": 0.2, "business_model": {"services": ["x"]}}
        page = {"url": "https://example.com/", "status": 200, "html": "<html lang='es'><head><title>x</title><meta name='description' content='x'><meta name='viewport' content='x'><link rel='canonical' href='https://example.com/'></head><body><h1>x</h1><script>gtag('x')</script></body></html>"}
        result = self.engine.audit(company_id="co-1", scan_result=self.scan, business_model_profile=weak, pages=[page], evidence_at="2026-09-08T13:00:00Z")
        self.assertIn("BMD_LOW_CONFIDENCE_INPUT", {item["code"] for item in result["findings"]})

    def test_cross_company_is_denied(self) -> None:
        bad_scan = dict(self.scan, company_id="co-2")
        with self.assertRaises(WebsiteAuditError):
            self.engine.audit(company_id="co-1", scan_result=bad_scan, business_model_profile=self.bmd, pages=[{"url":"https://example.com","html":"x"}], evidence_at="x")

    def test_prod_is_denied(self) -> None:
        with self.assertRaises(WebsiteAuditError):
            self.engine.audit(company_id="co-1", scan_result=self.scan, business_model_profile=self.bmd, pages=[{"url":"https://example.com","html":"x"}], evidence_at="x", environment="PROD")

    def test_sensitive_material_is_rejected(self) -> None:
        bad_scan = dict(self.scan, token="do-not-store")
        with self.assertRaises(WebsiteAuditError):
            self.engine.audit(company_id="co-1", scan_result=bad_scan, business_model_profile=self.bmd, pages=[{"url":"https://example.com","html":"x"}], evidence_at="x")

    def test_health_is_safe(self) -> None:
        health = self.engine.health()
        self.assertFalse(health["remote_fetch"])
        self.assertFalse(health["remote_write"])
        self.assertFalse(health["prod_enabled"])
        self.assertEqual(health["external_cost_eur"], 0)


if __name__ == "__main__":
    unittest.main()
