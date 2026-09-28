"""PREPROD-only execution contract for JOB-001 Wave 1.

This adapter remains inert by default. It defines the gates required before a
future worker may invoke a Supabase RPC/HTTP target. It never embeds credentials.
"""

from __future__ import annotations

from dataclasses import dataclass

from cerebro.runtime.job_scheduler import JobSpec


class ExecutionPolicyError(RuntimeError):
    pass


@dataclass(frozen=True)
class CanaryPolicy:
    environment: str = "PREPROD"
    global_kill_switch: bool = True
    execution_enabled: bool = False
    allowed_legacy_job_ids: frozenset[int] = frozenset({13})
    max_attempts: int = 1
    credential_ref: str | None = None

    def authorize(self, job: JobSpec) -> dict[str, object]:
        if self.environment != "PREPROD" or job.environment != "PREPROD":
            raise ExecutionPolicyError("canary is PREPROD-only")
        if self.global_kill_switch:
            raise ExecutionPolicyError("global kill switch is ON")
        if not self.execution_enabled:
            raise ExecutionPolicyError("execution is disabled")
        if job.legacy_pg_cron_job_id not in self.allowed_legacy_job_ids:
            raise ExecutionPolicyError("job is not allowlisted for canary")
        if self.max_attempts != 1:
            raise ExecutionPolicyError("canary retries are disabled until idempotency is proven")
        if not self.credential_ref:
            raise ExecutionPolicyError("credential_ref is required; secret values are forbidden")
        return {
            "authorized": True,
            "company_id": job.company_id,
            "engine_id": job.engine_id,
            "environment": job.environment,
            "version": job.version,
            "job_id": job.job_id,
            "legacy_pg_cron_job_id": job.legacy_pg_cron_job_id,
            "credential_ref": self.credential_ref,
            "max_attempts": self.max_attempts,
        }


def canary_rationale() -> dict[str, object]:
    """Document why legacy job 13 is the first candidate, without activating it."""

    return {
        "legacy_pg_cron_job_id": 13,
        "job_id": "seo001-wp-bridge-probe",
        "reason": (
            "observability/probe workload; GETs staging WordPress status and writes only "
            "PREPROD bridge-health evidence; no customer communication, lead mutation, "
            "publishing or payment action"
        ),
        "cutover_authorized": False,
        "required_before_cutover": [
            "runtime_host_verified",
            "credential_ref_verified",
            "isolated_tests_green",
            "one-window_shadow_parity_green",
            "legacy_cron_snapshot_saved",
            "rollback_reenable_command_verified",
            "no_double_execution_gate",
        ],
    }
