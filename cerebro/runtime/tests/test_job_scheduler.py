from datetime import datetime, timezone
import unittest

from cerebro.runtime.job_scheduler import (
    CronSpec,
    JobSpec,
    SchedulerValidationError,
    ShadowScheduler,
    seo001_wave1_jobs,
)


class CronSpecTests(unittest.TestCase):
    def test_every_fifteen_minutes(self):
        spec = CronSpec.parse("*/15 * * * *")
        self.assertTrue(spec.matches(datetime(2026, 9, 28, 10, 30, tzinfo=timezone.utc)))
        self.assertFalse(spec.matches(datetime(2026, 9, 28, 10, 31, tzinfo=timezone.utc)))

    def test_weekly_monday(self):
        spec = CronSpec.parse("0 6 * * 1")
        self.assertTrue(spec.matches(datetime(2026, 9, 28, 6, 0, tzinfo=timezone.utc)))
        self.assertFalse(spec.matches(datetime(2026, 9, 29, 6, 0, tzinfo=timezone.utc)))

    def test_timezone_is_required(self):
        with self.assertRaises(SchedulerValidationError):
            CronSpec.parse("0 6 * * 1").matches(datetime(2026, 9, 28, 6, 0))


class Wave1SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.scheduler = ShadowScheduler(seo001_wave1_jobs())

    def test_exactly_eight_wave1_jobs_are_registered(self):
        self.assertEqual(len(self.scheduler.jobs), 8)
        self.assertEqual({j.legacy_pg_cron_job_id for j in self.scheduler.jobs}, {2, 6, 7, 10, 12, 13, 16, 21})

    def test_all_jobs_are_preprod_and_shadow_only(self):
        for job in self.scheduler.jobs:
            self.assertEqual(job.environment, "PREPROD")
            self.assertTrue(job.shadow_only)
            self.assertEqual(job.company_id, "FENIX_CAPITAL")
            self.assertEqual(job.engine_id, "SEO-001")

    def test_due_jobs_match_legacy_minutes(self):
        due = self.scheduler.due(datetime(2026, 9, 28, 10, 22, tzinfo=timezone.utc))
        self.assertEqual([j.legacy_pg_cron_job_id for j in due], [6])
        due = self.scheduler.due(datetime(2026, 9, 28, 10, 43, tzinfo=timezone.utc))
        self.assertEqual([j.legacy_pg_cron_job_id for j in due], [16])

    def test_shadow_plan_has_no_execution_mode(self):
        plans = self.scheduler.shadow_plans(datetime(2026, 9, 28, 10, 12, tzinfo=timezone.utc))
        self.assertEqual(len(plans), 1)
        self.assertEqual(plans[0]["legacy_pg_cron_job_id"], 21)
        self.assertEqual(plans[0]["mode"], "SHADOW_NO_SIDE_EFFECT")

    def test_health_declares_zero_cost_and_no_prod(self):
        health = self.scheduler.health()
        self.assertTrue(health["ok"])
        self.assertEqual(health["jobs"], 8)
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])

    def test_prod_job_is_rejected(self):
        bad = JobSpec(
            job_id="bad",
            legacy_pg_cron_job_id=999,
            company_id="FENIX_CAPITAL",
            engine_id="SEO-001",
            environment="PROD",
            version="v0",
            schedule="* * * * *",
            action_kind="RPC",
            target="noop",
        )
        with self.assertRaises(SchedulerValidationError):
            ShadowScheduler([bad])

    def test_non_shadow_job_is_rejected(self):
        bad = JobSpec(
            job_id="bad",
            legacy_pg_cron_job_id=999,
            company_id="FENIX_CAPITAL",
            engine_id="SEO-001",
            environment="PREPROD",
            version="v0",
            schedule="* * * * *",
            action_kind="RPC",
            target="noop",
            shadow_only=False,
        )
        with self.assertRaises(SchedulerValidationError):
            ShadowScheduler([bad])


if __name__ == "__main__":
    unittest.main()
