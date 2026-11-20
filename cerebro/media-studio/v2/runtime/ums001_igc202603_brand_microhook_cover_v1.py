#!/usr/bin/env python3
"""CEREBRO UMS-001 deterministic social-cover composer for validated Replicate photo.
No generative-image calls, no invented brand, no publication, no PROD mutation.
"""
from __future__ import annotations
import base64, hashlib, io, json, sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path("cerebro/media-studio/v2")
OFFICIAL=ROOT/"brand_assets/fenix/official_20251020/FENIX_OFFICIAL_01_PNG_BASE64.json"
ORIGINAL_SHA="ddbcd231a5de5348d2e478c3fb805c1b51c1e23a0a9e9ac20a00d60ec1315e68"
LOGO_SHA="ec066819ee12c48fa148d6ca70f1434724ff780cc9ccabcfeefc07318c796cc7"
WIDTH,HEIGHT=1080,1350
HOOK="¿Y si falta algo?"
def sha(data):return hashlib.sha256(data).hexdigest()
def font(size):
 for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"):
  try:return ImageFont.truetype(p,size)
  except OSError:continue
 raise RuntimeError("CEREBRO_APPROVED_SYSTEM_FONT_NOT_FOUND")
def original_logo():
 d=json.loads(OFFICIAL.read_text())
 if d.get("logo_id")!="FENIX_OFFICIAL_01" or d.get("source_brand")!="OFFICIAL_MR_BOGART_2025":
  raise RuntimeError("LOGO_SOURCE_NOT_OFFICIAL")
 logo_bytes=base64.b64decode(d["file_content_base64"],validate=True)
 if sha(logo_bytes)!=LOGO_SHA:raise RuntimeError("OFFICIAL_LOGO_SHA_MISMATCH")
 logo=Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
 bounds=logo.getbbox()
 if not bounds:raise RuntimeError("LOGO_EMPTY")
 return logo.crop(bounds)
def make(source:Path,dest:Path):
 if not source.is_file():raise RuntimeError("REPLICATE_SOURCE_MISSING")
 raw=source.read_bytes()
 if sha(raw)!=ORIGINAL_SHA or not raw.startswith(bytes((255,216,255))):
  raise RuntimeError("REPLICATE_ASSET_SHA_MISMATCH")
 im=ImageOps.fit(Image.open(io.BytesIO(raw)).convert("RGB"),(WIDTH,HEIGHT),Image.Resampling.LANCZOS,centering=(0.5,0.46)).convert("RGBA")
 layer=Image.new("RGBA",(WIDTH,HEIGHT),(0,0,0,0));d=ImageDraw.Draw(layer)
 # Bottom sunset gradient adds legibility without obscuring human faces.
 for y in range(860,HEIGHT):
  t=max(0,min(1,(y-860)/490))
  alpha=int(20+225*t*t)
  d.line([(0,y),(WIDTH,y)],fill=(255,95,0,alpha),width=1)
 # Gold accented cinematic divider. ONE curiosity hook; no explanation or CTA.
 d.rounded_rectangle((43,1030,58,1215),radius=7,fill=(255,183,27,250))
 textx,texty=84,1040
 f=font(76)
 while d.textbbox((0,0),HOOK,font=f,stroke_width=3)[2]>900 and f.size>49:
  f=font(f.size-1)
 if f.size<65:raise RuntimeError("MICROHOOK_TOO_SMALL")
 # Strong drop shadow and white main line: legible, prominent, not a signature.
 d.text((textx+3,texty+6),HOOK,font=f,fill=(64,17,0,180),stroke_width=3,stroke_fill=(60,24,0,200))
 d.text((textx,texty),HOOK,font=f,fill=(255,255,250,255),stroke_width=3,stroke_fill=(90,33,4,230))
 if len(HOOK.split())>6 or len(HOOK)>42:raise RuntimeError("MICROHOOK_POLICY_VIOLATION")
 # Official brand, unmodified alpha image, set on quiet ivory patch at bottom right.
 box=(792,1130,1056,1330)
 d.rounded_rectangle(box,radius=25,fill=(255,251,247,249))
 logo=original_logo()
 logo.thumbnail((226,170),Image.Resampling.LANCZOS)
 layer.alpha_composite(logo,(810+(226-logo.width)//2,1145+(170-logo.height)//2))
 out=Image.alpha_composite(im,layer).convert("RGB")
 dest.mkdir(parents=True,exist_ok=True)
 jpg=dest/"IGC202603_S00_CEREBRO_REPLICATE_LLAMA_BRANDED_HOOK_V1.jpg"
 out.save(jpg,"JPEG",quality=93,subsampling=0,optimize=True)
 manifest={"schema_version":1,"company_id":"fenix","engine_id":"UMS-001",
   "environment":"LAB","content_id":"IGC-2026-03","concept_id":"IGC-2026-03-S00",
   "source_provider":"replicate","language_provider":"cloudflare_workers_ai",
   "source_prediction_id":"63k2yyqb7hrmy0d1s9990616p4",
   "source_sha256":ORIGINAL_SHA,"source_type":"ORIGINAL_REAL_REPLICATE_PHOTO",
   "brand_id":"FENIX_OFFICIAL_01","brand_sha256":LOGO_SHA,
   "brand_provenance":"Mr Bogart original, source exact bytes verified",
   "hook":HOOK,"hook_words":len(HOOK.split()),"visual_format":"1080x1350_4x5",
   "pixel_sha256":sha(jpg.read_bytes()),"final_file":jpg.name,
   "publication_approved":False,"legal_claims_review":"PENDING",
   "independent_vision_qa":"PENDING","posting":"DISABLED",
   "cost_estimate_new_usd":0,"modification_type":"FREE_DETERMINISTIC_POSTPRODUCTION"}
 (dest/"MANIFEST_QA.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
 print("UMS001_IGC202603_COVER_BRANDED_DONE")
 print("UMS001_IGC202603_OFFICIAL_BRAND_HASH_GREEN")
 print("UMS001_IGC202603_POSTPRODUCTION_NEW_SPEND_USD=0")
 print("UMS001_IGC202603_PUBLICATION=false")
 return manifest
if __name__=="__main__":
 if len(sys.argv)!=3:raise SystemExit("USAGE: script SOURCE_IMAGE.jpg OUTPUT_DIR")
 make(Path(sys.argv[1]),Path(sys.argv[2]))
