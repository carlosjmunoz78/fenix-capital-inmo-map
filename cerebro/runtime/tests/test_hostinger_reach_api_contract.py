import unittest

from cerebro.runtime.hostinger_reach_api_contract import (
    PUBLIC_API_ROUTES,
    UNSUPPORTED_V0,
    can_autonomously_send_campaign,
    newsletter_preparation_capabilities,
    route,
)


class HostingerReachApiContractTests(unittest.TestCase):
    def test_draft_campaign_creation_is_explicitly_supported(self):
        spec = PUBLIC_API_ROUTES["campaign_create_draft"]
        self.assertEqual(spec.method, "POST")
        self.assertEqual(spec.effect, "MUTATION_DRAFT")

    def test_send_and_schedule_fail_closed(self):
        self.assertFalse(can_autonomously_send_campaign())
        self.assertIn("campaign_send", UNSUPPORTED_V0)
        self.assertIn("campaign_schedule", UNSUPPORTED_V0)

    def test_route_is_profile_scoped(self):
        spec = route("campaigns_list", profile_uuid="profile-1")
        self.assertEqual(spec.path_template, "/api/reach/v1/profiles/profile-1/campaigns")

    def test_newsletter_preparation_is_fully_disabled(self):
        self.assertEqual(newsletter_preparation_capabilities(), ())


if __name__ == "__main__":
    unittest.main()
