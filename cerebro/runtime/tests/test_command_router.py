import unittest

from cerebro.runtime.chat_gateway import ChatEnvelope
from cerebro.runtime.command_router import classify, health


class CommandRouterTests(unittest.TestCase):
    @staticmethod
    def chat(message, request_id="req-001"):
        return ChatEnvelope(
            request_id=request_id,
            company_id="fenix-capital",
            environment="PREPROD",
            context_type="company",
            message=message,
            channel="console",
            model_route=None,
        )

    def test_query_does_not_execute(self):
        command = classify(self.chat("muestra los motores activos"))
        self.assertEqual(command.command_type, "QUERY")
        self.assertFalse(command.requires_policy_check)
        self.assertFalse(command.executes_action)
        self.assertEqual(command.company_id, "fenix-capital")

    def test_action_requires_policy_and_does_not_execute(self):
        command = classify(self.chat("crear una tarea"))
        self.assertEqual(command.command_type, "ACTION")
        self.assertTrue(command.requires_policy_check)
        self.assertFalse(command.executes_action)

    def test_orchestration_requires_policy(self):
        command = classify(self.chat("inicia el onboarding completo"))
        self.assertEqual(command.command_type, "ORCHESTRATION")
        self.assertTrue(command.requires_policy_check)

    def test_unknown_defaults_to_conservative_action(self):
        command = classify(self.chat("haz algo con este expediente"))
        self.assertEqual(command.command_type, "ACTION")
        self.assertTrue(command.requires_policy_check)

    def test_sensitive_prod_text_never_bypasses_policy(self):
        command = classify(self.chat("show production configuration"))
        self.assertTrue(command.requires_policy_check)
        self.assertFalse(command.executes_action)

    def test_health_is_deterministic_zero_cost_and_non_prod(self):
        value = health()
        self.assertTrue(value["deterministic"])
        self.assertFalse(value["executes_actions"])
        self.assertEqual(value["unknown_default"], "ACTION_REQUIRES_POLICY")
        self.assertEqual(value["external_cost_eur"], 0)
        self.assertFalse(value["prod_enabled"])


if __name__ == "__main__":
    unittest.main()
