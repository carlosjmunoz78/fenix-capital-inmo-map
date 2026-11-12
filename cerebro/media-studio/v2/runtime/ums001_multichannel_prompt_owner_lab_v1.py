#!/usr/bin/env python3
"""UMS-001 creative ownership: 11 existing owner orders -> 11 deterministic CEREBRO prompts.
Zero network, no provider tokens, no publication, no claims of visual acceptance.
Preserves existing Prompt Factory and its full historic contracts unchanged.
"""
from __future__ import annotations
import argparse,hashlib,importlib.util,json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/"requests/UMS001_MULTICHANNEL_IMAGE_11_20261111.json"
LEDGER=ROOT/"qa/UMS001_DEEPSEEK_REAL_IMAGE_LEARNING_LEDGER_20261111.json"
FORGE=ROOT/"runtime/ums001_prompt_forge_lab_v0.py"
KNOWN_CHANNELS={"INSTAGRAM","FACEBOOK","LINKEDIN","SEO"}
ALLOWED_RATIOS={"4:5","9:16","1:1","1.91:1","16:9","4:3"}
REQ_ID="UMS001-MULTICHANNEL-IMAGE-11-20261111-V1"

def deny(code):raise ValueError("UMS001_CEREBRO_FIRST_"+code)
def read(p):return json.loads(Path(p).read_text(encoding="utf-8"))
def h(v):return hashlib.sha256(v.encode("utf-8")).hexdigest()
def compact(v,n):
 if not isinstance(v,str) or not v.strip():deny("INVALID_SCENE_FIELD")
 s=" ".join(v.split())
 return s[:n].rsplit(" ",1)[0] if len(s)>n else s
def forge_module():
 sp=importlib.util.spec_from_file_location("ums001_internal_forge",FORGE)
 mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
 return mod

def check_master(master,ledger):
 if not isinstance(master,dict) or master.get("request_id")!=REQ_ID or master.get("status")!="REGISTERED_NOT_YET_EXECUTED":deny("MASTER_STATUS")
 if (master.get("company_id"),master.get("engine_id"),master.get("environment"),master.get("creative_ownership"),master.get("creative_teacher"))!=("fenix","UMS-001","LAB","UMS001_CREATIVE_PROMPT_FACTORY","DEEPSEEK_INTERNAL_TEMPORARY"):deny("CREATIVE_GOVERNANCE")
 e=master.get("execution") or {}
 if e.get("paid_execution_enabled") is not False or e.get("auto_publish_enabled") is not False or e.get("production_enabled") is not False or e.get("max_additional_cost_eur")!=0:deny("COST_OR_PUBLICATION")
 p=master.get("pieces")
 if not isinstance(p,list) or len(p)!=11 or len(set(x.get("item_id") for x in p))!=11:deny("PIECES")
 if (ledger.get("company_id"),ledger.get("engine_id"),ledger.get("environment"))!=("fenix","UMS-001","LAB"):deny("LEDGER_SCOPE")
 if any(x.get("run_id") == 43051178813 for x in ledger.get("runs",[])) is False:deny("REAL_QA_LESSONS_MISSING")
 for item in p:
  if (item.get("channel") not in KNOWN_CHANNELS or item.get("aspect_ratio") not in ALLOWED_RATIOS or
      item.get("publication_approved") is not False or item.get("brand_policy")!="OFFICIAL_LOGO_POSTPROCESS_ONLY"):deny("BAD_PIECE")
  if not isinstance(item.get("width_px"),int) or not isinstance(item.get("height_px"),int) or item["width_px"]<500 or item["height_px"]<500:deny("PIXEL_DIMENSIONS")
  if item["channel"]=="SEO" and item.get("hook")!="":deny("SEO_NO_LABELS")
 return p

def build_one(item,master,forge=None):
 forge=forge or forge_module()
 channel=item["channel"]
 scene=item["scene"]
 is_seo=channel=="SEO"
 # The owner brief is canonical. Do not let the external teacher invent a new
 # background, cast, platform, logo, or aspect ratio.
 human="Two adult Córdoba home buyers" if is_seo else "Authentic adult Spanish property buyers"
 action="visiting the home and checking conditions" if is_seo else "discussing buying a Córdoba property responsibly"
 brief={
  "schema_version":1,
  "request_id":REQ_ID+"-"+item["item_id"],
  "company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
  "content_id":"MULTI11-"+item["item_id"],
  "platform":channel,"asset_type":"SEO_HERO" if is_seo else "IMAGE",
  "topic":compact(master["title"],230),"audience":compact(master["audience"],200),
  "publish_enabled":False,"max_additional_cost_eur":0,
  "panels":[{
   "panel_id":item["item_id"],
   "subject_profession":human,
   "human_action":action,
   "scene_context":compact(scene,180),
   "surreal_symbolism":compact(scene,170),
   "educational_focus":compact(item["objective"],190),
   "mood":"candid, intelligent and believable"
  }]
 }
 # These named defects are backed by actual QA runs 43049681977 and 43051178813.
 # They never import free-form text from arbitrary incoming model responses.
 defects=["SCENE_GENERIC","FACE_OCCLUSION"] if not is_seo else ["HUMAN_MISSING","SCENE_GENERIC"]
 feedback={"company_id":"fenix","engine_id":"UMS-001","content_id":brief["content_id"],"quality_defects":defects}
 out=forge.build_prompt_batch(brief,feedback)
 if out.get("llm_api_calls")!=0 or out.get("replicate_api_calls")!=0 or out.get("publish_enabled") is not False or out.get("prompt_count")!=1:deny("FORGE_OUTPUT")
 base=out["prompts"][0]
 target=item["aspect_ratio"]
 provider=item["provider_aspect_ratio"]
 if target not in ALLOWED_RATIOS or provider not in ALLOWED_RATIOS:deny("RATIO")
 if item["item_id"]=="LI-FEED-01" and (target,provider)!=("1.91:1","16:9"):deny("LINKEDIN_ADAPTER")
 if item["item_id"]!="LI-FEED-01" and target!=provider:deny("CROP_UNAPPROVED")
 if is_seo:
  cast="SEO environmental photography: recognizable Córdoba home and visitors integrated naturally in medium scale, leave negative space for external HTML heading, never close-up portrait or an empty living room."
 else:
  cast="Social editorial: follow canonical exact human cast, face visibility, documentary human realism and cinematic original architecture; no extraneous figures, backs to camera, generic glowing corridor."
 contract=("IMMUTABLE OWNER BRIEF AND CINEMATIC STAGING: "
  +compact(scene,320)+". "+cast+
  " Intended consumer "+channel+" "+item["placement"]+". "
  "Output target "+str(item["width_px"])+"x"+str(item["height_px"])+" ("+target+"), provider-native ratio "+provider+". "
  "All branding and social hooks must be composited later from verified original Fénix assets, never in pixels by the image model. "
  "Photographic anatomy, cast count, architecture, natural sunlight, refraction, Córdoba visual authenticity and rights must pass actual pixel QA. ")
 if item["item_id"]=="FB-FEED-01":
  # Actual FB 1:1 photo run 43055263249 proved the old 5k-token cinematic
  # template over-dominated with arches despite face and apartment instructions.
  # Keep the parent Prompt Factory's source SHA and lens, but promote its strict
  # owner-authored scene to a shorter PHOTOGRAPHY-FIRST factual storyboard.
  camera=base["camera"]
  photo_first=(
   "PRIORITY 1, INSTANTLY VISIBLE HUMAN CAST: exactly TWO real adult home buyers, one mature Spanish woman and one mature Spanish man, standing naturally in a real Córdoba LIVING ROOM. "
   "Both look three-quarter TOWARD CAMERA, natural unmistakable visible full faces, eyes and expressions. Photograph people at 35mm eye height with shoulders, complete hands and believable finger anatomy; nobody facing away, no extra cast. "
   "PRIORITY 2, RECOGNIZABLE PROPERTY: white-cream painted living-room walls, a normal full-size window with outdoor Mediterranean sunlight, a real sofa and wood table, lived-in authentic Córdoba textures and true shadow falloff. "
   "The majority of the square image is realistic home and two visitors, NOT an orange background. This must look like a real estate property-viewing documentary editorial PHOTO, not CGI render, not art exhibition. "
   "PRIORITY 3, ONLY A SUBTLE SECONDARY BRAND ART OBJECT: one single small original orange translucent glass mobile or sculptural tabletop installation behind the couple, physically coherent with refraction and shadow, covering LESS THAN TWENTY PERCENT of image area. "
   "Do not generate orange rooms, repeating arches, tunnels, uniform orange wall, fantasy corridors, surreal galleries, or giant sculptures dwarfing faces; keep warm neutral light and naturally colored skin. "
   "CAMERA AND NATURALISM: "+camera+"; daylight key from real window, soft bounced fill, real-estate photographic contrast, premium authentic texture and sharp correct faces. "
   "BRAND COMPLIANCE: original official Fénix logo and any type will be SHA-verified in postproduction ONLY; image pixels contain NO generated words, financial promises, approval checkmarks, seals, fabricated watermarks or logos. "
   "CREATIVE STORYTELLING: two adult buyers at the start of a real property visit, attentive, relaxed, professionally confident, as requested by the existing owner's Facebook brief. "
   "QA REALITY GATE: reject the output unless two distinct visible authentic faces and a normal Córdoba living room are immediately recognizable in actual pixels, with only a small complementary real-world orange glass accent. "
   "RIGHTS: no identifiable private residents or third-party marks. "
   "No guarantee of mortgage approval, no misleading financial claim, no fake bank endorsements."
  )
  prompt=contract+" CEREBRO OWNED COMPACT PHOTOGRAPHY FIRST STORYBOARD: "+photo_first
 else:
  prompt=contract+" CEREBRO PROMPT FACTORY CAMERA AND ART DIRECTION: "+base["text"]
 if not 1500<=len(prompt)<=6500:deny("OWNED_PROMPT_LENGTH")
 if re.search(r"https?://|r8_[a-z0-9]+",prompt,re.I):deny("SENSITIVE_PROMPT")
 return {
 "item_id":item["item_id"],"channel":channel,"placement":item["placement"],
 "aspect_ratio":target,"provider_aspect_ratio":provider,
 "target_pixels":[item["width_px"],item["height_px"]],
 "company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
 "creative_owner":"CEREBRO_PROMPT_FACTORY_V0",
 "deepseek_role":"TEMPORARY_CREATIVE_MENTOR_AND_VISUAL_QA",
 "input_master_request_id":master["request_id"],
 "text":prompt,"prompt_sha256":h(prompt),"source_scene_sha256":h(scene),
 "parent_prompt_forge_sha256":base["prompt_sha256"],
 "creative_photo_profile":"FACEBOOK_AUTHENTIC_PROPERTY_PHOTO_FIRST" if item["item_id"]=="FB-FEED-01" else "LEGACY_STUDIO_PREMIUM",
 "learning_signals":defects,"visual_qa":"PENDING_PHYSICAL_IMAGE",
 "estimated_new_spend_eur":0,"provider_calls":0,"publish_enabled":False
 }

def build_all(master=None,ledger=None):
 master=master or read(MASTER);ledger=ledger or read(LEDGER)
 items=check_master(master,ledger)
 f=forge_module()
 out=[build_one(item,master,f) for item in items]
 if len({p["prompt_sha256"] for p in out})!=11:deny("PROMPT_COLLISION")
 return {
 "schema_version":1,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
 "request_id":REQ_ID,"creative_owner":"CEREBRO_PROMPT_FACTORY_V0",
 "teacher":"DEEPSEEK_INTERNAL_TEMPORARY","origin":"EXISTING_FORGE_WITH_REAL_QA",
 "original_brief_sha256":h(json.dumps(master,sort_keys=True,ensure_ascii=False)),
 "original_qa_sha256":h(json.dumps(ledger,sort_keys=True,ensure_ascii=False)),
 "generated_prompt_count":11,"real_image_count_this_execution":0,
 "provider_calls_this_execution":0,"publish_enabled":False,
 "quality_status":"PROMPTS_PREPARED_IMAGES_NOT_VERIFIED",
 "prompts":out
 }

def main():
 pa=argparse.ArgumentParser();pa.add_argument("--out",required=True);args=pa.parse_args()
 p=Path(args.out)
 if p.is_absolute():deny("ABSOLUTE_OUT_PATH")
 if not str(p).startswith("cerebro/media-studio/v2/qa/"):deny("OUTSIDE_QA")
 doc=build_all();p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(doc,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
 print("UMS001_CEREBRO_FIRST_PROMPTS="+str(doc["generated_prompt_count"]))
 print("UMS001_CEREBRO_FIRST_API_CALLS=0")
 print("UMS001_CEREBRO_FIRST_PUBLICATION=OFF")
if __name__=="__main__":main()
