#!/usr/bin/env python3
"""CEREBRO UMS-001 DeepSeek-primary -> Replicate -> DeepSeek vision -> original brand.
LAB-only, per-job atomic reservation, bounded cost, no PROD/publishing.
Preserves existing runtime; no Cloudflare Workers AI calls. No credentials logged.
"""
from __future__ import annotations
import argparse,base64,hashlib,importlib.util,io,json,os,re,sys,time
import urllib.error,urllib.parse,urllib.request
from pathlib import Path

ROOT=Path("cerebro/media-studio/v2")
RUNTIME=ROOT/"runtime"
REPO="carlosjmunoz78/fenix-capital-inmo-map"
BRANCH="cerebro/ums-replicate-flux-paid-lab-v0-20261108"
ENGINE="UMS-001"
AI="deepseek-flash"
MODEL="black-forest-labs/flux-1.1-pro-ultra"
DS_ENDPOINT="https://api.deepseek.com/chat/completions"
REPLICATE_ENDPOINT="https://api.replicate.com/v1/models/"+MODEL+"/predictions"
ALLOWED_CHANNELS={"INSTAGRAM","FACEBOOK","LINKEDIN","SEO"}
FAIL_CODES={"INVENTED_TEXT","INVENTED_LOGO","FACE_MISSING","FACE_TINY","FACE_OBSCURED","CAST_MISMATCH","BAD_ANATOMY","GENERIC_SCENE","DARK_MUDDY","MISLEADING_FINANCE","COMPOSITION_WEAK","BAD_LIGHTING","FLAT_CONTRAST","FOCAL_DISTORTION","WRONG_BRAND_COLOR","UNKNOWN"}
OUT=Path(os.environ.get("RUNNER_TEMP","/tmp"))/"ums001-deepseek-autonomous"
SOCIAL_REFERENCE=ROOT/"references/IGC202601_OWNER_APPROVED_CLEAN_REVIEW_CROP_BASE64.json"
SOCIAL_REFERENCE_SHA="c6341224d5e02ae7bf79e2d7b4effc59566d2aaa7028f2ad129f2045b79dcfe2"
def safe_style_reference():
 src=json.loads(SOCIAL_REFERENCE.read_text(encoding="utf-8"))
 if src.get("source_sha256")!=SOCIAL_REFERENCE_SHA:deny("STYLE_REFERENCE_SHA_DENIED")
 b=src.get("base64_image","")
 if not isinstance(b,str) or not 30000<=len(b)<=150000:deny("STYLE_REFERENCE_UNVERIFIED_SIZE")
 try:raw=base64.b64decode(b,validate=True)
 except Exception:deny("STYLE_REFERENCE_ENCODING_DENIED")
 if raw[:3]!=bytes((255,216,255)) or hashlib.sha256(raw).hexdigest()!=SOCIAL_REFERENCE_SHA:
  deny("STYLE_REFERENCE_BYTES_TAMPERED")
 # Hard-earned QA: the approved source contains a glowing approval tick near
 # the BOTTOM. Image conditioning repeated that misleading mark in three images.
 # Restrict source to upper photography only, preserving its verified pixels.
 try:
  from PIL import Image
  im=Image.open(io.BytesIO(raw)).convert("RGB")
  if im.size!=(680,467):deny("STYLE_REFERENCE_DIMENSIONS_CHANGED")
  im=im.crop((0,0,680,286))
  if hashlib.sha256(im.tobytes()).hexdigest()!="e63239c035ccda9d72f33ee0528e1cd13cabb80ab780f33935342ed2eb642b8b":
   deny("STYLE_REFERENCE_CROP_PIXELS_CHANGED")
  buf=io.BytesIO();im.save(buf,format="JPEG",quality=90,optimize=True)
 except Blocked:raise
 except Exception:deny("STYLE_REFERENCE_PROCESSING_FAILED")
 return "data:image/jpeg;base64,"+base64.b64encode(buf.getvalue()).decode()

class Blocked(RuntimeError):pass
def deny(reason):raise Blocked("UMS001_DEEPSEEK_"+reason)
def hash_bytes(data):return hashlib.sha256(data).hexdigest()
def json_read(path):return json.loads(Path(path).read_text(encoding="utf-8"))
def json_write(path,doc):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(doc,indent=2,ensure_ascii=False,sort_keys=True)+"\n",encoding="utf-8")
def allowed_job(doc):
 if not isinstance(doc,dict):deny("JOB_NOT_OBJECT")
 required={"schema_version","request_id","company_id","engine_id","environment","version","channel","asset_type","topic","audience","panels","publish_enabled","max_attempts_per_panel","max_image_budget_usd","max_deepseek_calls","max_deepseek_budget_usd","source_request"}
 if set(doc)!=required:deny("JOB_FIELDS")
 if (doc["company_id"],doc["engine_id"],doc["environment"],doc["version"])!=("fenix",ENGINE,"LAB","1.0"):deny("SCOPE_DENIED")
 if doc["channel"] not in ALLOWED_CHANNELS or doc["asset_type"] not in ("IMAGE","CAROUSEL","SEO_HERO"):deny("CHANNEL_INVALID")
 if doc["channel"]=="SEO" and doc["asset_type"]!="SEO_HERO":deny("SEO_FORMAT_DENIED")
 if doc["channel"]!="SEO" and doc["asset_type"]=="SEO_HERO":deny("SOCIAL_FORMAT_DENIED")
 if doc["publish_enabled"] is not False:deny("NEVER_PUBLISH_FROM_LAB")
 if not isinstance(doc["request_id"],str) or not re.fullmatch(r"UMS001-[A-Za-z0-9-]{10,92}",doc["request_id"]):deny("BAD_REQUEST_ID")
 for k in ("topic","audience","source_request"):
  if not isinstance(doc[k],str) or not 8<=len(doc[k])<=450:deny("INVALID_"+k)
  if re.search(r"(?i)https?://|@[a-z0-9.-]+\.[a-z]{2,}|\b(?:password|api.?key|secret|bearer)\b",doc[k]):deny("SENSITIVE_"+k)
 panels=doc["panels"]
 if not isinstance(panels,list) or len(panels)==0 or len(panels)>8:deny("PANEL_COUNT")
 if doc["asset_type"]=="CAROUSEL" and len(panels)<2:deny("CAROUSEL_TOO_SHORT")
 if doc["asset_type"]!="CAROUSEL" and len(panels)!=1:deny("SINGLE_IMAGE_ONLY")
 if type(doc["max_attempts_per_panel"]) is not int or not 1<=doc["max_attempts_per_panel"]<=3:deny("ATTEMPTS_RANGE")
 if type(doc["max_deepseek_calls"]) is not int or not 1<=doc["max_deepseek_calls"]<=32:deny("LLM_CALL_RANGE")
 for k in ("max_image_budget_usd","max_deepseek_budget_usd"):
  if type(doc[k]) not in (int,float) or not 0<doc[k]<=2:deny("BUDGET_DENIED")
 if round(len(panels)*doc["max_attempts_per_panel"]*0.06,2)>doc["max_image_budget_usd"]+0.000001:deny("IMAGE_FINOPS_BUDGET_MISSING")
 if doc["max_deepseek_calls"]<len(panels)*(1+doc["max_attempts_per_panel"]):deny("INSUFFICIENT_LLM_CALL_CAP")
 seen=set()
 for p in panels:
  if not isinstance(p,dict) or set(p)!={"id","scene","human_subject","hook","bullets","required_visuals"}:deny("PANEL_SCHEMA")
  if not isinstance(p["id"],str) or not re.fullmatch(r"S0[0-7]",p["id"]) or p["id"] in seen:deny("PANEL_ID")
  seen.add(p["id"])
  for k in ("scene","human_subject","hook"):
   if not isinstance(p[k],str) or not 4<=len(p[k])<=320:deny("PANEL_"+k)
   if re.search(r"(?i)https?://|@[a-z0-9.-]+\.[a-z]{2,}|\b(?:password|api.?key|secret)\b",p[k]):deny("SENSITIVE_PANEL")
  if not isinstance(p["required_visuals"],list) or not 1<=len(p["required_visuals"])<=6 or any(not isinstance(v,str) or len(v)>180 for v in p["required_visuals"]):deny("REQUIRED_VISUALS")
  if not isinstance(p["bullets"],list) or len(p["bullets"])>2 or any(not isinstance(v,str) or len(v)>45 for v in p["bullets"]):deny("BULLETS")
  if len(p["hook"])>36:deny("HOOK_TOO_LONG")
 return doc
def get_learning(doc):
 # Prior real QA lessons are static, traceable; do not turn rejected prompt examples into accepted training data.
 lessons=[
  {"code":"FACE_MISSING","source":"IGC202603_AUTOPROMPT_CANARY_R01_QA_FAIL","instruction":"Human foreground is mandatory, not a still life"},
  {"code":"FACE_TINY","source":"IGC202603_AUTOPROMPT_CANARY_R02_QA_FAIL","instruction":"People large waist-up and faces at least 25% image height"},
  {"code":"INVENTED_TEXT","source":"IGC202603_CLOUDFLARE70B_REPLICATE_R02_REJECTED","instruction":"No printed lettering on clothing, walls, keys or physical objects"},
  {"code":"INVENTED_LOGO","source":"IGC202603_CLOUDFLARE70B_REPLICATE_R02_REJECTED","instruction":"Never generate fake marks; real logo added by verified compositor"},
  {"code":"MISLEADING_FINANCE","source":"IGC202603_CLOUDFLARE70B_REPLICATE_PILOT_R01_VERDICT","instruction":"Never suggest bank approval or real legal guarantee"},
  {"code":"BAD_ANATOMY","source":"UMS001-IGC202603-DEEPSEEK-ARTLAB-20261111-05","instruction":"Real QA 58/100: avoid hand gestures in foreground unless precise finger anatomy; do not create melted/fused fingers"},
  {"code":"GENERIC_SCENE","source":"UMS001-IGC202603-DEEPSEEK-ARTLAB-20261111-05","instruction":"Actual images omitted meaningful surreal architectural sculpture; insist on physically grounded spectacular orange glass architecture behind the people rather than orange flat wall"},
 ]
 # Durable evidence-backed LAB learning; never read random logs, model-produced
 # instructions, secrets, or articles as system directives.
 ledger_path=ROOT/"qa/UMS001_DEEPSEEK_REAL_IMAGE_LEARNING_LEDGER_20261111.json"
 if ledger_path.is_file():
  ledger=json_read(ledger_path)
  if (ledger.get("company_id"),ledger.get("engine_id"),ledger.get("environment"))!=("fenix",ENGINE,"LAB"):
   deny("LEARNING_LEDGER_SCOPE_INVALID")
  for item in ledger.get("rules",[])[:14]:
   code=item.get("code");rule=item.get("instruction")
   if code not in FAIL_CODES or not isinstance(rule,str) or not 8<=len(rule)<=550:
    deny("LEARNING_RULE_INVALID")
   if re.search(r"(?i)(?:https?://|api.?key|bearer|\\br8_[a-z0-9]+)",rule):
    deny("LEARNING_RULE_SECRET_OR_URL_DENIED")
   lessons.append({"code":code,"source":ledger_path.name,"instruction":rule})
 return lessons[:24]
PREMIUM_POLICY=ROOT/"registry/UMS001_PREMIUM_CINEMATOGRAPHY_PROMPT_CONTRACT_V1.json"
SHOT_KEYS=("camera_angle","focal_length_mm","aperture","key_light","fill_and_rim","contrast","color_grade","surreal_composition","subject_scale","typography_safe_area")
def premium_policy():
 doc=json_read(PREMIUM_POLICY)
 if doc.get("policy_id")!="UMS001-PREMIUM-CINEMATOGRAPHY-20261111" or doc.get("environment")!="LAB":
  deny("CINEMATOGRAPHY_POLICY_INVALID")
 return doc
def premium_directives():
 doc=premium_policy()
 return {"visual_standard":doc["artistic_standard"]["visual_goal"],
  "photographic_details":doc["artistic_standard"]["camera"],
  "lighting":doc["artistic_standard"]["lighting"],
  "contrast_and_color":doc["artistic_standard"]["color_grade"],
  "materials":doc["artistic_standard"]["texture_and_materials"],
  "surreal_art":doc["artistic_standard"]["surreal_direction"],
  "positive_prompt_order":doc["prompt_required_order"],
  "qa_dimensions":doc["qa_dimensions"],
  "no_generated_logos":True}
def prompt_messages(job,panel,attempt,previous_qa):
 customer={"purpose":job["topic"],"audience":job["audience"],"platform":job["channel"],"type":job["asset_type"],
   "panel_scene":panel["scene"],"human_subject":panel["human_subject"],"must_show":panel["required_visuals"],
   "past_failures":get_learning(job),"attempt":attempt,"correction":previous_qa,
   "premium_cinematography_contract":premium_directives(),
   "brand":{"dominant_accent":"#FF5F00","yellow_secondary":"#FFB71B","purple_accent":"MINIMAL","original_logo":"MR_BOGART_SVG_POSTCOMPOSITION_ONLY"}}
 sys_text=("You are CEREBRO UMS-001, a world-class Spanish surreal-photography creative director. "
  "Produce STRICT JSON with keys image_prompt,risks,shot_plan. image_prompt 650-3000 English characters. "
  "shot_plan MUST include camera_angle,focal_length_mm,aperture,key_light,fill_and_rim,contrast,color_grade,surreal_composition,subject_scale,typography_safe_area, all concrete visible instructions. "
  "Every scene must state a professional CAMERA ANGLE and focal LENS 35mm/50mm/85mm, aperture f/2.8-f/4, realistic depth of field, natural KEY LIGHT direction with fill and optional rim, a physically coherent contrast ratio and shadows, dynamic range, orange #FF5F00 cinematic grade while preserving natural skin. "
  "Start with large realistic Spanish adults visible waist-up in the foreground, photographic pores, believable hands, "
  "professional premium cinematic Córdoba-Andalucía art, spectacular orange glass surreal architecture BEHIND them. "
  "If SEO, do not include text or logos in final image. If social, leave space for separate deterministic hook+logo. "
  "No AI text, invented watermarks, marks, labels, documents, bank approval implications or fake bank emblems. The surreal sculpture is ABSTRACT PHYSICAL ARCHITECTURE, not an icon or symbol. "
  "Image is 4:5 vertical. Image composition must not be a generic tiny-people fantasy. "
  "Never generate the brand icon; original SHA-verified Fénix logo composited separately. JSON only.")
 return [{"role":"system","content":sys_text},{"role":"user","content":"Generate an original creative photographic prompt, not a repeated template. Customer brief JSON: "+json.dumps(customer,ensure_ascii=False)}]
def validate_creative(result):
 if not isinstance(result,dict) or set(result)!={"image_prompt","risks","shot_plan"}:deny("CREATIVE_JSON_SCHEMA")
 shot=result["shot_plan"]
 if not isinstance(shot,dict) or set(shot)!=set(SHOT_KEYS):deny("MISSING_PREMIUM_PHOTO_SHOT_PLAN")
 for key in SHOT_KEYS:
  val=shot[key]
  if key in ("focal_length_mm","aperture") and type(val) in (int,float):
   if not (18<=val<=200 if key=="focal_length_mm" else 1.2<=val<=22):
    deny("INVALID_NUMERIC_SHOT_FIELD_"+key)
   shot[key]=str(val)+"mm" if key=="focal_length_mm" else "f/"+str(val)
  elif isinstance(val,str) and 2<=len(val)<=350:
   shot[key]=val.strip()
   if len(shot[key])<2:deny("EMPTY_SHOT_FIELD_"+key)
  else:
   deny("INVALID_SHOT_FIELD_"+key)
 p=result["image_prompt"];risks=result["risks"]
 if not isinstance(p,str) or not 350<=len(p)<=6000:deny("CREATIVE_TOO_SHORT_OR_LONG")
 # Risk prose is advisory metadata, not the safety boundary. Accept bounded
 # variants from LLMs; all mandatory camera, finance and image QA gates remain strict.
 if isinstance(risks,str):
  risk_items=[risks]
 elif isinstance(risks,dict):
  risk_items=list(risks.values())
 elif isinstance(risks,list):
  risk_items=risks
 else:
  risk_items=[]
 if len(risk_items)>10 or sum(len(str(x)) for x in risk_items)>2000:
  deny("RISKS_INVALID")
 if any(not isinstance(x,(str,dict)) for x in risk_items):
  deny("RISKS_INVALID")
 visual_text=(p+" "+" ".join(shot.values())).lower()
 if not any(w in visual_text for w in ("human","adult","people","woman","man","person","protagonist")):
  deny("PEOPLE_NOT_IN_PROMPT")
 if not any(w in visual_text for w in ("orange","#ff5f00","amber","ámbar","golden")):
  deny("BRAND_COLOR_ABSENT")
 if not any(w in visual_text for w in ("photo","cinematic","50mm","35mm","85mm","focal","lens","portrait","editorial")):
  deny("PHOTOGRAPHIC_DIRECTION_ABSENT")
 if re.search(r"(?:https?://|r8_[a-zA-Z0-9]+)",p):deny("SUSPICIOUS_PROMPT")
 # DeepSeek's structured camera/light decisions must be part of the actual Replicate prompt.
 photo_plan=" PHOTOGRAPHY SHOT SPEC: "+"; ".join(key.replace("_"," ")+": "+shot[key] for key in SHOT_KEYS)+"."
 hard_negatives=" IMPORTANT FOR ORIGINAL GENERATION: no written words anywhere, no fabricated watermarks, no generated logos, no false official paperwork or mortgage approval symbols, no text on clothes, no artifacts covering human faces, no poor anatomy. Authentic original Fénix mark is added later by a SHA-verified compositor only."
 if len(p)+len(photo_plan)+len(hard_negatives)>10000:deny("COMBINED_PREMIUM_PROMPT_TOO_LARGE")
 return ("MAIN SUBJECT: large authentic Spanish adult people in close-up foreground, clear natural faces and hands; "
  "PREMIUM 50mm CINEMATIC PHOTOGRAPH with vivid orange #FF5F00 artwork behind humans, realistic sunlight. "
  +p+photo_plan+hard_negatives)
def validate_vision(result):
 if not isinstance(result,dict) or set(result)!={"pass","score","violations","correction","summary","rubric_scores"}:deny("VISION_JSON_SCHEMA")
 rubric=premium_policy()["qa_dimensions"]
 scores=result["rubric_scores"]
 if not isinstance(scores,dict) or set(scores)!=set(rubric):deny("PREMIUM_VISION_RUBRIC_MISSING")
 if any(type(scores[k]) is not int or not 0<=scores[k]<=rubric[k] for k in rubric):deny("PREMIUM_VISION_SCORE_OUT_OF_RANGE")
 # A contradictory self-reported score MUST be a rejection, never a forced approval.
 discrepancy=sum(scores.values())!=result.get("score")
 if type(result["pass"]) is not bool or type(result["score"]) is not int or not 0<=result["score"]<=100:deny("VISION_TYPES")
 if not isinstance(result["violations"],list) or any(x not in FAIL_CODES for x in result["violations"]):deny("UNKNOWN_VIOLATION")
 if not isinstance(result["correction"],str) or len(result["correction"])>1200:deny("VISION_CORRECTION")
 if not isinstance(result["summary"],str) or not 5<=len(result["summary"])<=500:deny("VISION_SUMMARY")
 if discrepancy:
  issues=sorted(set(result["violations"]+["UNKNOWN"]))
  return {**result,"reported_score":result["score"],"rubric_sum":sum(scores.values()),
   "score":min(result["score"],sum(scores.values())),"pass":False,
   "violations":issues,"accepted":False,"score_consistency":"REJECTED_INCONSISTENT_RUBRIC"}
 return {**result,"accepted":result["pass"] and result["score"]>=88 and len(result["violations"])==0,
  "score_consistency":"VERIFIED"}
def http_json(url,method="GET",token=None,data=None,timeout=35):
 headers={"Accept":"application/json","User-Agent":"CEREBRO-UMS001-DEEPSEEK-LAB/1"}
 if token:headers["Authorization"]="Bearer "+token
 if data is not None:headers["Content-Type"]="application/json"
 req=urllib.request.Request(url,method=method,headers=headers,data=json.dumps(data).encode() if data is not None else None)
 try:
  with urllib.request.urlopen(req,timeout=timeout) as f:return f.status,json.loads(f.read(1500000))
 except urllib.error.HTTPError as e:return e.code,{}
def deepseek(messages,api_key,clock,vision=False):
 if clock["deepseek_calls"]>=clock["deepseek_cap"]:deny("MAX_DEEPSEEK_CALLS_REACHED")
 # DeepSeek Flash upper-bound PEAK token rates, from official pricing (USD / 1M).
 # Estimate is conservative: all input treated as cache-miss. No hidden subscription or auto top-up.
 if clock["estimated_cost_usd"]+0.01>clock["max_cost_usd"]+1e-9:
  deny("FINOPS_DEEPSEEK_SPENDING_CEILING")
 clock["deepseek_calls"]+=1
 payload={"model":AI,"messages":messages,"response_format":{"type":"json_object"},
  "thinking":{"type":"disabled"},"temperature":0.55 if not vision else 0.1,"max_tokens":1600 if not vision else 950,
  "stream":False}
 code,ans=http_json(DS_ENDPOINT,"POST",api_key,payload,timeout=75)
 if code!=200:deny("DEEPSEEK_PROVIDER_ERROR_"+str(code))
 try:
  ch=ans["choices"][0]
  if ch["finish_reason"]!="stop":deny("DEEPSEEK_INCOMPLETE")
  raw=ch["message"]["content"]
  if not isinstance(raw,str) or not raw.strip():deny("DEEPSEEK_EMPTY")
  parsed=json.loads(raw)
  usage=ans.get("usage") or {}
  input_tokens=usage["prompt_tokens"]
  output_tokens=usage["completion_tokens"]
  if type(input_tokens) is not int or type(output_tokens) is not int or input_tokens<0 or output_tokens<0:
   deny("DEEPSEEK_METERING_INVALID")
  if input_tokens+output_tokens>12000:deny("DEEPSEEK_TOKEN_OVERFLOW")
  clock["total_text_tokens"]+=input_tokens+output_tokens
  if clock["total_text_tokens"]>75000:deny("DEEPSEEK_METERED_TOKENS_EXCEEDED")
  increment=(input_tokens*0.30+output_tokens*1.20)/1000000
  clock["estimated_cost_usd"]+=increment
  if clock["estimated_cost_usd"]>clock["max_cost_usd"]+1e-9:
   deny("FINOPS_DEEPSEEK_ACTUAL_USAGE_ESTIMATE_EXCEEDED")
  return parsed,{"model":ans.get("model"),"prompt_tokens":input_tokens,"completion_tokens":output_tokens,
   "provider_id":ans.get("id"),"estimated_peak_cost_usd":round(increment,6)}
 except (KeyError,IndexError,TypeError,ValueError):
  deny("DEEPSEEK_RESPONSE_INVALID")

def vision_messages(job,panel,jpeg):
 if len(jpeg)>8_000_000:deny("VISION_IMAGE_TOO_LARGE")
 encoded=base64.b64encode(jpeg).decode()
 instr=("You are an independent strict quality inspector of CEREBRO UMS-001, not an image promoter. "
  "Judge ACTUAL IMAGE PIXELS, not the expected prompt. Use STRICT JSON ONLY with EXACT keys "
  "{\"pass\":boolean,\"score\":integer 0-100,\"violations\":array of codes,\"correction\":string,\"summary\":string,\"rubric_scores\":object}. "
  "Codes: INVENTED_TEXT,INVENTED_LOGO,FACE_MISSING,FACE_TINY,FACE_OBSCURED,CAST_MISMATCH,BAD_ANATOMY,GENERIC_SCENE,DARK_MUDDY,MISLEADING_FINANCE,COMPOSITION_WEAK,BAD_LIGHTING,FLAT_CONTRAST,FOCAL_DISTORTION,WRONG_BRAND_COLOR,UNKNOWN. "
  "Reject any pseudo-writing, watermarks, false logos, money promises, official seals, absent/tiny human face, "
  "weak art direction. Portraits must clearly show specified people with realistic skin and visible hands. "
  "Score >=88 and zero violations only if PREMIUM Fénix quality, not basic. "
  "Judge photographer-level lens perspective/angle, natural key light, soft fill, edge separation, tonal contrast, human skin, shallow but accurate depth, orange highlights without orange skin, scene originality. "
  "rubric_scores must have EXACT keys and maximums: human_presence_and_cast 20, camera_and_composition 15, lighting_and_realism 15, contrast_and_color 10, surreal_creativity 15, typography_and_brand_integrity 15, context_and_claims 10; each integer 0..maximum and score MUST equal sum. "
  "When uncertain reject with UNKNOWN. Do not be lenient to the generating model.")
 desc={"panel":panel,"topic":job["topic"],"social":job["channel"]!="SEO"}
 return [{"role":"system","content":instr},{"role":"user","content":[
  {"type":"text","text":"Inspect this image independently against real campaign brief JSON: "+json.dumps(desc,ensure_ascii=False)},
  {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,"+encoded,"detail":"high"}}
 ]}]
def jpg_from_replicate(pred):
 url=pred.get("output")
 if isinstance(url,list):url=url[0] if url else None
 if not isinstance(url,str):deny("IMAGE_OUTPUT_MISSING")
 u=urllib.parse.urlparse(url)
 if u.scheme!="https" or u.username or u.password or u.fragment or not (u.hostname=="replicate.delivery" or (u.hostname or "").endswith(".replicate.delivery")):deny("IMAGE_URL_DENIED")
 req=urllib.request.Request(url,headers={"User-Agent":"CEREBRO-UMS001-LAB"})
 with urllib.request.urlopen(req,timeout=50) as f:
  end=urllib.parse.urlparse(f.geturl())
  if end.scheme!="https" or not (end.hostname=="replicate.delivery" or (end.hostname or "").endswith(".replicate.delivery")):deny("IMAGE_REDIRECT_DENIED")
  raw=f.read(8_000_001)
 if not 2048<len(raw)<=8_000_000 or raw[:3]!=bytes((255,216,255)):deny("IMAGE_FORMAT_BAD")
 return raw
def github_reserve(gh,job):
 path="cerebro/media-studio/v2/finops/deepseek-auto/"+job["request_id"]+".json"
 url="https://api.github.com/repos/"+REPO+"/contents/"+path
 data={"request_id":job["request_id"],"environment":"LAB","company_id":"fenix","engine_id":ENGINE,
   "status":"RESERVED_FAIL_CLOSED","max_image_budget_usd":job["max_image_budget_usd"],
   "max_deepseek_budget_usd":job["max_deepseek_budget_usd"],"max_attempts":job["max_attempts_per_panel"],
   "publication_enabled":False,"run_id":os.environ.get("GITHUB_RUN_ID","")}
 payload={"message":"finops(ums001): reserve DeepSeek-first autonomous image LAB once",
  "branch":BRANCH,"content":base64.b64encode(json.dumps(data).encode()).decode()}
 code,ans=http_json(url,"PUT",gh,payload,timeout=35)
 if code!=201 or not ans.get("content",{}).get("sha"):deny("DUPLICATE_JOB_OR_NO_RESERVATION")
 return path
def run_job(job,deepseek_key,replicate_key,github_key,provider=None):
 allowed_job(job)
 if os.environ.get("GITHUB_REPOSITORY")!=REPO or (os.environ.get("GITHUB_HEAD_REF") or os.environ.get("GITHUB_REF_NAME"))!=BRANCH:deny("GITHUB_BRANCH_SCOPE")
 if os.environ.get("UMS001_DEEPSEEK_AUTOMATION_GATE")!="OWNER_AUTHORIZED_LAB_20261111":deny("EXPLICIT_GATE_MISSING")
 if not isinstance(deepseek_key,str) or len(deepseek_key)<20 or not isinstance(replicate_key,str) or not replicate_key.startswith("r8_") or not github_key:deny("PROVIDER_SECRETS_MISSING")
 order_size=len(job["panels"])
 out={"schema_version":1,"request_id":job["request_id"],"company_id":"fenix","engine_id":ENGINE,"environment":"LAB",
   "router":"DEEPSEEK_FLASH_PRIMARY_ONLY","creative_model":AI,"image_model":MODEL,
   "source_request":job["source_request"],"total_panels":order_size,"publish_enabled":False,
   "request_budget_image_usd":job["max_image_budget_usd"],"request_budget_deepseek_usd":job["max_deepseek_budget_usd"],
   "status":"PRECHECKED_NOT_SUBMITTED","panels":[],"deepseek_calls":0,"replicate_predictions":0}
 json_write(OUT/"receipt.json",out)
 github_reserve(github_key,job)
 out["status"]="ATOMICALLY_RESERVED";json_write(OUT/"receipt.json",out)
 clock={"deepseek_calls":0,"deepseek_cap":job["max_deepseek_calls"],"total_text_tokens":0,
  "estimated_cost_usd":0.0,"max_cost_usd":job["max_deepseek_budget_usd"]}
 img_count=0
 for panel in job["panels"]:
  state={"id":panel["id"],"attempts":[],"status":"QA_PENDING"}
  out["panels"].append(state);json_write(OUT/"receipt.json",out)
  feedback=[]
  for attempt in range(1,job["max_attempts_per_panel"]+1):
   if round((img_count+1)*0.06,2)>job["max_image_budget_usd"]+0.000001:deny("FINOPS_IMAGE_BUDGET")
   creative,creative_meta=deepseek(prompt_messages(job,panel,attempt,feedback),deepseek_key,clock)
   prompt=validate_creative(creative)
   # Persist exactly what DeepSeek proposed, including lens, key/fill and contrast, so CEREBRO can learn.
   prompt_path=OUT/(panel["id"]+"-A"+str(attempt)+"-DEEPSEEK-PROMPT.json")
   json_write(prompt_path,{"company_id":"fenix","engine_id":ENGINE,"environment":"LAB",
    "content_id":job["request_id"],"panel_id":panel["id"],"attempt":attempt,
    "prompt":prompt,"prompt_sha256":hash_bytes(prompt.encode()),
    "shot_plan":creative.get("shot_plan"),"risks":creative.get("risks"),"model":AI})
   image_input={"prompt":prompt,"aspect_ratio":"4:5","raw":False,
     "output_format":"jpg","safety_tolerance":2}
   if job["channel"]!="SEO":
    image_input.update({"image_prompt":safe_style_reference(),"image_prompt_strength":0.30})
   # Atomic reservation above means no duplicate run can spend on this job; failures never retry uncertain POST.
   try:
    code,pred=http_json(REPLICATE_ENDPOINT,"POST",replicate_key,{"input":image_input},timeout=85)
   except Exception:deny("REPLICATE_POST_UNCERTAIN_NO_RETRY")
   if code not in (200,201) or not re.fullmatch(r"[a-z0-9]{8,80}",str(pred.get("id",""))):deny("REPLICATE_SUBMISSION_NOT_CONFIRMED")
   img_count+=1
   stage={"attempt":attempt,"prompt_sha256":hash_bytes(prompt.encode()),"deepseek_provider":creative_meta,
     "replicate_prediction_id":pred["id"],"status":"SUBMITTED"}
   state["attempts"].append(stage)
   out["deepseek_calls"]=clock["deepseek_calls"];out["replicate_predictions"]=img_count;out["estimated_deepseek_peak_usd"]=round(clock["estimated_cost_usd"],6)
   json_write(OUT/"receipt.json",out)
   for _ in range(14):
    if pred.get("status") in ("succeeded","failed","canceled"):break
    time.sleep(3)
    code,pred=http_json("https://api.replicate.com/v1/predictions/"+stage["replicate_prediction_id"],token=replicate_key,timeout=25)
    if code!=200:deny("REPLICATE_POLL_UNCERTAIN_NO_RETRY")
   if pred.get("status")!="succeeded":deny("REPLICATE_PREDICTION_NOT_SUCCEEDED_NO_RETRY")
   raw=jpg_from_replicate(pred)
   raw_file=OUT/(panel["id"]+"-A"+str(attempt)+"-REPLICATE-RAW.jpg")
   raw_file.write_bytes(raw)
   stage.update({"raw_file":raw_file.name,"raw_sha256":hash_bytes(raw),"status":"VISION_QA_PENDING"})
   json_write(OUT/"receipt.json",out)
   qa,qa_meta=deepseek(vision_messages(job,panel,raw),deepseek_key,clock,vision=True)
   judged=validate_vision(qa)
   stage.update({"visual_qa":judged,"qa_provider":qa_meta,"status":"QA_APPROVED" if judged["accepted"] else "QA_REJECTED"})
   out["deepseek_calls"]=clock["deepseek_calls"];json_write(OUT/"receipt.json",out)
   if judged["accepted"]:
    state["status"]="ACCEPTED_RAW__BRAND_POSTPRODUCTION_PENDING" if job["channel"]!="SEO" else "ACCEPTED_SEO_PHOTO_PENDING_INDEPENDENT_QA"
    state["winning_raw_file"]=raw_file.name
    break
   feedback=[{"violations":judged["violations"],"summary":judged["summary"],"correction":judged["correction"]}]
  else:
   state["status"]="LOW_CONFIDENCE_HUMAN_REQUIRED"
   out["status"]="HALTED_FOR_QA";json_write(OUT/"receipt.json",out)
   break
 # Never call social publishing. No original brand compositing until all image raw approvals, then existing compositor.
 out["status"]="RAW_QA_CANDIDATES_READY" if len(out["panels"])==order_size and all(p["status"].startswith("ACCEPTED_") for p in out["panels"]) else "HUMAN_REQUIRED_LOW_CONFIDENCE"
 out["deepseek_calls"]=clock["deepseek_calls"];out["replicate_predictions"]=img_count
 json_write(OUT/"receipt.json",out)
 print("UMS001_DEEPSEEK_PIPELINE_STATUS="+out["status"])
 print("UMS001_DEEPSEEK_CALLS="+str(out["deepseek_calls"]))
 print("UMS001_REPLICATE_PREDICTIONS="+str(out["replicate_predictions"]))
 print("UMS001_PUBLICATION=DISABLED")
 return out

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--job",required=True)
 parser.add_argument("--validate-only",action="store_true")
 args=parser.parse_args()
 path=Path(args.job)
 if not str(path).startswith("cerebro/media-studio/v2/requests/deepseek-auto/") or path.suffix!=".json":deny("REQUEST_PATH_DENIED")
 doc=allowed_job(json_read(path))
 if args.validate_only:
  print("UMS001_DEEPSEEK_JOB_SCHEMA_GREEN")
  print("UMS001_API_CALLS=0")
  return
 result=run_job(doc,os.environ.get("DEEPSEEK_API_KEY",""),os.environ.get("REPLICATE_API_TOKEN",""),os.environ.get("GH_TOKEN_FOR_LAB",""))
 if result["status"]!="RAW_QA_CANDIDATES_READY":raise SystemExit(3)
if __name__=="__main__":
 try:main()
 except Blocked as e:
  print(str(e),file=sys.stderr);sys.exit(2)
 except Exception:
  print("UMS001_DEEPSEEK_RUNTIME_FAILED_RECONCILIATION_REQUIRED",file=sys.stderr);sys.exit(2)
