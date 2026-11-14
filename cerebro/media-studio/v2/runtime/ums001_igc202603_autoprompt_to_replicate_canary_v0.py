#!/usr/bin/env python3
"""UMS-001 E2E autonomous prompt -> Replicate image LAB canary.
Prompt text is created at runtime from structured brief and QA signals, NOT
authored in the paid order. One prepaid $0.06 prediction maximum, GitHub
branch-only reservation before POST, no retries and no platform publication.
"""
from __future__ import annotations
import base64,hashlib,importlib.util,json,os,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path("cerebro/media-studio/v2")
def load(filepath,name):
 spec=importlib.util.spec_from_file_location(name,filepath)
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 return m
forge=load(ROOT/"runtime/ums001_prompt_forge_lab_v0.py","prompt_factory")
base=load(ROOT/"runtime/replicate-one-shot-canary-lab-20261111.py","provider_util")
REPO=base.REPO;BRANCH=base.BRANCH;MODEL=base.MODEL;API=base.API
BRIEF=ROOT/"requests/UMS001_IGC202603_STRUCTURED_CREATIVE_BRIEF_LAB_V0.json"
QA=ROOT/"qa/UMS001_IGC202603_TRANSFER_LEARNINGS_FROM_IGC202601.json"
ORDER=ROOT/"requests/UMS001_IGC202603_AUTO_PROMPT_CANARY_ORDER_V0.json"
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-igc202603-autoprompt"
def stop(s):raise RuntimeError("UMS001_AUTOPROMPT_"+s)
def dump(doc):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"receipt.json").write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n")
def preflight():
 req=json.loads(ORDER.read_text());brief=json.loads(BRIEF.read_text());lessons=json.loads(QA.read_text())
 expected={"request_id":"UMS001-IGC202603-PROMPTFORGE-S00-20261111-01",
 "company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
 "content_id":"IGC-2026-03","panel_id":"IGC-2026-03-S00",
 "model_id":MODEL,"max_predictions":1,"max_cost_usd":0.06,
 "budget":"EXISTING_PREPAID_ONLY","publish":False,
 "generator":"UMS001-PROMPT-FORGE-V0.1","run_mode":"ONE_SHOT_PAID_LAB"}
 if req!=expected:stop("FIXED_REQUEST_SCOPE_DENIED")
 forged=forge.build_prompt_batch(brief,lessons)
 if forged.get("deepseek_api_called") is not False or forged.get("llm_api_calls")!=0 or forged.get("prompt_count")!=6:
  stop("PROMPT_GENERATOR_AUDIT_FAIL")
 if forged.get("content_id")!="IGC-2026-03" or forged["prompts"][0]["concept_id"]!=expected["panel_id"]:
  stop("GENERATED_PROMPT_ID_MISMATCH")
 p=forged["prompts"][0]
 if p["model_id"]!=MODEL or not 900<=len(p["text"])<=4800 or not p["safety"]["no_model_logo"]:
  stop("PROMPT_CONTRACT_INVALID")
 return req,forged,p
def main():
 if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:
  stop("ISOLATED_LAB_ONLY")
 if os.getenv("UMS001_IGC202603_PREPAID_GATE")!="OWNER_APPROVED_PREPAID_20261111":
  stop("BILLING_GUARD_BLOCKED")
 req,forged,p=preflight()
 token=os.getenv("REPLICATE_API_TOKEN","")
 gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not token.startswith("r8_") or len(token)<20 or not gh:stop("ENCRYPTED_TOKENS_NOT_PRESENT")
 acc_status,acct,_=base.http_json(API+"account",token=token,timeout=15)
 model_status,model,_=base.http_json(API+"models/"+MODEL,token=token,timeout=15)
 if acc_status!=200 or acct.get("type") not in ("user","organization") or model_status!=200 or model.get("name")!="flux-1.1-pro-ultra":
  stop("AUTH_OR_MODEL_INVALID")
 receipt={"schema_version":1,"company_id":"fenix","engine_id":"UMS-001",
  "environment":"LAB","request_id":req["request_id"],"content_id":"IGC-2026-03",
  "concept_id":p["concept_id"],"provider":"replicate","model_id":MODEL,
  "prompt_generator":forged["generator"],"prompt_generated_by":"CEREBRO_DETERMINISTIC_RULE_ENGINE",
  "deepseek_api_called":False,"llm_api_calls":0,
  "prompt_sha256":p["prompt_sha256"],"prediction_id":None,
  "estimated_provider_usage_usd":0.06,
  "status":"READY_NO_POST","publication_approved":False,"qa":"PENDING"}
 dump(receipt)
 try:path,sha=base.reserve_once(gh,{"request_id":req["request_id"]})
 except Exception:stop("DUPLICATE_OR_RESERVATION_NOT_ATOMIC")
 receipt["status"]="RESERVED_ONCE";dump(receipt)
 input_data={"prompt":p["text"],"aspect_ratio":"4:5","raw":False,"output_format":"jpg","safety_tolerance":2}
 try:
  code,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
   data={"input":input_data},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
 except Exception:stop("PAID_SUBMISSION_UNCERTAIN_NO_RETRY")
 if code not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):
  stop("PAID_POST_NOT_CONFIRMED_NO_RETRY")
 receipt["prediction_id"]=pred["id"];receipt["status"]="SUBMITTED";dump(receipt)
 base.update_receipt(gh,path,sha,receipt)
 for _ in range(15):
  if pred.get("status") in ("succeeded","failed","canceled"):break
  time.sleep(3)
  response_status,pred,_=base.http_json(API+"predictions/"+receipt["prediction_id"],token=token,timeout=20)
  if response_status!=200:stop("POLL_UNCERTAIN_RECONCILIATION_REQUIRED")
 if pred.get("status")!="succeeded":stop("PROVIDER_PREDICTION_FAILED_OR_PENDING_NO_RETRY")
 rawurl=pred.get("output")
 if isinstance(rawurl,list):rawurl=rawurl[0] if rawurl else None
 if not isinstance(rawurl,str):stop("PREDICTION_NO_OUTPUT")
 parsed=urllib.parse.urlparse(rawurl)
 if parsed.scheme!="https" or (parsed.hostname!="replicate.delivery" and not (parsed.hostname or "").endswith(".replicate.delivery")) or parsed.username or parsed.password or parsed.fragment:
  stop("OUTPUT_URL_UNTRUSTED")
 with urllib.request.urlopen(urllib.request.Request(rawurl,headers={"User-Agent":"UMS001-AUTOPROMPT"}),timeout=30) as r:
  end=urllib.parse.urlparse(r.geturl())
  if end.scheme!="https" or (end.hostname!="replicate.delivery" and not (end.hostname or "").endswith(".replicate.delivery")):stop("OUTPUT_REDIRECT_UNTRUSTED")
  data=r.read(12_000_001)
 if len(data)<1024 or len(data)>12_000_000 or data[:3]!=bytes([255,216,255]):stop("IMAGE_BYTES_INVALID")
 filename="IGC-2026-03-S00_REPLICATE_GENERATED_FROM_CEREBRO_PROMPT_V0.jpg"
 (OUT/filename).write_bytes(data)
 (OUT/"autogenerated_prompt.json").write_text(json.dumps({"concept_id":p["concept_id"],"prompt":p["text"],
  "prompt_sha256":p["prompt_sha256"],"generator":forged["generator"],"learning_signals":forged["learning_signals_applied"]},ensure_ascii=False,indent=2)+"\n")
 receipt.update(status="IMAGE_DOWNLOADED_INDEPENDENT_QA_PENDING",filename=filename,asset_sha256=hashlib.sha256(data).hexdigest(),asset_size_bytes=len(data))
 dump(receipt)
 print("UMS001_AUTOPROMPT_TO_REPLICATE=REAL_IMAGE_COMPLETE")
 print("UMS001_PROMPT_GENERATED_BY_CEREBRO=true")
 print("UMS001_LLM_API_CALLS=0")
 print("UMS001_REPLICATE_PAID_PREDICTIONS_SUBMITTED=1")
 print("UMS001_PUBLICATION=false")
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e) if str(e).startswith("UMS001_AUTOPROMPT_") else "UMS001_AUTOPROMPT_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
  sys.exit(2)
