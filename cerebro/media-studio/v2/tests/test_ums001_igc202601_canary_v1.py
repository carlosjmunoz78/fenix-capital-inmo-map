import importlib.util,json, pathlib, unittest
HERE=pathlib.Path(__file__).resolve().parent
SRC=HERE.parent/"runtime"/"ums001_igc202601_replicate_cover_canary_v1.py"
BRIEF=HERE.parent/"requests"/"UMS001_IGC202601_LEARNING_REFERENCE_V1.json"
s=importlib.util.spec_from_file_location("igc_canary", SRC)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
GOOD={"request_id":"UMS001-IGC202601-CANARY-S00-20261111","company_id":"fenix","engine_id":"UMS-001",
 "environment":"LAB","content_id":"IGC-2026-01","concept_id":"IGC-2026-01-S00",
 "model_id":"black-forest-labs/flux-1.1-pro-ultra","max_predictions":1,"max_cost_usd":0.06,
 "budget":"EXISTING_PREPAID_ONLY","publish":False,"approval_state":"EXPLICIT_OWNER_TEST_ONLY"}
class IGC202601CanaryContractTests(unittest.TestCase):
 def setUp(self):self.brief=json.loads(BRIEF.read_text())
 def test_owner_style_learned_and_six_complete(self):
  prompt,_=m.verified_request(GOOD,self.brief)
  self.assertEqual(len(self.brief["images"]),6)
  self.assertIn("PHOTOGRAPH",prompt.upper());self.assertIn("SURREAL",prompt.upper())
 def test_reject_extra_prediction_or_spend(self):
  for field,val in [("max_predictions",2),("max_cost_usd",1),("publish",True),("environment","PROD"),("approval_state","AI_SELF_APPROVED")]:
   with self.subTest(field=field):
    with self.assertRaises(m.RuntimeError if hasattr(m,"RuntimeError") else RuntimeError):m.verified_request({**GOOD,field:val},self.brief)
 def test_generated_logo_forbidden_in_prompt(self):
  self.assertIn("no text",self.brief["images"][0]["prompt"].lower())
  self.assertIn("original svg",self.brief["images"][0]["prompt"].lower())
 def test_distinct_slides(self):
  ids=[z["id"] for z in self.brief["images"]]
  self.assertEqual(len(set(ids)),6)
 def test_source_not_represented_as_replicate(self):
  self.assertEqual(self.brief["source_generated_by"],"CHATGPT")
  self.assertNotEqual(self.brief["steps"]["provider"],"CHATGPT")
if __name__=="__main__":unittest.main()
