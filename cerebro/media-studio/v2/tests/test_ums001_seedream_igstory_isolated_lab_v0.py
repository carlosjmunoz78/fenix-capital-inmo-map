import importlib.util,unittest,json
from pathlib import Path
from unittest.mock import patch
ROOT=Path("cerebro/media-studio/v2")
sp=importlib.util.spec_from_file_location("story",ROOT/"runtime/ums001_seedream_igstory_isolated_lab_v0.py")
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class Story(unittest.TestCase):
 def test_true_native_story_ratio_and_user_brief(self):
  req,item,prompt,proof=m.plan()
  self.assertEqual(req["item_id"],"IG-STORY-01")
  self.assertEqual(req["target_pixels"],[1080,1920])
  self.assertEqual(req["image_ratio"],"9:16")
  self.assertEqual(item["provider_aspect_ratio"],"9:16")
  self.assertIn(item["scene"],prompt)
  self.assertIn("CENTRAL",prompt)
  self.assertIn("top 20 percent",prompt)
  self.assertIn("bottom 18 percent",prompt)
  self.assertIn("NO extra people",prompt)
  self.assertEqual(proof["creative_owner"],"CEREBRO_PROMPT_FACTORY_V0")
 def test_finops_only_prepaid_and_single_prediction(self):
  req,_,_,_=m.plan()
  self.assertEqual(req["max_predictions"],1)
  self.assertEqual(req["max_replicate_usd"],0.03)
  self.assertEqual(req["max_deepseek_calls"],1)
  self.assertFalse(req["publish"])
  self.assertFalse(req["execute_enabled"])
  self.assertFalse(req["auto_reload"])
 def test_mutating_scope_or_money_fails_closed(self):
  req=m.read(m.INPUT)
  for field,bad in [("item_id","LI-FEED-01"),("environment","PROD"),("max_predictions",2),("max_replicate_usd",1),("publish",True),("image_ratio","4:5")]:
   with self.subTest(field=field):
    altered={**req,field:bad}
    with patch.object(m,"read",lambda path,altered=altered:altered if path==m.INPUT else json.loads(Path(path).read_text())):
     with self.assertRaises(RuntimeError):m.plan()
 def test_prompt_reproducible_sha_without_api_calls(self):
  a=m.plan()[3];b=m.plan()[3]
  self.assertEqual(a["prompt_sha256"],b["prompt_sha256"])
  self.assertEqual(len(a["prompt_sha256"]),64)
if __name__=="__main__":unittest.main(verbosity=2)
