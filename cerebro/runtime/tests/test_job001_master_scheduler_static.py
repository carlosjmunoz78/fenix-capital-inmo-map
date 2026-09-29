from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
DEPLOY = ROOT / "deploy" / "hostinger"


class HostingerMasterSchedulerStaticTests(unittest.TestCase):
    def test_master_scheduler_preserves_all_legacy_offsets(self):
        text = (DEPLOY / "job001_master_scheduler.php").read_text(encoding="utf-8")
        for expr in (
            "0 6 * * 1",
            "*/15 * * * *",
            "7,22,37,52 * * * *",
            "8,23,38,53 * * * *",
            "10,25,40,55 * * * *",
            "*/5 * * * *",
            "17,47 * * * *",
            "2,17,32,47 * * * *",
            "11,26,41,56 * * * *",
            "3,18,33,48 * * * *",
            "5,20,35,50 * * * *",
            "9,39 * * * *",
            "13,43 * * * *",
            "23,53 * * * *",
            "1,16,31,46 * * * *",
            "14,44 * * * *",
            "12,42 * * * *",
            "6,21,36,51 * * * *",
            "36 11 * * 3",
        ):
            self.assertIn(expr, text)

    def test_master_scheduler_uses_gateway_secret_reference(self):
        text = (DEPLOY / "job001_master_scheduler.php").read_text(encoding="utf-8")
        self.assertIn("cerebro_job001_gateway_preprod.secret", text)
        self.assertIn("cerebro-job001-gateway-preprod", text)
        self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", text)

    def test_local_allowlist_covers_all_twenty_one_preprod_jobs(self):
        cfg = json.loads((DEPLOY / "job001_enabled_jobs.json").read_text(encoding="utf-8"))
        self.assertEqual(
            cfg["enabled_job_ids"],
            [2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],
        )


if __name__ == "__main__":
    unittest.main()
