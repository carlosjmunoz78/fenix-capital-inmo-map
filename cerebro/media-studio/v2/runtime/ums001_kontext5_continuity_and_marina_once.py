#!/usr/bin/env python3
"""Single run: FLUX Kontext proof of SOLO actor persistence and Marina mobility visibility; LAB only."""
import os,sys,json,hashlib,time,base64,pathlib,urllib.request,urllib.parse,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
M=json.loads((ROOT/"characters/FLUX31_KONTEXT_CONTINUITY_AND_MARINA_FIX_PILOT_20261108.json").read_text(encoding="utf-8"))
IN=pathlib.Path("/tmp/cerebro-flux-cast-originals31")
OUT=pathlib.Path("/tmp/cerebro-flux-kontext5-20261108");OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","").strip()
STATUS={"state":"START","environment":"LAB","model":"black-forest-labs/flux-kontext-pro","reserved_estimated_spend_usd":0.0,"submissions":[],"assets":[],"qa_status":"PENDING","autopublish":False,"error":None}
def save(): (OUT/"status.json").write_text(json.dumps(STATUS,ensure_ascii=False,indent=2)+"\n")
def fail(msg):
 STATUS["state"]="BLOCKED";STATUS["error"]=msg;save();raise RuntimeError(msg)
def request(url,method="GET",body=None,timeout=95):
 hdr={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"UMS001-Kontext5-Premium-20261108"}
 payload=None if body is None else json.dumps(body).encode("utf-8")
 try:
  with urllib.request.urlopen(urllib.request.Request(url,method=method,data=payload,headers=hdr),timeout=timeout) as resp:
   return json.loads(resp.read(2500000))
 except urllib.error.HTTPError as e:fail("HTTP_"+str(e.code)+"_NO_PAID_RETRY")
 except (TimeoutError,OSError,ValueError):fail("NETWORK_AMBIGUOUS_NO_PAID_RETRY")
def safe_url(u):
 if not isinstance(u,str):fail("INVALID_MEDIA_URL")
 p=urllib.parse.urlparse(u)
 if p.scheme!="https" or not p.hostname or not(p.hostname in ("replicate.delivery","replicate.com") or p.hostname.endswith(".replicate.delivery") or p.hostname.endswith(".replicate.com")):fail("UNEXPECTED_OUTPUT_HOST")
def fetch_media(u,file):
 safe_url(u)
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"UMS001-Kontext5/1"}),timeout=90) as r:
   safe_url(r.url);data=r.read(11000000)
 except (TimeoutError,OSError):fail("DOWNLOAD_UNCERTAIN_DO_NOT_RESUBMIT")
 if len(data)<6000 or len(data)>10000000 or not data.startswith(b"\xff\xd8\xff"):fail("INVALID_JPEG")
 file.write_bytes(data)
 return {"file":file.name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
def main():
 if os.getenv("GITHUB_RUN_ATTEMPT")!="1" or os.getenv("CEREBRO_KONTEXT5_ONCE")!="yes":fail("ONE_SHOT_DENIED")
 if len(TOKEN)<18:fail("TOKEN_NOT_SET")
 if M["environment"]!="LAB" or M["model"]!="black-forest-labs/flux-kontext-pro" or M["total_images"]!=5 or M["max_estimated_cost_usd"]!=0.20 or M["autopublish"] or M["auto_reload"] or not M["no_paid_retry"]:fail("POLICY_BUDGET_MISMATCH")
 if len(M["jobs"])!=5:fail("SHOT_COUNT_NOT_FIVE")
 selected={}
 for job in M["jobs"]:
  path=IN/job["source_file"]
  if not path.is_file():fail("MISSING_SOURCE_ANCHOR_"+job["id"])
  data=path.read_bytes()
  if hashlib.sha256(data).hexdigest()!=job["sha"]:fail("SHA_MISMATCH_"+job["id"])
  if len(data)<9000 or len(data)>2000000 or data[:4]!=b"RIFF" or data[8:12]!=b"WEBP":fail("ANCHOR_NOT_WEBP")
  selected[job["source_file"]]="data:image/webp;base64,"+base64.b64encode(data).decode("ascii")
 m=request("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro")
 if m.get("name")!="flux-kontext-pro" or m.get("owner")!="black-forest-labs":fail("PROVIDER_MODEL_NOT_VERIFIED")
 STATUS["state"]="PREFLIGHT_GREEN";save()
 print("FLUX31_KONTEXT5_5_REFERENCES_SHA_VALIDATED; COST_ESTIMATED_USD_0.20; NO_RETRY; PUBLISH_OFF")
 for job in M["jobs"]:
  STATUS["reserved_estimated_spend_usd"]=round(STATUS["reserved_estimated_spend_usd"]+0.04,2)
  if STATUS["reserved_estimated_spend_usd"]>0.20:fail("MONEY_LIMIT")
  STATUS["state"]="SUBMITTING_"+job["id"]+"_"+job["shot"];save()
  inp={"input_image":selected[job["source_file"]],"prompt":job["prompt"],"aspect_ratio":"match_input_image","output_format":"jpg","seed":job["seed"],"safety_tolerance":2,"prompt_upsampling":False}
  pred=request("https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions",method="POST",body={"input":inp},timeout=100)
  pid=pred.get("id")
  if not isinstance(pid,str) or len(pid)<12:fail("NO_PREDICTION_ID_DO_NOT_RESUBMIT")
  rec={"actor_id":job["id"],"shot":job["shot"],"prediction_id":pid,"estimated_usd":0.04,"source_sha256":job["sha"]}
  STATUS["submissions"].append(rec);save()
  deadline=time.monotonic()+330
  while pred.get("status") not in ("succeeded","failed","canceled"):
   if time.monotonic()>deadline:fail("TIMEOUT_NO_RESUBMISSION")
   time.sleep(8)
   pred=request("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(pid,safe=""))
  if pred.get("status")!="succeeded":fail("PREDICTION_"+str(pred.get("status","UNKNOWN")).upper())
  output=pred.get("output")
  if isinstance(output,list):output=output[0] if len(output)==1 else None
  target=OUT/(job["id"]+"_"+job["shot"]+"_KONTEXT_QA_PENDING.jpg")
  info=fetch_media(output,target)
  info.update({"actor_id":job["id"],"shot":job["shot"],"source_sha256":job["sha"],"prediction_id":pid,"qa":"REVIEW_REQUIRED_NOT_APPROVED"})
  STATUS["assets"].append(info);STATUS["state"]="SAVED_"+job["id"]+"_"+job["shot"];save()
  print("PHYSICAL_KONTEXT_IMAGE_SAVED_"+job["id"]+"_"+job["shot"])
 (OUT/"original-pilot-manifest.json").write_text(json.dumps(M,ensure_ascii=False,indent=2)+"\n")
 STATUS["state"]="SUCCESS_5_PHYSICAL_KONTEXT_IMAGES_QA_PENDING";save()
 print("UMS001_KONTEXT5_PHYSICAL_SUCCESS; ASSET_COUNT=5; SPEND_ESTIMATED_USD_0.20; NO_PUBLICATION")
if __name__=="__main__":
 try:main()
 except Exception:
  print("KONTEXT5_BLOCKED:"+str(STATUS.get("error") or "UNKNOWN"))
  sys.exit(1)
