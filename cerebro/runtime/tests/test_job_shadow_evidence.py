import unittest

from cerebro.runtime.job_scheduler import seo001_wave1_jobs
from cerebro.runtime.job_shadow_evidence import (
    EvidenceValidationError,
    ExecutionGuard,
    compare_legacy_to_shadow,
    idempotency_key,
)


LIVE_ROWS = [
    {"jobid": 2, "schedule": "0 6 * * 1", "command": "select net.http_post(url := 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-seo-cerebro-preprod');", "active": True},
    {"jobid": 6, "schedule": "7,22,37,52 * * * *", "command": "select net.http_post(url := 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-seo-growth-email-worker-preprod');", "active": True},
    {"jobid": 7, "schedule": "8,23,38,53 * * * *", "command": "select public.seo001_dispatch_active_city_quality_probe_preprod();", "active": True},
    {"jobid": 10, "schedule": "17,47 * * * *", "command": "select public.seo001_dispatch_downloadable_qa_preprod();", "active": True},
    {"jobid": 12, "schedule": "11,26,41,56 * * * *", "command": "select public.seo001_dispatch_lead_magnet_builder_preprod();", "active": True},
    {"jobid": 13, "schedule": "3,18,33,48 * * * *", "command": "select public.seo001_probe_wp_bridge_preprod();", "active": True},
    {"jobid": 16, "schedule": "13,43 * * * *", "command": "select public.seo001_dispatch_conversion_e2e_preprod();", "active": True},
    {"jobid": 21, "schedule": "12,42 * * * *", "command": "select public.seo001_dispatch_mobile_qa_preprod();", "active": True},
]


class ShadowEvidenceTests(unittest.TestCase):
    def test_live_snapshot_matches_all_eight_jobs(self):
        report = compare_legacy_to_shadow(LIVE_ROWS)
        self.assertTrue(report["ok"])
        self.assertEqual(report["matched_jobs"], 8)
        self.assertTrue(report["global_kill_switch"])
        self.assertFalse(report["network_enabled"])
        self.assertFalse(report["writes_enabled"])

    def test_schedule_drift_fails_closed(self):
        rows = [dict(row) for row in LIVE_ROWS]
        rows[0]["schedule"] = "0 7 * * 1"
        report = compare_legacy_to_shadow(rows)
        self.assertFalse(report["ok"])
        self.assertFalse(report["comparisons"][0]["schedule_match"])

    def test_disabled_legacy_job_is_not_equivalent(self):
        rows = [dict(row) for row in LIVE_ROWS]
        rows[1]["active"] = False
        report = compare_legacy_to_shadow(rows)
        self.assertFalse(report["ok"])
        self.assertFalse(report["comparisons"][1]["active_match"])

    def test_wrong_target_fails_closed(self):
        rows = [dict(row) for row in LIVE_ROWS]
        rows[2]["command"] = "select public.some_other_function();"
        report = compare_legacy_to_shadow(rows)
        self.assertFalse(report["ok"])
        self.assertFalse(report["comparisons"][2]["target_match"])

    def test_network_cannot_be_enabled_in_shadow(self):
        with self.assertRaises(EvidenceValidationError):
            compare_legacy_to_shadow(LIVE_ROWS, guard=ExecutionGuard(network_enabled=True))

    def test_writes_cannot_be_enabled_in_shadow(self):
        with self.assertRaises(EvidenceValidationError):
            compare_legacy_to_shadow(LIVE_ROWS, guard=ExecutionGuard(writes_enabled=True))

    def test_kill_switch_cannot_be_disabled_in_shadow(self):
        with self.assertRaises(EvidenceValidationError):
            compare_legacy_to_shadow(LIVE_ROWS, guard=ExecutionGuard(global_kill_switch=False))

    def test_idempotency_key_is_stable_and_scoped(self):
        job = seo001_wave1_jobs()[0]
        key1 = idempotency_key(job, "2026-09-28T06:00:00+00:00")
        key2 = idempotency_key(job, "2026-09-28T06:00:00+00:00")
        key3 = idempotency_key(job, "2026-10-05T06:00:00+00:00")
        self.assertEqual(key1, key2)
        self.assertNotEqual(key1, key3)


if __name__ == "__main__":
    unittest.main()
