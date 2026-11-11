#!/usr/bin/env python3
"""UMS-001 additive deterministic 11-format image finishing. LAB QA preview only.
Never purchases inference or posts to any network. Editorial/rights QA remains separate.
"""
from __future__ import annotations
import argparse,base64,hashlib,io,json,re
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps

ROOT=Path(__file__).resolve().parents[1]
BRAND=ROOT/"brand_assets/fenix/official_20251020/FENIX_OFFICIAL_01_PNG_BASE64.json"
LOGO_SHA="ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7"
FORMATS={
 "IG-FEED-01":("INSTAGRAM","FEED",(1080,1350),4/5),
 "IG-CAROUSEL-01":("INSTAGRAM","CAROUSEL",(1080,1350),4/5),
 "IG-CAROUSEL-02":("INSTAGRAM","CAROUSEL",(1080,1350),4/5),
 "IG-CAROUSEL-03":("INSTAGRAM","CAROUSEL",(1080,1350),4/5),
 "IG-CAROUSEL-04":("INSTAGRAM","CAROUSEL",(1080,1350),4/5),
 "IG-CAROUSEL-05":("INSTAGRAM","CAROUSEL",(1080,1350),4/5),
 "IG-STORY-01":("INSTAGRAM","STORY",(1080,1920),9/16),
 "FB-FEED-01":("FACEBOOK","FEED",(1080,1080),1.0),
 "LI-FEED-01":("LINKEDIN","FEED",(1200,628),16/9),
 "SEO-HERO-01":("SEO","HERO",(1600,900),16/9),
 "SEO-BODY-01":("SEO","BODY",(1200,900),4/3)}
PALETTE={"charcoal":"#222222","purple":"#870064","gold":"#FFB71B","orange":"#FF5F00"}
class Hold(RuntimeError):pass
def sha(v):return hashlib.sha256(v).hexdigest()
def verified_logo(path=BRAND):
 x=json.loads(Path(path).read_text(encoding="utf8"))
 if x.get("logo_id")!="FENIX_OFFICIAL_01" or x.get("source_brand")!="OFFICIAL_MR_BOGART_2025":raise Hold("LOGO_REGISTRY")
 raw=base64.b64decode(x["file_content_base64"],validate=True)
 if sha(raw)!=LOGO_SHA:raise Hold("OFFICIAL_LOGO_SHA_CHANGED")
 im=Image.open(io.BytesIO(raw)).convert("RGBA")
 box=im.getbbox()
 if not box:raise Hold("EMPTY_OFFICIAL_LOGO")
 return im.crop(box)
def font(size):
 for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"):
  try:return ImageFont.truetype(path,size)
  except OSError:pass
 raise Hold("FONT_UNAVAILABLE")
def copy_allowed(channel,value):
 if channel=="SEO":
  if value:raise Hold("SEO_CANNOT_BURN_TEXT_IN_PIXELS")
  return ""
 if not isinstance(value,str):raise Hold("HEADLINE_NOT_TEXT")
 if any(c in value for c in "<>\r\n"):raise Hold("UNSAFE_HEADLINE")
 value=" ".join(value.split())
 if not value or len(value)>42 or len(value.split())>6:raise Hold("HEADLINE_LENGTH")
 if any(v in value.lower() for v in ("100% aprobada","garantizada","aprobación segura","concedida seguro")):raise Hold("CLAIM_NOT_VERIFIED")
 return value
def verified_image(path,item_id,source_sha,receipt=None):
 if item_id not in FORMATS:raise Hold("ITEM_ID")
 if not isinstance(source_sha,str) or not re.fullmatch("[0-9a-f]{64}",source_sha):raise Hold("MISSING_SOURCE_SHA")
 source=Path(path)
 if not source.is_file() or source.stat().st_size<40000:raise Hold("REAL_SOURCE_MISSING")
 data=source.read_bytes()
 if sha(data)!=source_sha:raise Hold("RAW_SOURCE_SHA_MISMATCH")
 with Image.open(io.BytesIO(data)) as im:
  im.load()
  if im.format!="JPEG" or min(im.size)<600 or max(im.size)<800:raise Hold("BAD_IMAGE_TYPE_OR_DIMENSIONS")
  expected_ratio=FORMATS[item_id][3]
  if abs((im.width/im.height)/expected_ratio-1)>0.035:raise Hold("NON_NATIVE_IMAGE_RATIO")
  output=im.convert("RGB")
 if receipt is not None:
  if (receipt.get("source_sha256"),receipt.get("item_id"),receipt.get("company_id"),receipt.get("engine_id"),receipt.get("environment"))!=(source_sha,item_id,"fenix","UMS-001","LAB"):raise Hold("UNTRUSTED_RECEIPT")
 return output,len(data)
def finish(source_path,output_dir,item_id,source_sha,headline="",receipt=None):
 if item_id not in FORMATS:raise Hold("ITEM_ID")
 channel,placement,size,_=FORMATS[item_id]
 headline=copy_allowed(channel,headline)
 src,raw_size=verified_image(source_path,item_id,source_sha,receipt)
 logo=verified_logo() if channel!="SEO" else None
 im=ImageOps.fit(src,size,Image.Resampling.LANCZOS,centering=(0.5,0.48)).convert("RGBA")
 layer=Image.new("RGBA",size,(0,0,0,0))
 draw=ImageDraw.Draw(layer)
 width,height=size
 if channel!="SEO":
  margin=max(26,int(width*.032)); box_w=int(width*.245); box_h=int(box_w*.80);right=width-margin
  rect=(right-box_w,margin,right,margin+box_h)
  draw.rounded_rectangle(rect,radius=20,fill=(255,252,247,250),outline=(255,183,27,210),width=2)
  logo.thumbnail((int(box_w*.78),int(box_h*.73)),Image.Resampling.LANCZOS)
  layer.alpha_composite(logo,(int((rect[0]+rect[2]-logo.width)/2),int((rect[1]+rect[3]-logo.height)/2)))
  begin=int(height*.77)
  for y in range(begin,height):
   q=(y-begin)/max(1,height-begin)
   draw.line((0,y,width,y),fill=(34,34,34,int(16+191*q*q)),width=1)
  max_width=int(width*.71)
  for size_font in range(int(min(width*.068,height*.085)),19,-1):
   face=font(size_font)
   if draw.textbbox((0,0),headline,font=face,stroke_width=1)[2]<=max_width:break
  else:raise Hold("HEADLINE_NO_SAFE_FIT")
  x=int(width*.045);y=height-int(height*.085)
  draw.text((x,y),headline,font=face,fill=(255,255,255,255),stroke_width=2,stroke_fill=(34,34,34,220))
  draw.rounded_rectangle((x,y-15,x+int(width*.065),y-8),radius=3,fill=(255,183,27,255))
 final=Image.alpha_composite(im,layer).convert("RGB")
 out=Path(output_dir);out.mkdir(parents=True,exist_ok=True)
 suffix="BRANDED" if channel!="SEO" else "SEO"
 path=out/(item_id+"_"+suffix+"_QA_REVIEW_ONLY.webp")
 final.save(path,"WEBP",quality=91,method=4)
 result={"schema_version":1,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
 "item_id":item_id,"channel":channel,"placement":placement,"source_sha256":source_sha,"source_size_bytes":raw_size,
 "output_file":path.name,"output_sha256":sha(path.read_bytes()),"pixel_dimensions":list(size),
 "brand_logo_id":"FENIX_OFFICIAL_01" if logo is not None else None,
 "brand_logo_sha256":LOGO_SHA if logo is not None else None,
 "brand_palette":"FENIX_MANUAL_2025","copy_font":"non-Montserrat system font; Montserrat reserved to original brand logo",
 "headline":headline,"technical_export_qa":"PASS",
 "vision_qa":"NOT_CERTIFIED","rights_qa":"NOT_CERTIFIED","editorial_score":None,
 "final_editorial_approved":False,"signed_delivery_verified":False,
 "publish_enabled":False,"delivery_allowed":False,"video_gate_allowed":False,
 "production_enabled":False,"new_provider_calls":0,"new_paid_spend_usd":0,
 "status":"TECHNICAL_BRAND_PREVIEW_ONLY_NOT_APPROVED"}
 (out/(item_id+"_QA_REVIEW_ONLY.json")).write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 return result
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--source",required=True);p.add_argument("--sha256",required=True)
 p.add_argument("--item-id",required=True,choices=FORMATS)
 p.add_argument("--headline",default="");p.add_argument("--out",required=True)
 a=p.parse_args();v=finish(a.source,a.out,a.item_id,a.sha256,a.headline)
 print(json.dumps({"item_id":v["item_id"],"output_sha256":v["output_sha256"],"publication_approved":False}))
if __name__=="__main__":main()
