#!/usr/bin/env python3
"""UMS-001, one-time LAB physical image/video acceptance; never publishes, never retries paid predictions."""
import hashlib, json, mimetypes, os, pathlib, sys, time, urllib.error, urllib.parse, urllib.request, zipfile
OUT = pathlib.Path(os.environ.get("UMS_PILOT_OUTPUT", "/tmp/ums001-igfb-physical-batch"))
OUT.mkdir(parents=True, exist_ok=True)
ROOT = pathlib.Path(__file__).resolve().parents[4]
ORDER_PATH = ROOT / "cerebro/media-studio/v2/orders/igfb-first-physical-batch-20261108.json"
ORDERS = json.loads(ORDER_PATH.read_text())
ALLOW = {"black-forest-labs/flux-1.1-pro": 0.04, "prunaai/p-video-2-pro": 0.095}
CAP = 0.65
ALLOWED = {"replicate.delivery", "replicate.com"}
TOKEN = os.environ.get("REPLICATE_API_TOKEN", "").strip()
status = {"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","batch_id":ORDERS["batch_id"],"state":"STARTED","predictions":[],"estimated_cost_reserved_usd":0.0,"money_limit_usd":CAP,"publish_enabled":False,"real_assets_verified":False,"error_code":None}
def store_status():
    (OUT / "status.json").write_text(json.dumps(status, indent=2, ensure_ascii=False)+"\n")
def reject(code):
    status["state"]="BLOCKED";status["error_code"]=code;store_status();raise RuntimeError(code)
def request_json(url, method="GET", obj=None, timeout=40):
    payload=None if obj is None else json.dumps(obj).encode()
    headers={"Authorization":"Bearer "+TOKEN,"Accept":"application/json","User-Agent":"UMS001-one-shot-physical-lab/2026-11"}
    if payload is not None:headers["Content-Type"]="application/json"
    req=urllib.request.Request(url,data=payload,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as resp:
            if resp.status<200 or resp.status>299:reject("REPLICATE_HTTP_NOT_SUCCESS")
            return json.loads(resp.read(2_000_000))
    except urllib.error.HTTPError as err:
        reject("REPLICATE_HTTP_"+str(err.code))
    except (TimeoutError, OSError, ValueError):
        reject("REPLICATE_UNCERTAIN_NETWORK_OR_PARSE_NO_RETRY")
def safe_output_url(url):
    try:
        p=urllib.parse.urlparse(url)
        if p.scheme!="https" or not p.hostname or not (p.hostname in ALLOWED or p.hostname.endswith(".replicate.delivery") or p.hostname.endswith(".replicate.com")):reject("REPLICATE_OUTPUT_HOST_DENIED")
        return url
    except Exception:reject("REPLICATE_OUTPUT_URL_INVALID")
def get_file(url, path, mime):
    safe_output_url(url)
    req=urllib.request.Request(url,headers={"User-Agent":"UMS001-one-shot-output-ingest"})
    try:
        with urllib.request.urlopen(req,timeout=90) as r, open(path,"wb") as w:
            total=0
            while 1:
                chunk=r.read(262144)
                if not chunk:break
                total+=len(chunk)
                if total>35_000_000:reject("REPLICATE_MEDIA_TOO_LARGE")
                w.write(chunk)
    except (OSError,urllib.error.HTTPError):reject("REPLICATE_MEDIA_DOWNLOAD_FAILED")
    data=path.read_bytes()
    if not data or len(data)<4096:reject("REPLICATE_MEDIA_EMPTY")
    if mime=="video/mp4" and not (data[4:8]==b"ftyp"):reject("REPLICATE_MEDIA_NOT_MP4")
    if mime.startswith("image/") and not (data[:8]==b"\x89PNG\r\n\x1a\n" or data[:4]==b"RIFF" or data[:3]==b"\xff\xd8\xff"):reject("REPLICATE_MEDIA_NOT_IMAGE")
    return {"filename":path.name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"mime":mime}
def create_prediction(order,input_dict):
    model=order["model"]
    if model not in ALLOW:reject("MODEL_NOT_ALLOWLISTED")
    estimate=float(order["estimated_cost_usd"])
    if estimate<0 or status["estimated_cost_reserved_usd"]+estimate>CAP:reject("MONEY_LIMIT")
    if order["type"]=="IMAGE" and estimate!=0.04:reject("IMAGE_PRICE_PLAN_MISMATCH")
    if order["type"]=="VIDEO" and (order["mode"]!="quality" or order["resolution"]!="1080p" or order["duration"]!=5 or estimate!=0.475):reject("VIDEO_PRICE_PLAN_MISMATCH")
    status["estimated_cost_reserved_usd"]=round(status["estimated_cost_reserved_usd"]+estimate,4)
    store_status()
    data=request_json("https://api.replicate.com/v1/models/"+model+"/predictions",method="POST",obj={"input":input_dict},timeout=75)
    predid=data.get("id")
    if not predid or not isinstance(predid,str):reject("REPLICATE_NO_PREDICTION_ID_NO_RETRY")
    record={"job_id":order["id"],"model":model,"prediction_id":predid,"estimate_usd":estimate,"result":"SUBMITTED"}
    status["predictions"].append(record);store_status()
    until=time.monotonic()+570
    while data.get("status") not in ("succeeded","failed","canceled"):
        if time.monotonic()>until:reject("REPLICATE_PREDICTION_WAIT_EXPIRED_NO_RETRY")
        time.sleep(8)
        data=request_json("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(predid,safe=""),timeout=40)
    if data.get("status")!="succeeded":reject("REPLICATE_PREDICTION_"+str(data.get("status","UNKNOWN")).upper())
    output=data.get("output")
    if isinstance(output,list):output=output[0] if output else None
    if not isinstance(output,str):reject("REPLICATE_NO_OUTPUT_URL")
    record["result"]="SUCCEEDED_NOT_YET_PERSISTED";store_status()
    return output,record
def main():
    if os.environ.get("GITHUB_RUN_ATTEMPT")!="1" or os.environ.get("UMS_PILOT_ONE_SHOT")!="yes":
        reject("EXECUTION_CONTEXT_NOT_ONESHOT")
    if not TOKEN or len(TOKEN)<16:reject("REPLICATE_SECRET_NOT_PRESENT")
    if ORDERS["environment"]!="LAB" or ORDERS["publication"]!="DISABLED":reject("LAB_FAIL_CLOSED")
    if abs(sum(float(x["estimated_cost_usd"]) for x in ORDERS["creative_briefs"])-0.555)>0.00001:reject("MANIFEST_COST_NOT_EXPECTED")
    if ORDERS["budget"]["max_total_usd"]!=CAP:reject("BUDGET_MANIFEST_MISMATCH")
    for x in ORDERS["creative_briefs"]:
        if x["model"] not in ALLOW:reject("UNEXPECTED_PROVIDER")
    print("UMS001_BATCH_PLAN_VALID; max_total_usd=0.65; paid_generations=3; no_retries; no_publish")
    images={}
    for i,o in enumerate(ORDERS["creative_briefs"]):
        if o["type"]=="IMAGE":
            url,record=create_prediction(o,{"prompt":o["prompt"],"aspect_ratio":"9:16","output_format":"webp","output_quality":95})
            p=OUT / (o["id"]+".webp")
            meta=get_file(url,p,"image/webp")
            record["asset"]=meta;record["result"]="PERSISTED_AND_HASHED";images[o["id"]]=url;store_status()
        elif o["type"]=="VIDEO":
            image=images.get(o["reference_job"])
            if not image:reject("FIRST_FRAME_NOT_PERSISTED")
            url,record=create_prediction(o,{"prompt":o["prompt"],"mode":"quality","duration":5,"resolution":"1080p","aspect_ratio":"9:16","image":image,"prompt_upsampler":"turbo","enable_safety_filter":True})
            p=OUT / (o["id"]+".mp4")
            meta=get_file(url,p,"video/mp4")
            record["asset"]=meta;record["result"]="PERSISTED_AND_HASHED";store_status()
    status["state"]="LAB_PHYSICAL_GENERATION_SUCCEEDED_AWAITING_VISUAL_QA"
    status["real_assets_verified"]=True
    store_status()
    (OUT/"orders.json").write_text(json.dumps(ORDERS,ensure_ascii=False,indent=2)+"\n")
    print("UMS001_PILOT_GENERATED_PERSISTED; images=2; video_clips=1; max_estimated_spend_usd=0.555; no_social_publication")
if __name__=="__main__":
    try:main()
    except Exception:
        if status["state"]!="BLOCKED":status["state"]="BLOCKED";status["error_code"]="PILOT_RUNTIME_EXCEPTION";store_status()
        print("UMS001_PILOT_BLOCKED: "+str(status.get("error_code") or "UNKNOWN"))
        sys.exit(1)
