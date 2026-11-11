#!/usr/bin/env python3
"""CEREBRO UMS-001 Llama70B-instructed creative direction -> Replicate FLUX LAB once.

The creative direction is persisted evidence from a real Cloudflare Workers AI
response. This V0 adapter reads it; it does not make the Cloudflare inference
call itself yet. The deterministic guard expands/enforces physical composition,
reference lineage, art realism, financial safety, source provenance and cost.
NO social posting, no prod, no retry, no new paid subscription.
"""
from __future__ import annotations
import base64
import hashlib
import importlib.util
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
ROOT=Path("cerebro/media-studio/v2")
def imported(filename):
    spec=importlib.util.spec_from_file_location("ums_base",ROOT/"runtime"/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
base=imported("replicate-one-shot-canary-lab-20261111.py")
MODEL=base.MODEL
API=base.API
REPO=base.REPO
BRANCH=base.BRANCH
SOURCE=ROOT/"requests/UMS001_IGC202603_CLOUDFLARE_LLAMA_ARTDIRECTOR_R03_CLEAN_REF.json"
ORDER=ROOT/"requests/UMS001_IGC202603_CLOUDFLARE_LLAMA_REPLICATE_R03_ORDER.json"
REF=ROOT/"references/IGC202603_OWNER_APPROVED_FEMALE_FACE_CLEAN_CROP_BASE64.json"
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202603-llama-director-r03"
REFERENCE_SHA="6c1e78c557cca26d475681fa81afc5a805d5bdc909738eb88931b101e27f3019"

def deny(code):
    raise RuntimeError("UMS001_LLAMA_DIRECTOR_R03_"+code)
def sha(b):
    return hashlib.sha256(b).hexdigest()
def write_receipt(value):
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"receipt.json").write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
def validate(order,creative,reference):
    expected={"request_id":"UMS001-IGC202603-CLOUDFLARE-LLAMA-REPLICATE-R03-20261111",
      "company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
      "content_id":"IGC-2026-03","concept_id":"IGC-2026-03-S00",
      "image_model_id":MODEL,"language_model_id":"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "max_predictions":1,"max_cost_usd":0.06,"max_new_subscription_cost_eur":0,
      "budget":"EXISTING_PREPAID_ONLY","publish":False,
      "image_reference_strength":0.26,"approval_state":"OWNER_APPROVED_REASONED_PROMPT_RETAKE_LAB"}
    if order!=expected:deny("PAID_ORDER_NOT_PREAPPROVED")
    if (creative.get("company_id"),creative.get("engine_id"),creative.get("environment"))!=("fenix","UMS-001","LAB"):
        deny("CREATIVE_SOURCE_SCOPE")
    if (creative.get("model_requested")!=expected["language_model_id"] or creative.get("model_reported")!="@cf/meta/llama-3.3-70b-json") or creative.get("operator_initiated_model_request") is not True:
        deny("NO_VERIFIABLE_CREATIVE_MODEL_RESULT")
    if creative.get("fully_automated_model_router") is not False or creative.get("content_id")!=order["content_id"]:
        deny("CREATIVE_SOURCE_IDENTITY")
    candidate=creative.get("generated_direction",{})
    llm_text=candidate.get("prompt_en","")
    if not isinstance(llm_text,str) or not 450<=len(llm_text)<=1400:
        deny("CREATIVE_MODEL_RESPONSE_OUT_OF_BOUNDS")
    if not all(x in llm_text.lower() for x in ["photorealistic","córdoba","60%","female","male"]):
        deny("MODEL_DID_NOT_FOLLOW_CASTING_OR_PHOTO_BRIEF")
    if any(x in llm_text.lower() for x in ("api_key=", "bearer ", "sk-")):
        deny("CREATIVE_PROMPT_CONTAINS_SECRET")
    if creative.get("controls",{}).get("source_image_sha256")!=REFERENCE_SHA:
        deny("SOURCE_REFERENCE_NOT_REGISTERED")
    b64=reference.get("base64_image")
    if not isinstance(b64,str) or not 30000<len(b64)<150000:
        deny("REFERENCE_BYTES_MISSING")
    try:
        jpg=base64.b64decode(b64,validate=True)
    except Exception:
        deny("REFERENCE_CORRUPT")
    if not jpg.startswith(bytes([255,216,255])) or sha(jpg)!=REFERENCE_SHA or reference.get("source_sha256")!=REFERENCE_SHA:
        deny("REFERENCE_SHA_MISMATCH")
    # These hard constraints are guardrails, NOT invented creative direction.
    photo_guard=(
      "CRITICAL CAMERA HARD RULE: CLOSE MEDIUM CINEMATIC PORTRAIT at 1.5 metres, "
      "75mm photography lens at eye level. TWO REAL ADULT PEOPLE working in Córdoba: exactly ONE WOMAN advisory professional and ONE adult MAN home buyer are the "
      "dominant in-focus PRIMARY subjects. Their waist-up torsos, expressive eyes and "
      "authentic natural human faces occupy more than 55 percent of the FULL 4:5 vertical frame. "
      "Faces centered in the front half, no tiny distant humans, no still life, no wide angle "
      "architecture shot, no full-height statues or CGI people. "
      "Warm Andalusian daylight with realistic sunlight and physically correct contact shadows. "
      "No beauty-filtered skin, no extra fingers or impossible hands. "
      "Spectacular sculptural impossible high-end SURREAL amber-orange architecture fills the "
      "BACKGROUND ONLY behind their shoulders. Architecture NEVER blocks faces or hands. "
      "Vivid brand orange #FF5F00 used for glass and lighting accents, not recoloring skin. "
      "Photojournalistic credibility married to exceptional cinematic surreal art, "
      "visually original, bright, delightful, professionally executed. "
    )
    negative_guard=(
      "FIRM NEGATIVE: no printed documents, no blank or printed papers, no signage, "
      "no letters, no labels, no fabricated bank paperwork, no text glyphs, "
      "no logos, no brand symbols, no marks or watermarks, no glowing X symbol, no checkmark, no cross mark or financial judgment icon, no generic hotel lobby, no fake neon yes/check symbol, no glowing approval icon, no stamps, "
      "no guarantee of mortgage approval or financial promises, no floating houses that hide humans. "
      "Leave one uncluttered lower corner reserved for separate legible curiosity hook and "
      "the ORIGINAL SHA-verified Mr Bogart Fénix logo added in postproduction ONLY. "
    )
    prompt=photo_guard + "REAL AI CREATIVE DIRECTION: "+llm_text+" "+negative_guard
    if not 1350<=len(prompt)<=3900:
        deny("GUARDED_PROMPT_LENGTH_BAD")
    return prompt,b64
def main():
    if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:
        deny("LAB_BRANCH_SCOPE")
    if os.getenv("UMS001_CLOUDFLARE_LLAMA_R03_PREPAID_GATE")!="ONE_OWNER_APPROVED_FINAL_RETAKE_20261111":
        deny("SPEND_GATE_DENIED")
    order=json.loads(ORDER.read_text()); creative=json.loads(SOURCE.read_text()); ref=json.loads(REF.read_text())
    prompt,b64=validate(order,creative,ref)
    token=os.getenv("REPLICATE_API_TOKEN",""); gh=os.getenv("GH_TOKEN_FOR_LAB","")
    if not token.startswith("r8_") or len(token)<20 or not gh:
        deny("ENCRYPTED_SECRET_MISSING")
    acct_status,acct,_=base.http_json(API+"account",token=token,timeout=15)
    mod_status,mod,_=base.http_json(API+"models/"+MODEL,token=token,timeout=15)
    if acct_status!=200 or acct.get("type") not in ("user","organization") or mod_status!=200 or mod.get("name")!="flux-1.1-pro-ultra":
        deny("PROVIDER_AUTH_NOT_VERIFIED")
    receipt={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
       "request_id":order["request_id"],"content_id":order["content_id"],
       "language_model":creative["model_reported"],"language_provider":"cloudflare_workers_ai",
       "creative_llm_called_by":"CEREBRO_Cloudflare_Universal_connector",
       "creative_model_called_in_same_runner":False,
       "creative_model_neurons_reported":creative["neuron_usage_reported"],
       "image_model":MODEL,"image_provider":"replicate",
       "reference_sha256":REFERENCE_SHA,"reference_strength":order["image_reference_strength"],
       "prompt_sha256":sha(prompt.encode()),"prediction_id":None,"status":"PREPARED",
       "estimated_provider_usd":0.06,"estimated_language_extra_cost_eur":0,
       "social_publication":False,"qa":"PENDING"}
    write_receipt(receipt)
    (OUT/"director_prompt_generated_and_guarded.txt").write_text(prompt,encoding="utf-8")
    try:
        reservation_path,reservation_sha=base.reserve_once(gh,{"request_id":order["request_id"]})
    except Exception:
        deny("DUPLICATE_RESERVATION_REJECTED")
    receipt["status"]="RESERVED_ONCE";write_receipt(receipt)
    payload={"prompt":prompt,"aspect_ratio":"4:5","raw":False,
       "image_prompt":"data:image/jpeg;base64,"+b64,
       "image_prompt_strength":order["image_reference_strength"],"output_format":"jpg","safety_tolerance":2}
    try:
        status,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
         data={"input":payload},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=85)
    except Exception:
        deny("POST_UNKNOWN_NO_AUTORETRY")
    if status not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):
        deny("POST_UNCONFIRMED_NO_AUTORETRY")
    receipt["prediction_id"]=pred["id"];receipt["status"]="SUBMITTED";write_receipt(receipt)
    base.update_receipt(gh,reservation_path,reservation_sha,receipt)
    for _ in range(15):
        if pred.get("status") in ("succeeded","failed","canceled"):
            break
        time.sleep(3)
        code,pred,_=base.http_json(API+"predictions/"+receipt["prediction_id"],token=token,timeout=25)
        if code!=200:
            deny("POLL_UNCERTAIN_RECONCILIATION_REQUIRED")
    if pred.get("status")!="succeeded":
        deny("PREDICTION_FAILED_OR_PENDING_NO_RETRY")
    u=pred.get("output")
    if isinstance(u,list):u=u[0] if u else None
    if not isinstance(u,str):deny("OUTPUT_MISSING")
    parsed=urllib.parse.urlparse(u)
    if parsed.scheme!="https" or (parsed.hostname!="replicate.delivery" and not (parsed.hostname or "").endswith(".replicate.delivery")) or parsed.username or parsed.password or parsed.fragment:
        deny("UNTRUSTED_OUTPUT_URL")
    request=urllib.request.Request(u,headers={"User-Agent":"CEREBRO-UMS001-QWEN/1"})
    with urllib.request.urlopen(request,timeout=30) as stream:
        target=urllib.parse.urlparse(stream.geturl())
        if target.scheme!="https" or (target.hostname!="replicate.delivery" and not (target.hostname or "").endswith(".replicate.delivery")):
            deny("UNTRUSTED_OUTPUT_REDIRECT")
        jpg=stream.read(12_000_001)
    if not 1024<len(jpg)<=12_000_000 or jpg[:3]!=bytes([255,216,255]):
        deny("INVALID_IMAGE")
    filename="IGC202603_S00_CLOUDFLARE_LLAMA_DIRECTOR_REPLICATE_R03_RAW.jpg"
    (OUT/filename).write_bytes(jpg)
    receipt.update(status="ORIGINAL_DOWNLOADED_QA_PENDING",image_file=filename,asset_sha256=sha(jpg),asset_bytes=len(jpg))
    write_receipt(receipt)
    print("CEREBRO_LLAMA70B_TO_REPLICATE_REAL_IMAGE=COMPLETE")
    print("CEREBRO_LLAMA70B_IMAGE_QA=PENDING")
    print("CEREBRO_IMAGE_MODEL_SPEND_ESTIMATE_USD=0.06")
    print("CEREBRO_PUBLICATION_ENABLED=FALSE")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print(str(e) if str(e).startswith("UMS001_LLAMA_DIRECTOR_R03_") else "UMS001_LLAMA_DIRECTOR_R03_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
        sys.exit(2)
