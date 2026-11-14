#!/usr/bin/env python3
"""UMS001 LAB only: exactly three other photoreal surreal image candidates via prepaid FLUX Ultra.
Runs once per immutable request_id with durable GitHub reservation, strict $0.18 plan,
no retries, no public publishing. Results saved to short-lived Actions artifacts then Drive.
"""
import base64,hashlib,importlib.util,json,os,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("canary_util",HERE/"replicate-one-shot-canary-lab-20261111.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
MODEL=mod.MODEL;API=mod.API;BRANCH=mod.BRANCH;REPO=mod.REPO;fail=mod.fail;http_json=mod.http_json
REQUEST="cerebro/media-studio/v2/requests/REPLICATE_BCD_PREPAID_THREE_20261111.json"
BATCH=mod.BATCH_PATH
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-replicate-bcd"
def receipt_save(r):
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"batch_receipt.json").write_text(json.dumps(r,indent=2,ensure_ascii=False)+"\n")
def github_write(token,path,data,msg,sha=None):
    payload={"branch":BRANCH,"message":msg,"content":base64.b64encode(json.dumps(data,indent=2).encode()).decode()}
    if sha:payload["sha"]=sha
    code,out,_=http_json("https://api.github.com/repos/"+REPO+"/contents/"+path,"PUT",token,payload,timeout=20)
    expect=200 if sha else 201
    if code!=expect or not out.get("content",{}).get("sha"):return None
    return out["content"]["sha"]
def download_image(url):
    u=urllib.parse.urlparse(url)
    if u.scheme!="https" or (u.hostname!="replicate.delivery" and not (u.hostname or "").endswith(".replicate.delivery")):fail("BAD_IMAGE_DOMAIN")
    if u.username or u.password or u.fragment:fail("BAD_IMAGE_URI")
    req=urllib.request.Request(url,headers={"User-Agent":"UMS001-LAB-BATCH/1.0"})
    with urllib.request.urlopen(req,timeout=35) as response:
        final=urllib.parse.urlparse(response.geturl())
        if final.scheme!="https" or (final.hostname!="replicate.delivery" and not (final.hostname or "").endswith(".replicate.delivery")):fail("OUTPUT_REDIRECT_DENIED")
        data=response.read(12_000_001)
    if len(data)<1024 or len(data)>12_000_000 or data[:3]!=b"\xff\xd8\xff":fail("BAD_IMAGE_BYTES")
    return data
def main():
    if os.getenv("GITHUB_REPOSITORY")!=REPO or os.getenv("GITHUB_HEAD_REF")!=BRANCH:fail("BRANCH_DENIED")
    if os.getenv("UMS001_BCD_PREPAID_GATE")!="CONFIRMED_20261111_ONLY":fail("PREPAID_GATE_DENIED")
    order=json.loads(Path(REQUEST).read_text(encoding="utf-8"))
    batch=json.loads(Path(BATCH).read_text(encoding="utf-8"))
    fixed={"request_id":"UMS001-REPLICATE-BATCH-BCD-20261111-01","company_id":"fenix",
           "engine_id":"UMS-001","environment":"LAB","model_id":MODEL,
           "max_predictions":3,"max_provider_spend_usd":0.18,"publish":False,
           "paid_execution_scope":"EXISTING_PREPAID_ONLY"}
    prompts=order.get("concept_prompts")
    if not isinstance(prompts,dict) or set(prompts)!={"UMS-CRE-1111-B","UMS-CRE-1111-C","UMS-CRE-1111-D"}:fail("PROMPT_IDS_DENIED")
    if {k:v for k,v in order.items() if k!="concept_prompts"} != fixed:fail("ORDER_DENIED")
    if batch.get("company_id")!="fenix" or batch.get("engine_id")!="UMS-001" or batch.get("environment")!="LAB" or batch.get("model_id")!=MODEL or batch.get("run_mode")!="DRY_RUN" or batch.get("publish") is not False:fail("BATCH_POLICY_DENIED")
    for cid,p in prompts.items():
        if not isinstance(p,str) or not 550<=len(p)<=3000 or "photograph" not in p.lower() or "surreal" not in p.lower():
            fail("PROMPT_NOT_PHOTOREAL_SURREAL_"+cid)
    tok=os.getenv("REPLICATE_API_TOKEN","");gh=os.getenv("GH_TOKEN_FOR_LAB","")
    if not tok.startswith("r8_") or len(tok)<20 or not gh:fail("SECURE_TOKEN_MISSING")
    code,account,_=http_json(API+"account",token=tok,timeout=15)
    model_code,model,_=http_json(API+"models/"+MODEL,token=tok,timeout=15)
    if code!=200 or account.get("type") not in ("user","organization") or model_code!=200 or model.get("name")!="flux-1.1-pro-ultra":fail("PROVIDER_NOT_READY")
    manifest={"request_id":fixed["request_id"],"company_id":"fenix","engine_id":"UMS-001",
       "environment":"LAB","provider":"replicate","model_id":MODEL,"cost_cap_usd":0.18,
       "predictions_submitted":0,"publication_approved":False,
       "status":"PREPARING","qa_human_realism":"PENDING","drive_persistence":"PENDING_TRANSFER","outputs":[]}
    receipt_save(manifest)
    path="cerebro/media-studio/v2/finops/lab-reservations/"+fixed["request_id"]+".json"
    reservation={"request_id":fixed["request_id"],"company_id":"fenix","environment":"LAB",
       "status":"RESERVED_NO_RETRY","provider":"replicate","model_id":MODEL,
       "max_predictions":3,"estimated_spend_usd":0.18,
       "auto_reload":"DISABLED_CONFIRMED_2026_11_11",
       "billing_source":"EXISTING_PREPAID_CREDIT_CONFIRMED_2026_11_11",
       "run_id":os.getenv("GITHUB_RUN_ID",""),"publication_approved":False}
    content_sha=github_write(gh,path,reservation,"finops(ums001): reserve 3x$0.06 prepaid LAB image outputs")
    if not content_sha:fail("RESERVATION_DUPLICATE_OR_NOT_ATOMIC")
    manifest["status"]="RESERVED";receipt_save(manifest)
    for cid in ("UMS-CRE-1111-B","UMS-CRE-1111-C","UMS-CRE-1111-D"):
        inp={"prompt":prompts[cid],"aspect_ratio":"4:5","raw":True,"output_format":"jpg","safety_tolerance":2}
        try:
            status,pred,_=http_json(API+"models/"+MODEL+"/predictions","POST",token=tok,
                data={"input":inp},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
        except Exception:fail("POST_UNCERTAIN_NO_RETRY_"+cid)
        if status not in (200,201) or not re.fullmatch(r"[a-z0-9]{8,80}",str(pred.get("id",""))):
            fail("PROVIDER_RESPONSE_UNCERTAIN_NO_RETRY_"+cid)
        manifest["predictions_submitted"]+=1
        item={"concept_id":cid,"prediction_id":pred["id"],"status":"SUBMITTED",
              "estimated_cost_usd":0.06,"publication_approved":False}
        manifest["outputs"].append(item);manifest["status"]="RUNNING";receipt_save(manifest)
        updated=github_write(gh,path,manifest,"finops(ums001): record Replicate prediction for "+cid,sha=content_sha)
        if updated:content_sha=updated
        for i in range(15):
            if pred.get("status") in ("succeeded","failed","canceled"):break
            time.sleep(3)
            status,pred,_=http_json(API+"predictions/"+item["prediction_id"],token=tok,timeout=20)
            if status!=200:fail("POLL_UNCERTAIN_NO_RETRY_"+cid)
        if pred.get("status")!="succeeded":fail("PREDICTION_NOT_READY_NO_RETRY_"+cid)
        url=pred.get("output")
        if isinstance(url,list):url=url[0] if url else None
        if not isinstance(url,str):fail("NO_OUTPUT_URL_"+cid)
        img=download_image(url)
        filename=cid+"_REPLICATE_ULTRA_RAW.jpg"
        (OUT/filename).write_bytes(img)
        item.update({"status":"IMAGE_DOWNLOADED_QA_PENDING",
            "sha256":hashlib.sha256(img).hexdigest(),"prompt_sha256":hashlib.sha256(prompts[cid].encode()).hexdigest(),
            "bytes":len(img),"filename":filename})
        receipt_save(manifest)
    manifest["status"]="THREE_IMAGES_DOWNLOADED_QA_PENDING";receipt_save(manifest)
    print("UMS001_BCD=THREE_IMAGES_DOWNLOADED_QA_PENDING")
    print("UMS001_PROVIDER=replicate")
    print("UMS001_PREPAID_USAGE_USD_ESTIMATE=0.18")
    print("UMS001_PUBLICATION=OFF")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print(str(e) if str(e).startswith("UMS001_CANARY_") else "UMS001_BCD_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
        sys.exit(2)
