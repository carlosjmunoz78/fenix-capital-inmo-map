#!/usr/bin/env python3
"""UMS-001 guarded Cloudflare Workers AI creative router, standalone LAB adapter.
READ-ONLY creative inference (no Cloudflare resource mutations).
External network ONLY with an existing, authorized, scoped secret.
If missing, deterministic Prompt Forge is the safe fallback.
No public endpoints, no auto-publication, no paid DeepSeek fallback.
"""
import json,os,re,urllib.request,urllib.error
from pathlib import Path
MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
ACCOUNT="e39a57e1ac42650ca5a6d5307cf0ac8e"
SAFE_KEYS=("company_id","engine_id","environment","content_id","platform","asset_type","topic","audience","panels")
ALLOWED_PLATFORM={"INSTAGRAM","FACEBOOK","LINKEDIN","SEO"}
class CreativeRouterBlocked(ValueError):pass
def prepare(body):
 if not isinstance(body,dict) or (body.get("company_id"),body.get("engine_id"),body.get("environment"))!=("fenix","UMS-001","LAB"):
  raise CreativeRouterBlocked("SCOPE_DENIED")
 if body.get("platform") not in ALLOWED_PLATFORM or body.get("publish_enabled") is not False:
  raise CreativeRouterBlocked("PLATFORM_OR_PUBLISH_BLOCKED")
 filtered={k:body[k] for k in SAFE_KEYS if k in body}
 if not isinstance(filtered.get("panels"),list) or len(filtered["panels"])<1 or len(filtered["panels"])>10:
  raise CreativeRouterBlocked("NO_PANELS")
 text=json.dumps(filtered,ensure_ascii=False)
 if len(text)>12000 or re.search(r"(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|password|api[_ -]?key|\br8_[A-Za-z0-9]+\b)",text,re.I):
  raise CreativeRouterBlocked("SENSITIVE_OR_TOO_LARGE")
 instructions=(
  "CEREBRO UMS-001 creative director, premium authentic Spanish/Andalusian cinematic photo. "
  "Return ONLY valid JSON {\"image_prompt\":\"...\", \"quality_risks\":[\"...\",\"...\",\"...\"]}; "
  "image_prompt must be coherent original detailed English 700-2600 characters. "
  "Place people as very large real waist-up photo portrait in FOREGROUND covering 60% frame, "
  "surreal orange #FF5F00 glass architecture behind them, natural realistic skin/eyes/hands and sunlight. "
  "Never show printed text, clothes lettering, logos, ticks/checkmarks/approval signals, fake bank/real estate papers. "
  "Leave calm bottom area for later official postprocessing. 4:5 vertical. "
  "Avoid generic architecture and distant people; visibly surprising high-end advertising. "
  "No real customer data. Creative brief: "+text)
 return [{"role":"system","content":"You are the art director of CEREBRO UMS-001. Output valid JSON only, never secrets."},{"role":"user","content":instructions}]
def parse_provider(reply):
 if not isinstance(reply,dict) or reply.get("success") is not True:
  raise CreativeRouterBlocked("PROVIDER_ERROR")
 result=reply.get("result") or {}
 answer=result.get("response")
 if answer is None:
  choices=result.get("choices") or []
  answer=choices[0].get("message",{}).get("content") if choices else None
 if isinstance(answer,str):
  try:answer=json.loads(answer)
  except ValueError:raise CreativeRouterBlocked("INVALID_JSON_FROM_MODEL")
 if not isinstance(answer,dict):raise CreativeRouterBlocked("UNSTRUCTURED_RESULT")
 prompt=answer.get("image_prompt")
 risks=answer.get("quality_risks")
 if not isinstance(prompt,str) or not 700<=len(prompt)<=2600 or not isinstance(risks,list) or len(risks)!=3:
  raise CreativeRouterBlocked("INVALID_CREATIVE_SCHEMA")
 if re.search(r"(?i)(?:https?://|bearer\s+[A-Z0-9]+|\br8_[a-z0-9]+)",prompt):
  raise CreativeRouterBlocked("UNSAFE_PROMPT")
 return {"creative_prompt":prompt,"quality_risks":risks,"model_requested":MODEL,
  "model_observed":result.get("model"),"prompt_source":"CEREBRO_WORKERS_AI_FREE",
  "usage":result.get("usage"),"publication_approved":False}
def infer(body,*,http_post=None):
 messages=prepare(body)
 token=os.environ.get("CEREBRO_WORKERS_AI_SCOPED_TOKEN","")
 if not token or len(token)<20:raise CreativeRouterBlocked("WORKERS_AI_SCOPED_CREDENTIAL_REQUIRED")
 def send(url,payload):
  request=urllib.request.Request(url,headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    data=json.dumps(payload).encode(),method="POST")
  with urllib.request.urlopen(request,timeout=25) as r:
   if r.status!=200:raise CreativeRouterBlocked("INFERENCE_HTTP_ERROR")
   return json.loads(r.read(80_000))
 url="https://api.cloudflare.com/client/v4/accounts/"+ACCOUNT+"/ai/run/"+MODEL
 provider=(http_post or send)(url,{"messages":messages,"temperature":0.65,"max_tokens":1200})
 return parse_provider(provider)
if __name__=="__main__":
 path=Path(os.environ.get("UMS001_STRUCTURED_BRIEF",""))
 if not path.is_file():raise SystemExit("LAB_BRIEF_REQUIRED")
 x=infer(json.loads(path.read_text(encoding="utf-8")))
 print(json.dumps(x,ensure_ascii=False,indent=2))
