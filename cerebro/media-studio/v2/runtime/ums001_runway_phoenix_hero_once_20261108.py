#!/usr/bin/env python3
"""UMS-001 Runway Gen-4.5 one-shot motion study; three chargeable predictions max, no retry, no auto-publish."""
import hashlib,json,os,pathlib,sys,time,urllib.error,urllib.parse,urllib.request,subprocess
BASE=pathlib.Path(__file__).resolve().parents[1]
M=json.loads((BASE/"orders/runway-gen45-andalucia-phoenix-hero-20261108.json").read_text(encoding="utf-8"))
OUT=pathlib.Path(os.getenv("UMS_RUNWAY_OUT","/tmp/ums-runway-phoenix-hero"))
OUT.mkdir(parents=True,exist_ok=True)
TOKEN=os.environ.get("REPLICATE_API_TOKEN","")
spent=0.0
status={"environment":"LAB","state":"INITIALIZED","model":"runwayml/gen-4.5","amount_reserved_usd":0,"prediction_ids":[],"assets":[],"autopublish":False,"error":None}
def persist():
    (OUT/"run-status.json").write_text(json.dumps(status,ensure_ascii=False,indent=2)+"\n")
def block(code):
    status["state"]="BLOCKED"
    status["error"]=code
    persist()
    raise RuntimeError(code)
def auth_json(url,method="GET",data=None,timeout=65):
    headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json","Accept":"application/json","User-Agent":"UMS-001-Runway-one-shot-LAB/1.0"}
    body=None if data is None else json.dumps(data).encode("utf-8")
    req=urllib.request.Request(url,headers=headers,data=body,method=method)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as response:
            if response.status<200 or response.status>=300:block("PROVIDER_BAD_RESPONSE")
            return json.loads(response.read(2_000_000))
    except urllib.error.HTTPError as e:
        block("PROVIDER_HTTP_"+str(e.code)+"_NO_RETRY")
    except Exception:
        block("PROVIDER_UNCERTAIN_NETWORK_NO_RETRY")
def asset_download(url,dest):
    if not isinstance(url,str):block("NO_VIDEO_URL")
    p=urllib.parse.urlparse(url)
    if p.scheme!="https" or not p.hostname or not (p.hostname=="replicate.delivery" or p.hostname.endswith(".replicate.delivery") or p.hostname=="replicate.com" or p.hostname.endswith(".replicate.com")):block("OUTPUT_NOT_REPLICATE_URL")
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS-001-Runway-real-motion/1.0"}),timeout=100) as inp,open(dest,"wb") as f:
            final=urllib.parse.urlparse(inp.url)
            if final.scheme!="https" or not final.hostname or not (final.hostname=="replicate.delivery" or final.hostname.endswith(".replicate.delivery") or final.hostname=="replicate.com" or final.hostname.endswith(".replicate.com")):block("UNEXPECTED_OUTPUT_REDIRECT")
            size=0
            while True:
                b=inp.read(262144)
                if not b:break
                size+=len(b)
                if size>150_000_000:block("OUTPUT_SIZE_LIMIT")
                f.write(b)
    except Exception:
        block("OUTPUT_DOWNLOAD_UNCERTAIN")
    x=dest.read_bytes()
    if len(x)<8192 or x[4:8]!=b"ftyp":block("OUTPUT_MP4_INVALID")
    return {"file":dest.name,"size_bytes":len(x),"sha256":hashlib.sha256(x).hexdigest()}
def main():
    if os.getenv("GITHUB_RUN_ATTEMPT")!="1" or os.getenv("RUNWAY_PILOT_ONE_TIME")!="yes":block("ONCE_ONLY_CONTEXT_DENIED")
    if M.get("environment")!="LAB" or M.get("autopublish") or M.get("automatic_paid_retry"):block("UNSAFE_MANIFEST")
    if len(M.get("shots",[]))!=1 or any(x["id"] not in ["08_RENACER_FENIX"] for x in M["shots"]):block("SHOT_LIST_INVALID")
    if M.get("batch_max_usd")!=0.60 or M.get("per_shot_usd_max")!=0.60:block("BUDGET_PLAN_MISMATCH")
    if len(TOKEN)<16 or TOKEN.strip()!=TOKEN:block("MISSING_SECRET")
    # GET-only model check; does not spend money.
    model=auth_json("https://api.replicate.com/v1/models/runwayml/gen-4.5")
    if model.get("owner")!="runwayml" or model.get("name")!="gen-4.5":block("MODEL_NOT_VERIFIED")
    status["state"]="MODEL_VERIFIED";persist()
    print("MODEL_VERIFIED_RUNWAY_GEN_4_5; ONE_GENUINE_VFX_CLIP; TOTAL_MAX_ESTIMATE_USD=0.60; NO_RETRIES")
    for item in M["shots"]:
        if round(status["amount_reserved_usd"]+0.60,2)>M["batch_max_usd"]:block("MONEY_LIMIT")
        status["amount_reserved_usd"]=round(status["amount_reserved_usd"]+0.60,2)
        status["state"]="CREATING_"+item["id"];persist()
        input_data={"prompt":item["prompt"],"aspect_ratio":"9:16","duration":5,"seed":item["seed"]}
        prediction=auth_json("https://api.replicate.com/v1/models/runwayml/gen-4.5/predictions",method="POST",data={"input":input_data})
        pred_id=prediction.get("id")
        if not pred_id or not isinstance(pred_id,str):block("PREDICTION_ID_NOT_RETURNED_DO_NOT_RESUBMIT")
        status["prediction_ids"].append({"shot":item["id"],"prediction_id":pred_id,"model":"runwayml/gen-4.5","cost_estimate_usd":0.60});persist()
        deadline=time.monotonic()+750
        while prediction.get("status") not in ("succeeded","failed","canceled"):
            if time.monotonic()>deadline:block("PREDICTION_TIMEOUT_DO_NOT_RESUBMIT")
            time.sleep(12)
            prediction=auth_json("https://api.replicate.com/v1/predictions/"+urllib.parse.quote(pred_id,safe=""))
        if prediction.get("status")!="succeeded":block("PREDICTION_"+prediction.get("status","UNKNOWN").upper())
        url=prediction.get("output")
        if isinstance(url,list):url=url[0] if len(url)==1 else None
        dest=OUT/(item["id"]+".mp4")
        digest=asset_download(url,dest)
        digest.update({"shot":item["id"],"prediction_id":pred_id,"rendered_with":"runwayml/gen-4.5","visual_qa":"NOT_YET_REVIEWED","geo_accuracy":"NOT_YET_REVIEWED"})
        status["assets"].append(digest);status["state"]="SAVED_"+item["id"];persist()
    status["state"]="REAL_VIDEO_ASSETS_RENDERED_PENDING_QA_AND_PERMANENT_STORAGE";persist()
    (OUT/"original-order.json").write_text(json.dumps(M,ensure_ascii=False,indent=2)+"\n")
    print("RUNWAY_PHYSICAL_SUCCESS: CLIPS=1; MAX_PLANNED_COST_USD=0.60; BYTES_SHA256_IN_ARTIFACT; NO_PUBLISH")
    try:
        subprocess.run(["ffmpeg","-version"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=10)
        paths=[str(OUT/(i["id"]+".mp4")) for i in M["shots"]]
        # Re-encode only for consistent dimensions/timestamps. No fake zoom, no wipe transitions, no cheap SFX.
        import tempfile
        listfile=OUT/"files.txt"
        listfile.write_text("".join("file '"+x.replace("'","'\\''")+"'\n" for x in paths))
        result=subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(listfile),"-vf","scale=720:1280:flags=lanczos,fps=24,format=yuv420p","-c:v","libx264","-preset","fast","-crf","18","-an","-movflags","+faststart",str(OUT/"ANDALUCIA_RUNWAY_PHOENIX_HERO_LAB.mp4")],timeout=180,capture_output=True)
        if result.returncode==0 and (OUT/"ANDALUCIA_RUNWAY_PHOENIX_HERO_LAB.mp4").exists():
            data=(OUT/"ANDALUCIA_RUNWAY_PHOENIX_HERO_LAB.mp4").read_bytes()
            status["montage"]={"filename":"ANDALUCIA_RUNWAY_PHOENIX_HERO_LAB.mp4","size_bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"sound":"NO_UNLICENSED_OR_FAKE_SFX","qa":"PENDING"}
            persist()
            print("RUNWAY_20_SECOND_REAL_MOVEMENT_MONTAGE_EXPORTED")
        else:print("MONTAGE_NOT_EXPORTED_RAW_MP4S_STILL_AVAILABLE")
    except Exception:
        print("FFMPEG_NOT_AVAILABLE_OR_FAILED_RAW_MP4S_AVAILABLE")
if __name__=="__main__":
    try:main()
    except Exception:
        print("UMS001_RUNWAY_BLOCKED",status.get("error") or "UNKNOWN")
        sys.exit(1)
