import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "communication" / "mail_bridge.py"
spec = importlib.util.spec_from_file_location("mail_bridge", MODULE_PATH)
mail_bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mail_bridge)


class MailBridgeTests(unittest.TestCase):
    def setUp(self):
        self.approval_id = "APR-20261008-ABCDEF12"

    def test_exact_command_is_accepted(self):
        line = f"AUTORIZO {self.approval_id}"
        self.assertEqual(mail_bridge.exact_commands(line), [line])

    def test_exact_park_command_is_accepted(self):
        line = f"APARCO {self.approval_id}"
        self.assertEqual(mail_bridge.exact_commands(line), [line])

    def test_generic_yes_or_park_is_not_a_decision(self):
        self.assertEqual(mail_bridge.exact_commands("sí, vale, procede, aparca"), [])

    def test_multiple_independent_commands_are_accepted(self):
        lines = [
            f"AUTORIZO {self.approval_id}",
            "NO AUTORIZO APR-20261008-12345678",
            "EXPLICAME APR-20261008-87654321",
            "APARCO APR-20261008-A1B2C3D4",
        ]
        self.assertEqual(mail_bridge.exact_commands("\n".join(lines)), lines)

    def test_quoted_commands_are_not_accepted(self):
        text = f"No autorizo todavía.\n\nEl miércoles CEREBRO escribió:\n> AUTORIZO {self.approval_id}\n> APARCO {self.approval_id}"
        self.assertEqual(mail_bridge.exact_commands(text), [])

    def test_delivery_message_id_is_stable_for_same_logical_items(self):
        a = mail_bridge.deterministic_message_id(["APPROVAL:APR-1", "APPROVAL:APR-2"])
        b = mail_bridge.deterministic_message_id(["APPROVAL:APR-2", "APPROVAL:APR-1"])
        self.assertEqual(a, b)

    def test_decision_url_contains_only_route_approval_and_intent(self):
        url = mail_bridge.owner_decision_url(self.approval_id, "AUTORIZO", "https://app.fenixcapital.es")
        self.assertEqual(
            url,
            "https://app.fenixcapital.es/cerebro/decision?approval_id=APR-20261008-ABCDEF12&intent=AUTORIZO",
        )
        lowered = url.lower()
        self.assertNotIn("token", lowered)
        self.assertNotIn("secret", lowered)
        self.assertNotIn("jwt", lowered)

    def test_html_buttons_are_navigation_only_and_cover_all_exact_decisions(self):
        item = {"text": f"Necesito tu decisión.\nAUTORIZO {self.approval_id}"}
        rendered = mail_bridge.approval_batch_html("Te necesito.", [item], "https://app.fenixcapital.es")
        self.assertIn("Autorizar", rendered)
        self.assertIn("Rechazar", rendered)
        self.assertIn("Explícame", rendered)
        self.assertIn("Aparcar", rendered)
        self.assertIn("approval_id=APR-20261008-ABCDEF12", rendered)
        self.assertIn("No autoriza nada hasta", rendered)
        self.assertNotIn("access_token", rendered)


if __name__ == "__main__":
    unittest.main()
