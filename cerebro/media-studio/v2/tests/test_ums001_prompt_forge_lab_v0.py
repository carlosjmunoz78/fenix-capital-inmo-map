import importlib.util,json,re,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("prompt_forge",ROOT/"runtime/ums001_prompt_forge_lab_v0.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
BRIEF=json.loads((ROOT/"requests/UMS001_IGC202603_STRUCTURED_CREATIVE_BRIEF_LAB_V0.json").read_text())
QA=json.loads((ROOT/"qa/UMS001_IGC202603_TRANSFER_LEARNINGS_FROM_IGC202601.json").read_text())
class PromptForgeTests(unittest.TestCase):
 def test_six_prompts_without_deepseek_api_or_spend(self):
  o=m.build_prompt_batch(BRIEF,QA)
  self.assertEqual(o["prompt_count"],6);self.assertEqual(o["llm_api_calls"],0)
  self.assertIs(o["deepseek_api_called"],False);self.assertIs(o["creative_quality_guaranteed"],False)
  self.assertEqual(o["replicate_api_calls"],0)
  self.assertEqual(len(set(x["prompt_sha256"] for x in o["prompts"])),6)
 def test_every_prompt_has_visual_education_and_qa_learning(self):
  o=m.build_prompt_batch(BRIEF,QA)
  for x in o["prompts"]:
   self.assertIn("SURREAL",x["text"])
   self.assertIn("#FF5F00",x["text"])
   self.assertIn("No paper",x["text"])
   self.assertIn("no ai-generated logo",x["text"].lower())
   self.assertIn("INDEPENDENT",x["evaluation"])
   self.assertEqual(len(x["qa_defects_addressed"]),len(QA["quality_defects"]))
   self.assertTrue(900<len(x["text"])<4800)
 def test_no_publishing_or_paid_calls(self):
  for k,v in [("publish_enabled",True),("max_additional_cost_eur",1),("environment","PROD")]:
   with self.subTest(k=k):
    with self.assertRaises(ValueError):m.build_prompt_batch({**BRIEF,k:v},QA)
 def test_corrupt_second_brief_rejected(self):
  d=json.loads(json.dumps(BRIEF))
  d["panels"][1]["panel_id"]=d["panels"][0]["panel_id"]
  with self.assertRaises(ValueError):m.build_prompt_batch(d,QA)
 def test_duplicate_casting_setting_art_rejected(self):
  d=json.loads(json.dumps(BRIEF))
  for k in ("subject_profession","scene_context","surreal_symbolism"):
   d["panels"][1][k]=d["panels"][0][k]
  with self.assertRaises(ValueError):m.build_prompt_batch(d,QA)
 def test_hallucinated_qa_rule_denied(self):
  with self.assertRaises(ValueError):m.build_prompt_batch(BRIEF,{**QA,"quality_defects":["MAKE_FAKE_BANK_LOGO"]})
 def test_stale_learning_signal_cannot_cross_company(self):
  with self.assertRaises(ValueError):m.build_prompt_batch(BRIEF,{**QA,"company_id":"other"})
 def test_seo_no_text_in_rendered_photo(self):
  seo=json.loads(json.dumps(BRIEF))
  seo.update(platform="SEO",asset_type="SEO_HERO")
  seo["panels"]=seo["panels"][:1]
  o=m.build_prompt_batch(seo,{**QA,"content_id":seo["content_id"]})
  self.assertIn("SEO hero photo must have no lettering",o["prompts"][0]["text"])
 def test_inconsistent_seo_rejected(self):
  with self.assertRaises(ValueError):m.build_prompt_batch({**BRIEF,"platform":"SEO"},QA)
 def test_creative_prompt_reproducible_for_same_input(self):
  a=m.build_prompt_batch(BRIEF,QA);b=m.build_prompt_batch(BRIEF,QA)
  self.assertEqual(a,b)
 def test_prompt_shifts_when_real_qa_lesson_added(self):
  a=m.build_prompt_batch(BRIEF,{**QA,"quality_defects":["FACE_OCCLUSION"]})
  b=m.build_prompt_batch(BRIEF,{**QA,"quality_defects":["FACE_OCCLUSION","ILLEGIBLE_TEXT"]})
  self.assertNotEqual(a["prompts"][0]["prompt_sha256"],b["prompts"][0]["prompt_sha256"])
 def test_secret_injection_rejected_in_brief(self):
  x=json.loads(json.dumps(BRIEF));x["panels"][0]["human_action"]="r8_fake_token=secret_123456678900 this must be rejected"
  with self.assertRaises(ValueError):m.build_prompt_batch(x,QA)
if __name__=="__main__":unittest.main()
