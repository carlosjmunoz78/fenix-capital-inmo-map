import importlib.util
import pathlib
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
BUILDER = ROOT / "runtime" / "wordpress" / "build_fenix_cerebro_leads_package.py"


class FenixCerebroLeadsRebuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("leads_builder", BUILDER)
        cls.mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(cls.mod)

    def test_rebuild_produces_installable_shape_and_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            evidence = self.mod.build(pathlib.Path(td))
            zip_path = pathlib.Path(td) / evidence["artifact"]
            self.assertTrue(zip_path.exists())
            self.assertEqual(evidence["version"], "1.3.3")
            self.assertFalse(evidence["prod_deploy_authorized"])
            with zipfile.ZipFile(zip_path) as zf:
                self.assertEqual(zf.namelist(), ["fenix-cerebro-leads/fenix-cerebro-leads.php"])
                payload = zf.read("fenix-cerebro-leads/fenix-cerebro-leads.php").decode("utf-8")
            self.assertIn("Version: 1.3.3", payload)
            self.assertIn('name="marketing"', payload)
            self.assertEqual(len(evidence["source_sha256"]), 64)
            self.assertEqual(len(evidence["zip_sha256"]), 64)

    def test_rebuild_is_byte_deterministic(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            ea = self.mod.build(pathlib.Path(a))
            eb = self.mod.build(pathlib.Path(b))
            self.assertEqual(ea["source_sha256"], eb["source_sha256"])
            self.assertEqual(ea["zip_sha256"], eb["zip_sha256"])


if __name__ == "__main__":
    unittest.main()
