import unittest,importlib.util,json
from pathlib import Path
from unittest.mock import patch
ROOT=Path("cerebro/media-studio/v2")
spec=importlib.util.spec_from_file_location("seedream",ROOT/"runtime/ums001_seedream_linkedin_isolated_lab_v0.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Testing(unittest.TestCase):
 def test_exact_brief_with_true_cerebro_ownership_no_deepseek_in_creation(self):
  x,p,prompt,proof=m.plan()
  self.assertEqual(x["provider"],"bytedance/seedream-4")
  self.assertEqual(p["item_id"],"LI-FEED-01")
  self.assertIn("TWO recognizable Spanish adult people",prompt)
  self.assertIn("Fénix logo",prompt)
  self.assertIn("Córdoba",prompt)
  self.assertEqual(proof["creative_owner"],"CEREBRO_PROMPT_FACTORY_V0")
  self.assertEqual(len(proof["prompt_sha256"]),64)
 def test_keep_publishing_cost_and_source_immutable(self):
  original=m.read(m.INPUT)
  for field,bad in (("max_replicate_usd",0.06),("publish",True),("environment","PROD"),("provider","unknown/unknown"),("max_predictions",2)):
   with self.subTest(field=field):
    with patch.object(m,"read",lambda p,field=field,bad=bad: {**original,field:bad} if p==m.INPUT else json.loads(Path(p).read_text())):
     with self.assertRaises(RuntimeError):m.plan()
 def test_no_automatic_paid_calls_in_preflight(self):
  x,p,prompt,proof=m.plan()
  self.assertFalse(x["execute_enabled"])
  self.assertFalse(x["publish"])
  self.assertEqual(x["max_predictions"],1)
  self.assertEqual(x["max_replicate_usd"],0.03)
 def test_owner_prompt_determinism(self):
  self.assertEqual(m.plan()[3]["prompt_sha256"],m.plan()[3]["prompt_sha256"])
if __name__=="__main__":unittest.main()
