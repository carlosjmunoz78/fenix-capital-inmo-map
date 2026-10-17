import unittest
from cerebro.runtime.social_bootstrap import SocialBootstrap

class SocialBootstrapTests(unittest.TestCase):
    def setUp(self):
        self.engine=SocialBootstrap()
        self.bmd={"company_id":"fenix-capital","content_pillars":["Educación hipotecaria","Documentación","Colaboración inmobiliarias"]}
        self.audit={"company_id":"fenix-capital","version":"0.2.0","profiles":[]}

    def test_plan_is_deterministic_and_segmented(self):
        a=self.engine.plan(company_id="fenix-capital",business_model_profile=self.bmd,social_audit=self.audit,evidence_at="2026-09-29")
        b=self.engine.plan(company_id="fenix-capital",business_model_profile=self.bmd,social_audit=self.audit,evidence_at="2026-09-29")
        self.assertEqual(a["plan_sha256"],b["plan_sha256"])
        audiences={x["channel"]:x["audience"] for x in a["channel_plan"]}
        self.assertEqual(audiences["instagram"],"particulares")
        self.assertEqual(audiences["facebook"],"particulares")
        self.assertEqual(audiences["linkedin"],"inmobiliarias")

    def test_publish_and_prod_are_denied(self):
        p=self.engine.plan(company_id="fenix-capital",business_model_profile=self.bmd,social_audit=self.audit,evidence_at="2026-09-29")
        self.assertFalse(p["guardrails"]["publishing_enabled"])
        self.assertFalse(p["remote_write"])
        self.assertEqual(p["additional_cost_eur"],0)

    def test_cross_company_denied(self):
        with self.assertRaises(PermissionError):
            self.engine.plan(company_id="fenix-capital",business_model_profile={"company_id":"other"},social_audit=self.audit,evidence_at="2026-09-29")

    def test_prod_constructor_denied(self):
        with self.assertRaises(PermissionError):
            SocialBootstrap(environment="PROD")

if __name__=="__main__":
    unittest.main()
