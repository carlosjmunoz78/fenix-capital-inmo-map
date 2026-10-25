#!/usr/bin/env python3
"""PREPROD-only physical IP-Adapter quality smoke on canonical synthetic Nova-01."""
from __future__ import annotations
import hashlib, json, os, resource, time
from pathlib import Path

import psutil
import torch
from PIL import Image
from diffusers import StableDiffusionPipeline

ENV=os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()
if ENV!='PREPROD': raise SystemExit('IP_ADAPTER_PHYSICAL_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('PAID_SPEND_NOT_ALLOWED_IN_THIS_PROBE')

BASE=os.environ.get('IP_BASE_MODEL','stable-diffusion-v1-5/stable-diffusion-v1-5')
ADAPTER=os.environ.get('IP_ADAPTER_REPO','h94/IP-Adapter')
# IP-Adapter's own model card documents PLUS as using patch embeddings and being
# closer to the reference than the standard sd15 checkpoint. Synthetic-only gate.
WEIGHT=os.environ.get('IP_ADAPTER_WEIGHT','ip-adapter-plus_sd15.bin')
SUBFOLDER=os.environ.get('IP_ADAPTER_SUBFOLDER','models')
REF=Path(os.environ['NOVA01_FRONT_REFERENCE']).resolve()
OUT=Path(os.environ.get('UMS_IP_OUT','ums-ipadapter-nova01')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
REPORT=OUT/'ip-adapter-physical-report.json'; IMAGE=OUT/'nova01-ip-adapter-smoke.png'
MAX_SECONDS=float(os.environ.get('IP_ADAPTER_LATENCY_LIMIT_SECONDS','600'))
MAX_RSS_BYTES=int(float(os.environ.get('IP_ADAPTER_MEMORY_LIMIT_GIB','13.5'))*1024**3)
PROMPT=os.environ.get('IP_ADAPTER_PROMPT',(
    'flat clean vector character portrait, exact same fictional Nova-01 identity as reference, '
    'front-facing symmetrical bust, centered, subject occupies about sixty percent of canvas width, '
    'dark charcoal nearly black background, copper tan skin, short angular black hair with side part, '
    'blue gray eyes, tiny dark beauty mark on left cheek, charcoal blazer, gold shoulder trim, '
    'simple geometric shapes, crisp edges, neutral expression, shoulders visible, studio character sheet'
))
NEGATIVE=os.environ.get('IP_ADAPTER_NEGATIVE_PROMPT',(
    'photorealistic, realistic skin texture, upside down, rotated, mirrored, deformed, distorted, '
    'duplicate face, multiple faces, extra eyes, extra ears, extra limbs, cropped head, extreme close-up, '
    'subject touching image edges, full-bleed face, bright background, white background, blue background, '
    'busy background, scenery, hands, text, watermark, logo, noise, glitch, low quality'
))
STEPS=int(os.environ.get('IP_ADAPTER_STEPS','15'))
SEED=int(os.environ.get('IP_ADAPTER_SEED','20261025'))
WIDTH=int(os.environ.get('IP_ADAPTER_WIDTH','384'))
HEIGHT=int(os.environ.get('IP_ADAPTER_HEIGHT','384'))
GUIDANCE=float(os.environ.get('IP_ADAPTER_GUIDANCE','6.5'))
SCALE=float(os.environ.get('IP_ADAPTER_SCALE','0.90'))

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def maxrss_bytes()->int: return int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024)

if not REF.is_file(): raise SystemExit('CANONICAL_REFERENCE_MISSING')
device='cpu'  # deterministic zero-cost fallback certification

started=time.time(); proc=psutil.Process()
load_started=time.time()
pipe=StableDiffusionPipeline.from_pretrained(
    BASE,
    torch_dtype=torch.float32,
    low_cpu_mem_usage=True,
    safety_checker=None,
    requires_safety_checker=False,
)
pipe=pipe.to(device)
pipe.set_progress_bar_config(disable=False)
load_seconds=time.time()-load_started
adapter_started=time.time()
# Load on standard attention processors first; attention slicing before this step
# breaks diffusers 0.36.0 SlicedAttnProcessor construction.
pipe.load_ip_adapter(ADAPTER, subfolder=SUBFOLDER, weight_name=WEIGHT)
pipe.set_ip_adapter_scale(SCALE)
if hasattr(pipe.vae,'enable_slicing'): pipe.vae.enable_slicing()
adapter_load_seconds=time.time()-adapter_started
ref=Image.open(REF).convert('RGB')
generator=torch.Generator(device='cpu').manual_seed(SEED)
infer_started=time.time()
result=pipe(
    prompt=PROMPT,
    negative_prompt=NEGATIVE,
    ip_adapter_image=ref,
    num_inference_steps=STEPS,
    guidance_scale=GUIDANCE,
    height=HEIGHT,
    width=WIDTH,
    generator=generator,
).images[0]
inference_seconds=time.time()-infer_started
result.save(IMAGE)
elapsed=time.time()-started
rss=maxrss_bytes(); current_rss=proc.memory_info().rss
memory_fit=bool(rss<=MAX_RSS_BYTES)
latency_fit=bool(elapsed<=MAX_SECONDS)
report={
  'schema_version':'1.1.0','state_type':'CEREBRO_UMS_IP_ADAPTER_PHYSICAL_SMOKE_V1',
  'company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.1.0',
  'adapter':'IP-ADAPTER-PLUS-SD15','capability':'SYNTHETIC_REFERENCE_IMAGE_CONDITIONING',
  'status':'IP_ADAPTER_PHYSICAL_EXECUTED','device':'cpu','cuda_available':bool(torch.cuda.is_available()),
  'base_model':BASE,'base_model_license':'creativeml-openrail-m','adapter_repo':ADAPTER,'adapter_license':'apache-2.0','adapter_weight':WEIGHT,
  'reference':{'path':str(REF),'sha256':sha(REF),'bytes':REF.stat().st_size,'identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False},
  'output':{'path':str(IMAGE),'sha256':sha(IMAGE),'bytes':IMAGE.stat().st_size,'width':result.width,'height':result.height},
  'timing':{'model_load_seconds':round(load_seconds,3),'adapter_load_seconds':round(adapter_load_seconds,3),'inference_seconds':round(inference_seconds,3),'total_seconds':round(elapsed,3)},
  'resources':{'max_rss_bytes':rss,'current_rss_bytes':current_rss,'memory_limit_bytes':MAX_RSS_BYTES,'memory_fit_verified':memory_fit,'latency_limit_seconds':MAX_SECONDS,'latency_fit_verified':latency_fit},
  'generation':{'steps':STEPS,'seed':SEED,'guidance_scale':GUIDANCE,'ip_adapter_scale':SCALE,'width':WIDTH,'height':HEIGHT,'negative_prompt_used':True},
  'quality_recipe':'PLUS_PATCH_EMBEDDINGS_DARK_BG_BUST_FRAMING_V1',
  'license_chain_verified_by_workflow':True,'additional_cost_eur':0,'paid_api_used':False,
  'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False,
}
REPORT.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
if not memory_fit: raise SystemExit(21)
if not latency_fit: raise SystemExit(22)
if IMAGE.stat().st_size<1000: raise SystemExit(23)
