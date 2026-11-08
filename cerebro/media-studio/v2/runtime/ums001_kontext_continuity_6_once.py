#!/usr/bin/env python3
"""UMS001 one-shot FLUX Kontext Pro proof: preserve six new views of three old cast groups. Never publish."""
from __future__ import annotations
import base64, hashlib, json, os, pathlib, sys, time
import urllib.error, urllib.parse, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
P=json.loads((ROOT/"characters/kontext-continuity-6-image-pilot-20261108.json").read_text(encoding="utf-8"))
ACTORS=json.loads((ROOT/"characters/actor-registry-unique-31-lab-v0.json").read_text(encoding="utf-8"))
SOURCES=pathlib.Path(os.environ.get("CEREBRO_CAST_REFERENCE_DIR","/tmp/ums001-cast-originals"))
OUT=pathlib.Path(os.environ.get("CEREBRO_KONTEXT_OUTPUT_DIR","/tmp/ums001-kontext-premium-6"))
OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","").strip()
S={"state":"NOT_STARTED","company_id":"fenix","engine_id":"UMS-001","model":"black-forest-labs/flux-kontext-pro","predictions":[],"assets":[],"estimated_spend_reserved_usd":0.0,"no_publish":True,"qa":"PENDING_VISUAL_CAST_REVIEW","error":None}
def save():
 (OUT/"run-status.json").write_text(json.dumps(S,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def stop(code):
 S["state"]="BLOCKED";S["error"]=code;save()
 raise RuntimeError(code)
def api(url,method="GET",obj=None,timeout=90):
 h={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"CEREBRO-UMS001-Kontext-one-shot/20261108"}
 data=None if obj is None else json.dumps(obj,ensure_ascii=False).encode()
 req=urllib.request.Request(url,data=data,headers=h,method=method)
 try:
  with urllib.request.urlopen(req,timeout=timeout) as response:
   return json.loads(response.read(2500000))
 except urllib.error.HTTPError as e:
  stop("REPLICATE_API_HTTP_"+str(e.code)+"_NO_RETRY")
 except (TimeoutError,OSError,ValueError):
  stop("REPLICATE_API_NETWORK_UNCERTAIN_DO_NOT_RESUBMIT")
def validate_output_link(url):
 u=urllib.parse.urlparse(url)
 if not isinstance(url,str) or u.scheme!="https" or not u.hostname or not (u.hostname in ("replicate.delivery","replicate.com") or u.hostname.endswith(".replicate.delivery") or u.hostname.endswith(".replicate.com")):stop("OUTPUT_HOST_NOT_REPLICATE")
def fetch_media(url,dest):
 validate_output_link(url)
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"CEREBRO-UMS001-Kontinuity-LAB"})
  with urllib.request.urlopen(req,timeout=95) as response:
   validate_output_link(response.url)
   data=response.read(12000001)
 except (TimeoutError,OSError):
  stop("OUTPUT_FETCH_FAILED_DO_NOT_RESUBMIT")
 if len(data)>12000000 or len(data)<7000 or not data.startswith(b"\xff\xd8\xff"):stop("OUTPUT_IMAGE_JPEG_INVALID")
 dest.write_bytes(data)
 return {"file":dest.name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
def main():
 if os.getenv("GITHUB_RUN_ATTEMPT")!="1" or os.getenv("CEREBRO_KONTEXT_ONE_SHOT")!="yes":stop("ONE_SHOT_GATE_CLOSED")
 if P["environment"]!="LAB" or P["no_autopublish"]!=True or P["no_paid_retry"]!=True or P["autorenew"]!=False:stop("POLICY_NOT_SAFE")
 if len(P["pilots"])!=3 or sum(len(x["shots"]) for x in P["pilots"])!=6 or P["max_estimated_spend_usd"]!=0.24:stop("BUDGET_AND_COUNT_MISMATCH")
 if len(ACTORS["actors"])!=31 or len({x["actor_id"] for x in ACTORS["actors"]})!=31 or ACTORS["state"]!="DEFINED_NOT_APPROVED":stop("REGISTRY_NOT_SAFE")
 if not TOKEN or len(TOKEN)<18:stop("SECRET_MISSING")
 inputs=[]
 for group in P["pilots"]:
  file=SOURCES/(group["id"]+".webp")
  if not file.is_file():stop("ANCHOR_REFERENCE_NOT_FOUND_"+group["id"])
  raw=file.read_bytes()
  if len(raw)>950000 or len(raw)<10000 or raw[:4]!=b"RIFF" or raw[8:12]!=b"WEBP":stop("ANCHOR_MEDIA_INVALID_"+group["id"])
  sha=hashlib.sha256(raw).hexdigest()
  if sha!=group["expected_sha256"]:stop("ANCHOR_SOURCE_HASH_MISMATCH_"+group["id"])
  for actor in group["roles"]:
   if actor not in {a["actor_id"] for a in ACTORS["actors"]}:stop("CAST_MEMBER_NOT_REGISTERED")
  inputs.append((group, "data:image/webp;base64,"+base64.b64encode(raw).decode("ascii"),sha))
 S["state"]="SOURCE_REFERENCES_VERIFIED";save()
 m=api("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro")
 if m.get("owner")!="black-forest-labs" or m.get("name")!="flux-kontext-pro":stop("MODEL_UNVERIFIED")
 print("KONTEXT_PRO_REFERENCES_SHA256_GREEN; THREE_CAST_GROUPS; SIX_IMAGES; 0.24_USD_MAX_ESTIMATED; NO_RETRIES")
 for group,img_data,sha in inputs:
  for sh in group["shots"]:
   if S["estimated_spend_reserved_usd"]+0.04>0.2400001:stop("MONEY_LIMIT")
   S["estimated_spend_reserved_usd"]=round(S["estimated_spend_reserved_usd"]+0.04,4)
   S["state"]="SUBMITTING_"+group["id"]+"_"+sh["shot"];save()
   inp={"input_image":img_data,"prompt":sh["prompt"],"aspect_ratio":"match_input_image","output_format":"jpg","seed":sh["seed"],"safety_tolerance":2,"prompt_upsampling":False}
   pred=api("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions","POST",{"input":inp},timeout=100)
   pred_id=pred.get("id")
   if not isinstance(pred_id,str) or len(pred_id)<12:stop("UNKNOWN_PAID_PREDICTION_ID_NO_RESUBMIT")
   record={"group_id":group["id"],"shot_id":sh["shot"],"prediction_id":pred_id,"estimated_cost_usd":0.04,"anchor_sha256":sha,"state":"SUBMITTED"}
   S["predictions"].append(record);save()
   deadline=time.monotonic()+300
   while pred.get("status") not in ("succeeded","failed","canceled"):
    if time.monotonic()>deadline:stop("PREDICTION_TIMEOUT_NO_RESUBMIT")
    time.sleep(6)
    pred=api("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(pred_id,safe=""))
   if pred.get("status")!="succeeded":stop("PREDICTION_"+str(pred.get("status","UNKNOWN")).upper())
   url=pred.get("output")
   if isinstance(url,list):url=url[0] if len(url)==1 else None
   if not isinstance(url,str):stop("PREDICTION_OUTPUT_NOT_ONE_URL")
   target=OUT/(group["id"]+"_"+sh["shot"]+".jpg")
   meta=fetch_media(url,target)
   meta.update({"group_id":group["id"],"shot_id":sh["shot"],"reference_sha256":sha,"prediction_id":pred_id,"qa":"PENDING_CROSS_CAST_FACE_AND_CONTINUITY_REVIEW"})
   S["assets"].append(meta);record["state"]="PERSISTED_AND_HASHED";S["state"]="SAVED_"+group["id"]+"_"+sh["shot"];save()
   print("REPLICATE_KONTEXT_ASSET_PERSISTED_"+group["id"]+"_"+sh["shot"])
 S["state"]="SIX_KONTEXT_IMAGES_PHYSICALLY_GENERATED_QA_PENDING";save()
 (OUT/"pilot-manifest.json").write_text(json.dumps(P,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("KONTEXT_SIX_IMAGE_PILOT_SUCCESS; NO_MEDIA_PUBLICATION; QA_AND_DRIVE_ARCHIVE_REQUIRED")
if __name__=="__main__":
 try:main()
 except Exception:
  print("KONTEXT_PILOT_BLOCKED: "+str(S.get("error") or "GENERATION_UNKNOWN_ERROR"))
  sys.exit(1)
