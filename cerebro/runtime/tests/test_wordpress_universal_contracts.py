import unittest

from cerebro.runtime.wordpress_universal_contracts import (
    CompanyWebProfile,
    FormContract,
    NewsletterStreamContract,
    fenix_company_profile,
    fenix_form_contracts,
    fenix_newsletter_streams,
    unique_ids,
)


class UniversalWordPressContractsTests(unittest.TestCase):
    def test_company_profile_keeps_fenix_values_out_of_gateway_logic(self):
        profile = fenix_company_profile()
        self.assertEqual(profile.company_id, "fenix-capital")
        self.assertEqual(profile.primary_domain, "fenixcapital.es")
        self.assertEqual(profile.public_email, "hipotecas@fenixcapital.es")

    def test_forms_are_multi_audience_and_privacy_safe(self):
        forms = fenix_form_contracts()
        self.assertTrue(unique_ids(forms, "form_key"))
        self.assertIn("PARTICULARES", {f.audience for f in forms})
        self.assertIn("INMOBILIARIAS", {f.audience for f in forms})
        self.assertTrue(all(f.consent_privacy_required for f in forms))

    def test_newsletters_are_two_distinct_weekly_streams_but_disabled_until_provider(self):
        streams = fenix_newsletter_streams()
        self.assertEqual(len(streams), 2)
        self.assertTrue(unique_ids(streams, "stream_id"))
        self.assertEqual({s.audience for s in streams}, {"PARTICULARES", "INMOBILIARIAS"})
        self.assertTrue(all(s.cadence == "WEEKLY" for s in streams))
        self.assertTrue(all(s.requires_marketing_consent for s in streams))
        self.assertTrue(all(not s.enabled for s in streams))
        self.assertTrue(all(s.provider == "brevo" for s in streams))

    def test_enabled_newsletter_without_provider_fails_closed(self):
        with self.assertRaises(ValueError):
            NewsletterStreamContract(
                stream_id="x",
                company_id="fenix-capital",
                audience="PARTICULARES",
                cadence="WEEKLY",
                requires_marketing_consent=True,
                provider=None,
                enabled=True,
            ).validate()

    def test_form_without_identifier_fails(self):
        with self.assertRaises(ValueError):
            FormContract(
                form_key="x",
                company_id="fenix-capital",
                audience="PARTICULARES",
                required_fields=("name",),
            ).validate()


if __name__ == "__main__":
    unittest.main()
