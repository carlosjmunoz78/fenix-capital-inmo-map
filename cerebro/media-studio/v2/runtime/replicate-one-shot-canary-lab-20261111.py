#!/usr/bin/env python3
"""One-shot LAB-only FLUX Ultra prepaid canary. No retry, PROD, publishing or key disclosure.
A GitHub branch-scoped idempotent reservation is created before the first paid POST.
All outputs are temporary GitHub Actions artifacts and MUST be imported to private Drive.
"""
import base64,hashlib,json,os,re,sys,time,urllib.error,urllib.parse,urllib.request
from pathlib import Path
MODEL="black-forest-labs/flux-1.1-pro-ultra"
BRANCH="cerebro/ums-replicate-flux-paid-lab-v0-20261108"
REPO="carlosjmunoz78/fenix-capital-inmo-map"
REQUEST_PATH=os.environ.get("UMS001_CANARY_REQUEST_FILE","cerebro/media-studio/v2/requests/REPLICATE_CANARY_ONE_SHOT_20261111.json")
BATCH_PATH="cerebro/media-studio/v2/requests/UMS001_REPLICATE_4_ART_IMAGES_LAB_20261111.json"
API="https://api.replicate.com/v1/"
OUT=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"ums001-replicate-canary"
def fail(code): raise RuntimeError("UMS001_CANARY_"+code)
def http_json(url,method="GET",token=None,data=None,headers=None,timeout=25):
    h={"Accept":"application/json","User-Agent":"UMS001-LAB-CANARY-1/20261111"}
    if token: h["Authorization"]="Bearer "+token
    if data is not None: h["Content-Type"]="application/json"
    if headers:h.update(headers)
    req=urllib.request.Request(url,method=method,headers=h,
        data=json.dumps(data).encode("utf-8") if data is not None else None)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as resp:
            return resp.status,json.loads(resp.read(500000)),dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code,{},{}
def reserve_once(gh_token,reference):
    path="cerebro/media-studio/v2/finops/lab-reservations/"+reference["request_id"]+".json"
    url="https://api.github.com/repos/"+REPO+"/contents/"+path
    reservation={
        "request_id":reference["request_id"],"company_id":"fenix","engine_id":"UMS-001",
        "environment":"LAB","status":"RESERVED_NO_RETRY",
        "model":MODEL,"max_predictions":1,"estimated_usd":0.06,
        "billing_source":"EXISTING_PREPAID_CREDIT_CONFIRMED_2026_11_11",
        "auto_reload":"DISABLED_CONFIRMED_2026_11_11",
        "run_id":os.environ.get("GITHUB_RUN_ID",""),"publication_approved":False}
    body={"message":"finops(ums001): reserve one-time $0.06 prepaid LAB image canary",
          "branch":BRANCH,"content":base64.b64encode(json.dumps(reservation,indent=2).encode()).decode()}
    status,ans,_=http_json(url,"PUT",gh_token,body,timeout=15)
    if status!=201 or not ans.get("content",{}).get("sha"):
        fail("DUPLICATE_OR_RESERVATION_NOT_ATOMIC")
    return path,ans["content"]["sha"]
def update_receipt(gh_token,path,blob_sha,data):
    url="https://api.github.com/repos/"+REPO+"/contents/"+path
    body={"message":"finops(ums001): record one-shot Replicate canary state",
        "branch":BRANCH,"sha":blob_sha,
        "content":base64.b64encode(json.dumps(data,indent=2).encode()).decode()}
    status,ans,_=http_json(url,"PUT",gh_token,body,timeout=15)
    return status==200
def save_manifest(manifest):
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"receipt.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
def main():
    request=json.loads(Path(REQUEST_PATH).read_text())
    batch=json.loads(Path(BATCH_PATH).read_text())
    if os.getenv("GITHUB_REPOSITORY")!=REPO or os.getenv("GITHUB_HEAD_REF")!=BRANCH:fail("BRANCH_SCOPE_DENIED")
    allowed_req_files={
       "cerebro/media-studio/v2/requests/REPLICATE_CANARY_ONE_SHOT_20261111.json":"UMS001-REPLICATE-CANARY-20261111-A1",
       "cerebro/media-studio/v2/requests/REPLICATE_CANARY_ONE_SHOT_20261111_A2.json":"UMS001-REPLICATE-CANARY-20261111-A2"}
    if REQUEST_PATH not in allowed_req_files:fail("REQUEST_FILE_NOT_ALLOWLISTED")
    allowed_fields={"source_request_id":"UMS001-REPLICATE-IMAGE-BATCH-20261111-01",
       "concept_id":"UMS-CRE-1111-A","environment":"LAB","company_id":"fenix","engine_id":"UMS-001",
       "model_id":MODEL,"max_provider_spend_usd":0.06,"paid_execution_scope":"EXISTING_PREPAID_ONLY","publish":False}
    expected={**allowed_fields,"request_id":allowed_req_files[REQUEST_PATH]}
    if expected["request_id"].endswith("A2"):
       p=request.get("prompt_override")
       if not isinstance(p,str) or not 400<=len(p)<=2200 or "photograph" not in p.lower() or "surreal" not in p.lower():fail("A2_PROMPT_INVALID")
       expected["prompt_override"]=p
    if request!=expected:fail("CANARY_SCOPE_DENIED")
    if batch.get("run_mode")!="DRY_RUN" or batch.get("model_id")!=MODEL or batch.get("max_additional_cost_eur")!=0:fail("BATCH_POLICY_DENIED")
    prompt=request.get("prompt_override") or batch["concepts"][0]["prompt"]
    if batch["concepts"][0]["concept_id"]!=request["concept_id"] or not 250<=len(prompt)<=5000:fail("CONCEPT_DENIED")
    token=os.environ.get("REPLICATE_API_TOKEN","")
    gh=os.environ.get("GH_TOKEN_FOR_LAB","")
    if not token.startswith("r8_") or len(token)<20 or not gh:fail("SECURE_CREDENTIALS_MISSING")
    acct,account,_=http_json(API+"account",token=token,timeout=15)
    mod,model,_=http_json(API+"models/"+MODEL,token=token,timeout=15)
    if acct!=200 or account.get("type") not in ("user","organization") or mod!=200 or model.get("name")!="flux-1.1-pro-ultra":
        fail("AUTH_OR_MODEL_NOT_READY")
    if os.environ.get("UMS001_ONE_SHOT_PREPAID_GATE")!="CONFIRMED_20261111_ONLY":fail("BILLING_GATE_NOT_VERIFIED")
    receipt={"request_id":request["request_id"],"concept_id":request["concept_id"],
      "model_id":MODEL,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
      "provider":"replicate","max_provider_spend_usd":0.06,"status":"PREPARING",
      "publication_approved":False,"qa_human_realism":"PENDING",
      "private_drive_persistence":"PENDING_TRANSFER","paid_prediction_count":0}
    save_manifest(receipt)
    path,sha=reserve_once(gh,request)  # durable exclusive write BEFORE any paid call
    receipt["status"]="RESERVED";save_manifest(receipt)
    inp={"prompt":prompt,"aspect_ratio":"4:5","raw":True,
      "output_format":"jpg","safety_tolerance":2}
    try:
       code,pred,_=http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
           data={"input":inp},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
    except Exception:
       fail("POST_OUTCOME_UNCERTAIN_NO_RETRY")
    if code not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):
       fail("POST_RESPONSE_UNCERTAIN_NO_RETRY")
    receipt["prediction_id"]=pred["id"];receipt["paid_prediction_count"]=1
    receipt["status"]="SUBMITTED";save_manifest(receipt)
    update_receipt(gh,path,sha,receipt)  # best effort: reservation already immutable if update fails
    for attempt in range(14):
       if pred.get("status") in ("succeeded","failed","canceled"):break
       time.sleep(3)
       code,pred,_=http_json(API+"predictions/"+receipt["prediction_id"],token=token,timeout=20)
       if code!=200:fail("PREDICTION_UNCERTAIN_NO_RETRY")
    if pred.get("status")!="succeeded":fail("PREDICTION_NOT_READY_OR_FAILED_NO_RETRY")
    src=pred.get("output")
    if isinstance(src,list):src=src[0] if src else None
    if not isinstance(src,str):fail("OUTPUT_MISSING")
    parsed=urllib.parse.urlparse(src)
    if parsed.scheme!="https" or parsed.hostname not in ("replicate.delivery",) and not (parsed.hostname or "").endswith(".replicate.delivery"):
       fail("UNTRUSTED_OUTPUT_URL")
    if parsed.username or parsed.password or parsed.fragment:fail("BAD_OUTPUT_URI")
    req=urllib.request.Request(src,headers={"User-Agent":"UMS001-LAB/1.0"})
    with urllib.request.urlopen(req,timeout=30) as resp:
        final=urllib.parse.urlparse(resp.geturl())
        if final.scheme!="https" or (final.hostname!="replicate.delivery" and not (final.hostname or "").endswith(".replicate.delivery")):
            fail("OUTPUT_REDIRECT_DENIED")
        raw=resp.read(12_000_001)
    if len(raw)>12_000_000 or len(raw)<1024 or raw[:3]!=b"\xff\xd8\xff":fail("INVALID_JPEG_OUTPUT")
    (OUT/"UMS-CRE-1111-A_REPLICATE_ULTRA_RAW.jpg").write_bytes(raw)
    receipt.update({"status":"IMAGE_DOWNLOADED_QA_PENDING","sha256":hashlib.sha256(raw).hexdigest(),
        "bytes":len(raw),"prompt_sha256":hashlib.sha256(prompt.encode()).hexdigest(),
        "private_drive_persistence":"PENDING_TRANSFER","publication_approved":False})
    save_manifest(receipt)
    print("UMS001_CANARY=IMAGE_DOWNLOADED_QA_PENDING")
    print("UMS001_CANARY_PROVIDER=replicate")
    print("UMS001_CANARY_PREDICTIONS_SUBMITTED=1")
    print("UMS001_CANARY_COST_UPPER_BOUND_USD=0.06")
if __name__=="__main__":
  try:main()
  except Exception as e:
    OUT.mkdir(parents=True,exist_ok=True)
    print(str(e) if str(e).startswith("UMS001_CANARY_") else "UMS001_CANARY_BLOCKED_RECONCILE",file=sys.stderr)
    sys.exit(2)
