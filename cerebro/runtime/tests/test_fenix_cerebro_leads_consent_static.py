import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "runtime" / "wordpress" / "plugins" / "fenix-cerebro-leads-1.3.3.php"


class FenixCerebroLeadsConsentStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src = PLUGIN.read_text(encoding="utf-8")

    def test_marketing_consent_is_explicit_not_hardcoded_false(self):
        self.assertIn('name="marketing"', self.src)
        self.assertIn("consent_marketing:checked(", self.src)
        self.assertNotIn("consent_marketing:false", self.src)

    def test_generic_forms_detect_marketing_or_newsletter_checkbox(self):
        self.assertIn('name*="marketing"', self.src)
        self.assertIn('name*="newsletter"', self.src)
        self.assertIn('name*="comercial"', self.src)

    def test_elementor_capture_maps_explicit_marketing_field(self):
        self.assertIn("'consent_marketing' => (bool)fenix_cerebro_pick_elementor_field", self.src)

    def test_privacy_remains_required_separately(self):
        self.assertIn('name="privacy" required', self.src)
        self.assertIn("consent_privacy:true", self.src)


if __name__ == "__main__":
    unittest.main()
