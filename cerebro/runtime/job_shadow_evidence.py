"""Evidence and control contract for JOB-001 Supabase offload Wave 1.

Pure functions only. No network, database, secret access or external writes.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from typing import Iterable, Mapping

from cerebro.runtime.job_scheduler import JobSpec, ShadowScheduler, seo001_wave1_jobs


class EvidenceValidationError(ValueError):
    pass


@dataclass(frozen=True)
class LegacyCronRecord:
    job_id: int
    schedule: str
    command: str
    active: bool

    @classmethod
    def from_mapping(cls, row: Mapping[str, object]) -> "LegacyCronRecord":
        try:
            job_id = int(row["jobid"])
            schedule = str(row["schedule"]).strip()
            command = str(row["command"])
            active = bool(row["active"])
        except (KeyError, TypeError, ValueError) as exc:
            raise EvidenceValidationError("invalid legacy cron row") from exc
        if not schedule or not command:
            raise EvidenceValidationError("legacy schedule and command are required")
        return cls(job_id, schedule, command, active)

    @property
    def command_sha256(self) -> str:
        return hashlib.sha256(self.command.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ExecutionGuard:
    global_kill_switch: bool = True
    network_enabled: bool = False
    writes_enabled: bool = False
    environment: str = "PREPROD"

    def validate_shadow(self) -> None:
        if self.environment != "PREPROD":
            raise EvidenceValidationError("shadow guard is PREPROD-only")
        if not self.global_kill_switch:
            raise EvidenceValidationError("kill switch must remain ON during shadow")
        if self.network_enabled or self.writes_enabled:
            raise EvidenceValidationError("shadow mode forbids network and writes")


def _target_fingerprint(job: JobSpec, legacy_command: str) -> bool:
    if job.action_kind == "HTTP":
        slug = job.target.rstrip("/").split("/")[-1]
        return slug in legacy_command
    return job.target in legacy_command


def compare_legacy_to_shadow(
    legacy_rows: Iterable[Mapping[str, object]],
    jobs: Iterable[JobSpec] | None = None,
    guard: ExecutionGuard | None = None,
) -> dict[str, object]:
    """Compare a live/read-only pg_cron snapshot to the Wave 1 shadow contract."""

    guard = guard or ExecutionGuard()
    guard.validate_shadow()
    scheduler = ShadowScheduler(tuple(jobs or seo001_wave1_jobs()))
    legacy = {
        row.job_id: row
        for row in (LegacyCronRecord.from_mapping(item) for item in legacy_rows)
    }

    comparisons: list[dict[str, object]] = []
    all_match = True
    for job in scheduler.jobs:
        old = legacy.get(job.legacy_pg_cron_job_id)
        present = old is not None
        schedule_match = bool(old and old.schedule == job.schedule)
        active_match = bool(old and old.active)
        target_match = bool(old and _target_fingerprint(job, old.command))
        match = present and schedule_match and active_match and target_match
        all_match = all_match and match
        comparisons.append(
            {
                "job_id": job.job_id,
                "legacy_pg_cron_job_id": job.legacy_pg_cron_job_id,
                "present": present,
                "schedule_match": schedule_match,
                "active_match": active_match,
                "target_match": target_match,
                "match": match,
                "legacy_command_sha256": old.command_sha256 if old else None,
            }
        )

    return {
        "ok": all_match,
        "mode": "SHADOW_NO_SIDE_EFFECT",
        "global_kill_switch": guard.global_kill_switch,
        "network_enabled": guard.network_enabled,
        "writes_enabled": guard.writes_enabled,
        "environment": guard.environment,
        "expected_jobs": len(scheduler.jobs),
        "matched_jobs": sum(1 for item in comparisons if item["match"]),
        "comparisons": comparisons,
    }


def idempotency_key(job: JobSpec, scheduled_at_utc: str) -> str:
    """Stable key contract for a future execution adapter."""

    raw = "|".join(
        (
            job.company_id,
            job.engine_id,
            job.environment,
            job.version,
            job.job_id,
            scheduled_at_utc,
        )
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
