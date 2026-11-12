import importlib.util,unittest,json
from pathlib import Path
from unittest.mock import patch
ROOT=Path("cerebro/media-studio/v2")
sp=importlib.util.spec_from_file_location("retake",ROOT/"runtime/ums001_seedream_igstory_retake_lab_v1.py")
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class StoryFinal(unittest.TestCase):
 def test_retakes_are_unique_and_9x16_native(self):
  r,p,prompt,proof=m.plan()
  self.assertEqual(r["request_id"],"UMS001-MULTI11-SEEDREAM-IGSTORY-RETAKE-20261111-02")
  self.assertEqual(r["item_id"],"IG-STORY-01")
  self.assertEqual(r["image_ratio"],"9:16")
  self.assertEqual(r["target_pixels"],[1080,1920])
  self.assertIn(p["scene"],prompt)
  self.assertIn("LOOK",prompt.upper())
  self.assertIn("LESS THAN 18 PERCENT",prompt)
  self.assertIn("visible faces",prompt.lower())
  self.assertIn("official Fénix logo",prompt)
  self.assertEqual(len(proof["prompt_sha256"]),64)
 def test_identical_cap_and_no_production(self):
  r,_,_,_=m.plan()
  self.assertEqual(r["max_predictions"],1)
  self.assertEqual(r["max_replicate_usd"],0.03)
  self.assertEqual(r["max_deepseek_calls"],1)
  self.assertFalse(r["publish"])
  self.assertFalse(r["auto_reload"])
  self.assertFalse(r["execute_enabled"])
 def test_bad_contract_fails(self):
  x=m.read(m.INPUT)
  for k,v in [("max_predictions",2),("provider","other"),("environment","PROD"),("image_ratio","4:5"),("publish",True)]:
   with self.subTest(k=k):
    with patch.object(m,"read",lambda path,k=k,v=v: {**x,k:v} if path==m.INPUT else json.loads(Path(path).read_text())):
     with self.assertRaises(RuntimeError):m.plan()
if __name__=="__main__":unittest.main()
