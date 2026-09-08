import unittest

from cerebro.runtime.keyword_discovery import KeywordDiscovery


class KeywordDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.engine = KeywordDiscovery()
        self.bmd = {
            "company_id": "fenix",
            "business_model": {
                "services": ["inversión inmobiliaria"],
                "customer_segments": ["inversores"],
                "value_proposition": "análisis de oportunidades",
                "geography": ["Madrid"],
            },
        }
        self.waud = {
            "company_id": "fenix",
            "findings": [
                {"category": "content", "h1": "Inversión inmobiliaria"},
                {"category": "seo", "title": "Oportunidades inmobiliarias"},
            ],
        }

    def test_discovers_evidence_backed_keywords_without_fake_metrics(self):
        result = self.engine.discover(
            company_id="fenix",
            business_model_profile=self.bmd,
            website_audit_result=self.waud,
            declared_seed_terms=["comprar inversión inmobiliaria"],
            locations=["Madrid"],
            evidence_at="2026-09-08T14:20:00Z",
        )
        words = {row["keyword"] for row in result["opportunities"]}
        self.assertIn("inversión inmobiliaria", words)
        self.assertIn("inversión inmobiliaria madrid", words)
        self.assertEqual(result["external_metrics"]["search_volume"], "unknown_without_authorized_source")
        self.assertFalse(result["remote_write"])
        self.assertEqual(result["additional_cost_eur"], 0)
        self.assertIsNone(result["human_required_code"])

    def test_cross_company_is_denied(self):
        with self.assertRaisesRegex(PermissionError, "POLICY_CONFLICT"):
            self.engine.discover(
                company_id="other",
                business_model_profile=self.bmd,
                website_audit_result=self.waud,
                evidence_at="2026-09-08T14:20:00Z",
            )

    def test_secret_like_material_is_rejected(self):
        bmd = {"company_id": "fenix", "business_model": {}, "api_key": "do-not-store"}
        with self.assertRaisesRegex(PermissionError, "SECURITY_INCIDENT"):
            self.engine.discover(
                company_id="fenix",
                business_model_profile=bmd,
                website_audit_result=self.waud,
                evidence_at="2026-09-08T14:20:00Z",
            )

    def test_missing_evidence_returns_low_confidence(self):
        result = self.engine.discover(
            company_id="fenix",
            business_model_profile={"company_id": "fenix", "business_model": {}},
            website_audit_result={"company_id": "fenix", "findings": []},
            evidence_at="2026-09-08T14:20:00Z",
        )
        self.assertEqual(result["human_required_code"], "LOW_CONFIDENCE")
        self.assertEqual(result["missing_evidence"], ["evidence_backed_seed_terms"])

    def test_prod_is_denied(self):
        with self.assertRaises(PermissionError):
            KeywordDiscovery(environment="PROD")


if __name__ == "__main__":
    unittest.main()
