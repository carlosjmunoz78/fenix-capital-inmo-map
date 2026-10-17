from decimal import Decimal
import unittest

from cerebro.runtime.cost_governor import (
    BudgetPolicy,
    CostEvent,
    SpendClass,
    evaluate_cost,
)


class CostGovernorTests(unittest.TestCase):
    def policy(self, **changes):
        base = dict(
            company_id="fenix",
            engine_id="supervisor",
            environment="PREPROD",
            version="v0",
            daily_soft_eur=Decimal("0.00"),
            daily_hard_eur=Decimal("0.00"),
            allow_paid_ai=False,
            allow_metered_external=False,
        )
        base.update(changes)
        return BudgetPolicy(**base)

    def event(self, spend_class=SpendClass.DETERMINISTIC, eur="0.00", key="k1", **changes):
        base = dict(
            company_id="fenix",
            engine_id="supervisor",
            environment="PREPROD",
            version="v0",
            spend_class=spend_class,
            estimated_eur=Decimal(eur),
            idempotency_key=key,
        )
        base.update(changes)
        return CostEvent(**base)

    def test_zero_cost_deterministic_is_allowed(self):
        d = evaluate_cost(self.policy(), [], self.event())
        self.assertTrue(d.allowed)
        self.assertEqual(d.decision, "ALLOW_WITHIN_BUDGET")

    def test_paid_ai_defaults_fail_closed(self):
        d = evaluate_cost(self.policy(), [], self.event(SpendClass.PAID_AI, "0.01"))
        self.assertFalse(d.allowed)
        self.assertEqual(d.human_required_reason, "MONEY_LIMIT")

    def test_metered_external_defaults_fail_closed(self):
        d = evaluate_cost(self.policy(), [], self.event(SpendClass.METERED_EXTERNAL, "0.01"))
        self.assertFalse(d.allowed)
        self.assertEqual(d.human_required_reason, "MONEY_LIMIT")

    def test_hard_limit_blocks_even_when_paid_ai_allowed(self):
        p = self.policy(
            daily_soft_eur=Decimal("0.05"),
            daily_hard_eur=Decimal("0.10"),
            allow_paid_ai=True,
        )
        prior = [self.event(SpendClass.PAID_AI, "0.08", "old")]
        d = evaluate_cost(p, prior, self.event(SpendClass.PAID_AI, "0.03", "new"))
        self.assertFalse(d.allowed)
        self.assertEqual(d.decision, "DENY_DAILY_HARD_LIMIT")

    def test_idempotent_replay_does_not_double_charge(self):
        p = self.policy(daily_hard_eur=Decimal("0.10"))
        e = self.event(eur="0.00", key="same")
        d = evaluate_cost(p, [e], e)
        self.assertTrue(d.allowed)
        self.assertEqual(d.decision, "ALLOW_IDEMPOTENT_REPLAY")

    def test_scope_mismatch_fails_closed(self):
        d = evaluate_cost(
            self.policy(),
            [],
            self.event(company_id="other"),
        )
        self.assertFalse(d.allowed)
        self.assertEqual(d.human_required_reason, "POLICY_CONFLICT")


if __name__ == "__main__":
    unittest.main()
