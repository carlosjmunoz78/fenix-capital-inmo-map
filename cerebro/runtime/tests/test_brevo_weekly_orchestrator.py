import unittest
from datetime import datetime, timezone

from cerebro.runtime.brevo_newsletter_contract import NewsletterBlock, WeeklyNewsletterEdition
from cerebro.runtime.brevo_weekly_orchestrator import AudienceDeliveryState, plan_weekly_newsletters


KINDS = (
    "APERTURA_EDITORIAL","ACTUALIDAD","GUIA_EDUCATIVA","LANDING_DESTACADA",
    "SERVICIO_DESTACADO","CASO_PRACTICO","RECURSO_O_DESCARGABLE","FAQ_O_MITO","CTA_PRINCIPAL",
)

def edition(audience):
    return WeeklyNewsletterEdition(
        edition_id="2026-W40-"+audience.lower(),
        company_id="fenix-capital",
        audience=audience,
        subject="Boletin",
        preview_text="Resumen",
        blocks=tuple(NewsletterBlock(k,k,"contenido") for k in KINDS),
        source_date="2026-09-28",
    )

class WeeklyBrevoPlannerTests(unittest.TestCase):
    def test_two_audiences_use_verified_lists_and_free_waves(self):
        plans=plan_weekly_newsletters(
            (edition("PARTICULARES"),edition("INMOBILIARIAS")),
            (
                AudienceDeliveryState("PARTICULARES",650,17),
                AudienceDeliveryState("INMOBILIARIAS",80,18),
            ),
            first_send_at=datetime(2026,9,29,8,0,tzinfo=timezone.utc),
        )
        by={x.audience:x for x in plans}
        self.assertEqual(by["PARTICULARES"].list_id,17)
        self.assertEqual([x["size"] for x in by["PARTICULARES"].waves],[300,300,50])
        self.assertEqual(by["INMOBILIARIAS"].list_id,18)
        self.assertEqual([x["size"] for x in by["INMOBILIARIAS"].waves],[80])

if __name__=="__main__":
    unittest.main()
