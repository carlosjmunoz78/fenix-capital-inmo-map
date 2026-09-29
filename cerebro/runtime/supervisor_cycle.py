"""SUP-001 · deterministic supervisor cycle planner V0.

Produces a bounded work plan from explicit change signals. It does not call a
model, external API, browser, PC bridge, plugin, Supabase or Notion.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from cerebro.runtime.autonomy_guard import (
    AutonomyDecision,
    AutonomyPolicy,
    AutonomyRequest,
    evaluate_autonomy,
)


@dataclass(frozen=True)
class SupervisorSignal:
    signal_id: str
    company_id: str
    engine_id: str
    kind: str
    severity: int
    changed: bool = True


@dataclass(frozen=True)
class SupervisorPlan:
    status: str
    company_id: str
    environment: str
    version: str
    signal_ids: tuple[str, ...]
    engine_ids: tuple[str, ...]
    deterministic_tasks: tuple[str, ...]
    external_calls: int
    ai_calls: int
    requires_human: bool
    human_required_reason: str | None
    guard_decision: str


def _dedupe(signals: Iterable[SupervisorSignal], company_id: str) -> tuple[SupervisorSignal, ...]:
    out: dict[str, SupervisorSignal] = {}
    for s in signals:
        if s.company_id != company_id or not s.changed:
            continue
        prev = out.get(s.signal_id)
        if prev is None or s.severity > prev.severity:
            out[s.signal_id] = s
    return tuple(sorted(out.values(), key=lambda s: (-s.severity, s.signal_id)))


def plan_supervisor_cycle(
    *,
    policy: AutonomyPolicy,
    signals: Iterable[SupervisorSignal],
    runs_last_hour: int,
    idempotency_key: str,
) -> SupervisorPlan:
    effective = _dedupe(signals, policy.company_id)
    request = AutonomyRequest(
        company_id=policy.company_id,
        engine_id=policy.engine_id,
        environment=policy.environment,
        version=policy.version,
        idempotency_key=idempotency_key,
        has_change_signal=bool(effective),
        runs_last_hour=runs_last_hour,
        planned_external_calls=0,
        planned_ai_calls=0,
    )
    decision: AutonomyDecision = evaluate_autonomy(policy, request)

    if not decision.allowed:
        return SupervisorPlan(
            status="NOOP" if decision.decision in {"DENY_NO_CHANGE_SIGNAL", "DENY_RATE_LIMIT", "DENY_COMPONENT_PARKED"} else "BLOCKED",
            company_id=policy.company_id,
            environment=policy.environment,
            version=policy.version,
            signal_ids=tuple(s.signal_id for s in effective),
            engine_ids=tuple(sorted({s.engine_id for s in effective})),
            deterministic_tasks=(),
            external_calls=0,
            ai_calls=0,
            requires_human=decision.human_required_reason is not None,
            human_required_reason=decision.human_required_reason,
            guard_decision=decision.decision,
        )

    tasks: list[str] = []
    for s in effective:
        if s.kind == "ERROR":
            tasks.append(f"inspect_error:{s.engine_id}:{s.signal_id}")
        elif s.kind == "COST":
            tasks.append(f"inspect_cost:{s.engine_id}:{s.signal_id}")
        elif s.kind == "QUALITY":
            tasks.append(f"inspect_quality:{s.engine_id}:{s.signal_id}")
        elif s.kind == "SECURITY":
            tasks.append(f"inspect_security:{s.engine_id}:{s.signal_id}")
        else:
            tasks.append(f"inspect_change:{s.engine_id}:{s.signal_id}")

    return SupervisorPlan(
        status="SHADOW_PLAN" if "SHADOW" in decision.decision else "ACTIVE_PLAN",
        company_id=policy.company_id,
        environment=policy.environment,
        version=policy.version,
        signal_ids=tuple(s.signal_id for s in effective),
        engine_ids=tuple(sorted({s.engine_id for s in effective})),
        deterministic_tasks=tuple(tasks),
        external_calls=0,
        ai_calls=0,
        requires_human=False,
        human_required_reason=None,
        guard_decision=decision.decision,
    )
