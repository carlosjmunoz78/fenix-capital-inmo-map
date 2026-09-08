import pathlib
import tempfile
import unittest

from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.tenant_isolation import (
    TenantIsolationError,
    TenantIsolationGuard,
    TenantUnknownCompany,
    TenantValidationError,
)


class TenantIsolationTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tempdir.name)
        self.registry = CompanyRegistry(self.root / "companies.json", environment="PREPROD")
        self.registry.register(self.payload("fenix-capital", "Fénix Capital"))
        self.registry.register(self.payload("acme-holdings", "Acme Holdings"))
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def payload(company_id, name):
        return {
            "company_id": company_id,
            "legal_name": name,
            "display_name": name,
            "owner": "CEREBRO Platform",
            "brands": [name],
            "domains": [f"{company_id}.example.com"],
            "geographies": ["ES"],
            "access_refs": ["runtime:shared"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "tenant-test"},
        }

    def test_same_registered_company_is_authorized(self):
        context = self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", engine_id="CTX-001", version="0.1.0")
        self.assertEqual(context.company_id, "fenix-capital")
        self.assertEqual(context.environment, "PREPROD")

    def test_cross_company_access_is_policy_conflict(self):
        with self.assertRaises(TenantIsolationError) as ctx:
            self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="acme-holdings", engine_id="CTX-001", version="0.1.0")
        self.assertEqual(ctx.exception.human_required_code, "POLICY_CONFLICT")

    def test_unknown_company_is_denied(self):
        with self.assertRaises(TenantUnknownCompany):
            self.guard.authorize(authenticated_company_id="ghost-company", target_company_id="ghost-company", engine_id="CTX-001", version="0.1.0")

    def test_missing_company_id_is_invalid(self):
        with self.assertRaises(TenantValidationError):
            self.guard.authorize(authenticated_company_id="", target_company_id="", engine_id="CTX-001", version="0.1.0")

    def test_archived_company_is_denied(self):
        self.registry.transition("fenix-capital", "ARCHIVED")
        with self.assertRaises(TenantIsolationError):
            self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", engine_id="CTX-001", version="0.1.0")

    def test_mixed_company_records_are_rejected_not_filtered(self):
        context = self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", engine_id="CRMBOOT-001", version="0.1.0")
        with self.assertRaises(TenantIsolationError):
            self.guard.require_records(context, [{"company_id": "fenix-capital", "id": "1"}, {"company_id": "acme-holdings", "id": "2"}])

    def test_same_company_records_are_copied(self):
        context = self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", engine_id="CRMBOOT-001", version="0.1.0")
        source = [{"company_id": "fenix-capital", "id": "1"}]
        result = self.guard.require_records(context, source)
        self.assertEqual(result, source)
        self.assertIsNot(result[0], source[0])

    def test_namespace_and_metrics_are_company_scoped(self):
        context = self.guard.authorize(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", engine_id="KW-001", version="0.1.0")
        self.assertEqual(self.guard.namespace(context, "dataset", "keywords"), "company/fenix-capital/dataset/keywords")
        metric = self.guard.scoped_metric(context, "jobs.completed", 4)
        self.assertEqual(metric["company_id"], "fenix-capital")
        self.assertEqual(metric["engine_id"], "KW-001")

    def test_environment_must_match_company_registry(self):
        with self.assertRaises(TenantValidationError):
            TenantIsolationGuard(self.registry, environment="LAB")

    def test_prod_is_rejected(self):
        with self.assertRaises(TenantValidationError):
            TenantIsolationGuard(self.registry, environment="PROD")

    def test_health_declares_shared_zero_cost_fail_closed_runtime(self):
        health = self.guard.health()
        self.assertTrue(health["ok"])
        self.assertEqual(health["identity_source"], "COMP-REG-001")
        self.assertEqual(health["cross_company_access"], "DENY")
        self.assertEqual(health["runtime"], "shared")
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
