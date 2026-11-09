"""UMS-001 LAB · deterministic release guard unit tests.

Run: python -m unittest cerebro/media-studio/v2/tests/test_ums001_v54_editorial_release_gate.py
No API credentials, no publishing, no modifying other engines.
"""
import json
import unittest
from pathlib import Path

REGISTRY = Path(__file__).resolve().parents[1] / "registry" / "ums001-v54-editorial-ab-release-gates-20261109.json"
REQUIRED = {
    "media_integrity", "audio_video_format",
    "captions_meta_safe_export", "music_licensed_online_commercial",
    "es_ES_voice_model_identity", "voice_naturalness_accent_by_ear",
    "credit_sharvard_corpus_CC_BY3", "rights_of_visual_assets",
    "financial_advertising_and_intermediary_role", "meta_live_preview",
    "form_delivery_utm_ga4_crm", "explicit_commercial_approval",
}
ACCEPTED = {"PASS", "PASS_DOCUMENTED"}


def eligible_to_publish(registry):
    gates = registry["gates"]
    return (
        registry.get("permission_publish") is True
        and registry.get("permission_schedule") is True
        and registry.get("computed_status") == "RELEASE_APPROVED"
        and all(gates.get(k) in ACCEPTED for k in REQUIRED)
    )


class V54SafeReleaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads(REGISTRY.read_text(encoding="utf-8"))

    def test_scope_is_lab(self):
        m = self.registry
        self.assertEqual((m["company_id"], m["engine_id"], m["environment"]), ("fenix", "UMS-001", "LAB"))

    def test_mandatory_gates_are_declared(self):
        self.assertTrue(REQUIRED.issubset(self.registry["gates"].keys()))

    def test_existing_release_is_blocked(self):
        self.assertFalse(eligible_to_publish(self.registry))
        self.assertFalse(self.registry["permission_publish"])
        self.assertFalse(self.registry["permission_schedule"])

    def test_attempted_publication_with_open_gates_rejected(self):
        altered = {**self.registry, "permission_publish": True, "permission_schedule": True, "computed_status": "RELEASE_APPROVED"}
        self.assertFalse(eligible_to_publish(altered))

    def test_no_unverified_invoice_claim(self):
        self.assertFalse(self.registry["external_billing_reconciled"])

    def test_source_refs_exist(self):
        self.assertIn("https://drive.google.com/file/", self.registry["assets"]["instagram"]["final_video"])
        self.assertIn("https://drive.google.com/file/", self.registry["assets"]["facebook"]["final_video"])

if __name__ == "__main__":
    unittest.main()
