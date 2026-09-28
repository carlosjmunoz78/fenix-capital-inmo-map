import hashlib
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
PLUGIN = ROOT / "runtime" / "wordpress" / "plugins" / "fenix-cerebro-leads-1.3.3.php"


class FenixCerebroLeadsConsentStaticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src = PLUGIN.read_text(encoding="utf-8")

    def test_candidate_is_exactly_version_1_3_3(self):
        self.assertIn("Version: 1.3.3", self.src)
        self.assertIn("const FENIX_CEREBRO_LEADS_VERSION = '1.3.3';", self.src)

    def test_candidate_has_stable_nonempty_integrity_hash(self):
        digest = hashlib.sha256(PLUGIN.read_bytes()).hexdigest()
        self.assertEqual(len(digest), 64)
        self.assertNotEqual(digest, "0" * 64)

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

    def test_rest_route_and_idempotency_contract_remain_present(self):
        self.assertIn("register_rest_route('fenix-cerebro/v1', '/lead'", self.src)
        self.assertIn("'x-fenix-idempotency-key' => $idem", self.src)

    def test_no_prod_promotion_logic_is_embedded(self):
        forbidden = ("activate_plugin(", "switch_theme(", "wp_update_plugin(", "sendNow")
        for marker in forbidden:
            self.assertNotIn(marker, self.src)


if __name__ == "__main__":
    unittest.main()
