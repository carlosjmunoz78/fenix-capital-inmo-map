import unittest

from cerebro.runtime.autonomy_guard import AutonomyPolicy, ComponentState
from cerebro.runtime.supervisor_cycle import SupervisorSignal, plan_supervisor_cycle


class SupervisorCycleTests(unittest.TestCase):
    def policy(self, **changes):
        base = dict(
            company_id="fenix",
            engine_id="SUPERVISOR-001",
            environment="PREPROD",
            version="v0",
            state=ComponentState.SHADOW,
            max_runs_per_hour=1,
            max_external_calls_per_run=0,
            max_ai_calls_per_run=0,
            require_change_signal=True,
        )
        base.update(changes)
        return AutonomyPolicy(**base)

    def test_no_change_is_noop_and_costs_zero(self):
        p = plan_supervisor_cycle(
            policy=self.policy(), signals=[], runs_last_hour=0, idempotency_key="s1"
        )
        self.assertEqual(p.status, "NOOP")
        self.assertEqual(p.external_calls, 0)
        self.assertEqual(p.ai_calls, 0)

    def test_changed_signal_creates_deterministic_shadow_plan(self):
        signals = [
            SupervisorSignal("a", "fenix", "SEO-001", "QUALITY", 4, True),
            SupervisorSignal("b", "fenix", "CRM-001", "ERROR", 5, True),
        ]
        p = plan_supervisor_cycle(
            policy=self.policy(), signals=signals, runs_last_hour=0, idempotency_key="s2"
        )
        self.assertEqual(p.status, "SHADOW_PLAN")
        self.assertEqual(p.ai_calls, 0)
        self.assertEqual(p.external_calls, 0)
        self.assertEqual(len(p.deterministic_tasks), 2)

    def test_rate_limit_stops_repeat_cycle(self):
        p = plan_supervisor_cycle(
            policy=self.policy(),
            signals=[SupervisorSignal("a", "fenix", "SEO-001", "QUALITY", 2, True)],
            runs_last_hour=1,
            idempotency_key="s3",
        )
        self.assertEqual(p.status, "NOOP")
        self.assertEqual(p.guard_decision, "DENY_RATE_LIMIT")

    def test_other_company_signal_is_ignored(self):
        p = plan_supervisor_cycle(
            policy=self.policy(),
            signals=[SupervisorSignal("x", "other", "SEO-001", "ERROR", 5, True)],
            runs_last_hour=0,
            idempotency_key="s4",
        )
        self.assertEqual(p.status, "NOOP")

    def test_duplicate_signal_is_deduplicated(self):
        signals = [
            SupervisorSignal("a", "fenix", "SEO-001", "QUALITY", 2, True),
            SupervisorSignal("a", "fenix", "SEO-001", "QUALITY", 5, True),
        ]
        p = plan_supervisor_cycle(
            policy=self.policy(), signals=signals, runs_last_hour=0, idempotency_key="s5"
        )
        self.assertEqual(p.signal_ids, ("a",))
        self.assertEqual(len(p.deterministic_tasks), 1)


if __name__ == "__main__":
    unittest.main()
