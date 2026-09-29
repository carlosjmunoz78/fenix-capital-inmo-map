import unittest

from cerebro.runtime.job_executor import (
    CanaryPolicy,
    ExecutionPolicyError,
    canary_rationale,
)
from cerebro.runtime.job_scheduler import seo001_wave1_jobs


class CanaryPolicyTests(unittest.TestCase):
    def setUp(self):
        self.jobs = {j.legacy_pg_cron_job_id: j for j in seo001_wave1_jobs()}

    def test_default_policy_is_inert(self):
        with self.assertRaises(ExecutionPolicyError):
            CanaryPolicy().authorize(self.jobs[13])

    def test_only_job_13_can_be_authorized(self):
        policy = CanaryPolicy(
            global_kill_switch=False,
            execution_enabled=True,
            credential_ref="vault://cerebro/preprod/supabase-rpc",
        )
        result = policy.authorize(self.jobs[13])
        self.assertTrue(result["authorized"])
        self.assertEqual(result["legacy_pg_cron_job_id"], 13)
        with self.assertRaises(ExecutionPolicyError):
            policy.authorize(self.jobs[21])

    def test_secretless_credential_reference_is_required(self):
        policy = CanaryPolicy(global_kill_switch=False, execution_enabled=True)
        with self.assertRaises(ExecutionPolicyError):
            policy.authorize(self.jobs[13])

    def test_retries_fail_closed(self):
        policy = CanaryPolicy(
            global_kill_switch=False,
            execution_enabled=True,
            credential_ref="vault://cerebro/preprod/supabase-rpc",
            max_attempts=2,
        )
        with self.assertRaises(ExecutionPolicyError):
            policy.authorize(self.jobs[13])

    def test_rationale_does_not_authorize_cutover(self):
        rationale = canary_rationale()
        self.assertEqual(rationale["legacy_pg_cron_job_id"], 13)
        self.assertFalse(rationale["cutover_authorized"])


if __name__ == "__main__":
    unittest.main()
