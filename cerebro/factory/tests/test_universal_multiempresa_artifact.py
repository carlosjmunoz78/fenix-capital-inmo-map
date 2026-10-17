import json, pathlib, subprocess, sys, tempfile, unittest, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
BUILDER=ROOT/"runtime"/"wordpress"/"build_cerebro_os_universal_multiempresa.py"
SOURCE=ROOT/"runtime"/"wordpress"/"plugins"/"cerebro-os-universal-multiempresa-0.2.0.php"

class UniversalMultiempresaFactoryTests(unittest.TestCase):
    def test_source_contract(self):
        src=SOURCE.read_text(encoding="utf-8")
        self.assertIn("Version: 0.2.0",src)
        self.assertIn("company_id",src)
        self.assertIn("engine_id",src)
        self.assertIn("PREPROD",src)
        self.assertIn("PROD",src)
        self.assertIn("allow_prod_mutations",src)
        self.assertIn("$out['allow_prod_mutations']=0;",src)
        self.assertIn("enable_native_lead_capture",src)

    def test_rebuild_is_deterministic_and_installable(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            subprocess.run([sys.executable,str(BUILDER),"--out",a],check=True,capture_output=True,text=True)
            subprocess.run([sys.executable,str(BUILDER),"--out",b],check=True,capture_output=True,text=True)
            za=pathlib.Path(a)/"CEREBRO_OS_UNIVERSAL_MULTIEMPRESA_0.2.0.zip"
            zb=pathlib.Path(b)/"CEREBRO_OS_UNIVERSAL_MULTIEMPRESA_0.2.0.zip"
            self.assertEqual(za.read_bytes(),zb.read_bytes())
            with zipfile.ZipFile(za) as z:
                self.assertEqual(z.namelist(),["cerebro-os-universal-multiempresa/cerebro-os-universal-multiempresa.php"])
                body=z.read(z.namelist()[0]).decode()
                self.assertIn("Plugin Name: CEREBRO OS Universal Gateway",body)
            meta=json.loads((pathlib.Path(a)/"CEREBRO_OS_UNIVERSAL_MULTIEMPRESA_0.2.0.build.json").read_text())
            self.assertFalse(meta["prod_deploy_authorized"])
            self.assertEqual(meta["additional_cost_eur"],0)
            self.assertTrue(meta["multiempresa"])

if __name__=="__main__": unittest.main()
