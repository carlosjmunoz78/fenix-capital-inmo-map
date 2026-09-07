import json
import pathlib
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "registry" / "engine-registry.json"
VALIDATOR = ROOT / "scripts" / "validate_manifest.py"


class FactoryManifestTests(unittest.TestCase):
    def test_validator_passes(self):
        result = subprocess.run([sys.executable, str(VALIDATOR)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_registry_ids_are_unique(self):
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        ids = [e["engine_id"] for e in registry["engines"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_registry_manifests_exist(self):
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for entry in registry["engines"]:
            path = (REGISTRY.parent / entry["manifest"]).resolve()
            self.assertTrue(path.exists(), msg=f"missing {path}")


if __name__ == "__main__":
    unittest.main()
