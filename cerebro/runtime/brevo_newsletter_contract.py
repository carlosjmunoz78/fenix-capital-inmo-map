"""BREVO-NEWSLETTER-V0 · zero-cost weekly newsletter contract for Fénix.

This module is deterministic and provider-specific. It does not depend on
Hostinger Reach. Brevo is the only newsletter provider allowed by this V0.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, Sequence

BREVO_API_BASE = "https://api.brevo.com/v3"
FREE_DAILY_EMAIL_LIMIT = 300
FREE_CONTACT_LIMIT = 100_000
FREE_AUTOMATION_CONTACT_LIMIT = 2_000
PROVIDER = "brevo"
FORBIDDEN_NEWSLETTER_PROVIDERS = {"hostinger_reach", "hostinger_reach_api"}

AUDIENCES = {"PARTICULARES", "INMOBILIARIAS"}
REQUIRED_BLOCK_TYPES = (
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


@dataclass(frozen=True)
class LeadNewsletterEnrollment:
    lead_id: str
    email: str
    audience: str
    marketing_consent: bool
    consent_source: str
    consent_at: str
    existing_legacy_contact: bool = False
    repermission_confirmed: bool = False
    unsubscribed: bool = False
    hard_bounced: bool = False

    def validate(self) -> None:
        if self.audience not in AUDIENCES:
            raise ValueError("invalid newsletter audience")
        if "@" not in self.email:
            raise ValueError("valid email required")
        if not self.marketing_consent:
            raise ValueError("marketing consent required")
        if not self.consent_source.strip() or not self.consent_at.strip():
            raise ValueError("consent evidence required")
        if self.existing_legacy_contact and not self.repermission_confirmed:
            raise ValueError("legacy contacts require re-permission before newsletter enrollment")
        if self.unsubscribed or self.hard_bounced:
            raise ValueError("suppressed contact cannot be enrolled")


@dataclass(frozen=True)
class NewsletterBlock:
    block_type: str
    title: str
    body: str
    primary_url: str | None = None

    def validate(self) -> None:
        if not self.block_type.strip():
            raise ValueError("block_type required")
        if not self.title.strip() or not self.body.strip():
            raise ValueError("title/body required")


@dataclass(frozen=True)
class WeeklyNewsletterEdition:
    edition_id: str
    company_id: str
    audience: str
    subject: str
    preview_text: str
    blocks: tuple[NewsletterBlock, ...]
    source_date: str

    def validate(self) -> None:
        if self.company_id != "fenix-capital":
            raise ValueError("Fénix V0 company scope mismatch")
        if self.audience not in AUDIENCES:
            raise ValueError("invalid audience")
        if not self.subject.strip() or not self.preview_text.strip():
            raise ValueError("subject and preview required")
        if len(self.blocks) < 9:
            raise ValueError("newsletter requires at least nine blocks")
        block_types = {b.block_type for b in self.blocks}
        missing = set(REQUIRED_BLOCK_TYPES) - block_types
        if missing:
            raise ValueError("missing required newsletter blocks: " + ",".join(sorted(missing)))
        for block in self.blocks:
            block.validate()


@dataclass(frozen=True)
class DispatchWave:
    wave_index: int
    size: int
    scheduled_at: datetime


def newsletter_list_key(audience: str) -> str:
    if audience not in AUDIENCES:
        raise ValueError("invalid audience")
    return "FENIX_NEWSLETTER_" + audience


def brevo_contact_payload(enrollment: LeadNewsletterEnrollment, *, list_id: int) -> dict:
    enrollment.validate()
    return {
        "email": enrollment.email,
        "attributes": {
            "LEAD_ID": enrollment.lead_id,
            "AUDIENCE": enrollment.audience,
            "MARKETING_CONSENT": True,
            "CONSENT_SOURCE": enrollment.consent_source,
            "CONSENT_AT": enrollment.consent_at,
        },
        "listIds": [int(list_id)],
        "emailBlacklisted": False,
        "updateEnabled": True,
    }


def validate_provider(provider: str) -> None:
    if provider in FORBIDDEN_NEWSLETTER_PROVIDERS:
        raise ValueError("Hostinger Reach is forbidden for newsletters")
    if provider != PROVIDER:
        raise ValueError("Brevo is the canonical newsletter provider")


def plan_free_tier_waves(
    recipient_count: int,
    *,
    first_send_at: datetime,
    reserved_daily_emails: int = 0,
) -> tuple[DispatchWave, ...]:
    if recipient_count < 0:
        raise ValueError("recipient_count must be >= 0")
    if reserved_daily_emails < 0 or reserved_daily_emails >= FREE_DAILY_EMAIL_LIMIT:
        raise ValueError("invalid reserved_daily_emails")
    daily_capacity = FREE_DAILY_EMAIL_LIMIT - reserved_daily_emails
    waves: list[DispatchWave] = []
    remaining = recipient_count
    index = 1
    send_at = first_send_at
    while remaining:
        size = min(daily_capacity, remaining)
        waves.append(DispatchWave(index, size, send_at))
        remaining -= size
        index += 1
        send_at += timedelta(days=1)
    return tuple(waves)


def audience_content_requirements(audience: str) -> tuple[str, ...]:
    if audience == "PARTICULARES":
        return (
            "hipotecas_y_financiacion",
            "actualidad_mercado",
            "educacion_financiera",
            "servicios_fenix",
            "landing_o_calculadora",
            "caso_real_anonimizado",
            "descargable_o_herramienta",
            "faq_o_mito",
            "cta_asesoramiento",
        )
    if audience == "INMOBILIARIAS":
        return (
            "actualidad_sector",
            "operaciones_caidas_o_riesgos",
            "filtro_financiero",
            "colaboracion_fenix",
            "landing_b2b",
            "caso_operacion_anonimizado",
            "recurso_para_agencias",
            "faq_b2b",
            "cta_colaboracion",
        )
    raise ValueError("invalid audience")


def validate_weekly_pair(editions: Sequence[WeeklyNewsletterEdition]) -> None:
    if len(editions) != 2:
        raise ValueError("exactly two weekly newsletter editions required")
    audiences = {edition.audience for edition in editions}
    if audiences != AUDIENCES:
        raise ValueError("weekly pair must cover particulares and inmobiliarias")
    for edition in editions:
        edition.validate()
