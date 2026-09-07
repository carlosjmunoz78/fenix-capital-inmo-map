import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
ONESHOTS = ROOT / "governance" / "one-shot-inventory.json"
BOUNDARIES = ROOT / "governance" / "edge-boundaries.json"
RLS = ROOT / "governance" / "rls-001-live-audit.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


class DependencyClassificationTests(unittest.TestCase):
    def test_all_one_shots_are_inert_410_tombstones(self):
        data = load(ONESHOTS)
        funcs = data["functions"]
        self.assertEqual(len(funcs), 8)
        self.assertEqual(len({f["slug"] for f in funcs}), 8)
        self.assertTrue(all(f["runtime_result"] == 410 for f in funcs))
        self.assertFalse(data["decision"]["delete_now"])

    def test_overlap_boundaries_do_not_authorize_consolidation(self):
        data = load(BOUNDARIES)
        self.assertGreaterEqual(len(data["boundaries"]), 5)
        self.assertTrue(all(b["consolidate_now"] is False for b in data["boundaries"]))

    def test_rls_live_audit_preserves_no_prod_change(self):
        data = load(RLS)
        self.assertFalse(data["assessment"]["prod_change_authorized"])
        self.assertFalse(data["assessment"]["direct_anon_or_authenticated_exposure_evidenced"])
        for table in data["tables"].values():
            self.assertFalse(table["rls_enabled"])
            self.assertEqual(table["anon_grants"], [])
            self.assertEqual(table["authenticated_grants"], [])


if __name__ == "__main__":
    unittest.main()
