#!/usr/bin/env python3
"""FLUX casting board, one-shot private LAB. Never accesses customer data or publishes. No paid retries."""
import os,json,hashlib,urllib.parse,urllib.request,urllib.error,pathlib,time,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
M=json.loads((ROOT/"characters/flux-casting-16-personas-20261108.json").read_text())
OUT=pathlib.Path("/tmp/ums001-flux-casting-16-20261108")
OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","").strip()
status={"state":"NOT_SUBMITTED","company_id":"fenix","engine_id":"UMS-001","environment":"LAB","submitted":[],"generated_assets":[],"reserved_estimated_usd":0.0,"error":None,"publication":"OFF"}
def save(): (OUT/"generation-status.json").write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n")
def block(code):
 status["state"]="BLOCKED";status["error"]=code;save()
 raise RuntimeError(code)
def req(url,method="GET",obj=None,timeout=70):
 h={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"UMS001-FLUX-CAST-LAB/20261108"}
 body=None if obj is None else json.dumps(obj).encode("utf-8")
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers=h,data=body,method=method),timeout=timeout) as x:
   return json.loads(x.read(2_000_000))
 except urllib.error.HTTPError as e:block("MODEL_API_HTTP_"+str(e.code)+"_NO_RETRY")
 except (TimeoutError,OSError,ValueError):block("MODEL_API_NETWORK_UNCERTAIN_NO_RETRY")
def download(url,path):
 if not isinstance(url,str):block("ASSET_URL_INVALID")
 u=urllib.parse.urlparse(url)
 def valid(u):
  return u.scheme=="https" and bool(u.hostname) and (u.hostname in ("replicate.delivery","replicate.com") or u.hostname.endswith(".replicate.delivery") or u.hostname.endswith(".replicate.com"))
 if not valid(u):block("UNSAFE_OUTPUT_HOST")
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS001-FLUX-CAST-LAB/1"}),timeout=100) as inp:
   if not valid(urllib.parse.urlparse(inp.url)):block("UNSAFE_OUTPUT_REDIRECT")
   data=inp.read(20_000_001)
 except (TimeoutError,OSError):block("OUTPUT_DOWNLOAD_UNCERTAIN")
 if len(data)>20_000_000 or len(data)<6000:block("IMAGE_FILE_SIZE_INVALID")
 if not (data[:4]==b"RIFF" and data[8:12]==b"WEBP"):block("IMAGE_NOT_WEBP")
 path.write_bytes(data)
 return {"sha256":hashlib.sha256(data).hexdigest(),"size_bytes":len(data),"file":path.name}
def main():
 if os.getenv("GITHUB_RUN_ATTEMPT")!="1" or os.getenv("UMS_CAST_SINGLE_RUN")!="yes":block("NOT_ONE_SHOT")
 if len(TOKEN)<16:block("TOKEN_NOT_CONFIGURED")
 if M["environment"]!="LAB" or M["autopublish"] or not M["no_paid_retry"]:block("UNSAFE_MANIFEST")
 people=M["persons"]
 if len(people)!=16 or len({p["character_id"] for p in people})!=16:block("PERSONA_COUNT_OR_ID")
 if M["model"]!="black-forest-labs/flux-1.1-pro" or M["max_estimated_spend_usd"]!=0.64:block("PROVIDER_BUDGET_DENIED")
 if abs(sum(float(p["cost_estimate_usd"]) for p in people)-0.64)>0.0001:block("PRICE_ESTIMATE_MISMATCH")
 model=req("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro")
 if model.get("owner")!="black-forest-labs" or model.get("name")!="flux-1.1-pro":block("MODEL_UNVERIFIED")
 print("FLUX_PRO_CAST_16_VERIFIED; 16 ORIGINAL_FICTIONAL_GROUP_PORTRAITS; ESTIMATED_LIMIT_USD=0.64; NO_PAID_RETRY; NO_PUBLISH")
 for p in people:
  status["reserved_estimated_usd"]=round(status["reserved_estimated_usd"]+0.04,4)
  if status["reserved_estimated_usd"]>0.64001:block("MONEY_LIMIT")
  status["state"]="SUBMITTING_"+p["character_id"];save()
  inp={"prompt":p["prompt"],"seed":p["seed"],"aspect_ratio":p["aspect_ratio"],"output_format":"webp","output_quality":95,"safety_tolerance":2,"prompt_upsampling":False}
  pred=req("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions","POST",{"input":inp},timeout=100)
  predid=pred.get("id")
  if not predid or not isinstance(predid,str):block("UNKNOWN_PREDICTION_SUBMIT_DO_NOT_RETRY")
  status["submitted"].append({"character_id":p["character_id"],"prediction_id":predid,"estimate_usd":0.04});save()
  deadline=time.monotonic()+300
  while pred.get("status") not in ("succeeded","failed","canceled"):
   if time.monotonic()>deadline:block("PREDICTION_TIMEOUT_NO_RESUBMIT")
   time.sleep(6)
   pred=req("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(predid,safe=""),timeout=60)
  if pred.get("status")!="succeeded":block("PREDICTION_"+str(pred.get("status","UNKNOWN")).upper())
  url=pred.get("output")
  if isinstance(url,list):url=url[0] if len(url)==1 else None
  path=OUT/(p["character_id"]+".webp")
  meta=download(url,path)
  meta.update({"character_id":p["character_id"],"prediction_id":predid,"seed":p["seed"],"model":"black-forest-labs/flux-1.1-pro","estimated_cost_usd":0.04,"qa":"PENDING","rights":"PENDING_REVIEW"})
  status["generated_assets"].append(meta);status["state"]="ASSET_DOWNLOADED_"+p["character_id"];save()
  print("FLUX_CAST_GENERATED_PERSISTED_"+p["character_id"]+"; bytes="+str(meta["size_bytes"]))
 (OUT/"casting-manifest-original.json").write_text(json.dumps(M,ensure_ascii=False,indent=2)+"\n")
 status["state"]="DONE_16_IMAGES_PHYSICALLY_GENERATED_QA_PENDING";save()
 print("FLUX_CAST_16_PHYSICAL_SUCCESS; REAL_FILES=16; ESTIMATED_SPEND_USD=0.64; QA_PENDING")
if __name__=="__main__":
 try:main()
 except Exception:
  print("FLUX_CAST_BLOCKED; CODE="+str(status["error"] or "UNKNOWN"))
  sys.exit(1)
