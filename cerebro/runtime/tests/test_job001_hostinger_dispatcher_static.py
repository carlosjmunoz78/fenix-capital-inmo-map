from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / "deploy" / "hostinger"


class HostingerDispatcherStaticTests(unittest.TestCase):
    def test_dispatcher_has_no_embedded_secret(self):
        text = (DEPLOY / "job001_http_dispatcher.php").read_text(encoding="utf-8")
        self.assertIn("secret_file", text)
        self.assertNotIn("b37356f93f1631da023ffdd901e3d1c6aca007750e5e0eae884a4a05da64a834", text)
        self.assertIn("TARGET_NOT_ALLOWLISTED", text)

    def test_http_jobs_are_preprod_and_use_secret_file(self):
        for name in ("job001_weekly_orchestrator.json", "job001_growth_email_worker.json"):
            cfg = json.loads((DEPLOY / name).read_text(encoding="utf-8"))
            self.assertTrue(cfg["url"].startswith("https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/"))
            self.assertEqual(cfg["body"]["company_id"], "FENIX_CAPITAL")
            self.assertTrue(cfg["secret_file"].endswith("fenix_cerebro_preprod.secret"))


if __name__ == "__main__":
    unittest.main()
