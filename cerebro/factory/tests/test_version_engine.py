import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FACTORY = ROOT / "scripts" / "factory.py"
VERSIONER = ROOT / "scripts" / "version_engine.py"


class VersionedEngineUpdateTests(unittest.TestCase):
    def run_cli(self, script, *args):
        return subprocess.run([sys.executable, str(script), *args], capture_output=True, text=True)

    def create_engine(self, root):
        result = self.run_cli(
            FACTORY,
            "create",
            "--engine-id", "TEST-001",
            "--name", "Test Engine",
            "--layer", "L8",
            "--objective", "Versioned update fixture",
            "--environment", "PREPROD",
            "--root", str(root),
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        return root / "generated" / "TEST-001" / "engine.manifest.json"

    def candidate(self, root, version="0.2.0", status="CONFIRMED_OPERATIONAL"):
        source = json.loads((root / "generated" / "TEST-001" / "engine.manifest.json").read_text(encoding="utf-8"))
        source["version"] = version
        source["status"] = status
        source["evidence"] = ["tests:test_version_engine"]
        source["backup"] = {"strategy": "git-versioned-manifest", "verified": True}
        source["rollback"] = {"strategy": "registry-pointer", "verified": True}
        source["rebuild"] = {"strategy": "manifest+git", "verified": True}
        path = root / f"candidate-{version}.json"
        path.write_text(json.dumps(source), encoding="utf-8")
        return path

    def apply(self, root, candidate, *extra):
        return self.run_cli(
            VERSIONER,
            "apply",
            "--engine-id", "TEST-001",
            "--manifest-file", str(candidate),
            "--root", str(root),
            *extra,
        )

    def test_plan_writes_nothing(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            generated = self.create_engine(root)
            before = generated.read_bytes()
            candidate = self.candidate(root)
            result = self.apply(root, candidate, "--plan")
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            plan = json.loads(result.stdout)
            self.assertEqual(plan["action"], "version_apply")
            self.assertEqual(plan["generated_scaffold"], "PRESERVE")
            self.assertFalse((root / "versions").exists())
            self.assertEqual(generated.read_bytes(), before)

    def test_apply_preserves_scaffold_and_updates_registry(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            generated = self.create_engine(root)
            before = generated.read_bytes()
            candidate = self.candidate(root)
            result = self.apply(root, candidate)
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            out = json.loads(result.stdout)
            self.assertEqual(out["result"], "APPLIED")
            self.assertEqual(generated.read_bytes(), before)
            versioned = root / "versions" / "TEST-001" / "0.2.0" / "engine.manifest.json"
            self.assertTrue(versioned.exists())
            registry = json.loads((root / "registry" / "engine-registry.json").read_text(encoding="utf-8"))
            entry = registry["engines"][0]
            self.assertEqual(entry["version"], "0.2.0")
            self.assertEqual(entry["status"], "CONFIRMED_OPERATIONAL")
            self.assertEqual(entry["source_of_truth"], "git+versioned_update")
            self.assertIn("version_history", entry)

    def test_factory_create_remains_idempotent_after_version_update(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            self.create_engine(root)
            candidate = self.candidate(root)
            applied = self.apply(root, candidate)
            self.assertEqual(applied.returncode, 0, msg=applied.stderr)
            rerun = self.run_cli(
                FACTORY,
                "create",
                "--engine-id", "TEST-001",
                "--name", "Test Engine",
                "--layer", "L8",
                "--objective", "Versioned update fixture",
                "--environment", "PREPROD",
                "--root", str(root),
            )
            self.assertEqual(rerun.returncode, 0, msg=rerun.stderr)
            self.assertIn("NO_CHANGE", rerun.stdout)

    def test_rollback_restores_generated_registry_pointer_without_deleting_newer_version(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            generated = self.create_engine(root)
            candidate = self.candidate(root)
            applied = self.apply(root, candidate)
            self.assertEqual(applied.returncode, 0, msg=applied.stderr)
            rollback = self.run_cli(
                VERSIONER,
                "rollback",
                "--engine-id", "TEST-001",
                "--to-version", "0.1.0",
                "--root", str(root),
            )
            self.assertEqual(rollback.returncode, 0, msg=rollback.stderr)
            out = json.loads(rollback.stdout)
            self.assertEqual(out["result"], "ROLLED_BACK")
            registry = json.loads((root / "registry" / "engine-registry.json").read_text(encoding="utf-8"))
            entry = registry["engines"][0]
            self.assertEqual(entry["version"], "0.1.0")
            self.assertEqual(entry["status"], "DEFINED_NOT_BUILT")
            self.assertTrue(entry["manifest"].endswith("generated/TEST-001/engine.manifest.json"))
            self.assertTrue((root / "versions" / "TEST-001" / "0.2.0" / "engine.manifest.json").exists())
            self.assertTrue(generated.exists())

    def test_rejects_non_increasing_version(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            self.create_engine(root)
            candidate = self.candidate(root, version="0.1.0")
            result = self.apply(root, candidate)
            self.assertEqual(result.returncode, 2)
            self.assertIn("must be greater", result.stderr)

    def test_rejects_prod_candidate(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            self.create_engine(root)
            candidate = json.loads(self.candidate(root).read_text(encoding="utf-8"))
            candidate["environment"] = "PROD"
            path = root / "candidate-prod.json"
            path.write_text(json.dumps(candidate), encoding="utf-8")
            result = self.apply(root, path)
            self.assertEqual(result.returncode, 2)
            self.assertIn("non-PROD", result.stderr)

    def test_conflict_same_version_different_content(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            self.create_engine(root)
            candidate = self.candidate(root)
            result = self.apply(root, candidate)
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            conflict = json.loads(candidate.read_text(encoding="utf-8"))
            conflict["objective"] = "different"
            conflict_path = root / "candidate-conflict.json"
            conflict_path.write_text(json.dumps(conflict), encoding="utf-8")
            second = self.apply(root, conflict_path)
            self.assertEqual(second.returncode, 2)
            self.assertIn("must be greater", second.stderr)


if __name__ == "__main__":
    unittest.main()
