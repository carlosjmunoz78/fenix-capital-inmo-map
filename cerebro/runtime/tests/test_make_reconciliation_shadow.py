import unittest

from cerebro.runtime.make_reconciliation_shadow import ReconciliationInput, reconcile_facebook_24h


class MakeReconciliationShadowTests(unittest.TestCase):
    def test_matches_live_make_scenario_contract(self):
        inp = ReconciliationInput(
            router={"status":"ROUTED_TO_FACEBOOK_ANALYTICS_TEST"},
            execution_log={"status":"OK"},
            capture={
                "status":"CAPTURED_PARTIAL",
                "notion_url":"https://app.notion.com/p/Facebook-V3B-01-Captura-24h-6682f2f27cff4df7a6e3ed69329d020a",
                "external_id":"654319477768791_122188435538900467",
                "result_hash":"REACTIONS_2|POST_FOUND|TIMEZONE_OK",
                "platform_state":"POST_FOUND",
                "notion_record_id":"6682f2f2-7cff-4df7-a6e3-ed69329d020a",
            },
            quality={
                "status":"PARTIAL_DATA_REVIEW",
                "notion_state":"Capturada",
                "result_hash":"Capturada|Parcial|Pendiente|false",
            },
        )
        out = reconcile_facebook_24h(inp)
        self.assertEqual(out["status"], "CONSISTENT_CAPTURED_PARTIAL_HOLD")
        self.assertEqual(out["difference"], "LEARNING_BLOCKED_PARTIAL_DATA")
        self.assertEqual(out["severity"], "warning")
        self.assertTrue(out["requires_human"])
        self.assertEqual(
            out["source_hash"],
            "ROUTED_TO_FACEBOOK_ANALYTICS_TEST|OK|CAPTURED_PARTIAL|PARTIAL_DATA_REVIEW",
        )
        self.assertEqual(
            out["result_hash"],
            "REACTIONS_2|POST_FOUND|TIMEZONE_OK|Capturada|Parcial|Pendiente|false",
        )

    def test_waiting_capture_is_non_human_informative(self):
        inp = ReconciliationInput(
            router={"status":"X"},
            execution_log={"status":"OK"},
            capture={"status":"NONE"},
            quality={"status":"WAITING_CAPTURE","notion_state":"Pendiente"},
        )
        out = reconcile_facebook_24h(inp)
        self.assertEqual(out["status"], "CONSISTENT_WAITING_CAPTURE")
        self.assertFalse(out["requires_human"])
        self.assertEqual(out["severity"], "informative")


if __name__ == "__main__":
    unittest.main()
