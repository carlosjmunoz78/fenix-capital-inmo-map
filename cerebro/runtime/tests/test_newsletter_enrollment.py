import unittest

from cerebro.runtime.newsletter_enrollment import LeadCapturedEvent, enrollment_action


class NewsletterEnrollmentTests(unittest.TestCase):
    def test_consenting_lead_enters_correct_brevo_audience(self):
        action = enrollment_action(
            LeadCapturedEvent(
                lead_id="lead-1",
                email="a@example.com",
                audience="INMOBILIARIAS",
                marketing_consent=True,
                consent_source="wordpress_partner_form",
                consent_at="2026-09-28T12:00:00+02:00",
            ),
            audience_list_ids={"PARTICULARES": 11, "INMOBILIARIAS": 22},
        )
        self.assertEqual(action["provider"], "brevo")
        self.assertEqual(action["payload"]["listIds"], [22])
        self.assertIn("lead-1", action["idempotency_key"])

    def test_no_marketing_consent_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "consent"):
            enrollment_action(
                LeadCapturedEvent(
                    lead_id="lead-2",
                    email="b@example.com",
                    audience="PARTICULARES",
                    marketing_consent=False,
                    consent_source="wordpress_form",
                    consent_at="2026-09-28T12:00:00+02:00",
                ),
                audience_list_ids={"PARTICULARES": 11},
            )


if __name__ == "__main__":
    unittest.main()
