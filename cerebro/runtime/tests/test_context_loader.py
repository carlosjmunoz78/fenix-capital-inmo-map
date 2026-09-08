import pathlib
import tempfile
import unittest

from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader, ContextValidationError
from cerebro.runtime.tenant_isolation import TenantIsolationError, TenantIsolationGuard


class ContextLoaderTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.registry = CompanyRegistry(pathlib.Path(self.tempdir.name) / "companies.json", environment="PREPROD")
        self.registry.register({
            "company_id": "fenix-capital",
            "legal_name": "Fénix Capital",
            "display_name": "Fénix",
            "owner": "CEREBRO Platform",
            "brands": ["Fénix"],
            "domains": ["fenix.example"],
            "geographies": ["ES"],
            "access_refs": ["runtime:shared"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "test"},
        })
        self.registry.register({
            "company_id": "acme-holdings",
            "legal_name": "Acme Holdings",
            "display_name": "Acme",
            "owner": "CEREBRO Platform",
            "brands": ["Acme"],
            "domains": ["acme.example"],
            "geographies": ["ES"],
            "access_refs": ["runtime:shared"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "test"},
        })
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")
        self.loader = ContextLoader(self.registry, self.guard)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_loads_same_company_context(self):
        value = self.loader.load(authenticated_company_id="fenix-capital", target_company_id="fenix-capital")
        self.assertEqual(value.company["company_id"], "fenix-capital")
        self.assertEqual(value.tenant.engine_id, "CTX-001")
        self.assertEqual(value.tenant.version, "0.2.0")

    def test_cross_company_is_denied_by_tenant(self):
        with self.assertRaises(TenantIsolationError):
            self.loader.load(authenticated_company_id="fenix-capital", target_company_id="acme-holdings")

    def test_subject_is_explicit_and_compact(self):
        value = self.loader.load(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", subject_kind="document", subject_id="doc-1")
        self.assertEqual(value.subject, {"kind": "document", "id": "doc-1"})
        with self.assertRaises(ContextValidationError):
            self.loader.load(authenticated_company_id="fenix-capital", target_company_id="fenix-capital", subject_kind="other", subject_id="x")

    def test_does_not_bind_to_model_or_enable_prod(self):
        health = self.loader.health()
        self.assertEqual(health["model_binding"], "NONE")
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])
        self.assertEqual(health["isolation_source"], "TENANT-001")


if __name__ == "__main__":
    unittest.main()
