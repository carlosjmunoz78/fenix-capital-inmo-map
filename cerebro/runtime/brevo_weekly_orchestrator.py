"""Weekly newsletter planning contract for CEREBRO + Brevo.

This is side-effect free. It decides whether an edition is eligible for campaign
creation/scheduling after content, consent and free-tier gates pass.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from cerebro.runtime.brevo_newsletter_contract import (
    WeeklyNewsletterEdition,
    plan_free_tier_waves,
    validate_weekly_pair,
)


@dataclass(frozen=True)
class AudienceDeliveryState:
    audience: str
    active_recipient_count: int
    list_id: int


@dataclass(frozen=True)
class WeeklyNewsletterPlan:
    audience: str
    edition_id: str
    list_id: int
    campaign_mode: str
    waves: tuple[dict, ...]


def plan_weekly_newsletters(
    editions: tuple[WeeklyNewsletterEdition, WeeklyNewsletterEdition],
    delivery: tuple[AudienceDeliveryState, AudienceDeliveryState],
    *,
    first_send_at: datetime,
    reserved_daily_emails: int = 0,
) -> tuple[WeeklyNewsletterPlan, ...]:
    validate_weekly_pair(editions)
    delivery_by_audience = {x.audience: x for x in delivery}
    if set(delivery_by_audience) != {"PARTICULARES", "INMOBILIARIAS"}:
        raise ValueError("delivery state must cover both audiences")

    plans = []
    for edition in editions:
        state = delivery_by_audience[edition.audience]
        if state.list_id <= 0:
            raise ValueError("Brevo list id required")
        if state.active_recipient_count < 0:
            raise ValueError("recipient count cannot be negative")
        waves = plan_free_tier_waves(
            state.active_recipient_count,
            first_send_at=first_send_at,
            reserved_daily_emails=reserved_daily_emails,
        )
        plans.append(
            WeeklyNewsletterPlan(
                audience=edition.audience,
                edition_id=edition.edition_id,
                list_id=state.list_id,
                campaign_mode="BREVO_WEEKLY_ZERO_COST",
                waves=tuple(
                    {
                        "wave_index": w.wave_index,
                        "size": w.size,
                        "scheduled_at": w.scheduled_at.isoformat(),
                    }
                    for w in waves
                ),
            )
        )
    return tuple(plans)
