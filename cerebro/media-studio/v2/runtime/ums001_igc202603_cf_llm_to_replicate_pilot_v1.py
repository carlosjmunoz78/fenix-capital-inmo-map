#!/usr/bin/env python3
"""CEREBRO UMS-001 LLM creative direction->Replicate photo, LAB one-shot.
Creative draft generated with Cloudflare Workers AI free-neuron pilot, not ChatGPT.
AI model does NOT invent logos or text. Existing Replicate prepaid only.
No repeated inference, no publication, no DNS or PROD changes.
"""
import base64,hashlib,importlib.util,json,os,re,sys,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path("cerebro/media-studio/v2")
M=ROOT/"runtime/replicate-one-shot-canary-lab-20261111.py"
spec=importlib.util.spec_from_file_location("old_provider",M)
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
API=base.API;MODEL=base.MODEL;REPO=base.REPO;BRANCH=base.BRANCH
CREATIVE=ROOT/"requests/UMS001_IGC202603_CLOUDFLARE_LLAMA70B_CREATIVE_PROPOSAL_V1.json"
ORDER=ROOT/"requests/UMS001_IGC202603_CLOUDFLARE_CREATIVE_REPLICATE_CANARY_ORDER_V1.json"
REF=ROOT/"references/IGC202601_OWNER_APPROVED_CLEAN_REVIEW_CROP_BASE64.json"
OUT=Path(os.getenv("RUNNER_TEMP","/tmp"))/"ums001-cfcreative-igc202603"
def fail(x):raise RuntimeError("UMS001_CFCREATIVE_"+x)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def keep(r):
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/"receipt.json").write_text(json.dumps(r,indent=2,ensure_ascii=False)+"\n")
def preflight():
 req=json.loads(ORDER.read_text());creative=json.loads(CREATIVE.read_text());ref=json.loads(REF.read_text())
 expected={"request_id":"UMS001-IGC202603-CF70B-REPLICATE-CANARY-20261111","company_id":"fenix","engine_id":"UMS-001",
 "environment":"LAB","content_id":"IGC-2026-03","panel_id":"IGC-2026-03-S00",
 "model_id":MODEL,"max_predictions":1,"max_cost_usd":0.06,"budget":"EXISTING_PREPAID_ONLY",
 "publish":False,"creative_id":"UMS001-IGC202603-CF-LLAMA70B-CREATIVE-V1","reference_strength":0.33,
 "approval_scope":"ONE_IMAGE_LAB_CREATIVE_COMPARISON"}
 if req!=expected:fail("ORDER_SCOPE_DENIED")
 if (creative.get("company_id"),creative.get("engine_id"),creative.get("environment"))!=("fenix","UMS-001","LAB"):fail("CREATIVE_SCOPE_DENIED")
 if creative.get("proposal_id")!=req["creative_id"] or creative.get("provider_completion_id")!="chatcmpl-a3646ef2-b4d0-444d-89b3-db67e41aeb59":
  fail("CREATIVE_NOT_FROM_VERIFIED_CLOUDFLARE_PILOT")
 if creative.get("estimated_additional_cost_eur")!=0 or creative.get("deepseek_called") is not False or creative.get("publish_enabled") is not False:
  fail("CREATIVE_POLICY_DENIED")
 raw_text=creative["model_response"]["image_prompt"]
 safety=creative["hard_constraints_added_by_cerebro_router"]
 if not isinstance(raw_text,str) or not 500<len(raw_text)<1900 or not isinstance(safety,str) or not 300<len(safety)<1600:
  fail("CREATIVE_LENGTH_REJECT")
 if "woman" not in raw_text.lower() or "man" not in raw_text.lower() or "faces" not in raw_text.lower() or "orange" not in raw_text.lower():fail("CREATIVE_MISSING_HUMAN_OR_BRAND")
 prompt=raw_text+" "+safety
 if not 1000<len(prompt)<3400 or "No logos" not in prompt or "Vertical 4:5" not in prompt:fail("PROMPT_COMPOSITION_DENIED")
 if ref.get("source_sha256")!="c6341224d5e02ae7bf79e2d7b4effc59566d2aaa7028f2ad129f2045b79dcfe2":
  fail("REFERENCE_NOT_APPROVED")
 raw64=ref.get("base64_image","")
 try:image=base64.b64decode(raw64,validate=True)
 except Exception:fail("REFERENCE_ENCODING")
 if len(image)>150000 or image[:3]!=b"\xff\xd8\xff" or sha(image)!=ref["source_sha256"]:
  fail("REFERENCE_HASH_INVALID")
 return req,creative,prompt,raw64
def main():
 if os.getenv("GITHUB_REPOSITORY")!=REPO or (os.getenv("GITHUB_HEAD_REF") or os.getenv("GITHUB_REF_NAME"))!=BRANCH:fail("LAB_BRANCH_ONLY")
 if os.getenv("UMS001_CFCREATIVE_PREPAID_GATE")!="OWNER_APPROVED_PREPAID_20261111":fail("BILLING_GUARD")
 req,creative,prompt,reference64=preflight()
 token=os.getenv("REPLICATE_API_TOKEN","");gh=os.getenv("GH_TOKEN_FOR_LAB","")
 if not token.startswith("r8_") or len(token)<20 or not gh:fail("CREDENTIALS_NOT_PRESENT")
 status,acct,_=base.http_json(API+"account",token=token,timeout=15)
 mod_code,model,_=base.http_json(API+"models/"+MODEL,token=token,timeout=15)
 if status!=200 or acct.get("type") not in ("user","organization") or mod_code!=200 or model.get("name")!="flux-1.1-pro-ultra":
  fail("REPLICATE_MODEL_AUTH_FAIL")
 r={"schema_version":1,"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
 "request_id":req["request_id"],"content_id":req["content_id"],"panel_id":req["panel_id"],
 "creative_provider":"cloudflare-workers-ai","creative_model":creative["model_observed"],
 "creative_inference_mode":"MANUAL_CONNECTOR_PILOT_NOT_AUTONOMOUS_GATEWAY",
 "creative_neurons":creative["usage"]["neurons"],"text_api_cost_eur":0,
 "image_provider":"replicate","model_id":MODEL,"reference_sha256":creative["reference_source"],
 "reference_strength":0.33,"prompt_sha256":sha(prompt.encode()),"prediction_id":None,
 "estimated_image_cost_usd":0.06,"status":"PREPARED_NOT_SUBMITTED",
 "quality_assessment":"PENDING","publication_approved":False}
 keep(r)
 try:reservation_path,reservation_sha=base.reserve_once(gh,{"request_id":req["request_id"]})
 except Exception:fail("DUPLICATE_OR_ATOMIC_RESERVATION_NOT_CONFIRMED")
 r["status"]="RESERVED_ONCE";keep(r)
 inputs={"prompt":prompt,"aspect_ratio":"4:5","raw":False,"output_format":"jpg","safety_tolerance":2,
 "image_prompt":"data:image/jpeg;base64,"+reference64,"image_prompt_strength":0.33}
 try:code,pred,_=base.http_json(API+"models/"+MODEL+"/predictions","POST",token=token,
   data={"input":inputs},headers={"Prefer":"wait=60","Cancel-After":"120s"},timeout=80)
 except Exception:fail("POST_UNCERTAIN_NO_RETRY")
 if code not in (200,201) or not re.fullmatch("[a-z0-9]{8,80}",str(pred.get("id",""))):fail("POST_NOT_CONFIRMED_NO_RETRY")
 r["prediction_id"]=pred["id"];r["status"]="SUBMITTED";keep(r)
 base.update_receipt(gh,reservation_path,reservation_sha,r)
 for _ in range(15):
  if pred.get("status") in ("succeeded","failed","canceled"):break
  time.sleep(3)
  n,pred,_=base.http_json(API+"predictions/"+r["prediction_id"],token=token,timeout=20)
  if n!=200:fail("POLL_UNCERTAIN_NO_RETRY")
 if pred.get("status")!="succeeded":fail("PREDICTION_NOT_SUCCEEDED_NO_RETRY")
 url=pred.get("output")
 if isinstance(url,list):url=url[0] if url else None
 if not isinstance(url,str):fail("MISSING_IMAGE_URL")
 parsed=urllib.parse.urlparse(url)
 if parsed.scheme!="https" or (parsed.hostname!="replicate.delivery" and not (parsed.hostname or "").endswith(".replicate.delivery")) or parsed.username or parsed.password or parsed.fragment:fail("OUTPUT_URL_UNTRUSTED")
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"UMS001-CF-CREATIVE-LAB"}),timeout=30) as response:
  final=urllib.parse.urlparse(response.geturl())
  if final.scheme!="https" or (final.hostname!="replicate.delivery" and not (final.hostname or "").endswith(".replicate.delivery")):fail("OUTPUT_REDIRECT_UNTRUSTED")
  raw=response.read(12_000_001)
 if not 1024<len(raw)<=12_000_000 or raw[:3]!=b"\xff\xd8\xff":fail("BAD_OUTPUT_IMAGE")
 fname="IGC-2026-03-S00_CLOUDFLARE_CREATIVE_REPLICATE_RAW.jpg"
 (OUT/fname).write_bytes(raw)
 (OUT/"approved_prompt_source.json").write_text(json.dumps({
 "creative_provider":creative["provider"],"creative_model":creative["model_observed"],
 "llm_response":creative["model_response"]["image_prompt"],"safety_overlay":safety if False else creative["hard_constraints_added_by_cerebro_router"],
 "effective_prompt":prompt,"prompt_sha256":sha(prompt.encode()),"completion_id":creative["provider_completion_id"]},indent=2)+"\n")
 r.update(status="PHOTO_DOWNLOADED_QA_PENDING",filename=fname,image_sha256=sha(raw),bytes=len(raw))
 keep(r)
 print("UMS001_CFCREATIVE_REPLICATE=REAL_IMAGE_DOWNLOADED")
 print("UMS001_CFCREATIVE_SOURCE=CLOUDFLARE_LLAMA70B")
 print("UMS001_DEEPSEEK_API_CALLS=0")
 print("UMS001_PUBLICATION=OFF")
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e) if str(e).startswith("UMS001_CFCREATIVE_") else "UMS001_CFCREATIVE_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr)
  sys.exit(2)
