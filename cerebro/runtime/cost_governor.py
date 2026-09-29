from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Iterable


class SpendClass(str, Enum):
    DETERMINISTIC = "DETERMINISTIC"
    EXISTING_FIXED = "EXISTING_FIXED"
    FREE_TIER = "FREE_TIER"
    METERED_EXTERNAL = "METERED_EXTERNAL"
    PAID_AI = "PAID_AI"


@dataclass(frozen=True)
class BudgetPolicy:
    company_id: str
    engine_id: str
    environment: str
    version: str
    daily_soft_eur: Decimal = Decimal("0.00")
    daily_hard_eur: Decimal = Decimal("0.00")
    allow_paid_ai: bool = False
    allow_metered_external: bool = False


@dataclass(frozen=True)
class CostEvent:
    company_id: str
    engine_id: str
    environment: str
    version: str
    spend_class: SpendClass
    estimated_eur: Decimal
    idempotency_key: str


@dataclass(frozen=True)
class CostDecision:
    allowed: bool
    decision: str
    projected_daily_eur: Decimal
    human_required_reason: str | None = None


def evaluate_cost(
    policy: BudgetPolicy,
    prior_events: Iterable[CostEvent],
    candidate: CostEvent,
) -> CostDecision:
    identity = (
        policy.company_id,
        policy.engine_id,
        policy.environment,
        policy.version,
    )
    candidate_identity = (
        candidate.company_id,
        candidate.engine_id,
        candidate.environment,
        candidate.version,
    )
    if candidate_identity != identity:
        return CostDecision(False, "DENY_SCOPE_MISMATCH", Decimal("0.00"), "POLICY_CONFLICT")

    seen: set[str] = set()
    spent = Decimal("0.00")
    for event in prior_events:
        event_identity = (
            event.company_id,
            event.engine_id,
            event.environment,
            event.version,
        )
        if event_identity != identity or event.idempotency_key in seen:
            continue
        seen.add(event.idempotency_key)
        spent += max(event.estimated_eur, Decimal("0.00"))

    if candidate.idempotency_key in seen:
        return CostDecision(True, "ALLOW_IDEMPOTENT_REPLAY", spent)

    if candidate.spend_class == SpendClass.PAID_AI and not policy.allow_paid_ai:
        return CostDecision(False, "DENY_PAID_AI_NOT_AUTHORIZED", spent, "MONEY_LIMIT")

    if candidate.spend_class == SpendClass.METERED_EXTERNAL and not policy.allow_metered_external:
        return CostDecision(False, "DENY_METERED_EXTERNAL_NOT_AUTHORIZED", spent, "MONEY_LIMIT")

    projected = spent + max(candidate.estimated_eur, Decimal("0.00"))
    if policy.daily_hard_eur >= 0 and projected > policy.daily_hard_eur:
        return CostDecision(False, "DENY_DAILY_HARD_LIMIT", projected, "MONEY_LIMIT")

    if policy.daily_soft_eur >= 0 and projected > policy.daily_soft_eur:
        return CostDecision(True, "ALLOW_SOFT_LIMIT_WARNING", projected)

    return CostDecision(True, "ALLOW_WITHIN_BUDGET", projected)
