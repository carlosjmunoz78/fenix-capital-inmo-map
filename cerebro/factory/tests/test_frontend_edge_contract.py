import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
FACTORY = ROOT / "cerebro" / "factory"
SRC = ROOT / "src"
CONTRACT = FACTORY / "governance" / "frontend-edge-contract.json"

CALL_PATTERNS = [
    re.compile(r"authenticatedEdgeFetch(?:<[^>]+>)?\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"fetchEnvironmentApi(?:<[^>]+>)?\(\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"/functions/v1/([a-z0-9][a-z0-9-]+)"),
]


def discovered_edges():
    found = {}
    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in CALL_PATTERNS:
            for edge in pattern.findall(text):
                found.setdefault(edge, set()).add(str(path.relative_to(ROOT)))
    return found


class FrontendEdgeContractTests(unittest.TestCase):
    def test_every_literal_frontend_edge_is_classified(self):
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        declared = set(contract["edges"])
        found = discovered_edges()
        missing = {edge: sorted(files) for edge, files in sorted(found.items()) if edge not in declared}
        self.assertFalse(missing, f"Unclassified frontend Edge dependencies: {missing}")

    def test_preprod_only_edges_have_safe_prod_behavior(self):
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        for name, cfg in contract["edges"].items():
            if cfg["environment"] == "PREPROD_ONLY":
                self.assertFalse(cfg["prod_live"], name)
                self.assertIn(cfg["prod_behavior"], {"FAIL_CLOSED_503", "ROUTE_READS_TO_FENIX_APP_GATEWAY", "EXPLICIT_SOURCE_GUARD"})
                self.assertTrue(cfg.get("preprod_variant"), name)


if __name__ == "__main__":
    unittest.main()
