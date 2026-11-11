#!/usr/bin/env python3
"""UMS001 LAB isolated 9:16 Instagram story canary. CEREBRO owns prompt; DeepSeek strict QA.
Seedream4 one output from existing Replicate prepaid, no auto retries/publishing.
"""
import argparse,base64,hashlib,importlib.util,io,json,os,re,sys,time
from pathlib import Path
from PIL import Image,ImageOps

ROOT=Path("cerebro/media-studio/v2")
BRANCH="cerebro/ums001-visual-learning-no-reference-lab-20261111"
REPO="carlosjmunoz78/fenix-capital-inmo-map"
ENDPOINT="https://api.replicate.com/v1/models/bytedance/seedream-4/predictions"
INPUT=ROOT/"requests/UMS001_IGSTORY_SEEDREAM_4_9X16_ONCE_LAB_V0.json"
OUT=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"ums001-seedream-igstory"
REQUEST="UMS001-MULTI11-SEEDREAM-IGSTORY-CANARY-20261111-01"
def die(x):raise RuntimeError("UMS001_SEEDREAM_FAIL_CLOSED_"+x)
def read(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def persist(o):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"receipt.json").write_text(json.dumps(o,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
def h(v):return hashlib.sha256(v).hexdigest()
def load(name,file):
 spec=importlib.util.spec_from_file_location(name,file)
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
def plan():
 x=read(INPUT)
 if x!={"schema_version":1,"request_id":REQUEST,"company_id":"fenix","engine_id":"UMS-001",
 "environment":"LAB","provider":"bytedance/seedream-4","item_id":"IG-STORY-01",
 "max_predictions":1,"max_replicate_usd":0.03,"max_deepseek_calls":1,
 "max_deepseek_usd":0.02,"auto_reload":False,"publish":False,"execute_enabled":False,
 "image_ratio":"9:16","target_pixels":[1080,1920]}:die("ORDER_CONTRACT")
 bridge=load("owner_bridge",ROOT/"runtime/ums001_multichannel_prompt_owner_lab_v1.py")
 m=bridge.read(bridge.MASTER)
 p=bridge.build_all()
 piece=next(i for i in m["pieces"] if i["item_id"]=="IG-STORY-01")
 owner_prompt=next(i for i in p["prompts"] if i["item_id"]=="IG-STORY-01")
 if (piece["aspect_ratio"],piece["provider_aspect_ratio"],piece["width_px"],piece["height_px"])!=("9:16","9:16",1080,1920):die("REAL_SOCIAL_ASPECT")
 # Seedream visual route is intentionally a positive, short, photo-first model
 # adapter; do not copy hyperbolic orange gallery motifs from failed FLUX.
 prompt=("High-end ORIGINAL vertical 9:16 documentary real estate PHOTO, following CEREBRO original brief exactly: "
  +piece["scene"]+" Exactly TWO authentic Spanish adult home buyers, a woman and a man, "
  "visible three-quarter front, natural facial expressions, warm and believable, with clear recognizable eyes, "
  "naturally positioned hands and complete body proportions; NO rear views and NO extra people. "
  "Authentic Córdoba courtyard with limestone, cream stucco, stone floor, traditional pots and green climbing plants "
  "in sunny late-afternoon natural Mediterranean light. A spectacular but PHYSICALLY PLAUSIBLE orange #FF5F00 "
  "translucent blown-glass architectural artwork catches daylight in the BACKGROUND and occupies no more "
  "than a quarter of the scene, never an all-orange glowing tunnel, fake neon gallery or CGI landscape. "
  "The two human subjects remain large enough to recognize at 1080x1920 mobile story size, in the CENTRAL "
  "SAFE AREA; leave the top 20 percent and bottom 18 percent free of critical faces, hands and art for "
  "professional postproduction UI and typography. Vertical 9:16 portrait composition intentionally shot "
  "natively with 35mm eye-level documentary optics, natural skin and honest shadows, no fisheye or face distortion. "
  "Premium realistic photography, readable architecture, normal atmospheric depth, restrained warm palette "
  "and tasteful glass refraction; never blur or muddy light. No lettering, stamps, watermarks, invented logos, "
  "financial approvals or bank icons inside the generated pixels; Fénix real official logo and social hook "
  "are applied later by the SHA-verified company compositor only. No financing guarantees.")
 if not 900<=len(prompt)<=2600 or re.search(r"https?://|r8_[A-Za-z0-9]+",prompt):die("PROMPT_LENGTH_OR_SECRET")
 return x,piece,prompt,{"creative_owner":"CEREBRO_PROMPT_FACTORY_V0","deepseek_role":"TEMPORARY_VISUAL_QA",
  "source_factory_prompt_sha256":owner_prompt["prompt_sha256"],"original_master_sha256":h(json.dumps(m,sort_keys=True,ensure_ascii=False).encode()),
  "prompt_sha256":h(prompt.encode()),"source_scene_sha256":h(piece["scene"].encode())}
def reserve(m,token,job,proof):
 path="cerebro/media-studio/v2/finops/alternative-models/"+REQUEST+".json"
 url="https://api.github.com/repos/"+REPO+"/contents/"+path
 body={"branch":BRANCH,"message":"finops(ums001): reserve seedream Instagram Story prepaid canary once",
  "content":base64.b64encode(json.dumps({"request_id":REQUEST,"company_id":"fenix","engine_id":"UMS-001",
   "environment":"LAB","status":"RESERVED_FAIL_CLOSED","provider":"bytedance/seedream-4",
   "max_predictions":1,"max_model_cost_usd":0.03,"max_deepseek_cost_usd":0.02,"publish":False,
   "prompt_sha256":proof["prompt_sha256"],"github_run_id":os.environ.get("GITHUB_RUN_ID","")}).encode()).decode()}
 code,ans=m.http_json(url,"PUT",token,body,timeout=30)
 if code!=201 or not ans.get("content",{}).get("sha"):die("DUPLICATE_OR_NOT_RESERVED")
def run():
 x,piece,prompt,proof=plan()
 if (os.getenv("GITHUB_REPOSITORY"),os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=(REPO,BRANCH):die("BRANCH")
 if os.getenv("UMS001_SEEDREAM_ONE_SHOT_GATE")!="PREPAID_OWNER_ONE_IGSTORY_CANARY_20261111":die("EXECUTION_GATE_OFF")
 ds=os.getenv("DEEPSEEK_API_KEY","");rep=os.getenv("REPLICATE_API_TOKEN","");gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not rep.startswith("r8_") or len(ds)<20 or not gh:die("CREDS_NOT_PRESENT")
 m=load("ums001_existing_deepseek",ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py")
 receipt={"schema_version":1,"request_id":REQUEST,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
   "provider":"bytedance/seedream-4","creative_owner":"CEREBRO_PROMPT_FACTORY_V0","publish_enabled":False,
   "status":"PRECHECKED_NOT_SUBMITTED","replicate_predictions":0,"deepseek_calls":0,"proof":proof}
 persist(receipt)
 reserve(m,gh,x,proof);receipt["status"]="ATOMICALLY_RESERVED";persist(receipt)
 (OUT/"CEREBRO_OWNED_PROMPT.json").write_text(json.dumps({"prompt":prompt,**proof},ensure_ascii=False,indent=2)+"\n")
 image_input={"prompt":prompt,"size":"2K","aspect_ratio":"9:16","max_images":1,"image_input":[],
             "enhance_prompt":False,"sequential_image_generation":"disabled"}
 try:status,pred=m.http_json(ENDPOINT,"POST",rep,{"input":image_input},timeout=85)
 except Exception:die("UNCERTAIN_PROVIDER_POST_NO_RETRY")
 if status not in (200,201) or not re.fullmatch(r"[a-z0-9]{8,80}",str(pred.get("id",""))):die("PRED_NOT_CONFIRMED")
 receipt["replicate_predictions"]=1;receipt["prediction_id"]=pred["id"];receipt["status"]="PRED_SUBMITTED";persist(receipt)
 for _ in range(24):
  if pred.get("status") in ("succeeded","failed","canceled"):break
  time.sleep(3)
  code,pred=m.http_json("https://api.replicate.com/v1/predictions/"+receipt["prediction_id"],token=rep,timeout=25)
  if code!=200:die("POLL_NOT_VERIFIED_NO_RETRY")
 if pred.get("status")!="succeeded":die("PRED_NOT_SUCCEEDED_NO_RETRY")
 output=pred.get("output")
 if not isinstance(output,list) or len(output)!=1:die("SINGLE_IMAGE_REQUIRED")
 raw=m.jpg_from_replicate({"output":output}) # Replicate HTTPS trusted download whitelist
 rawpath=OUT/"SEEDREAM-IGSTORY-RAW.jpg";rawpath.write_bytes(raw)
 with Image.open(io.BytesIO(raw)) as im:
  if im.format!="JPEG" or abs(im.width/im.height-9/16)>0.025 or min(im.size)<1024:die("WRONG_ORIENTATION_OR_FORMAT")
  fitted=ImageOps.fit(im.convert("RGB"),(1080,1920),Image.Resampling.LANCZOS)
  fitted.save(OUT/"SEEDREAM-IGSTORY-1080x1920-QA-ONLY.webp","WEBP",quality=92,method=4)
 receipt.update({"raw_sha256":h(raw),"raw_pixels":list(Image.open(io.BytesIO(raw)).size),
                 "format_candidate_sha256":h((OUT/"SEEDREAM-IGSTORY-1080x1920-QA-ONLY.webp").read_bytes()),
                 "status":"RAW_PHOTO_QA_PENDING","independent_pixel_qa":False});persist(receipt)
 panel={"id":"S00","scene":piece["scene"],"human_subject":"two adult buyers one woman and one man, both faces clearly visible",
        "hook":"Consulta inmobiliaria en Córdoba","bullets":[],
        "required_visuals":["tall real Córdoba patio","two authentic adults and visible faces","glass architecture secondary to people","safe top and bottom, no texts or logos"]}
 job={"channel":"INSTAGRAM","topic":"Córdoba due diligence before paying a property deposit"}
 clock={"deepseek_calls":0,"deepseek_cap":1,"total_text_tokens":0,"estimated_cost_usd":0.0,"max_cost_usd":0.02}
 try:
  qa,qa_meta=m.deepseek(m.vision_messages(job,panel,raw),ds,clock,vision=True)
  checked=m.validate_vision(qa)
  receipt.update({"vision_qa":checked,"vision_provider":qa_meta,"deepseek_calls":clock["deepseek_calls"],
   "deepseek_estimated_usd":clock["estimated_cost_usd"],
   "status":"RAW_AI_QA_ACCEPTED_INDEPENDENT_PIXEL_QA_PENDING" if checked["accepted"] else "HUMAN_REQUIRED_LOW_CONFIDENCE"})
 except Exception as err:
  receipt.update({"status":"HUMAN_REQUIRED_QA_SCHEMA_FAILED","deepseek_calls":clock["deepseek_calls"],
   "vision_error_type":type(err).__name__})
 persist(receipt)
 print("UMS001_SEEDREAM_IGSTORY_REAL_PREDICTIONS=1")
 print("UMS001_SEEDREAM_IGSTORY_RESULT="+receipt["status"])
 print("UMS001_SEEDREAM_IGSTORY_PUBLICATION=OFF")
 if receipt["status"]!="RAW_AI_QA_ACCEPTED_INDEPENDENT_PIXEL_QA_PENDING":raise SystemExit(3)
def main():
 parser=argparse.ArgumentParser();parser.add_argument("--preflight",action="store_true");parser.add_argument("--execute",action="store_true")
 a=parser.parse_args()
 if a.preflight and not a.execute:
  x,p,prompt,proof=plan()
  print(json.dumps({"status":"OFFLINE_VALIDATED_NO_API_CALLS","id":REQUEST,"item_id":x["item_id"],"prompt_sha256":proof["prompt_sha256"],"model_cost_cap_usd":0.03},ensure_ascii=False))
 elif a.execute and not a.preflight:run()
 else:die("MODE")
if __name__=="__main__":
 try:main()
 except Exception as e:print(str(e),file=sys.stderr);sys.exit(2)
