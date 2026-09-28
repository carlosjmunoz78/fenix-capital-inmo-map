import unittest

from cerebro.runtime.brevo_newsletter_client import BrevoNewsletterAdapter


class BrevoNewsletterAdapterTests(unittest.TestCase):
    def test_contact_and_campaign_paths(self):
        calls = []
        def transport(method, path, payload=None):
            calls.append((method, path, payload))
            return {"status_code": 200, "body": {"ok": True}}

        api = BrevoNewsletterAdapter(api_key="x", transport=transport)
        api.upsert_contact({"email": "a@example.com"})
        api.create_campaign({"name": "weekly"})
        api.update_campaign(7, {"subject": "x"})
        api.get_campaign(7)
        api.send_now(7)

        self.assertEqual(calls[0][0:2], ("POST", "/contacts"))
        self.assertEqual(calls[1][0:2], ("POST", "/emailCampaigns"))
        self.assertEqual(calls[2][0:2], ("PUT", "/emailCampaigns/7"))
        self.assertEqual(calls[3][0:2], ("GET", "/emailCampaigns/7"))
        self.assertEqual(calls[4][0:2], ("POST", "/emailCampaigns/7/sendNow"))


if __name__ == "__main__":
    unittest.main()
