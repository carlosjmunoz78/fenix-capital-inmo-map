#!/usr/bin/env python3
"""UMS-001 isolated GitHub LAB: exactly ONE paid Replicate cover canary, fail-closed.
Never pass user references into provider as URLs. No social API/publishing. No retry.
"""
import base64,hashlib,importlib.util,json,os,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("replicate_base", HERE/"replicate-one-shot-canary-lab-20261111.py")
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
MODEL=base.MODEL
BRANCH=base.BRANCH
REPO=base.REPO
API=base.API
ORDER=os.environ.get("UMS001_IGC202601_ORDER_FILE","cerebro/media-studio/v2/requests/UMS001_IGC202601_CANARY_AUTHORIZED_V1.json")
BRIEF="cerebro/media-studio/v2/requests/UMS001_IGC202601_LEARNING_REFERENCE_V1.json"
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202601-canary"
def stop(msg): raise RuntimeError("IGC202601_CANARY_"+msg)
def receipt(data):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"receipt.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def verified_request(request,brief):
 allowed={"cerebro/media-studio/v2/requests/UMS001_IGC202601_CANARY_AUTHORIZED_V1.json":"UMS001-IGC202601-CANARY-S00-20261111",
          "cerebro/media-studio/v2/requests/UMS001_IGC202601_CANARY_AUTHORIZED_R02.json":"UMS001-IGC202601-CANARY-S00-R02-20261111"}
 if ORDER not in allowed:stop("ORDER_PATH_NOT_ALLOWLISTED")
 expected={"request_id":allowed[ORDER],"company_id":"fenix","engine_id":"UMS-001",
  "environment":"LAB","content_id":"IGC-2026-01","concept_id":"IGC-2026-01-S00",
  "model_id":MODEL,"max_predictions":1,"max_cost_usd":0.06,"budget":"EXISTING_PREPAID_ONLY",
  "publish":False,"approval_state":"EXPLICIT_OWNER_TEST_ONLY"}
 if request!=expected:stop("REQUEST_POLICY_DENIED")
 if brief.get("company_id")!="fenix" or brief.get("engine_id")!="UMS-001" or brief.get("environment")!="LAB":stop("BRIEF_SCOPE")
 if brief.get("source_generated_by")!="CHATGPT" or len(brief.get("images",[]))!=6:stop("REFERENCE_DATA_INVALID")
 row=brief["images"][0]
 if row.get("id")!=expected["concept_id"]:stop("FIRST_SLIDE_MISMATCH")
 if ORDER.endswith("_R02.json") and row.get("prompt_revision")!="R02_AFTER_CANARY_QA_FAIL":stop("CORRECTION_EVIDENCE_REQUIRED")
 prompt=row.get("prompt","")
 if not (700<=len(prompt)<=4500) or "SURREAL" not in prompt.upper() or "PHOTOGRAPH" not in prompt.upper() or "no text" not in prompt.lower():stop("PROMPT_NOT_SAFE")
 return prompt,expected
def main():
 if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:stop("RUNNER_SCOPE_DENIED")
 if os.getenv("UMS001_IGC202601_CANARY_PREPAID_GATE")!="OWNER_APPROVED_PREPAID_20261111":stop("BILLING_GATE_DENIED")
 req=json.loads(Path(ORDER).read_text(encoding="utf-8"));brief=json.loads(Path(BRIEF).read_text(encoding="utf-8"))
 prompt,scope=verified_request(req,brief)
 tok=os.getenv("REPLICATE_API_TOKEN","")
 gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not tok.startswith("r8_") or len(tok)<20 or not gh:stop("TOKEN_MISSING")
 account_status,account,_=base.http_json(API+"account",token=tok,timeout=15)
 model_status,model,_=base.http_json(API+"models/"+MODEL,token=tok,timeout=15)
 if account_status!=200 or account.get("type") not in ("user","organization") or model_status!=200 or model.get("name")!="flux-1.1-pro-ultra":stop("AUTH_OR_MODEL_FAIL")
 rec={"request_id":scope["request_id"],"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","source_reference_generator":"ChatGPT","provider":"replicate",
  "content_id":"IGC-2026-01","slide_id":"S00","prompt_sha256":hashlib.sha256(prompt.encode()).hexdigest(),"status":"CHECKED_NO_POST",
  "prediction_id":None,"estimated_cost_usd":0.06,"asset_sha256":None,"publication_approved":False,
  "artistic_qa":"PENDING","official_logo_added":False}
 receipt(rec)
 try:reserve_path,reserve_sha=base.reserve_once(gh,{"request_id":scope["request_id"]})
 except Exception:stop("EXCLUSIVE_RESERVATION_DENIED")
 rec["status"]="RESERVED_ONCE";receipt(rec)
 try:
  status,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=tok,
   data={"input":{"prompt":prompt,"aspect_ratio":"4:5","raw":True,"output_format":"jpg","safety_tolerance":2}},
   headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
 except Exception:stop("POST_UNKNOWN_NO_RETRY")
 if status not in (200,201) or not re.fullmatch(r"[a-z0-9]{8,80}",str(pred.get("id",""))):stop("POST_NOT_CONFIRMED_NO_RETRY")
 rec["prediction_id"]=pred["id"];rec["status"]="SUBMITTED";receipt(rec)
 base.update_receipt(gh,reserve_path,reserve_sha,rec)
 for _ in range(15):
  if pred.get("status") in ("succeeded","failed","canceled"):break
  time.sleep(3)
  code,pred,_=base.http_json(API+"predictions/"+rec["prediction_id"],token=tok,timeout=20)
  if code!=200:stop("POLL_FAILED_RECONCILE")
 if pred.get("status")!="succeeded":stop("PREDICTION_NOT_SUCCEEDED_NO_RETRY")
 url=pred.get("output")
 if isinstance(url,list):url=url[0] if url else None
 if not isinstance(url,str):stop("MISSING_OUTPUT")
 parsed=urllib.parse.urlparse(url)
 if parsed.scheme!="https" or (parsed.hostname!="replicate.delivery" and not (parsed.hostname or "").endswith(".replicate.delivery")) or parsed.username or parsed.password or parsed.fragment:stop("UNTRUSTED_MEDIA_URL")
 request=urllib.request.Request(url,headers={"User-Agent":"CEREBRO-UMS001/IGC202601"})
 with urllib.request.urlopen(request,timeout=30) as resp:
  final=urllib.parse.urlparse(resp.geturl())
  if final.scheme!="https" or (final.hostname!="replicate.delivery" and not (final.hostname or "").endswith(".replicate.delivery")):stop("UNSAFE_REDIRECT")
  data=resp.read(12_000_001)
 if len(data)<1024 or len(data)>12_000_000 or data[:3]!=bytes([255,216,255]):stop("INVALID_OUTPUT_JPEG")
 filename="IGC-2026-01-S00_REPLICATE_ULTRA_RAW.jpg"
 (OUT/filename).write_bytes(data)
 rec.update(status="IMAGE_DOWNLOADED_AWAITING_QA",asset_sha256=hashlib.sha256(data).hexdigest(),asset_bytes=len(data),filename=filename)
 receipt(rec)
 print("IGC202601=ONE_REAL_REPLICATE_COVER_IMAGE_DOWNLOADED_AWAITING_QA")
 print("IGC202601=NO_PUBLICATION_NO_RETRY")
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e) if str(e).startswith("IGC202601_CANARY_") else "IGC202601_CANARY_BLOCKED_RECONCILE",file=sys.stderr)
  sys.exit(2)
