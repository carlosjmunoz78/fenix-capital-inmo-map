#!/usr/bin/env python3
"""Physical PREPROD CPU smoke for standard IP-Adapter on synthetic Nova-01.

This proves the adapter can physically condition generation in the current zero-cost
runner. It is not a BM-01 identity PASS and never authorizes PROD or real-person use.
"""
from __future__ import annotations
import hashlib, json, os, platform, threading, time
from pathlib import Path

import numpy as np
import psutil
from PIL import Image
import torch
from diffusers import AutoPipelineForText2Image

BASE_MODEL=os.environ.get('IP_BASE_MODEL','stable-diffusion-v1-5/stable-diffusion-v1-5')
ADAPTER_REPO=os.environ.get('IP_ADAPTER_REPO','h94/IP-Adapter')
ADAPTER_SUBFOLDER=os.environ.get('IP_ADAPTER_SUBFOLDER','models')
ADAPTER_WEIGHT=os.environ.get('IP_ADAPTER_WEIGHT','ip-adapter_sd15.bin')
REF=Path(os.environ['NOVA01_FRONT_REFERENCE'])
OUT=Path(os.environ.get('UMS_IP_OUT','ums-ip-adapter-nova01')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
CANONICAL='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'
PROMPT='stylized original male character Nova-01, warm copper skin, dark short angular hair, slate blue eyes, dark charcoal suit with gold shoulder piping, clean studio portrait, centered, graphic character design'
NEGATIVE='text, watermark, logo, duplicate face, extra eyes, extra ears, deformed, low quality, photorealistic'
SEED=25012026
STEPS=int(os.environ.get('IP_STEPS','4'))
SIZE=int(os.environ.get('IP_SIZE','256'))
SCALE=float(os.environ.get('IP_SCALE','0.80'))
MAX_SECONDS=float(os.environ.get('IP_MAX_SECONDS','900'))
MAX_RSS_GB=float(os.environ.get('IP_MAX_RSS_GB','14'))

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def rss_gb()->float: return psutil.Process().memory_info().rss/(1024**3)

if torch.cuda.is_available():
    raise SystemExit('CPU_SMOKE_REQUIRES_CPU_ONLY_RUNNER')
if sha(REF)!=CANONICAL:
    raise SystemExit('NOVA01_CANONICAL_REFERENCE_SHA_MISMATCH')

stop=threading.Event(); peak=[rss_gb()]
def sampler():
    while not stop.is_set():
        peak[0]=max(peak[0],rss_gb()); time.sleep(0.2)
t=threading.Thread(target=sampler,daemon=True); t.start()
started=time.time(); load_started=time.time()

pipe=AutoPipelineForText2Image.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float32,
    safety_checker=None,
    requires_safety_checker=False,
)
pipe=pipe.to('cpu')
pipe.enable_attention_slicing()
pipe.load_ip_adapter(ADAPTER_REPO,subfolder=ADAPTER_SUBFOLDER,weight_name=ADAPTER_WEIGHT)
load_seconds=time.time()-load_started
reference=Image.open(REF).convert('RGB')

def generate(scale:float,name:str):
    pipe.set_ip_adapter_scale(scale)
    g=torch.Generator(device='cpu').manual_seed(SEED)
    t0=time.time()
    image=pipe(
        prompt=PROMPT,
        negative_prompt=NEGATIVE,
        ip_adapter_image=reference,
        num_inference_steps=STEPS,
        guidance_scale=1.0,
        width=SIZE,
        height=SIZE,
        generator=g,
    ).images[0].convert('RGB')
    p=OUT/name; image.save(p,format='PNG')
    return p,time.time()-t0

baseline,baseline_seconds=generate(0.0,'nova01-ipadapter-baseline.png')
conditioned,conditioned_seconds=generate(SCALE,'nova01-ipadapter-conditioned.png')
stop.set(); t.join(timeout=2)
elapsed=time.time()-started

a=np.asarray(Image.open(baseline).convert('RGB'),dtype=np.int16)
b=np.asarray(Image.open(conditioned).convert('RGB'),dtype=np.int16)
mean_abs_delta=float(np.abs(a-b).mean())
changed_pixel_fraction=float((np.max(np.abs(a-b),axis=2)>4).mean())
material_effect=bool(sha(baseline)!=sha(conditioned) and mean_abs_delta>=1.0 and changed_pixel_fraction>=0.05)
resource_fit=bool(elapsed<=MAX_SECONDS and peak[0]<=MAX_RSS_GB)
status='IP_ADAPTER_CPU_SMOKE_GREEN' if material_effect and resource_fit else 'IP_ADAPTER_CPU_SMOKE_FAIL_CLOSED'

report={
  'schema_version':'1.0.0','state_type':'CEREBRO_UMS_IP_ADAPTER_CPU_SMOKE_V1',
  'company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.0.0',
  'adapter':'IP-ADAPTER-STANDARD','adapter_repo':ADAPTER_REPO,'adapter_weight':ADAPTER_WEIGHT,'adapter_license':'Apache-2.0','adapter_license_verified':True,
  'base_model':BASE_MODEL,'base_model_license':'CreativeML OpenRAIL-M','base_model_license_verified':True,
  'diffusers_license':'Apache-2.0','license_chain_verified_for_preprod_smoke':True,
  'character_id':'UMS-SYNTH-CHAR-001','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,'faceid_variant':False,
  'status':status,'proof_scope':'PHYSICAL_CONDITIONING_AND_RESOURCE_FIT_NOT_BM01_IDENTITY_PASS',
  'reference':{'path':str(REF),'sha256':sha(REF),'bytes':REF.stat().st_size},
  'generation':{'seed':SEED,'steps':STEPS,'size':[SIZE,SIZE],'scale':SCALE,'guidance_scale':1.0,'safety_checker_disabled_for_isolated_synthetic_nonpublish_smoke':True},
  'artifacts':{
    'baseline':{'path':baseline.name,'sha256':sha(baseline),'bytes':baseline.stat().st_size},
    'conditioned':{'path':conditioned.name,'sha256':sha(conditioned),'bytes':conditioned.stat().st_size},
  },
  'conditioning_effect':{'material':material_effect,'mean_abs_rgb_delta':mean_abs_delta,'changed_pixel_fraction_gt4':changed_pixel_fraction},
  'runtime':{
    'device':'cpu','cuda_available':False,'python':platform.python_version(),'torch':torch.__version__,
    'host_memory_gb':psutil.virtual_memory().total/(1024**3),'peak_process_rss_gb':peak[0],
    'model_load_seconds':load_seconds,'baseline_seconds':baseline_seconds,'conditioned_seconds':conditioned_seconds,'elapsed_seconds':elapsed,
    'memory_fit_verified':peak[0]<=MAX_RSS_GB,'latency_fit_verified':elapsed<=MAX_SECONDS,'max_seconds_gate':MAX_SECONDS,'max_rss_gb_gate':MAX_RSS_GB,
  },
  'additional_cost_eur':0,'human_required':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,
  'next_action':'BIND_IP_ADAPTER_PREPROD_AND_SCORE_NOVA01_IDENTITY' if status=='IP_ADAPTER_CPU_SMOKE_GREEN' else 'KEEP_HOLD_AND_DIAGNOSE_RESOURCE_OR_CONDITIONING_FAILURE'
}
(OUT/'ip-adapter-nova01-cpu-smoke.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
raise SystemExit(0 if status=='IP_ADAPTER_CPU_SMOKE_GREEN' else 5)
