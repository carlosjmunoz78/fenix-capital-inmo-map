import json
import pathlib
import tempfile
import unittest

from cerebro.runtime.company_registry import (
    CompanyRegistry,
    LifecycleTransitionError,
    RegistryPolicyConflict,
    RegistrySecurityError,
    RegistryValidationError,
)


class CompanyRegistryTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tempdir.name)
        self.registry = CompanyRegistry(self.root / "company-registry.json", environment="PREPROD")

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def payload(company_id="fenix-capital", display_name="Fénix Capital"):
        return {
            "company_id": company_id,
            "legal_name": display_name,
            "display_name": display_name,
            "owner": "CEREBRO Platform",
            "brands": [display_name],
            "domains": [f"{company_id}.example.com"],
            "geographies": ["ES-AN-Cordoba"],
            "access_refs": ["wordpress:site", "github:repo"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "test"},
        }

    def test_register_persists_and_health_is_green(self):
        record = self.registry.register(self.payload())
        self.assertEqual(record["company_id"], "fenix-capital")
        self.assertEqual(record["record_version"], 1)
        reopened = CompanyRegistry(self.root / "company-registry.json", environment="PREPROD")
        self.assertEqual(reopened.get("fenix-capital"), record)
        health = reopened.health()
        self.assertTrue(health["ok"])
        self.assertEqual(health["company_count"], 1)
        self.assertEqual(health["audit_count"], 1)
        self.assertEqual(health["external_cost_eur"], 0)

    def test_identical_replay_is_no_change(self):
        first = self.registry.register(self.payload())
        second = self.registry.register(self.payload())
        self.assertEqual(first, second)
        self.assertEqual(len(self.registry.audit_events()), 1)

    def test_same_company_id_different_data_is_policy_conflict(self):
        self.registry.register(self.payload())
        changed = self.payload(display_name="Other Name")
        with self.assertRaises(RegistryPolicyConflict) as ctx:
            self.registry.register(changed)
        self.assertEqual(ctx.exception.human_required_code, "POLICY_CONFLICT")
        self.assertEqual(self.registry.get("fenix-capital")["display_name"], "Fénix Capital")

    def test_secret_like_fields_are_rejected(self):
        payload = self.payload()
        payload["metadata"] = {"api_token": "do-not-store"}
        with self.assertRaises(RegistrySecurityError) as ctx:
            self.registry.register(payload)
        self.assertEqual(ctx.exception.human_required_code, "SECURITY_INCIDENT")
        self.assertEqual(self.registry.health()["company_count"], 0)

    def test_multiple_companies_remain_distinct(self):
        self.registry.register(self.payload("fenix-capital", "Fénix Capital"))
        self.registry.register(self.payload("acme-holdings", "Acme Holdings"))
        companies = self.registry.list_companies()
        self.assertEqual([item["company_id"] for item in companies], ["acme-holdings", "fenix-capital"])
        self.assertNotEqual(self.registry.get("fenix-capital"), self.registry.get("acme-holdings"))

    def test_lifecycle_transitions_are_explicit(self):
        self.registry.register(self.payload())
        onboarding = self.registry.transition("fenix-capital", "ONBOARDING")
        self.assertEqual(onboarding["lifecycle_state"], "ONBOARDING")
        self.assertEqual(onboarding["record_version"], 2)
        active = self.registry.transition("fenix-capital", "ACTIVE")
        self.assertEqual(active["lifecycle_state"], "ACTIVE")
        with self.assertRaises(LifecycleTransitionError) as ctx:
            self.registry.transition("fenix-capital", "REGISTERED")
        self.assertEqual(ctx.exception.human_required_code, "POLICY_CONFLICT")

    def test_snapshot_and_restore_have_checksum_proof(self):
        self.registry.register(self.payload())
        snapshot = self.root / "backup" / "registry.snapshot.json"
        proof = self.registry.snapshot(snapshot)
        self.registry.transition("fenix-capital", "ONBOARDING")
        self.assertEqual(self.registry.get("fenix-capital")["lifecycle_state"], "ONBOARDING")
        restored = self.registry.restore(snapshot, expected_sha256=proof["sha256"])
        self.assertTrue(restored["ok"])
        self.assertEqual(self.registry.get("fenix-capital")["lifecycle_state"], "REGISTERED")
        self.assertEqual(len(self.registry.audit_events()), 1)

    def test_bad_snapshot_checksum_is_rejected(self):
        self.registry.register(self.payload())
        snapshot = self.root / "snapshot.json"
        self.registry.snapshot(snapshot)
        with self.assertRaises(RegistryValidationError):
            self.registry.restore(snapshot, expected_sha256="0" * 64)

    def test_prod_runtime_is_rejected(self):
        with self.assertRaises(RegistryValidationError):
            CompanyRegistry(self.root / "prod.json", environment="PROD")

    def test_new_company_cannot_skip_registered_state(self):
        payload = self.payload()
        payload["lifecycle_state"] = "ACTIVE"
        with self.assertRaises(RegistryValidationError):
            self.registry.register(payload)

    def test_storage_is_valid_json_and_contains_no_secrets(self):
        payload = self.payload()
        self.registry.register(payload)
        text = (self.root / "company-registry.json").read_text(encoding="utf-8")
        data = json.loads(text)
        self.assertEqual(data["engine_id"], "COMP-REG-001")
        self.assertNotIn("password", text.lower())
        self.assertNotIn("api_token", text.lower())


if __name__ == "__main__":
    unittest.main()
