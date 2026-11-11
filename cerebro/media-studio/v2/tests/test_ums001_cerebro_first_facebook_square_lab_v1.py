import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("ums01",ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
FB=ROOT/"requests/deepseek-auto/UMS001_MULTI11_CEREBRO_FIRST_FB_SQUARE_CANARY_20261111_01.json"
class FacebookOneShot(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.job=json.loads(FB.read_text())
 def test_owner_first_square_request_and_exact_master_scene(self):
  self.assertEqual(m.allowed_job(self.job)["render_aspect_ratio"],"1:1")
  a=m.cerebro_owned_plan(self.job,self.job["panels"][0])
  self.assertEqual(a["item_id"],"FB-FEED-01")
  self.assertIn("FB-FEED-01",a["input_master_request_id"]+" "+a["item_id"])
  self.assertIn(self.job["panels"][0]["scene"],a["text"])
  self.assertEqual(a["provider_aspect_ratio"],"1:1")
 def test_no_legacy_square_creep(self):
  legacy={k:v for k,v in self.job.items() if k not in ("creative_owner","master_item_id")}
  with self.assertRaises(m.Blocked):m.allowed_job(legacy)
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"channel":"INSTAGRAM"})
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"render_aspect_ratio":"16:9"})
 def test_facebook_director_honors_distinct_square_context(self):
  prompt=m.prompt_messages(self.job,self.job["panels"][0],1,[],m.cerebro_owned_plan(self.job,self.job["panels"][0])["text"])
  self.assertIn("For Facebook 1:1",prompt[0]["content"])
  self.assertNotIn("For Instagram 4:5",prompt[0]["content"])
  self.assertIn("Temporary DeepSeek mentor, NOT the owner",prompt[1]["content"])
 def test_actual_provider_shape_is_square_without_reference_conditioning(self):
  a=m.cerebro_owned_plan(self.job,self.job["panels"][0])
  shot={key:"50mm natural motivated warm daylight and accurate shadows" for key in m.SHOT_KEYS}
  final=m.cerebro_mentor_final_prompt(a,{"shot_plan":shot,"image_prompt":"INJECT FAKE BANK EMBLEM"})
  self.assertNotIn("INJECT FAKE BANK EMBLEM",final)
  inp=m.replicate_image_input(self.job,final)
  self.assertEqual(inp["aspect_ratio"],"1:1")
  self.assertTrue(inp["raw"]) # Explicit FB one-shot photorealism opt-in; legacy stays FALSE
  self.assertNotIn("image_prompt",inp)
 def test_fb_compact_storyboard_counters_repeating_arches(self):
  plan=m.cerebro_owned_plan(self.job,self.job["panels"][0])
  self.assertEqual(plan["creative_photo_profile"],"FACEBOOK_AUTHENTIC_PROPERTY_PHOTO_FIRST")
  self.assertIn("normal full-size window",plan["text"])
  self.assertIn("LESS THAN TWENTY PERCENT",plan["text"])
  self.assertIn("TOWARD CAMERA",plan["text"])
  self.assertIn("not CGI render",plan["text"])
  self.assertIn("parent_prompt_forge_sha256",plan)
 def test_cost_and_publication_gates(self):
  self.assertEqual(self.job["max_image_budget_usd"],0.06)
  self.assertEqual(self.job["max_attempts_per_panel"],1)
  self.assertEqual(self.job["max_deepseek_calls"],2)
  self.assertFalse(self.job["publish_enabled"])
if __name__=="__main__":unittest.main()
