import unittest

from cerebro.runtime.brevo_newsletter_composer import campaign_payload, render_html
from cerebro.runtime.brevo_newsletter_contract import NewsletterBlock, WeeklyNewsletterEdition


def make_edition():
    kinds = (
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
    return WeeklyNewsletterEdition(
        edition_id="2026-W40-particulares",
        company_id="fenix-capital",
        audience="PARTICULARES",
        subject="Tu boletín Fénix",
        preview_text="Actualidad y recursos.",
        blocks=tuple(
            NewsletterBlock(k, k, "Texto útil", "https://fenixcapital.es/")
            for k in kinds
        ),
        source_date="2026-09-28",
    )


class BrevoNewsletterComposerTests(unittest.TestCase):
    def test_renders_all_nine_blocks(self):
        html = render_html(make_edition())
        self.assertGreaterEqual(html.count("<section>"), 9)
        self.assertIn("darte de baja", html)

    def test_campaign_payload_targets_list_and_schedule(self):
        payload = campaign_payload(
            make_edition(),
            sender_email="newsletter@fenixcapital.es",
            sender_name="Fénix Capital",
            list_ids=[10],
            scheduled_at="2026-09-29T10:30:00+02:00",
            reply_to="hipotecas@fenixcapital.es",
        )
        self.assertEqual(payload["recipients"]["listIds"], [10])
        self.assertEqual(payload["scheduledAt"], "2026-09-29T10:30:00+02:00")
        self.assertIn("htmlContent", payload)


if __name__ == "__main__":
    unittest.main()
