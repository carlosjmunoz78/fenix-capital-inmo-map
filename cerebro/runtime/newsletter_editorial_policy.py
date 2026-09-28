"""Editorial policy for CEREBRO weekly Fénix newsletters.

The engine composes from evidence supplied by SEO/Marketing/CRM/Web research.
It never invents current events, rates, offers, legal rules or case outcomes.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

AUDIENCE_BLOCK_PLAN = {
    "PARTICULARES": (
        ("APERTURA_EDITORIAL", ("current_context", "customer_question")),
        ("ACTUALIDAD", ("verified_news", "market_signal")),
        ("GUIA_EDUCATIVA", ("evergreen_guide", "faq_signal")),
        ("LANDING_DESTACADA", ("landing_performance", "seo_priority")),
        ("SERVICIO_DESTACADO", ("service_catalog",)),
        ("CASO_PRACTICO", ("anonymized_case",)),
        ("RECURSO_O_DESCARGABLE", ("lead_magnet", "calculator")),
        ("FAQ_O_MITO", ("faq_signal", "search_query")),
        ("CTA_PRINCIPAL", ("conversion_goal",)),
    ),
    "INMOBILIARIAS": (
        ("APERTURA_EDITORIAL", ("current_context", "partner_question")),
        ("ACTUALIDAD", ("verified_news", "sector_signal")),
        ("GUIA_EDUCATIVA", ("b2b_guide",)),
        ("LANDING_DESTACADA", ("b2b_landing", "seo_priority")),
        ("SERVICIO_DESTACADO", ("b2b_service_catalog",)),
        ("CASO_PRACTICO", ("anonymized_case",)),
        ("RECURSO_O_DESCARGABLE", ("b2b_resource", "calculator")),
        ("FAQ_O_MITO", ("partner_faq", "search_query")),
        ("CTA_PRINCIPAL", ("partner_conversion_goal",)),
    ),
}

SENSITIVE_FACT_KINDS = {
    "verified_news", "market_signal", "sector_signal", "rate", "price",
    "legal_rule", "regulatory_change", "promotion", "case_outcome",
}


@dataclass(frozen=True)
class EditorialFact:
    fact_id: str
    kind: str
    title: str
    summary: str
    source_url: str
    source_date: str
    confidence: float
    audience: str


class EditorialPolicyError(RuntimeError):
    pass


def fact_is_eligible(fact: EditorialFact, *, edition_date: date) -> bool:
    if fact.audience not in {"PARTICULARES", "INMOBILIARIAS", "ALL"}:
        return False
    if not fact.title.strip() or not fact.summary.strip():
        return False
    if fact.confidence < 0.80:
        return False
    if fact.kind in SENSITIVE_FACT_KINDS:
        if not fact.source_url.startswith("http"):
            return False
        try:
            source_day = date.fromisoformat(fact.source_date[:10])
        except ValueError:
            return False
        if abs((edition_date - source_day).days) > 14:
            return False
    return True


def select_editorial_inputs(
    audience: str,
    facts: tuple[EditorialFact, ...],
    *,
    edition_date: date,
) -> dict[str, EditorialFact]:
    if audience not in AUDIENCE_BLOCK_PLAN:
        raise EditorialPolicyError("invalid audience")
    eligible = [
        f for f in facts
        if fact_is_eligible(f, edition_date=edition_date)
        and f.audience in {audience, "ALL"}
    ]
    selected: dict[str, EditorialFact] = {}
    used: set[str] = set()
    for block_type, acceptable_kinds in AUDIENCE_BLOCK_PLAN[audience]:
        candidates = [
            f for f in eligible
            if f.kind in acceptable_kinds and f.fact_id not in used
        ]
        candidates.sort(key=lambda f: (-f.confidence, f.fact_id))
        if not candidates:
            raise EditorialPolicyError(f"LOW_CONFIDENCE:missing_source_for_{block_type}")
        selected[block_type] = candidates[0]
        used.add(candidates[0].fact_id)
    return selected
