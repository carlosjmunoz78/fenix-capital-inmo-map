import unittest
from datetime import datetime
from zoneinfo import ZoneInfo

from cerebro.runtime.newsletter_weekly_scheduler import JOBS, jobs_by_audience, next_run, plan_stream_dispatch


class NewsletterWeeklySchedulerTests(unittest.TestCase):
    def test_two_distinct_weekly_streams(self):
        jobs = jobs_by_audience()
        self.assertEqual(set(jobs), {"PARTICULARES", "INMOBILIARIAS"})
        self.assertEqual(len(JOBS), 2)

    def test_particulares_fallback_is_tuesday_and_inmobiliarias_thursday(self):
        now = datetime(2026, 9, 28, 22, 30, tzinfo=ZoneInfo("Europe/Madrid"))
        jobs = jobs_by_audience()
        self.assertEqual(next_run(jobs["PARTICULARES"], now=now).weekday(), 1)
        self.assertEqual(next_run(jobs["INMOBILIARIAS"], now=now).weekday(), 3)

    def test_free_plan_waves_split_over_multiple_days(self):
        now = datetime(2026, 9, 28, 22, 30, tzinfo=ZoneInfo("Europe/Madrid"))
        waves = plan_stream_dispatch(jobs_by_audience()["PARTICULARES"], recipients=650, now=now)
        self.assertEqual([w.size for w in waves], [300, 300, 50])


if __name__ == "__main__":
    unittest.main()
