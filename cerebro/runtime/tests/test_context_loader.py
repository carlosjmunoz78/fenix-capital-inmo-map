import pathlib
import tempfile
import unittest

from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader, ContextValidationError
from cerebro.runtime.tenant_isolation import TenantIsolationError, TenantIsolationGuard


class ContextLoaderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(self.tmp.name)
        self.registry = CompanyRegistry(root / "companies.json", environment="PREPROD")
        self.registry.register(self.payload("fenix-capital", "Fénix Capital"))
        self.registry.register(self.payload("acme-holdings", "Acme Holdings"))
        self.guard = TenantIsolationGuard(self.registry)
        self.loader = ContextLoader(self.registry, self.guard)

    def tearDown(self):
        self.tmp.cleanup()

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
            "access_refs": ["secret-store:external", "wordpress:site"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "ctx-test"},
        }

    def test_load_returns_scoped_safe_company_context(self):
        ctx = self.loader.load(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
        )
        self.assertEqual(ctx.tenant.company_id, "fenix-capital")
        self.assertEqual(ctx.company["display_name"], "Fénix Capital")
        self.assertNotIn("access_refs", ctx.company)

    def test_cross_company_is_denied_by_tenant(self):
        with self.assertRaises(TenantIsolationError):
            self.loader.load(
                authenticated_company_id="fenix-capital",
                target_company_id="acme-holdings",
            )

    def test_entity_context_requires_ref(self):
        with self.assertRaises(ContextValidationError):
            self.loader.load(
                authenticated_company_id="fenix-capital",
                target_company_id="fenix-capital",
                context_type="entity",
            )

    def test_unknown_context_type_rejected(self):
        with self.assertRaises(ContextValidationError):
            self.loader.load(
                authenticated_company_id="fenix-capital",
                target_company_id="fenix-capital",
                context_type="secret",
            )

    def test_health_is_provider_neutral_zero_cost_and_prod_off(self):
        health = self.loader.health()
        self.assertEqual(health["identity_source"], "COMP-REG-001")
        self.assertEqual(health["isolation_source"], "TENANT-001")
        self.assertFalse(health["secrets_loaded"])
        self.assertIsNone(health["model_binding"])
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
