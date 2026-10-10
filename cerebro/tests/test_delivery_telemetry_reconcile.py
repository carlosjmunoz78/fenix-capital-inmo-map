import importlib.util
import pathlib
import unittest


MODULE_PATH = pathlib.Path(__file__).parents[1] / "communication" / "delivery-telemetry-reconcile.py"
spec = importlib.util.spec_from_file_location("delivery_telemetry_reconcile", MODULE_PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class DeliveryTelemetryReconcileTests(unittest.TestCase):
    def test_verified_delivery_updates_transport_only_after_evidence(self):
        state = {
            "last_digest_date": "2026-10-10",
            "last_delivery_at": None,
            "mail_transport": {"status": "UNVERIFIED", "last_success_at": None, "last_error": None},
            "safety": {"prod_write": False, "trading": False, "paid_fallback": False, "additional_cost_budget_eur": 0},
        }
        evidence = {
            "verified_at": "2026-10-10T22:00:01Z",
            "delivered_at": "2026-10-10T08:33:57Z",
            "message_id": "<digest@example>",
        }
        out, changed = mod.reconcile_state(state, "DIGEST:2026-10-10", evidence)
        self.assertTrue(changed)
        self.assertEqual(out["last_delivery_at"], "2026-10-10T08:33:57Z")
        self.assertEqual(out["mail_transport"]["status"], "VERIFIED")
        self.assertEqual(out["mail_transport"]["last_success_at"], "2026-10-10T08:33:57Z")
        self.assertEqual(out["mail_transport"]["last_verified_delivery_key"], "DIGEST:2026-10-10")
        self.assertFalse(out["safety"]["prod_write"])

    def test_missing_delivery_never_fabricates_success(self):
        state = {
            "last_digest_date": "2026-10-10",
            "last_delivery_at": None,
            "mail_transport": {"status": "UNVERIFIED", "last_success_at": None},
        }
        out, changed = mod.reconcile_state(state, "DIGEST:2026-10-10", None)
        self.assertFalse(changed)
        self.assertIsNone(out["last_delivery_at"])
        self.assertEqual(out["mail_transport"]["status"], "UNVERIFIED")


if __name__ == "__main__":
    unittest.main()
