import json
import unittest
from cerebro.runtime.notion_control_plane_sync import (
    CANONICAL_CODES,
    ENGINE_STATUSES,
    engine_to_properties,
    hex_to_properties,
    load_plan,
    run,
)


class NotionControlPlaneSyncTests(unittest.TestCase):
    def test_dry_run_never_writes_or_deletes(self):
        result = run(False, "2026-09-28")
        self.assertTrue(result["ok"])
        self.assertEqual(result["mode"], "DRY_RUN")
        self.assertEqual(result["created"], 0)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(result["deletes"], 0)
        self.assertGreater(result["engine_count"], 0)

    def test_plan_covers_registry_and_current_exception_queue(self):
        plan = load_plan("2026-09-28")
        self.assertGreaterEqual(len(plan["engines"]), 40)
        self.assertGreaterEqual(len(plan["exceptions"]), 1)
        self.assertTrue(plan["registry_version"])
        self.assertTrue(plan["queue_version"])

    def test_engine_status_is_fail_closed(self):
        props = engine_to_properties(
            {"engine_id": "X-001", "status": "SOMETHING_NEW", "environment": "PREPROD"},
            "v-test",
            "2026-09-28",
        )
        self.assertEqual(props["Status"]["select"]["name"], "UNKNOWN_REQUIRES_AUDIT")

    def test_human_exception_codes_are_exactly_canonical(self):
        self.assertEqual(len(CANONICAL_CODES), 8)
        self.assertIn("MONEY_LIMIT", CANONICAL_CODES)
        self.assertNotIn("MISSING_CREDENTIAL", CANONICAL_CODES)

    def test_exception_mapping_rejects_invented_code(self):
        with self.assertRaises(Exception):
            hex_to_properties({"id": "X", "code": "INVENTED"}, "1")

    def test_supported_engine_status_contract(self):
        self.assertEqual(
            ENGINE_STATUSES,
            {
                "CONFIRMED_OPERATIONAL",
                "DOCUMENTED_PARTIAL",
                "DEFINED_NOT_BUILT",
                "PROPOSED",
                "UNKNOWN_REQUIRES_AUDIT",
            },
        )


if __name__ == "__main__":
    unittest.main()
