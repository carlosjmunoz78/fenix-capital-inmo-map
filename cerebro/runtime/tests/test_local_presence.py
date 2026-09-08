import unittest

from cerebro.runtime.local_presence import LocalPresenceAudit


class LocalPresenceAuditTests(unittest.TestCase):
    def setUp(self):
        self.audit = LocalPresenceAudit()
        self.bmd = {"company_id": "c1", "business_model": {"services": ["venta"]}}
        self.scan = {"company_id": "c1", "domain": "example.test"}
        self.declared = {
            "company_id": "c1",
            "name": "Fenix Capital",
            "address": "Calle Uno 1, Madrid",
            "phone": "+34 600 000 000",
            "categories": ["inmobiliaria"],
            "services": ["venta", "alquiler"],
            "service_areas": ["Madrid"],
        }

    def test_matching_public_evidence_is_read_only(self):
        result = self.audit.audit(
            company_id="c1",
            business_model_profile=self.bmd,
            scan_result=self.scan,
            declared_business=self.declared,
            public_local_evidence={
                "company_id": "c1",
                "name": "Fenix Capital",
                "address": "Calle Uno 1, Madrid",
                "phone": "+34 600 000 000",
                "categories": ["inmobiliaria"],
                "services": ["venta", "alquiler"],
                "review_count": 10,
                "rating": 4.7,
            },
            evidence_at="2026-09-08T15:00:00Z",
        )
        self.assertFalse(result["remote_write"])
        self.assertFalse(result["remote_fetch"])
        self.assertEqual(result["reviews"]["state"], "observed_public_evidence")
        nap = [f for f in result["findings"] if f.get("category") == "nap"]
        self.assertTrue(all(f["status"] == "match" for f in nap))

    def test_missing_public_reviews_are_unknown_not_fabricated(self):
        result = self.audit.audit(
            company_id="c1",
            business_model_profile=self.bmd,
            scan_result=self.scan,
            declared_business=self.declared,
            public_local_evidence={},
            evidence_at="2026-09-08T15:00:00Z",
        )
        self.assertEqual(result["reviews"]["state"], "unknown_without_public_evidence")
        self.assertIsNone(result["reviews"]["review_count"])
        self.assertIsNone(result["reviews"]["rating"])

    def test_cross_company_is_denied(self):
        with self.assertRaises(PermissionError):
            self.audit.audit(
                company_id="c1",
                business_model_profile={"company_id": "c2"},
                scan_result=self.scan,
                declared_business=self.declared,
                public_local_evidence={},
                evidence_at="2026-09-08T15:00:00Z",
            )

    def test_secret_like_material_is_rejected(self):
        bad = dict(self.declared)
        bad["api_key"] = "redacted"
        with self.assertRaises(PermissionError):
            self.audit.audit(
                company_id="c1",
                business_model_profile=self.bmd,
                scan_result=self.scan,
                declared_business=bad,
                public_local_evidence={},
                evidence_at="2026-09-08T15:00:00Z",
            )

    def test_prod_is_denied(self):
        with self.assertRaises(PermissionError):
            LocalPresenceAudit(environment="PROD")

    def test_deterministic_hash(self):
        kwargs = dict(
            company_id="c1",
            business_model_profile=self.bmd,
            scan_result=self.scan,
            declared_business=self.declared,
            public_local_evidence={},
            evidence_at="2026-09-08T15:00:00Z",
        )
        self.assertEqual(self.audit.audit(**kwargs)["evidence_sha256"], self.audit.audit(**kwargs)["evidence_sha256"])


if __name__ == "__main__":
    unittest.main()
