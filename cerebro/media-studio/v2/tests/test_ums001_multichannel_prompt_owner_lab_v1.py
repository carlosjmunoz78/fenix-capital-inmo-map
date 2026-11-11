import copy,importlib.util,unittest
from pathlib import Path
ROOT=Path("cerebro/media-studio/v2")
spec=importlib.util.spec_from_file_location("bridge",ROOT/"runtime/ums001_multichannel_prompt_owner_lab_v1.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Ownership(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.master=m.read(m.MASTER);cls.ledger=m.read(m.LEDGER)
 def test_all_11_different_company_owned_prompts_offline(self):
  x=m.build_all()
  self.assertEqual(x["generated_prompt_count"],11)
  self.assertEqual(x["provider_calls_this_execution"],0)
  self.assertEqual(x["real_image_count_this_execution"],0)
  self.assertFalse(x["publish_enabled"])
  self.assertEqual(len(set(i["prompt_sha256"] for i in x["prompts"])),11)
 def test_channels_native_dimensions_brief_not_cropped_away(self):
  x=m.build_all()["prompts"]
  by={i["item_id"]:i for i in x}
  self.assertEqual(by["IG-STORY-01"]["aspect_ratio"],"9:16")
  self.assertIn("1080x1920",by["IG-STORY-01"]["text"])
  self.assertEqual(by["SEO-HERO-01"]["target_pixels"],[1600,900])
  self.assertIn("Córdoba",by["SEO-HERO-01"]["text"])
  self.assertIn("home",by["SEO-HERO-01"]["text"])
  self.assertIn("environmental",by["SEO-HERO-01"]["text"])
  self.assertEqual(by["LI-FEED-01"]["aspect_ratio"],"1.91:1")
  self.assertEqual(by["LI-FEED-01"]["provider_aspect_ratio"],"16:9")
 def test_existing_factory_and_master_become_real_owner_not_deepseek(self):
  o=m.build_all()
  for x in o["prompts"]:
   self.assertEqual(x["creative_owner"],"CEREBRO_PROMPT_FACTORY_V0")
   self.assertEqual(x["deepseek_role"],"TEMPORARY_CREATIVE_MENTOR_AND_VISUAL_QA")
   self.assertIn("IMMUTABLE OWNER BRIEF",x["text"])
   self.assertIn("No guarantee of mortgage approval",x["text"])
 def test_no_prod_or_publication(self):
  for key,val in (("environment","PROD"),("creative_teacher","DEEPSEEK_OWNER")):
   a=copy.deepcopy(self.master);a[key]=val
   with self.assertRaises(ValueError):m.build_all(a,self.ledger)
 def test_fake_qa_refused(self):
  a=copy.deepcopy(self.ledger);a["runs"]=[]
  with self.assertRaises(ValueError):m.build_all(self.master,a)
 def test_wrong_master_status_and_missing_piece_refused(self):
  a=copy.deepcopy(self.master);a["status"]="COMPLETE"
  with self.assertRaises(ValueError):m.build_all(a,self.ledger)
  a=copy.deepcopy(self.master);a["pieces"].pop()
  with self.assertRaises(ValueError):m.build_all(a,self.ledger)
 def test_reproducible_and_unique(self):
  a=m.build_all();b=m.build_all()
  self.assertEqual(a,b)
 def test_scene_change_must_change_hashed_prompt(self):
  a=m.build_all()
  modified=copy.deepcopy(self.master)
  modified["pieces"][0]["scene"]+=" Dramatic limestone shadows."
  b=m.build_all(modified,self.ledger)
  self.assertNotEqual(a["prompts"][0]["prompt_sha256"],b["prompts"][0]["prompt_sha256"])
 def test_no_pretend_artistic_acceptance(self):
  a=m.build_all()
  self.assertEqual(a["quality_status"],"PROMPTS_PREPARED_IMAGES_NOT_VERIFIED")
  self.assertTrue(all(x["visual_qa"]=="PENDING_PHYSICAL_IMAGE" for x in a["prompts"]))
if __name__=="__main__":unittest.main()
