from decimal import Decimal
import unittest

from cerebro.runtime.autonomy_guard import (
    AutonomyPolicy,
    AutonomyRequest,
    ComponentState,
    evaluate_autonomy,
)
from cerebro.runtime.cost_governor import SpendClass


class AutonomyGuardTests(unittest.TestCase):
    def req(self, **changes):
        base = dict(
            company_id="fenix",
            engine_id="SUPERVISOR-001",
            environment="PREPROD",
            version="v0",
            idempotency_key="k1",
            has_change_signal=True,
            runs_last_hour=0,
        )
        base.update(changes)
        return AutonomyRequest(**base)

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
            daily_soft_eur=Decimal("0.00"),
            daily_hard_eur=Decimal("0.00"),
            allow_paid_ai=False,
            allow_metered_external=False,
        )
        base.update(changes)
        return AutonomyPolicy(**base)

    def test_parked_component_cannot_run(self):
        d = evaluate_autonomy(self.policy(state=ComponentState.PARKED), self.req())
        self.assertFalse(d.allowed)
        self.assertEqual(d.decision, "DENY_COMPONENT_PARKED")

    def test_supervisor_requires_change_signal(self):
        d = evaluate_autonomy(self.policy(), self.req(has_change_signal=False))
        self.assertFalse(d.allowed)
        self.assertEqual(d.decision, "DENY_NO_CHANGE_SIGNAL")

    def test_hourly_rate_limit_blocks_loops(self):
        d = evaluate_autonomy(self.policy(), self.req(runs_last_hour=1))
        self.assertFalse(d.allowed)
        self.assertEqual(d.decision, "DENY_RATE_LIMIT")

    def test_ai_calls_default_zero(self):
        d = evaluate_autonomy(self.policy(), self.req(planned_ai_calls=1))
        self.assertFalse(d.allowed)
        self.assertEqual(d.human_required_reason, "MONEY_LIMIT")

    def test_paid_ai_default_denied_even_if_call_count_was_misreported(self):
        d = evaluate_autonomy(
            self.policy(max_ai_calls_per_run=1),
            self.req(
                planned_ai_calls=1,
                spend_class=SpendClass.PAID_AI,
                estimated_eur=Decimal("0.01"),
            ),
        )
        self.assertFalse(d.allowed)
        self.assertEqual(d.human_required_reason, "MONEY_LIMIT")

    def test_zero_cost_shadow_run_allowed_once_with_change(self):
        d = evaluate_autonomy(self.policy(), self.req())
        self.assertTrue(d.allowed)
        self.assertEqual(d.decision, "ALLOW_SHADOW")


if __name__ == "__main__":
    unittest.main()
