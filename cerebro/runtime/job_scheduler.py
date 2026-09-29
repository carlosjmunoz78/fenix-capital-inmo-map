"""CEREBRO JOB-001 shadow scheduler for Supabase offload Wave 1.

This module is deliberately side-effect free.  It models legacy pg_cron jobs and
produces execution plans that a shared worker can compare against the existing
Supabase schedule before any cut-over is attempted.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urlparse


class SchedulerValidationError(ValueError):
    """Raised when a job or schedule violates the PREPROD shadow contract."""


@dataclass(frozen=True)
class CronField:
    values: frozenset[int] | None = None

    @classmethod
    def parse(cls, raw: str, minimum: int, maximum: int) -> "CronField":
        raw = raw.strip()
        if raw == "*":
            return cls(None)
        if raw.startswith("*/"):
            step = int(raw[2:])
            if step <= 0:
                raise SchedulerValidationError("cron step must be positive")
            return cls(frozenset(range(minimum, maximum + 1, step)))
        values = frozenset(int(part) for part in raw.split(","))
        if not values or min(values) < minimum or max(values) > maximum:
            raise SchedulerValidationError(f"cron value outside {minimum}..{maximum}")
        return cls(values)

    def matches(self, value: int) -> bool:
        return self.values is None or value in self.values


@dataclass(frozen=True)
class CronSpec:
    minute: CronField
    hour: CronField
    day: CronField
    month: CronField
    weekday: CronField

    @classmethod
    def parse(cls, expression: str) -> "CronSpec":
        parts = expression.split()
        if len(parts) != 5:
            raise SchedulerValidationError("cron expression must have five fields")
        return cls(
            CronField.parse(parts[0], 0, 59),
            CronField.parse(parts[1], 0, 23),
            CronField.parse(parts[2], 1, 31),
            CronField.parse(parts[3], 1, 12),
            CronField.parse(parts[4], 0, 7),
        )

    def matches(self, instant: datetime) -> bool:
        if instant.tzinfo is None:
            raise SchedulerValidationError("datetime must be timezone-aware")
        utc = instant.astimezone(timezone.utc)
        # cron: Sunday=0/7, Monday=1 ... Saturday=6. Python: Monday=0.
        cron_weekday = (utc.weekday() + 1) % 7
        weekday_match = self.weekday.matches(cron_weekday) or (
            cron_weekday == 0 and self.weekday.matches(7)
        )
        return (
            self.minute.matches(utc.minute)
            and self.hour.matches(utc.hour)
            and self.day.matches(utc.day)
            and self.month.matches(utc.month)
            and weekday_match
        )


@dataclass(frozen=True)
class JobSpec:
    job_id: str
    legacy_pg_cron_job_id: int
    company_id: str
    engine_id: str
    environment: str
    version: str
    schedule: str
    action_kind: str
    target: str
    timeout_seconds: int = 30
    shadow_only: bool = True

    def validate(self) -> None:
        if not self.job_id or not self.company_id or not self.engine_id or not self.version:
            raise SchedulerValidationError("job identity fields are required")
        if self.environment != "PREPROD":
            raise SchedulerValidationError("Wave 1 scheduler is PREPROD-only")
        if not self.shadow_only:
            raise SchedulerValidationError("Wave 1 jobs must remain shadow-only")
        if self.timeout_seconds <= 0 or self.timeout_seconds > 60:
            raise SchedulerValidationError("timeout must be within 1..60 seconds")
        CronSpec.parse(self.schedule)
        if self.action_kind == "HTTP":
            parsed = urlparse(self.target)
            if parsed.scheme != "https" or not parsed.netloc:
                raise SchedulerValidationError("HTTP jobs require an https target")
        elif self.action_kind != "RPC":
            raise SchedulerValidationError("unsupported action_kind")


class ShadowScheduler:
    """Deterministic planner for OLD-vs-NEW scheduler comparison.

    It never performs network or database writes.  A later worker adapter may consume
    the returned plans after policy, credential and idempotency gates are added.
    """

    def __init__(self, jobs: Iterable[JobSpec]):
        jobs = tuple(jobs)
        if not jobs:
            raise SchedulerValidationError("at least one job is required")
        ids = [job.job_id for job in jobs]
        legacy_ids = [job.legacy_pg_cron_job_id for job in jobs]
        if len(ids) != len(set(ids)) or len(legacy_ids) != len(set(legacy_ids)):
            raise SchedulerValidationError("job ids must be unique")
        for job in jobs:
            job.validate()
        self._jobs = jobs

    @property
    def jobs(self) -> tuple[JobSpec, ...]:
        return self._jobs

    def due(self, instant: datetime) -> tuple[JobSpec, ...]:
        return tuple(job for job in self._jobs if CronSpec.parse(job.schedule).matches(instant))

    def shadow_plans(self, instant: datetime) -> list[dict[str, object]]:
        if instant.tzinfo is None:
            raise SchedulerValidationError("datetime must be timezone-aware")
        observed_at = instant.astimezone(timezone.utc).isoformat()
        plans: list[dict[str, object]] = []
        for job in self.due(instant):
            plans.append(
                {
                    "job_id": job.job_id,
                    "legacy_pg_cron_job_id": job.legacy_pg_cron_job_id,
                    "company_id": job.company_id,
                    "engine_id": job.engine_id,
                    "environment": job.environment,
                    "version": job.version,
                    "action_kind": job.action_kind,
                    "target": job.target,
                    "timeout_seconds": job.timeout_seconds,
                    "mode": "SHADOW_NO_SIDE_EFFECT",
                    "observed_at": observed_at,
                }
            )
        return plans

    def health(self) -> dict[str, object]:
        return {
            "ok": True,
            "engine_id": "JOB-001",
            "mode": "SHADOW_NO_SIDE_EFFECT",
            "jobs": len(self._jobs),
            "external_cost_eur": 0,
            "prod_enabled": False,
        }


def seo001_wave1_jobs() -> tuple[JobSpec, ...]:
    """Eight live PREPROD pg_cron jobs selected for the first offload wave."""

    base = "https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1"
    common = {
        "company_id": "FENIX_CAPITAL",
        "engine_id": "SEO-001",
        "environment": "PREPROD",
        "version": "v0-shadow",
    }
    return (
        JobSpec("seo001-weekly-orchestrator", 2, **common, schedule="0 6 * * 1", action_kind="HTTP", target=f"{base}/fenix-seo-cerebro-preprod"),
        JobSpec("seo001-growth-email-worker", 6, **common, schedule="7,22,37,52 * * * *", action_kind="HTTP", target=f"{base}/fenix-seo-growth-email-worker-preprod"),
        JobSpec("seo001-page-quality-probe", 7, **common, schedule="8,23,38,53 * * * *", action_kind="RPC", target="seo001_dispatch_active_city_quality_probe_preprod"),
        JobSpec("seo001-downloadable-qa", 10, **common, schedule="17,47 * * * *", action_kind="RPC", target="seo001_dispatch_downloadable_qa_preprod"),
        JobSpec("seo001-lead-magnet-builder", 12, **common, schedule="11,26,41,56 * * * *", action_kind="RPC", target="seo001_dispatch_lead_magnet_builder_preprod"),
        JobSpec("seo001-wp-bridge-probe", 13, **common, schedule="3,18,33,48 * * * *", action_kind="RPC", target="seo001_probe_wp_bridge_preprod"),
        JobSpec("seo001-conversion-e2e", 16, **common, schedule="13,43 * * * *", action_kind="RPC", target="seo001_dispatch_conversion_e2e_preprod"),
        JobSpec("seo001-mobile-qa", 21, **common, schedule="12,42 * * * *", action_kind="RPC", target="seo001_dispatch_mobile_qa_preprod"),
    )
