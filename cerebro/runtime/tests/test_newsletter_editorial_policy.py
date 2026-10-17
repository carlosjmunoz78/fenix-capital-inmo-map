import unittest
from datetime import date

from cerebro.runtime.newsletter_editorial_policy import (
    AUDIENCE_BLOCK_PLAN, EditorialFact, EditorialPolicyError,
    fact_is_eligible, select_editorial_inputs,
)


def facts_for(audience):
    rows=[]
    for i,(block,kinds) in enumerate(AUDIENCE_BLOCK_PLAN[audience].items() if isinstance(AUDIENCE_BLOCK_PLAN[audience],dict) else AUDIENCE_BLOCK_PLAN[audience]):
        kind=kinds[0]
        rows.append(EditorialFact(
            fact_id=f"f{i}",kind=kind,title=block,summary="Dato verificado",
            source_url="https://fenixcapital.es/fuente",source_date="2026-09-28",
            confidence=.95,audience=audience,
        ))
    return tuple(rows)


class NewsletterEditorialPolicyTests(unittest.TestCase):
    def test_selects_nine_sourced_blocks_per_audience(self):
        selected=select_editorial_inputs(
            "PARTICULARES",facts_for("PARTICULARES"),edition_date=date(2026,9,28)
        )
        self.assertEqual(len(selected),9)
        self.assertIn("ACTUALIDAD",selected)
        self.assertIn("LANDING_DESTACADA",selected)

    def test_stale_current_fact_is_rejected(self):
        fact=EditorialFact(
            "x","verified_news","x","x","https://example.com","2026-08-01",.99,"ALL"
        )
        self.assertFalse(fact_is_eligible(fact,edition_date=date(2026,9,28)))

    def test_missing_source_fails_closed_instead_of_inventing(self):
        with self.assertRaisesRegex(EditorialPolicyError,"LOW_CONFIDENCE"):
            select_editorial_inputs("INMOBILIARIAS",(),edition_date=date(2026,9,28))


if __name__=="__main__":
    unittest.main()
