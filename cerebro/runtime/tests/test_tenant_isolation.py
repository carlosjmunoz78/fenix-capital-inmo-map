import unittest

from cerebro.runtime.tenant_isolation import (
    TenantIsolationError,
    TenantValidationError,
    authorize_context,
    filter_company_records,
    health,
    namespace,
)


class TenantIsolationTests(unittest.TestCase):
    def test_same_company_context_is_authorized(self):
        ctx = authorize_context(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
            engine_id="CRM-001",
            environment="PREPROD",
            version="1.0.0",
        )
        self.assertEqual(ctx.company_id, "fenix-capital")
        self.assertEqual(ctx.engine_id, "CRM-001")
        self.assertEqual(ctx.environment, "PREPROD")

    def test_cross_company_context_is_denied(self):
        with self.assertRaises(TenantIsolationError) as caught:
            authorize_context(
                authenticated_company_id="fenix-capital",
                target_company_id="other-company",
                engine_id="CRM-001",
                environment="PREPROD",
                version="1.0.0",
            )
        self.assertEqual(caught.exception.human_required_code, "POLICY_CONFLICT")

    def test_prod_is_denied_in_v0(self):
        with self.assertRaises(TenantValidationError):
            authorize_context(
                authenticated_company_id="fenix-capital",
                target_company_id="fenix-capital",
                engine_id="CRM-001",
                environment="PROD",
                version="1.0.0",
            )

    def test_namespace_contains_company_boundary(self):
        ctx = authorize_context(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
            engine_id="DOC-001",
            environment="PREPROD",
            version="1.0.0",
        )
        self.assertEqual(namespace(ctx, "document", "doc-1"), "company/fenix-capital/document/doc-1")

    def test_mixed_company_records_fail_closed(self):
        ctx = authorize_context(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
            engine_id="CRM-001",
            environment="PREPROD",
            version="1.0.0",
        )
        with self.assertRaises(TenantIsolationError):
            filter_company_records(ctx, [
                {"company_id": "fenix-capital", "id": "a"},
                {"company_id": "other-company", "id": "b"},
            ])

    def test_same_company_records_are_copied(self):
        ctx = authorize_context(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
            engine_id="CRM-001",
            environment="PREPROD",
            version="1.0.0",
        )
        source = [{"company_id": "fenix-capital", "id": "a"}]
        result = filter_company_records(ctx, source)
        self.assertEqual(result, source)
        self.assertIsNot(result[0], source[0])

    def test_health_is_zero_cost_shared_runtime_and_prod_off(self):
        value = health()
        self.assertTrue(value["ok"])
        self.assertEqual(value["cross_company_access"], "DENY")
        self.assertEqual(value["runtime"], "shared")
        self.assertEqual(value["external_cost_eur"], 0)
        self.assertFalse(value["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
