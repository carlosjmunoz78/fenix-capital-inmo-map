#!/usr/bin/env python3
"""UMS001 LAB isolated new-model canary. CEREBRO owns prompt; DeepSeek strict QA.
Seedream4 one output from existing Replicate prepaid, no auto retries/publishing.
"""
import argparse,base64,hashlib,importlib.util,io,json,os,re,sys,time
from pathlib import Path
from PIL import Image,ImageOps

ROOT=Path("cerebro/media-studio/v2")
BRANCH="cerebro/ums001-visual-learning-no-reference-lab-20261111"
REPO="carlosjmunoz78/fenix-capital-inmo-map"
ENDPOINT="https://api.replicate.com/v1/models/bytedance/seedream-4/predictions"
INPUT=ROOT/"requests/UMS001_LINKEDIN_SEEDREAM_4_16X9_ONCE_LAB_V0.json"
OUT=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"ums001-seedream-linkedin"
REQUEST="UMS001-MULTI11-SEEDREAM-LINKEDIN-CANARY-20261111-01"
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
 "environment":"LAB","provider":"bytedance/seedream-4","item_id":"LI-FEED-01",
 "max_predictions":1,"max_replicate_usd":0.03,"max_deepseek_calls":1,
 "max_deepseek_usd":0.02,"auto_reload":False,"publish":False,"execute_enabled":False,
 "image_ratio":"16:9","target_pixels":[1200,628]}:die("ORDER_CONTRACT")
 bridge=load("owner_bridge",ROOT/"runtime/ums001_multichannel_prompt_owner_lab_v1.py")
 m=bridge.read(bridge.MASTER)
 p=bridge.build_all()
 piece=next(i for i in m["pieces"] if i["item_id"]=="LI-FEED-01")
 owner_prompt=next(i for i in p["prompts"] if i["item_id"]=="LI-FEED-01")
 if (piece["aspect_ratio"],piece["provider_aspect_ratio"],piece["width_px"],piece["height_px"])!=("1.91:1","16:9",1200,628):die("REAL_SOCIAL_ASPECT")
 # Seedream visual route is intentionally a positive, short, photo-first model
 # adapter; do not copy hyperbolic orange gallery motifs from failed FLUX.
 prompt=("Documentary 35mm real estate editorial PHOTOGRAPH, squarely based on CEREBRO owner brief: "
  +piece["scene"]+" Real Córdoba Andalusian apartment consultation with a property advisor and adult buyer "
  "as exactly TWO recognizable Spanish adult people, photographed from eye-level in THREE-QUARTER FRONT VIEW, "
  "natural skin, full visible faces and relaxed believable hands, both looking toward each other across a modest table. "
  "Authentic sunny real-estate room: light cream plaster, real full-height window, natural sun shadows, wood details "
  "and recognizable local architecture. Horizontal wide 16:9 framing with the two human protagonists at center left, "
  "generous editorial safe space at right; no cut-off limbs. One SMALL original orange #FF5F00 translucent glass "
  "art object, physically refractive with a real shadow, occupies less than 15 percent of frame. Keep the room and "
  "people naturally colored, never giant orange wall, glowing arch tunnel, mannequin, or generic CGI. "
  "The viewer must clearly see BOTH faces and authentic home conditions. "
  "Original Fénix logo and caption are added later through verified compositing, do not generate any text, marks, "
  "bank approvals, signatures, badges, watermarks or branding in source image. No claims of guaranteed financing. "
  "Natural premium editorial realism, sunlit authentic materials, human emotion.")
 if not 900<=len(prompt)<=2600 or re.search(r"https?://|r8_[A-Za-z0-9]+",prompt):die("PROMPT_LENGTH_OR_SECRET")
 return x,piece,prompt,{"creative_owner":"CEREBRO_PROMPT_FACTORY_V0","deepseek_role":"TEMPORARY_VISUAL_QA",
  "source_factory_prompt_sha256":owner_prompt["prompt_sha256"],"original_master_sha256":h(json.dumps(m,sort_keys=True,ensure_ascii=False).encode()),
  "prompt_sha256":h(prompt.encode()),"source_scene_sha256":h(piece["scene"].encode())}
def reserve(m,token,job,proof):
 path="cerebro/media-studio/v2/finops/alternative-models/"+REQUEST+".json"
 url="https://api.github.com/repos/"+REPO+"/contents/"+path
 body={"branch":BRANCH,"message":"finops(ums001): reserve seedream LinkedIn prepaid canary once",
  "content":base64.b64encode(json.dumps({"request_id":REQUEST,"company_id":"fenix","engine_id":"UMS-001",
   "environment":"LAB","status":"RESERVED_FAIL_CLOSED","provider":"bytedance/seedream-4",
   "max_predictions":1,"max_model_cost_usd":0.03,"max_deepseek_cost_usd":0.02,"publish":False,
   "prompt_sha256":proof["prompt_sha256"],"github_run_id":os.environ.get("GITHUB_RUN_ID","")}).encode()).decode()}
 code,ans=m.http_json(url,"PUT",token,body,timeout=30)
 if code!=201 or not ans.get("content",{}).get("sha"):die("DUPLICATE_OR_NOT_RESERVED")
def run():
 x,piece,prompt,proof=plan()
 if (os.getenv("GITHUB_REPOSITORY"),os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=(REPO,BRANCH):die("BRANCH")
 if os.getenv("UMS001_SEEDREAM_ONE_SHOT_GATE")!="PREPAID_OWNER_ONE_LINKEDIN_CANARY_20261111":die("EXECUTION_GATE_OFF")
 ds=os.getenv("DEEPSEEK_API_KEY","");rep=os.getenv("REPLICATE_API_TOKEN","");gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not rep.startswith("r8_") or len(ds)<20 or not gh:die("CREDS_NOT_PRESENT")
 m=load("ums001_existing_deepseek",ROOT/"runtime/ums001_deepseek_primary_auto_lab_v1.py")
 receipt={"schema_version":1,"request_id":REQUEST,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
   "provider":"bytedance/seedream-4","creative_owner":"CEREBRO_PROMPT_FACTORY_V0","publish_enabled":False,
   "status":"PRECHECKED_NOT_SUBMITTED","replicate_predictions":0,"deepseek_calls":0,"proof":proof}
 persist(receipt)
 reserve(m,gh,x,proof);receipt["status"]="ATOMICALLY_RESERVED";persist(receipt)
 (OUT/"CEREBRO_OWNED_PROMPT.json").write_text(json.dumps({"prompt":prompt,**proof},ensure_ascii=False,indent=2)+"\n")
 image_input={"prompt":prompt,"size":"2K","aspect_ratio":"16:9","max_images":1,"image_input":[],
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
 rawpath=OUT/"SEEDREAM-LINKEDIN-RAW.jpg";rawpath.write_bytes(raw)
 with Image.open(io.BytesIO(raw)) as im:
  if im.format!="JPEG" or abs(im.width/im.height-16/9)>0.025 or min(im.size)<1024:die("WRONG_ORIENTATION_OR_FORMAT")
  fitted=ImageOps.fit(im.convert("RGB"),(1200,628),Image.Resampling.LANCZOS)
  fitted.save(OUT/"SEEDREAM-LINKEDIN-1200x628-QA-ONLY.webp","WEBP",quality=92,method=4)
 receipt.update({"raw_sha256":h(raw),"raw_pixels":list(Image.open(io.BytesIO(raw)).size),
                 "format_candidate_sha256":h((OUT/"SEEDREAM-LINKEDIN-1200x628-QA-ONLY.webp").read_bytes()),
                 "status":"RAW_PHOTO_QA_PENDING","independent_pixel_qa":False});persist(receipt)
 panel={"id":"S00","scene":piece["scene"],"human_subject":"one adult property adviser and one adult home buyer, both faces clearly visible",
        "hook":"Consulta inmobiliaria en Córdoba","bullets":[],
        "required_visuals":["wide real Córdoba home","two authentic adults and visible faces","small orange refractive sculpture","no texts or logos"]}
 job={"channel":"LINKEDIN","topic":"Córdoba buying home inspection before making a deposit"}
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
 print("UMS001_SEEDREAM_REAL_PREDICTIONS=1")
 print("UMS001_SEEDREAM_RESULT="+receipt["status"])
 print("UMS001_SEEDREAM_PUBLICATION=OFF")
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
