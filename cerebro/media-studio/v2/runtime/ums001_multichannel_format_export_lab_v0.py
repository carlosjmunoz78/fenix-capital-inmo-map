#!/usr/bin/env python3
"""Technical export of existing real Replicate image bytes; never grants editorial approval."""
import argparse,hashlib,json,sys
from pathlib import Path
from PIL import Image,ImageOps
SPECS={"IG":("IG-FEED-01",(1080,1350)),"SEO":("SEO-HERO-01",(1600,900))}
def render(root):
 root=Path(root);status=[]
 for folder,(item,expected) in SPECS.items():
  directory=root/folder
  images=sorted(directory.glob("S00-A*-REPLICATE-RAW.jpg"))
  if not images:
   status.append({"item_id":item,"status":"MISSING_REAL_REPLICATE_RAW","publish_enabled":False});continue
  for file in images:
   with Image.open(file) as image:
    image.verify()
   with Image.open(file) as image:
    if image.format!="JPEG" or min(image.size)<512:raise ValueError("BAD_SOURCE_"+item)
    source_ratio=image.width/image.height;target_ratio=expected[0]/expected[1]
    if abs(source_ratio-target_ratio)>0.03:
     status.append({"item_id":item,"raw_file":file.name,"status":"REJECTED_BAD_ASPECT","source_pixels":image.size,"publish_enabled":False});continue
    # Source and target use the same native aspect. Do not fake a wide image by cropping a portrait.
    cropped=ImageOps.fit(image.convert("RGB"),expected,Image.Resampling.LANCZOS,centering=(0.5,0.5))
    out=directory/(file.stem.replace("-REPLICATE-RAW","-FORMAT-ONLY")+".webp")
    cropped.save(out,"WEBP",quality=92,method=4)
    raw=out.read_bytes()
    status.append({"item_id":item,"raw_file":file.name,"filename":out.name,
     "sha256":hashlib.sha256(raw).hexdigest(),"pixels":list(expected),
     "status":"REAL_SOURCE_TECHNICAL_FORMAT_PASS__ARTISTIC_AND_BRAND_QA_PENDING","publish_enabled":False})
 (root/"format_receipts.json").write_text(json.dumps({"company_id":"fenix","engine_id":"UMS-001",
 "environment":"LAB","purpose":"format_technical_only","items":status,"publication_approved":False},indent=2,ensure_ascii=False)+"\n")
 if not all(x.get("status","").startswith("REAL_SOURCE_TECHNICAL_FORMAT_PASS") for x in status) or len(status)<2:
  return False
 return True
if __name__=="__main__":
 ap=argparse.ArgumentParser();ap.add_argument("--root",required=True);args=ap.parse_args()
 try:sys.exit(0 if render(args.root) else 3)
 except Exception as e:print("UMS001_FORMAT_FAIL_CLOSED:"+str(e),file=sys.stderr);sys.exit(2)
