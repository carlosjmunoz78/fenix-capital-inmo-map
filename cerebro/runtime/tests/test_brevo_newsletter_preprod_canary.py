import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "factory" / "governance" / "brevo-newsletter-preprod-canary-2026-09-28.json"


class BrevoNewsletterPreprodCanaryTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(EVIDENCE.read_text(encoding="utf-8"))

    def test_brevo_is_free_and_zero_additional_cost(self):
        self.assertEqual(self.data["account"]["plan"], "free")
        self.assertEqual(self.data["cost_additional_eur"], 0)

    def test_two_canonical_lists_exist(self):
        self.assertEqual(self.data["lists"]["PARTICULARES"]["id"], 17)
        self.assertEqual(self.data["lists"]["INMOBILIARIAS"]["id"], 18)

    def test_domain_and_sender_are_verified(self):
        self.assertTrue(self.data["sender"]["active"])
        self.assertTrue(self.data["domain"]["verified"])
        self.assertTrue(self.data["domain"]["authenticated"])
        self.assertTrue(self.data["domain"]["dkim_cname_1"])
        self.assertTrue(self.data["domain"]["dkim_cname_2"])
        self.assertTrue(self.data["domain"]["dmarc"])

    def test_schedule_canaries_are_safely_suspended(self):
        for item in self.data["schedule_canaries"]:
            self.assertEqual(item["scheduled_status"], "queued")
            self.assertEqual(item["cleanup_status"], "suspended")
            self.assertEqual(item["emails_sent"], 0)

    def test_no_real_contacts_touched(self):
        c = self.data["synthetic_contacts"]
        self.assertEqual(c["created_for_canary"], c["deleted_after_canary"])
        self.assertEqual(c["real_contacts_touched"], 0)

    def test_temp_function_is_retired(self):
        fn = self.data["temporary_canary_function"]
        self.assertEqual(fn["final_state"], "RETIRED_410")
        self.assertTrue(fn["verify_jwt"])


if __name__ == "__main__":
    unittest.main()
