import importlib.util,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"runtime/ums001_igc202603_qwen_creative_to_replicate_once_v1.py"
spec=importlib.util.spec_from_file_location("director",SRC)
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
class QwenCreativeToReplicateTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.order=json.loads(d.ORDER.read_text());cls.creative=json.loads(d.SOURCE.read_text());cls.ref=json.loads(d.REF.read_text())
 def test_real_cloudflare_response_yields_valid_prompt_with_reference(self):
  prompt,b64=d.validate(self.order,self.creative,self.ref)
  self.assertIn("REAL AI CREATIVE DIRECTION",prompt)
  self.assertIn(self.creative["generated_direction"]["prompt_en"],prompt)
  self.assertIn("Fénix",prompt)
  self.assertIn("55 percent",prompt)
  self.assertTrue(len(b64)>30000)
 def test_actual_model_response_source_is_declared_not_faked_autonomy(self):
  self.assertEqual(self.creative["model_reported"],"@cf/qwen/qwen3-30b-a3b-fp8")
  self.assertIs(self.creative["operator_initiated_model_request"],True)
  self.assertIs(self.creative["fully_automated_model_router"],False)
 def test_one_paid_prediction_and_no_publication(self):
  for field,value in [("max_predictions",2),("max_cost_usd",1),("environment","PROD"),("publish",True),
                      ("max_new_subscription_cost_eur",1),("image_reference_strength",0.9)]:
   with self.subTest(field=field):
    with self.assertRaises(RuntimeError):d.validate({**self.order,field:value},self.creative,self.ref)
 def test_original_logo_guard_and_preapproved_style(self):
  p,_=d.validate(self.order,self.creative,self.ref)
  self.assertIn("ORIGINAL SHA-verified Mr Bogart",p)
  self.assertIn("#FF5F00",p)
  self.assertIn("no logos",p)
 def test_no_wrong_model_result(self):
  with self.assertRaises(RuntimeError):
   d.validate(self.order,{**self.creative,"model_reported":"made-up-model"},self.ref)
 def test_tampered_visual_reference_denied(self):
  with self.assertRaises(RuntimeError):
   d.validate(self.order,self.creative,{**self.ref,"source_sha256":"0"*64})
 def test_missing_person_in_source_prompt_denied(self):
  bad=json.loads(json.dumps(self.creative))
  bad["generated_direction"]["prompt_en"]="A photograph of an empty room and orange building"
  with self.assertRaises(RuntimeError):d.validate(self.order,bad,self.ref)
if __name__=="__main__":unittest.main()
