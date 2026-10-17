"""Event adapter: lead with explicit marketing consent -> Brevo audience list."""
from __future__ import annotations

from dataclasses import dataclass

from cerebro.runtime.brevo_newsletter_contract import (
    LeadNewsletterEnrollment,
    brevo_contact_payload,
)


@dataclass(frozen=True)
class LeadCapturedEvent:
    lead_id: str
    email: str
    audience: str
    marketing_consent: bool
    consent_source: str
    consent_at: str


def enrollment_action(event: LeadCapturedEvent, *, audience_list_ids: dict[str, int]) -> dict:
    if event.audience not in audience_list_ids:
        raise ValueError("Brevo list ID missing for audience")
    enrollment = LeadNewsletterEnrollment(
        lead_id=event.lead_id,
        email=event.email,
        audience=event.audience,
        marketing_consent=event.marketing_consent,
        consent_source=event.consent_source,
        consent_at=event.consent_at,
    )
    payload = brevo_contact_payload(enrollment, list_id=audience_list_ids[event.audience])
    return {
        "provider": "brevo",
        "operation": "UPSERT_CONTACT_AND_ENROLL_LIST",
        "idempotency_key": f"brevo-contact:{event.lead_id}:{event.audience}",
        "payload": payload,
    }
