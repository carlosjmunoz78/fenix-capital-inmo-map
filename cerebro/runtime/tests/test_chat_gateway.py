import unittest

from cerebro.runtime.chat_gateway import ChatValidationError, ConversationalGateway


class ConversationalGatewayTests(unittest.TestCase):
    def setUp(self):
        self.gateway = ConversationalGateway(environment="PREPROD")

    def test_prepare_is_deterministic_and_company_scoped(self):
        one = self.gateway.prepare(company_id="fenix-capital", text="  estado de motores  ", context_ref="company:fenix-capital")
        two = self.gateway.prepare(company_id="fenix-capital", text="estado de motores", context_ref="company:fenix-capital")
        self.assertEqual(one.request_id, two.request_id)
        self.assertEqual(one.company_id, "fenix-capital")
        self.assertEqual(one.environment, "PREPROD")

    def test_invalid_company_or_empty_text_is_rejected(self):
        with self.assertRaises(ChatValidationError):
            self.gateway.prepare(company_id="Fénix Capital", text="hola")
        with self.assertRaises(ChatValidationError):
            self.gateway.prepare(company_id="fenix-capital", text=" ")

    def test_blank_context_ref_is_rejected(self):
        with self.assertRaises(ChatValidationError):
            self.gateway.prepare(company_id="fenix-capital", text="hola", context_ref=" ")

    def test_v0_has_no_model_provider_or_action_execution(self):
        health = self.gateway.health()
        self.assertEqual(health["provider_binding"], "NONE")
        self.assertEqual(health["model_binding"], "NONE")
        self.assertEqual(health["action_execution"], "DENY")
        self.assertEqual(health["external_cost_eur"], 0)
        self.assertFalse(health["prod_enabled"])

    def test_prod_construction_is_rejected(self):
        with self.assertRaises(ChatValidationError):
            ConversationalGateway(environment="PROD")


if __name__ == "__main__":
    unittest.main()
