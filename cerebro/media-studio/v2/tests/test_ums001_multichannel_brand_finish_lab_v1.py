import base64,importlib.util,io,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("new_finish",ROOT/"runtime/ums001_multichannel_brand_finish_lab_v1.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  original=Image.effect_noise((1600,900),55).convert("RGB")
  original.save(self.root/"real_fixture.jpg","JPEG",quality=85)
  self.source=self.root/"real_fixture.jpg";self.hash=m.sha(self.source.read_bytes())
 def tearDown(self):self.temp.cleanup()
 def test_exact_eleven_formats(self):
  self.assertEqual(len(m.FORMATS),11)
  self.assertEqual(m.FORMATS["IG-STORY-01"][2],(1080,1920))
  self.assertEqual(m.FORMATS["LI-FEED-01"][2],(1200,628))
 def test_provenance_and_publish_off_on_real_physical_pixels(self):
  with patch.object(m,"verified_logo",return_value=Image.new("RGBA",(200,120),"orange")):
   result=m.finish(self.source,self.root/"out","LI-FEED-01",self.hash,"Antes de firmar")
  self.assertTrue((self.root/"out"/result["output_file"]).exists())
  self.assertFalse(result["final_editorial_approved"])
  self.assertFalse(result["publish_enabled"])
  self.assertFalse(result["delivery_allowed"])
  self.assertFalse(result["video_gate_allowed"])
  self.assertEqual(result["pixel_dimensions"],[1200,628])
 def test_wrong_source_sha_rejected(self):
  with self.assertRaises(m.Hold):m.verified_image(self.source,"LI-FEED-01","a"*64)
 def test_no_crop_of_wide_photo_into_instagram_portrait(self):
  with self.assertRaises(m.Hold):m.verified_image(self.source,"IG-FEED-01",self.hash)
 def test_seo_cannot_be_branded_in_pixels(self):
  with patch.object(m,"verified_logo",side_effect=RuntimeError("should not load logo")):
   result=m.finish(self.source,self.root/"seo","SEO-HERO-01",self.hash)
  self.assertIsNone(result["brand_logo_id"])
  self.assertFalse(result["final_editorial_approved"])
 def test_bad_logo_registry_and_hash_rejected(self):
  logo=Image.new("RGBA",(50,50),"orange");b=io.BytesIO();logo.save(b,"PNG")
  f=self.root/"fake.json";f.write_text(json.dumps({"logo_id":"FENIX_OFFICIAL_01",
    "source_brand":"OFFICIAL_MR_BOGART_2025","file_content_base64":base64.b64encode(b.getvalue()).decode()}))
  with self.assertRaises(m.Hold):m.verified_logo(f)
 def test_wrong_tenant_and_finance_claims(self):
  with self.assertRaises(m.Hold):m.verified_image(self.source,"LI-FEED-01",self.hash,{
   "source_sha256":self.hash,"item_id":"LI-FEED-01","company_id":"different","engine_id":"UMS-001","environment":"LAB"})
  with self.assertRaises(m.Hold):m.copy_allowed("FACEBOOK","Hipoteca 100% aprobada")
  with self.assertRaises(m.Hold):m.copy_allowed("SEO","SEO H1")
if __name__=="__main__":unittest.main(verbosity=2)
