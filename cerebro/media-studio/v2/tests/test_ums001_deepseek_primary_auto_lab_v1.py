import importlib.util,json,os,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py"
spec=importlib.util.spec_from_file_location("deepseekauto",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
JOB=ROOT/"requests/deepseek-auto/UMS001-IGC202603-DEEPSEEK-CANARY-LAB-01.json"
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
  self.assertEqual(m.validate_creative({"image_prompt":p,"risks":["fake text","tiny humans","low impact"]}),p)
 def test_bad_creative_rejected(self):
  with self.assertRaises(m.Blocked):m.validate_creative({"image_prompt":"House on table","risks":[]})
 def test_good_vision_and_strict_threshold(self):
  q={"pass":True,"score":92,"violations":[],"correction":"","summary":"Natural full-sized characters and clean materials."}
  self.assertTrue(m.validate_vision(q)["accepted"])
  self.assertFalse(m.validate_vision({**q,"score":83})["accepted"])
 def test_vision_invented_logo_rejects(self):
  q={"pass":True,"score":99,"violations":["INVENTED_LOGO"],"correction":"Remove model marks","summary":"Fake logo in background."}
  self.assertFalse(m.validate_vision(q)["accepted"])
 def test_vision_no_external_customer_data(self):
  with self.assertRaises(m.Blocked):m.allowed_job({**self.job,"topic":"Client Carlos@example.org home buying study"})
 def test_learning_rules_are_derived_from_prior_failures(self):
  codes={x["code"] for x in m.get_learning(self.job)}
  self.assertTrue({"FACE_MISSING","FACE_TINY","INVENTED_TEXT","INVENTED_LOGO"}.issubset(codes))
 def test_fail_closed_before_paid_calls_without_secret(self):
  with patch.dict(os.environ,{"GITHUB_REPOSITORY":m.REPO,"GITHUB_HEAD_REF":m.BRANCH,"UMS001_DEEPSEEK_AUTOMATION_GATE":"OWNER_AUTHORIZED_LAB_20261111"}):
   with self.assertRaises(m.Blocked):m.run_job(self.job,"","", "")
if __name__=="__main__":unittest.main()
