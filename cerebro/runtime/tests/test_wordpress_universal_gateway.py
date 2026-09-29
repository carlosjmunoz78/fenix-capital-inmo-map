import unittest

from cerebro.runtime.wordpress_universal_gateway import (
    Capability,
    GatewayRequest,
    ProviderBinding,
    TenantScope,
    UniversalPluginGateway,
    build_fenix_preprod_gateway,
)


class UniversalPluginGatewayTests(unittest.TestCase):
    def test_fenix_plan_exposes_existing_capabilities_without_inventing_gaps(self):
        inventory = build_fenix_preprod_gateway().inventory()
        self.assertIn("LEAD_CAPTURE", inventory)
        self.assertIn("CONTENT_PUBLISH", inventory)
        self.assertIn("BACKUP", inventory)
        self.assertIn("FORM_MANAGE", inventory)
        self.assertEqual(inventory["FORM_MANAGE"]["provider"], "hostinger_reach")
        self.assertIn("NEWSLETTER_MANAGE", inventory)
        self.assertEqual(inventory["NEWSLETTER_MANAGE"]["provider"], "brevo")
        self.assertIn("emailCampaigns", inventory["NEWSLETTER_MANAGE"]["operation"])
        self.assertIn("NEWSLETTER_SEND", inventory)
        self.assertEqual(inventory["NEWSLETTER_SEND"]["provider"], "brevo")

    def test_scope_mismatch_fails_closed(self):
        gateway = build_fenix_preprod_gateway()
        result = gateway.decide(
            GatewayRequest(
                TenantScope("other-company", "PREPROD", "0.1.0"),
                Capability.CONTENT_READ,
                "idem-12345678",
            )
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.human_required_code, "POLICY_CONFLICT")

    def test_mutation_requires_confirmation(self):
        gateway = build_fenix_preprod_gateway()
        result = gateway.decide(
            GatewayRequest(
                gateway.scope,
                Capability.SEO_WRITE,
                "idem-12345678",
                confirmed=False,
            )
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.human_required_code, "HIGH_RISK")

    def test_read_only_preprod_can_be_allowed(self):
        gateway = build_fenix_preprod_gateway()
        result = gateway.decide(
            GatewayRequest(
                gateway.scope,
                Capability.CONTENT_READ,
                "idem-12345678",
            )
        )
        self.assertTrue(result.allowed)
        self.assertEqual(result.provider, "cowboy")

    def test_prod_is_not_promoted_by_default(self):
        scope = TenantScope("fenix-capital", "PROD", "0.1.0")
        gateway = UniversalPluginGateway(scope=scope)
        gateway.bind(
            ProviderBinding(
                Capability.CONTENT_READ,
                "cowboy",
                "wp_get_post",
                "READ_ONLY",
                prod_allowed=False,
            )
        )
        result = gateway.decide(
            GatewayRequest(scope, Capability.CONTENT_READ, "idem-12345678")
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.human_required_code, "HIGH_RISK")

    def test_missing_provider_is_policy_conflict(self):
        gateway = build_fenix_preprod_gateway()
        result = gateway.execute(
            GatewayRequest(
                gateway.scope,
                Capability.CONTENT_READ,
                "idem-12345678",
            ),
            adapters={},
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.human_required_code, "POLICY_CONFLICT")


if __name__ == "__main__":
    unittest.main()
