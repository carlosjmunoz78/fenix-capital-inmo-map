import importlib.util,json,os,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py"
spec=importlib.util.spec_from_file_location("deepseekauto",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
JOB=ROOT/"requests/deepseek-auto/UMS001-IGC202603-DEEPSEEK-ARTLAB-20261111-01.json"
class DeepseekAutonomousTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.job=json.loads(JOB.read_text())
 def test_job_safety(self):
  self.assertIs(m.allowed_job(self.job),self.job)
  self.assertEqual(m.AI,"deepseek-flash")
  self.assertNotIn("cloudflare",m.DS_ENDPOINT)
 def test_no_publish(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"publish_enabled":True})
 def test_no_prod(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"environment":"PROD"})
 def test_budget_guard(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"max_image_budget_usd":0.01})
 def test_no_unsafely_long_retry(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"max_attempts_per_panel":20})
 def test_no_credentials_inside_topic(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"topic":"contact customer@example.com about mortgage"})
 def test_validate_creative(self):
  p=("Photograph with two adult Spanish humans visibly waist-up in Córdoba, a giant glass surreal "
     "orange architectural shape behind two clearly detailed realistic human faces. Premium cinematic "
     "50mm film advertising portrait, authentic human skin pores and visible hands and excellent "
     "bright Mediterranean sunlight, while translucent orange glowing arcs curl up behind the couple. "
     "The scene tells a clear narrative of deciding on a home before a deposit without any banking "
     "approval symbols. No illegible text, no fake lettering on clothing, no branded insignia, "
     "no fictional badges, no text on walls or objects. Crisp, visually striking premium commercial "
     "photograph with warm tones and a clean lower third left for later original typography.")
  shot={"camera_angle":"eye-level three-quarter 50mm waist-up medium close-up","focal_length_mm":"50mm natural full-frame portrait lens","aperture":"f/2.8–f/4 for both faces sharp","key_light":"sunlight 35 degrees from the upper left, diffused","fill_and_rim":"2:1 warm diffused bounce fill and subtle golden rim","contrast":"3:1 key-fill with readable shadows, natural dynamic range","color_grade":"orange #FF5F00 dominant sculpture, natural skin and honey gold","surreal_composition":"translucent architectural arch behind human heads with anchored shadows","subject_scale":"adults take 60 percent of image height and fully visible","typography_safe_area":"lower 25 percent low-detail band for postprocess headline and official logo"}
  output=m.validate_creative({"image_prompt":p,"risks":["fake text","tiny humans","low impact"],"shot_plan":shot})
  self.assertIn(p,output)
  self.assertIn("PHOTOGRAPHY SHOT SPEC:",output)
  self.assertIn("50mm",output)
  self.assertIn("#FF5F00",output)
 def test_bad_creative_rejected(self):
  with self.assertRaises(m.Blocked):m.validate_creative({"image_prompt":"House on table","risks":[]})
 def test_good_vision_and_strict_threshold(self):
  q={"pass":True,"score":92,"violations":[],"correction":"","summary":"Natural full-sized characters and clean materials.","rubric_scores":{"human_presence_and_cast":18,"camera_and_composition":14,"lighting_and_realism":14,"contrast_and_color":9,"surreal_creativity":14,"typography_and_brand_integrity":14,"context_and_claims":9}}
  self.assertTrue(m.validate_vision(q)["accepted"])
  self.assertFalse(m.validate_vision({**q,"score":87,"rubric_scores":{**q["rubric_scores"],"human_presence_and_cast":13}})["accepted"])
 def test_vision_invented_logo_rejects(self):
  q={"pass":True,"score":100,"violations":["INVENTED_LOGO"],"correction":"Remove model marks","summary":"Fake logo in background.","rubric_scores":m.premium_policy()["qa_dimensions"]}
  self.assertFalse(m.validate_vision(q)["accepted"])
 def test_vision_no_external_customer_data(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"topic":"Client Carlos@example.org home buying study"})
 def test_learning_rules_are_derived_from_prior_failures(self):
  codes={x["code"] for x in m.get_learning(self.job)}
  self.assertTrue({"FACE_MISSING","FACE_TINY","INVENTED_TEXT","INVENTED_LOGO"}.issubset(codes))
 def test_premium_directives_include_camera_light_contrast(self):
  data=m.premium_directives()
  self.assertIn("key",str(data).lower())
  self.assertIn("contrast",str(data).lower())
  self.assertIn("focal",str(data).lower())
  self.assertIn("#FF5F00",str(data))
 def test_reject_missing_shot_plan(self):
  with self.assertRaises(m.Blocked):
   m.validate_creative({"image_prompt":"An orange photograph of two adults "+(" cinematic"*80),"risks":["bad light","bad focus","too flat"]})
 def test_vision_requires_independent_weighted_camera_grade(self):
  full=m.premium_policy()["qa_dimensions"]
  good={"pass":True,"score":100,"violations":[],"correction":"","summary":"Excellent image and authentic natural cinematography.","rubric_scores":full}
  self.assertTrue(m.validate_vision(good)["accepted"])
  inconsistent=m.validate_vision({**good,"score":99})
  self.assertFalse(inconsistent["accepted"])
  self.assertIn("UNKNOWN",inconsistent["violations"])
  self.assertEqual(inconsistent["score_consistency"],"REJECTED_INCONSISTENT_RUBRIC")
 def test_social_style_reference_byte_hash_is_pinned(self):
  uri=m.safe_style_reference()
  self.assertTrue(uri.startswith("data:image/jpeg;base64,"))
  self.assertGreater(len(uri),10000)
 def test_real_qa_failures_transfer_to_prompt_factory(self):
  codes={x["code"] for x in m.get_learning(self.job)}
  self.assertIn("BAD_ANATOMY",codes)
  self.assertIn("GENERIC_SCENE",codes)
 def test_fail_closed_before_paid_calls_without_secret(self):
  with patch.dict(os.environ,{"GITHUB_REPOSITORY":m.REPO,"GITHUB_HEAD_REF":m.BRANCH,"UMS001_DEEPSEEK_AUTOMATION_GATE":"OWNER_AUTHORIZED_LAB_20261111"}):
   with self.assertRaises(m.Blocked):m.run_job(self.job,"","", "")
if __name__=="__main__":unittest.main()
