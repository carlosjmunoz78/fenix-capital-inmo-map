import json
import pathlib
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FACTORY = ROOT / "scripts" / "factory.py"
FAMILY = ROOT / "families" / "wave1-multicompany-console-v0.json"
REGISTRY = ROOT / "registry" / "engine-registry.json"
GENERATED = ROOT / "generated"


class Wave1FamilyTests(unittest.TestCase):
    def test_wave1_is_materialized_idempotently_with_known_dependencies_and_no_prod_activation(self):
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
        ids = sorted(item["engine_id"] for item in spec["engines"])
        self.assertEqual(plan["family_id"], "WAVE1-MULTICOMPANY-CONSOLE-V0")
        self.assertEqual(plan["engine_count"], 29)
        self.assertEqual(plan["deployment"], "NONE")
        self.assertEqual(plan["create"], [])
        self.assertEqual(plan["no_change"], ids)
        self.assertEqual(spec["promotion"]["prod_autonomy"], "DENY")
        self.assertEqual(spec["promotion"]["cost_additional_eur"], 0)

    def test_wave1_registry_and_scaffolds_preserve_materialization_contract(self):
        spec = json.loads(FAMILY.read_text(encoding="utf-8"))
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        wave_ids = {item["engine_id"] for item in spec["engines"]}
        registry_ids = [item["engine_id"] for item in registry["engines"]]
        self.assertGreaterEqual(tuple(map(int, registry["registry_version"].split("."))), (0, 5, 0))
        self.assertEqual(len(registry_ids), 46)
        self.assertEqual(len(registry_ids), len(set(registry_ids)))
        self.assertTrue(wave_ids.issubset(registry_ids))

        implemented = {
            item["engine_id"]
            for item in registry["engines"]
            if item["engine_id"] in wave_ids and item.get("source_of_truth") == "git+versioned_update"
        }

        for engine_id in wave_ids:
            entry = next(item for item in registry["engines"] if item["engine_id"] == engine_id)
            self.assertEqual(entry["environment"], "PREPROD")
            if engine_id in implemented:
                self.assertEqual(entry["status"], "CONFIRMED_OPERATIONAL")
                self.assertGreaterEqual(tuple(map(int, entry["version"].split("."))), (0, 2, 0))
                self.assertEqual(entry["manifest"], f"../versions/{engine_id}/{entry['version']}/engine.manifest.json")
                self.assertEqual(entry["factory_scaffold"], f"../generated/{engine_id}/engine.manifest.json")
            else:
                self.assertEqual(entry["status"], "DEFINED_NOT_BUILT")
                self.assertEqual(entry["source_of_truth"], "git")
                self.assertEqual(entry["version"], "0.1.0")

            root = GENERATED / engine_id
            files = [p for p in root.rglob("*") if p.is_file()]
            self.assertEqual(len(files), 18, msg=engine_id)
            manifest = json.loads((root / "engine.manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["status"], "DEFINED_NOT_BUILT")
            self.assertEqual(manifest["autonomy_level"], "NONE_UNTIL_GATES_PASS")
            self.assertEqual(manifest["environment"], "PREPROD")
            self.assertEqual(manifest["cost_budget"]["additional_monthly_eur_target"], 0)
            self.assertEqual(manifest["factory"]["generator_version"], "0.3.0")

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
