import importlib.util
import pathlib
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "communication" / "mail_bridge.py"
spec = importlib.util.spec_from_file_location("mail_bridge", MODULE_PATH)
mail_bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mail_bridge)


class MailBridgeSecurityTests(unittest.TestCase):
    def setUp(self):
        self.secret = "unit-test-private-secret"
        self.approval_id = "APR-20261008-ABCDEF12"

    def test_signed_command_round_trip(self):
        line = f"AUTORIZO {self.approval_id}"
        signed = mail_bridge.sign_command_line(line, self.secret)
        self.assertRegex(signed, rf"^AUTORIZO {self.approval_id} SIG-[A-F0-9]{{32}}$")
        self.assertEqual(mail_bridge.verified_commands(signed, self.secret), [line])

    def test_forged_or_unsigned_command_is_rejected(self):
        unsigned = f"AUTORIZO {self.approval_id}"
        forged = f"AUTORIZO {self.approval_id} SIG-{'0' * 32}"
        self.assertEqual(mail_bridge.verified_commands(unsigned, self.secret), [])
        self.assertEqual(mail_bridge.verified_commands(forged, self.secret), [])

    def test_multiple_independent_commands_verify(self):
        lines = [
            f"AUTORIZO {self.approval_id}",
            "NO AUTORIZO APR-20261008-12345678",
            "EXPLICAME APR-20261008-87654321",
        ]
        signed = "\n".join(mail_bridge.sign_command_line(line, self.secret) for line in lines)
        self.assertEqual(mail_bridge.verified_commands(signed, self.secret), lines)

    def test_quoted_signed_commands_are_not_accepted(self):
        signed = mail_bridge.sign_command_line(f"AUTORIZO {self.approval_id}", self.secret)
        text = f"No autorizo todavía.\n\nEl miércoles CEREBRO escribió:\n> {signed}"
        self.assertEqual(mail_bridge.verified_commands(text, self.secret), [])

    def test_signature_is_bound_to_verb_and_approval_id(self):
        sig = mail_bridge.command_signature(self.secret, "AUTORIZO", self.approval_id)
        other_verb = mail_bridge.command_signature(self.secret, "NO AUTORIZO", self.approval_id)
        other_id = mail_bridge.command_signature(self.secret, "AUTORIZO", "APR-20261008-00000000")
        self.assertNotEqual(sig, other_verb)
        self.assertNotEqual(sig, other_id)


if __name__ == "__main__":
    unittest.main()