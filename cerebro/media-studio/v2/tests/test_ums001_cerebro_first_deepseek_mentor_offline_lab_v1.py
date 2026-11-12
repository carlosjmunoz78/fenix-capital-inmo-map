import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
M=ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py"
sp=importlib.util.spec_from_file_location("producer",M);m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
I=ROOT/"requests/deepseek-auto/UMS001_MULTI11_CEREBRO_FIRST_IG_OFFLINE_20261111_03.json"
S=ROOT/"requests/deepseek-auto/UMS001_MULTI11_CEREBRO_FIRST_SEO_OFFLINE_20261111_03.json"
class OwnerFirst(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.ig=json.loads(I.read_text());cls.seo=json.loads(S.read_text())
 def test_both_new_opt_in_canaries_validate_and_keep_previous_jobs_default(self):
  for job in (self.ig,self.seo):
   self.assertEqual(m.allowed_job(job)["creative_owner"],"CEREBRO_PROMPT_FACTORY_V0")
   anchor=m.cerebro_owned_plan(job,job["panels"][0])
   self.assertEqual(anchor["creative_owner"],"CEREBRO_PROMPT_FACTORY_V0")
   self.assertEqual(anchor["item_id"],job["master_item_id"])
   self.assertEqual(anchor["provider_aspect_ratio"],job["render_aspect_ratio"])
  original=json.loads((ROOT/"requests/deepseek-auto/UMS001-IGC202603-DEEPSEEK-ARTLAB-20261111-07.json").read_text())
  self.assertIsNone(m.cerebro_owned_plan(original,original["panels"][0]))
  self.assertIs(m.allowed_job(original),original)
 def test_owned_prompt_sent_to_teacher_with_no_permission_to_replace_scene(self):
  for job in (self.ig,self.seo):
   anchor=m.cerebro_owned_plan(job,job["panels"][0])
   msgs=m.prompt_messages(job,job["panels"][0],1,[],anchor["text"])
   body=msgs[1]["content"]
   self.assertIn(anchor["prompt_sha256"],body)
   self.assertIn("Temporary DeepSeek mentor, NOT the owner",body)
   self.assertIn(anchor["text"],body)
 def test_teacher_image_prompt_is_never_executed_directly(self):
  anchor=m.cerebro_owned_plan(self.ig,self.ig["panels"][0])
  shot={key:"50mm professional daylight with true shadows" for key in m.SHOT_KEYS}
  proposed={"image_prompt":"BANK APPROVED, fictional third person, fake logo",
            "shot_plan":shot,"risks":[]}
  result=m.cerebro_mentor_final_prompt(anchor,proposed)
  self.assertIn(anchor["text"],result)
  self.assertNotIn("BANK APPROVED",result)
  self.assertNotIn("fake logo",result)
  self.assertIn("key light",result)
  self.assertLessEqual(len(result),9500)
 def test_out_of_scope_new_opt_in_is_fail_closed(self):
  bad=dict(self.ig);bad["master_item_id"]="FB-FEED-01"
  with self.assertRaises(m.Blocked):m.allowed_job(bad)
  bad=dict(self.ig);bad["creative_owner"]="DEEPSEEK_PRIMARY"
  with self.assertRaises(m.Blocked):m.allowed_job(bad)
  bad=dict(self.ig);bad["max_attempts_per_panel"]=2
  with self.assertRaises(m.Blocked):m.allowed_job(bad)
  bad=dict(self.ig);bad["environment"]="PROD"
  with self.assertRaises(m.Blocked):m.allowed_job(bad)
 def test_if_mentor_hash_changes_provider_prompt_cannot_pass(self):
  anchor=dict(m.cerebro_owned_plan(self.ig,self.ig["panels"][0]))
  anchor["text"]="fake prompt"
  shot={key:"50mm professional daylight with true shadows" for key in m.SHOT_KEYS}
  with self.assertRaises(m.Blocked):m.cerebro_mentor_final_prompt(anchor,{"shot_plan":shot})
 def test_external_provider_image_request_aspect_ratio_not_silently_changed(self):
  for job in (self.ig,self.seo):
   anchor=m.cerebro_owned_plan(job,job["panels"][0])
   shot={key:"35mm natural daylight lens without overlays" for key in m.SHOT_KEYS}
   prompt=m.cerebro_mentor_final_prompt(anchor,{"shot_plan":shot})
   provider=m.replicate_image_input(job,prompt)
   self.assertEqual(provider["aspect_ratio"],job["render_aspect_ratio"])
   self.assertNotIn("image_prompt",provider)
   self.assertFalse(job["publish_enabled"])
if __name__=="__main__":unittest.main()
