"""Deterministic weekly newsletter scheduler for the two Fénix Brevo streams."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from cerebro.runtime.brevo_newsletter_contract import plan_free_tier_waves

MADRID = ZoneInfo("Europe/Madrid")


@dataclass(frozen=True)
class NewsletterJob:
    stream_id: str
    audience: str
    weekday: int  # Monday=0
    hour: int
    minute: int


JOBS = (
    NewsletterJob("newsletter_particulares", "PARTICULARES", 1, 10, 30),   # Tuesday
    NewsletterJob("newsletter_inmobiliarias", "INMOBILIARIAS", 3, 10, 30), # Thursday
)


def next_run(job: NewsletterJob, *, now: datetime) -> datetime:
    if now.tzinfo is None:
        raise ValueError("timezone-aware now required")
    local = now.astimezone(MADRID)
    days = (job.weekday - local.weekday()) % 7
    candidate = (local + timedelta(days=days)).replace(
        hour=job.hour, minute=job.minute, second=0, microsecond=0
    )
    if candidate <= local:
        candidate += timedelta(days=7)
    return candidate


def plan_stream_dispatch(job: NewsletterJob, *, recipients: int, now: datetime):
    first = next_run(job, now=now)
    return plan_free_tier_waves(recipients, first_send_at=first)


def jobs_by_audience() -> dict[str, NewsletterJob]:
    return {job.audience: job for job in JOBS}
