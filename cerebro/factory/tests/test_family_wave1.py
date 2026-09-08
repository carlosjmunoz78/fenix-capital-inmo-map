import json
import pathlib
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FACTORY = ROOT / "scripts" / "factory.py"
FAMILY = ROOT / "families" / "wave1-multicompany-console-v0.json"
REGISTRY = ROOT / "registry" / "engine-registry.json"


class Wave1FamilyTests(unittest.TestCase):
    def test_wave1_preflight_has_known_dependencies_and_no_prod_activation(self):
        result = subprocess.run(
            [
                sys.executable,
                str(FACTORY),
                "family",
                "--file", str(FAMILY),
                "--registry", str(REGISTRY),
                "--plan",
                "--require-known-dependencies",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        plan = json.loads(result.stdout)
        spec = json.loads(FAMILY.read_text(encoding="utf-8"))
        self.assertEqual(plan["family_id"], "WAVE1-MULTICOMPANY-CONSOLE-V0")
        self.assertEqual(plan["engine_count"], len(spec["engines"]))
        self.assertEqual(plan["engine_count"], 29)
        self.assertEqual(plan["deployment"], "NONE")
        self.assertEqual(plan["no_change"], [])
        self.assertEqual(len(plan["create"]), 29)
        self.assertEqual(spec["promotion"]["prod_autonomy"], "DENY")
        self.assertEqual(spec["promotion"]["cost_additional_eur"], 0)

    def test_wave1_contains_required_onboarding_and_console_foundations(self):
        spec = json.loads(FAMILY.read_text(encoding="utf-8"))
        ids = {item["engine_id"] for item in spec["engines"]}
        required = {
            "COMP-REG-001", "COMP-ONB-001", "SCAN-001", "BMD-001", "PROC-001",
            "WAUD-001", "KW-001", "SOCAUD-001", "LOCALP-001", "COMPET-001",
            "MKT-002", "KBOOT-001", "SEOBOOT-001", "SOCBOOT-001", "MKTBOOT-001",
            "CRMBOOT-001", "APPBOOT-001", "AUTBOOT-001", "TRNBOOT-001",
            "ENGACT-001", "TENANT-001", "COMP-HLT-001", "COMP-BKP-001",
            "COMP-DEP-001", "CONSOLE-001", "CHAT-001", "CTX-001", "CMD-001",
            "ACTGW-001",
        }
        self.assertEqual(ids, required)


if __name__ == "__main__":
    unittest.main()
