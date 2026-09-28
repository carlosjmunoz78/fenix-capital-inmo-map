import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "factory" / "governance" / "plugin-universal-preprod-provider-canary-2026-09-28.json"


class UniversalPluginPreprodCanaryTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(EVIDENCE.read_text(encoding="utf-8"))

    def test_canary_never_published(self):
        self.assertFalse(self.data["published"])
        self.assertFalse(self.data["prod_impact"])
        self.assertEqual(self.data["final_state"], "trash_recoverable")

    def test_rollback_was_physically_proved(self):
        self.assertTrue(self.data["rollback_proved"])
        steps = {s["step"]: s for s in self.data["sequence"]}
        self.assertEqual(steps["trash"]["resulting_status"], "trash")
        self.assertTrue(steps["trash"]["restorable"])
        self.assertEqual(steps["restore"]["resulting_status"], "draft")
        self.assertEqual(steps["final_cleanup_to_trash"]["resulting_status"], "trash")

    def test_publish_verify_and_cleanup_are_proved(self):
        steps = {s["step"]: s for s in self.data["sequence"]}
        self.assertTrue(self.data["published_canary_verified"])
        self.assertEqual(steps["public_publish_verify"]["http_status"], 200)
        self.assertEqual(steps["post_publish_cleanup_to_trash"]["resulting_status"], "trash")
        self.assertEqual(steps["post_cleanup_public_verify"]["http_status"], 404)

    def test_schedule_canary_is_cleaned_up(self):
        self.assertTrue(self.data["scheduling_canary_verified"])
        steps = {s["step"]: s for s in self.data["sequence"]}
        self.assertEqual(steps["schedule_future"]["resulting_status"], "future")
        self.assertEqual(steps["schedule_cleanup"]["resulting_status"], "trash")

    def test_revision_rollback_is_proved(self):
        self.assertTrue(self.data["update_revision_rollback_verified"])
        steps = {s["step"]: s for s in self.data["sequence"]}
        self.assertEqual(steps["revision_restore"]["restored_content_marker"], "UPDATED-CONTENT")
        self.assertEqual(steps["update_canary_cleanup"]["resulting_status"], "trash")

    def test_zero_additional_cost(self):
        self.assertEqual(self.data["cost_additional_eur"], 0)


if __name__ == "__main__":
    unittest.main()
