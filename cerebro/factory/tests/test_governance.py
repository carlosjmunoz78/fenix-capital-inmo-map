import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEP = ROOT / "governance" / "dependency-registry.json"
HEX = ROOT / "governance" / "human-exception-policy.json"
POL = ROOT / "governance" / "promotion-policy.json"
RUNTIME = ROOT / "contracts" / "runtime-contracts.json"

EXPECTED_BASE_HUMAN = {
    "LEGAL_REQUIRED",
    "SIGNATURE_REQUIRED",
    "LOW_CONFIDENCE",
    "HIGH_RISK",
    "POLICY_CONFLICT",
    "SECURITY_INCIDENT",
    "MONEY_LIMIT",
    "CUSTOMER_HUMAN_REQUEST",
}
EXPECTED_PROMOTION_GATES = {
    "contracts", "permissions", "tests", "evaluation", "tribunal", "observability",
    "rollback", "backup", "rebuild", "cost_measured", "policy", "preprod"
}
EXPECTED_DIMENSIONS = {"company_id", "engine_id", "environment", "version"}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


class GovernanceTests(unittest.TestCase):
    def test_dependency_nodes_unique_and_edges_resolve(self):
        data = load(DEP)
        ids = [n["id"] for n in data["nodes"]]
        self.assertEqual(len(ids), len(set(ids)))
        known = set(ids)
        for edge in data["edges"]:
            self.assertIn(edge["from"], known)
            self.assertIn(edge["to"], known)

    def test_security_findings_are_preserved(self):
        data = load(DEP)
        flagged = {n["id"] for n in data["nodes"] if n.get("security_flag") == "RLS_DISABLED"}
        self.assertEqual(flagged, {"special_cases", "special_case_people", "expediente_stage_history"})
        self.assertIn("do_not_enable_RLS_without_policy_and_caller_tests", data["prohibitions"])

    def test_human_exception_policy_is_closed_and_complete(self):
        data = load(HEX)
        allowed = data["allowed_codes"]
        rules = data["rules"]
        self.assertEqual(len(allowed), len(set(allowed)))
        self.assertTrue(EXPECTED_BASE_HUMAN.issubset(set(allowed)))
        self.assertEqual(set(allowed), {r["code"] for r in rules})
        self.assertTrue(all(r["action"] == "HUMAN_REQUIRED" for r in rules))

    def test_promotion_policy_has_all_required_gates(self):
        data = load(POL)
        self.assertEqual(set(data["required_gates"]), EXPECTED_PROMOTION_GATES)
        self.assertEqual(data["prod_default"], "DENY")
        self.assertTrue(data["old_vs_new_required"])
        self.assertTrue(data["gradual_promotion_required"])
        self.assertTrue(data["rollback_test_required"])
        self.assertIn("no_direct_lab_to_prod", data["prohibitions"])
        self.assertIn("no_direct_training_to_prod", data["prohibitions"])

    def test_runtime_contract_has_multiempresa_dimensions(self):
        data = load(RUNTIME)
        self.assertEqual(set(data["required_dimensions"]), EXPECTED_DIMENSIONS)
        for key in ("event_envelope", "job_envelope", "audit_record", "observability_signal"):
            self.assertTrue(EXPECTED_DIMENSIONS.issubset(set(data[key]["required"])))

    def test_runtime_contract_is_safe_by_default(self):
        data = load(RUNTIME)
        self.assertTrue(data["audit_record"]["append_only"])
        self.assertTrue(data["audit_record"]["secrets_forbidden"])
        self.assertIn("HUMAN_REQUIRED", data["job_envelope"]["statuses"])
        self.assertIn("SECURITY", data["observability_signal"]["signal_types"])
        self.assertIn("CRITICAL", data["observability_signal"]["severities"])
        self.assertIn("no_unbounded_retry", data["prohibitions"])
        self.assertIn("no_cross_company_execution_without_explicit_scope", data["prohibitions"])

    def test_runtime_human_codes_cover_policy(self):
        runtime = load(RUNTIME)
        policy = load(HEX)
        self.assertEqual(set(runtime["human_exception"]["allowed_codes"]), set(policy["allowed_codes"]))


if __name__ == "__main__":
    unittest.main()
