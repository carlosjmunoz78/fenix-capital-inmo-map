#!/usr/bin/env python3
"""CEREBRO UMS-001 reference-guided FLUX Redux LAB ONE-SHOT. At most $0.06 prepaid.
Never infer real identity from source portraits; source is visual style reference only.
No repeated paid call or social publication. Reference image is cropped to avoid logos/text.
"""
import base64,hashlib,importlib.util,json,os,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("base",HERE/"replicate-one-shot-canary-lab-20261111.py")
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MODEL=base.MODEL;API=base.API;BRANCH=base.BRANCH;REPO=base.REPO
ORDER=Path("cerebro/media-studio/v2/requests/UMS001_IGC202601_REDUX_R03_ORDER.json")
REF=Path("cerebro/media-studio/v2/references/IGC202601_OWNER_APPROVED_COVER_CROP_BASE64.json")
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202601-redux-r03"
def deny(msg):raise RuntimeError("UMS001_REDUX_R03_"+msg)
def keep(doc):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"receipt.json").write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n")
def validate(order,reference):
 allowed={"request_id":"UMS001-IGC202601-REDUX-R03-20261111","company_id":"fenix","engine_id":"UMS-001",
 "environment":"LAB","content_id":"IGC-2026-01","slide_id":"S00","model_id":MODEL,
 "max_predictions":1,"max_cost_usd":0.06,"budget":"EXISTING_PREPAID_ONLY",
 "publish":False,"approval_state":"OWNER_ACCEPTED_REFERENCE_GUIDED_LAB",
 "raw":False,"image_prompt_strength":0.38}
 if any(order.get(k)!=v for k,v in allowed.items()) or set(order)!=set(allowed)|{"prompt"}:deny("ORDER_SCOPE_DENIED")
 prompt=order.get("prompt","")
 if not 550<=len(prompt)<=3900 or "photograph" not in prompt.lower() or "surreal" not in prompt.lower() or "no logos" not in prompt.lower():deny("PROMPT_POLICY")
 if reference.get("source_sha256")!="962234ceee5cc42f108fbe911238e892bdbc77213f80d6b53dbf5d5922cbd8bd":deny("SOURCE_IDENTITY_MISMATCH")
 raw64=reference.get("base64_image","")
 if not isinstance(raw64,str) or not 20000<len(raw64)<150000:deny("REFERENCE_TOO_LARGE_OR_MISSING")
 try:raw=base64.b64decode(raw64,validate=True)
 except Exception:deny("BAD_BASE64")
 if not raw.startswith(b"\xff\xd8\xff") or hashlib.sha256(raw).hexdigest()!=reference["source_sha256"]:deny("REFERENCE_SHA_DENIED")
 return prompt,raw64
def main():
 if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:deny("RUNNER_SCOPE_DENIED")
 if os.getenv("UMS001_REDUX_R03_PREPAID_GATE")!="OWNER_APPROVED_PREPAID_20261111":deny("BILLING_GATE_UNVERIFIED")
 order=json.loads(ORDER.read_text());ref=json.loads(REF.read_text());prompt,raw64=validate(order,ref)
 token=os.getenv("REPLICATE_API_TOKEN","");gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not token.startswith("r8_") or len(token)<20 or not gh:deny("CREDENTIAL_MISSING")
 acct,account,_=base.http_json(API+"account",token=token,timeout=15)
 mod,model,_=base.http_json(API+"models/"+MODEL,token=token,timeout=15)
 if acct!=200 or account.get("type") not in ("user","organization") or mod!=200 or model.get("name")!="flux-1.1-pro-ultra":deny("AUTH_OR_MODEL_NOT_READY")
 receipt={"request_id":order["request_id"],"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
  "slide_id":"S00","model_id":MODEL,"provider":"replicate","reference_source":"ChatGPT_APPROVED_TOP_CROP","reference_sha256":ref["source_sha256"],
  "reference_strength":0.38,"raw_mode":False,"prompt_sha256":hashlib.sha256(prompt.encode()).hexdigest(),
  "prediction_id":None,"estimated_cost_usd":0.06,"status":"PREPARED","publication_approved":False,"qa_status":"PENDING"}
 keep(receipt)
 try:path,sha=base.reserve_once(gh,{"request_id":order["request_id"]})
 except Exception:deny("DUPLICATE_OR_LEDGER_BLOCK")
 receipt["status"]="RESERVED_ONCE";keep(receipt)
 input_data={"prompt":prompt,"aspect_ratio":"4:5","raw":False,
   "image_prompt":"data:image/jpeg;base64,"+raw64,"image_prompt_strength":0.38,
   "output_format":"jpg","safety_tolerance":2}
 try:status,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
   data={"input":input_data},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
 except Exception:deny("POST_UNCERTAIN_NO_RETRY")
 if status not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):deny("PROVIDER_REJECTED_OR_UNCERTAIN_"+str(status))
 receipt["status"]="SUBMITTED";receipt["prediction_id"]=pred["id"];keep(receipt)
 base.update_receipt(gh,path,sha,receipt)
 for _ in range(15):
  if pred.get("status") in ("succeeded","failed","canceled"):break
  time.sleep(3)
  code,pred,_=base.http_json(API+"predictions/"+receipt["prediction_id"],token=token,timeout=20)
  if code!=200:deny("POLL_FAILED_NO_RETRY")
 if pred.get("status")!="succeeded":deny("PREDICTION_NOT_SUCCESSFUL_NO_RETRY")
 url=pred.get("output")
 if isinstance(url,list):url=url[0] if url else None
 if not isinstance(url,str):deny("NO_MEDIA_URL")
 u=urllib.parse.urlparse(url)
 if u.scheme!="https" or (u.hostname!="replicate.delivery" and not (u.hostname or "").endswith(".replicate.delivery")) or u.username or u.password or u.fragment:deny("URL_NOT_TRUSTED")
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS001-R03"}),timeout=30) as f:
  last=urllib.parse.urlparse(f.geturl())
  if last.scheme!="https" or (last.hostname!="replicate.delivery" and not (last.hostname or "").endswith(".replicate.delivery")):deny("UNTRUSTED_REDIRECT")
  raw=f.read(12_000_001)
 if len(raw)<1024 or len(raw)>12_000_000 or raw[:3]!=b"\xff\xd8\xff":deny("OUTPUT_INVALID")
 filename="IGC-2026-01-S00_REPLICATE_REDUX_R03_RAW.jpg";(OUT/filename).write_bytes(raw)
 receipt.update(status="IMAGE_DOWNLOADED_QA_PENDING",asset_sha256=hashlib.sha256(raw).hexdigest(),asset_bytes=len(raw),filename=filename)
 keep(receipt)
 print("CEREBRO_REDUX_R03=REAL_IMAGE_DOWNLOADED_QA_PENDING")
 print("CEREBRO_REDUX_R03=NO_AUTO_PUBLICATION")
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e) if str(e).startswith("UMS001_REDUX_R03_") else "UMS001_REDUX_R03_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
  sys.exit(2)
