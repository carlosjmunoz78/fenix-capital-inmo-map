"""AUT-001 · autonomy activation and spend guard.

Fail-closed control plane for Supervisor, PC bridge, universal plugin, browser
extension and future learning/meta-learning loops.

Nothing here activates external systems. It defines deterministic gates so those
systems cannot start consuming paid AI, metered APIs or high-frequency polling
merely because a connector becomes available.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Iterable

from cerebro.runtime.cost_governor import (
    BudgetPolicy,
    CostDecision,
    CostEvent,
    SpendClass,
    evaluate_cost,
)


class ComponentState(str, Enum):
    PARKED = "PARKED"
    SHADOW = "SHADOW"
    ACTIVE = "ACTIVE"


@dataclass(frozen=True)
class AutonomyPolicy:
    company_id: str
    engine_id: str
    environment: str
    version: str
    state: ComponentState = ComponentState.PARKED
    max_runs_per_hour: int = 1
    max_external_calls_per_run: int = 0
    max_ai_calls_per_run: int = 0
    require_change_signal: bool = True
    allow_background_polling: bool = False
    idle_poll_seconds: int = 300
    daily_soft_eur: Decimal = Decimal("0.00")
    daily_hard_eur: Decimal = Decimal("0.00")
    allow_paid_ai: bool = False
    allow_metered_external: bool = False


@dataclass(frozen=True)
class AutonomyRequest:
    company_id: str
    engine_id: str
    environment: str
    version: str
    idempotency_key: str
    has_change_signal: bool
    runs_last_hour: int
    planned_external_calls: int = 0
    planned_ai_calls: int = 0
    spend_class: SpendClass = SpendClass.DETERMINISTIC
    estimated_eur: Decimal = Decimal("0.00")


@dataclass(frozen=True)
class AutonomyDecision:
    allowed: bool
    decision: str
    human_required_reason: str | None = None
    cost: CostDecision | None = None


def evaluate_autonomy(
    policy: AutonomyPolicy,
    request: AutonomyRequest,
    prior_cost_events: Iterable[CostEvent] = (),
) -> AutonomyDecision:
    identity = (policy.company_id, policy.engine_id, policy.environment, policy.version)
    req_identity = (request.company_id, request.engine_id, request.environment, request.version)
    if identity != req_identity:
        return AutonomyDecision(False, "DENY_SCOPE_MISMATCH", "POLICY_CONFLICT")

    if policy.state == ComponentState.PARKED:
        return AutonomyDecision(False, "DENY_COMPONENT_PARKED")

    if request.runs_last_hour >= policy.max_runs_per_hour:
        return AutonomyDecision(False, "DENY_RATE_LIMIT")

    if policy.require_change_signal and not request.has_change_signal:
        return AutonomyDecision(False, "DENY_NO_CHANGE_SIGNAL")

    if request.planned_external_calls > policy.max_external_calls_per_run:
        return AutonomyDecision(False, "DENY_EXTERNAL_CALL_BUDGET", "MONEY_LIMIT")

    if request.planned_ai_calls > policy.max_ai_calls_per_run:
        return AutonomyDecision(False, "DENY_AI_CALL_BUDGET", "MONEY_LIMIT")

    cost_policy = BudgetPolicy(
        company_id=policy.company_id,
        engine_id=policy.engine_id,
        environment=policy.environment,
        version=policy.version,
        daily_soft_eur=policy.daily_soft_eur,
        daily_hard_eur=policy.daily_hard_eur,
        allow_paid_ai=policy.allow_paid_ai,
        allow_metered_external=policy.allow_metered_external,
    )
    candidate = CostEvent(
        company_id=request.company_id,
        engine_id=request.engine_id,
        environment=request.environment,
        version=request.version,
        spend_class=request.spend_class,
        estimated_eur=request.estimated_eur,
        idempotency_key=request.idempotency_key,
    )
    cost_decision = evaluate_cost(cost_policy, prior_cost_events, candidate)
    if not cost_decision.allowed:
        return AutonomyDecision(
            False,
            f"DENY_COST:{cost_decision.decision}",
            cost_decision.human_required_reason,
            cost_decision,
        )

    mode = "SHADOW" if policy.state == ComponentState.SHADOW else "ACTIVE"
    return AutonomyDecision(True, f"ALLOW_{mode}", cost=cost_decision)
