#!/usr/bin/env python3
"""One-shot private CEREBRO UMS001 FLUX 1.1 Pro 32 Andalusian fictional environment stills. No publication."""
import hashlib,json,os,pathlib,sys,time,urllib.error,urllib.parse,urllib.request
BASE=pathlib.Path(__file__).resolve().parents[1]
M=json.loads((BASE/"locations/FLUX_ANDALUCIA_32_REUSABLE_SCENES_20261108.json").read_text(encoding="utf-8"))
OUT=pathlib.Path(os.getenv("UMS_FLUX_GEO_OUTPUT","/tmp/ums001-flux-andalucia-32"))
OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","").strip()
S={"state":"NOT_STARTED","batch_id":M["batch_id"],"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","model":M["model"],"reserved_estimated_usd":0.0,"submissions":[],"assets":[],"published":False,"quality_assurance":"PENDING_VISUAL_AND_GEO_REALISM_QA","error":None}
def persist(): (OUT/"status.json").write_text(json.dumps(S,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def block(msg):
 S["state"]="BLOCKED";S["error"]=msg;persist();raise RuntimeError(msg)
def api(url,method="GET",body=None,timeout=90):
 h={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"UMS001-FLUX-ANDALUCIA-GEO-20261108"}
 pay=None if body is None else json.dumps(body,ensure_ascii=False).encode("utf-8")
 try:
  with urllib.request.urlopen(urllib.request.Request(url,data=pay,headers=h,method=method),timeout=timeout) as r:
   return json.loads(r.read(2000000))
 except urllib.error.HTTPError as e:block("REPLICATE_HTTP_"+str(e.code)+"_NO_RETRY")
 except (TimeoutError,OSError,ValueError):block("REPLICATE_CONNECTION_UNCERTAIN_NO_RETRY")
def safe_output(url):
 if not isinstance(url,str):block("OUTPUT_URL_MISSING")
 u=urllib.parse.urlparse(url)
 if u.scheme!="https" or not u.hostname or not (u.hostname in ("replicate.delivery","replicate.com") or u.hostname.endswith(".replicate.delivery") or u.hostname.endswith(".replicate.com")):block("OUTPUT_URL_HOST_DENIED")
def download(url,target):
 safe_output(url)
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS001-ANDALUCIA-ASSET"}),timeout=95) as r:
   safe_output(r.url)
   data=r.read(22000001)
 except (TimeoutError,OSError):block("OUTPUT_DOWNLOAD_UNCERTAIN")
 if len(data)<7000 or len(data)>22000000 or data[:4]!=b"RIFF" or data[8:12]!=b"WEBP":block("REPLICATE_OUTPUT_NOT_WEBP")
 target.write_bytes(data)
 return {"filename":target.name,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)}
def main():
 if os.environ.get("GITHUB_RUN_ATTEMPT")!="1" or os.environ.get("CEREBRO_GEO_ONE_SHOT")!="yes":block("ONE_SHOT_CONTEXT")
 if len(TOKEN)<18:block("SECRET_MISSING")
 if M.get("environment")!="LAB" or M.get("autopublish") or M.get("automatic_paid_retry") or M.get("autorenew"):block("UNSAFE_MODE")
 if M.get("number_images")!=32 or len(M["shots"])!=32 or M.get("max_estimated_spend_usd")!=1.28: block("LIMIT_MISMATCH")
 if M.get("geo_assertion")!="NO_EXACT_GEOLOCATION_CLAIM_OR_REAL_LISTING_CLAIM":block("GEO_MISREPRESENTATION_GATE")
 if len({s["asset_id"] for s in M["shots"]})!=32:block("DUPLICATED_ASSET_ID")
 if sorted(set(s["province_key"] for s in M["shots"]))!=sorted(["ALMERIA","CADIZ","CORDOBA","GRANADA","HUELVA","JAEN","MALAGA","SEVILLA"]):block("PROVINCE_COVERAGE_INCOMPLETE")
 if any(s["estimated_cost_usd"]!=0.04 or s["aspect_ratio"] not in ("9:16","16:9") or s["reference_model"]!="black-forest-labs/flux-1.1-pro" or s["location_accuracy"]!="CONCEPTUAL_FICTIONAL_REGIONALLY_INSPIRED" for s in M["shots"]):block("MEDIA_POLICY_INVALID")
 model=api("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro")
 if model.get("owner")!="black-forest-labs" or model.get("name")!="flux-1.1-pro":block("UNVERIFIED_PROVIDER_MODEL")
 S["state"]="PREFLIGHT_GREEN";persist()
 print("UMS001_ANDALUCIA_32_PRECHECK_GREEN; 8_PROVINCES; 32_IMAGES; MAX_ESTIMATED_COST_USD_1.28; NO_PUBLISH")
 for s in M["shots"]:
  if round(S["reserved_estimated_usd"]+0.04,2)>1.28:block("MONEY_LIMIT")
  S["reserved_estimated_usd"]=round(S["reserved_estimated_usd"]+0.04,2)
  S["state"]="SUBMITTING_"+s["asset_id"];persist()
  inp={"prompt":s["prompt"],"aspect_ratio":s["aspect_ratio"],"seed":s["seed"],"output_format":"webp","output_quality":s["output_quality"],"safety_tolerance":2,"prompt_upsampling":False}
  p=api("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions","POST",{"input":inp},timeout=100)
  predid=p.get("id")
  if not isinstance(predid,str) or len(predid)<12:block("PREDICTION_ID_MISSING_NO_RESUBMIT")
  rec={"id":s["asset_id"],"prediction_id":predid,"province":s["province"],"cost_estimate_usd":0.04,"state":"SUBMITTED"}
  S["submissions"].append(rec);persist()
  deadline=time.monotonic()+330
  while p.get("status") not in ("succeeded","failed","canceled"):
   if time.monotonic()>deadline:block("PREDICTION_TIMEOUT_NO_RESUBMIT")
   time.sleep(7)
   p=api("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(predid,safe=""))
  if p.get("status")!="succeeded":block("PREDICTION_"+str(p.get("status","UNKNOWN")).upper())
  url=p.get("output")
  if isinstance(url,list):url=url[0] if len(url)==1 else None
  target=OUT/(s["asset_id"]+".webp")
  md=download(url,target)
  md.update({"asset_id":s["asset_id"],"province":s["province"],"shot_type":s["shot_type"],"ratio":s["aspect_ratio"],"prediction_id":predid,"provenance":"SYNTHETIC_ORIGINAL_NOT_REAL_PROPERTY","qa":"PENDING"})
  S["assets"].append(md);rec["state"]="SAVED_AND_HASHED";S["state"]="SAVED_"+s["asset_id"];persist()
  print("UMS001_FLUX_PROVINCE_ASSET_PERSISTED_"+s["asset_id"])
 (OUT/"original-prompt-manifest.json").write_text(json.dumps(M,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 S["state"]="32_ORIGINAL_IMAGES_PHYSICALLY_SAVED_QA_PENDING";persist()
 print("UMS001_ANDALUCIA_32_PHYSICAL_SUCCESS; FINAL_ESTIMATED_COST_USD_1.28; 32_REAL_FILES; PRIVATE_ARTIFACT; NO_PUBLICATION")
if __name__=="__main__":
 try:main()
 except Exception:
  print("UMS001_ANDALUCIA_32_BLOCKED:"+str(S.get("error") or "UNKNOWN"))
  sys.exit(1)
