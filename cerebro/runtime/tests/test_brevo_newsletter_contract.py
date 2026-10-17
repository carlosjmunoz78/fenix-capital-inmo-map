import unittest
from datetime import datetime, timezone

from cerebro.runtime.brevo_newsletter_contract import (
    FREE_DAILY_EMAIL_LIMIT,
    FORBIDDEN_NEWSLETTER_PROVIDERS,
    LeadNewsletterEnrollment,
    NewsletterBlock,
    WeeklyNewsletterEdition,
    audience_content_requirements,
    brevo_contact_payload,
    plan_free_tier_waves,
    validate_provider,
    validate_weekly_pair,
)


def edition(audience):
    blocks = tuple(
        NewsletterBlock(kind, kind.replace("_", " ").title(), "Contenido útil y verificable.")
        for kind in (
            "APERTURA_EDITORIAL",
            "ACTUALIDAD",
            "GUIA_EDUCATIVA",
            "LANDING_DESTACADA",
            "SERVICIO_DESTACADO",
            "CASO_PRACTICO",
            "RECURSO_O_DESCARGABLE",
            "FAQ_O_MITO",
            "CTA_PRINCIPAL",
        )
    )
    return WeeklyNewsletterEdition(
        edition_id="2026-W40-"+audience.lower(),
        company_id="fenix-capital",
        audience=audience,
        subject="Boletín semanal",
        preview_text="Novedades, recursos y oportunidades.",
        blocks=blocks,
        source_date="2026-09-28",
    )


class BrevoNewsletterContractTests(unittest.TestCase):
    def test_hostinger_reach_is_forbidden_for_newsletters(self):
        self.assertIn("hostinger_reach_api", FORBIDDEN_NEWSLETTER_PROVIDERS)
        with self.assertRaisesRegex(ValueError, "forbidden"):
            validate_provider("hostinger_reach_api")
        validate_provider("brevo")

    def test_lead_with_consent_maps_to_brevo_list(self):
        lead = LeadNewsletterEnrollment(
            lead_id="lead-1",
            email="lead@example.com",
            audience="PARTICULARES",
            marketing_consent=True,
            consent_source="wordpress_form",
            consent_at="2026-09-28T12:00:00+02:00",
        )
        payload = brevo_contact_payload(lead, list_id=11)
        self.assertEqual(payload["listIds"], [11])
        self.assertTrue(payload["attributes"]["MARKETING_CONSENT"])
        self.assertTrue(payload["updateEnabled"])

    def test_legacy_contact_needs_repermission(self):
        lead = LeadNewsletterEnrollment(
            lead_id="legacy-1",
            email="legacy@example.com",
            audience="PARTICULARES",
            marketing_consent=True,
            consent_source="legacy_import",
            consent_at="2026-09-28T12:00:00+02:00",
            existing_legacy_contact=True,
            repermission_confirmed=False,
        )
        with self.assertRaisesRegex(ValueError, "re-permission"):
            lead.validate()

    def test_newsletter_requires_nine_distinct_contract_blocks(self):
        item = edition("PARTICULARES")
        item.validate()
        self.assertGreaterEqual(len(item.blocks), 9)

    def test_weekly_pair_is_exactly_two_audiences(self):
        validate_weekly_pair((edition("PARTICULARES"), edition("INMOBILIARIAS")))

    def test_free_plan_is_split_into_daily_waves(self):
        start = datetime(2026, 9, 29, 10, 0, tzinfo=timezone.utc)
        waves = plan_free_tier_waves(750, first_send_at=start)
        self.assertEqual([w.size for w in waves], [300, 300, 150])
        self.assertTrue(all(w.size <= FREE_DAILY_EMAIL_LIMIT for w in waves))

    def test_audience_content_is_not_mixed(self):
        p = audience_content_requirements("PARTICULARES")
        i = audience_content_requirements("INMOBILIARIAS")
        self.assertIn("educacion_financiera", p)
        self.assertIn("filtro_financiero", i)
        self.assertNotEqual(p, i)


if __name__ == "__main__":
    unittest.main()
