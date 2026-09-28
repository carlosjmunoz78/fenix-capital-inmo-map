import unittest

from cerebro.runtime.wordpress_company_config import (
    CompanyWordPressConfigError,
    load_company_wordpress_config,
)


class CompanyWordPressConfigTests(unittest.TestCase):
    def test_fenix_config_is_zero_cost_and_prod_denied(self):
        cfg = load_company_wordpress_config("fenix-capital")
        self.assertEqual(cfg["primary_domain"], "fenixcapital.es")
        self.assertEqual(cfg["policies"]["additional_cost_eur_target"], 0)
        self.assertEqual(cfg["policies"]["prod_writes_default"], "DENY")
        self.assertFalse(cfg["policies"]["wpvibe_required"])
        self.assertFalse(cfg["policies"]["make_required"])

    def test_newsletters_are_two_distinct_disabled_streams(self):
        cfg = load_company_wordpress_config("fenix-capital")
        streams = cfg["newsletter_streams"]
        self.assertEqual({s["audience"] for s in streams}, {"PARTICULARES", "INMOBILIARIAS"})
        self.assertTrue(all(s["cadence"] == "WEEKLY" for s in streams))
        self.assertTrue(all(s["send_enabled"] is False for s in streams))
        self.assertTrue(all(s["provider"] == "brevo" for s in streams))
        self.assertEqual(cfg["policies"]["newsletter_provider"], "brevo")
        self.assertTrue(cfg["policies"]["hostinger_reach_newsletter_forbidden"])
        self.assertEqual(cfg["policies"]["brevo_free_daily_email_limit"], 300)

    def test_unknown_company_fails_closed(self):
        with self.assertRaises(CompanyWordPressConfigError):
            load_company_wordpress_config("unknown-company")


if __name__ == "__main__":
    unittest.main()
