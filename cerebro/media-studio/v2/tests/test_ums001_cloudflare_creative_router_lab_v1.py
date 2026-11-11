import importlib.util,json,os,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
module=ROOT/"runtime/ums001_cloudflare_creative_router_lab_v1.py"
spec=importlib.util.spec_from_file_location("creative",module)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
BRIEF=json.loads((ROOT/"requests/UMS001_IGC202603_STRUCTURED_CREATIVE_BRIEF_LAB_V0.json").read_text())
PROMPT=("Two genuine adult Spanish professionals face camera in a bright Andalusian Córdoba whitewashed patio, "
"the woman's natural skin and fine hairs accurately photographed in 50mm waist-up cinematic portrait; "
"the man's candid eyes and authentic hands rest on an ordinary table. "
"Both humans dominate 65 percent of the foreground and remain entirely unobstructed. "
"Behind them stands a majestic impossible orange glass-and-copper architectural sculpture of a home, "
"its grand arch standing behind their heads in spectacular sunlight casting believable shadows. "
"The artwork fills the scene with vivid #FF5F00 highlights and gorgeous warm gold, with fascinating "
"three-dimensional reflections and unusually striking luxury advertisement mood. "
"Natural, realistic Spanish professional clothing and correct anatomy; bright credible documentary faces. "
"No letters on jackets, no text, no logos, no fictitious logos or coats of arms, no ticks, no check marks, "
"no money, no bank approval promise, no identifying paperwork. "
"Subject photographed as authentic human beings, not dolls or architectural miniatures. "
"4:5 vertical photo with clear warm orange bottom band reserved for official Fénix overlay at postproduction.")
class CloudflareCreativeRouterTests(unittest.TestCase):
 def test_clean_brief_safe_and_no_customer_data(self):
  messages=m.prepare(BRIEF)
  self.assertEqual(len(messages),2)
  self.assertIn("IGC-2026-03",messages[1]["content"])
  self.assertNotIn("password",messages[1]["content"].lower().split("creative brief:")[-1])
 def test_no_prod(self):
  with self.assertRaises(m.CreativeRouterBlocked):m.prepare({**BRIEF,"environment":"PROD"})
 def test_no_publish(self):
  with self.assertRaises(m.CreativeRouterBlocked):m.prepare({**BRIEF,"publish_enabled":True})
 def test_no_customer_email(self):
  with self.assertRaises(m.CreativeRouterBlocked):m.prepare({**BRIEF,"topic":"Carlos@example.com and "+BRIEF["topic"]})
 def test_good_response_schema(self):
  o=m.parse_provider({"success":True,"result":{"response":{"image_prompt":PROMPT,"quality_risks":["tiny people","lettering","brand"]},"model":"llama70b","usage":{"neurons":4.3}}})
  self.assertEqual(o["creative_prompt"],PROMPT)
  self.assertFalse(o["publication_approved"])
 def test_reject_empty_creativity(self):
  with self.assertRaises(m.CreativeRouterBlocked):
   m.parse_provider({"success":True,"result":{"response":{"image_prompt":"small house","quality_risks":[]}}})
 def test_reject_bad_json(self):
  with self.assertRaises(m.CreativeRouterBlocked):
   m.parse_provider({"success":True,"result":{"response":"hello"}})
 def test_no_credential_no_call(self):
  with patch.dict(os.environ,{"CEREBRO_WORKERS_AI_SCOPED_TOKEN":""}):
   with self.assertRaises(m.CreativeRouterBlocked):
    m.infer(BRIEF)
 def test_safe_mocked_inference(self):
  mock_result={"success":True,"result":{"response":{"image_prompt":PROMPT,"quality_risks":["tiny people","lettering","brand"]},"model":"llama70b"}}
  seen={}
  def fake(url,payload):
   seen["url"]=url;seen["payload"]=payload
   return mock_result
  with patch.dict(os.environ,{"CEREBRO_WORKERS_AI_SCOPED_TOKEN":"test-scoped-credential-in-memory"}):
   o=m.infer(BRIEF,http_post=fake)
  self.assertEqual(o["model_observed"],"llama70b")
  self.assertTrue(seen["url"].startswith("https://api.cloudflare.com/client/v4/accounts/"))
  self.assertNotIn("test-scoped-credential",json.dumps(seen))
if __name__=="__main__":unittest.main()
