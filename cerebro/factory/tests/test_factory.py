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


if __name__ == "__main__":
    unittest.main()
