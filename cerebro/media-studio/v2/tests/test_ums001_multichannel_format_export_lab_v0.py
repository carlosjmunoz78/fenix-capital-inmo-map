import importlib.util,unittest,tempfile,json
from pathlib import Path
from PIL import Image
M=Path("cerebro/media-studio/v2/runtime/ums001_multichannel_format_export_lab_v0.py")
S=importlib.util.spec_from_file_location("format_v0",M);m=importlib.util.module_from_spec(S);S.loader.exec_module(m)
class FormatTests(unittest.TestCase):
 def test_two_native_orientations_export_exact_sizes_without_brand_approval(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)
   for k,ratio in (("IG",(800,1000)),("SEO",(1280,720))):
    sub=root/k;sub.mkdir()
    Image.new("RGB",ratio,(120,70,30)).save(sub/"S00-A1-REPLICATE-RAW.jpg","JPEG")
   self.assertTrue(m.render(root))
   j=json.loads((root/"format_receipts.json").read_text())
   self.assertFalse(j["publication_approved"])
   self.assertEqual([x["pixels"] for x in j["items"]],[[1080,1350],[1600,900]])
 def test_no_portrait_cropped_into_wide_seo(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)
   for k in ("IG","SEO"):
    sub=root/k;sub.mkdir();Image.new("RGB",(800,1000)).save(sub/"S00-A1-REPLICATE-RAW.jpg","JPEG")
   self.assertFalse(m.render(root))
   rec=json.loads((root/"format_receipts.json").read_text())
   self.assertEqual(rec["items"][1]["status"],"REJECTED_BAD_ASPECT")
 def test_empty_results_never_green(self):
  with tempfile.TemporaryDirectory() as tmp:
   self.assertFalse(m.render(Path(tmp)))
if __name__=="__main__":unittest.main()
