import unittest

from cerebro.runtime.autonomy_guard import AutonomyPolicy, ComponentState
from cerebro.runtime.human_exception_sink import (
    HumanExceptionEvent,
    HumanExceptionSinkError,
    from_supervisor_plan,
    notion_properties,
    publish,
)
from cerebro.runtime.supervisor_cycle import SupervisorSignal, plan_supervisor_cycle


class HumanExceptionSinkTests(unittest.TestCase):
    def plan(self, *, engine="SUPERVISOR-001"):
        policy = AutonomyPolicy(
            company_id="fenix-capital",
            engine_id=engine,
            environment="PREPROD",
            version="0.1.0",
            state=ComponentState.ACTIVE,
            max_runs_per_hour=1,
            max_external_calls_per_run=0,
            max_ai_calls_per_run=0,
        )
        return plan_supervisor_cycle(
            policy=policy,
            signals=[SupervisorSignal("s1", "fenix-capital", "SEO-001", "COST", 5)],
            runs_last_hour=0,
            idempotency_key="x",
        )

    def test_non_human_plan_is_noop_projection(self):
        self.assertIsNone(from_supervisor_plan(self.plan(), event_id="evt-1"))

    def test_money_limit_from_supervisor_becomes_canonical_event(self):
        policy = AutonomyPolicy(
            company_id="fenix-capital",
            engine_id="SUPERVISOR-001",
            environment="PREPROD",
            version="0.1.0",
            state=ComponentState.ACTIVE,
            max_runs_per_hour=1,
            max_external_calls_per_run=0,
            max_ai_calls_per_run=0,
        )
        # Force an external-call budget denial through the guard.
        from cerebro.runtime.autonomy_guard import AutonomyRequest, evaluate_autonomy
        d = evaluate_autonomy(
            policy,
            AutonomyRequest(
                company_id="fenix-capital",
                engine_id="SUPERVISOR-001",
                environment="PREPROD",
                version="0.1.0",
                idempotency_key="evt-2",
                has_change_signal=True,
                runs_last_hour=0,
                planned_external_calls=1,
            ),
        )
        self.assertEqual(d.human_required_reason, "MONEY_LIMIT")

    def test_properties_keep_multiempresa_identity(self):
        e = HumanExceptionEvent("evt-3","fenix-capital","SEO-001","PREPROD","0.1","HIGH_RISK","DENY",("s1",))
        p = notion_properties(e)
        self.assertEqual(p["Human Exception Code"]["select"]["name"], "HIGH_RISK")
        self.assertEqual(p["Company ID"]["rich_text"][0]["text"]["content"], "fenix-capital")
        self.assertTrue(p["Requiere escalado"]["checkbox"])

    def test_publish_is_idempotent_update_when_row_exists(self):
        calls = []
        def transport(path, method, payload):
            calls.append((path, method, payload))
            if path.endswith("/query"):
                return {"results": [{"id": "page-1"}]}
            return {}
        e = HumanExceptionEvent("evt-4","fenix-capital","SEO-001","PREPROD","0.1","POLICY_CONFLICT","DENY",())
        self.assertEqual(publish(e, token="x", transport=transport), "updated")
        self.assertEqual(calls[-1][0], "/pages/page-1")
        self.assertEqual(calls[-1][1], "PATCH")

    def test_publish_creates_when_missing(self):
        calls = []
        def transport(path, method, payload):
            calls.append((path, method, payload))
            if path.endswith("/query"):
                return {"results": []}
            return {}
        e = HumanExceptionEvent("evt-5","fenix-capital","SEO-001","PREPROD","0.1","LOW_CONFIDENCE","DENY",())
        self.assertEqual(publish(e, token="x", transport=transport), "created")
        self.assertEqual(calls[-1][0], "/pages")

    def test_noncanonical_code_fails_closed(self):
        e = HumanExceptionEvent("evt-6","fenix-capital","SEO-001","PREPROD","0.1","OTHER","DENY",())
        with self.assertRaises(HumanExceptionSinkError):
            publish(e, token="x", transport=lambda *_: {})


if __name__ == "__main__":
    unittest.main()
