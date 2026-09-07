import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEP = ROOT / "governance" / "dependency-registry.json"
HEX = ROOT / "governance" / "human-exception-policy.json"
POL = ROOT / "governance" / "promotion-policy.json"

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


if __name__ == "__main__":
    unittest.main()
