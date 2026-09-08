import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FACTORY = ROOT / "scripts" / "factory.py"


class FactoryCliTests(unittest.TestCase):
    def run_factory(self, *args):
        return subprocess.run([sys.executable, str(FACTORY), *args], capture_output=True, text=True)

    def create_args(self, root):
        return (
            "create",
            "--engine-id", "TEST-001",
            "--name", "Test Engine",
            "--layer", "L0",
            "--objective", "Validate FACT-001 generator",
            "--company-scope", "COMPANY_SCOPED",
            "--company-id", "test-company",
            "--environment", "PREPROD",
            "--root", str(root),
        )

    def write_family(self, root, engines=None):
        engines = engines or [
            {
                "engine_id": "FAM-A-001",
                "name": "Family A",
                "layer": "L8",
                "objective": "First family engine",
            },
            {
                "engine_id": "FAM-B-001",
                "name": "Family B",
                "layer": "L8",
                "objective": "Second family engine",
                "dependencies": ["FAM-A-001"],
            },
        ]
        path = pathlib.Path(root) / "family.json"
        path.write_text(json.dumps({
            "family_id": "TEST-FAMILY",
            "defaults": {
                "company_scope": "GLOBAL_OR_SCOPED",
                "environment": "PREPROD",
                "owner": "CEREBRO",
            },
            "engines": engines,
        }), encoding="utf-8")
        return path

    def test_plan_writes_nothing(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            result = self.run_factory(*self.create_args(root), "--plan")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            self.assertFalse((root / "generated").exists())
            plan = json.loads(result.stdout)
            self.assertEqual(plan["engine_id"], "TEST-001")
            self.assertIn("generated/TEST-001/engine.manifest.json", plan["files"])

    def test_create_generates_and_registers(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            result = self.run_factory(*self.create_args(root))
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            manifest = root / "generated" / "TEST-001" / "engine.manifest.json"
            registry = root / "registry" / "engine-registry.json"
            self.assertTrue(manifest.exists())
            self.assertTrue(registry.exists())
            data = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(data["cost_budget"]["additional_monthly_eur_target"], 0)
            self.assertEqual(data["autonomy_level"], "NONE_UNTIL_GATES_PASS")
            reg = json.loads(registry.read_text(encoding="utf-8"))
            self.assertEqual([e["engine_id"] for e in reg["engines"]], ["TEST-001"])

    def test_create_records_dependencies(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            result = self.run_factory(*self.create_args(root), "--depends-on", "CORE-001", "--depends-on", "POL-001")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            data = json.loads((root / "generated" / "TEST-001" / "engine.manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(data["dependencies"], ["CORE-001", "POL-001"])

    def test_identical_create_is_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            first = self.run_factory(*self.create_args(root))
            second = self.run_factory(*self.create_args(root))
            self.assertEqual(first.returncode, 0, msg=first.stderr)
            self.assertEqual(second.returncode, 0, msg=second.stderr)
            self.assertIn("NO_CHANGE", second.stdout)
            reg = json.loads((root / "registry" / "engine-registry.json").read_text(encoding="utf-8"))
            self.assertEqual(len(reg["engines"]), 1)

    def test_changed_definition_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            first = self.run_factory(*self.create_args(root))
            changed = list(self.create_args(root))
            changed[changed.index("Validate FACT-001 generator")] = "Changed objective"
            second = self.run_factory(*changed)
            self.assertEqual(first.returncode, 0, msg=first.stderr)
            self.assertEqual(second.returncode, 3)
            self.assertIn("CONFLICT", second.stderr)

    def test_company_scope_requires_company_id(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            args = list(self.create_args(root))
            idx = args.index("--company-id")
            del args[idx:idx + 2]
            result = self.run_factory(*args)
            self.assertEqual(result.returncode, 2)
            self.assertIn("requires --company-id", result.stderr)

    def test_status_detects_duplicate_registry_ids(self):
        with tempfile.TemporaryDirectory() as td:
            registry = pathlib.Path(td) / "registry.json"
            registry.write_text(json.dumps({"engines": [{"engine_id": "A"}, {"engine_id": "A"}]}), encoding="utf-8")
            result = self.run_factory("status", "--registry", str(registry))
            self.assertEqual(result.returncode, 2)
            data = json.loads(result.stdout)
            self.assertEqual(data["duplicate_engine_ids"], ["A"])

    def test_family_plan_writes_nothing(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            family = self.write_family(root)
            result = self.run_factory("family", "--file", str(family), "--root", str(root), "--plan")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            plan = json.loads(result.stdout)
            self.assertEqual(plan["family_id"], "TEST-FAMILY")
            self.assertEqual(plan["engine_count"], 2)
            self.assertEqual(plan["deployment"], "NONE")
            self.assertFalse((root / "generated").exists())

    def test_family_create_generates_and_registers_atomically(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            family = self.write_family(root)
            result = self.run_factory("family", "--file", str(family), "--root", str(root), "--require-known-dependencies")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            out = json.loads(result.stdout)
            self.assertEqual(out["result"], "CREATED")
            registry = json.loads((root / "registry" / "engine-registry.json").read_text(encoding="utf-8"))
            self.assertEqual([e["engine_id"] for e in registry["engines"]], ["FAM-A-001", "FAM-B-001"])
            manifest_b = json.loads((root / "generated" / "FAM-B-001" / "engine.manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest_b["dependencies"], ["FAM-A-001"])
            self.assertEqual(manifest_b["autonomy_level"], "NONE_UNTIL_GATES_PASS")

    def test_family_create_is_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            family = self.write_family(root)
            first = self.run_factory("family", "--file", str(family), "--root", str(root))
            second = self.run_factory("family", "--file", str(family), "--root", str(root))
            self.assertEqual(first.returncode, 0, msg=first.stderr)
            self.assertEqual(second.returncode, 0, msg=second.stderr)
            out = json.loads(second.stdout)
            self.assertEqual(out["result"], "NO_CHANGE")
            self.assertEqual(out["no_change"], ["FAM-A-001", "FAM-B-001"])

    def test_family_conflict_preflight_writes_nothing_new(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            first_family = self.write_family(root, engines=[{
                "engine_id": "FAM-A-001",
                "name": "Family A",
                "layer": "L8",
                "objective": "Original objective",
            }])
            first = self.run_factory("family", "--file", str(first_family), "--root", str(root))
            self.assertEqual(first.returncode, 0, msg=first.stderr)
            conflict_family = self.write_family(root, engines=[
                {
                    "engine_id": "FAM-A-001",
                    "name": "Family A",
                    "layer": "L8",
                    "objective": "Changed objective",
                },
                {
                    "engine_id": "FAM-C-001",
                    "name": "Family C",
                    "layer": "L8",
                    "objective": "Must not be written",
                },
            ])
            conflict = self.run_factory("family", "--file", str(conflict_family), "--root", str(root))
            self.assertEqual(conflict.returncode, 3)
            self.assertIn("CONFLICT", conflict.stderr)
            self.assertFalse((root / "generated" / "FAM-C-001").exists())
            registry = json.loads((root / "registry" / "engine-registry.json").read_text(encoding="utf-8"))
            self.assertEqual([e["engine_id"] for e in registry["engines"]], ["FAM-A-001"])

    def test_family_rejects_duplicate_ids(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            family = self.write_family(root, engines=[
                {"engine_id": "FAM-A-001", "name": "A", "layer": "L8", "objective": "A"},
                {"engine_id": "FAM-A-001", "name": "A2", "layer": "L8", "objective": "A2"},
            ])
            result = self.run_factory("family", "--file", str(family), "--root", str(root))
            self.assertEqual(result.returncode, 2)
            self.assertIn("duplicate engine ids", result.stderr)
            self.assertFalse((root / "generated").exists())


if __name__ == "__main__":
    unittest.main()
