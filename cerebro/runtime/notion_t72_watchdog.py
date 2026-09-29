"""MAKE-001 T-72/T-48 watchdog contract.

Pure decision logic matching Make scenario 9705138. No network, no Notion mutation,
no model call. Intended for event/timer execution by CEREBRO.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


NOTICE = (
    "T-72 · La publicación entra en ventana de 72 horas y todavía no tiene "
    "cierre T-48. Revisar contenido, QA, aprobación y bloqueo de versión antes del límite."
)


@dataclass(frozen=True)
class PublicationState:
    page_id: str
    publication_status: str
    t48_approved: bool
    reminder_sent: bool
    has_schedule_relation: bool
    scheduled_at: datetime | None


@dataclass(frozen=True)
class WatchdogDecision:
    action: str
    page_id: str
    should_update: bool
    notice: str | None = None


def decide_t72(state: PublicationState, now: datetime) -> WatchdogDecision:
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    if (
        state.publication_status != "Pendiente de publicar"
        or state.t48_approved
        or state.reminder_sent
        or not state.has_schedule_relation
        or state.scheduled_at is None
    ):
        return WatchdogDecision("NOOP_NOT_ELIGIBLE", state.page_id, False)

    scheduled = state.scheduled_at
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)

    if scheduled <= now:
        return WatchdogDecision("NOOP_NOT_FUTURE", state.page_id, False)
    if scheduled > now + timedelta(hours=72):
        return WatchdogDecision("NOOP_OUTSIDE_T72", state.page_id, False)

    return WatchdogDecision("SET_T72_REMINDER", state.page_id, True, NOTICE)
