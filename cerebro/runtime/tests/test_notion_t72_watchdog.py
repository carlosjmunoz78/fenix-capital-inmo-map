from datetime import datetime, timedelta, timezone
import unittest

from cerebro.runtime.notion_t72_watchdog import PublicationState, decide_t72


class NotionT72WatchdogTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)

    def state(self, **changes):
        base = dict(
            page_id="p1",
            publication_status="Pendiente de publicar",
            t48_approved=False,
            reminder_sent=False,
            has_schedule_relation=True,
            scheduled_at=self.now + timedelta(hours=60),
        )
        base.update(changes)
        return PublicationState(**base)

    def test_matches_make_t72_window(self):
        d = decide_t72(self.state(), self.now)
        self.assertTrue(d.should_update)
        self.assertEqual(d.action, "SET_T72_REMINDER")
        self.assertTrue(d.notice.startswith("T-72"))

    def test_outside_window_is_noop(self):
        d = decide_t72(self.state(scheduled_at=self.now + timedelta(hours=73)), self.now)
        self.assertFalse(d.should_update)
        self.assertEqual(d.action, "NOOP_OUTSIDE_T72")

    def test_t48_approved_is_noop(self):
        self.assertFalse(decide_t72(self.state(t48_approved=True), self.now).should_update)

    def test_already_reminded_is_idempotent(self):
        self.assertFalse(decide_t72(self.state(reminder_sent=True), self.now).should_update)

    def test_past_schedule_is_noop(self):
        d = decide_t72(self.state(scheduled_at=self.now - timedelta(minutes=1)), self.now)
        self.assertEqual(d.action, "NOOP_NOT_FUTURE")


if __name__ == "__main__":
    unittest.main()
