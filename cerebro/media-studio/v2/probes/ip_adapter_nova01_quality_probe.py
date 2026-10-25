#!/usr/bin/env python3
"""PREPROD quality probe for Nova-01 with IP-Adapter Plus.

Separate from the physical runtime certificate. Uses the non-FaceID Plus checkpoint,
which the upstream model card describes as closer to the reference image via patch
embeddings. Synthetic reference only; no real-person or FaceID path; no PROD/publish/spend.
"""
from __future__ import annotations
import hashlib, json, os, resource, time
from pathlib import Path

import psutil
import torch
from PIL import Image
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('IP_ADAPTER_QUALITY_PREPROD_ONLY')
REF=Path(os.environ['NOVA01_FRONT_REFERENCE']).resolve()
OUT=Path(os.environ.get('UMS_IP_QUALITY_OUT','ums-ipadapter-nova01-quality')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
IMAGE=OUT/'nova01-ip-adapter-quality.png'; REPORT=OUT/'ip-adapter-quality-report.json'
BASE='stable-diffusion-v1-5/stable-diffusion-v1-5'; ADAPTER='h94/IP-Adapter'; WEIGHT='ip-adapter-plus_sd15.bin'
CANONICAL='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'
SIZE=int(os.environ.get('IP_QUALITY_SIZE','384')); STEPS=int(os.environ.get('IP_QUALITY_STEPS','18'))
GUIDANCE=float(os.environ.get('IP_QUALITY_GUIDANCE','5.0')); SCALE=float(os.environ.get('IP_QUALITY_SCALE','0.90')); SEED=20261025
MAX_SECONDS=float(os.environ.get('IP_QUALITY_LATENCY_LIMIT_SECONDS','600')); MAX_RSS=int(float(os.environ.get('IP_QUALITY_MEMORY_LIMIT_GIB','13.5'))*1024**3)
PROMPT=('Nova-01, original fictional adult man, stylized animated male character model sheet, warm copper skin, short angular dark charcoal hair, '
        'clearly visible blue gray irises, small beauty mark on left cheek, dark charcoal formal suit, thin gold piping only along both shoulders, '
        'centered symmetrical frontal bust, head and upper torso fully visible, dark charcoal neutral studio background matching the reference, '
        'clean flat controlled lighting, crisp simple shapes, no lettering')
NEG=('woman, female, photorealistic, duplicate face, extra face, extra eyes, malformed eyes, asymmetrical eyes, extra ears, extra limbs, '
     'deformed, glitch, noise, grain, oversaturated, text, letters, typography, logo, watermark, caption, signature, border, belt, sash, '
     'horizontal gold stripe, gold belt, cropped head, gray background, bright background')

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def maxrss(): return int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024)

if not REF.is_file() or sha(REF)!=CANONICAL: raise SystemExit('NOVA01_CANONICAL_REFERENCE_MISMATCH')
started=time.time(); t=time.time()
pipe=StableDiffusionPipeline.from_pretrained(BASE,dtype=torch.float32,low_cpu_mem_usage=True,safety_checker=None,requires_safety_checker=False)
pipe.scheduler=DPMSolverMultistepScheduler.from_config(pipe.scheduler.config,algorithm_type='dpmsolver++',use_karras_sigmas=True)
pipe=pipe.to('cpu'); model_load=time.time()-t
t=time.time(); pipe.load_ip_adapter(ADAPTER,subfolder='models',weight_name=WEIGHT); pipe.set_ip_adapter_scale(SCALE); adapter_load=time.time()-t
if hasattr(pipe,'enable_vae_slicing'): pipe.enable_vae_slicing()
ref=Image.open(REF).convert('RGB')
g=torch.Generator(device='cpu').manual_seed(SEED)
t=time.time()
image=pipe(prompt=PROMPT,negative_prompt=NEG,ip_adapter_image=ref,num_inference_steps=STEPS,guidance_scale=GUIDANCE,height=SIZE,width=SIZE,generator=g).images[0].convert('RGB')
inference=time.time()-t; image.save(IMAGE)
elapsed=time.time()-started; rss=maxrss(); current=psutil.Process().memory_info().rss
report={
 'schema_version':'1.1.0','state_type':'CEREBRO_UMS_IP_ADAPTER_QUALITY_PROBE_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD',
 'character_id':'UMS-SYNTH-CHAR-001','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,'faceid_variant':False,
 'status':'QUALITY_CANDIDATE_GENERATED','adapter':'IP-ADAPTER-PLUS-STANDARD','base_model':BASE,'adapter_repo':ADAPTER,'adapter_weight':WEIGHT,
 'reference':{'sha256':sha(REF),'bytes':REF.stat().st_size},'output':{'path':IMAGE.name,'sha256':sha(IMAGE),'bytes':IMAGE.stat().st_size,'width':SIZE,'height':SIZE},
 'generation':{'steps':STEPS,'seed':SEED,'guidance_scale':GUIDANCE,'ip_adapter_scale':SCALE,'scheduler':'DPMSolverMultistepScheduler','prompt_gender':'adult_man'},
 'timing':{'model_load_seconds':round(model_load,3),'adapter_load_seconds':round(adapter_load,3),'inference_seconds':round(inference,3),'total_seconds':round(elapsed,3)},
 'resources':{'max_rss_bytes':rss,'current_rss_bytes':current,'memory_limit_bytes':MAX_RSS,'memory_fit_verified':rss<=MAX_RSS,'latency_limit_seconds':MAX_SECONDS,'latency_fit_verified':elapsed<=MAX_SECONDS},
 'quality_validation':'EXTERNAL_CROSS_MODAL_TRIBUNAL_REQUIRED','additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
REPORT.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
if not report['resources']['memory_fit_verified']: raise SystemExit(31)
if not report['resources']['latency_fit_verified']: raise SystemExit(32)
if IMAGE.stat().st_size<1000: raise SystemExit(33)
