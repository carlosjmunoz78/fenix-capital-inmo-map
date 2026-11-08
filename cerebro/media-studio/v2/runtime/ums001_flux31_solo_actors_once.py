#!/usr/bin/env python3
"""UMS001 physical candidate-casting run. Exactly 31 original FLUX images, no retries, no production."""
import hashlib,json,os,pathlib,sys,time,urllib.error,urllib.parse,urllib.request
BASE=pathlib.Path(__file__).resolve().parents[1]
M=json.loads((BASE/"characters/FLUX_31_SOLO_CANONICAL_ANCHOR_CANDIDATES_20261108.json").read_text(encoding="utf-8"))
OUT=pathlib.Path(os.getenv("CEREBRO_CAST31_OUT","/tmp/cerebro-flux-cast-31-20261108"))
OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","").strip()
S={"state":"NOT_STARTED","company_id":"fenix","engine_id":"UMS-001","environment":"LAB","batch_id":M["batch_id"],"provider":"replicate","model":M["model"],"reserved_estimated_usd":0.0,"submissions":[],"assets":[],"qa":"PENDING_REVIEW","autopublish":False,"errors":[]}
def persist(): (OUT/"status.json").write_text(json.dumps(S,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def block(code):
 S["state"]="BLOCKED";S["errors"].append(code);persist();raise RuntimeError(code)
def req(url,method="GET",body=None,timeout=95):
 headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"UMS001-FLUX-SOLO31-LAB/20261108"}
 payload=None if body is None else json.dumps(body,ensure_ascii=False).encode("utf-8")
 request=urllib.request.Request(url,data=payload,headers=headers,method=method)
 try:
  with urllib.request.urlopen(request,timeout=timeout) as f:return json.loads(f.read(2000000))
 except urllib.error.HTTPError as e:block("PROVIDER_HTTP_"+str(e.code)+"_NO_RETRY")
 except (TimeoutError,OSError,ValueError):block("PROVIDER_NETWORK_UNCERTAIN_NO_RESUBMIT")
def check_url(url):
 if not isinstance(url,str):block("NO_URL")
 p=urllib.parse.urlparse(url)
 if p.scheme!="https" or not p.hostname or not(p.hostname in ("replicate.delivery","replicate.com") or p.hostname.endswith(".replicate.delivery") or p.hostname.endswith(".replicate.com")):block("UNEXPECTED_OUTPUT_HOST")
def download(url,target):
 check_url(url)
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS001-FLUX-CANONICAL31/1"}),timeout=110) as f:
   check_url(f.url)
   data=f.read(20000001)
 except (TimeoutError,OSError):block("OUTPUT_DOWNLOAD_UNCERTAIN_NO_RESUBMIT")
 if not(7000<len(data)<20000000 and data[:4]==b"RIFF" and data[8:12]==b"WEBP"):block("OUTPUT_NOT_VALID_WEBP")
 target.write_bytes(data)
 return {"file":target.name,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)}
def main():
 if os.getenv("GITHUB_RUN_ATTEMPT")!="1" or os.getenv("UMS001_SOLO31_ONE_SHOT")!="yes":block("NOT_SINGLE_RUN")
 if len(TOKEN)<18:block("SECRET_NOT_SET")
 if M.get("environment")!="LAB" or M.get("model")!="black-forest-labs/flux-1.1-pro":block("PROVIDER_NOT_ALLOWED")
 if M.get("total_images")!=31 or len(M.get("actors",[]))!=31 or M.get("max_estimated_cost_usd")!=1.24:block("BUDGET_OR_COUNT_MISMATCH")
 if any(M.get(x) is not False for x in ("autopublish","auto_reload","automatic_paid_retry")):block("UNSAFE_AUTOMATION_SETTING")
 if len(set(a["actor_id"] for a in M["actors"]))!=31: block("ACTOR_ID_COLLISION")
 if any(a["status"]!="PENDING_SINGLE_GENERATION" or a["estimated_cost_usd"]!=0.04 or a["aspect_ratio"]!="3:4" or a["output_format"]!="webp" for a in M["actors"]):block("ACTOR_CONTRACT_MISMATCH")
 m=req("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro")
 if m.get("owner")!="black-forest-labs" or m.get("name")!="flux-1.1-pro":block("MODEL_VERIFICATION_FAILED")
 S["state"]="PREFLIGHT_GREEN";persist()
 print("SOLO_31_FLUX_PREFLIGHT_GREEN; NO_RETRY; MAX_ESTIMATED_SPEND_USD_1.24; LAB_ONLY")
 for a in M["actors"]:
  S["reserved_estimated_usd"]=round(S["reserved_estimated_usd"]+0.04,2)
  if S["reserved_estimated_usd"]>1.24:block("MONEY_LIMIT")
  S["state"]="SUBMITTING_"+a["actor_id"];persist()
  inp={"prompt":a["prompt"],"seed":a["seed"],"aspect_ratio":"3:4","output_format":"webp","output_quality":95,"safety_tolerance":2,"prompt_upsampling":False}
  p=req("https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",method="POST",body={"input":inp},timeout=95)
  pid=p.get("id")
  if not isinstance(pid,str) or len(pid)<12:block("UNKNOWN_PREDICTION_AFTER_SUBMISSION_NO_RETRY")
  rec={"actor_id":a["actor_id"],"prediction_id":pid,"estimated_usd":0.04,"state":"SUBMITTED"}
  S["submissions"].append(rec);persist()
  deadline=time.monotonic()+360
  while p.get("status") not in ("succeeded","failed","canceled"):
   if time.monotonic()>deadline:block("MODEL_TIMEOUT_DO_NOT_RESUBMIT")
   time.sleep(7)
   p=req("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(pid,safe=""))
  if p.get("status")!="succeeded":block("PREDICTION_"+str(p.get("status","UNKNOWN")).upper())
  url=p.get("output")
  if isinstance(url,list):url=url[0] if len(url)==1 else None
  target=OUT/(a["actor_id"]+"_FLUX11_PRO_SINGLE_CANONICAL_CANDIDATE.webp")
  meta=download(url,target)
  meta.update({"actor_id":a["actor_id"],"group_id":a["group_id"],"prediction_id":pid,"qa":"PENDING_UNIQUENESS_FACIAL_ANATOMY","source":"NEW_SYNTHETIC_SOLO_NOT_SAME_FACE_AS_ORIGINAL_CAST_GROUP", "cost_estimated_usd":0.04})
  S["assets"].append(meta);rec["state"]="SAVED_AND_SHA256_VERIFIED";S["state"]="SAVED_"+a["actor_id"];persist()
  print("ACTOR_ANCHOR_SAVED_"+a["actor_id"]+"; length="+str(meta["bytes"]))
 (OUT/"original-prompts-and-actor-ids.json").write_text(json.dumps(M,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 S["state"]="DONE_31_PHYSICAL_CANDIDATES_PENDING_VISUAL_QA";persist()
 print("CEREBRO_FLUX_31_SOLO_PHYSICAL_SUCCESS; IMAGES=31; ESTIMATED_COST_USD=1.24; AUTO_PUBLISH=OFF")
if __name__=="__main__":
 try:main()
 except Exception:
  print("UMS001_FLUX31_BLOCKED:"+str(S["errors"][-1] if S["errors"] else "UNKNOWN"))
  sys.exit(1)
