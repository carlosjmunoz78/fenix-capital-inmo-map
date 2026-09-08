import tempfile
import unittest
from pathlib import Path

from cerebro.runtime.company_onboarding import (
    CompanyOnboardingOrchestrator,
    OnboardingBlocked,
    OnboardingPolicyConflict,
    OnboardingValidationError,
    PIPELINE,
)
from cerebro.runtime.company_registry import CompanyRegistry
from cerebro.runtime.tenant_isolation import TenantIsolationError, TenantIsolationGuard


class CompanyOnboardingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.registry = CompanyRegistry(root / "companies.json", environment="PREPROD")
        self.registry.register({
            "company_id": "acme",
            "legal_name": "Acme SL",
            "display_name": "Acme",
            "owner": "ops",
            "domains": ["acme.es"],
        })
        self.registry.register({
            "company_id": "beta",
            "legal_name": "Beta SL",
            "display_name": "Beta",
            "owner": "ops",
            "domains": ["beta.es"],
        })
        self.guard = TenantIsolationGuard(self.registry, environment="PREPROD")
        self.onb = CompanyOnboardingOrchestrator(
            self.registry,
            self.guard,
            root / "onboarding.json",
            environment="PREPROD",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_start_is_idempotent_and_transitions_registry_to_onboarding(self):
        first = self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        second = self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        self.assertEqual(first, second)
        self.assertEqual(first["workflow_state"], "RUNNING")
        self.assertEqual(first["steps"][0]["engine_id"], PIPELINE[0])
        self.assertEqual(first["steps"][0]["status"], "READY")
        self.assertFalse(first["downstream_auto_execute"])
        self.assertEqual(first["prod_autonomy"], "DENY")
        self.assertEqual(self.registry.get("acme")["lifecycle_state"], "ONBOARDING")

    def test_cross_company_is_denied(self):
        with self.assertRaises(TenantIsolationError):
            self.onb.start(authenticated_company_id="acme", target_company_id="beta")

    def test_completion_is_strictly_ordered_and_requires_evidence(self):
        self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        with self.assertRaises(OnboardingPolicyConflict):
            self.onb.complete_step(
                authenticated_company_id="acme",
                target_company_id="acme",
                engine_id=PIPELINE[1],
                evidence_ref="evidence/too-early",
            )
        result = self.onb.complete_step(
            authenticated_company_id="acme",
            target_company_id="acme",
            engine_id=PIPELINE[0],
            evidence_ref="evidence/scan-pass",
        )
        self.assertEqual(result["steps"][0]["status"], "COMPLETED")
        self.assertEqual(result["steps"][1]["status"], "READY")
        self.assertEqual(result["current_index"], 1)

    def test_human_required_blocks_and_resume_needs_resolution_evidence(self):
        self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        blocked = self.onb.block_step(
            authenticated_company_id="acme",
            target_company_id="acme",
            code="LOW_CONFIDENCE",
            detail_ref="tribunal/scan-confidence",
        )
        self.assertEqual(blocked["workflow_state"], "HUMAN_REQUIRED")
        self.assertEqual(blocked["steps"][0]["blocker"]["kind"], "HUMAN_REQUIRED")
        with self.assertRaises(OnboardingBlocked):
            self.onb.complete_step(
                authenticated_company_id="acme",
                target_company_id="acme",
                engine_id=PIPELINE[0],
                evidence_ref="should-not-pass",
            )
        resumed = self.onb.resume(
            authenticated_company_id="acme",
            target_company_id="acme",
            resolution_ref="human/approved-scan-review",
        )
        self.assertEqual(resumed["workflow_state"], "RUNNING")
        self.assertEqual(resumed["steps"][0]["status"], "READY")

    def test_only_canonical_blocker_codes_are_accepted(self):
        self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        with self.assertRaises(OnboardingValidationError):
            self.onb.block_step(
                authenticated_company_id="acme",
                target_company_id="acme",
                code="ASK_A_PERSON",
                detail_ref="invalid/code",
            )

    def test_full_preprod_pipeline_does_not_activate_prod(self):
        self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        result = None
        for engine_id in PIPELINE:
            result = self.onb.complete_step(
                authenticated_company_id="acme",
                target_company_id="acme",
                engine_id=engine_id,
                evidence_ref=f"evidence/{engine_id.lower()}",
            )
        self.assertEqual(result["workflow_state"], "PREPROD_PIPELINE_COMPLETE")
        self.assertEqual(result["prod_autonomy"], "DENY")
        self.assertEqual(self.registry.get("acme")["lifecycle_state"], "ONBOARDING")
        self.assertFalse(self.onb.health()["prod_enabled"])

    def test_snapshot_restore_roundtrip(self):
        self.onb.start(authenticated_company_id="acme", target_company_id="acme")
        snapshot = Path(self.tmp.name) / "snapshot.json"
        meta = self.onb.snapshot(snapshot)
        self.onb.block_step(
            authenticated_company_id="acme",
            target_company_id="acme",
            code="MISSING_CREDENTIAL",
            detail_ref="system/missing-ref",
        )
        self.onb.restore(snapshot, expected_sha256=meta["sha256"])
        restored = self.onb.get(authenticated_company_id="acme", target_company_id="acme")
        self.assertEqual(restored["workflow_state"], "RUNNING")
        self.assertEqual(restored["steps"][0]["status"], "READY")


if __name__ == "__main__":
    unittest.main()
