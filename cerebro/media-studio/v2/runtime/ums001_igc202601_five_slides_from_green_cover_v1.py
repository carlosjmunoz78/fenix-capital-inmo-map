#!/usr/bin/env python3
"""CEREBRO UMS-001: exactly five distinct Replicate images S01–S05, LAB ONLY.
Mandatory R05 cover verified; prepaid $0.30 reserve once, no paid retries.
No posting, no generated logo, no new subscriptions.
"""
import base64,hashlib,importlib.util,json,os,re,shutil,sys,time,urllib.parse,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("base",HERE/"replicate-one-shot-canary-lab-20261111.py")
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
REPO=base.REPO;BRANCH=base.BRANCH;MODEL=base.MODEL;API=base.API
ORDER=Path("cerebro/media-studio/v2/requests/UMS001_IGC202601_AFTER_R05_FIVE_SLIDES_V1.json")
REF=Path("cerebro/media-studio/v2/references/IGC202601_OWNER_APPROVED_CLEAN_REVIEW_CROP_BASE64.json")
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202601-five"
COVER_PATH=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202601-cover"/"IGC-2026-01-S00_REPLICATE_REDUX_R05_RAW.jpg"
COVER_SHA="337ab92430498151d315e13044547395c7b710e9db986adb3d9630c8b6fb0e94"
EXPECTED=("S01","S02","S03","S04","S05")
def deny(x):raise RuntimeError("IGC202601_BATCH_"+x)
def hashhex(d):return hashlib.sha256(d).hexdigest()
def dump(doc):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"batch_receipt.json").write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n")
def validate(order,reference):
 expected={"request_id":"UMS001-IGC202601-S01-S05-20261111-01","company_id":"fenix","engine_id":"UMS-001",
   "environment":"LAB","content_id":"IGC-2026-01","model_id":MODEL,"max_predictions":5,
   "max_cost_usd":0.30,"budget":"EXISTING_PREPAID_ONLY",
   "reference_guide":"CLEAN_OWNER_APPROVED_REVIEW_CROP","image_prompt_strength":0.22,"raw":False,"publish":False,
   "approval_state":"OWNER_APPROVED_CAROUSEL_REPLICATE_LAB"}
 if {k:v for k,v in order.items() if k!="concept_prompts"}!=expected:deny("ORDER_POLICY_DENIED")
 prompts=order.get("concept_prompts")
 if not isinstance(prompts,dict) or set(prompts)!=set(EXPECTED):deny("FIVE_SLIDE_IDS_REQUIRED")
 for key,p in prompts.items():
  if not isinstance(p,str) or not 700<=len(p)<=4500 or "surreal" not in p.lower() or "photograph" not in p.lower() or "no logos" not in p.lower():
   deny("PROMPT_NOT_ALLOWED_"+key)
 if reference.get("source_sha256")!="c6341224d5e02ae7bf79e2d7b4effc59566d2aaa7028f2ad129f2045b79dcfe2":deny("REFERENCE_NOT_APPROVED")
 raw64=reference.get("base64_image","")
 if not isinstance(raw64,str) or not 30000<=len(raw64)<=150000:deny("REFERENCE_SIZE_INVALID")
 try:raw=base64.b64decode(raw64,validate=True)
 except Exception:deny("BAD_BASE64")
 if not raw.startswith(b"\xff\xd8\xff") or hashhex(raw)!=reference["source_sha256"]:deny("REFERENCE_HASH_DENIED")
 return prompts,raw64
def reserve(gh,request_id):
 path="cerebro/media-studio/v2/finops/lab-reservations/"+request_id+".json"
 body={"request_id":request_id,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
     "status":"RESERVED_NO_AUTO_RETRY","max_predictions":5,"estimated_cost_usd":0.30,
     "provider":"replicate","model_id":MODEL,"publication_approved":False,
     "cover_prediction_id":"vnmptp4s6drmw0d1s8at0tmc3c","run_id":os.getenv("GITHUB_RUN_ID","")}
 api="https://api.github.com/repos/"+REPO+"/contents/"+path
 payload={"message":"finops(ums001): reserve five real IGC202601 images, $0.30 prepaid, idempotent",
   "branch":BRANCH,"content":base64.b64encode(json.dumps(body,indent=2).encode()).decode()}
 status,response,_=base.http_json(api,"PUT",gh,payload,timeout=20)
 if status!=201 or not response.get("content",{}).get("sha"):deny("DUPLICATE_OR_EXCLUSIVE_RESERVATION_MISSING")
 return path,response["content"]["sha"]
def safe_media(url):
 u=urllib.parse.urlparse(url)
 if u.scheme!="https" or (u.hostname!="replicate.delivery" and not (u.hostname or "").endswith(".replicate.delivery")) or u.username or u.password or u.fragment:deny("MEDIA_URL_UNTRUSTED")
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"CEREBRO-UMS001-CAROUSEL/1.0"}),timeout=35) as f:
  last=urllib.parse.urlparse(f.geturl())
  if last.scheme!="https" or (last.hostname!="replicate.delivery" and not (last.hostname or "").endswith(".replicate.delivery")):deny("MEDIA_REDIRECT_UNTRUSTED")
  raw=f.read(12_000_001)
 if not 1024<len(raw)<=12_000_000 or raw[:3]!=bytes([255,216,255]):deny("JPEG_INVALID")
 return raw
def main():
 if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:deny("BRANCH_SCOPE")
 if os.getenv("UMS001_IGC202601_FIVE_PREPAID_GATE")!="OWNER_APPROVED_PREPAID_20261111":deny("BILLING_GATE_MISSING")
 order=json.loads(ORDER.read_text());ref=json.loads(REF.read_text());prompts,reference64=validate(order,ref)
 if not COVER_PATH.is_file() or hashhex(COVER_PATH.read_bytes())!=COVER_SHA:deny("GREEN_COVER_REFERENCE_MISSING_OR_TAMPERED")
 gh=os.getenv("GH_TOKEN_FOR_LAB","");token=os.getenv("REPLICATE_API_TOKEN","")
 if not gh or not token.startswith("r8_") or len(token)<20:deny("AUTH_TOKEN_MISSING")
 acc,acct,_=base.http_json(API+"account",token=token,timeout=15)
 mo,model,_=base.http_json(API+"models/"+MODEL,token=token,timeout=15)
 if acc!=200 or acct.get("type") not in ("user","organization") or mo!=200 or model.get("name")!="flux-1.1-pro-ultra":deny("PROVIDER_AUTH_OR_MODEL_INVALID")
 dump({"status":"VALIDATED_NO_PROVIDER_POST_YET","request_id":order["request_id"],"publication_approved":False,"predictions_submitted":0,"outputs":[]})
 reserve_path,reserve_sha=reserve(gh,order["request_id"])
 OUT.mkdir(parents=True,exist_ok=True)
 shutil.copy2(COVER_PATH,OUT/"S00_RAW.jpg")
 receipt={"schema_version":1,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","request_id":order["request_id"],
  "provider":"replicate","model_id":MODEL,"max_predictions":5,"estimated_cost_usd":0.30,"predictions_submitted":0,
  "cover_prediction_id":"vnmptp4s6drmw0d1s8at0tmc3c","cover_sha256":COVER_SHA,
  "status":"RESERVED","publication_approved":False,"independent_qa":"PENDING","outputs":[]}
 dump(receipt)
 for sid in EXPECTED:
  p=prompts[sid]
  image_input={"prompt":p,"aspect_ratio":"4:5","raw":False,
   "image_prompt":"data:image/jpeg;base64,"+reference64,"image_prompt_strength":0.22,
   "output_format":"jpg","safety_tolerance":2}
  try:status,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
       data={"input":image_input},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
  except Exception:deny("PROVIDER_POST_UNCERTAIN_NO_RETRY_"+sid)
  if status not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):
   deny("PROVIDER_SUBMISSION_NOT_CONFIRMED_"+sid)
  item={"slide_id":sid,"prediction_id":pred["id"],"status":"SUBMITTED",
     "prompt_sha256":hashhex(p.encode()),"estimated_cost_usd":0.06}
  receipt["predictions_submitted"]+=1;receipt["outputs"].append(item);receipt["status"]="RUNNING";dump(receipt)
  for _ in range(14):
   if pred.get("status") in ("succeeded","failed","canceled"):break
   time.sleep(3)
   code,pred,_=base.http_json(API+"predictions/"+item["prediction_id"],token=token,timeout=20)
   if code!=200:deny("POLL_FAIL_RECONCILE_"+sid)
  if pred.get("status")!="succeeded":deny("PREDICTION_NOT_SUCCEEDED_RECONCILE_"+sid)
  url=pred.get("output")
  if isinstance(url,list):url=url[0] if url else None
  if not isinstance(url,str):deny("OUTPUT_MISSING_"+sid)
  data=safe_media(url)
  (OUT/(sid+"_RAW.jpg")).write_bytes(data)
  item.update(status="IMAGE_DOWNLOADED_QA_PENDING",sha256=hashhex(data),bytes=len(data),filename=sid+"_RAW.jpg")
  dump(receipt)
 receipt["status"]="FIVE_IMAGES_DOWNLOADED_PLUS_GREEN_R05_COVER__QA_PENDING"
 dump(receipt)
 print("CEREBRO_IGC202601_REAL_SIX_RAW_PRESENT=true")
 print("CEREBRO_IGC202601_NEW_REPLICATE_PAID_PREDICTIONS=5")
 print("CEREBRO_IGC202601_PREPAID_COST_ESTIMATE_USD=0.30")
 print("CEREBRO_IGC202601_PUBLICATION=false")
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e) if str(e).startswith("IGC202601_BATCH_") else "IGC202601_BATCH_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
  sys.exit(2)
