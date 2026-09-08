import pathlib
import tempfile
import unittest

from cerebro.runtime.chat_gateway import ChatValidationError, create_envelope, health
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.context_loader import ContextLoader
from cerebro.runtime.tenant_isolation import TenantIsolationGuard


class ChatGatewayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(self.tmp.name)
        registry = CompanyRegistry(root / "companies.json", environment="PREPROD")
        registry.register({
            "company_id": "fenix-capital",
            "legal_name": "Fénix Capital",
            "display_name": "Fénix Capital",
            "owner": "CEREBRO Platform",
            "brands": ["Fénix Capital"],
            "domains": ["fenixcapital.es"],
            "geographies": ["ES"],
            "access_refs": ["runtime:shared"],
            "lifecycle_state": "REGISTERED",
            "metadata": {"source": "chat-test"},
        })
        guard = TenantIsolationGuard(registry)
        loader = ContextLoader(registry, guard)
        self.context = loader.load(
            authenticated_company_id="fenix-capital",
            target_company_id="fenix-capital",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_envelope_carries_company_context_without_model_binding(self):
        env = create_envelope(
            request_id="req-001",
            context=self.context,
            message="Muéstrame los motores activos",
        )
        self.assertEqual(env.company_id, "fenix-capital")
        self.assertEqual(env.environment, "PREPROD")
        self.assertIsNone(env.model_route)

    def test_message_required(self):
        with self.assertRaises(ChatValidationError):
            create_envelope(request_id="req-002", context=self.context, message="   ")

    def test_invalid_channel_rejected(self):
        with self.assertRaises(ChatValidationError):
            create_envelope(
                request_id="req-003",
                context=self.context,
                message="hola",
                channel="public-webhook",
            )

    def test_health_declares_no_direct_model_or_action_execution(self):
        value = health()
        self.assertTrue(value["provider_neutral"])
        self.assertFalse(value["direct_model_binding"])
        self.assertFalse(value["network_calls"])
        self.assertFalse(value["executes_actions"])
        self.assertEqual(value["external_cost_eur"], 0)
        self.assertFalse(value["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
